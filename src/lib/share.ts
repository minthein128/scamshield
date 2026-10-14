import type { CheckKind } from '../api/types';

export interface Draft {
  text?: string;
  url?: string;
  imageUri?: string;
  kind?: CheckKind;
}

export interface SharedPayload {
  text?: string | null;
  webUrl?: string | null;
  files?: { path: string; mimeType: string }[] | null;
}

const URL_ONLY = /^https?:\/\/\S+$/i;

export function draftFromShare(shared: SharedPayload): Draft | null {
  const image = shared.files?.find(f => f.mimeType.startsWith('image/'));
  const raw = shared.webUrl?.trim() || shared.text?.trim() || '';
  const draft: Draft = {};
  if (image) draft.imageUri = image.path.startsWith('/') ? `file://${image.path}` : image.path;
  if (raw) {
    if (URL_ONLY.test(raw)) draft.url = raw;
    else draft.text = raw;
  }
  if (!draft.imageUri && !draft.text && !draft.url) return null;
  draft.kind = draft.url && !draft.text && !draft.imageUri ? 'link' : 'message';
  return draft;
}
