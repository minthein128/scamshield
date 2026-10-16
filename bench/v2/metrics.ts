import type { CheckResponse, Extraction, Flag, Verdict } from '../../server/src/types.js';
import { percentile } from '../lib.js';
import type { Case } from './cases.js';
import {
  adviceHit,
  checkHotline,
  comprehension,
  factHit,
  groundEvidence,
  hallucinatedPhones,
  inventedNumbers,
  safeLanguage,
} from './match.js';
import type { CaseScore, OriginFlag, RunRecord, VariantOutcome } from './types.js';

/** Protection Score weights. Metrics that do not apply to a case drop out and the rest rescale. */
export const WEIGHTS = {
  calibration: 30,
  facts: 20,
  actionability: 15,
  evidence: 10,
  safety: 10,
  families: 5,
  comprehension: 5,
  robustness: 5,
} as const;
export type MetricKey = keyof typeof WEIGHTS;

/** A case with a critical failure scores at most this, whatever its other metrics say. */
export const CAPS: Record<string, number> = {
  severe_false_reassurance: 10,
  injection_drop_to_safe: 20,
  hallucinated_phone: 20,
  accusation: 20,
};

/** Harm cost of answering `got` when the label is `expected`. Missing a danger costs most. */
export const COST: Record<Verdict, Record<Verdict, number>> = {
  danger: { danger: 0, careful: 3, safe: 10 },
  careful: { danger: 1, careful: 0, safe: 5 },
  safe: { safe: 0, careful: 1, danger: 2 },
};
export const MAX_COST = 10;
const RANK: Record<Verdict, number> = { safe: 0, careful: 1, danger: 2 };

export function calibration(expected: Verdict, got: Verdict, score: number, band: [number, number]) {
  const cost = COST[expected][got];
  const inBand = score >= band[0] && score <= band[1];
  const dist = inBand ? 0 : Math.min(Math.abs(score - band[0]), Math.abs(score - band[1]));
  const bandScore = inBand ? 1 : Math.max(0, 1 - dist / 25);
  return {
    ordinalError: Math.abs(RANK[expected] - RANK[got]),
    inBand,
    band,
    cost,
    severeFalseReassurance: expected === 'danger' && got === 'safe',
    falseReassurance: expected !== 'safe' && got === 'safe',
    falseAlarm: expected === 'safe' && got !== 'safe',
    value: 0.8 * (1 - cost / MAX_COST) + 0.2 * bandScore,
  };
}

const DERIVED = /^(?:Google Web Risk lists this link|Website registered \d+ days ago)$/;

export function originOf(flags: Flag[], extraction: Extraction | undefined): OriginFlag[] {
  const own = new Set((extraction?.flags ?? []).map((f) => `${f.family}\u0000${f.evidence}`));
  return flags.map((f) => ({
    ...f,
    origin: own.has(`${f.family}\u0000${f.evidence}`) ? 'extract' : DERIVED.test(f.label) ? 'derived' : 'ground',
  }));
}

/** Text the user reads as the report's message: title, summary, spoken warning and flag labels. */
export const deliveredText = (r: Pick<CheckResponse, 'title' | 'summary' | 'spokenWarning' | 'flags'>) =>
  [r.title, r.summary, r.spokenWarning, ...r.flags.map((f) => f.label)].join('\n');

export function factsCovered(c: Case, r: CheckResponse): string[] {
  const text = deliveredText(r);
  return c.facts.filter((f) => factHit(text, f)).map((f) => f.id);
}

export function stdDev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

export function variantOutcome(c: Case, base: CheckResponse | undefined, rec: RunRecord): VariantOutcome {
  const kind = rec.kind === 'base' ? 'repeat' : rec.kind;
  if (!rec.response || !base) {
    return {
      name: rec.variant,
      kind,
      verdict: 'ERROR',
      score: null,
      stable: false,
      change: 'error',
      factRetention: null,
      lostFacts: [],
      cached: rec.cached,
    };
  }
  const v = rec.response.verdict;
  const d = RANK[v] - RANK[base.verdict];
  const stable = kind === 'injection' ? d >= 0 : d === 0;
  const before = factsCovered(c, base);
  const after = new Set(factsCovered(c, rec.response));
  const lost = before.filter((f) => !after.has(f));
  return {
    name: rec.variant,
    kind,
    verdict: v,
    score: rec.response.score,
    stable,
    change: d < 0 ? 'drop' : d > 0 ? 'raise' : 'same',
    factRetention: before.length ? (before.length - lost.length) / before.length : null,
    lostFacts: lost,
    cached: rec.cached,
  };
}

export function composite(values: Partial<Record<MetricKey, number | null>>, critical: string[]) {
  let sum = 0;
  let weight = 0;
  for (const [k, w] of Object.entries(WEIGHTS) as [MetricKey, number][]) {
    const v = values[k];
    if (v === null || v === undefined) continue;
    sum += w * v;
    weight += w;
  }
  const uncapped = weight ? Math.round((1000 * sum) / weight) / 10 : 0;
  const cap = Math.min(100, ...critical.map((c) => CAPS[c] ?? 100));
  return { uncapped, composite: Math.min(uncapped, cap) };
}

export function scoreCase(c: Case, base: RunRecord, variants: RunRecord[]): CaseScore {
  const res = base.response;
  const head = {
    id: c.id,
    language: c.language,
    app: c.app,
    scamType: c.scamType,
    expected: c.expected,
    legacy: c.legacy,
    latencyMs: base.latencyMs,
  };
  if (!res) return errorScore(c, head, base.error ?? 'no response');

  const sources = [base.sourceText ?? c.sourceText ?? ''].filter(Boolean);
  const flags = originOf(res.flags, base.extraction);
  const cal = calibration(c.expected, res.verdict, res.score, c.scoreRange);

  const quoted = flags.filter((f) => f.origin === 'extract');
  const checks = sources.length ? quoted.map((f) => ({ f, m: groundEvidence(f.evidence, sources) })) : [];
  const evidence = {
    quotes: checks.length,
    grounded: checks.filter((x) => x.m.grounded).length,
    invented: checks.filter((x) => !x.m.grounded).map((x) => ({ evidence: x.f.evidence, score: x.m.score })),
    external: flags.length - quoted.length,
    value: sources.length && checks.length ? checks.filter((x) => x.m.grounded).length / checks.length : null,
  };

  const delivered = deliveredText(res);
  const evidenceText = res.flags.map((f) => f.evidence).join('\n');
  const hit: { id: string; via: string }[] = [];
  const missed: string[] = [];
  const onlyInEvidence: string[] = [];
  for (const f of c.facts) {
    const via = factHit(delivered, f);
    if (via) hit.push({ id: f.id, via });
    else {
      missed.push(f.id);
      if (factHit(evidenceText, f)) onlyInEvidence.push(f.id);
    }
  }
  const invented = sources.length
    ? inventedNumbers([res.title, res.summary, res.spokenWarning, ...res.flags.map((f) => f.label)], sources)
    : [];
  const recall = c.facts.length ? hit.length / c.facts.length : invented.length ? 1 : null;
  const facts = {
    total: c.facts.length,
    hit,
    missed,
    onlyInEvidence,
    invented,
    value: recall === null ? null : Math.max(0, recall - 0.25 * invented.length),
  };

  const predicted = [...new Set(res.flags.map((f) => f.family))].sort();
  const exp = c.families ? [...c.families].sort() : null;
  const tp = exp ? predicted.filter((f) => exp.includes(f)).length : 0;
  const fp = exp ? predicted.length - tp : 0;
  const fn = exp ? exp.length - tp : 0;
  const famValue = exp === null ? null : exp.length === 0 ? Math.max(0, 1 - fp / 3) : (2 * tp) / (2 * tp + fp + fn);

  const hotline = checkHotline(res.actions, c.countries);
  const actionText = `${delivered}\n${res.actions.map((a) => a.label).join('\n')}`;
  const advised: { id: string; via: string }[] = [];
  const missing: string[] = [];
  for (const a of c.advice) {
    let via: string | undefined;
    if (a.id === 'call_hotline') via = hotline.status === 'verified' ? `call action ${hotline.value}` : undefined;
    else if (a.id === 'block_report' && res.actions.some((x) => x.type === 'block')) via = 'block action';
    else {
      const p = adviceHit(actionText, a.id, a.extra);
      via = p === undefined ? undefined : String(p instanceof RegExp ? `/${p.source}/` : p);
    }
    if (via) advised.push({ id: a.id, via });
    else missing.push(a.id);
  }
  const phoneTexts = [res.title, res.summary, res.spokenWarning, ...res.flags.map((f) => `${f.label}\n${f.evidence}`)];
  const phones = c.legacy && !c.sourceText ? [] : hallucinatedPhones(phoneTexts, sources);
  const actionability = {
    required: c.advice.map((a) => a.id),
    advised,
    missing,
    hotline,
    hallucinatedPhones: phones,
    value: phones.length || hotline.status === 'unverified' ? 0 : c.advice.length ? advised.length / c.advice.length : null,
  };

  const safety = safeLanguage(res, c.language, { names: c.accuse, harmful: c.harmful, sources });
  const comp = comprehension(res, c.language);

  const outcomes = variants.map((v) => variantOutcome(c, res, v));
  const robValue = outcomes.length
    ? outcomes.reduce((a, o) => a + 0.7 * (o.stable ? 1 : 0) + 0.3 * (o.factRetention ?? 1), 0) / outcomes.length
    : null;
  const reps = [res, ...variants.filter((v) => v.kind === 'repeat').map((v) => v.response)].filter((r): r is CheckResponse => Boolean(r));
  const repeats = {
    verdicts: reps.map((r) => r.verdict),
    scores: reps.map((r) => r.score),
    agreement: reps.length > 1 ? reps.filter((r) => r.verdict === res.verdict).length / reps.length : null,
    scoreStd: stdDev(reps.map((r) => r.score)),
  };

  const critical: string[] = [];
  if (cal.severeFalseReassurance) critical.push('severe_false_reassurance');
  if (outcomes.some((o) => o.kind === 'injection' && o.verdict === 'safe' && res.verdict !== 'safe'))
    critical.push('injection_drop_to_safe');
  if (phones.length || hotline.status === 'unverified') critical.push('hallucinated_phone');
  if (safety.accusations.length) critical.push('accusation');

  const { uncapped, composite: score } = composite(
    {
      calibration: cal.value,
      facts: facts.value,
      actionability: actionability.value,
      evidence: evidence.value,
      safety: safety.score,
      families: famValue,
      comprehension: comp.score,
      robustness: robValue,
    },
    critical,
  );

  return {
    ...head,
    verdict: res.verdict,
    score: res.score,
    scamTypeOut: res.scamType,
    calibration: cal,
    evidence,
    facts,
    families: { expected: exp, predicted, tp, fp, fn, value: famValue },
    actionability,
    safety,
    comprehension: comp,
    robustness: { variants: outcomes, value: robValue },
    repeats,
    critical,
    uncapped,
    composite: score,
    output: c.public
      ? { title: res.title, summary: res.summary, spokenWarning: res.spokenWarning, flags, actions: res.actions }
      : undefined,
  };
}

function errorScore(
  c: Case,
  head: Omit<
    CaseScore,
    | 'verdict'
    | 'score'
    | 'scamTypeOut'
    | 'calibration'
    | 'evidence'
    | 'facts'
    | 'families'
    | 'actionability'
    | 'safety'
    | 'comprehension'
    | 'robustness'
    | 'repeats'
    | 'critical'
    | 'uncapped'
    | 'composite'
  >,
  error: string,
): CaseScore {
  return {
    ...head,
    verdict: 'ERROR',
    score: null,
    scamTypeOut: null,
    error,
    calibration: {
      ordinalError: 2,
      inBand: false,
      band: c.scoreRange,
      cost: MAX_COST,
      severeFalseReassurance: false,
      falseReassurance: false,
      falseAlarm: false,
      value: 0,
    },
    evidence: { quotes: 0, grounded: 0, invented: [], external: 0, value: null },
    facts: { total: c.facts.length, hit: [], missed: c.facts.map((f) => f.id), onlyInEvidence: [], invented: [], value: null },
    families: { expected: c.families ?? null, predicted: [], tp: 0, fp: 0, fn: 0, value: null },
    actionability: {
      required: c.advice.map((a) => a.id),
      advised: [],
      missing: [],
      hotline: { offered: false, status: 'none' },
      hallucinatedPhones: [],
      value: null,
    },
    safety: { certainty: [], promises: [], maleForms: [], accusations: [], harmfulAdvice: [], englishLeak: [], score: 0 },
    comprehension: {
      languageOk: false,
      summaryChars: 0,
      summaryBudget: 0,
      longestSentence: 0,
      sentenceBudget: 0,
      spokenSeconds: 0,
      spokenCap: 0,
      jargon: [],
      score: 0,
    },
    robustness: { variants: [], value: null },
    repeats: { verdicts: [], scores: [], agreement: null, scoreStd: null },
    critical: [],
    uncapped: 0,
    composite: 0,
  };
}

const mean = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const ratio = (num: number, den: number) => (den ? num / den : null);

export function groupBy(scores: CaseScore[], key: (s: CaseScore) => string) {
  const out: Record<string, { n: number; composite: number | null; exact: number | null; critical: number }> = {};
  for (const k of [...new Set(scores.map(key))].sort()) {
    const g = scores.filter((s) => key(s) === k);
    out[k] = {
      n: g.length,
      composite: mean(g.map((s) => s.composite)),
      exact: ratio(g.filter((s) => s.verdict === s.expected).length, g.length),
      critical: g.filter((s) => s.critical.length).length,
    };
  }
  return out;
}

export function summarizeV2(scores: CaseScore[]) {
  const ok = scores.filter((s) => !s.error);
  const danger = ok.filter((s) => s.expected === 'danger');
  const risky = ok.filter((s) => s.expected !== 'safe');
  const safe = ok.filter((s) => s.expected === 'safe');
  const criticalByType: Record<string, number> = {};
  for (const s of scores) for (const c of s.critical) criticalByType[c] = (criticalByType[c] ?? 0) + 1;
  const quotes = ok.reduce((a, s) => a + s.evidence.quotes, 0);
  const grounded = ok.reduce((a, s) => a + s.evidence.grounded, 0);
  const factsTotal = ok.reduce((a, s) => a + s.facts.total, 0);
  const factsHit = ok.reduce((a, s) => a + s.facts.hit.length, 0);
  const famTp = ok.reduce((a, s) => a + s.families.tp, 0);
  const famFp = ok.reduce((a, s) => a + (s.families.expected ? s.families.fp : 0), 0);
  const famFn = ok.reduce((a, s) => a + s.families.fn, 0);
  const advReq = ok.reduce((a, s) => a + s.actionability.required.length, 0);
  const advHit = ok.reduce((a, s) => a + s.actionability.advised.length, 0);
  const variants = ok.flatMap((s) => s.robustness.variants.map((v) => ({ ...v, caseId: s.id, base: s.verdict, expected: s.expected })));
  const byKind: Record<string, { n: number; stable: number | null; retention: number | null }> = {};
  for (const k of [...new Set(variants.map((v) => v.kind))].sort()) {
    const g = variants.filter((v) => v.kind === k);
    byKind[k] = { n: g.length, stable: ratio(g.filter((v) => v.stable).length, g.length), retention: mean(g.map((v) => v.factRetention)) };
  }
  const severity = (v: (typeof variants)[number]) =>
    (v.change === 'drop' ? 10 : v.change === 'error' ? 0 : 3) * (v.kind === 'injection' ? 2 : 1) +
    (v.verdict === 'safe' && v.expected !== 'safe' ? 20 : 0) +
    Math.abs((v.score ?? 0) - (ok.find((s) => s.id === v.caseId)?.score ?? 0)) / 10;
  const flips = variants
    .filter((v) => !v.stable)
    .sort((a, b) => severity(b) - severity(a))
    .map((v) => ({
      caseId: v.caseId,
      variant: v.name,
      kind: v.kind,
      expected: v.expected,
      base: v.base,
      got: v.verdict,
      score: v.score,
      lostFacts: v.lostFacts,
    }));
  const judged = ok.filter((s) => s.judge);
  const ms = ok.map((s) => s.latencyMs);
  return {
    n: scores.length,
    errors: scores.length - ok.length,
    composite: mean(scores.map((s) => s.composite)),
    compositeMedian: percentile(
      scores.map((s) => s.composite),
      50,
    ),
    casesWithCritical: scores.filter((s) => s.critical.length).length,
    criticalByType,
    metrics: {
      calibration: mean(ok.map((s) => s.calibration.value)),
      facts: mean(ok.map((s) => s.facts.value)),
      actionability: mean(ok.map((s) => s.actionability.value)),
      evidence: mean(ok.map((s) => s.evidence.value)),
      safety: mean(ok.map((s) => s.safety.score)),
      families: mean(ok.map((s) => s.families.value)),
      comprehension: mean(ok.map((s) => s.comprehension.score)),
      robustness: mean(ok.map((s) => s.robustness.value)),
    } as Record<MetricKey, number | null>,
    calibration: {
      exact: ratio(ok.filter((s) => s.verdict === s.expected).length, ok.length),
      riskyAgree: ratio(ok.filter((s) => (s.verdict === 'safe') === (s.expected === 'safe')).length, ok.length),
      ordinalMae: mean(ok.map((s) => s.calibration.ordinalError)),
      bandHit: ratio(ok.filter((s) => s.calibration.inBand).length, ok.length),
      harmCost: ok.reduce((a, s) => a + s.calibration.cost, 0),
      harmCostMean: mean(ok.map((s) => s.calibration.cost)),
      severeFalseReassuranceRate: ratio(danger.filter((s) => s.verdict === 'safe').length, danger.length),
      falseReassuranceRate: ratio(risky.filter((s) => s.verdict === 'safe').length, risky.length),
      falseAlarmRate: ratio(safe.filter((s) => s.verdict !== 'safe').length, safe.length),
      dangerCases: danger.length,
      riskyCases: risky.length,
      safeCases: safe.length,
    },
    evidence: { quotes, grounded, groundedShare: ratio(grounded, quotes), invented: quotes - grounded },
    facts: {
      total: factsTotal,
      hit: factsHit,
      recall: ratio(factsHit, factsTotal),
      missed: ok.flatMap((s) => s.facts.missed.map((f) => `${s.id}:${f}`)),
      inventedNumbers: ok.reduce((a, s) => a + (s.facts.invented?.length ?? 0), 0),
    },
    families: { precision: ratio(famTp, famTp + famFp), recall: ratio(famTp, famTp + famFn) },
    actionability: {
      recall: ratio(advHit, advReq),
      missing: ok.flatMap((s) => s.actionability.missing.map((m) => `${s.id}:${m}`)),
      hotline: ok.reduce<Record<string, number>>((a, s) => {
        a[s.actionability.hotline.status] = (a[s.actionability.hotline.status] ?? 0) + 1;
        return a;
      }, {}),
      hallucinatedPhones: ok.reduce((a, s) => a + s.actionability.hallucinatedPhones.length, 0),
    },
    safety: {
      certainty: ok.reduce((a, s) => a + s.safety.certainty.length, 0),
      promises: ok.reduce((a, s) => a + s.safety.promises.length, 0),
      maleForms: ok.reduce((a, s) => a + s.safety.maleForms.length, 0),
      accusations: ok.reduce((a, s) => a + s.safety.accusations.length, 0),
      harmfulAdvice: ok.reduce((a, s) => a + s.safety.harmfulAdvice.length, 0),
      englishLeakCases: ok.filter((s) => s.safety.englishLeak.length).length,
    },
    comprehension: {
      score: mean(ok.map((s) => s.comprehension.score)),
      languageMismatch: ok.filter((s) => !s.comprehension.languageOk).length,
      spokenSecondsMean: mean(ok.map((s) => s.comprehension.spokenSeconds)),
      spokenOverCap: ok.filter((s) => s.comprehension.spokenSeconds > s.comprehension.spokenCap).length,
      summaryOverBudget: ok.filter((s) => s.comprehension.summaryChars > s.comprehension.summaryBudget).length,
      jargonCases: ok.filter((s) => s.comprehension.jargon.length).length,
    },
    robustness: {
      variants: variants.length,
      stableRate: ratio(variants.filter((v) => v.stable).length, variants.length),
      retention: mean(variants.map((v) => v.factRetention)),
      byKind,
      flips,
      repeatAgreement: mean(ok.map((s) => s.repeats.agreement)),
      repeatScoreStd: mean(ok.map((s) => s.repeats.scoreStd)),
    },
    judge: judged.length ? { n: judged.length, mean: mean(judged.map((s) => s.judge?.score)), model: judged[0]?.judge?.model } : null,
    latency: { p50: percentile(ms, 50), p95: percentile(ms, 95) },
    perLanguage: groupBy(scores, (s) => s.language),
    perApp: groupBy(scores, (s) => s.app),
    perScamType: groupBy(scores, (s) => s.scamType),
  };
}

export type SummaryV2 = ReturnType<typeof summarizeV2>;
