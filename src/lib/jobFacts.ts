import type { FactField, JobFactKey, JobFacts, SalaryValue } from '../api/types';
import { t } from '../i18n';

export type FieldKind = 'text' | 'fee' | 'enum' | 'salary' | 'boolean';

export interface FieldDef {
  key: JobFactKey;
  kind: FieldKind;
  options?: readonly string[];
}

export const SALARY_PERIODS = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'] as const;
export const NO_FEE = 'none';
export const FEE_MENTIONED = 'fee mentioned';
export const LOW_CONFIDENCE = 0.7;

export const FIELD_DEFS: readonly FieldDef[] = [
  { key: 'employer', kind: 'text' },
  { key: 'jobTitle', kind: 'text' },
  { key: 'workplace', kind: 'text' },
  { key: 'destinationCountry', kind: 'text' },
  { key: 'salary', kind: 'salary' },
  { key: 'workerFee', kind: 'fee' },
  { key: 'contract', kind: 'enum', options: ['official', 'later', 'none', 'not_mentioned'] },
  { key: 'visaOrPermit', kind: 'enum', options: ['work_visa', 'tourist', 'none', 'not_mentioned'] },
  { key: 'travelArrangedBy', kind: 'text' },
  { key: 'route', kind: 'text' },
  { key: 'meetingPoint', kind: 'enum', options: ['airport', 'border', 'workplace', 'driver_pickup', 'unnamed', 'not_mentioned'] },
  { key: 'documentRequest', kind: 'enum', options: ['passport_photo', 'passport_hold', 'id_copy', 'none', 'not_mentioned'] },
  { key: 'paymentRequest', kind: 'enum', options: ['before_contract', 'personal_account', 'none', 'not_mentioned'] },
  { key: 'urgency', kind: 'text' },
  { key: 'contactChannel', kind: 'enum', options: ['company_channel', 'personal_chat_app', 'phone', 'email'] },
  { key: 'secrecyRequest', kind: 'boolean' },
];

export type FactValue = string | boolean | SalaryValue;

/** What the model read (`original`, never changed) and what the user did with it. */
export interface FactDraft {
  original: FactField<FactValue> | null;
  edited: boolean;
  value: FactValue | null;
  notMentioned: boolean;
}

export type SourceDraft = Record<JobFactKey, FactDraft>;

export function defOf(key: JobFactKey): FieldDef {
  return FIELD_DEFS.find(d => d.key === key) as FieldDef;
}

export function draftFromFacts(facts: JobFacts | null): SourceDraft {
  const draft = {} as SourceDraft;
  for (const { key } of FIELD_DEFS) {
    const original = (facts?.[key] ?? null) as FactField<FactValue> | null;
    draft[key] = { original, edited: false, value: original?.value ?? null, notMentioned: false };
  }
  return draft;
}

function patch(draft: SourceDraft, key: JobFactKey, next: Partial<FactDraft>): SourceDraft {
  return { ...draft, [key]: { ...draft[key], ...next } };
}

export function setValue(draft: SourceDraft, key: JobFactKey, value: FactValue): SourceDraft {
  return patch(draft, key, { value, edited: true, notMentioned: false });
}

export function setNotMentioned(draft: SourceDraft, key: JobFactKey, on: boolean): SourceDraft {
  return on ? patch(draft, key, { notMentioned: true }) : patch(draft, key, { notMentioned: false });
}

export function resetFact(draft: SourceDraft, key: JobFactKey): SourceDraft {
  return patch(draft, key, { value: draft[key].original?.value ?? null, edited: false, notMentioned: false });
}

const BURMESE_DIGITS = '၀၁၂၃၄၅၆၇၈၉';

/** A typed amount such as "35,000" or "၃၅၀၀၀" as a number, or null when it is not one. */
export function parseAmount(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;
  const text = String(raw ?? '').replace(/[၀-၉]/g, d => String(BURMESE_DIGITS.indexOf(d))).replace(/[\s,]/g, '');
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

export function isEmptyValue(def: FieldDef, value: FactValue | null): boolean {
  if (value === null || value === undefined) return true;
  if (def.kind === 'salary') return parseAmount((value as SalaryValue).amount) === null;
  if (typeof value === 'string') return !value.trim();
  return false;
}

/** The value in force now, or null when the field counts as not mentioned. */
export function activeValue(draft: SourceDraft, key: JobFactKey): FactValue | null {
  const f = draft[key];
  if (f.notMentioned) return null;
  return isEmptyValue(defOf(key), f.value) ? null : f.value;
}

/** True while the model was unsure, or the recruiter refused to say, and the user has not looked at it. */
export function isUnclear(fact: FactDraft): boolean {
  if (fact.edited || fact.notMentioned || !fact.original) return false;
  return fact.original.refused === true || fact.original.confidence < LOW_CONFIDENCE;
}

export function unclearCount(draft: SourceDraft): number {
  return FIELD_DEFS.filter(d => isUnclear(draft[d.key])).length;
}

function cleanValue(def: FieldDef, value: FactValue): FactValue {
  if (def.kind === 'salary') {
    const s = value as SalaryValue;
    return { amount: parseAmount(s.amount), currency: String(s.currency ?? '').trim().toUpperCase(), period: s.period || 'monthly' };
  }
  return typeof value === 'string' ? value.trim() : value;
}

/** Facts to send to /v1/job/assess. The original quote always travels with the value. */
export function toFacts(draft: SourceDraft): JobFacts {
  const out: Record<string, FactField<FactValue> | null> = {};
  for (const def of FIELD_DEFS) {
    const f = draft[def.key];
    if (f.notMentioned || isEmptyValue(def, f.value)) {
      out[def.key] = null;
    } else if (f.edited && f.value !== null) {
      out[def.key] = { value: cleanValue(def, f.value), quote: f.original?.quote ?? '', confidence: 1, edited: true };
    } else {
      out[def.key] = f.original;
    }
  }
  return out as unknown as JobFacts;
}

export function hasAnyFact(draft: SourceDraft): boolean {
  return FIELD_DEFS.some(d => activeValue(draft, d.key) !== null);
}

export function fieldLabel(key: JobFactKey): string {
  return t(`check:job.fields.${key}`);
}

export function periodLabel(period: string): string {
  return (SALARY_PERIODS as readonly string[]).includes(period) ? t(`check:job.period.${period as (typeof SALARY_PERIODS)[number]}`) : '';
}

export function enumLabel(key: JobFactKey, code: string): string {
  const def = defOf(key);
  if (def.kind !== 'enum' || !def.options?.includes(code)) return code;
  return t(`check:job.values.${key as 'contract'}.${code as 'official'}`);
}

export function valueLabel(key: JobFactKey, value: FactValue | null): string {
  if (value === null || value === undefined) return t('check:job.notMentioned');
  const def = defOf(key);
  switch (def.kind) {
    case 'salary': {
      const s = value as SalaryValue;
      return [typeof s.amount === 'number' ? s.amount.toLocaleString('en-US') : (s.amount ?? ''), s.currency, periodLabel(s.period)].filter(x => x !== '').join(' ').replace(/\s+/g, ' ').trim();
    }
    case 'boolean':
      return value === true ? t('check:job.values.secrecyRequest.yes') : t('check:job.values.secrecyRequest.no');
    case 'fee':
      return value === NO_FEE ? t('check:job.values.workerFee.none') : value === FEE_MENTIONED ? t('check:job.values.workerFee.some') : String(value);
    case 'enum':
      return enumLabel(key, String(value));
    default:
      return String(value);
  }
}

export function enumOptions(key: JobFactKey): { value: string; label: string }[] {
  return (defOf(key).options ?? []).map(code => ({ value: code, label: enumLabel(key, code) }));
}

/** A conflict value as the server sends it: an English code or raw text. Codes read in the app language. */
export function plainValueLabel(key: JobFactKey, raw: string): string {
  const def = defOf(key);
  if (!raw) return '';
  if (def.kind === 'enum') return enumLabel(key, raw);
  if (def.kind === 'fee') return valueLabel(key, raw);
  return raw;
}
