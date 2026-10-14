import { COUNTRIES, type Country, type CountryCode } from '../data/countries';

export { COUNTRIES };
export type { Country, CountryCode };

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && COUNTRIES.some(c => c.code === value);
}

export function countryName(code: CountryCode | undefined): string {
  return COUNTRIES.find(c => c.code === code)?.name ?? '';
}

export function countryFromText(text: string | undefined): CountryCode | undefined {
  const t = (text ?? '').toLowerCase();
  if (!t) return undefined;
  return COUNTRIES.find(c => c.aliases.some(a => t.includes(a)))?.code;
}
