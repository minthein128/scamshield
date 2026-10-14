import { randomUUID } from 'node:crypto';
import type { Correlator } from './correlate.js';
import { buildActions, titleFor, withWebRiskNote } from './explain.js';
import type { Extractor } from './extract.js';
import { score } from './score.js';
import type { CheckRequest, CheckResponse } from './types.js';

export interface Pipeline {
  run(req: CheckRequest): Promise<CheckResponse>;
}

export function createPipeline(deps: { extractor: Extractor; correlator: Correlator; model: string }): Pipeline {
  return {
    async run(req) {
      const extraction = await deps.extractor.extract(req);
      const linkChecks = await deps.correlator.checkAll(extraction.urls);
      const scored = score({
        flags: extraction.flags,
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
        actions: buildActions(scored.verdict, scamType, req.language, req.context?.destination),
        model: deps.model,
      };
    },
  };
}
