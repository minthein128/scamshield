import type { Family, Kind, ScamType, Severity, Verdict } from '../types.js';
import type { HashedIndicator } from './indicators.js';

export const K_ANON = 3;
export const RETENTION_DAYS = 90;
export const GLOBAL = 'GLOBAL';

export interface SignalDoc {
  v: 1;
  scamType: ScamType;
  flags: Array<{ family: Family; severity: Severity }>;
  verdict: Verdict;
  scoreBucket: number;
  kind: Kind;
  language: string;
  home?: string;
  dest?: string;
  template?: string;
  campaign?: string;
  clusterId?: string;
  ind: HashedIndicator[];
  domains: string[];
  /** Per-day reporter key: HMAC(pepper, uid + day). Absent when the request had no uid. */
  rk?: string;
  day: string;
  dayTs: Date;
  expireAt: Date;
  seed?: true;
  /** Signal weight in the aggregates. Absent means 1. See weights.ts. */
  w?: number;
  /** Set for reported scams and missed-scam feedback. */
  confirmed?: true;
  src?: 'reported' | 'feedback';
  /** The scam type a user gave when the model's type was wrong. */
  actualScamType?: ScamType;
}

export type AggKind = 'type' | 'ind' | 'dom' | 'cluster';

export interface Bucket {
  days: Record<string, number>;
  fam: Record<string, number>;
}

export interface AggDoc {
  id: string;
  kind: AggKind;
  scope: string;
  key: string;
  value?: string;
  itype?: string;
  scamType?: ScamType;
  label?: string;
  example?: string;
  sig?: number[];
  metaSeed?: boolean;
  real: Bucket;
  seed: Bucket;
}

/** One counter increment, applied atomically with the signal. */
export interface AggWrite {
  id: string;
  kind: AggKind;
  scope: string;
  key: string;
  value?: string;
  itype?: string;
  scamType?: ScamType;
  day: string;
  fams: Family[];
  /** Set when the signal has a reporter key: counts once per reporter, day and counter. */
  marker?: string;
}

/** A signed counter change applied to one aggregate doc. Negative amounts floor at zero. */
export type AggDelta = AggWrite & { amount: number };

export interface ClusterMeta {
  id: string;
  scope: string;
  key: string;
  scamType: ScamType;
  label?: string;
  example?: string;
  sig: number[];
}

export interface IntelStore {
  /** Creates the signal and applies the counters in one atomic batch. */
  record(id: string, sig: SignalDoc, writes: AggWrite[], cluster?: ClusterMeta[]): Promise<'recorded' | 'duplicate'>;
  getSignal(id: string): Promise<SignalDoc | undefined>;
  /** Patches a signal and applies counter deltas in one transaction. False when the signal is gone. */
  adjust(id: string, patch: Partial<SignalDoc>, deltas: AggDelta[]): Promise<boolean>;
  getAggs(ids: string[]): Promise<AggDoc[]>;
  listAggs(kind: AggKind, scope: string, limit: number): Promise<AggDoc[]>;
  purgeSeed(): Promise<{ signals: number; aggregates: number }>;
  /** Retention fallback when no Firestore TTL policy exists: delete docs past expireAt. */
  sweepExpired(now: Date): Promise<number>;
}

export interface NetworkInfo {
  seenCount: number;
  firstSeen: string;
  campaign?: { name: string; seenThisWeek: number };
}

export interface InsightRisk {
  scamType: ScamType;
  label: string;
  count: number;
  trend: 'up' | 'down' | 'flat';
  example?: string;
  topFlagFamilies: Array<{ family: Family; share: number }>;
}

export interface Insights {
  country: string;
  days: number;
  generatedAt: string;
  k: number;
  risks: InsightRisk[];
  domains: Array<{ domain: string; count: number; trend: 'up' | 'down' | 'flat' }>;
  campaigns: Array<{ name: string; scamType: ScamType; count: number; trend: 'up' | 'down' | 'flat'; example?: string }>;
}
