export type CheckKind = 'job' | 'message' | 'link' | 'shop' | 'agency' | 'screen';
export type LanguageCode = 'en' | 'id' | 'tl' | 'my';
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

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface CheckClient {
  readonly isMock: boolean;
  check(request: CheckRequest, options?: RequestOptions): Promise<CheckResponse>;
  health(options?: RequestOptions): Promise<HealthResponse>;
  insights(country: string, options?: RequestOptions): Promise<Insights>;
  speak(request: SpeakRequest, options?: RequestOptions): Promise<SpeakResponse>;
  feedback(request: FeedbackRequest, options?: RequestOptions): Promise<void>;
}
