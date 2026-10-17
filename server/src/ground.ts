import type { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { type Config, thinkingOf } from './config.js';
import { redactDeterministic } from './intel/redact.js';
import { log } from './log.js';
import type { CheckRequest, Extraction, Flag, Lang, Source } from './types.js';

export interface GroundResult {
  flags: Flag[];
  sources: Source[];
  /** Set only with `companyCheck`: whether search found a company or agency with the name. */
  companyFound?: boolean;
}

export interface GroundOptions {
  /** Also ask whether a company with this name exists (Job Shield). */
  companyCheck?: boolean;
}

export interface Grounder {
  ground(
    req: Pick<CheckRequest, 'language'>,
    extraction: Pick<Extraction, 'entities'>,
    timeoutMs: number,
    opts?: GroundOptions,
  ): Promise<GroundResult>;
}

const LANG_NAMES: Record<Lang, string> = { en: 'English', id: 'Bahasa Indonesia', tl: 'Tagalog', my: 'Burmese', th: 'Thai' };
const MAX_SOURCES = 6;

/** Hedged finding sentences in each report language: a missing licence, and online reports about similar messages. */
export const GROUND_EXAMPLES: Record<Lang, { licence: string; reports: string }> = {
  en: { licence: 'We could not find a licence record for X.', reports: 'Reports online describe similar messages as scams.' },
  id: { licence: 'Kami tidak menemukan catatan izin untuk X.', reports: 'Ada laporan online bahwa pesan serupa dipakai untuk menipu.' },
  tl: {
    licence: 'Wala kaming nahanap na rekord ng lisensya para sa X.',
    reports: 'May mga ulat online na ginagamit ang mga katulad na mensahe sa panloloko.',
  },
  my: {
    licence: 'X အတွက် လိုင်စင်မှတ်တမ်း ရှာမတွေ့ပါ။',
    reports: 'အလားတူ မက်ဆေ့ချ်များကို လိမ်လည်ရန် အသုံးပြုကြောင်း အွန်လိုင်းတွင် တိုင်ကြားချက်များ ရှိသည်။',
  },
  th: { licence: 'เราไม่พบข้อมูลใบอนุญาตของ X', reports: 'มีรายงานออนไลน์ว่าข้อความคล้ายกันถูกใช้หลอกลวง' },
};

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

export function buildGroundingRequest(x: Pick<Extraction, 'entities'>, lang: Lang, opts: GroundOptions = {}): GroundingRequest {
  const q = groundingQuery(x);
  const where = q.country ? ` in ${q.country}` : '';
  const names = [...q.companies, ...q.domains];
  const question =
    names.length === 1
      ? `Is ${names[0]}${where} a licensed, legitimate business? Are there scam reports about it?`
      : `Are ${names.join(', ')}${where} licensed, legitimate businesses? Are there scam reports about any of them?`;
  const ex = GROUND_EXAMPLES[lang];
  const system = [
    'You check companies, agencies and websites named in a message that a user wants checked for scams. Search Google before you answer.',
    `First search, then write a short answer, and end it with a JSON object: {"findings":[{"family":"known_bad|identity","label":"...","evidence":"..."}]}`,
    '- known_bad: you found scam or blacklist reports that name this exact company or website as the scammer. Reports that scammers impersonate a well-known brand (a courier, bank or marketplace) are NOT evidence against a message from that brand: do not report them.',
    '- General advisories that scammers use a brand name (Tokopedia, Shopee, DHL, a bank) say nothing about the message you are checking. Never report them in any family. A well-known brand with a normal, specific listing or notice needs no finding.',
    '- identity: the entity cannot be found, has no licence, or the claimed identity does not match.',
    '- Add a finding only when search results support it. If everything checks out, return {"findings":[]}.',
    '- Use likelihood language. Never write "X is unlicensed", "X is a scammer" or "X is a scam". Never call a named company or website a criminal. Never use "definitely", "confirmed" or "100%".',
    `- Good wording in ${LANG_NAMES[lang]}: "${ex.licence}" or "${ex.reports}"`,
    ...(lang === 'th' ? ['- In Thai never write "เป็นการหลอกลวง", "เป็นมิจฉาชีพ", "แน่นอน", "ชัวร์" or "ยืนยันแล้ว".'] : []),
    `- Write label and evidence in ${LANG_NAMES[lang]} only, whatever the language of the search results. Evidence is your own note about the source, not a quote: one short ${LANG_NAMES[lang]} sentence naming the source. Only names of organisations, websites and places may stay as written.`,
    ...(opts.companyCheck
      ? [
          '- Also add "companyFound" to the JSON object: true only if the search results show a real company or agency with this exact name (in the stated country, if one is given), otherwise false. A company existing says nothing about whether a recruiter works for it.',
        ]
      : []),
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

const companyFoundSchema = z.object({ companyFound: z.boolean() });

/** The `companyFound` answer, or undefined when the reply has none. */
export function parseCompanyFound(text: string | undefined): boolean | undefined {
  const start = text?.indexOf('{') ?? -1;
  const end = text?.lastIndexOf('}') ?? -1;
  if (!text || start < 0 || end <= start) return undefined;
  try {
    const r = companyFoundSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return r.success ? r.data.companyFound : undefined;
  } catch {
    return undefined;
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

const REDIRECT_HOST = /(^|\.)(vertexaisearch\.cloud\.google\.com|google\.[a-z.]+)$/;

/** Host of a source URL, or of its redirect target; undefined for a bare Google redirect. */
export function sourceHost(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (!REDIRECT_HOST.test(u.hostname)) return u.hostname;
    const target = u.searchParams.get('q') ?? u.searchParams.get('url');
    return target && /^https?:\/\//i.test(target) ? new URL(target).hostname : undefined;
  } catch {
    return undefined;
  }
}

export function extractSources(res: GroundedResponse): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const c of res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) {
    const url = c.web?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const title = c.web?.title?.trim() || sourceHost(url);
    if (!title) continue;
    out.push({ title, url });
    if (out.length >= MAX_SOURCES) break;
  }
  return out;
}

export function createGrounder(cfg: Config, client: Pick<GoogleGenAI, 'models'>): Grounder {
  return {
    async ground(req, extraction, timeoutMs, opts = {}) {
      if (!cfg.grounding || !needsGrounding(extraction) || timeoutMs < 1000) return { flags: [], sources: [] };
      const request = buildGroundingRequest(extraction, req.language, opts);
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
        const sources = extractSources(res as GroundedResponse);
        if (!opts.companyCheck) return { flags, sources };
        const companyFound = parseCompanyFound(res.text);
        return companyFound === undefined ? { flags, sources } : { flags, sources, companyFound };
      } catch (err) {
        log('WARNING', 'grounding_failed', { error: (err as Error).message });
        return { flags: [], sources: [] };
      }
    },
  };
}
