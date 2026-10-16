import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from '../lib.js';
import { signTest } from '../v2/ab-core.js';
import type { BenchResultV2 } from '../v2/bench.js';

const flags = parseArgs(process.argv.slice(2));
const str = (v: string | true | undefined) => (typeof v === 'string' ? v : undefined);
if (flags.help || !str(flags.orig)) {
  console.log(`npm run bench:real-report -- --orig OUTDIR [--redacted OUTDIR] [--write FILE]
  Summarises an A/B run on a private set: critical failures, wrong numbers, certainty wording,
  verdict spread, and verdict changes between original and redacted images.`);
  process.exit(flags.help ? 0 : 2);
}

function load(root: string): Record<string, BenchResultV2> {
  const dir = join(resolve(root), 'results-v2');
  const out: Record<string, BenchResultV2> = {};
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)
    .filter((x) => x.endsWith('.json') && !x.startsWith('ab-'))
    .sort()) {
    const r = JSON.parse(readFileSync(join(dir, f), 'utf8')) as BenchResultV2;
    out[r.prompt.name] = r;
  }
  return out;
}

const lines: string[] = [];
const say = (s = '') => lines.push(s);
const orig = load(str(flags.orig) as string);
const red = str(flags.redacted) ? load(str(flags.redacted) as string) : {};
const A = 'production';
const B = 'facts-first';
const mode = (v: string[]) =>
  [...new Set(v)].sort((a, b) => v.filter((x) => x === b).length - v.filter((x) => x === a).length)[0] as string;

function stats(r: BenchResultV2) {
  const runs = r.cases.flatMap((c) => (c.runs ?? []).map((x) => ({ id: c.id, expected: c.expected, ...x })));
  const count = (f: (x: (typeof runs)[number]) => boolean) => runs.filter(f).length;
  return {
    runs: runs.length,
    severe: count((x) => x.critical.includes('severe_false_reassurance')),
    dangerRuns: count((x) => x.expected === 'danger'),
    safeOnRisky: count((x) => x.expected !== 'safe' && x.verdict === 'safe'),
    anyCritical: count((x) => x.critical.length > 0),
    invented: count((x) => x.invented.length > 0),
    inventedList: runs.filter((x) => x.invented.length).map((x) => `${x.id}: ${x.invented.join(', ')}`),
    certainty: r.cases.filter((c) => c.safety.certainty.length).map((c) => `${c.id}: ${c.safety.certainty.join(' | ')}`),
    verdicts: Object.fromEntries(['safe', 'careful', 'danger'].map((v) => [v, count((x) => x.verdict === v)])),
    exactRuns: count((x) => x.verdict === x.expected),
    casesWithSafeAnyRun: new Set(runs.filter((x) => x.expected !== 'safe' && x.verdict === 'safe').map((x) => x.id)).size,
    unstable: r.cases.filter((c) => new Set((c.runs ?? []).map((x) => x.verdict)).size > 1).length,
  };
}

say('## Real set, production vs facts-first');
for (const [label, set] of [
  ['original images', orig],
  ['redacted images', red],
] as const) {
  if (!set[A] || !set[B]) continue;
  say();
  say(`### ${label}`);
  say('| Measure | production | facts-first |');
  say('| --- | --- | --- |');
  const a = stats(set[A]);
  const b = stats(set[B]);
  const row = (k: string, x: unknown, y: unknown) => say(`| ${k} | ${x} | ${y} |`);
  row('Protection Score (mean of runs)', set[A].summary.meanOverRuns?.toFixed(1), set[B].summary.meanOverRuns?.toFixed(1));
  row('runs', a.runs, b.runs);
  row('severe false reassurance runs (labelled danger, answered safe)', a.severe, b.severe);
  row('risky cases answered safe in any run', a.casesWithSafeAnyRun, b.casesWithSafeAnyRun);
  row('runs with any critical failure', a.anyCritical, b.anyCritical);
  row('runs with a number not in the message', a.invented, b.invented);
  row('cases with certainty wording (base run)', a.certainty.length, b.certainty.length);
  row('verdict spread safe / careful / danger', Object.values(a.verdicts).join(' / '), Object.values(b.verdicts).join(' / '));
  row('runs matching the draft verdict', a.exactRuns, b.exactRuns);
  row('cases whose verdict changes between runs', a.unstable, b.unstable);
  if (a.inventedList.length || b.inventedList.length) {
    say();
    say(`Wrong numbers: production [${a.inventedList.join('; ')}], facts-first [${b.inventedList.join('; ')}]`);
  }
  if (a.certainty.length || b.certainty.length) {
    say();
    say(`Certainty wording: production [${a.certainty.join('; ')}], facts-first [${b.certainty.join('; ')}]`);
  }
  const ca = new Map(set[A].cases.map((c) => [c.id, c]));
  let w = 0;
  let l = 0;
  let t = 0;
  for (const c of set[B].cases) {
    const x = ca.get(c.id);
    if (!x) continue;
    const d = (c.meanComposite ?? c.composite) - (x.meanComposite ?? x.composite);
    if (Math.abs(d) < 1) t++;
    else if (d > 0) w++;
    else l++;
  }
  say();
  say(
    `Paired per case (mean of 3 runs, tie under 1 point): facts-first wins ${w}, loses ${l}, ties ${t}; sign test p=${signTest(w, l).toFixed(3)}.`,
  );
}

if (orig[A] && red[A]) {
  say();
  say('### Original vs redacted: verdict changes');
  for (const p of [A, B]) {
    if (!orig[p] || !red[p]) continue;
    const ro = new Map(orig[p].cases.map((c) => [c.id, c]));
    const rows: string[] = [];
    let same = 0;
    let n = 0;
    const meanDiff: number[] = [];
    for (const c of red[p].cases) {
      const o = ro.get(c.id);
      if (!o) continue;
      n++;
      const vo = mode((o.runs ?? []).map((x) => x.verdict));
      const vr = mode((c.runs ?? []).map((x) => x.verdict));
      meanDiff.push((c.meanComposite ?? c.composite) - (o.meanComposite ?? o.composite));
      if (vo === vr) same++;
      else rows.push(`${c.id}: ${vo} -> ${vr} (draft ${c.expected})`);
    }
    const md = meanDiff.reduce((a, b) => a + b, 0) / (meanDiff.length || 1);
    say();
    say(`${p}: majority verdict unchanged in ${same} of ${n} cases; mean Protection Score change ${md >= 0 ? '+' : ''}${md.toFixed(1)}.`);
    if (rows.length) say(rows.map((r) => `- ${r}`).join('\n'));
  }
}

console.log(lines.join('\n'));
if (str(flags.write)) writeFileSync(resolve(str(flags.write) as string), `${lines.join('\n')}\n`);
