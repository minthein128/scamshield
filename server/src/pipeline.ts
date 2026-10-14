import { createHash, randomUUID } from 'node:crypto';
import { createTtlLru } from './cache.js';
import type { Correlator } from './correlate.js';
import { buildActions, titleFor, withWebRiskNote } from './explain.js';
import type { Extractor } from './extract.js';
import type { StreamOpts } from './extract-stream.js';
import type { Feedback } from './feedback/service.js';
import type { Grounder, GroundResult } from './ground.js';
import { type Intel, NO_LOOKUP } from './intel/service.js';
import { countCertainty, guardExtraction, guardFlags, isHeavy } from './language-guard.js';
import { log } from './log.js';
import { score } from './score.js';
import { Timings, timingStore } from './timing.js';
import type { CheckRequest, CheckResponse, Extraction, Flag, LinkCheck, Source } from './types.js';
import { findUrls, mergeUrls } from './urls.js';

export type Stage = 'extract' | 'links' | 'ground' | 'intel';

export type PipelineEvent =
  | { type: 'stage'; stage: Stage; status: 'start' | 'done'; ms: number }
  | { type: 'verdict'; response: CheckResponse };

export interface RunOptions {
  onEvent?: (e: PipelineEvent) => void;
  /** Receives the deferred intel write, so a streaming caller can keep its request open until it ends. */
  afterResponse?: (done: Promise<unknown>) => void;
}

export interface Pipeline {
  run(req: CheckRequest, opts?: RunOptions): Promise<CheckResponse>;
}

export interface LanguageStats {
  lang: string;
  before: number;
  rewrites: number;
  reasked: boolean;
  after: number;
}

const SAFETY_MARGIN_MS = 500;
const RECORD_TIMEOUT_MS = 2500;
const REASK_MIN_MS = 5000;
const DANGER_SCORE = 80;

const settle = <T>(p: Promise<T>, ms: number, fallback: T, onTimeout?: () => void): Promise<T> =>
  Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) =>
      setTimeout(
        () => {
          onTimeout?.();
          r(fallback);
        },
        Math.max(ms, 0),
      ),
    ),
  ]);

const unknownLinks = (urls: string[]): LinkCheck[] => urls.map((url) => ({ url, webRisk: 'unknown' as const }));
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const newId = () => `chk_${randomUUID().replaceAll('-', '').slice(0, 20)}`;

export function cacheKey(req: CheckRequest): string {
  return sha(
    JSON.stringify([
      req.kind,
      req.language,
      req.text?.replace(/\s+/g, ' ').trim() ?? '',
      req.url ?? '',
      req.imageBase64 ? sha(req.imageBase64) : '',
      req.context?.destination ?? '',
      req.context?.route ?? '',
      req.context?.home ?? '',
      req.shareSignals !== false,
      req.reported === true,
    ]),
  );
}

export interface PipelineDeps {
  extractor: Extractor;
  correlator: Correlator;
  grounder: Grounder;
  model: string;
  budgetMs?: number;
  intel?: Intel;
  onLanguage?: (s: LanguageStats) => void;
  feedback?: Pick<Feedback, 'remember' | 'noteReport'>;
  /** Cap for grounding when extraction and rules already say danger. 0 disables the cap. */
  dangerGroundCapMs?: number;
  /** Start link checks on regex-found URLs before extraction ends. */
  earlyLinks?: boolean;
  /** Start grounding when the streamed extraction has its entities, before the rest arrives. */
  earlyGrounding?: boolean;
  /** Write the intel signal after the response instead of before it. */
  recordAfterResponse?: boolean;
  /** Identical-check cache. 0 or unset disables it. */
  resultCacheTtlMs?: number;
  resultCacheMax?: number;
}

export function createPipeline(deps: PipelineDeps): Pipeline {
  const results = createTtlLru<CheckResponse>({ max: deps.resultCacheMax ?? 500, ttlMs: deps.resultCacheTtlMs ?? 0 });
  const caching = (deps.resultCacheTtlMs ?? 0) > 0;
  const earlyLinks = deps.earlyLinks ?? true;
  const earlyEntities = deps.earlyGrounding ?? true;

  return {
    async run(req, opts = {}) {
      const tm = timingStore.getStore() ?? new Timings();
      const emit = opts.onEvent;
      const stage = (s: Stage, status: 'start' | 'done') => emit?.({ type: 'stage', stage: s, status, ms: Math.round(tm.now()) });
      const deadline = Date.now() + (deps.budgetMs ?? 15000);
      const left = () => deadline - Date.now() - SAFETY_MARGIN_MS;
      let degraded = false;
      const markDegraded = () => {
        degraded = true;
      };

      const key = caching && !req.reported ? cacheKey(req) : undefined;
      const hit = key ? results.get(key) : undefined;
      if (hit) {
        tm.meta.cache = 'hit';
        const fresh = { ...hit, createdAt: new Date().toISOString() };
        emit?.({ type: 'verdict', response: fresh });
        return fresh;
      }

      const earlyUrls = earlyLinks ? mergeUrls(5, req.url ? [req.url] : [], findUrls(req.text ?? '')) : [];
      const early = earlyUrls.length
        ? tm.span('linksEarly', () =>
            settle(deps.correlator.checkAll(earlyUrls), left(), unknownLinks(earlyUrls), markDegraded).then(
              (list) => new Map(list.map((l) => [l.url, l] as const)),
            ),
          )
        : undefined;

      let earlyGround: Promise<GroundResult> | undefined;
      let groundStartedAt = 0;
      const startGround = (entities: Extraction['entities'], ms: () => number) => {
        stage('ground', 'start');
        groundStartedAt = Date.now();
        return tm
          .span('ground', () =>
            settle(deps.grounder.ground(req, { entities } as Extraction, ms()), ms() + 50, {
              flags: [] as Flag[],
              sources: [] as Source[],
            }),
          )
          .then((g) => {
            stage('ground', 'done');
            return g;
          });
      };
      const streamOpts: StreamOpts = {
        onEntities: (entities) => {
          if (earlyEntities && !earlyGround) {
            earlyGround = startGround(entities, left);
            tm.meta.groundEarlyAtMs = Math.round(tm.now());
          }
        },
      };
      stage('extract', 'start');
      const first = await tm.span('extract', () => deps.extractor.extract(req, streamOpts));
      stage('extract', 'done');
      let guarded = guardExtraction(first, req.language);
      const before0 = guarded.stats.before;
      let reasked = false;
      if (isHeavy(before0) && left() > REASK_MIN_MS) {
        reasked = true;
        const again = await tm.span('reask', () => settle(deps.extractor.extract(req, { hedgeRetry: true }), left(), undefined));
        if (again) guarded = guardExtraction(again, req.language);
      }
      tm.meta.reasked = reasked;
      const extraction = guarded.extraction;

      const prepared = deps.intel?.prepare(req, extraction);
      const ownScore = (flags: Flag[], linkChecks: LinkCheck[]) =>
        score({
          flags,
          linkChecks,
          unsolicited: extraction.unsolicited,
          llmVerdict: extraction.verdictDraft,
          scamType: extraction.scamType,
        });

      const rules = ownScore(extraction.flags, []);
      const confidentDanger = rules.verdict === 'danger' && rules.score >= DANGER_SCORE && extraction.verdictDraft === 'danger';
      const capMs = deps.dangerGroundCapMs ?? 0;
      const capped = confidentDanger && capMs > 0;
      const groundMs = () => (capped ? Math.min(left(), capMs) : left());
      tm.meta.confidentDanger = confidentDanger;

      let linksSettled: LinkCheck[] | undefined;
      const fetchLinks = async (): Promise<LinkCheck[]> => {
        const known = (await early) ?? new Map<string, LinkCheck>();
        const missing = extraction.urls.filter((u) => !known.has(u));
        const extra = missing.length ? await deps.correlator.checkAll(missing) : [];
        for (const l of extra) known.set(l.url, l);
        return extraction.urls.map((u) => known.get(u) ?? { url: u, webRisk: 'unknown' as const });
      };

      stage('links', 'start');
      stage('intel', 'start');
      const linksP = tm
        .span('links', () => settle(fetchLinks(), left(), unknownLinks(extraction.urls), markDegraded))
        .then((l) => {
          linksSettled = l;
          stage('links', 'done');
          return l;
        });
      const groundP = earlyGround
        ? capped
          ? settle(earlyGround, capMs - (Date.now() - groundStartedAt), { flags: [] as Flag[], sources: [] as Source[] })
          : earlyGround
        : startGround(extraction.entities, groundMs);
      const networkP = tm
        .span('intel', () =>
          deps.intel && prepared
            ? settle(deps.intel.lookup(prepared, req.language), left(), NO_LOOKUP, markDegraded)
            : Promise.resolve(NO_LOOKUP),
        )
        .then((n) => {
          stage('intel', 'done');
          return n;
        });

      const id = newId();
      const createdAt = new Date().toISOString();
      const respond = (
        s: ReturnType<typeof ownScore>,
        linkChecks: LinkCheck[],
        sources: Source[],
        network: typeof NO_LOOKUP,
      ): CheckResponse => {
        const scamType = s.flags.length === 0 ? 'none' : extraction.scamType;
        return {
          id,
          createdAt,
          kind: req.kind,
          verdict: s.verdict,
          score: s.score,
          title: titleFor(s.verdict, req.language),
          summary: withWebRiskNote(extraction.summary, linkChecks, req.language),
          spokenWarning: extraction.spokenWarning,
          scamType,
          flags: s.flags,
          linkChecks,
          sources,
          actions: buildActions(s.verdict, scamType, req.language, req.context?.destination),
          model: deps.model,
          ...(network.network ? { network: network.network } : {}),
        };
      };

      if (emit) {
        const partial = linksSettled ?? unknownLinks(extraction.urls);
        emit({ type: 'verdict', response: respond(ownScore(extraction.flags, partial), partial, [], NO_LOOKUP) });
      }

      const [linkChecks, grounded, network] = await Promise.all([linksP, groundP, networkP]);
      const scoreStart = performance.now();
      const groundedGuard = guardFlags(grounded.flags, req.language);
      const ownFlags = [...extraction.flags, ...groundedGuard.flags];
      const scored = network.flags.length ? ownScore([...ownFlags, ...network.flags], linkChecks) : ownScore(ownFlags, linkChecks);
      const response = respond(scored, linkChecks, grounded.sources, network);

      const rewrites = guarded.stats.rewrites + groundedGuard.stats.rewrites;
      const stats: LanguageStats = {
        lang: req.language,
        before: before0 + groundedGuard.stats.before,
        rewrites,
        reasked,
        after: countCertainty(response, req.language),
      };
      if (stats.before > 0) log('INFO', 'certainty_rewrite', { ...stats });
      deps.onLanguage?.(stats);
      tm.meta.scoreExplainMs = Math.round((performance.now() - scoreStart) * 100) / 100;

      const intel = deps.intel;
      if (intel && prepared && req.shareSignals !== false) {
        const own = network.flags.length ? ownScore(ownFlags, linkChecks) : scored;
        const reported = req.reported === true;
        const ownType = own.flags.length === 0 ? 'none' : extraction.scamType;
        const outcome = {
          verdict: reported && own.verdict === 'safe' ? ('careful' as const) : own.verdict,
          score: own.score,
          scamType: reported ? (req.reportedType ?? ownType) : ownType,
          flags: own.flags,
        };
        const write = () =>
          settle(
            (async () => {
              const rec = await intel.recordSignal(prepared, outcome, {
                uid: req.uid,
                ...(reported ? { confirmed: true, src: 'reported' as const } : {}),
              });
              if (reported) {
                await deps.feedback?.noteReport({ scamType: outcome.scamType, language: prepared.language, lostMoney: req.lostMoney });
                return;
              }
              await deps.feedback?.remember({
                checkId: id,
                verdict: own.verdict,
                scamType: ownType,
                score: own.score,
                kind: req.kind,
                language: prepared.language,
                sigId: rec.status === 'skipped' ? undefined : rec.signalId,
                prepared,
              });
            })().catch((err: Error) => log('WARNING', 'intel_record_failed', { error: err.message })),
            RECORD_TIMEOUT_MS,
            undefined,
          );
        if (deps.recordAfterResponse) {
          const pending = write();
          opts.afterResponse?.(pending);
        } else await tm.span('record', write);
      }

      if (key && !degraded) results.set(key, response);
      return response;
    },
  };
}
