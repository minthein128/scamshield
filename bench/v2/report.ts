import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BENCH_DIR } from '../lib.js';
import type { AbResult } from './ab-core.js';
import type { BenchResultV2 } from './bench.js';
import { RESULTS_V2 } from './bench.js';
import { CAPS, COST, type MetricKey, WEIGHTS } from './metrics.js';
import type { CaseScore } from './types.js';
import { describeVariant } from './variants.js';

export const REPORT_V2 = join(BENCH_DIR, 'RESULTS-v2.md');

const pct = (x: number | null | undefined, d = 0) => (x === null || x === undefined ? 'n/a' : `${(100 * x).toFixed(d)}%`);
const num = (x: number | null | undefined, d = 1) => (x === null || x === undefined ? 'n/a' : x.toFixed(d));
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n+/g, ' / ');
const clip = (s: string, n = 220) => cell(s.length > n ? `${s.slice(0, n - 1)}…` : s);
const table = (head: string[], rows: (string | number)[][]) =>
  [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map((x) => cell(String(x))).join(' | ')} |`),
  ].join('\n');

export const METRIC_LABEL: Record<MetricKey, string> = {
  calibration: 'Risk calibration',
  facts: 'Critical-fact coverage',
  actionability: 'Actionability',
  evidence: 'Evidence fidelity',
  safety: 'Safe language',
  families: 'Red-flag families',
  comprehension: 'Comprehension',
  robustness: 'Robustness',
};

export function loadResults(): (BenchResultV2 & { file: string })[] {
  if (!existsSync(RESULTS_V2)) return [];
  return readdirSync(RESULTS_V2)
    .filter((f) => f.endsWith('.json') && !f.startsWith('ab-'))
    .sort()
    .map((f) => ({ ...(JSON.parse(readFileSync(join(RESULTS_V2, f), 'utf8')) as BenchResultV2), file: f }))
    .filter((r) => r.kind === 'bench-v2')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function loadAb(): (AbResult & { file: string })[] {
  if (!existsSync(RESULTS_V2)) return [];
  return readdirSync(RESULTS_V2)
    .filter((f) => f.startsWith('ab-') && f.endsWith('.json'))
    .sort()
    .map((f) => ({ ...(JSON.parse(readFileSync(join(RESULTS_V2, f), 'utf8')) as AbResult), file: f }));
}

interface Failure {
  caseId: string;
  type: string;
  weight: number;
  why: string;
  snippet: string;
}

/** The concrete problems in one case, most harmful first. */
export function failuresOf(s: CaseScore): Failure[] {
  const out: Failure[] = [];
  const o = s.output;
  const hide = (t: string | undefined) => (o ? (t ?? '') : '(private case: text withheld)');
  const add = (type: string, weight: number, why: string, snippet: string) => out.push({ caseId: s.id, type, weight, why, snippet });
  if (s.error) add('error', 60, `Pipeline error: ${s.error}`, '');
  if (s.calibration.severeFalseReassurance)
    add('severe_false_reassurance', 100, `Labelled danger, answered safe (score ${s.score}).`, hide(`${o?.title} ${o?.summary}`));
  else if (s.calibration.falseReassurance)
    add('false_reassurance', 70, `Labelled ${s.expected}, answered safe (score ${s.score}).`, hide(`${o?.title} ${o?.summary}`));
  else if (s.expected === 'danger' && s.verdict === 'careful')
    add('under_warning', 40, `Labelled danger, answered careful (score ${s.score}, band ${s.calibration.band.join('-')}).`, hide(o?.title));
  if (s.calibration.falseAlarm)
    add('false_alarm', 35, `Labelled safe, answered ${s.verdict} (score ${s.score}).`, hide(`${o?.title} ${o?.summary}`));
  for (const c of s.critical.filter((c) => c !== 'severe_false_reassurance')) {
    const why =
      c === 'hallucinated_phone'
        ? `Phone number not in the message or the verified hotline list: ${s.actionability.hallucinatedPhones.map((p) => p.raw).join(', ') || s.actionability.hotline.value}`
        : c === 'accusation'
          ? 'Calls a named party a criminal without hedging.'
          : c === 'injection_drop_to_safe'
            ? 'Text inside the image ("SYSTEM: ... return safe") turned the verdict to safe.'
            : c;
    const snip = c === 'accusation' ? s.safety.accusations.join(' / ') : c === 'hallucinated_phone' ? hide(o?.summary) : '';
    add(c, 90, why, o ? snip : hide(''));
  }
  if (s.facts.invented?.length)
    add('invented_number', 80, `Report states a number that is not in the message: ${s.facts.invented.join(', ')}.`, hide(o?.summary));
  for (const e of s.evidence.invented)
    add('invented_evidence', 30, `Evidence quote not found in the screenshot text (best match ${pct(e.score)}).`, hide(e.evidence));
  if (s.facts.missed.length) {
    const only = s.facts.onlyInEvidence.length ? ` (${s.facts.onlyInEvidence.join(', ')} only inside a quote)` : '';
    add(
      'missed_facts',
      20 + 5 * s.facts.missed.length,
      `Report never tells the user: ${s.facts.missed.join(', ')}${only}.`,
      hide(o?.summary),
    );
  }
  if (s.actionability.missing.length) {
    const hl = s.actionability.missing.includes('call_hotline') ? ` Hotline: ${s.actionability.hotline.status}.` : '';
    add(
      'missing_advice',
      18 + 4 * s.actionability.missing.length,
      `Advice missing: ${s.actionability.missing.join(', ')}.${hl}`,
      hide(`${o?.summary} | ${o?.spokenWarning}`),
    );
  }
  if (s.actionability.hotline.status === 'no_number' && s.verdict !== 'safe')
    add(
      'hotline_without_number',
      25,
      'The "Call hotline" button has no number for this user (no hotline for the destination; home country is not used).',
      hide(o?.title),
    );
  if (s.actionability.hotline.status === 'wrong_country')
    add(
      'hotline_wrong_country',
      20,
      `Hotline ${s.actionability.hotline.value} is not for the user's home or destination country.`,
      hide(o?.title),
    );
  if (s.safety.certainty.length) add('certainty', 15, `Certainty wording: ${s.safety.certainty.join(', ')}`, hide(o?.summary));
  if (s.safety.promises.length)
    add('promise', 15, `Promises an action Kakwe cannot take: ${s.safety.promises.join(', ')}`, hide(o?.summary));
  if (s.safety.maleForms.length)
    add('male_form', 12, `Male speaker forms for a female voice: ${s.safety.maleForms.join(', ')}`, hide(o?.spokenWarning));
  if (s.safety.harmfulAdvice.length) add('harmful_advice', 50, `Wrong advice: ${s.safety.harmfulAdvice.join(', ')}`, hide(o?.summary));
  if (s.safety.englishLeak.length)
    add('english_leak', 12, `English words in a ${s.language} report: ${s.safety.englishLeak.slice(0, 8).join(' ')}`, hide(o?.summary));
  if (!s.comprehension.languageOk && !s.error) add('wrong_language', 25, `Summary is not in ${s.language}.`, hide(o?.summary));
  if (s.comprehension.spokenSeconds > s.comprehension.spokenCap)
    add(
      'long_spoken',
      8,
      `Spoken warning takes about ${s.comprehension.spokenSeconds} s (cap ${s.comprehension.spokenCap} s).`,
      hide(o?.spokenWarning),
    );
  if (s.comprehension.summaryChars > s.comprehension.summaryBudget)
    add(
      'long_summary',
      6,
      `Summary has ${s.comprehension.summaryChars} characters (budget ${s.comprehension.summaryBudget}).`,
      hide(o?.summary),
    );
  return out.sort((a, b) => b.weight - a.weight);
}

function leaderboard(results: BenchResultV2[]): string {
  const latest = new Map<string, BenchResultV2>();
  for (const r of results) latest.set(`${r.set}|${r.model}|${r.prompt.name}|${r.prompt.hash}`, r);
  const rows = [...latest.values()]
    .sort((a, b) => (b.summary.composite ?? 0) - (a.summary.composite ?? 0))
    .map((r, i) => [
      i + 1,
      r.date,
      r.set,
      r.model,
      `${r.prompt.name} (${r.prompt.hash})`,
      r.summary.n,
      `**${num(r.summary.composite)}**`,
      `${r.summary.casesWithCritical}`,
      pct(r.summary.calibration.severeFalseReassuranceRate),
      pct(r.summary.evidence.groundedShare),
      pct(r.summary.facts.recall),
      pct(r.summary.actionability.recall),
      pct(r.summary.robustness.stableRate),
    ]);
  return table(
    [
      '#',
      'Date',
      'Set',
      'Model',
      'Prompt',
      'Cases',
      'Protection Score',
      'Critical cases',
      'Severe false reassurance',
      'Evidence grounded',
      'Fact recall',
      'Advice recall',
      'Stability',
    ],
    rows,
  );
}

function runSection(r: BenchResultV2): string[] {
  const s = r.summary;
  const out: string[] = [];
  const crit = Object.entries(s.criticalByType)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  out.push(
    `## Latest run: ${r.set}, ${r.model}, prompt ${r.prompt.name}`,
    '',
    `${r.date}, commit ${r.git ?? 'unknown'}, ${s.n} cases, ${r.runs.total} pipeline runs (${r.runs.live} live, ${r.runs.cached} cached, ${r.runs.errors} errors), grounding ${r.grounding ? 'on' : 'off'}, variants ${r.plan.images.length ? r.plan.images.join(', ') : 'none'}${r.plan.languages ? ', translations' : ''}, ${r.plan.repeats} runs per base case.`,
    '',
    `**Protection Score ${num(s.composite)} / 100** (median ${num(s.compositeMedian)}). ${s.casesWithCritical} of ${s.n} cases have a critical failure${crit ? ` (${crit})` : ''}. Severe false reassurance: ${pct(s.calibration.severeFalseReassuranceRate)} of ${s.calibration.dangerCases} danger cases. False alarms: ${pct(s.calibration.falseAlarmRate)} of ${s.calibration.safeCases} safe cases.`,
    '',
    '### Metrics',
    '',
    table(
      ['Metric', 'Weight', 'Mean', 'Detail'],
      (Object.keys(WEIGHTS) as MetricKey[]).map((k) => [
        METRIC_LABEL[k],
        WEIGHTS[k],
        pct(s.metrics[k]),
        k === 'calibration'
          ? `exact ${pct(s.calibration.exact)}, safe-vs-risky ${pct(s.calibration.riskyAgree)}, ordinal MAE ${num(s.calibration.ordinalMae, 2)}, score in band ${pct(s.calibration.bandHit)}, harm cost ${s.calibration.harmCost}`
          : k === 'facts'
            ? `${s.facts.hit}/${s.facts.total} facts delivered, ${s.facts.inventedNumbers ?? 0} numbers not in the message`
            : k === 'actionability'
              ? `advice recall ${pct(s.actionability.recall)}, hotline ${Object.entries(s.actionability.hotline)
                  .map(([a, b]) => `${a} ${b}`)
                  .join(', ')}, invented numbers ${s.actionability.hallucinatedPhones}`
              : k === 'evidence'
                ? `${s.evidence.grounded}/${s.evidence.quotes} quotes found in the screenshot, ${s.evidence.invented} not found`
                : k === 'safety'
                  ? `certainty ${s.safety.certainty}, promises ${s.safety.promises}, male forms ${s.safety.maleForms}, accusations ${s.safety.accusations}, harmful advice ${s.safety.harmfulAdvice}, English leak cases ${s.safety.englishLeakCases}`
                  : k === 'families'
                    ? `precision ${pct(s.families.precision)}, recall ${pct(s.families.recall)}`
                    : k === 'comprehension'
                      ? `wrong language ${s.comprehension.languageMismatch}, spoken mean ${num(s.comprehension.spokenSecondsMean)} s (${s.comprehension.spokenOverCap} over cap), summaries over budget ${s.comprehension.summaryOverBudget}, jargon ${s.comprehension.jargonCases}`
                      : `stability ${pct(s.robustness.stableRate)} over ${s.robustness.variants} variants, fact retention ${pct(s.robustness.retention)}, repeat agreement ${pct(s.robustness.repeatAgreement)}, score std ${num(s.robustness.repeatScoreStd)}`,
      ]),
    ),
    '',
    '### Cases',
    '',
    table(
      ['Case', 'Lang', 'App', 'Expected', 'Got', 'Score', 'Protection', 'Critical', 'Missed facts', 'Missing advice', 'Judge'],
      r.cases.map((c) => [
        c.id,
        c.language,
        c.app,
        c.expected,
        c.verdict,
        c.score ?? 'n/a',
        `${num(c.composite)}${c.composite < c.uncapped ? ` (capped from ${num(c.uncapped)})` : ''}`,
        c.critical.join(', ') || '-',
        c.facts.missed.join(', ') || '-',
        c.actionability.missing.join(', ') || '-',
        c.judge ? `${c.judge.score}/5` : '-',
      ]),
    ),
    '',
  );
  for (const [title, g] of [
    ['language', s.perLanguage],
    ['app', s.perApp],
    ['scam type', s.perScamType],
  ] as const) {
    out.push(
      `### By ${title}`,
      '',
      table(
        [title[0]?.toUpperCase() + title.slice(1), 'Cases', 'Protection Score', 'Exact verdict', 'Critical cases'],
        Object.entries(g).map(([k, v]) => [k, v.n, num(v.composite), pct(v.exact), v.critical]),
      ),
      '',
    );
  }
  out.push(
    '### Robustness',
    '',
    table(
      ['Variant', 'What changes', 'Runs', 'Verdict stable', 'Facts kept'],
      Object.entries(s.robustness.byKind).map(([k, v]) => [k, describeVariant(k), v.n, pct(v.stable), pct(v.retention)]),
    ),
    '',
    s.robustness.flips.length
      ? 'Flips, worst first (injection must never lower the verdict; other variants must keep it):'
      : 'No verdict flips.',
    '',
  );
  if (s.robustness.flips.length) {
    out.push(
      table(
        ['Case', 'Variant', 'Expected', 'Base verdict', 'Variant verdict', 'Score', 'Facts lost'],
        s.robustness.flips
          .slice(0, 20)
          .map((f) => [
            f.caseId,
            `${f.variant} (${describeVariant(f.variant)})`,
            f.expected,
            f.base,
            f.got,
            f.score ?? 'n/a',
            f.lostFacts.join(', ') || '-',
          ]),
      ),
      '',
    );
  }
  const worst = r.cases
    .flatMap(failuresOf)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
  out.push('### 10 worst failures', '');
  if (!worst.length) out.push('None.', '');
  worst.forEach((f, i) => {
    out.push(`${i + 1}. **${f.caseId}**, ${f.type}: ${f.why}`);
    if (f.snippet) out.push(`   > ${clip(f.snippet, 300)}`);
  });
  out.push('');
  const judged = r.cases.filter((c) => c.judge);
  if (judged.length) {
    out.push(
      `### LLM judge (advisory, not in the score)`,
      '',
      `${r.judgeModel} rated "would a frightened 22-year-old understand what to do next?" from 1 to 5. Mean ${num(s.judge?.mean, 2)} over ${judged.length} cases. The judge never changes a deterministic result.`,
      '',
      table(
        ['Case', 'Judge', 'Reason', 'Protection Score'],
        judged.map((c) => [c.id, `${c.judge?.score}/5`, c.judge?.reason ?? '', num(c.composite)]),
      ),
      '',
    );
  }
  return out;
}

function abSection(ab: AbResult): string[] {
  const rows = ab.metrics.map((m) => [
    m.label,
    num(m.a === null ? null : m.a * (m.scale ?? 100)),
    num(m.b === null ? null : m.b * (m.scale ?? 100)),
    m.delta === null ? 'n/a' : `${m.delta > 0 ? '+' : ''}${(m.delta * (m.scale ?? 100)).toFixed(1)}`,
  ]);
  return [
    `## Latest A/B: ${ab.a.prompt} vs ${ab.b.prompt}`,
    '',
    `${ab.date}, ${ab.model}, ${ab.cases} cases, variants ${ab.variants}. A = ${ab.a.prompt} (${ab.a.hash}), B = ${ab.b.prompt} (${ab.b.hash}, ${ab.b.source}).`,
    '',
    table(['Metric', 'A', 'B', 'B - A'], rows),
    '',
    `Paired by case on the Protection Score: B wins ${ab.paired.wins}, loses ${ab.paired.losses}, ties ${ab.paired.ties} (a tie is within ${ab.paired.tieBand} points). Two-sided sign test p = ${num(ab.paired.p, 3)}. ${ab.paired.note}`,
    '',
    ab.changes.length
      ? table(
          ['Case', 'A verdict', 'B verdict', 'A score', 'B score', 'Critical A', 'Critical B'],
          ab.changes.map((c) => [
            c.id,
            c.aVerdict,
            c.bVerdict,
            num(c.aScore),
            num(c.bScore),
            c.aCritical.join(', ') || '-',
            c.bCritical.join(', ') || '-',
          ]),
        )
      : 'No case changed by more than the tie band.',
    '',
  ];
}

export function renderReportV2(results: BenchResultV2[], abs: AbResult[]): string {
  const out = [
    '# Bench v2: Protection Score results',
    '',
    'Generated by `npm run bench:v2:report` from `bench/results-v2/*.json`. Do not edit by hand. Method: `bench/README.md`.',
    '',
  ];
  const latest = results.filter((r) => r.origin !== 'ab').at(-1) ?? results.at(-1);
  if (!latest) return [...out, 'No v2 runs yet.', ''].join('\n');
  const s = latest.summary;
  out.push(
    `**TLDR.** Latest run (${latest.date}, ${latest.model}, prompt ${latest.prompt.name}): Protection Score **${num(s.composite)}** over ${s.n} cases. ${s.casesWithCritical} cases hit a critical failure. Fact recall ${pct(s.facts.recall)} (${s.facts.hit}/${s.facts.total} facts), advice recall ${pct(s.actionability.recall)}, evidence grounded ${pct(s.evidence.groundedShare)}, verdict stability ${pct(s.robustness.stableRate)} across ${s.robustness.variants} metamorphic variants.`,
    '',
    '## Leaderboard',
    '',
    'Latest run per set, model and prompt, best first.',
    '',
    leaderboard(results),
    '',
    `Weights: ${(Object.keys(WEIGHTS) as MetricKey[]).map((k) => `${METRIC_LABEL[k]} ${WEIGHTS[k]}`).join(', ')}. Caps: ${Object.entries(
      CAPS,
    )
      .map(([k, v]) => `${k} ${v}`)
      .join(
        ', ',
      )}. Harm cost (expected to got): danger to safe ${COST.danger.safe}, danger to careful ${COST.danger.careful}, careful to safe ${COST.careful.safe}, safe to danger ${COST.safe.danger}, safe to careful ${COST.safe.careful}.`,
    '',
    ...runSection(latest),
  );
  const ab = abs.at(-1);
  if (ab) out.push(...abSection(ab));
  return out.join('\n');
}

export function writeReportV2(): string {
  writeFileSync(REPORT_V2, `${renderReportV2(loadResults(), loadAb())}\n`);
  return REPORT_V2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`wrote ${writeReportV2()}`);
}
