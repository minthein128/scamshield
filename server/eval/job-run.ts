import { loadConfig } from '../src/config.js';
import { createClient } from '../src/extract.js';
import { createGrounder } from '../src/ground.js';
import { assessJobOffer } from '../src/job/assess.js';
import { createJobExtractor } from '../src/job/extract.js';
import type { JobAssessResponse } from '../src/job/types.js';
import { findJobBanned } from '../src/language-guard.js';
import { JOB_PAIRS } from './job-pairs.js';

const cfg = loadConfig({ ...process.env, MOCK: '0', LOG_SILENT: process.env.EVAL_VERBOSE ? '' : '1' });
if (!cfg.geminiApiKey && !(cfg.useVertex && cfg.project)) {
  console.error('eval:job: set GEMINI_API_KEY (or Vertex env). Optional: GEMINI_MODEL, EVAL_DELAY_MS, EVAL_ONLY=id,id, EVAL_JSON=path');
  process.exit(2);
}
const delayMs = Number(process.env.EVAL_DELAY_MS ?? 1500);
const only = process.env.EVAL_ONLY?.split(',');
const client = createClient(cfg);
const extractor = createJobExtractor(cfg, client);
const grounder = createGrounder(cfg, client);

interface Row {
  id: string;
  lang: string;
  kind: 'scam' | 'legit';
  attention: string;
  score: number;
  conflicts: string[];
  flags: number;
  banned: number;
  extractMs: number;
  totalMs: number;
  ok: boolean;
  res?: JobAssessResponse;
  error?: string;
}

const userText = (r: JobAssessResponse) => [
  r.title,
  r.summary,
  r.spokenWarning,
  ...r.flags.map((f) => f.label),
  ...r.conflicts.flatMap((c) => [c.fieldLabel, c.description]),
  ...r.stillUnclear,
  ...r.findings.map((f) => f.label),
];

const rows: Row[] = [];
for (const p of JOB_PAIRS.filter((x) => !only || only.includes(x.id))) {
  const t = Date.now();
  try {
    const ex = await extractor.extract({ ad: { text: p.ad }, chat: { text: p.chat }, language: p.lang });
    const extractMs = Date.now() - t;
    const res = await assessJobOffer(
      { jobId: ex.jobId, facts: { ad: ex.ad, chat: ex.chat }, language: p.lang },
      { grounder, getStored: (id) => extractor.getStored(id) },
    );
    const banned = userText(res).reduce((n, s) => n + findJobBanned(s, p.lang).length, 0);
    const ok = p.kind === 'scam' ? res.attention !== 'lower' : res.attention !== 'pause';
    rows.push({
      id: p.id,
      lang: p.lang,
      kind: p.kind,
      attention: res.attention,
      score: res.score,
      conflicts: res.conflicts.map((c) => c.code),
      flags: res.flags.length,
      banned,
      extractMs,
      totalMs: Date.now() - t,
      ok: ok && banned === 0,
      res,
    });
  } catch (err) {
    rows.push({
      id: p.id,
      lang: p.lang,
      kind: p.kind,
      attention: 'ERROR',
      score: 0,
      conflicts: [],
      flags: 0,
      banned: 0,
      extractMs: 0,
      totalMs: Date.now() - t,
      ok: false,
      error: (err as Error).message,
    });
  }
  await new Promise((r) => setTimeout(r, delayMs));
}

const pad = (v: string | number, n: number) => String(v).padEnd(n);
console.log(`model=${cfg.model} thinking=${cfg.thinkingLevel ?? 'default'} grounding=${cfg.grounding}\n`);
console.log(
  `${pad('pair', 24)}${pad('lang', 5)}${pad('kind', 6)}${pad('tier', 8)}${pad('score', 6)}${pad('flags', 6)}${pad('ms', 7)}ok  conflicts`,
);
for (const r of rows) {
  console.log(
    `${pad(r.id, 24)}${pad(r.lang, 5)}${pad(r.kind, 6)}${pad(r.attention, 8)}${pad(r.score, 6)}${pad(r.flags, 6)}${pad(r.totalMs, 7)}${r.ok ? 'yes' : 'NO '} ${r.conflicts.join(',') || '-'}${r.error ? `  ${r.error.slice(0, 100)}` : ''}`,
  );
}
const ok = rows.filter((r) => r.ok).length;
const legitPause = rows.filter((r) => r.kind === 'legit' && r.attention === 'pause').length;
const scamLower = rows.filter((r) => r.kind === 'scam' && r.attention === 'lower').length;
const banned = rows.reduce((n, r) => n + r.banned, 0);
console.log(`\npairs ok ${ok}/${rows.length}  legit at pause ${legitPause}  scam at lower ${scamLower}  banned phrases ${banned}`);
if (process.env.EVAL_JSON) {
  const slim = rows.map(({ res, ...r }) => ({
    ...r,
    flagLabels: res?.flags.map((f) => `${f.family}/${f.severity}: ${f.label}`),
    findings: res?.findings.map((f) => f.code),
    stillUnclear: res?.stillUnclearFields,
    adFacts: res?.adFacts,
    chatFacts: res?.chatFacts,
  }));
  const doc = {
    kind: 'job-eval',
    date: new Date().toISOString().slice(0, 10),
    model: cfg.model,
    pairs: rows.length,
    ok,
    legitPause,
    scamLower,
    banned,
    rows: slim,
  };
  await import('node:fs').then((fs) => fs.writeFileSync(process.env.EVAL_JSON as string, `${JSON.stringify(doc, null, 2)}\n`));
}
process.exit(ok === rows.length ? 0 : 1);
