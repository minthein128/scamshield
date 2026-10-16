import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export const MAX_IMAGE_BYTES = 1_500_000;
// The Android overlay sends 1080 px wide JPEG at quality 70; the app matches it and never upscales.
const WIDTHS = [1080, 900, 720, 540];
const QUALITIES = [0.7, 0.55, 0.4];

export interface PreparedImage {
  base64: string;
  mimeType: 'image/jpeg';
  bytes: number;
  uri: string;
  /** Original file name when the picker gives one. */
  name?: string;
}

export function base64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export type Manipulate = (
  uri: string,
  width: number,
  quality: number
) => Promise<{ uri: string; base64?: string }>;

const defaultManipulate: Manipulate = (uri, width, quality) =>
  ImageManipulator.manipulateAsync(uri, [{ resize: { width } }], {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

export function widthsFor(sourceWidth?: number): number[] {
  if (!sourceWidth || sourceWidth <= 0) return WIDTHS;
  const fit = WIDTHS.filter(w => w < sourceWidth);
  return sourceWidth <= WIDTHS[0] ? [sourceWidth, ...fit] : fit;
}

export async function prepareImage(
  uri: string,
  maxBytes: number = MAX_IMAGE_BYTES,
  manipulate: Manipulate = defaultManipulate,
  sourceWidth?: number
): Promise<PreparedImage> {
  let last: PreparedImage | null = null;
  for (const width of widthsFor(sourceWidth)) {
    for (const quality of QUALITIES) {
      const out = await manipulate(uri, width, quality);
      if (!out.base64) continue;
      last = { base64: out.base64, mimeType: 'image/jpeg', bytes: base64Bytes(out.base64), uri: out.uri };
      if (last.bytes <= maxBytes) return last;
    }
  }
  if (!last) throw new Error('Could not read the image');
  throw new Error('Image is still too large after compression');
}

export interface SharedImageDeps {
  copy: (from: string, to: string) => Promise<void>;
  remove: (uri: string) => Promise<void>;
  cacheDir: string | null;
  prepare: (uri: string) => Promise<PreparedImage>;
}

const sharedImageDeps = (): SharedImageDeps => ({
  copy: (from, to) => FileSystem.copyAsync({ from, to }),
  remove: uri => FileSystem.deleteAsync(uri, { idempotent: true }),
  cacheDir: FileSystem.cacheDirectory,
  prepare: uri => prepareImage(uri),
});

/** Copies a shared content:// image into the cache, prepares it, then deletes the copy. */
export async function prepareSharedImage(uri: string, deps: SharedImageDeps = sharedImageDeps()): Promise<PreparedImage> {
  if (!uri.startsWith('content://') || !deps.cacheDir) return deps.prepare(uri);
  const local = `${deps.cacheDir}shared-${Date.now()}`;
  await deps.copy(uri, local);
  try {
    return await deps.prepare(local);
  } finally {
    await deps.remove(local).catch(() => undefined);
  }
}

export async function pickScreenshot(): Promise<PreparedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const prepared = await prepareImage(asset.uri, MAX_IMAGE_BYTES, undefined, asset.width);
  return asset.fileName ? { ...prepared, name: asset.fileName } : prepared;
}
