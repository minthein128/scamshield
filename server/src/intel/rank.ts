import { RETENTION_DAYS } from './types.js';

export const HALF_LIFE_DAYS = 7;
export const UP_RATIO = 1.25;
export const DOWN_RATIO = 0.8;
const EPS = 0.1;

export type Trend = 'up' | 'down' | 'flat';

const DAY_MS = 86_400_000;

export const midnight = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export const ageOf = (day: string, today: Date) =>
  Math.round((midnight(today) - Date.UTC(Number(day.slice(0, 4)), Number(day.slice(4, 6)) - 1, Number(day.slice(6, 8)))) / DAY_MS);

export function sumDays(...maps: Array<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of maps) for (const [d, n] of Object.entries(m)) out[d] = (out[d] ?? 0) + n;
  return out;
}

/** Raw count of reports whose age is in [from, from + span) days. */
export function countIn(days: Record<string, number>, today: Date, span: number, from = 0): number {
  let total = 0;
  for (const [d, n] of Object.entries(days)) {
    const age = ageOf(d, today);
    if (age >= from && age < from + span) total += n;
  }
  return total;
}

/** Sum of counts weighted by 0.5^(age / half-life) over a window of `span` days. */
export function decayedCount(days: Record<string, number>, today: Date, span: number): number {
  let total = 0;
  for (const [d, n] of Object.entries(days)) {
    const age = ageOf(d, today);
    if (age >= 0 && age < span) total += n * 0.5 ** (age / HALF_LIFE_DAYS);
  }
  return total;
}

export interface Ranked {
  count: number;
  decayed: number;
  ratio: number;
  trend: Trend;
  rank: number;
}

/** Trending score of one counter over `span` days against the baseline of the span before it. */
export function rankOf(days: Record<string, number>, today: Date, span: number): Ranked {
  const count = countIn(days, today, span);
  const decayed = decayedCount(days, today, span);
  let weights = 0;
  for (let a = 0; a < span; a++) weights += 0.5 ** (a / HALF_LIFE_DAYS);
  const priorSpan = Math.min(span, RETENTION_DAYS - span);
  if (priorSpan <= 0) return { count, decayed, ratio: 1, trend: 'flat', rank: decayed };
  const recentRate = decayed / weights;
  const baselineRate = countIn(days, today, priorSpan, span) / priorSpan;
  const ratio = (recentRate + EPS) / (baselineRate + EPS);
  const trend: Trend = ratio > UP_RATIO ? 'up' : ratio < DOWN_RATIO ? 'down' : 'flat';
  return { count, decayed, ratio, trend, rank: decayed * Math.min(2, Math.max(0.5, ratio)) };
}
