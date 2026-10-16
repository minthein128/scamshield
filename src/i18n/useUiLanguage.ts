import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { setUiLanguage } from './index';
import { isUiLanguage, type UiLanguage } from './languages';

export function useUiLanguage(): { uiLanguage: UiLanguage; setUiLanguage: (code: UiLanguage) => Promise<void> } {
  const { i18n } = useTranslation();
  const uiLanguage: UiLanguage = isUiLanguage(i18n.language) ? i18n.language : 'en';
  const set = useCallback((code: UiLanguage) => setUiLanguage(code), []);
  return { uiLanguage, setUiLanguage: set };
}
