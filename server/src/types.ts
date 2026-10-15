import type { TimingsJson } from './timing.js';

export const KINDS = ['job', 'message', 'link', 'shop', 'agency', 'screen'] as const;
export const LANGS = ['en', 'id', 'tl', 'my', 'th'] as const;
export const FAMILIES = ['too_good', 'pressure', 'payment_route', 'identity', 'link_risk', 'known_bad', 'trafficking'] as const;
export const SCAM_TYPES = [
  'job_trafficking',
  'romance_pig_butchering',
  'parcel_phishing',
  'fake_agency',
  'marketplace_fraud',
  'investment',
  'other',
  'none',
] as const;
export const SEVERITIES = ['low', 'medium', 'high'] as const;
export const WEB_RISK = ['clean', 'malware', 'social_engineering', 'unwanted_software', 'unknown'] as const;

export type Kind = (typeof KINDS)[number];
export type Lang = (typeof LANGS)[number];
export type Family = (typeof FAMILIES)[number];
export type ScamType = (typeof SCAM_TYPES)[number];
export type Severity = (typeof SEVERITIES)[number];
export type WebRiskResult = (typeof WEB_RISK)[number];
export type Verdict = 'safe' | 'careful' | 'danger';

export interface CheckRequest {
  kind: Kind;
  text?: string;
  url?: string;
  imageBase64?: string;
  imageMimeType?: string;
  context?: { destination?: string; route?: string; home?: string };
  language: Lang;
  /** false opts this check out of the anonymous network signal. */
  shareSignals?: boolean;
  /** A user report of a scam they met: recorded as a confirmed signal. */
  reported?: boolean;
  reportedType?: ScamType;
  /** Yes or no only. Counted in the feedback tally, never stored with the signal. */
  lostMoney?: boolean;
  /** Verified Firebase uid set by the auth layer, never read from the body. */
  uid?: string;
}

export interface Flag {
  family: Family;
  label: string;
  evidence: string;
  severity: Severity;
}

export interface LinkCheck {
  url: string;
  webRisk: WebRiskResult;
  domainAgeDays?: number;
  registrar?: string;
}

export interface Action {
  label: string;
  type: 'call' | 'share' | 'block' | 'learn';
  value?: string;
}

export interface Entities {
  companies: string[];
  phones: string[];
  domains: string[];
  role?: string;
  country?: string;
  salaryClaim?: string;
}

export interface Source {
  title: string;
  url: string;
}

export interface Extraction {
  entities: Entities;
  flags: Flag[];
  scamType: ScamType;
  verdictDraft: Verdict;
  unsolicited: boolean;
  summary: string;
  spokenWarning: string;
  urls: string[];
  /** Network intel: model-made redacted template and sender-side indicators. */
  template?: string;
  templateSafe?: boolean;
  campaign?: string;
  inputLanguage?: string;
  sender?: { phones: string[]; handles: string[]; accounts: string[] };
}

export interface CheckResponse {
  id: string;
  createdAt: string;
  kind: Kind;
  verdict: Verdict;
  score: number;
  title: string;
  summary: string;
  spokenWarning: string;
  scamType: ScamType;
  flags: Flag[];
  linkChecks: LinkCheck[];
  sources: Source[];
  actions: Action[];
  model: string;
  network?: { seenCount: number; firstSeen: string; campaign?: { name: string; seenThisWeek: number } };
  /** Present only with ?debug=1 or DEBUG_TIMINGS=1. */
  timings?: TimingsJson;
}

export class ApiError extends Error {
  constructor(
    public status: 400 | 404 | 413 | 429 | 502,
    public code: 'bad_request' | 'not_found' | 'too_large' | 'upstream' | 'rate_limited',
    message: string,
  ) {
    super(message);
  }
}
