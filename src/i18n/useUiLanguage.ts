import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { LanguageCode } from '../api/types';
import { setUiLanguage } from './index';
import { checkLanguageFor, isUiLanguage, type UiLanguage } from './languages';

export function useUiLanguage(): { uiLanguage: UiLanguage; setUiLanguage: (code: UiLanguage) => Promise<void>; checkLanguageFor: (code: UiLanguage) => LanguageCode } {
  const { i18n } = useTranslation();
  const uiLanguage: UiLanguage = isUiLanguage(i18n.language) ? i18n.language : 'en';
  const set = useCallback((code: UiLanguage) => setUiLanguage(code), []);
  return { uiLanguage, setUiLanguage: set, checkLanguageFor };
}
