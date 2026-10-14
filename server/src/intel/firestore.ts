import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, type Firestore, getFirestore, type QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import type { AggDoc, AggKind, AggWrite, Bucket, ClusterMeta, IntelStore, SignalDoc } from './types.js';

export const SIGNALS = 'intel_signals';
export const AGGREGATES = 'intel_aggregates';

const ALREADY_EXISTS = 6;
const codeOf = (e: unknown) => (e as { code?: number }).code;
const bucket = (b?: Partial<Bucket>): Bucket => ({ days: b?.days ?? {}, fam: b?.fam ?? {} });

function toAgg(s: { id: string; data(): Record<string, unknown> | undefined }): AggDoc {
  const d = s.data() ?? {};
  return {
    id: s.id,
    kind: d.kind as AggKind,
    scope: d.scope as string,
    key: d.key as string,
    value: d.value as string | undefined,
    itype: d.itype as string | undefined,
    scamType: d.scamType as AggDoc['scamType'],
    label: d.label as string | undefined,
    example: d.example as string | undefined,
    sig: d.sig as number[] | undefined,
    metaSeed: d.metaSeed as boolean | undefined,
    real: bucket(d.real as Partial<Bucket>),
    seed: bucket(d.seed as Partial<Bucket>),
  };
}

export function createFirestoreStore(opts: { projectId?: string; db?: Firestore } = {}): IntelStore {
  const db =
    opts.db ??
    (() => {
      const app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId: opts.projectId });
      const fs = getFirestore(app);
      fs.settings({ ignoreUndefinedProperties: true });
      return fs;
    })();

  const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

  return {
    async record(id, sig: SignalDoc, writes: AggWrite[], clusters: ClusterMeta[] = []) {
      const expireAt = Timestamp.fromDate(sig.expireAt);
      await Promise.all(
        clusters.map(async (c) => {
          try {
            await db
              .collection(AGGREGATES)
              .doc(c.id)
              .create(clean({ ...c, kind: 'cluster', metaSeed: sig.seed === true, real: bucket(), seed: bucket(), expireAt }));
          } catch (e) {
            if (codeOf(e) !== ALREADY_EXISTS) throw e;
          }
        }),
      );
      const batch = db.batch();
      batch.create(db.collection(SIGNALS).doc(id), clean({ ...sig, dayTs: Timestamp.fromDate(sig.dayTs), expireAt }));
      const which = sig.seed ? 'seed' : 'real';
      for (const w of writes) {
        const counters: { days: Record<string, FieldValue>; fam: Record<string, FieldValue> } = {
          days: { [w.day]: FieldValue.increment(1) },
          fam: {},
        };
        for (const f of w.fams) counters.fam[f] = FieldValue.increment(1);
        batch.set(
          db.collection(AGGREGATES).doc(w.id),
          clean({
            kind: w.kind,
            scope: w.scope,
            key: w.key,
            value: w.value,
            itype: w.itype,
            scamType: w.scamType,
            [which]: counters,
            expireAt,
          }),
          { merge: true },
        );
      }
      try {
        await batch.commit();
      } catch (e) {
        if (codeOf(e) === ALREADY_EXISTS) return 'duplicate';
        throw e;
      }
      return 'recorded';
    },

    async getAggs(ids) {
      if (ids.length === 0) return [];
      const snaps = await db.getAll(...ids.map((i) => db.collection(AGGREGATES).doc(i)));
      return snaps.filter((s) => s.exists).map(toAgg);
    },

    async listAggs(kind, scope, limit) {
      const q = await db.collection(AGGREGATES).where('kind', '==', kind).where('scope', '==', scope).limit(limit).get();
      return q.docs.map(toAgg);
    },

    async purgeSeed() {
      let signals = 0;
      for (;;) {
        const q = await db.collection(SIGNALS).where('seed', '==', true).limit(400).get();
        if (q.empty) break;
        const batch = db.batch();
        for (const d of q.docs) batch.delete(d.ref);
        await batch.commit();
        signals += q.size;
      }
      let aggregates = 0;
      const all = await db.collection(AGGREGATES).get();
      const docs: QueryDocumentSnapshot[] = all.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = db.batch();
        for (const d of docs.slice(i, i + 400)) {
          const a = toAgg(d);
          if (Object.keys(a.real.days).length === 0) {
            batch.delete(d.ref);
            aggregates++;
          } else if (Object.keys(a.seed.days).length > 0 || a.metaSeed) {
            const patch: Record<string, unknown> = { seed: FieldValue.delete() };
            if (a.metaSeed) Object.assign(patch, { example: FieldValue.delete(), label: FieldValue.delete(), metaSeed: false });
            batch.update(d.ref, patch);
          }
        }
        await batch.commit();
      }
      return { signals, aggregates };
    },
  };
}
