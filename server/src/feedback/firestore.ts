import { FieldValue, type Firestore, Timestamp } from 'firebase-admin/firestore';
import { COLLECTION_PREFIX, getDb } from '../intel/firestore.js';
import type { CheckRecord, FeedbackDoc, FeedbackStore } from './types.js';

export const CHECKS = `${COLLECTION_PREFIX}intel_checks`;
export const FEEDBACK = `${COLLECTION_PREFIX}intel_feedback`;
export const TALLY = `${COLLECTION_PREFIX}intel_tally`;

const ALREADY_EXISTS = 6;
const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : new Date(String(v)));

export function createFirestoreFeedbackStore(opts: { projectId?: string; db?: Firestore } = {}): FeedbackStore {
  const db = opts.db ?? getDb(opts.projectId);
  return {
    async putCheck(id, rec) {
      await db
        .collection(CHECKS)
        .doc(id)
        .set(clean({ ...rec, expireAt: Timestamp.fromDate(rec.expireAt) }));
    },

    async getCheck(id) {
      const snap = await db.collection(CHECKS).doc(id).get();
      if (!snap.exists) return undefined;
      const d = snap.data() as Record<string, unknown>;
      return { ...d, expireAt: toDate(d.expireAt) } as CheckRecord;
    },

    async createFeedback(id, doc) {
      try {
        await db
          .collection(FEEDBACK)
          .doc(id)
          .create(clean({ ...doc, expireAt: Timestamp.fromDate(doc.expireAt) }));
        return true;
      } catch (e) {
        if ((e as { code?: number }).code === ALREADY_EXISTS) return false;
        throw e;
      }
    },

    async incTally(id, inc) {
      const counters = Object.fromEntries(Object.entries(inc).map(([k, n]) => [k, FieldValue.increment(n)]));
      await db.collection(TALLY).doc(id).set(counters, { merge: true });
    },

    async listFeedback(limit) {
      const q = await db.collection(FEEDBACK).limit(limit).get();
      return q.docs.map((d) => ({ ...d.data(), expireAt: toDate(d.get('expireAt')) }) as FeedbackDoc);
    },

    async listTallies() {
      const q = await db.collection(TALLY).get();
      return q.docs.map((d) => ({
        id: d.id,
        counts: Object.fromEntries(Object.entries(d.data()).filter(([, v]) => typeof v === 'number')) as Record<string, number>,
      }));
    },

    async sweepExpired(now) {
      let removed = 0;
      for (const name of [CHECKS, FEEDBACK]) {
        for (let round = 0; round < 10; round++) {
          const q = await db.collection(name).where('expireAt', '<', Timestamp.fromDate(now)).limit(400).get();
          if (q.empty) break;
          const batch = db.batch();
          for (const d of q.docs) batch.delete(d.ref);
          await batch.commit();
          removed += q.size;
        }
      }
      return removed;
    },
  };
}
