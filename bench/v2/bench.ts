import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { BENCH_DIR, IMAGE_EXT } from '../lib.js';
import { CASES_DIR, type Case, legacyCases, loadCases } from './cases.js';
import { JUDGE_MODEL, judge } from './judge.js';
import { CAPS, COST, type SummaryV2, scoreCase, summarizeV2, WEIGHTS } from './metrics.js';
import { createRunner, loadPromptVariant, pool, type RunInput } from './runner.js';
import type { CaseScore, RunRecord } from './types.js';
import { parsePlan, planVariants, type VariantPlan } from './variants.js';

export const RESULTS_V2 = join(BENCH_DIR, 'results-v2');
export const BASELINE = join(BENCH_DIR, 'baseline-v2.json');

export interface BenchOptions {
  cases?: string;
  labels?: string;
  only?: string[];
  promptVariant?: string;
  model?: string;
  variants?: string;
  repeats?: number;
  grounding?: boolean;
  cache?: boolean;
  offline?: boolean;
  judge?: string | false;
  concurrency?: number;
  set?: string;
  allowDrafts?: boolean;
  quiet?: boolean;
  origin?: 'run' | 'ab';
}

export interface BenchResultV2 {
  kind: 'bench-v2';
  version: 1;
  origin: 'run' | 'ab';
  date: string;
  createdAt: string;
  git?: string;
  set: string;
  model: string;
  prompt: { name: string; hash: string; source: string };
  grounding: boolean;
  plan: VariantPlan;
  judgeModel: string | null;
  weights: typeof WEIGHTS;
  caps: typeof CAPS;
  cost: typeof COST;
  runs: { total: number; cached: number; errors: number; live: number };
  summary: SummaryV2;
  cases: CaseScore[];
}

const gitSha = () => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: BENCH_DIR, encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
};

export function selectCases(opts: BenchOptions): Case[] {
  if (opts.labels) return legacyCases(opts.labels).filter((c) => !opts.only || opts.only.includes(c.id));
  const loaded = loadCases(opts.cases ?? CASES_DIR, { allowDrafts: opts.allowDrafts });
  for (const p of loaded.problems) console.warn(`bench: skipping ${p.path}: ${p.errors.join('; ')}`);
  for (const d of loaded.drafts) console.warn(`bench: skipping draft ${d}`);
  return loaded.cases.filter((c) => !opts.only || opts.only.includes(c.id));
}

export async function runBench(opts: BenchOptions): Promise<BenchResultV2> {
  const log = (s: string) => {
    if (!opts.quiet) console.log(s);
  };
  const cases = selectCases(opts);
  if (!cases.length) throw new Error('no cases to run');
  const variant = loadPromptVariant(opts.promptVariant);
  const grounding = opts.grounding ?? true;
  const runner = createRunner({ model: opts.model, variant, grounding, cache: opts.cache ?? true, offline: opts.offline });
  const plan = parsePlan(opts.variants, opts.repeats ?? 3);
  const mime = (p: string) => IMAGE_EXT[extname(p).toLowerCase()] ?? 'image/png';

  const tasks: RunInput[] = [];
  const missing: string[] = [];
  for (const c of cases) {
    if (!existsSync(c.image)) {
      missing.push(c.id);
      continue;
    }
    tasks.push({ c, name: 'base', kind: 'base', image: c.image, mime: mime(c.image), sourceText: c.sourceText, runIndex: 0 });
    for (const v of planVariants(c, plan)) tasks.push({ c, ...v });
  }
  for (const m of missing) console.warn(`bench: ${m} has no image, skipped`);
  log(
    `bench v2: ${cases.length - missing.length} cases, ${tasks.length} runs, model=${runner.model}, prompt=${variant.name} (${variant.hash}), grounding=${grounding}, cache=${opts.cache !== false}${opts.offline ? ' offline' : ''}`,
  );

  let done = 0;
  const records = await pool(tasks, opts.concurrency ?? 3, async (t) => {
    const r = await runner.run(t);
    done++;
    const v = r.response ? `${r.response.verdict.padEnd(7)} ${String(r.response.score).padStart(3)}` : `ERROR ${r.error ?? ''}`;
    log(
      `${String(done).padStart(4)}/${tasks.length} ${t.c.id.padEnd(22)} ${t.name.padEnd(11)} ${v} ${r.cached ? 'cached' : `${r.latencyMs}ms`}`,
    );
    return r;
  });

  const byCase = new Map<string, RunRecord[]>();
  for (const r of records) byCase.set(r.caseId, [...(byCase.get(r.caseId) ?? []), r]);
  const scores: CaseScore[] = [];
  for (const c of cases) {
    const recs = byCase.get(c.id);
    if (!recs) continue;
    const base = recs.find((r) => r.kind === 'base') as RunRecord;
    scores.push(
      scoreCase(
        c,
        base,
        recs.filter((r) => r.kind !== 'base'),
      ),
    );
  }

  const judgeModel = opts.judge === false || opts.judge === undefined ? null : opts.judge || JUDGE_MODEL;
  if (judgeModel && runner.client) {
    await pool(scores, opts.concurrency ?? 3, async (s) => {
      const c = cases.find((x) => x.id === s.id) as Case;
      const res = byCase.get(s.id)?.find((r) => r.kind === 'base')?.response;
      if (!res) return;
      const j = await judge(runner.client, c, res, judgeModel);
      if (j) s.judge = j;
    });
  }

  const date = new Date();
  return {
    kind: 'bench-v2',
    version: 1,
    origin: opts.origin ?? 'run',
    date: date.toISOString().slice(0, 10),
    createdAt: date.toISOString(),
    git: gitSha(),
    set: opts.set ?? (opts.labels ? 'labels' : 'seed'),
    model: runner.model,
    prompt: { name: variant.name, hash: variant.hash, source: variant.source },
    grounding,
    plan,
    judgeModel,
    weights: WEIGHTS,
    caps: CAPS,
    cost: COST,
    runs: {
      total: records.length,
      cached: records.filter((r) => r.cached).length,
      errors: records.filter((r) => r.error).length,
      live: records.filter((r) => !r.cached && !r.error).length,
    },
    summary: summarizeV2(scores),
    cases: scores,
  };
}

export const resultName = (r: BenchResultV2) => `${r.date}-${r.model}-${r.prompt.name}-${r.set}${r.origin === 'ab' ? '-ab' : ''}.json`;

export function writeResult(r: BenchResultV2, name = resultName(r)): string {
  mkdirSync(RESULTS_V2, { recursive: true });
  const path = join(RESULTS_V2, name);
  writeFileSync(path, `${JSON.stringify(r, null, 2)}\n`);
  return path;
}

const pct = (x: number | null | undefined) => (x === null || x === undefined ? 'n/a' : `${(100 * x).toFixed(0)}%`);

export function printSummary(r: BenchResultV2): void {
  const s = r.summary;
  console.log(
    `\nProtection Score ${s.composite?.toFixed(1)} / 100 (median ${s.compositeMedian.toFixed(1)}), ${s.casesWithCritical}/${s.n} cases with a critical failure${
      Object.keys(s.criticalByType).length
        ? ` (${Object.entries(s.criticalByType)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ')})`
        : ''
    }`,
  );
  console.log(
    `calibration ${pct(s.metrics.calibration)}  facts ${pct(s.metrics.facts)}  action ${pct(s.metrics.actionability)}  evidence ${pct(s.metrics.evidence)}  safety ${pct(s.metrics.safety)}  families ${pct(s.metrics.families)}  comprehension ${pct(s.metrics.comprehension)}  robustness ${pct(s.metrics.robustness)}`,
  );
  console.log(
    `exact ${pct(s.calibration.exact)}  severe false reassurance ${pct(s.calibration.severeFalseReassuranceRate)}  false alarm ${pct(s.calibration.falseAlarmRate)}  stability ${pct(s.robustness.stableRate)} over ${s.robustness.variants} variants  runs ${r.runs.total} (${r.runs.cached} cached, ${r.runs.errors} errors)`,
  );
}

export const COMMON_HELP = `  --cases DIR            case files (default bench/cases)
  --labels FILE          run an old labels.csv instead (verdict metrics only)
  --only id,id           run these case ids
  --model NAME           extraction model (default: GEMINI_MODEL or the server default)
  --variants SPEC        all (default), none, or a list: lang,downscale,jpeg30,crop_top10,rotate,dark,notif_bar,injection
  --repeats N            runs of each base case for the variance check (default 3)
  --no-ground            skip Search grounding (production has it on)
  --no-cache             call the model even when a cached response exists
  --rescore              use cached responses only, never call the model
  --judge [MODEL]        add the advisory LLM judge (default model ${JUDGE_MODEL})
  --concurrency N        parallel pipeline runs (default 3)
  --set NAME             name of this case set in result files (default seed)
  --allow-drafts         include case files marked draft: true`;

const str = (v: string | true | undefined) => (typeof v === 'string' ? v : undefined);

export function optionsFromFlags(flags: Record<string, string | true>): BenchOptions {
  return {
    cases: str(flags.cases),
    labels: str(flags.labels),
    only: str(flags.only)?.split(','),
    promptVariant: str(flags['prompt-variant']),
    model: str(flags.model),
    variants: str(flags.variants),
    repeats: flags.repeats ? Number(flags.repeats) : undefined,
    grounding: !flags['no-ground'],
    cache: !flags['no-cache'],
    offline: Boolean(flags.rescore),
    judge: flags.judge ? (str(flags.judge) ?? '') : false,
    concurrency: flags.concurrency ? Number(flags.concurrency) : undefined,
    set: str(flags.set),
    allowDrafts: Boolean(flags['allow-drafts']),
  };
}
