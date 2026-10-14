import type { CheckAction, CheckResponse, FlagFamily, ScamType, Severity, Verdict, WebRisk, Flag } from '../api/types';
import theme from '../theme/theme';

export interface VerdictStyle {
  label: string;
  background: string;
  foreground: string;
  subtle: string;
  track: string;
}

const { colors } = theme;

export const VERDICT_STYLES: Record<Verdict, VerdictStyle> = {
  danger: { label: 'High risk', background: colors.danger, foreground: colors.white, subtle: '#FFEDD5', track: colors.dangerBarTrack },
  careful: { label: 'Be careful', background: colors.warningText, foreground: colors.white, subtle: colors.amberLight, track: colors.warningBadge },
  safe: { label: 'Low risk', background: colors.brandBlue, foreground: colors.white, subtle: colors.brandBlueLight, track: '#93B4FF' },
};

export const FAMILY_ORDER: FlagFamily[] = ['trafficking', 'known_bad', 'payment_route', 'link_risk', 'identity', 'pressure', 'too_good'];

export const FAMILY_LABELS: Record<FlagFamily, string> = {
  too_good: 'Too good to be true',
  pressure: 'Pressure',
  payment_route: 'Payment route',
  identity: 'Identity',
  link_risk: 'Link risk',
  known_bad: 'Known bad',
  trafficking: 'Trafficking',
};

export const SCAM_TYPE_LABELS: Record<ScamType, string> = {
  job_trafficking: 'Likely trafficking recruitment',
  romance_pig_butchering: 'Romance and investment scam',
  parcel_phishing: 'Parcel phishing',
  fake_agency: 'Fake recruitment agency',
  marketplace_fraud: 'Marketplace fraud',
  investment: 'Investment scam',
  other: 'Suspicious message',
  none: 'No scam pattern found',
};

export const WEB_RISK_LABELS: Record<WebRisk, string> = {
  clean: 'No known threats',
  malware: 'Malware',
  social_engineering: 'Phishing or deception',
  unwanted_software: 'Unwanted software',
  unknown: 'Not checked',
};

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function verdictFromScore(score: number): Verdict {
  if (score >= 70) return 'danger';
  if (score >= 35) return 'careful';
  return 'safe';
}

export function filledSegments(score: number): number {
  return Math.max(1, Math.min(4, Math.ceil(score / 25)));
}

export interface FlagGroup {
  family: FlagFamily;
  label: string;
  flags: Flag[];
}

export function groupFlags(flags: Flag[]): FlagGroup[] {
  const groups = new Map<FlagFamily, Flag[]>();
  for (const flag of flags) groups.set(flag.family, [...(groups.get(flag.family) ?? []), flag]);
  return FAMILY_ORDER.filter(f => groups.has(f)).map(family => ({
    family,
    label: FAMILY_LABELS[family],
    flags: [...(groups.get(family) ?? [])].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
  }));
}

export function hotlineNumber(action?: CheckAction): string | undefined {
  return action?.value?.trim() || process.env.EXPO_PUBLIC_HOTLINE_NUMBER?.trim() || undefined;
}

export function telUrl(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, '')}`;
}

export function shareMessage(result: CheckResponse): string {
  return `SafeRoute check: ${result.title}\n${result.summary}\nRisk score ${result.score}/100.`;
}

export function entryLabel(result: CheckResponse, source?: string): string {
  const first = result.flags[0]?.evidence;
  return source || (first ? first.replace(/^"|"$/g, '').slice(0, 48) : SCAM_TYPE_LABELS[result.scamType]);
}
