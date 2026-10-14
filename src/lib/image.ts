import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export const MAX_IMAGE_BYTES = 1_500_000;
const WIDTHS = [1280, 1024, 800, 640];
const QUALITIES = [0.7, 0.55, 0.4];

export interface PreparedImage {
  base64: string;
  mimeType: 'image/jpeg';
  bytes: number;
  uri: string;
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

export async function prepareImage(
  uri: string,
  maxBytes: number = MAX_IMAGE_BYTES,
  manipulate: Manipulate = defaultManipulate
): Promise<PreparedImage> {
  let last: PreparedImage | null = null;
  for (const width of WIDTHS) {
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

export async function pickScreenshot(): Promise<PreparedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  return prepareImage(result.assets[0].uri);
}
