import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RuntimeNotice } from './runtimeConfig';

export const DISMISSED_KEY = 'saferoute.notices.dismissed.v1';

export interface NoticeAudience {
  countries: (string | undefined)[];
  language: string;
}

/** The first active notice for this reader that was not dismissed. Warnings come before info. */
export function pickNotice(items: RuntimeNotice[], audience: NoticeAudience, dismissed: string[], now = Date.now()): RuntimeNotice | undefined {
  const mine = audience.countries.filter((c): c is string => Boolean(c));
  return items
    .filter(n => !dismissed.includes(n.id))
    .filter(n => !n.startsAt || Date.parse(n.startsAt) <= now)
    .filter(n => !n.endsAt || Date.parse(n.endsAt) >= now)
    .filter(n => !n.language?.length || n.language.includes(audience.language))
    .filter(n => !n.country?.length || n.country.some(c => mine.includes(c)))
    .sort((a, b) => Number(b.severity === 'warning') - Number(a.severity === 'warning'))[0];
}

export async function loadDismissed(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function dismissNotice(id: string): Promise<string[]> {
  const next = [...new Set([...(await loadDismissed()), id])].slice(-50);
  await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(next)).catch(() => undefined);
  return next;
}
