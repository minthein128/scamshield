import type { ShieldCheckResult } from 'shield-module';
import type { CheckKind, CheckResponse, FlagFamily } from '../api/types';
import { normalizeResponse } from '../api/validate';

export const REPORT_LINK = /^saferoute:\/\/report\/([^/?#]+)/i;

export function reportIdFromUrl(url: string | null | undefined): string | null {
  const match = url ? REPORT_LINK.exec(url) : null;
  return match ? decodeURIComponent(match[1]) : null;
}

export function toCheckResponse(result: ShieldCheckResult): CheckResponse {
  return normalizeResponse({
    ...result,
    kind: result.kind as CheckKind,
    spokenWarning: result.spokenWarning ?? result.summary,
    scamType: (result.scamType ?? 'none') as CheckResponse['scamType'],
    flags: result.flags.map(f => ({ ...f, family: f.family as FlagFamily, evidence: f.evidence ?? '' })),
    linkChecks: (result.linkChecks ?? []) as CheckResponse['linkChecks'],
    actions: (result.actions ?? []) as CheckResponse['actions'],
    model: result.model ?? 'unknown',
  });
}

export function sourceLabel(kind: string | undefined): string {
  return kind === 'message' ? 'Message check' : 'Screen check';
}

export function apiUrlFromEnv(): string {
  return process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
}

export function isCleartext(url: string): boolean {
  return /^http:\/\//i.test(url);
}
