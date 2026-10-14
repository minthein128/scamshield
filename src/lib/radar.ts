import type { Trend } from '../api/types';
import type { CountryCode } from '../data/countries';

export type RadarScope = CountryCode | 'GLOBAL';

export function defaultScope(destination?: CountryCode, home?: CountryCode): RadarScope {
  return destination ?? home ?? 'GLOBAL';
}

export const TREND_SYMBOL: Record<Trend, string> = { up: '▲', flat: '▬', down: '▼' };
export const TREND_LABEL: Record<Trend, string> = { up: 'Rising', flat: 'Steady', down: 'Falling' };

export function reportCountText(n: number, days = 30): string {
  return `${n} ${n === 1 ? 'report' : 'reports'} in ${days} days`;
}

export function seenLine(seenCount: number | undefined): string | null {
  if (!seenCount || seenCount < 1) return null;
  return `Reported ${seenCount} ${seenCount === 1 ? 'time' : 'times'} by other SafeRoute users in the last 30 days`;
}
