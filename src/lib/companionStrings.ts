import { COMPANION_STRING_KEYS, type CompanionStringKey } from 'shield-module';
import { t } from '../i18n';

/** Voice companion labels for the native bubble, in the current UI language. */
export function companionStrings(): Record<CompanionStringKey, string> {
  return Object.fromEntries(COMPANION_STRING_KEYS.map(key => [key, t(`live:companion.${key}`)])) as Record<CompanionStringKey, string>;
}
