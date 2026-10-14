import { HOTLINES, type Hotline, type HotlineCategory } from '../data/hotlines';
import { COUNTRIES, type CountryCode } from '../data/countries';

export { HOTLINES };
export type { Hotline, HotlineCategory };

export const CATEGORY_ORDER: HotlineCategory[] = ['trafficking', 'police', 'cybercrime', 'consular'];

export const CATEGORY_LABELS: Record<HotlineCategory, string> = {
  trafficking: 'Anti-trafficking',
  police: 'Police',
  cybercrime: 'Scam and cybercrime reporting',
  consular: 'Help for citizens abroad',
};

const categoryRank = (c: HotlineCategory) => CATEGORY_ORDER.indexOf(c);

export function hotlinesForCountry(country: CountryCode, list: Hotline[] = HOTLINES): Hotline[] {
  return list.filter(h => h.country === country).sort((a, b) => categoryRank(a.category) - categoryRank(b.category));
}

export interface HelpSection {
  country: CountryCode;
  entries: Hotline[];
}

export function helpSections(destination?: CountryCode, home?: CountryCode, list: Hotline[] = HOTLINES): HelpSection[] {
  const order = [destination, home].filter((c, i, all): c is CountryCode => Boolean(c) && all.indexOf(c) === i);
  return order.map(country => ({
    country,
    entries: hotlinesForCountry(country, list).filter(h => h.category !== 'consular' || country === home),
  }));
}

export function allSections(list: Hotline[] = HOTLINES): HelpSection[] {
  return COUNTRIES.map(c => ({ country: c.code, entries: hotlinesForCountry(c.code, list) }));
}

const dialable = (h: Hotline) => Boolean(h.dial);

export function primaryHotline(destination?: CountryCode, home?: CountryCode, list: Hotline[] = HOTLINES): Hotline | undefined {
  const pick = (country: CountryCode | undefined, category: HotlineCategory) =>
    country ? list.find(h => h.country === country && h.category === category && dialable(h)) : undefined;
  return (
    pick(destination, 'trafficking') ?? pick(home, 'trafficking') ?? pick(destination, 'police') ?? pick(home, 'consular') ?? pick(home, 'police')
  );
}

const digits = (v: string) => v.replace(/[^\d+]/g, '');

export function hotlineByDial(dial: string | undefined, list: Hotline[] = HOTLINES): Hotline | undefined {
  if (!dial) return undefined;
  const wanted = digits(dial);
  return list.find(h => h.dial && digits(h.dial) === wanted);
}

export function resolveCallTarget(actionValue: string | undefined, destination?: CountryCode, home?: CountryCode, list: Hotline[] = HOTLINES): Hotline | undefined {
  return hotlineByDial(actionValue, list) ?? primaryHotline(destination, home, list);
}
