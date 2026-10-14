import type { CheckRecord, FeedbackDoc, FeedbackStore, TallyDoc } from './types.js';

export interface MemoryFeedbackStore extends FeedbackStore {
  checks: Map<string, CheckRecord>;
  feedback: Map<string, FeedbackDoc>;
  tallies: Map<string, Record<string, number>>;
}

export function createMemoryFeedbackStore(): MemoryFeedbackStore {
  const checks = new Map<string, CheckRecord>();
  const feedback = new Map<string, FeedbackDoc>();
  const tallies = new Map<string, Record<string, number>>();
  return {
    checks,
    feedback,
    tallies,
    async putCheck(id, rec) {
      checks.set(id, structuredClone(rec));
    },
    async getCheck(id) {
      const r = checks.get(id);
      return r ? structuredClone(r) : undefined;
    },
    async createFeedback(id, doc) {
      if (feedback.has(id)) return false;
      feedback.set(id, structuredClone(doc));
      return true;
    },
    async incTally(id, inc) {
      const cur = tallies.get(id) ?? {};
      for (const [k, n] of Object.entries(inc)) cur[k] = (cur[k] ?? 0) + n;
      tallies.set(id, cur);
    },
    async listFeedback(limit) {
      return [...feedback.values()].slice(0, limit).map((d) => structuredClone(d));
    },
    async listTallies(): Promise<TallyDoc[]> {
      return [...tallies].map(([id, counts]) => ({ id, counts: { ...counts } }));
    },
    async sweepExpired(now) {
      let removed = 0;
      for (const m of [checks, feedback] as Array<Map<string, { expireAt: Date }>>) {
        for (const [id, d] of m) {
          if (d.expireAt < now) {
            m.delete(id);
            removed++;
          }
        }
      }
      return removed;
    },
  };
}
