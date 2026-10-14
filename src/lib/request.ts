import type { CheckKind, CheckRequest, LanguageCode } from '../api/types';

export interface CheckForm {
  kind: CheckKind;
  text: string;
  url: string;
  destination: string;
  home?: string;
  shareSignals?: boolean;
  imageBase64?: string;
  imageMimeType?: string;
  language: LanguageCode;
}

export const KIND_OPTIONS: { kind: CheckKind; label: string }[] = [
  { kind: 'job', label: 'Job offer' },
  { kind: 'message', label: 'Message' },
  { kind: 'link', label: 'Link' },
  { kind: 'shop', label: 'Shop' },
  { kind: 'agency', label: 'Agency' },
];

export function buildRequest(form: CheckForm): CheckRequest {
  const text = form.text.trim();
  const url = form.url.trim();
  const destination = form.destination.trim();
  const home = form.home?.trim();
  const context = { ...(destination ? { destination } : {}), ...(home ? { home } : {}) };
  return {
    kind: form.kind,
    language: form.language,
    ...(text ? { text } : {}),
    ...(url ? { url } : {}),
    ...(form.imageBase64 ? { imageBase64: form.imageBase64, imageMimeType: form.imageMimeType ?? 'image/jpeg' } : {}),
    ...(Object.keys(context).length ? { context } : {}),
    ...(form.shareSignals === false ? { shareSignals: false } : {}),
  };
}

export function looksLikeUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function sourceLabel(form: Pick<CheckForm, 'text' | 'url' | 'imageBase64' | 'destination' | 'kind'>): string {
  const text = form.text.trim();
  if (text) return text.length > 48 ? `${text.slice(0, 48)}...` : text;
  if (form.url.trim()) return form.url.trim().replace(/^https?:\/\//i, '').slice(0, 48);
  if (form.imageBase64) return form.destination.trim() ? `Screenshot, ${form.destination.trim()}` : 'Screenshot';
  return 'Check';
}
