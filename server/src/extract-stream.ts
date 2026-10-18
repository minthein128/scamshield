import type { GoogleGenAI } from '@google/genai';
import { type Config, SAMPLING, thinkingOf } from './config.js';
import { createGeminiExtractor, type Extractor, parseExtraction, responseSchema } from './extract.js';
import { buildUserParts, SYSTEM_PROMPT } from './prompt.js';
import { ApiError, type CheckRequest, type Entities, type Extraction } from './types.js';

export interface StreamOpts {
  hedgeRetry?: boolean;
  /** Called once, as soon as the entities object is complete in the stream. */
  onEntities?: (e: Entities) => void;
}

/** Entities and sender come first so grounding can start before the rest of the answer is written. */
const ORDERING = [
  'entities',
  'sender',
  'flags',
  'scamType',
  'verdictDraft',
  'unsolicited',
  'summary',
  'spokenWarning',
  'urls',
  'template',
  'templateSafe',
  'campaign',
  'inputLanguage',
];

/** Returns the first complete top-level object value of `key` in a partial JSON text. */
export function scanObject(text: string, key: string): string | undefined {
  const at = text.indexOf(`"${key}"`);
  if (at < 0) return undefined;
  const open = text.indexOf('{', at);
  if (open < 0) return undefined;
  let depth = 0;
  let inString = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return text.slice(open, i + 1);
  }
  return undefined;
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function parseEntities(json: string): Entities | undefined {
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    const e: Entities = { companies: strings(o.companies), phones: strings(o.phones), domains: strings(o.domains) };
    for (const k of ['role', 'country', 'salaryClaim'] as const) if (typeof o[k] === 'string' && o[k]) e[k] = o[k] as string;
    return e;
  } catch {
    return undefined;
  }
}

export function createStreamingExtractor(cfg: Config, client: Pick<GoogleGenAI, 'models'>): Extractor {
  const schema = { ...responseSchema, propertyOrdering: ORDERING };
  return {
    async extract(req: CheckRequest, opts?: StreamOpts): Promise<Extraction> {
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
        { text: buildUserParts(req, opts?.hedgeRetry) },
      ];
      if (req.imageBase64) parts.push({ inlineData: { data: req.imageBase64, mimeType: req.imageMimeType ?? 'image/jpeg' } });
      let text = '';
      let sent = false;
      try {
        const stream = await client.models.generateContentStream({
          model: cfg.model,
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: schema,
            ...SAMPLING,
            ...thinkingOf(cfg),
            maxOutputTokens: 2048,
            abortSignal: AbortSignal.timeout(cfg.upstreamTimeoutMs),
          },
        });
        for await (const chunk of stream) {
          text += chunk.text ?? '';
          if (!sent && opts?.onEntities) {
            const raw = scanObject(text, 'entities');
            const entities = raw ? parseEntities(raw) : undefined;
            if (entities) {
              sent = true;
              opts.onEntities(entities);
            }
          }
        }
      } catch (err) {
        throw new ApiError(502, 'upstream', `Model call failed: ${(err as Error).message}`);
      }
      return parseExtraction(text, req);
    },
  };
}

export function createExtractor(cfg: Config, client: Pick<GoogleGenAI, 'models'>): Extractor {
  return cfg.streamExtract ? createStreamingExtractor(cfg, client) : createGeminiExtractor(cfg, client);
}
