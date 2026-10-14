import type { CheckRequest, CheckResponse } from './types';

const VERDICTS = ['safe', 'careful', 'danger'];

export function hasInput(request: Pick<CheckRequest, 'text' | 'url' | 'imageBase64'>): boolean {
  return Boolean(request.text?.trim() || request.url?.trim() || request.imageBase64);
}

export function isCheckResponse(value: unknown): value is CheckResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.verdict === 'string' &&
    VERDICTS.includes(v.verdict) &&
    typeof v.score === 'number' &&
    typeof v.title === 'string' &&
    typeof v.summary === 'string'
  );
}

export function normalizeResponse(raw: CheckResponse): CheckResponse {
  return {
    ...raw,
    spokenWarning: raw.spokenWarning ?? raw.summary,
    flags: raw.flags ?? [],
    linkChecks: raw.linkChecks ?? [],
    actions: raw.actions ?? [],
    scamType: raw.scamType ?? 'none',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    kind: raw.kind ?? 'job',
    model: raw.model ?? 'unknown',
  };
}
