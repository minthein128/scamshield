import { randomUUID } from 'node:crypto';
import { buildActions } from '../explain.js';
import type { Grounder, GroundResult } from '../ground.js';
import { guardJobText } from '../language-guard.js';
import { log } from '../log.js';
import { ApiError, type Flag, type Lang, type Source } from '../types.js';
import { normalizeEmployer } from './parse.js';
import { attentionFor, collectFlags, detectConflicts, headlineFor, scoreJob, stated, stillUnclear } from './rules.js';
import { FINDING_TEXT, GROUND_LABEL, TIER_SPOKEN, TIER_SUMMARY } from './text.js';
import type {
  FactField,
  FactKey,
  FindingCode,
  JobAssessRequest,
  JobAssessResponse,
  JobExtraction,
  JobFacts,
  JobFinding,
  PartialFacts,
} from './types.js';
import { FACT_KEYS } from './types.js';
import { completeFacts } from './validate.js';

export interface AssessDeps {
  grounder?: Grounder;
  getStored?: (jobId: string) => JobExtraction | undefined;
  groundTimeoutMs?: number;
}

type AnyFact = FactField<unknown>;

/**
 * Stored extraction plus the user's changes. Edited values replace stored ones but the stored quote
 * stays; null or not_mentioned removes a fact; a key the request leaves out keeps the stored fact.
 */
export function mergeFacts(stored: JobFacts | null, sent: PartialFacts | null | undefined): JobFacts | null {
  if (sent === undefined) return stored;
  if (sent === null) return null;
  if (!stored) return completeFacts(sent);
  const out = {} as Record<FactKey, AnyFact | null>;
  const sentMap = sent as Record<FactKey, AnyFact | null | undefined>;
  const storedMap = stored as unknown as Record<FactKey, AnyFact | null>;
  for (const k of FACT_KEYS) {
    const base = storedMap[k];
    const s = sentMap[k];
    if (s === undefined) out[k] = base;
    else if (s === null || s.value === 'not_mentioned') out[k] = null;
    else if (s.edited) out[k] = { value: s.value, quote: base?.quote ?? '', confidence: base?.confidence ?? s.confidence, edited: true };
    else out[k] = base ?? s;
  }
  return out as unknown as JobFacts;
}

const FREE_MAIL = /^(?:gmail|googlemail|yahoo|ymail|hotmail|outlook|live|icloud|me|aol|proton|protonmail|mail|gmx|yandex|qq|163)\./i;

function hostsFrom(f: AnyFact | null): string[] {
  if (!stated(f) || (f.value !== 'company_channel' && f.value !== 'email')) return [];
  const text = `${f.quote}`;
  const hosts = [...text.matchAll(/@([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi), ...text.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)].map((m) =>
    (m[1] ?? '').toLowerCase().replace(/^www\./, ''),
  );
  return [...new Set(hosts)].filter((h) => h && !FREE_MAIL.test(h));
}

function employers(ad: JobFacts | null, chat: JobFacts | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of [ad?.employer, chat?.employer]) {
    if (!stated(f)) continue;
    const key = normalizeEmployer(f.value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(f.value.trim());
  }
  return out;
}

async function groundCompany(
  deps: AssessDeps,
  lang: Lang,
  names: string[],
  ad: JobFacts | null,
  chat: JobFacts | null,
): Promise<GroundResult | undefined> {
  if (!deps.grounder || names.length === 0) return undefined;
  const country = [ad?.destinationCountry, chat?.destinationCountry].find((f) => stated(f))?.value;
  const domains = [...hostsFrom(ad?.contactChannel ?? null), ...hostsFrom(chat?.contactChannel ?? null)];
  try {
    return await deps.grounder.ground(
      { language: lang },
      { entities: { companies: names, phones: [], domains, ...(country ? { country } : {}) } },
      deps.groundTimeoutMs ?? 6000,
      { companyCheck: true },
    );
  } catch (err) {
    log('WARNING', 'job_ground_failed', { error: (err as Error).message });
    return undefined;
  }
}

function findingsFor(names: string[], grounded: GroundResult | undefined, lang: Lang): JobFinding[] {
  if (names.length === 0) return [];
  const company: FindingCode =
    grounded?.companyFound === true ? 'company_found' : grounded?.companyFound === false ? 'company_not_found' : 'company_not_checked';
  return [company, 'recruiter_not_confirmed' as const].map((code) => ({ code, label: FINDING_TEXT[code][lang] }));
}

export async function assessJobOffer(req: JobAssessRequest, deps: AssessDeps = {}): Promise<JobAssessResponse> {
  const lang = req.language;
  const stored = req.jobId ? deps.getStored?.(req.jobId) : undefined;
  if (!stored && !req.facts) {
    throw new ApiError(400, 'bad_request', 'This job check has expired. Send facts with the request.');
  }
  const ad = stored ? mergeFacts(stored.ad, req.facts?.ad) : completeFacts(req.facts?.ad);
  const chat = stored ? mergeFacts(stored.chat, req.facts?.chat) : completeFacts(req.facts?.chat);

  const conflicts = detectConflicts(ad, chat, lang);
  const flags: Array<Flag & { geographic?: boolean }> = collectFlags(ad, chat, conflicts, lang);

  const names = employers(ad, chat);
  const grounded = await groundCompany(deps, lang, names, ad, chat);
  const sources: Source[] = grounded?.sources ?? [];
  if (grounded) {
    const label = (f: Flag) => (f.family in GROUND_LABEL ? GROUND_LABEL[f.family as keyof typeof GROUND_LABEL][lang] : f.label);
    flags.push(...grounded.flags.map((f) => ({ ...f, label: label(f), evidence: guardJobText(f.evidence, lang).text })));
  }

  const scored = scoreJob(flags);
  const attention = attentionFor(scored.verdict);
  const unclear = stillUnclear(ad, chat, lang);

  let certaintyHits = 0;
  const guard = (t: string) => {
    const r = guardJobText(t, lang);
    certaintyHits += r.hits;
    return r.text;
  };
  const headline = guard(headlineFor(attention, lang));
  const response: JobAssessResponse = {
    id: req.jobId ?? `job_${randomUUID().replaceAll('-', '').slice(0, 16)}`,
    createdAt: new Date().toISOString(),
    kind: 'job',
    verdict: scored.verdict,
    score: scored.score,
    title: headline,
    summary: guard(TIER_SUMMARY[attention][lang]),
    spokenWarning: guard(TIER_SPOKEN[attention][lang]),
    scamType: scored.flags.length > 0 ? 'job_trafficking' : 'none',
    flags: scored.flags.map((f) => ({ ...f, label: guard(f.label) })),
    linkChecks: [],
    sources,
    actions: buildActions(scored.verdict, 'job_trafficking', lang, req.context?.destination, req.context?.home),
    model: 'job-shield-v2',
    attention,
    attentionHeadline: headline,
    conflicts: conflicts.map((c) => ({ ...c, fieldLabel: guard(c.fieldLabel), description: guard(c.description) })),
    stillUnclear: unclear.text.map(guard),
    stillUnclearFields: unclear.fields,
    findings: findingsFor(names, grounded, lang).map((f) => ({ ...f, label: guard(f.label) })),
    usedStoredExtraction: Boolean(stored),
    adFacts: ad,
    chatFacts: chat,
  };
  log('INFO', 'job_assess_scored', {
    attention,
    score: scored.score,
    conflicts: conflicts.length,
    flags: response.flags.length,
    overrides: scored.overrides,
    stored: Boolean(stored),
    grounded: grounded !== undefined,
    certaintyHits,
  });
  return response;
}
