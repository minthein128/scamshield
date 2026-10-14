import type { Family, ScamType } from '../types.js';
import { rankOf, sumDays } from './rank.js';
import { type AggDoc, type Insights, K_ANON } from './types.js';

export const SCAM_LABELS: Record<ScamType, string> = {
  job_trafficking: 'Fake overseas job (trafficking)',
  romance_pig_butchering: 'Romance and crypto investment',
  parcel_phishing: 'Fake parcel or customs fee',
  fake_agency: 'Unlicensed recruitment agency',
  marketplace_fraud: 'Marketplace fraud',
  investment: 'Investment and task scams',
  other: 'Other scams',
  none: 'None',
};

export const daysOf = (a: AggDoc) => sumDays(a.real.days, a.seed.days);
const famsOf = (a: AggDoc) => sumDays(a.real.fam, a.seed.fam);

export interface InsightInput {
  types: AggDoc[];
  clusters: AggDoc[];
  domains: AggDoc[];
}

export function buildInsights(input: InsightInput, country: string, days: number, now: Date): Insights {
  const rank = (a: AggDoc) => ({ a, r: rankOf(daysOf(a), now, days) });
  const surfaced = (xs: AggDoc[]) =>
    xs
      .map(rank)
      .filter((x) => x.r.count >= K_ANON)
      .sort((x, y) => y.r.rank - x.r.rank);

  const clusters = surfaced(input.clusters);
  const risks = surfaced(input.types)
    .filter((x) => x.a.key !== 'none')
    .map(({ a, r }) => {
      const fam = famsOf(a);
      const reports = Object.values(daysOf(a)).reduce((s, n) => s + n, 0);
      const top = Object.entries(fam)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([family, n]) => ({ family: family as Family, share: Math.min(1, Math.round((n / Math.max(1, reports)) * 100) / 100) }))
        .filter((f) => f.share > 0);
      const example = clusters.find((c) => c.a.scamType === a.key && c.a.example)?.a.example;
      return {
        scamType: a.key as ScamType,
        label: SCAM_LABELS[a.key as ScamType] ?? a.key,
        count: r.count,
        trend: r.trend,
        ...(example ? { example } : {}),
        topFlagFamilies: top,
      };
    });

  return {
    country,
    days,
    generatedAt: now.toISOString(),
    k: K_ANON,
    risks,
    domains: surfaced(input.domains)
      .filter((x) => x.a.value)
      .slice(0, 10)
      .map(({ a, r }) => ({ domain: a.value as string, count: r.count, trend: r.trend })),
    campaigns: clusters
      .filter((x) => x.a.label)
      .slice(0, 5)
      .map(({ a, r }) => ({
        name: a.label as string,
        scamType: (a.scamType ?? 'other') as ScamType,
        count: r.count,
        trend: r.trend,
        ...(a.example ? { example: a.example } : {}),
      })),
  };
}
