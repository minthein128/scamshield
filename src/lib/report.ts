import type { CheckResponse, FlagFamily, Severity, Verdict, Flag } from '../api/types';
import { t } from '../i18n';
import { familyLabel } from './labels';
import { resultWord } from './attention';
import theme from '../theme/theme';

export interface VerdictStyle {
  background: string;
  foreground: string;
  subtle: string;
  track: string;
  chipBackground: string;
  chipForeground: string;
}

const { colors } = theme;

export const VERDICT_STYLES: Record<Verdict, VerdictStyle> = {
  danger: { background: colors.danger, foreground: colors.white, subtle: '#FFE4E9', track: colors.dangerBarTrack, chipBackground: theme.verdictRoles.danger.chipBg, chipForeground: theme.verdictRoles.danger.chipText },
  careful: { background: colors.warningText, foreground: colors.white, subtle: colors.amberLight, track: colors.warningBadge, chipBackground: theme.verdictRoles.careful.chipBg, chipForeground: theme.verdictRoles.careful.chipText },
  safe: { background: colors.safe, foreground: colors.white, subtle: colors.safeBg, track: colors.safeTrack, chipBackground: theme.verdictRoles.safe.chipBg, chipForeground: theme.verdictRoles.safe.chipText },
};

export const FAMILY_ORDER: FlagFamily[] = ['trafficking', 'known_bad', 'payment_route', 'link_risk', 'identity', 'pressure', 'too_good'];

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
    label: familyLabel(family),
    flags: [...(groups.get(family) ?? [])].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]),
  }));
}


export function telUrl(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, '')}`;
}

export function shareMessage(result: CheckResponse): string {
  return t('report:shareMessage', { title: result.title, summary: result.summary, score: result.score });
}

export function warnMessage(result: CheckResponse): string {
  const summary = result.summary.length > 280 ? `${result.summary.slice(0, 277)}...` : result.summary;
  return t('report:warnMessage', { verdict: resultWord(result).toLowerCase(), title: result.title, summary });
}
