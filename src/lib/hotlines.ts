import { t } from '../i18n';
import { HOTLINES, type Hotline, type HotlineCategory } from '../data/hotlines';
import { COUNTRIES, type CountryCode } from '../data/countries';
import { runtimeHotlines } from './runtimeConfig';
import type { CheckResponse } from '../api/types';

export { HOTLINES };
export type { Hotline, HotlineCategory };

export const CATEGORY_ORDER: HotlineCategory[] = ['trafficking', 'police', 'cybercrime', 'consular', 'ngo'];

export function categoryLabel(category: HotlineCategory): string {
  return t(`help:categories.${category}`);
}

/** Runtime hotlines win over bundled ones by id. Once a published list exists it is the list: retired and deleted ids drop out. */
export function mergeHotlines(bundled: Hotline[], runtime: Hotline[] | null): Hotline[] {
  if (!runtime || runtime.length === 0) return bundled;
  const base = new Map(bundled.map(h => [h.id, h]));
  return runtime.map(r => ({ ...base.get(r.id), ...r }));
}

let merged: { bundled: Hotline[]; runtime: Hotline[] | null; out: Hotline[] } | null = null;

/** The single access point for hotline data. */
export function currentHotlines(): Hotline[] {
  const runtime = runtimeHotlines();
  if (!merged || merged.runtime !== runtime || merged.bundled !== HOTLINES) merged = { bundled: HOTLINES, runtime, out: mergeHotlines(HOTLINES, runtime) };
  return merged.out;
}

const categoryRank = (c: HotlineCategory) => CATEGORY_ORDER.indexOf(c);

export function hotlinesForCountry(country: CountryCode, list: Hotline[] = currentHotlines()): Hotline[] {
  return list.filter(h => h.country === country).sort((a, b) => categoryRank(a.category) - categoryRank(b.category));
}

export interface HelpSection {
  country: CountryCode;
  entries: Hotline[];
}

export function helpSections(destination?: CountryCode, home?: CountryCode, list: Hotline[] = currentHotlines()): HelpSection[] {
  const order = [destination, home].filter((c, i, all): c is CountryCode => Boolean(c) && all.indexOf(c) === i);
  return order.map(country => ({
    country,
    entries: hotlinesForCountry(country, list).filter(h => h.category !== 'consular' || country === home),
  }));
}

export function allSections(list: Hotline[] = currentHotlines()): HelpSection[] {
  return COUNTRIES.map(c => ({ country: c.code, entries: hotlinesForCountry(c.code, list) }));
}

const dialable = (h: Hotline) => Boolean(h.dial);

export type HotlineFocus = 'trafficking' | 'fraud';

/** Job, agency and trafficking results lead with anti-trafficking lines; other scams with scam or police lines. */
export function hotlineFocus(result: Pick<CheckResponse, 'kind' | 'scamType' | 'flags'>): HotlineFocus {
  const trafficking =
    result.kind === 'job' ||
    result.kind === 'agency' ||
    result.scamType === 'job_trafficking' ||
    result.scamType === 'fake_agency' ||
    result.flags.some(f => f.family === 'trafficking');
  return trafficking ? 'trafficking' : 'fraud';
}

export function primaryHotline(
  destination?: CountryCode,
  home?: CountryCode,
  focus: HotlineFocus = 'trafficking',
  list: Hotline[] = currentHotlines(),
): Hotline | undefined {
  const pick = (country: CountryCode | undefined, category: HotlineCategory) =>
    country ? list.find(h => h.country === country && h.category === category && dialable(h)) : undefined;
  if (focus === 'fraud') {
    return (
      pick(destination, 'cybercrime') ?? pick(destination, 'police') ?? pick(home, 'cybercrime') ?? pick(home, 'police') ?? pick(home, 'consular')
    );
  }
  return (
    pick(destination, 'trafficking') ?? pick(home, 'trafficking') ?? pick(destination, 'police') ?? pick(home, 'consular') ?? pick(home, 'police')
  );
}

const digits = (v: string) => v.replace(/[^\d+]/g, '');

export function hotlineByDial(dial: string | undefined, list: Hotline[] = currentHotlines()): Hotline | undefined {
  if (!dial) return undefined;
  const wanted = digits(dial);
  return list.find(h => h.dial && digits(h.dial) === wanted);
}

export function resolveCallTarget(
  actionValue: string | undefined,
  destination?: CountryCode,
  home?: CountryCode,
  focus: HotlineFocus = 'trafficking',
  list: Hotline[] = currentHotlines(),
): Hotline | undefined {
  return hotlineByDial(actionValue, list) ?? primaryHotline(destination, home, focus, list);
}
