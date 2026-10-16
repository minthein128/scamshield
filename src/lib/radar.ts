import { t } from '../i18n';
import type { Trend } from '../api/types';
import type { CountryCode } from '../data/countries';

export type RadarScope = CountryCode | 'GLOBAL';

export function defaultScope(destination?: CountryCode, home?: CountryCode): RadarScope {
  return destination ?? home ?? 'GLOBAL';
}

export const TREND_SYMBOL: Record<Trend, string> = { up: '▲', flat: '▬', down: '▼' };
export function trendLabel(trend: Trend): string {
  return t(`radar:trend.${trend}`);
}

export function reportCountText(n: number, days = 30): string {
  return t('radar:reports', { count: n, days });
}

export function seenLine(seenCount: number | undefined): string | null {
  if (!seenCount || seenCount < 1) return null;
  return t('report:seen', { count: seenCount });
}
