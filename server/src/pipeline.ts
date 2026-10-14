import { randomUUID } from 'node:crypto';
import type { Correlator } from './correlate.js';
import { buildActions, titleFor, withWebRiskNote } from './explain.js';
import type { Extractor } from './extract.js';
import type { Grounder } from './ground.js';
import { score } from './score.js';
import type { CheckRequest, CheckResponse } from './types.js';

export interface Pipeline {
  run(req: CheckRequest): Promise<CheckResponse>;
}

const SAFETY_MARGIN_MS = 500;

const settle = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), Math.max(ms, 0)))]);

export function createPipeline(deps: {
  extractor: Extractor;
  correlator: Correlator;
  grounder: Grounder;
  model: string;
  budgetMs?: number;
}): Pipeline {
  return {
    async run(req) {
      const deadline = Date.now() + (deps.budgetMs ?? 15000);
      const extraction = await deps.extractor.extract(req);
      const left = () => deadline - Date.now() - SAFETY_MARGIN_MS;
      const [linkChecks, grounded] = await Promise.all([
        settle(
          deps.correlator.checkAll(extraction.urls),
          left(),
          extraction.urls.map((url) => ({ url, webRisk: 'unknown' as const })),
        ),
        settle(deps.grounder.ground(req, extraction, left()), left(), { flags: [], sources: [] }),
      ]);
      const scored = score({
        flags: [...extraction.flags, ...grounded.flags],
        linkChecks,
        unsolicited: extraction.unsolicited,
        llmVerdict: extraction.verdictDraft,
      });
      const scamType = scored.flags.length === 0 ? 'none' : extraction.scamType;
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
      };
    },
  };
}
