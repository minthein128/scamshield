import type { CheckResponse, FlagFamily, JobConflict, LinkCheck, Severity, Source, Verdict, Flag, WebRisk } from '../api/types';
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


const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** A mismatch is shown once: the server also lists it as a warning sign, so drop that copy. */
export function withoutConflictFlags(flags: Flag[], conflicts: JobConflict[] | undefined): Flag[] {
  if (!conflicts?.length) return flags;
  return flags.filter(f => !conflicts.some(c => sameText(f.label, c.description)));
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

const NEW_DOMAIN_DAYS = 30;
const SERIOUS_LINK_FAMILIES: FlagFamily[] = ['link_risk', 'known_bad'];

function hostOf(url: string): string {
  try {
    return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export type LinkStatus = WebRisk | 'notListed';

/** A clean Google result reads "Not on Google's lists" when the report has a serious sign about the link. */
export function linkStatus(link: LinkCheck, flags: Flag[], links: LinkCheck[] = [link]): LinkStatus {
  if (link.webRisk !== 'clean') return link.webRisk;
  if (link.domainAgeDays !== undefined && link.domainAgeDays < NEW_DOMAIN_DAYS) return 'notListed';
  const mentions = (f: Flag, l: LinkCheck) => `${f.evidence} ${f.label}`.toLowerCase().includes(hostOf(l.url));
  const serious = flags.filter(f => f.severity === 'high' && SERIOUS_LINK_FAMILIES.includes(f.family));
  return serious.some(f => mentions(f, link) || !links.some(l => mentions(f, l))) ? 'notListed' : 'clean';
}

const REDIRECT_HOSTS = /(^|\.)(vertexaisearch\.cloud\.google\.com|google\.[a-z.]+)$/;
const DOMAIN_LIKE = /^[a-z\d-]+(\.[a-z\d-]+)+$/i;

/** The real site behind a source: the redirect target, the title when it is a domain, else the URL host. */
export function sourceDomain(src: Source): string | undefined {
  let url: URL;
  try {
    url = new URL(src.url);
  } catch {
    return undefined;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (!REDIRECT_HOSTS.test(host)) return host;
  const target = url.searchParams.get('q') ?? url.searchParams.get('url');
  if (target && /^https?:\/\//i.test(target)) return hostOf(target);
  const title = src.title.trim().replace(/^www\./, '');
  return DOMAIN_LIKE.test(title) ? title.toLowerCase() : undefined;
}

/** Title and second line for a source card; never a raw redirect URL. */
export function sourceLines(src: Source): { title: string; domain?: string } {
  const domain = sourceDomain(src);
  const title = src.title.trim() || domain || hostOf(src.url);
  return { title, domain: domain && domain !== title.toLowerCase() ? domain : undefined };
}

export const MAX_SOURCES = 5;

/** One source per site, in API order, capped so the list stays short. */
export function uniqueSources(sources: Source[], max = MAX_SOURCES): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const src of sources) {
    const host = (sourceDomain(src) ?? hostOf(src.url)).toLowerCase();
    if (seen.has(host)) continue;
    seen.add(host);
    out.push(src);
    if (out.length === max) break;
  }
  return out;
}

const SEVERITY_ORDER: Severity[] = ['low', 'medium', 'high'];
const VERDICT_CAP: Record<Verdict, Severity> = { safe: 'low', careful: 'medium', danger: 'high' };

/** A row's severity wording never reads stronger than the verdict above it. */
export function cappedSeverity(severity: Severity, verdict: Verdict): Severity {
  const cap = VERDICT_CAP[verdict];
  return SEVERITY_ORDER.indexOf(severity) > SEVERITY_ORDER.indexOf(cap) ? cap : severity;
}
