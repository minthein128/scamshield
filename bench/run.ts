import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { loadConfig } from '../server/src/config.js';
import { createCorrelator } from '../server/src/correlate.js';
import { createClient, createGeminiExtractor } from '../server/src/extract.js';
import { createGrounder } from '../server/src/ground.js';
import { redactDeterministic } from '../server/src/intel/redact.js';
import { countCertainty } from '../server/src/language-guard.js';
import { createPipeline } from '../server/src/pipeline.js';
import { type CheckResponse, LANGS, type Lang } from '../server/src/types.js';
import {
  BENCH_DIR,
  type BenchResult,
  IMAGE_EXT,
  isRisky,
  type LabelRow,
  parseArgs,
  type Row,
  readLabels,
  resultsDir,
  srcDir,
  summarize,
  toCsv,
  VERDICTS,
} from './lib.js';
import { writeReport } from './report.js';

const PII_PLACEHOLDERS = new Set(['[PHONE]', '[EMAIL]', '[ID_NUMBER]', '[PASSPORT]', '[CARD]', '[IBAN]', '[ACCOUNT]']);
const flags = parseArgs(process.argv.slice(2));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const str = (v: string | true | undefined) => (typeof v === 'string' ? v : undefined);

if (flags.help) {
  console.log(`npm run bench -- [options]
  --src DIR          image dir with labels.csv (default: $BENCH_SRC or the uploads/bench dir)
  --set NAME         name of this image set, used in the result file name (default: default)
  --api [URL]        call a running server (default mode, URL default http://localhost:$PORT or :8080)
  --inprocess        run the pipeline in this process instead (needs GEMINI_API_KEY)
  --delay MS         pause between images (default 2500)
  --only a.png,b.png run only these files
  --allow-mock       accept a server that runs in MOCK mode (results are not meaningful)
  --publishable      copy images with public=yes into bench/public/ and write its labels.csv
  --copy-only        with --publishable: copy and stop, no model calls
  --no-write         print the summary but write no result file`);
  process.exit(0);
}

const src = srcDir(flags.src);
const set = str(flags.set) ?? 'default';
const labelsPath = join(src, 'labels.csv');
if (!existsSync(labelsPath)) {
  console.error(`bench: no labels.csv in ${src}. Run "npm run bench:labels" first.`);
  process.exit(2);
}
const labels = readLabels(labelsPath);
const only = str(flags.only)?.split(',');
const unlabelled = labels.filter((l) => !VERDICTS.includes(l.expected as never));
const todo = labels.filter((l) => VERDICTS.includes(l.expected as never) && (!only || only.includes(l.file)));
if (unlabelled.length) console.warn(`bench: skipping ${unlabelled.length} rows with no valid expected value`);

if (flags.publishable) publish(labels);
if (flags['copy-only']) process.exit(0);
if (!todo.length) {
  console.error('bench: nothing to run');
  process.exit(2);
}

function publish(rows: LabelRow[]) {
  const out = join(BENCH_DIR, 'public');
  if (resolve(src).startsWith(out + sep) || resolve(src) === out) {
    console.log('bench: source is already under bench/public, nothing to copy');
    return;
  }
  const chosen = rows.filter((r) => r.public === 'yes' && existsSync(join(src, r.file)));
  mkdirSync(out, { recursive: true });
  for (const r of chosen) copyFileSync(join(src, r.file), join(out, basename(r.file)));
  writeFileSync(join(out, 'labels.csv'), toCsv(chosen.map((r) => ({ ...r, file: basename(r.file), notes: '' }))));
  console.log(`bench: copied ${chosen.length} public images to ${relative(process.cwd(), out)} (they must be synthetic or blurred)`);
}

type Call = (body: Record<string, unknown>) => Promise<CheckResponse>;
let call: Call;
let model = 'unknown';
let mode: BenchResult['mode'];

let lastBefore: number | null = null;
if (flags.inprocess) {
  mode = 'in-process';
  const cfg = loadConfig({ ...process.env, MOCK: '0', LOG_SILENT: '1' });
  if (!cfg.geminiApiKey && !(cfg.useVertex && cfg.project)) {
    console.error('bench: set GEMINI_API_KEY (or Vertex env) for --inprocess');
    process.exit(2);
  }
  model = cfg.model;
  const client = createClient(cfg);
  const pipeline = createPipeline({
    extractor: createGeminiExtractor(cfg, client),
    correlator: createCorrelator(cfg, { getToken: async () => undefined }),
    grounder: createGrounder(cfg, client),
    model,
    budgetMs: cfg.requestBudgetMs,
    onLanguage: (s) => {
      lastBefore = s.before;
    },
  });
  call = (body) => pipeline.run(body as never);
} else {
  mode = 'api';
  const api = (str(flags.api) ?? `http://localhost:${process.env.PORT ?? 8080}`).replace(/\/$/, '');
  try {
    const h = (await (await fetch(`${api}/healthz`)).json()) as { model: string; mock: boolean };
    model = h.model;
    if (h.mock && !flags['allow-mock']) {
      console.error(`bench: ${api} runs in MOCK mode. Give it a key, or pass --allow-mock.`);
      process.exit(2);
    }
  } catch {
    console.error(`bench: cannot reach ${api}. Start the server (cd server && npm run build && node dist/index.js) or use --inprocess.`);
    process.exit(2);
  }
  call = async (body) => {
    const res = await fetch(`${api}/v1/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as CheckResponse & { error?: { message: string } };
    if (!res.ok) throw new Error(`${res.status} ${json.error?.message ?? ''}`.trim());
    return json;
  };
}

function piiHits(res: CheckResponse): Record<string, number> {
  const fields = [res.title, res.summary, ...res.flags.map((f) => f.evidence)];
  const hits: Record<string, number> = {};
  for (const text of fields) {
    for (const span of redactDeterministic(text ?? '').spans) {
      if (PII_PLACEHOLDERS.has(span.placeholder)) {
        const k = span.placeholder.slice(1, -1).toLowerCase();
        hits[k] = (hits[k] ?? 0) + 1;
      }
    }
  }
  return hits;
}

const delay = Number(str(flags.delay) ?? 2500);
const rows: Row[] = [];
console.log(`bench: ${todo.length} images from ${src}, mode=${mode}, model=${model}, delay=${delay}ms`);
for (const [i, l] of todo.entries()) {
  const base = {
    file: l.file,
    app: l.app,
    expected: l.expected as Row['expected'],
    scamTypeExpected: l.scam_type,
    language: l.language,
  };
  const t = Date.now();
  try {
    const mime = IMAGE_EXT[extname(l.file).toLowerCase()];
    if (!mime) throw new Error('unsupported image type');
    const language = (LANGS as readonly string[]).includes(l.language) ? l.language : 'en';
    const res = await call({
      kind: 'screen',
      language,
      imageBase64: readFileSync(join(src, l.file)).toString('base64'),
      imageMimeType: mime,
      shareSignals: false,
    });
    rows.push({
      ...base,
      verdict: res.verdict,
      score: res.score,
      scamType: res.scamType,
      flagFamilies: [...new Set(res.flags.map((f) => f.family))],
      flagCount: res.flags.length,
      seenCount: res.network?.seenCount ?? null,
      latencyMs: Date.now() - t,
      correct: isRisky(res.verdict) === (l.expected !== 'safe'),
      piiHits: piiHits(res),
      certaintyBefore: flags.inprocess ? lastBefore : null,
      certaintyAfter: countCertainty(res, language as Lang),
    });
  } catch (err) {
    rows.push({
      ...base,
      verdict: 'ERROR',
      score: null,
      scamType: null,
      flagFamilies: [],
      flagCount: 0,
      seenCount: null,
      latencyMs: Date.now() - t,
      correct: false,
      piiHits: {},
      error: (err as Error).message.slice(0, 120),
    });
  }
  const r = rows[rows.length - 1] as Row;
  console.log(
    `${String(i + 1).padStart(3)}/${todo.length} ${l.file.padEnd(28)} ${l.expected.padEnd(8)} -> ${r.verdict.padEnd(8)} ${r.correct ? 'ok' : 'WRONG'} ${r.latencyMs}ms${r.error ? ` ${r.error}` : ''}`,
  );
  if (i < todo.length - 1) await sleep(delay);
}

const summary = summarize(rows);
const pct = (x: number | null) => (x === null ? 'n/a' : `${(100 * x).toFixed(1)}%`);
console.log(
  `\naccuracy ${pct(summary.accuracy)} (exact 3-class ${pct(summary.exactAccuracy)})  false positives ${pct(summary.falsePositiveRate)}  p50 ${summary.p50}ms  p95 ${summary.p95}ms  pii leaks ${summary.piiLeaks}  errors ${summary.errors}`,
);

if (!flags['no-write']) {
  const result: BenchResult = {
    kind: 'screenshot-bench',
    date: new Date().toISOString().slice(0, 10),
    set,
    model,
    mode,
    shareSignals: false,
    summary,
    rows,
  };
  mkdirSync(resultsDir(), { recursive: true });
  const name = `${result.date}-${model}${set === 'default' ? '' : `-${set}`}.json`;
  writeFileSync(join(resultsDir(), name), `${JSON.stringify(result, null, 2)}\n`);
  if (resolve(src) !== BENCH_DIR && set === 'default' && !resolve(src).startsWith(join(BENCH_DIR, 'public'))) {
    writeFileSync(join(BENCH_DIR, 'labels.csv'), toCsv(labels.map((r) => ({ ...r, notes: '' }))));
  }
  writeReport();
  console.log(`wrote bench/results/${name} and bench/RESULTS.md`);
}
