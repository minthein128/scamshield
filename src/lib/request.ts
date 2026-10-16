import { t } from '../i18n';
import type { CheckKind, CheckRequest, JobExtractRequest, JobExtractSource, LanguageCode } from '../api/types';

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

export const KIND_OPTIONS: Exclude<CheckKind, 'screen'>[] = ['job', 'message', 'link', 'shop', 'agency'];

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
    shareSignals: form.shareSignals === true,
  };
}

export function looksLikeUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function sourceLabel(form: Pick<CheckForm, 'text' | 'url' | 'imageBase64' | 'destination' | 'kind'>): string {
  const text = form.text.trim();
  if (text) return text.length > 48 ? `${text.slice(0, 48)}...` : text;
  if (form.url.trim()) return form.url.trim().replace(/^https?:\/\//i, '').slice(0, 48);
  if (form.imageBase64) return form.destination.trim() ? t('check:source.screenshotAt', { place: form.destination.trim() }) : t('check:source.screenshot');
  return t('check:source.fallback');
}

export interface JobForm extends CheckForm {
  chatText: string;
  chatImageBase64?: string;
  chatImageMimeType?: string;
}

function jobSource(text: string, imageBase64?: string, imageMimeType?: string): JobExtractSource | undefined {
  const trimmed = text.trim();
  if (!trimmed && !imageBase64) return undefined;
  return { ...(trimmed ? { text: trimmed } : {}), ...(imageBase64 ? { imageBase64, imageMimeType: imageMimeType ?? 'image/jpeg' } : {}) };
}

export function buildJobRequest(form: JobForm): JobExtractRequest {
  const destination = form.destination.trim();
  const home = form.home?.trim();
  const context = { ...(destination ? { destination } : {}), ...(home ? { home } : {}) };
  const ad = jobSource(form.text, form.imageBase64, form.imageMimeType);
  const chat = jobSource(form.chatText, form.chatImageBase64, form.chatImageMimeType);
  return { ...(ad ? { ad } : {}), ...(chat ? { chat } : {}), language: form.language, ...(Object.keys(context).length ? { context } : {}) };
}

export function jobSourceLabel(form: JobForm): string {
  const adText = form.text.trim();
  if (adText) return adText.length > 48 ? `${adText.slice(0, 48)}...` : adText;
  const hasAd = Boolean(form.text.trim() || form.imageBase64);
  const hasChat = Boolean(form.chatText.trim() || form.chatImageBase64);
  return t(hasAd && hasChat ? 'check:job.source.both' : hasChat ? 'check:job.source.chat' : 'check:job.source.ad');
}
