import type { CheckKind, CheckResponse, FlagFamily, ScamType, Verdict } from '../api/types';
import { t } from '../i18n';

export function verdictLabel(verdict: Verdict): string {
  return t(`common:verdict.${verdict}`);
}

export function familyLabel(family: FlagFamily): string {
  return t(`common:families.${family}`);
}

export function scamTypeLabel(type: ScamType, kind?: CheckKind): string {
  if (type === 'other' && kind === 'link') return t('common:scamTypes.other_link');
  return t(`common:scamTypes.${type}`);
}

export function entryLabel(result: CheckResponse, source?: string): string {
  const first = result.flags[0]?.evidence;
  return source || (first ? first.replace(/^"|"$/g, '').slice(0, 48) : scamTypeLabel(result.scamType, result.kind));
}
