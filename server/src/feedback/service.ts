import { createHasher } from '../intel/indicators.js';
import type { Intel } from '../intel/service.js';
import { dayKey, type Prepared } from '../intel/signal.js';
import type { Kind, ScamType, Verdict } from '../types.js';
import {
  CHECK_TTL_DAYS,
  type CheckRecord,
  FEEDBACK_RETENTION_DAYS,
  type FeedbackDoc,
  type FeedbackInput,
  type FeedbackOutcome,
  type FeedbackStore,
} from './types.js';

const DAY_MS = 86_400_000;

export interface Remember {
  checkId: string;
  verdict: Verdict;
  scamType: ScamType;
  score: number;
  kind: Kind;
  language: string;
  sigId?: string;
  prepared: Prepared;
}

export interface ReportNote {
  scamType: ScamType;
  language: string;
  lostMoney?: boolean;
}

export interface Feedback {
  /** Links a check id to its redacted signal (or to the redacted data of a safe check) for 7 days. */
  remember(r: Remember, now?: Date): Promise<void>;
  submit(input: FeedbackInput, opts?: { uid?: string; now?: Date }): Promise<FeedbackOutcome>;
  noteReport(n: ReportNote): Promise<void>;
  readonly store: FeedbackStore;
}

const isRisky = (v: Verdict) => v !== 'safe';

/** Pure decision: what a piece of feedback means for the check it names. */
export function classify(
  rec: Pick<CheckRecord, 'verdict' | 'scamType'>,
  input: FeedbackInput,
): Exclude<FeedbackOutcome, 'duplicate' | 'unknown'> {
  if (input.correct) return 'right';
  const named = input.actualScamType && input.actualScamType !== 'none' ? input.actualScamType : undefined;
  if (isRisky(rec.verdict)) {
    if (input.actualVerdict === 'safe' || input.actualScamType === 'none') return 'false_alarm';
    if (named && named !== rec.scamType) return 'wrong_type';
    return 'wrong';
  }
  if ((input.actualVerdict && isRisky(input.actualVerdict)) || named) return 'missed_scam';
  return 'wrong';
}

export function tallyIncrements(outcome: ReturnType<typeof classify>, actual?: ScamType) {
  const inc: Record<string, number> = { n: 1 };
  if (outcome === 'right') inc.right = 1;
  else inc.wrong = 1;
  if (outcome === 'false_alarm') inc.falseAlarm = 1;
  if (outcome === 'missed_scam') {
    inc.missed = 1;
    inc[`missedAs_${actual ?? 'other'}`] = 1;
  }
  if (outcome === 'wrong_type') inc.wrongType = 1;
  return inc;
}

export function createFeedback(opts: { intel: Intel; store: FeedbackStore; pepper: string; now?: () => Date }): Feedback {
  const { intel, store } = opts;
  const hasher = createHasher(opts.pepper);
  const clock = opts.now ?? (() => new Date());
  const checkKey = (id: string) => hasher.hash('chk', id);

  return {
    store,

    async remember(r, now = clock()) {
      const day = dayKey(now);
      const rec: CheckRecord = {
        v: 1,
        verdict: r.verdict,
        scamType: r.scamType,
        score: r.score,
        kind: r.kind,
        language: r.language,
        day,
        expireAt: new Date(now.getTime() + CHECK_TTL_DAYS * DAY_MS),
      };
      if (r.sigId) rec.sigId = r.sigId;
      else rec.prepared = r.prepared;
      await store.putCheck(checkKey(r.checkId), rec);
    },

    async submit(input, sopts = {}) {
      const now = sopts.now ?? clock();
      const rec = await store.getCheck(checkKey(input.checkId));
      if (!rec || rec.expireAt < now) return 'unknown';

      const outcome = classify(rec, input);
      const actual: ScamType | undefined = input.actualScamType && input.actualScamType !== 'none' ? input.actualScamType : undefined;
      const missedPrepared = outcome === 'missed_scam' ? rec.prepared : undefined;
      let template = rec.prepared?.template;
      if (!template && rec.sigId && (outcome === 'false_alarm' || outcome === 'wrong_type')) {
        template = (await intel.store.getSignal(rec.sigId))?.template;
      }

      const doc: FeedbackDoc = {
        v: 1,
        correct: input.correct,
        outcome: outcome === 'missed_scam' && !missedPrepared ? 'wrong' : outcome,
        verdict: rec.verdict,
        scamType: rec.scamType,
        kind: rec.kind,
        language: rec.language,
        day: dayKey(now),
        expireAt: new Date(now.getTime() + FEEDBACK_RETENTION_DAYS * DAY_MS),
      };
      if (input.actualVerdict) doc.actualVerdict = input.actualVerdict;
      if (actual) doc.actualScamType = actual;
      if (template) doc.template = template;
      if (!(await store.createFeedback(hasher.hash('fb', input.checkId), doc))) return 'duplicate';

      if (doc.outcome === 'false_alarm' && rec.sigId) await intel.reweight(rec.sigId, { contradict: true });
      else if (doc.outcome === 'wrong_type' && rec.sigId && actual) await intel.reweight(rec.sigId, { scamType: actual });
      else if (doc.outcome === 'missed_scam' && missedPrepared) {
        await intel.recordSignal(
          missedPrepared,
          { verdict: 'careful', score: rec.score, scamType: actual ?? 'other', flags: [] },
          { uid: sopts.uid, confirmed: true, src: 'feedback', now },
        );
      }

      const inc = tallyIncrements(doc.outcome, actual);
      await Promise.all([store.incTally(`type:${rec.scamType}`, inc), store.incTally(`lang:${rec.language}`, inc)]);
      return doc.outcome;
    },

    async noteReport(n) {
      const inc: Record<string, number> = { reports: 1 };
      if (n.lostMoney === true) inc.lostMoneyYes = 1;
      if (n.lostMoney === false) inc.lostMoneyNo = 1;
      await Promise.all([store.incTally(`reported:${n.scamType}`, inc), store.incTally(`reported:lang:${n.language}`, inc)]);
    },
  };
}
