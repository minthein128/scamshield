import type { LanguageCode } from '../api/types';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  speechLocale: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', speechLocale: 'en-US' },
  { code: 'id', label: 'Bahasa', speechLocale: 'id-ID' },
  { code: 'tl', label: 'Tagalog', speechLocale: 'fil-PH' },
  { code: 'my', label: 'Myanmar', speechLocale: 'my-MM' },
];

export function languageOption(code: LanguageCode): LanguageOption {
  return LANGUAGES.find(l => l.code === code) ?? LANGUAGES[0];
}
