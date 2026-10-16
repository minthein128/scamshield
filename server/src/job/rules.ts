import { score, verdictFor } from '../score.js';
import type { Family, Flag, Lang, Severity, Verdict } from '../types.js';
import { mentionsBorderTown, readFee, salaryDiffers, sameEmployer } from './parse.js';
import {
  CONFLICT_TEXT,
  FIELD_LABEL,
  SIGNAL_LABEL,
  type SignalCode,
  SOURCE_NAME,
  TIER_HEADLINE,
  UNCLEAR_FIELDS,
  UNCLEAR_TEXT,
} from './text.js';
import type { AttentionTier, ConflictCode, FactField, FactKey, JobConflict, JobFacts, SalaryValue } from './types.js';

/** A fact the source actually states: not null, not withheld, not empty, not not_mentioned. */
export function stated<T>(f: FactField<T> | null | undefined): f is FactField<T> {
  if (!f || f.refused) return false;
  const v = f.value as unknown;
  if (v === null || v === undefined || v === 'not_mentioned') return false;
  return typeof v !== 'string' || v.trim() !== '';
}

const withheld = (f: FactField<unknown> | null | undefined) => Boolean(f?.refused);

function display(field: FactKey, f: FactField<unknown>): string {
  if (field === 'salary') {
    const s = f.value as SalaryValue;
    return [s.amount ?? '?', s.currency, s.period].filter((x) => x !== '').join(' ');
  }
  return String(f.value ?? '');
}

function conflict(
  field: FactKey,
  code: ConflictCode,
  ad: FactField<unknown>,
  chat: FactField<unknown>,
  family: Family,
  severity: Severity,
  lang: Lang,
): JobConflict {
  const chatValue = display(field, chat);
  return {
    field,
    code,
    fieldLabel: FIELD_LABEL[field]?.[lang] ?? field,
    adValue: display(field, ad),
    adQuote: ad.quote,
    chatValue,
    chatQuote: chat.quote,
    description: CONFLICT_TEXT[code][lang].replace('{chat}', chatValue),
    family,
    severity,
  };
}

/**
 * Compares the same field across ad and chat. A conflict needs both sources to state the field, except
 * documents: a passport photo or hold in the chat conflicts with an ad that mentions no documents.
 */
export function detectConflicts(ad: JobFacts | null, chat: JobFacts | null, lang: Lang = 'en'): JobConflict[] {
  if (!ad || !chat) return [];
  const out: JobConflict[] = [];

  if (stated(ad.workerFee) && stated(chat.workerFee)) {
    if (readFee(ad.workerFee.value) === 'none' && readFee(chat.workerFee.value) === 'positive') {
      out.push(conflict('workerFee', 'fee_vs_no_fee', ad.workerFee, chat.workerFee, 'payment_route', 'high', lang));
    }
  }

  const adDoc = stated(ad.documentRequest) ? ad.documentRequest : null;
  if (stated(chat.documentRequest) && (!adDoc || adDoc.value === 'none' || adDoc.value === 'id_copy')) {
    const c = chat.documentRequest.value;
    const adSide = adDoc ?? { value: 'not_mentioned', quote: '', confidence: 1 };
    if (c === 'passport_hold') {
      out.push(conflict('documentRequest', 'documents_passport_hold', adSide, chat.documentRequest, 'trafficking', 'high', lang));
    } else if (c === 'passport_photo') {
      out.push(conflict('documentRequest', 'documents_passport_photo', adSide, chat.documentRequest, 'trafficking', 'high', lang));
    } else if (adDoc?.value === 'none' && c === 'id_copy') {
      out.push(conflict('documentRequest', 'documents_id_copy', adDoc, chat.documentRequest, 'trafficking', 'medium', lang));
    }
  }

  if (stated(ad.contract) && ad.contract.value === 'official') {
    if (stated(chat.contract) && (chat.contract.value === 'later' || chat.contract.value === 'none')) {
      out.push(conflict('contract', 'contract_later', ad.contract, chat.contract, 'payment_route', 'high', lang));
    } else if (stated(chat.paymentRequest) && chat.paymentRequest.value === 'before_contract') {
      out.push(conflict('contract', 'contract_pay_first', ad.contract, chat.paymentRequest, 'payment_route', 'high', lang));
    }
  }

  if (stated(ad.visaOrPermit) && stated(chat.visaOrPermit) && ad.visaOrPermit.value === 'work_visa') {
    if (chat.visaOrPermit.value === 'tourist') {
      out.push(conflict('visaOrPermit', 'visa_tourist', ad.visaOrPermit, chat.visaOrPermit, 'trafficking', 'high', lang));
    } else if (chat.visaOrPermit.value === 'none') {
      out.push(conflict('visaOrPermit', 'visa_none', ad.visaOrPermit, chat.visaOrPermit, 'trafficking', 'high', lang));
    }
  }

  if (stated(ad.meetingPoint) && stated(chat.meetingPoint)) {
    const adFormal = ad.meetingPoint.value === 'workplace' || ad.meetingPoint.value === 'airport';
    const chatInformal = ['driver_pickup', 'border', 'unnamed'].includes(chat.meetingPoint.value);
    if (adFormal && chatInformal) {
      out.push(conflict('meetingPoint', 'meeting_informal', ad.meetingPoint, chat.meetingPoint, 'trafficking', 'medium', lang));
    }
  }

  if (stated(ad.employer)) {
    if (stated(chat.employer) && !sameEmployer(ad.employer.value, chat.employer.value)) {
      out.push(conflict('employer', 'employer_different', ad.employer, chat.employer, 'identity', 'medium', lang));
    } else if (chat.employer && withheld(chat.employer)) {
      out.push(conflict('employer', 'employer_refused', ad.employer, chat.employer, 'identity', 'medium', lang));
    }
  }

  const adPlace = stated(ad.workplace) ? ad.workplace : stated(ad.employer) ? ad.employer : null;
  if (adPlace && chat.workplace && withheld(chat.workplace)) {
    out.push(conflict('workplace', 'workplace_refused', adPlace, chat.workplace, 'identity', 'medium', lang));
  }

  if (stated(ad.salary) && stated(chat.salary) && salaryDiffers(ad.salary.value, chat.salary.value)) {
    out.push(conflict('salary', 'salary_different', ad.salary, chat.salary, 'too_good', 'low', lang));
  }

  return out;
}

export interface JobFlag extends Flag {
  /** A border-town route: context only, never scored without a non-geographic signal. */
  geographic?: boolean;
  source: 'ad' | 'chat' | 'both';
  field: FactKey;
}

function signal(
  code: SignalCode,
  family: Family,
  severity: Severity,
  field: FactKey,
  f: FactField<unknown>,
  source: 'ad' | 'chat',
  lang: Lang,
  geographic = false,
): JobFlag {
  const evidence = f.quote ? `${SOURCE_NAME[source][lang]}: "${f.quote}"` : SOURCE_NAME[source][lang];
  return { family, label: SIGNAL_LABEL[code][lang], evidence, severity, field, source, ...(geographic ? { geographic } : {}) };
}

/** Signals one source shows on its own: passport, documents, secrecy, payment, visa, pickup, border route. */
export function singleSourceFlags(facts: JobFacts, source: 'ad' | 'chat', lang: Lang = 'en'): JobFlag[] {
  const out: JobFlag[] = [];
  const doc = facts.documentRequest;
  if (stated(doc)) {
    if (doc.value === 'passport_hold') out.push(signal('passport_hold', 'trafficking', 'high', 'documentRequest', doc, source, lang));
    if (source === 'chat' && doc.value === 'passport_photo') {
      out.push(signal('passport_photo', 'trafficking', 'medium', 'documentRequest', doc, source, lang));
    }
    if (source === 'chat' && doc.value === 'id_copy')
      out.push(signal('id_copy', 'trafficking', 'medium', 'documentRequest', doc, source, lang));
  }
  if (stated(facts.secrecyRequest) && facts.secrecyRequest.value === true) {
    out.push(signal('secrecy', 'trafficking', 'medium', 'secrecyRequest', facts.secrecyRequest, source, lang));
  }
  const pay = facts.paymentRequest;
  if (stated(pay) && pay.value === 'before_contract') {
    out.push(signal('pay_before_contract', 'payment_route', 'high', 'paymentRequest', pay, source, lang));
  }
  if (stated(pay) && pay.value === 'personal_account') {
    out.push(signal('personal_account', 'payment_route', 'high', 'paymentRequest', pay, source, lang));
  }
  if (source === 'chat' && stated(facts.workerFee) && readFee(facts.workerFee.value) === 'positive') {
    out.push(signal('worker_fee', 'payment_route', 'medium', 'workerFee', facts.workerFee, source, lang));
  }
  const visa = facts.visaOrPermit;
  if (stated(visa) && visa.value === 'tourist') out.push(signal('tourist_visa', 'trafficking', 'high', 'visaOrPermit', visa, source, lang));
  if (stated(visa) && visa.value === 'none') out.push(signal('no_visa', 'trafficking', 'medium', 'visaOrPermit', visa, source, lang));
  const meet = facts.meetingPoint;
  if (stated(meet) && meet.value === 'border')
    out.push(signal('border_pickup', 'trafficking', 'medium', 'meetingPoint', meet, source, lang));
  if (stated(meet) && meet.value === 'driver_pickup') {
    out.push(signal('driver_pickup', 'trafficking', 'medium', 'meetingPoint', meet, source, lang));
  }
  if (stated(meet) && meet.value === 'unnamed')
    out.push(signal('unnamed_meeting', 'trafficking', 'low', 'meetingPoint', meet, source, lang));
  if (source === 'chat' && withheld(facts.employer) && facts.employer) {
    out.push(signal('employer_withheld', 'identity', 'low', 'employer', facts.employer, source, lang));
  }
  if (source === 'chat' && withheld(facts.workplace) && facts.workplace) {
    out.push(signal('workplace_withheld', 'identity', 'low', 'workplace', facts.workplace, source, lang));
  }
  const place = [facts.route, facts.workplace, facts.travelArrangedBy, facts.destinationCountry, facts.meetingPoint].find(
    (f) => f && (mentionsBorderTown(typeof f.value === 'string' ? f.value : '') || mentionsBorderTown(f.quote)),
  );
  if (place) out.push(signal('border_route', 'trafficking', 'low', 'route', place, source, lang, true));
  return out;
}

const CONFLICT_COVERS: Partial<Record<ConflictCode, FactKey[]>> = {
  contract_pay_first: ['paymentRequest'],
  employer_refused: ['employer'],
  workplace_refused: ['workplace'],
};

/** Conflict flags first, then single-source flags not already covered by a conflict on the same field. */
export function collectFlags(ad: JobFacts | null, chat: JobFacts | null, conflicts: JobConflict[], lang: Lang = 'en'): JobFlag[] {
  const covered = new Set<FactKey>(conflicts.flatMap((c) => [c.field, ...(CONFLICT_COVERS[c.code] ?? [])]));
  const fromConflicts: JobFlag[] = conflicts.map((c) => ({
    family: c.family,
    label: c.description,
    evidence: c.adQuote
      ? `${SOURCE_NAME.ad[lang]}: "${c.adQuote}" / ${SOURCE_NAME.chat[lang]}: "${c.chatQuote}"`
      : `${SOURCE_NAME.chat[lang]}: "${c.chatQuote}"`,
    severity: c.severity,
    field: c.field,
    source: 'both',
  }));
  const single = [
    ...(ad ? singleSourceFlags(ad, 'ad', lang) : []),
    ...(chat ? singleSourceFlags(chat, 'chat', lang).filter((f) => !covered.has(f.field)) : []),
  ];
  const seen = new Set<string>();
  return [...fromConflicts, ...single].filter((f) => {
    const key = `${f.family}|${f.label}|${f.geographic ? 'geo' : ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Spec strength "strong": any one of these sets the job result to pause. */
export const STRONG_CONFLICTS: ReadonlySet<ConflictCode> = new Set<ConflictCode>([
  'fee_vs_no_fee',
  'documents_passport_photo',
  'documents_passport_hold',
  'contract_later',
  'contract_pay_first',
  'visa_tourist',
]);

export const STRONG_CONFLICT_FLOOR = 70;

export interface JobScore {
  verdict: Verdict;
  score: number;
  flags: Flag[];
  overrides: string[];
}

/**
 * Scores with the shared engine. A border-town route counts only when a non-geographic signal is
 * also present; on its own it is context and does not raise the result.
 */
export function scoreJob(flags: Array<Flag & { geographic?: boolean }>, conflicts: JobConflict[] = []): JobScore {
  const nonGeo = flags.filter((f) => !f.geographic);
  const scored = nonGeo.length > 0 ? flags : [];
  const strip = (f: Flag & { geographic?: boolean; source?: unknown; field?: unknown }): Flag => ({
    family: f.family,
    label: f.label,
    evidence: f.evidence,
    severity: f.severity,
  });
  const res = score({
    flags: scored.map(strip),
    linkChecks: [],
    unsolicited: false,
    scamType: scored.length > 0 ? 'job_trafficking' : 'none',
  });
  const overrides = nonGeo.length === 0 && flags.length > 0 ? [...res.overrides, 'border_context_only'] : [...res.overrides];
  let value = res.score;
  if (conflicts.some((c) => STRONG_CONFLICTS.has(c.code)) && value < STRONG_CONFLICT_FLOOR) {
    value = STRONG_CONFLICT_FLOOR;
    overrides.push('strong_conflict');
  }
  return { verdict: verdictFor(value), score: value, flags: scored.length > 0 ? res.flags : flags.map(strip), overrides };
}

export function attentionFor(verdict: Verdict): AttentionTier {
  return verdict === 'danger' ? 'pause' : verdict === 'careful' ? 'verify' : 'lower';
}

export function headlineFor(tier: AttentionTier, lang: Lang): string {
  return TIER_HEADLINE[tier][lang];
}

/** Important fields neither source states (withheld counts as not stated). */
export function stillUnclear(ad: JobFacts | null, chat: JobFacts | null, lang: Lang = 'en'): { fields: FactKey[]; text: string[] } {
  const fields = UNCLEAR_FIELDS.filter(
    (k) => !stated(ad?.[k] as FactField<unknown> | null) && !stated(chat?.[k] as FactField<unknown> | null),
  );
  return { fields: [...fields], text: fields.map((k) => UNCLEAR_TEXT[k][lang]) };
}
