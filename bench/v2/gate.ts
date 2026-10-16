import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseArgs } from '../lib.js';
import { BASELINE, type BenchResultV2, COMMON_HELP, optionsFromFlags, printSummary, runBench } from './bench.js';

export interface GateVerdict {
  pass: boolean;
  drop: number;
  newCritical: string[];
  missing: string[];
  lines: string[];
}

/** Fails on a score drop above maxDrop, a new critical failure, or a missing case. */
export function gate(baseline: BenchResultV2, current: BenchResultV2, maxDrop: number): GateVerdict {
  const drop = (baseline.summary.composite ?? 0) - (current.summary.composite ?? 0);
  const had = new Set(baseline.cases.flatMap((c) => c.critical.map((k) => `${c.id}:${k}`)));
  const newCritical = current.cases.flatMap((c) => c.critical.map((k) => `${c.id}:${k}`)).filter((k) => !had.has(k));
  const missing = baseline.cases.map((c) => c.id).filter((id) => !current.cases.some((c) => c.id === id));
  const lines = [
    `baseline ${baseline.date} ${baseline.model} prompt ${baseline.prompt.name} (${baseline.prompt.hash}): ${baseline.summary.composite?.toFixed(1)}`,
    `current  ${current.date} ${current.model} prompt ${current.prompt.name} (${current.prompt.hash}): ${current.summary.composite?.toFixed(1)}`,
    `change ${(-drop).toFixed(1)} points (allowed drop ${maxDrop})`,
  ];
  for (const c of current.cases) {
    const b = baseline.cases.find((x) => x.id === c.id);
    if (b && Math.abs(c.composite - b.composite) >= 5)
      lines.push(`  ${c.id}: ${b.composite.toFixed(1)} -> ${c.composite.toFixed(1)} (${b.verdict} -> ${c.verdict})`);
  }
  for (const k of newCritical) lines.push(`  NEW CRITICAL ${k}`);
  for (const m of missing) lines.push(`  MISSING CASE ${m}`);
  return { pass: drop <= maxDrop && newCritical.length === 0 && missing.length === 0, drop, newCritical, missing, lines };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(`npm run bench:gate -- [options]
  Re-runs the benchmark with the baseline's settings (cached responses are free) and fails when the
  Protection Score drops by more than --max-drop points or any new critical failure appears.
  --baseline FILE        default bench/baseline-v2.json (save one with: npm run bench:v2 -- --save-baseline)
  --results FILE         compare this result file instead of running
  --max-drop N           allowed drop of the mean Protection Score (default 3)
  --prompt-variant FILE  gate a candidate prompt against the baseline
${COMMON_HELP}`);
    process.exit(0);
  }
  const basePath = resolve(typeof flags.baseline === 'string' ? flags.baseline : BASELINE);
  if (!existsSync(basePath)) {
    console.error(`bench:gate: no baseline at ${relative(process.cwd(), basePath)}. Run "npm run bench:v2 -- --save-baseline" first.`);
    process.exit(2);
  }
  const baseline = JSON.parse(readFileSync(basePath, 'utf8')) as BenchResultV2;
  let current: BenchResultV2;
  if (typeof flags.results === 'string') current = JSON.parse(readFileSync(flags.results, 'utf8')) as BenchResultV2;
  else {
    const o = optionsFromFlags(flags);
    const plan = baseline.plan;
    const variants = plan.images.length || plan.languages ? [...plan.images, ...(plan.languages ? ['lang'] : [])].join(',') : 'none';
    current = await runBench({
      ...o,
      only: o.only ?? baseline.cases.map((c) => c.id),
      model: o.model ?? baseline.model,
      variants: o.variants ?? variants,
      repeats: o.repeats ?? plan.repeats,
      grounding: flags['no-ground'] ? false : baseline.grounding,
      set: o.set ?? baseline.set,
      quiet: true,
    });
    printSummary(current);
  }
  const v = gate(baseline, current, Number(flags['max-drop'] ?? 3));
  for (const l of v.lines) console.log(l);
  console.log(v.pass ? 'bench:gate PASS' : 'bench:gate FAIL');
  process.exit(v.pass ? 0 : 1);
}
