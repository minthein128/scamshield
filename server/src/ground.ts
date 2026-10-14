import type { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { Config } from './config.js';
import { log } from './log.js';
import type { CheckRequest, Extraction, Flag, Lang, Source } from './types.js';

export interface GroundResult {
  flags: Flag[];
  sources: Source[];
}

export interface Grounder {
  ground(req: CheckRequest, extraction: Extraction, timeoutMs: number): Promise<GroundResult>;
}

const LANG_NAMES: Record<Lang, string> = { en: 'English', id: 'Bahasa Indonesia', tl: 'Tagalog', my: 'Burmese' };
const MAX_SOURCES = 6;

const findingsSchema = z.object({
  findings: z
    .array(
      z.object({
        family: z.enum(['known_bad', 'identity', 'too_good']),
        label: z.string(),
        evidence: z.string(),
        severity: z.enum(['low', 'medium']).catch('low'),
      }),
    )
    .default([]),
});

export function needsGrounding(x: Extraction): boolean {
  const e = x.entities;
  return e.companies.length + e.phones.length + e.domains.length > 0;
}

export function buildGroundingPrompt(x: Extraction, lang: Lang): string {
  const e = x.entities;
  const lines = ['Verify these claims from a message a user wants checked for scams. Use Google Search.'];
  if (e.companies.length) lines.push(`Companies or agencies: ${e.companies.join('; ')}`);
  if (e.phones.length) lines.push(`Phone numbers or chat ids: ${e.phones.join('; ')}`);
  if (e.domains.length) lines.push(`Domains: ${e.domains.join('; ')}`);
  if (e.role || e.country) lines.push(`Role and country: ${e.role ?? 'unknown'} in ${e.country ?? 'unknown'}`);
  if (e.salaryClaim) lines.push(`Salary claim: ${e.salaryClaim}`);
  lines.push(
    '',
    'Answer these questions:',
    '1. Does each named company or recruitment agency exist, and does it hold a licence from the labour authority of the relevant country?',
    '2. Are there scam reports about each phone number, domain or company?',
    '3. Is the salary plausible for the role and country?',
    '',
    `Reply with ONLY a JSON object: {"findings":[{"family":"known_bad|identity|too_good","label":"...","evidence":"..."}]}`,
    '- known_bad: you found scam or blacklist reports about the entity.',
    '- identity: the entity cannot be found, has no licence, or the claimed identity does not match.',
    '- too_good: the salary is far above the market for that role and country.',
    '- Add a finding only when search results support it. If everything checks out, return {"findings":[]}.',
    `- Write label in ${LANG_NAMES[lang]}. Keep evidence to one short sentence naming the source.`,
  );
  return lines.join('\n');
}

export function parseFindings(text: string | undefined): Flag[] {
  const start = text?.indexOf('{') ?? -1;
  const end = text?.lastIndexOf('}') ?? -1;
  if (!text || start < 0 || end <= start) return [];
  try {
    const r = findingsSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return r.success ? r.data.findings : [];
  } catch {
    return [];
  }
}

interface GroundedResponse {
  text?: string;
  candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { title?: string; uri?: string } }> } }>;
}

export function extractSources(res: GroundedResponse): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const c of res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) {
    const url = c.web?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: c.web?.title || new URL(url).hostname, url });
    if (out.length >= MAX_SOURCES) break;
  }
  return out;
}

export function createGrounder(cfg: Config, client: Pick<GoogleGenAI, 'models'>): Grounder {
  return {
    async ground(req, extraction, timeoutMs) {
      if (!cfg.grounding || !needsGrounding(extraction) || timeoutMs < 1000) return { flags: [], sources: [] };
      try {
        const res = await client.models.generateContent({
          model: cfg.model,
          contents: [{ role: 'user', parts: [{ text: buildGroundingPrompt(extraction, req.language) }] }],
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.1,
            maxOutputTokens: 1024,
            abortSignal: AbortSignal.timeout(timeoutMs),
          },
        });
        return { flags: parseFindings(res.text), sources: extractSources(res as GroundedResponse) };
      } catch (err) {
        log('WARNING', 'grounding_failed', { error: (err as Error).message });
        return { flags: [], sources: [] };
      }
    },
  };
}
