import type { LanguageCode } from '../api/types';

export type UiLanguage = 'en' | 'my' | 'id' | 'tl' | 'th';

export interface UiLanguageOption {
  code: UiLanguage;
  label: string;
  nativeLabel?: string;
  checkLanguage: LanguageCode;
}

export const UI_LANGUAGES: UiLanguageOption[] = [
  { code: 'en', label: 'English', checkLanguage: 'en' },
  { code: 'id', label: 'Bahasa Indonesia', checkLanguage: 'id' },
  { code: 'tl', label: 'Tagalog', checkLanguage: 'tl' },
  { code: 'my', label: 'Myanmar', checkLanguage: 'my' },
  { code: 'th', label: 'Thai', checkLanguage: 'en' },
];

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'en';
export const UI_LANGUAGE_CODES: UiLanguage[] = UI_LANGUAGES.map(l => l.code);

export function isUiLanguage(value: unknown): value is UiLanguage {
  return typeof value === 'string' && (UI_LANGUAGE_CODES as string[]).includes(value);
}

/** The backend only checks in en, id, tl and my, so Thai gets English verdicts. */
export function checkLanguageFor(ui: UiLanguage): LanguageCode {
  return UI_LANGUAGES.find(l => l.code === ui)?.checkLanguage ?? 'en';
}

const ALIASES: Record<string, UiLanguage> = { fil: 'tl', tl: 'tl', in: 'id', id: 'id', my: 'my', th: 'th', en: 'en' };

/** Maps a BCP 47 tag or bare language code from the device to a supported UI language. */
export function matchDeviceLanguage(tag: string | null | undefined): UiLanguage | undefined {
  const base = (tag ?? '').toLowerCase().split(/[-_]/)[0];
  return ALIASES[base];
}

/** Web always starts in English. Native uses the first supported device locale. */
export function pickDefaultLanguage(platform: string, deviceTags: (string | null | undefined)[]): UiLanguage {
  if (platform === 'web') return DEFAULT_UI_LANGUAGE;
  for (const tag of deviceTags) {
    const match = matchDeviceLanguage(tag);
    if (match) return match;
  }
  return DEFAULT_UI_LANGUAGE;
}
