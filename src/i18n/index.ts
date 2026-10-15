import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_UI_LANGUAGE, pickDefaultLanguage, type UiLanguage } from './languages';
import { NAMESPACES, resources } from './resources';
import { loadUiLanguage, saveUiLanguage } from './storage';

if (typeof Intl === 'undefined' || typeof Intl.PluralRules !== 'function') {
  require('intl-pluralrules');
}

function deviceTags(): string[] {
  try {
    return getLocales().flatMap(l => [l.languageTag, l.languageCode]).filter((x): x is string => Boolean(x));
  } catch {
    return [];
  }
}

export function defaultLanguage(): UiLanguage {
  return pickDefaultLanguage(Platform.OS, deviceTags());
}

function syncDocument(lng: string): void {
  if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = lng;
}

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage(),
  fallbackLng: DEFAULT_UI_LANGUAGE,
  supportedLngs: Object.keys(resources),
  ns: NAMESPACES,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
  initAsync: false,
});
syncDocument(i18n.language);

/** Applies a saved choice, if any. Resolves once the UI language is final. */
export async function restoreUiLanguage(): Promise<UiLanguage> {
  const saved = await loadUiLanguage();
  if (saved && saved !== i18n.language) await i18n.changeLanguage(saved);
  syncDocument(i18n.language);
  return i18n.language as UiLanguage;
}

/** Switches the UI at once and remembers the choice. */
export async function setUiLanguage(code: UiLanguage): Promise<void> {
  await i18n.changeLanguage(code);
  syncDocument(code);
  await saveUiLanguage(code).catch(() => undefined);
}

export function currentUiLanguage(): UiLanguage {
  return i18n.language as UiLanguage;
}

export const t = ((...args: unknown[]) => (i18n.t as unknown as (...a: unknown[]) => string)(...args)) as unknown as typeof i18n.t;
export default i18n;
