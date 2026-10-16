import type { CheckRequest, CheckResponse, JobAssessResponse, JobExtractResponse, JobExtractSource } from './types';

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
    sources: raw.sources ?? [],
    actions: raw.actions ?? [],
    scamType: raw.scamType ?? 'none',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    kind: raw.kind ?? 'job',
    model: raw.model ?? 'unknown',
  };
}

export function hasJobInput(source?: JobExtractSource): boolean {
  return Boolean(source?.text?.trim() || source?.imageBase64);
}

export function isJobExtractResponse(value: unknown): value is JobExtractResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const facts = (x: unknown) => x === null || x === undefined || (typeof x === 'object' && !Array.isArray(x));
  return typeof v.jobId === 'string' && facts(v.ad) && facts(v.chat) && Boolean(v.ad || v.chat);
}

export function normalizeJobResponse(raw: JobAssessResponse): JobAssessResponse {
  const base = normalizeResponse(raw);
  const tier = raw.attention === 'lower' || raw.attention === 'verify' || raw.attention === 'pause' ? raw.attention : undefined;
  return {
    ...base,
    kind: 'job',
    attention: tier ?? (base.verdict === 'danger' ? 'pause' : base.verdict === 'careful' ? 'verify' : 'lower'),
    attentionHeadline: raw.attentionHeadline ?? base.title,
    conflicts: Array.isArray(raw.conflicts) ? raw.conflicts : [],
    stillUnclear: Array.isArray(raw.stillUnclear) ? raw.stillUnclear.filter(x => typeof x === 'string') : [],
    findings: Array.isArray(raw.findings) ? raw.findings.filter(f => f && typeof f.label === 'string') : [],
    adFacts: raw.adFacts ?? null,
    chatFacts: raw.chatFacts ?? null,
  };
}
