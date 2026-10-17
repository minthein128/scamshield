import type { Family, Flag, Lang, LinkCheck, ScamType, Severity, Verdict } from './types.js';

export const FAMILY_WEIGHT: Record<Family, number> = {
  too_good: 1.4,
  pressure: 0.6,
  payment_route: 1.6,
  identity: 0.8,
  link_risk: 1.4,
  known_bad: 3.0,
  trafficking: 2.5,
};
export const SEVERITY_MULT: Record<Severity, number> = { low: 0.5, medium: 1, high: 1.5 };
export const UNSOLICITED_BASE = -1.0;
export const DANGER_LINE = 3.0;
export const POINTS_TO_SCORE = 70 / DANGER_LINE;
export const NEW_DOMAIN_DAYS = 30;
export const YOUNG_DOMAIN_DAYS = 180;

export interface ScoreInput {
  flags: Flag[];
  linkChecks: LinkCheck[];
  unsolicited: boolean;
  llmVerdict?: Verdict;
  scamType?: ScamType;
  language?: Lang;
}

export interface ScoreResult {
  verdict: Verdict;
  score: number;
  points: number;
  flags: Flag[];
  families: Family[];
  overrides: string[];
}

const SEV_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2 };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function verdictFor(score: number): Verdict {
  return score >= 70 ? 'danger' : score >= 35 ? 'careful' : 'safe';
}

const UNSAFE_LINK: Record<Lang, string> = {
  en: 'Google lists this link as unsafe',
  id: 'Google menandai tautan ini tidak aman',
  tl: 'Minarkahan ng Google na hindi ligtas ang link na ito',
  my: 'Google က ဤလင့်ခ်ကို မလုံခြုံဟု သတ်မှတ်ထားသည်',
  th: 'Google ระบุว่าลิงก์นี้ไม่ปลอดภัย',
};

const DOMAIN_AGE: Record<Lang, (days: number) => string> = {
  en: (d) => `Website registered ${d} days ago`,
  id: (d) => `Situs web didaftarkan ${d} hari yang lalu`,
  tl: (d) => `Nairehistro ang website ${d} araw pa lang ang nakalipas`,
  my: (d) => `ဤဝက်ဘ်ဆိုက်ကို လွန်ခဲ့သော ${d} ရက်ကမှ မှတ်ပုံတင်ထားသည်`,
  th: (d) => `เว็บไซต์นี้จดทะเบียนเมื่อ ${d} วันที่แล้ว`,
};

/** Flags that the correlate stage proves, added on top of what the model extracted. */
export function derivedFlags(linkChecks: LinkCheck[], lang: Lang = 'en'): Flag[] {
  const out: Flag[] = [];
  for (const l of linkChecks) {
    if (l.webRisk !== 'clean' && l.webRisk !== 'unknown') {
      out.push({ family: 'known_bad', label: UNSAFE_LINK[lang], evidence: l.url, severity: 'high' });
    }
    if (l.domainAgeDays !== undefined && l.domainAgeDays < YOUNG_DOMAIN_DAYS) {
      out.push({
        family: 'link_risk',
        label: DOMAIN_AGE[lang](l.domainAgeDays),
        evidence: l.url,
        severity: l.domainAgeDays < NEW_DOMAIN_DAYS ? 'high' : 'medium',
      });
    }
  }
  return out;
}

export function score(input: ScoreInput): ScoreResult {
  const flags = [...input.flags, ...derivedFlags(input.linkChecks, input.language)];
  const strongest = new Map<Family, Severity>();
  for (const f of flags) {
    const cur = strongest.get(f.family);
    if (!cur || SEV_RANK[f.severity] > SEV_RANK[cur]) strongest.set(f.family, f.severity);
  }
  let points = input.unsolicited && flags.length > 0 ? UNSOLICITED_BASE : 0;
  for (const [family, sev] of strongest) points += FAMILY_WEIGHT[family] * SEVERITY_MULT[sev];
  points = Math.max(0, points);

  let value = clamp(Math.round(points * POINTS_TO_SCORE), 0, 100);
  const overrides: string[] = [];
  const families = [...strongest.keys()];

  // A single family cannot reach danger on its own unless it is a hard signal.
  if (value >= 70 && families.length < 2 && !strongest.has('known_bad') && strongest.get('trafficking') !== 'high') {
    value = 69;
    overrides.push('single_family_cap');
  }
  if (input.linkChecks.some((l) => l.webRisk !== 'clean' && l.webRisk !== 'unknown')) {
    value = Math.max(value, 90);
    overrides.push('web_risk_hit');
  }
  if (strongest.get('trafficking') === 'high') {
    value = Math.max(value, 80);
    overrides.push('trafficking_high');
  }
  const namedPattern = input.scamType !== undefined && input.scamType !== 'none' && input.scamType !== 'other';
  if (namedPattern && input.flags.length > 0 && value < 35) {
    value = 35;
    overrides.push('scam_pattern_floor');
  }
  if (input.llmVerdict === 'danger' && value < 35 && flags.length > 0) {
    value = 35;
    overrides.push('model_raised_to_careful');
  }

  return { verdict: verdictFor(value), score: value, points: Math.round(points * 100) / 100, flags, families, overrides };
}
