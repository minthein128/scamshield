import { timingStore } from '../timing.js';
import type { CheckRequest, Extraction, Flag, Lang, ScamType, Severity } from '../types.js';
import { COUNTRY_CODES } from './countries.js';
import { createHasher, type Hasher } from './indicators.js';
import { buildInsights } from './insights.js';
import { campaignLabel, reportedEvidence, reportedLabel } from './messages.js';
import { matchCluster, matchClusters } from './minhash.js';
import { countIn, sumDays } from './rank.js';
import { aggId, aggregateWrites, buildSignal, isRecordable, type Outcome, type Prepared, prepare, scopesOf } from './signal.js';
import { type AggDelta, type AggDoc, type ClusterMeta, GLOBAL, type Insights, type IntelStore, K_ANON, type NetworkInfo } from './types.js';
import { CONFIRMED_WEIGHT, CONTRADICTED_WEIGHT, shown, weightDelta, weightOf } from './weights.js';

export interface Lookup {
  flags: Flag[];
  network?: NetworkInfo;
}

export interface RecordOpts {
  now?: Date;
  seed?: boolean;
  uid?: string;
  /** Reported scam or missed-scam feedback: recorded whatever the verdict was. */
  confirmed?: boolean;
  src?: 'reported' | 'feedback';
}

export type RecordResult = { status: 'recorded' | 'duplicate' | 'skipped'; signalId?: string };

/** What a user said about a recorded signal. */
export type Reweight = { contradict: true } | { scamType: ScamType };

export interface Intel {
  prepare(req: Pick<CheckRequest, 'kind' | 'language' | 'url' | 'context'>, ex: Extraction): Prepared;
  lookup(p: Prepared, lang: Lang): Promise<Lookup>;
  record(p: Prepared, o: Outcome, opts?: RecordOpts): Promise<'recorded' | 'duplicate' | 'skipped'>;
  recordSignal(p: Prepared, o: Outcome, opts?: RecordOpts): Promise<RecordResult>;
  /** Lowers a signal to the contradicted weight, or moves its type count to the type the user named. */
  reweight(signalId: string, change: Reweight): Promise<'applied' | 'unchanged' | 'missing'>;
  insights(country?: string, days?: number): Promise<Insights>;
  /** Loads the cluster cache so the first check does not pay for it. */
  warm(): Promise<void>;
  readonly store: IntelStore;
}

export const NO_LOOKUP: Lookup = { flags: [] };

/** Severity of a network match from its 30-day report count. */
export function severityForCount(n: number): Severity {
  return n >= 15 ? 'high' : n >= 6 ? 'medium' : 'low';
}

const iso = (day: string) => `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
const firstDay = (days: Record<string, number>) =>
  Object.entries(days)
    .filter(([, n]) => n > 0)
    .map(([d]) => d)
    .sort()[0];

export function createIntel(opts: { store: IntelStore; pepper: string; cacheMs?: number; now?: () => Date }): Intel {
  const { store } = opts;
  const hasher: Hasher = createHasher(opts.pepper);
  const cacheMs = opts.cacheMs ?? 60_000;
  const clock = opts.now ?? (() => new Date());

  const insightCache = new Map<string, { at: number; value: Insights }>();
  let clusterCache: { at: number; docs: AggDoc[] } | undefined;
  let clusterLoad: Promise<AggDoc[]> | undefined;

  function loadClusters(): Promise<AggDoc[]> {
    clusterLoad ??= store
      .listAggs('cluster', GLOBAL, 400)
      .then((docs) => {
        clusterCache = { at: Date.now(), docs };
        return docs;
      })
      .finally(() => {
        clusterLoad = undefined;
      });
    return clusterLoad;
  }

  /** Stale-while-revalidate: an expired cache is served at once and refreshed in the background. */
  async function clusters(): Promise<AggDoc[]> {
    if (clusterCache) {
      if (Date.now() - clusterCache.at >= cacheMs) loadClusters().catch(() => {});
      return clusterCache.docs;
    }
    return loadClusters();
  }

  return {
    store,

    async warm() {
      await loadClusters();
    },

    prepare: (req, ex) =>
      prepare(
        { kind: req.kind, language: req.language, url: req.url, home: req.context?.home, destination: req.context?.destination },
        ex,
        hasher,
      ),

    async lookup(p, lang) {
      const now = clock();
      const ids = [
        ...p.ind.map((i) => aggId('ind', GLOBAL, i.h)),
        ...p.domains.map((d) => aggId('dom', GLOBAL, hasher.hash('dom', d).slice(0, 24))),
      ];
      const tm = timingStore.getStore();
      const docs = await (tm ? tm.span('intel.aggs', () => store.getAggs(ids)) : store.getAggs(ids));
      const flags: Flag[] = [];
      const seen: Array<{ n: number; first?: string }> = [];
      const bySubject = new Map<string, { n: number; first?: string }>();
      for (const a of docs) {
        const days = sumDays(a.real.days, a.seed.days);
        const n = countIn(days, now, 30);
        if (n < K_ANON) continue;
        const subject = a.kind === 'dom' ? 'domain' : (a.itype as 'phone' | 'handle' | 'account');
        const cur = bySubject.get(subject);
        if (!cur || n > cur.n) bySubject.set(subject, { n, first: firstDay(days) });
      }
      for (const [subject, m] of bySubject) {
        seen.push(m);
        flags.push({
          family: 'known_bad',
          label: reportedLabel(lang, subject as 'phone' | 'handle' | 'account' | 'domain', m.n),
          evidence: reportedEvidence(lang, m.n),
          severity: severityForCount(m.n),
        });
      }

      let campaign: NetworkInfo['campaign'];
      if (p.sig || p.campaign) {
        const cl = await (tm ? tm.span('intel.clusters', clusters) : clusters());
        const matches = matchClusters(p.sig, p.campaign, cl);
        if (matches.length > 0) {
          const days = sumDays(...matches.flatMap((m) => [m.real.days, m.seed.days]));
          const week = countIn(days, now, 7);
          const top = [...matches].sort(
            (x, y) => countIn(sumDays(y.real.days, y.seed.days), now, 30) - countIn(sumDays(x.real.days, x.seed.days), now, 30),
          )[0];
          if (week >= K_ANON && top?.label) {
            campaign = { name: top.label, seenThisWeek: shown(week) };
            seen.push({ n: countIn(days, now, 30), first: firstDay(days) });
            flags.push({
              family: 'known_bad',
              label: campaignLabel(lang, top.label, week),
              evidence: reportedEvidence(lang, week),
              severity: 'low',
            });
          }
        }
      }
      if (seen.length === 0) return NO_LOOKUP;
      const firsts = seen.map((s) => s.first).filter((d): d is string => Boolean(d));
      const network: NetworkInfo = {
        seenCount: shown(Math.max(...seen.map((s) => s.n))),
        firstSeen: iso(firsts.sort()[0] ?? '19700101'),
      };
      if (campaign) network.campaign = campaign;
      return { flags, network };
    },

    async record(p, o, ropts = {}) {
      return (await this.recordSignal(p, o, ropts)).status;
    },

    async recordSignal(p, o, ropts = {}) {
      if (!isRecordable(o, ropts.confirmed)) return { status: 'skipped' };
      const now = ropts.now ?? clock();
      let clusterId: string | undefined;
      let metas: ClusterMeta[] | undefined;
      if (p.sig && p.template) {
        const match = matchCluster(
          p.sig,
          p.campaign,
          (await clusters()).filter((c) => c.scamType === o.scamType),
        );
        const meta = match
          ? { key: match.key, label: match.label, example: match.example, sig: match.sig as number[] }
          : {
              key: `c${p.sig
                .slice(0, 3)
                .map((n) => n.toString(16).padStart(8, '0'))
                .join('')}`,
              label: p.campaign,
              example: p.template,
              sig: p.sig,
            };
        clusterId = meta.key;
        metas = scopesOf(p).map((scope) => ({ ...meta, id: aggId('cluster', scope, meta.key), scope, scamType: o.scamType }));
      }
      const { id, doc } = buildSignal(p, o, hasher, {
        now,
        clusterId,
        seed: ropts.seed,
        uid: ropts.uid,
        confirmed: ropts.confirmed,
        src: ropts.src,
        expireBase: ropts.seed ? new Date() : undefined,
      });
      const result = await store.record(id, doc, aggregateWrites(doc, hasher), metas);
      if (result === 'recorded') {
        insightCache.clear();
        const g = metas?.find((m) => m.scope === GLOBAL);
        if (g && clusterCache) {
          let c = clusterCache.docs.find((d) => d.key === g.key);
          if (!c) {
            c = { ...g, kind: 'cluster', real: { days: {}, fam: {} }, seed: { days: {}, fam: {} } };
            clusterCache.docs.push(c);
          }
          const bucket = ropts.seed ? c.seed : c.real;
          bucket.days[doc.day] = (bucket.days[doc.day] ?? 0) + 1;
        }
      }
      return { status: result, signalId: id };
    },

    async reweight(signalId, change) {
      const sig = await store.getSignal(signalId);
      if (!sig) return 'missing';
      const writes = aggregateWrites(sig, hasher).map(({ marker: _marker, ...w }) => w);
      let patch: Partial<typeof sig>;
      let deltas: AggDelta[];
      if ('contradict' in change) {
        const amount = weightDelta(sig, CONTRADICTED_WEIGHT);
        if (amount === 0) return 'unchanged';
        patch = { w: CONTRADICTED_WEIGHT };
        deltas = writes.map((w) => ({ ...w, amount }));
      } else {
        if (change.scamType === sig.scamType || change.scamType === 'none' || sig.actualScamType) return 'unchanged';
        const out = weightDelta(sig, CONTRADICTED_WEIGHT * weightOf(sig));
        const types = writes.filter((w) => w.kind === 'type');
        patch = { actualScamType: change.scamType };
        deltas = [
          ...types.map((w) => ({ ...w, amount: out })),
          ...types.map((w) => ({
            ...w,
            id: aggId('type', w.scope, change.scamType),
            key: change.scamType,
            scamType: change.scamType,
            amount: CONFIRMED_WEIGHT * weightOf(sig),
          })),
        ];
      }
      const ok = await store.adjust(signalId, patch, deltas);
      if (ok) {
        insightCache.clear();
        clusterCache = undefined;
      }
      return ok ? 'applied' : 'missing';
    },

    async insights(country, days = 30) {
      const code = !country || country.toUpperCase() === GLOBAL ? GLOBAL : country.toUpperCase();
      const span = Math.min(90, Math.max(1, Math.floor(days)));
      const key = `${code}|${span}`;
      const hit = insightCache.get(key);
      if (hit && Date.now() - hit.at < cacheMs) return hit.value;
      const [types, cl, domains] = await Promise.all([
        store.listAggs('type', code, 20),
        store.listAggs('cluster', code, 300),
        store.listAggs('dom', code, 300),
      ]);
      const value = buildInsights({ types, clusters: cl, domains }, code, span, clock());
      insightCache.set(key, { at: Date.now(), value });
      return value;
    },
  };
}

export const isCountry = (c: string) => c.toUpperCase() === GLOBAL || COUNTRY_CODES.includes(c.toUpperCase());
