import type { CheckResponse, Family, Lang, Severity } from '../types.js';

export const CONTRACT_CODES = ['official', 'later', 'none', 'not_mentioned'] as const;
export const VISA_CODES = ['work_visa', 'tourist', 'none', 'not_mentioned'] as const;
export const MEETING_CODES = ['airport', 'border', 'workplace', 'driver_pickup', 'unnamed', 'not_mentioned'] as const;
export const DOCUMENT_CODES = ['passport_photo', 'passport_hold', 'id_copy', 'none', 'not_mentioned'] as const;
export const PAYMENT_CODES = ['before_contract', 'personal_account', 'none', 'not_mentioned'] as const;
export const CONTACT_CODES = ['company_channel', 'personal_chat_app', 'phone', 'email'] as const;
export const PERIOD_CODES = ['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'unknown'] as const;

export type ContractType = (typeof CONTRACT_CODES)[number];
export type VisaType = (typeof VISA_CODES)[number];
export type MeetingPointType = (typeof MEETING_CODES)[number];
export type DocumentRequestType = (typeof DOCUMENT_CODES)[number];
export type PaymentRequestType = (typeof PAYMENT_CODES)[number];
export type ContactChannelType = (typeof CONTACT_CODES)[number];
export type SalaryPeriod = (typeof PERIOD_CODES)[number];

export interface FactField<T> {
  value: T;
  quote: string;
  confidence: number;
  /** The source explicitly withholds this detail, for example "address after you arrive". */
  refused?: boolean;
  /** The user changed the value on the confirm screen. */
  edited?: boolean;
}

export interface SalaryValue {
  amount: number | null;
  currency: string;
  period: SalaryPeriod;
}

export interface JobFacts {
  employer: FactField<string> | null;
  jobTitle: FactField<string> | null;
  workplace: FactField<string> | null;
  destinationCountry: FactField<string> | null;
  salary: FactField<SalaryValue> | null;
  workerFee: FactField<string> | null;
  contract: FactField<ContractType> | null;
  visaOrPermit: FactField<VisaType> | null;
  travelArrangedBy: FactField<string> | null;
  route: FactField<string> | null;
  meetingPoint: FactField<MeetingPointType> | null;
  documentRequest: FactField<DocumentRequestType> | null;
  paymentRequest: FactField<PaymentRequestType> | null;
  urgency: FactField<string> | null;
  contactChannel: FactField<ContactChannelType> | null;
  secrecyRequest: FactField<boolean> | null;
}

export type FactKey = keyof JobFacts;

export const FACT_KEYS: FactKey[] = [
  'employer',
  'jobTitle',
  'workplace',
  'destinationCountry',
  'salary',
  'workerFee',
  'contract',
  'visaOrPermit',
  'travelArrangedBy',
  'route',
  'meetingPoint',
  'documentRequest',
  'paymentRequest',
  'urgency',
  'contactChannel',
  'secrecyRequest',
];

export const emptyFacts = (): JobFacts => Object.fromEntries(FACT_KEYS.map((k) => [k, null])) as unknown as JobFacts;

export interface JobExtractSource {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface JobContext {
  home?: string;
  destination?: string;
  route?: string;
}

export interface JobExtractRequest {
  ad?: JobExtractSource;
  chat?: JobExtractSource;
  language: Lang;
  context?: JobContext;
}

export interface JobExtraction {
  ad: JobFacts | null;
  chat: JobFacts | null;
}

export interface JobExtractResponse extends JobExtraction {
  jobId: string;
}

export type ConflictCode =
  | 'fee_vs_no_fee'
  | 'documents_passport_photo'
  | 'documents_passport_hold'
  | 'documents_id_copy'
  | 'contract_later'
  | 'contract_pay_first'
  | 'visa_tourist'
  | 'visa_none'
  | 'meeting_informal'
  | 'employer_different'
  | 'employer_refused'
  | 'workplace_refused'
  | 'salary_different';

export interface JobConflict {
  field: FactKey;
  code: ConflictCode;
  fieldLabel: string;
  adValue: string;
  adQuote: string;
  chatValue: string;
  chatQuote: string;
  description: string;
  family: Family;
  severity: Severity;
}

export type AttentionTier = 'lower' | 'verify' | 'pause';

export type FindingCode = 'company_found' | 'company_not_found' | 'company_not_checked' | 'recruiter_not_confirmed';

export interface JobFinding {
  code: FindingCode;
  label: string;
}

/** Facts as sent by the app: keys may be missing, enum keys may say not_mentioned. */
export type PartialFacts = Partial<JobFacts>;

export interface JobAssessRequest {
  jobId?: string;
  facts?: { ad?: PartialFacts | null; chat?: PartialFacts | null };
  language: Lang;
  context?: JobContext;
}

export interface JobAssessResponse extends CheckResponse {
  attention: AttentionTier;
  attentionHeadline: string;
  conflicts: JobConflict[];
  stillUnclear: string[];
  stillUnclearFields: FactKey[];
  findings: JobFinding[];
  usedStoredExtraction: boolean;
  adFacts: JobFacts | null;
  chatFacts: JobFacts | null;
}
