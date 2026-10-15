import type { LanguageCode } from '../api/types';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel?: string;
  speechLocale: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', speechLocale: 'en-US' },
  { code: 'id', label: 'Bahasa Indonesia', speechLocale: 'id-ID' },
  { code: 'tl', label: 'Tagalog', speechLocale: 'fil-PH' },
  { code: 'my', label: 'Myanmar', speechLocale: 'my-MM' },
  { code: 'th', label: 'Thai', speechLocale: 'th-TH' },
];

export function languageOption(code: LanguageCode): LanguageOption {
  return LANGUAGES.find(l => l.code === code) ?? LANGUAGES[0];
}
