import type { Prepared } from '../intel/signal.js';
import type { Kind, ScamType, Verdict } from '../types.js';

export const CHECK_TTL_DAYS = 7;
export const FEEDBACK_RETENTION_DAYS = 90;

export interface FeedbackInput {
  checkId: string;
  correct: boolean;
  actualVerdict?: Verdict;
  actualScamType?: ScamType;
}

/** Server-side link from a check id to its redacted signal. Holds no raw input. */
export interface CheckRecord {
  v: 1;
  verdict: Verdict;
  scamType: ScamType;
  score: number;
  kind: Kind;
  language: string;
  /** Present when a signal was written. */
  sigId?: string;
  /** Present when no signal was written (safe verdict): the redacted data a missed-scam report needs. */
  prepared?: Prepared;
  day: string;
  expireAt: Date;
}

export type FeedbackOutcome = 'right' | 'false_alarm' | 'missed_scam' | 'wrong_type' | 'wrong' | 'duplicate' | 'unknown';

export interface FeedbackDoc {
  v: 1;
  correct: boolean;
  outcome: Exclude<FeedbackOutcome, 'duplicate' | 'unknown'>;
  verdict: Verdict;
  scamType: ScamType;
  actualVerdict?: Verdict;
  actualScamType?: ScamType;
  kind: Kind;
  language: string;
  /** Redacted template copied from the signal, for the eval export. */
  template?: string;
  day: string;
  expireAt: Date;
}

export interface TallyDoc {
  id: string;
  counts: Record<string, number>;
}

export interface FeedbackStore {
  putCheck(id: string, rec: CheckRecord): Promise<void>;
  getCheck(id: string): Promise<CheckRecord | undefined>;
  /** False when feedback for this check already exists. */
  createFeedback(id: string, doc: FeedbackDoc): Promise<boolean>;
  incTally(id: string, inc: Record<string, number>): Promise<void>;
  listFeedback(limit: number): Promise<FeedbackDoc[]>;
  listTallies(): Promise<TallyDoc[]>;
  sweepExpired(now: Date): Promise<number>;
}
