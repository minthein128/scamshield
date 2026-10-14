import { loadConfig, pipelineOptions } from '../src/config.js';
import { createCorrelator } from '../src/correlate.js';
import { createClient, createGeminiExtractor } from '../src/extract.js';
import { createGrounder } from '../src/ground.js';
import { createPipeline } from '../src/pipeline.js';
import type { CheckResponse } from '../src/types.js';
import { CASES } from './cases.js';

const cfg = loadConfig({ ...process.env, MOCK: '0', LOG_SILENT: process.env.EVAL_VERBOSE ? '' : '1' });
if (!cfg.geminiApiKey && !(cfg.useVertex && cfg.project)) {
  console.error('eval: set GEMINI_API_KEY (or Vertex env). Optional: GEMINI_MODEL, EVAL_DELAY_MS, EVAL_ONLY=id,id, EVAL_JSON=1');
  process.exit(2);
}
const delayMs = Number(process.env.EVAL_DELAY_MS ?? 1500);
const only = process.env.EVAL_ONLY?.split(',');
const client = createClient(cfg);
const pipeline = createPipeline({
  extractor: createGeminiExtractor(cfg, client),
  correlator: createCorrelator(cfg, { getToken: async () => undefined }),
  grounder: createGrounder(cfg, client),
  ...pipelineOptions(cfg),
  budgetMs: Number(process.env.EVAL_BUDGET_MS ?? cfg.requestBudgetMs),
  resultCacheTtlMs: 0,
});

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] ?? 0;
};
const pad = (v: string | number, n: number) => String(v).padEnd(n);

interface Row {
  id: string;
  lang: string;
  expect: string;
  verdict: string;
  score: number;
  scamType: string;
  ms: number;
  ok: boolean;
  res?: CheckResponse;
  error?: string;
}

const rows: Row[] = [];
for (const c of CASES.filter((x) => !only || only.includes(x.id))) {
  const t = Date.now();
  try {
    const res = await pipeline.run({ kind: c.kind, language: c.lang, text: c.text });
    const risky = res.verdict !== 'safe';
    rows.push({
      id: c.id,
      lang: c.lang,
      expect: c.expect,
      verdict: res.verdict,
      score: res.score,
      scamType: res.scamType,
      ms: Date.now() - t,
      ok: risky === (c.expect === 'risky'),
      res,
    });
  } catch (err) {
    rows.push({
      id: c.id,
      lang: c.lang,
      expect: c.expect,
      verdict: 'ERROR',
      score: 0,
      scamType: '-',
      ms: Date.now() - t,
      ok: false,
      error: (err as Error).message,
    });
  }
  await new Promise((r) => setTimeout(r, delayMs));
}

console.log(`model=${cfg.model} thinking=${cfg.thinkingLevel ?? 'default'} grounding=${cfg.grounding}\n`);
console.log(
  `${pad('case', 18)}${pad('lang', 5)}${pad('expect', 8)}${pad('verdict', 9)}${pad('score', 6)}${pad('scamType', 24)}${pad('flags', 6)}${pad('src', 4)}${pad('ms', 7)}ok`,
);
for (const r of rows) {
  console.log(
    `${pad(r.id, 18)}${pad(r.lang, 5)}${pad(r.expect, 8)}${pad(r.verdict, 9)}${pad(r.score, 6)}${pad(r.scamType, 24)}${pad(r.res?.flags.length ?? '-', 6)}${pad(r.res?.sources.length ?? '-', 4)}${pad(r.ms, 7)}${r.ok ? 'yes' : 'NO'}${r.error ? `  ${r.error.slice(0, 100)}` : ''}`,
  );
}
const ok = rows.filter((r) => r.ok).length;
const ms = rows.map((r) => r.ms);
console.log(
  `\naccuracy ${ok}/${rows.length} (${Math.round((100 * ok) / rows.length)}%)  latency p50=${pct(ms, 50)}ms p95=${pct(ms, 95)}ms max=${Math.max(...ms)}ms`,
);
if (process.env.EVAL_JSON) {
  const slim = rows.map(({ res, ...r }) => ({ ...r, flags: res?.flags.length ?? 0, sources: res?.sources.length ?? 0 }));
  const doc = {
    kind: 'text-eval',
    date: new Date().toISOString().slice(0, 10),
    model: cfg.model,
    cases: rows.length,
    correct: ok,
    p50: pct(ms, 50),
    p95: pct(ms, 95),
    rows: slim,
  };
  await import('node:fs').then((fs) => fs.writeFileSync(process.env.EVAL_JSON as string, `${JSON.stringify(doc, null, 2)}\n`));
}
process.exit(ok === rows.length ? 0 : 1);
