import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from '../lib.js';
import { compareRuns } from './ab-core.js';
import { COMMON_HELP, optionsFromFlags, printSummary, RESULTS_V2, runBench, writeResult } from './bench.js';
import { writeReportV2 } from './report.js';

const flags = parseArgs(process.argv.slice(2));
if (flags.help || typeof flags.b !== 'string') {
  console.log(`npm run bench:ab -- --b FILE [--a FILE] [options]
  Runs prompt A (default: production) and prompt B on the same cases and reports per-metric deltas
  and paired wins and losses. Cached responses are reused, so A is usually free.
  --a FILE               prompt variant for A (default: the production prompt)
  --b FILE               prompt variant for B (required)
  --tie N                score difference that still counts as a tie (default 1 point)
${COMMON_HELP}
  Defaults here: --variants none --repeats 1. Pass --variants all to compare robustness too.`);
  process.exit(flags.help ? 0 : 2);
}

const base = optionsFromFlags(flags);
const opts = { ...base, variants: base.variants ?? 'none', repeats: base.repeats ?? 1, origin: 'ab' as const };
try {
  console.log('A:');
  const a = await runBench({ ...opts, promptVariant: typeof flags.a === 'string' ? flags.a : undefined });
  printSummary(a);
  console.log('\nB:');
  const b = await runBench({ ...opts, promptVariant: flags.b });
  printSummary(b);
  const aFile = writeResult(a);
  const bFile = writeResult(b);
  const ab = compareRuns({ ...a, file: relative(RESULTS_V2, aFile) }, { ...b, file: relative(RESULTS_V2, bFile) }, Number(flags.tie ?? 1));
  mkdirSync(RESULTS_V2, { recursive: true });
  const out = join(RESULTS_V2, `ab-${b.date}-${a.prompt.name}-vs-${b.prompt.name}.json`);
  writeFileSync(out, `${JSON.stringify(ab, null, 2)}\n`);
  writeReportV2();
  console.log(`\nA/B ${a.prompt.name} -> ${b.prompt.name}`);
  for (const m of ab.metrics) {
    const sc = m.scale ?? 100;
    const f = (x: number | null) => (x === null ? 'n/a' : (x * sc).toFixed(1));
    console.log(
      `  ${m.label.padEnd(32)} ${f(m.a).padStart(7)} ${f(m.b).padStart(7)} ${m.delta === null ? '' : `${m.delta >= 0 ? '+' : ''}${(m.delta * sc).toFixed(1)}`}`,
    );
  }
  console.log(
    `  paired: B wins ${ab.paired.wins}, loses ${ab.paired.losses}, ties ${ab.paired.ties}, sign test p=${ab.paired.p.toFixed(3)}. ${ab.paired.note}`,
  );
  console.log(`wrote ${relative(process.cwd(), out)} and bench/RESULTS-v2.md`);
} catch (err) {
  console.error(`bench:ab: ${(err as Error).message}`);
  process.exit(2);
}
