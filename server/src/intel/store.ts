import type { AggDoc, AggKind, AggWrite, Bucket, ClusterMeta, IntelStore, SignalDoc } from './types.js';

const emptyBucket = (): Bucket => ({ days: {}, fam: {} });

export interface MemoryStore extends IntelStore {
  signals: Map<string, SignalDoc>;
  aggs: Map<string, AggDoc>;
}

export function createMemoryStore(): MemoryStore {
  const signals = new Map<string, SignalDoc>();
  const aggs = new Map<string, AggDoc>();
  return {
    signals,
    aggs,
    async record(id, sig, writes: AggWrite[], clusters: ClusterMeta[] = []) {
      if (signals.has(id)) return 'duplicate';
      signals.set(id, sig);
      for (const c of clusters) {
        if (!aggs.has(c.id)) {
          aggs.set(c.id, { ...c, kind: 'cluster', metaSeed: Boolean(sig.seed), real: emptyBucket(), seed: emptyBucket() });
        }
      }
      for (const w of writes) {
        const cur: AggDoc = aggs.get(w.id) ?? {
          id: w.id,
          kind: w.kind,
          scope: w.scope,
          key: w.key,
          real: emptyBucket(),
          seed: emptyBucket(),
        };
        if (w.value) cur.value = w.value;
        if (w.itype) cur.itype = w.itype;
        if (w.scamType) cur.scamType = w.scamType;
        const b = sig.seed ? cur.seed : cur.real;
        b.days[w.day] = (b.days[w.day] ?? 0) + 1;
        for (const f of w.fams) b.fam[f] = (b.fam[f] ?? 0) + 1;
        aggs.set(w.id, cur);
      }
      return 'recorded';
    },
    async getAggs(ids) {
      return ids
        .map((i) => aggs.get(i))
        .filter((a): a is AggDoc => a !== undefined)
        .map((a) => structuredClone(a));
    },
    async listAggs(kind: AggKind, scope, limit) {
      return [...aggs.values()]
        .filter((a) => a.kind === kind && a.scope === scope)
        .slice(0, limit)
        .map((a) => structuredClone(a));
    },
    async purgeSeed() {
      let removedSignals = 0;
      for (const [id, s] of signals) {
        if (s.seed) {
          signals.delete(id);
          removedSignals++;
        }
      }
      let removedAggs = 0;
      for (const [id, a] of aggs) {
        if (Object.keys(a.real.days).length === 0) {
          aggs.delete(id);
          removedAggs++;
        } else {
          a.seed = emptyBucket();
          if (a.metaSeed) {
            a.example = undefined;
            a.label = undefined;
          }
        }
      }
      return { signals: removedSignals, aggregates: removedAggs };
    },
  };
}
