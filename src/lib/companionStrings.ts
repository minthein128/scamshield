import { COMPANION_STRING_KEYS, type CompanionStringKey } from 'shield-module';
import { t } from '../i18n';

/** Overlay labels that reuse app strings, so the bubble says exactly what the app says. */
const REUSED: Partial<Record<CompanionStringKey, string>> = {
  verdictSafe: 'common:verdict.safe',
  verdictCareful: 'common:verdict.careful',
  verdictDanger: 'common:verdict.danger',
  dismiss: 'home:notice.dismiss',
  appName: 'common:appName',
};

/** Labels for the native overlay (chips, card buttons, voice companion), in the current UI language. */
export function companionStrings(): Record<CompanionStringKey, string> {
  return Object.fromEntries(
    COMPANION_STRING_KEYS.map(key => [key, t((REUSED[key] ?? `live:companion.${key}`) as never) as string]),
  ) as Record<CompanionStringKey, string>;
}
