import type { CheckResponse, Family, Lang, Severity, Verdict } from '../types.js';

export interface FactField<T> {
  value: T;
  quote: string;
  confidence: number;
}

export interface SalaryValue {
  amount: string | number;
  currency: string;
  period: 'hourly' | 'daily' | 'monthly' | 'yearly' | string;
}

export type ContractType = 'official' | 'later' | 'none' | 'not_mentioned';
export type VisaType = 'work_visa' | 'tourist' | 'none' | 'not_mentioned';
export type MeetingPointType = 'airport' | 'border' | 'workplace' | 'driver_pickup' | 'unnamed' | 'not_mentioned';
export type DocumentRequestType = 'passport_photo' | 'passport_hold' | 'id_copy' | 'none' | 'not_mentioned';
export type PaymentRequestType = 'before_contract' | 'personal_account' | 'none' | 'not_mentioned';
export type ContactChannelType = 'company_channel' | 'personal_chat_app' | 'phone' | 'email';

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

export interface JobExtractSource {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface JobExtractRequest {
  ad?: JobExtractSource;
  chat?: JobExtractSource;
  language: Lang;
  context?: { home?: string; destination?: string; route?: string };
}

export interface JobExtractResponse {
  jobId: string;
  ad: JobFacts | null;
  chat: JobFacts | null;
}

export interface JobConflict {
  field: keyof JobFacts;
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

export interface JobAssessRequest {
  jobId?: string;
  facts: {
    ad?: JobFacts | null;
    chat?: JobFacts | null;
  };
  language: Lang;
  context?: { home?: string; destination?: string; route?: string };
}

export interface JobAssessResponse extends CheckResponse {
  attention: AttentionTier;
  attentionHeadline: string;
  conflicts: JobConflict[];
  stillUnclear: string[];
  adFacts?: JobFacts | null;
  chatFacts?: JobFacts | null;
}
