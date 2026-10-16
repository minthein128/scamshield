import type { BenchResultV2 } from './bench.js';
import type { MetricKey } from './metrics.js';
import { allCritical, allInvented, WEIGHTS } from './metrics.js';

export interface AbMetric {
  label: string;
  a: number | null;
  b: number | null;
  delta: number | null;
  /** Multiplier for display: 100 for shares, 1 for points and counts. */
  scale?: number;
}

export interface AbResult {
  kind: 'bench-v2-ab';
  date: string;
  model: string;
  cases: number;
  variants: string;
  a: { prompt: string; hash: string; source: string; file: string };
  b: { prompt: string; hash: string; source: string; file: string };
  metrics: AbMetric[];
  paired: { wins: number; losses: number; ties: number; tieBand: number; p: number; note: string };
  changes: { id: string; aVerdict: string; bVerdict: string; aScore: number; bScore: number; aCritical: string[]; bCritical: string[] }[];
}

const LABELS: Record<MetricKey, string> = {
  calibration: 'Risk calibration',
  facts: 'Critical-fact coverage',
  actionability: 'Actionability',
  evidence: 'Evidence fidelity',
  safety: 'Safe language',
  families: 'Red-flag families',
  comprehension: 'Comprehension',
  robustness: 'Robustness',
};

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** Two-sided exact sign test on paired wins and losses (ties dropped). */
export function signTest(wins: number, losses: number): number {
  const n = wins + losses;
  if (!n) return 1;
  const k = Math.min(wins, losses);
  let tail = 0;
  for (let i = 0; i <= k; i++) tail += choose(n, i);
  return Math.min(1, (2 * tail) / 2 ** n);
}

const d = (a: number | null, b: number | null) => (a === null || b === null ? null : b - a);

export function compareRuns(a: BenchResultV2 & { file?: string }, b: BenchResultV2 & { file?: string }, tieBand = 1): AbResult {
  const ids = a.cases.map((c) => c.id).filter((id) => b.cases.some((x) => x.id === id));
  let wins = 0;
  let losses = 0;
  let ties = 0;
  const changes: AbResult['changes'] = [];
  for (const id of ids) {
    const x = a.cases.find((c) => c.id === id);
    const y = b.cases.find((c) => c.id === id);
    if (!x || !y) continue;
    const xs = x.meanComposite ?? x.composite;
    const ys = y.meanComposite ?? y.composite;
    const diff = ys - xs;
    if (Math.abs(diff) < tieBand) ties++;
    else if (diff > 0) wins++;
    else losses++;
    if (Math.abs(diff) >= tieBand || x.verdict !== y.verdict || allCritical(x).join() !== allCritical(y).join() || allInvented(y).length) {
      changes.push({
        id,
        aVerdict: x.verdict,
        bVerdict: y.verdict,
        aScore: xs,
        bScore: ys,
        aCritical: [...allCritical(x), ...allInvented(x).map((n) => `number ${n}`)],
        bCritical: [...allCritical(y), ...allInvented(y).map((n) => `number ${n}`)],
      });
    }
  }
  const p = signTest(wins, losses);
  const n = wins + losses;
  const note =
    n < 6
      ? 'Too few decided pairs to call a winner; add cases or variants before trusting a difference.'
      : p < 0.05
        ? `${wins > losses ? 'B' : 'A'} is better on paired cases (p < 0.05).`
        : 'No significant difference on paired cases.';
  const sa = a.summary;
  const sb = b.summary;
  const metrics: AbMetric[] = [
    {
      label: `Protection Score (mean of ${sb.runsPerCase ?? 1} runs)`,
      a: sa.meanOverRuns ?? sa.composite,
      b: sb.meanOverRuns ?? sb.composite,
      delta: d(sa.meanOverRuns ?? sa.composite, sb.meanOverRuns ?? sb.composite),
      scale: 1,
    },
    {
      label: 'Cases with a critical failure in any run',
      a: sa.casesWithCriticalAnyRun ?? sa.casesWithCritical,
      b: sb.casesWithCriticalAnyRun ?? sb.casesWithCritical,
      delta: (sb.casesWithCriticalAnyRun ?? sb.casesWithCritical) - (sa.casesWithCriticalAnyRun ?? sa.casesWithCritical),
      scale: 1,
    },
    {
      label: 'Numbers not in the message, any run',
      a: sa.inventedNumbersAnyRun ?? 0,
      b: sb.inventedNumbersAnyRun ?? 0,
      delta: (sb.inventedNumbersAnyRun ?? 0) - (sa.inventedNumbersAnyRun ?? 0),
      scale: 1,
    },
    ...(Object.keys(WEIGHTS) as MetricKey[]).map((k) => ({
      label: LABELS[k],
      a: sa.metrics[k],
      b: sb.metrics[k],
      delta: d(sa.metrics[k], sb.metrics[k]),
    })),
    {
      label: 'Cases with a critical failure',
      a: sa.casesWithCritical,
      b: sb.casesWithCritical,
      delta: sb.casesWithCritical - sa.casesWithCritical,
      scale: 1,
    },
    {
      label: 'Severe false reassurance rate',
      a: sa.calibration.severeFalseReassuranceRate,
      b: sb.calibration.severeFalseReassuranceRate,
      delta: d(sa.calibration.severeFalseReassuranceRate, sb.calibration.severeFalseReassuranceRate),
    },
    { label: 'Exact verdict', a: sa.calibration.exact, b: sb.calibration.exact, delta: d(sa.calibration.exact, sb.calibration.exact) },
    { label: 'Fact recall', a: sa.facts.recall, b: sb.facts.recall, delta: d(sa.facts.recall, sb.facts.recall) },
    {
      label: 'Numbers not in the message',
      a: sa.facts.inventedNumbers ?? 0,
      b: sb.facts.inventedNumbers ?? 0,
      delta: (sb.facts.inventedNumbers ?? 0) - (sa.facts.inventedNumbers ?? 0),
      scale: 1,
    },
    {
      label: 'Advice recall',
      a: sa.actionability.recall,
      b: sb.actionability.recall,
      delta: d(sa.actionability.recall, sb.actionability.recall),
    },
    {
      label: 'Evidence grounded',
      a: sa.evidence.groundedShare,
      b: sb.evidence.groundedShare,
      delta: d(sa.evidence.groundedShare, sb.evidence.groundedShare),
    },
    {
      label: 'Spoken warning seconds (mean)',
      a: sa.comprehension.spokenSecondsMean,
      b: sb.comprehension.spokenSecondsMean,
      delta: d(sa.comprehension.spokenSecondsMean, sb.comprehension.spokenSecondsMean),
      scale: 1,
    },
  ];
  return {
    kind: 'bench-v2-ab',
    date: b.date,
    model: b.model,
    cases: ids.length,
    variants:
      b.plan.images.length || b.plan.languages || b.plan.repeats > 1
        ? `${b.plan.images.join(', ') || 'no images'}, repeats ${b.plan.repeats}`
        : 'none',
    a: { prompt: a.prompt.name, hash: a.prompt.hash, source: a.prompt.source, file: a.file ?? '' },
    b: { prompt: b.prompt.name, hash: b.prompt.hash, source: b.prompt.source, file: b.file ?? '' },
    metrics,
    paired: { wins, losses, ties, tieBand, p, note },
    changes,
  };
}
