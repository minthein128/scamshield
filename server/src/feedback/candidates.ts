import { createHash } from 'node:crypto';
import { finalizeTemplate } from '../intel/template.js';
import { type Kind, LANGS, type Lang } from '../types.js';
import type { FeedbackDoc } from './types.js';

export interface Candidate {
  id: string;
  lang: Lang;
  kind: Kind;
  expect: 'safe' | 'risky';
  text: string;
  source: 'feedback';
  scamType?: string;
}

/**
 * Labelled eval cases from feedback. Only verdict flips qualify: a false alarm expects safe,
 * a missed scam expects risky. The text is the stored redacted template, passed through the
 * template filter again, so a doc that fails it is dropped rather than exported.
 */
export function buildCandidates(docs: FeedbackDoc[]): Candidate[] {
  const out = new Map<string, Candidate>();
  for (const d of docs) {
    if (d.outcome !== 'false_alarm' && d.outcome !== 'missed_scam') continue;
    const text = finalizeTemplate(d.template, true);
    if (!text) continue;
    const expect = d.outcome === 'false_alarm' ? 'safe' : 'risky';
    const id = `fb-${createHash('sha256').update(`${expect}|${text}`).digest('hex').slice(0, 10)}`;
    const lang = (LANGS as readonly string[]).includes(d.language) ? (d.language as Lang) : 'en';
    out.set(id, { id, lang, kind: d.kind, expect, text, source: 'feedback', ...(d.actualScamType ? { scamType: d.actualScamType } : {}) });
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Existing candidates win on id so a hand-edited label survives a re-export. */
export const mergeCandidates = (existing: Candidate[], fresh: Candidate[]): Candidate[] => {
  const byId = new Map(fresh.map((c) => [c.id, c]));
  for (const c of existing) byId.set(c.id, c);
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
};
