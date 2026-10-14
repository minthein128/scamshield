import { randomUUID } from 'node:crypto';
import type { Correlator } from './correlate.js';
import { buildActions, titleFor, withWebRiskNote } from './explain.js';
import type { Extractor } from './extract.js';
import type { Grounder } from './ground.js';
import { type Intel, NO_LOOKUP } from './intel/service.js';
import { log } from './log.js';
import { score } from './score.js';
import type { CheckRequest, CheckResponse } from './types.js';

export interface Pipeline {
  run(req: CheckRequest): Promise<CheckResponse>;
}

const SAFETY_MARGIN_MS = 500;
const RECORD_TIMEOUT_MS = 1500;

const settle = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), Math.max(ms, 0)))]);

export function createPipeline(deps: {
  extractor: Extractor;
  correlator: Correlator;
  grounder: Grounder;
  model: string;
  budgetMs?: number;
  intel?: Intel;
}): Pipeline {
  return {
    async run(req) {
      const deadline = Date.now() + (deps.budgetMs ?? 15000);
      const extraction = await deps.extractor.extract(req);
      const left = () => deadline - Date.now() - SAFETY_MARGIN_MS;
      const prepared = deps.intel?.prepare(req, extraction);
      const [linkChecks, grounded, network] = await Promise.all([
        settle(
          deps.correlator.checkAll(extraction.urls),
          left(),
          extraction.urls.map((url) => ({ url, webRisk: 'unknown' as const })),
        ),
        settle(deps.grounder.ground(req, extraction, left()), left(), { flags: [], sources: [] }),
        deps.intel && prepared ? settle(deps.intel.lookup(prepared, req.language), left(), NO_LOOKUP) : Promise.resolve(NO_LOOKUP),
      ]);
      const ownFlags = [...extraction.flags, ...grounded.flags];
      const scoreWith = (flags: typeof ownFlags) =>
        score({
          flags,
          linkChecks,
          unsolicited: extraction.unsolicited,
          llmVerdict: extraction.verdictDraft,
          scamType: extraction.scamType,
        });
      const scored = network.flags.length ? scoreWith([...ownFlags, ...network.flags]) : scoreWith(ownFlags);
      const scamType = scored.flags.length === 0 ? 'none' : extraction.scamType;
      if (deps.intel && prepared && req.shareSignals !== false) {
        const own = network.flags.length ? scoreWith(ownFlags) : scored;
        const outcome = {
          verdict: own.verdict,
          score: own.score,
          scamType: own.flags.length === 0 ? 'none' : extraction.scamType,
          flags: own.flags,
        };
        await settle(
          deps.intel
            .record(prepared, outcome, { uid: req.uid })
            .catch((err: Error) => log('WARNING', 'intel_record_failed', { error: err.message })),
          RECORD_TIMEOUT_MS,
          undefined,
        );
      }
      return {
        id: `chk_${randomUUID().replaceAll('-', '').slice(0, 20)}`,
        createdAt: new Date().toISOString(),
        kind: req.kind,
        verdict: scored.verdict,
        score: scored.score,
        title: titleFor(scored.verdict, req.language),
        summary: withWebRiskNote(extraction.summary, linkChecks, req.language),
        spokenWarning: extraction.spokenWarning,
        scamType,
        flags: scored.flags,
        linkChecks,
        sources: grounded.sources,
        actions: buildActions(scored.verdict, scamType, req.language, req.context?.destination),
        model: deps.model,
        ...(network.network ? { network: network.network } : {}),
      };
    },
  };
}
