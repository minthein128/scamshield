export type CheckKind = 'job' | 'message' | 'link' | 'shop' | 'agency' | 'screen';
export type LanguageCode = 'en' | 'id' | 'tl' | 'my' | 'th';
export type Verdict = 'safe' | 'careful' | 'danger';
export type ScamType =
  | 'job_trafficking'
  | 'romance_pig_butchering'
  | 'parcel_phishing'
  | 'fake_agency'
  | 'marketplace_fraud'
  | 'investment'
  | 'other'
  | 'none';
export type FlagFamily =
  | 'too_good'
  | 'pressure'
  | 'payment_route'
  | 'identity'
  | 'link_risk'
  | 'known_bad'
  | 'trafficking';
export type Severity = 'low' | 'medium' | 'high';
export type WebRisk = 'clean' | 'malware' | 'social_engineering' | 'unwanted_software' | 'unknown';
export type ActionType = 'call' | 'share' | 'block' | 'learn';

export interface CheckRequest {
  kind: CheckKind;
  text?: string;
  url?: string;
  imageBase64?: string;
  imageMimeType?: string;
  context?: { destination?: string; route?: string; home?: string };
  language: LanguageCode;
  shareSignals?: boolean;
  /** Report-a-scam flow: the server records a confirmed signal with `reportedType`. */
  reported?: boolean;
  reportedType?: Exclude<ScamType, 'none'>;
  /** Yes or no only. Never an amount. */
  lostMoney?: boolean;
}

export interface FeedbackRequest {
  checkId: string;
  correct: boolean;
  actualVerdict?: Verdict;
  actualScamType?: ScamType;
}

export interface Flag {
  family: FlagFamily;
  label: string;
  evidence: string;
  severity: Severity;
}

export interface LinkCheck {
  url: string;
  webRisk: WebRisk;
  domainAgeDays?: number;
  registrar?: string;
}

export interface CheckAction {
  label: string;
  type: ActionType;
  value?: string;
}

export interface Source {
  title: string;
  url: string;
}

export interface SpeakRequest {
  text: string;
  language: LanguageCode;
}

export interface SpeakResponse {
  audioBase64: string;
  mimeType: 'audio/wav';
  sampleRate: number;
  model: string;
}

export interface NetworkInfo {
  seenCount: number;
  firstSeen?: string;
  campaign?: { name: string; seenThisWeek?: number };
}

export type Trend = 'up' | 'down' | 'flat';

export interface InsightRisk {
  scamType: ScamType;
  label: string;
  count: number;
  trend: Trend;
  example?: string;
}

export interface InsightDomain {
  domain: string;
  count: number;
  trend: Trend;
}

export interface Insights {
  country: string;
  days: number;
  generatedAt: string;
  k: number;
  risks: InsightRisk[];
  domains: InsightDomain[];
  campaigns?: { name: string; scamType: ScamType; count: number; trend: Trend; example?: string }[];
}

export interface CheckResponse {
  id: string;
  createdAt: string;
  kind: CheckKind;
  verdict: Verdict;
  score: number;
  title: string;
  summary: string;
  spokenWarning: string;
  scamType: ScamType;
  flags: Flag[];
  linkChecks: LinkCheck[];
  sources?: Source[];
  actions: CheckAction[];
  model: string;
  network?: NetworkInfo;
  attention?: AttentionTier;
  attentionHeadline?: string;
  conflicts?: JobConflict[];
  stillUnclear?: string[];
  adFacts?: JobFacts | null;
  chatFacts?: JobFacts | null;
}

export type ApiErrorCode = 'bad_request' | 'not_found' | 'too_large' | 'upstream' | 'rate_limited';

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export interface HealthResponse {
  ok: boolean;
  model: string;
  mock: boolean;
}

export type CheckStage = 'extract' | 'links' | 'ground' | 'intel';

/**
 * Progress of a streamed check. `verdict` is provisional: it comes right after reading the input and
 * can only stay or rise when `final` arrives. `final` carries the full result with sources and network data.
 */
export type CheckUpdate =
  | { type: 'stage'; stage: CheckStage; status: 'start' | 'done'; ms: number }
  | { type: 'verdict'; response: CheckResponse }
  | { type: 'final'; response: CheckResponse };

export interface RequestOptions {
  signal?: AbortSignal;
  /** check() only. Asks for a streamed check. Ignored by clients or servers that cannot stream. */
  onUpdate?: (update: CheckUpdate) => void;
}

export interface FactField<T> {
  value: T;
  quote: string;
  confidence: number;
}

export interface SalaryValue {
  amount: string | number;
  currency: string;
  period: string;
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
  language: LanguageCode;
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
  family: FlagFamily;
  severity: Severity;
}

export type AttentionTier = 'lower' | 'verify' | 'pause';

export interface JobAssessRequest {
  jobId?: string;
  facts: {
    ad?: JobFacts | null;
    chat?: JobFacts | null;
  };
  language: LanguageCode;
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

export interface CheckClient {
  readonly isMock: boolean;
  check(request: CheckRequest, options?: RequestOptions): Promise<CheckResponse>;
  health(options?: RequestOptions): Promise<HealthResponse>;
  insights(country: string, options?: RequestOptions): Promise<Insights>;
  speak(request: SpeakRequest, options?: RequestOptions): Promise<SpeakResponse>;
  feedback(request: FeedbackRequest, options?: RequestOptions): Promise<void>;
  extractJob(request: JobExtractRequest, options?: RequestOptions): Promise<JobExtractResponse>;
  assessJob(request: JobAssessRequest, options?: RequestOptions): Promise<JobAssessResponse>;
}
