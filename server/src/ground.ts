import type { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { type Config, thinkingOf } from './config.js';
import { redactDeterministic } from './intel/redact.js';
import { log } from './log.js';
import type { CheckRequest, Extraction, Flag, Lang, Source } from './types.js';

export interface GroundResult {
  flags: Flag[];
  sources: Source[];
}

export interface Grounder {
  ground(req: CheckRequest, extraction: Extraction, timeoutMs: number): Promise<GroundResult>;
}

const LANG_NAMES: Record<Lang, string> = { en: 'English', id: 'Bahasa Indonesia', tl: 'Tagalog', my: 'Burmese', th: 'Thai' };
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

const MAX_NAMES = 5;
const MAX_NAME_CHARS = 80;

/** What may leave for Google Search: organisation names, public hosts and a country. Never people or numbers. */
export interface GroundingQuery {
  companies: string[];
  domains: string[];
  country?: string;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

function isOrgName(name: string, blocked: Set<string>): boolean {
  if (!name || name.length > MAX_NAME_CHARS || blocked.has(name.toLowerCase())) return false;
  if (/[@#]|\d{3,}|https?:/i.test(name)) return false;
  return redactDeterministic(name).spans.length === 0;
}

function hostOf(raw: string): string | null {
  const t = raw.trim();
  try {
    const host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`).hostname.toLowerCase().replace(/^www\./, '');
    return /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host) && !/^[\d.]+$/.test(host) ? host : null;
  } catch {
    return null;
  }
}

export function groundingQuery(x: Pick<Extraction, 'entities'>): GroundingQuery {
  const e = x.entities;
  const blocked = new Set(e.phones.map((p) => clean(p).toLowerCase()));
  const companies = [...new Set(e.companies.map(clean))].filter((c) => isOrgName(c, blocked)).slice(0, MAX_NAMES);
  const domains = [...new Set(e.domains.map(hostOf).filter((d): d is string => d !== null))].slice(0, MAX_NAMES);
  const country = e.country && isOrgName(clean(e.country), blocked) ? clean(e.country) : undefined;
  return { companies, domains, ...(country ? { country } : {}) };
}

export function needsGrounding(x: Pick<Extraction, 'entities'>): boolean {
  const q = groundingQuery(x);
  return q.companies.length + q.domains.length > 0;
}

export interface GroundingRequest {
  /** Format and wording rules. A JSON-only reply rule, or rules in the user turn, make the model skip the search. */
  system: string;
  /** A plain question that names only organisations, website hosts and the country. */
  question: string;
}

export function buildGroundingRequest(x: Pick<Extraction, 'entities'>, lang: Lang): GroundingRequest {
  const q = groundingQuery(x);
  const where = q.country ? ` in ${q.country}` : '';
  const names = [...q.companies, ...q.domains];
  const question =
    names.length === 1
      ? `Is ${names[0]}${where} a licensed, legitimate business? Are there scam reports about it?`
      : `Are ${names.join(', ')}${where} licensed, legitimate businesses? Are there scam reports about any of them?`;
  const system = [
    'You check companies, agencies and websites named in a message that a user wants checked for scams. Search Google before you answer.',
    `First search, then write a short answer, and end it with a JSON object: {"findings":[{"family":"known_bad|identity","label":"...","evidence":"..."}]}`,
    '- known_bad: you found scam or blacklist reports that name this exact company or website as the scammer. Reports that scammers impersonate a well-known brand (a courier, bank or marketplace) are NOT evidence against a message from that brand: do not report them.',
    '- General advisories that scammers use a brand name (Tokopedia, Shopee, DHL, a bank) say nothing about the message you are checking. Never report them in any family. A well-known brand with a normal, specific listing or notice needs no finding.',
    '- identity: the entity cannot be found, has no licence, or the claimed identity does not match.',
    '- Add a finding only when search results support it. If everything checks out, return {"findings":[]}.',
    '- Use likelihood language. Say "We could not find a licence record for X", never "X is unlicensed" or "X is a scammer". Say "Reports online describe similar messages as scams", never "X is a scam". Never call a named company or website a criminal. Never use "definitely", "confirmed" or "100%". In Thai, write "เราไม่พบข้อมูลใบอนุญาตของ X" or "มีรายงานออนไลน์ว่าข้อความคล้ายกันถูกใช้หลอกลวง", never "เป็นการหลอกลวง", "เป็นมิจฉาชีพ", "แน่นอน", "ชัวร์" or "ยืนยันแล้ว".',
    `- Write label in ${LANG_NAMES[lang]}. Keep evidence to one short sentence naming the source.`,
  ].join('\n');
  return { system, question };
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
  candidates?: Array<{
    groundingMetadata?: { groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>; webSearchQueries?: string[] };
  }>;
}

/** True when the model actually ran a search. Without one, findings come from memory. */
export function searched(res: GroundedResponse): boolean {
  const g = res.candidates?.[0]?.groundingMetadata;
  return (g?.groundingChunks?.length ?? 0) > 0 || (g?.webSearchQueries?.length ?? 0) > 0;
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
      const request = buildGroundingRequest(extraction, req.language);
      try {
        const res = await client.models.generateContent({
          model: cfg.model,
          contents: [{ role: 'user', parts: [{ text: request.question }] }],
          config: {
            systemInstruction: request.system,
            tools: [{ googleSearch: {} }],
            temperature: 0.1,
            ...thinkingOf(cfg),
            maxOutputTokens: 1024,
            abortSignal: AbortSignal.timeout(timeoutMs),
          },
        });
        const flags = parseFindings(res.text);
        if (!searched(res as GroundedResponse)) {
          log('INFO', 'grounding_unsearched', { dropped: flags.length });
          return { flags: [], sources: [] };
        }
        return { flags, sources: extractSources(res as GroundedResponse) };
      } catch (err) {
        log('WARNING', 'grounding_failed', { error: (err as Error).message });
        return { flags: [], sources: [] };
      }
    },
  };
}
