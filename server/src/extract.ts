import { GoogleGenAI, type Schema, Type } from '@google/genai';
import { z } from 'zod';
import type { Config } from './config.js';
import { buildUserParts, SYSTEM_PROMPT } from './prompt.js';
import { ApiError, type CheckRequest, type Extraction, FAMILIES, SCAM_TYPES, SEVERITIES } from './types.js';
import { findUrls, mergeUrls } from './urls.js';

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    flags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          family: { type: Type.STRING, enum: [...FAMILIES] },
          label: { type: Type.STRING },
          evidence: { type: Type.STRING },
          severity: { type: Type.STRING, enum: [...SEVERITIES] },
        },
        required: ['family', 'label', 'evidence', 'severity'],
        propertyOrdering: ['family', 'label', 'evidence', 'severity'],
      },
    },
    scamType: { type: Type.STRING, enum: [...SCAM_TYPES] },
    verdictDraft: { type: Type.STRING, enum: ['safe', 'careful', 'danger'] },
    unsolicited: { type: Type.BOOLEAN },
    summary: { type: Type.STRING },
    spokenWarning: { type: Type.STRING },
    urls: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['flags', 'scamType', 'verdictDraft', 'unsolicited', 'summary', 'spokenWarning', 'urls'],
  propertyOrdering: ['flags', 'scamType', 'verdictDraft', 'unsolicited', 'summary', 'spokenWarning', 'urls'],
};

const parsed = z.object({
  flags: z
    .array(
      z.object({
        family: z.enum(FAMILIES),
        label: z.string(),
        evidence: z.string(),
        severity: z.enum(SEVERITIES),
      }),
    )
    .default([]),
  scamType: z.enum(SCAM_TYPES).catch('other'),
  verdictDraft: z.enum(['safe', 'careful', 'danger']).catch('careful'),
  unsolicited: z.boolean().catch(false),
  summary: z.string().default(''),
  spokenWarning: z.string().default(''),
  urls: z.array(z.string()).default([]),
});

export interface Extractor {
  extract(req: CheckRequest): Promise<Extraction>;
}

export function createClient(cfg: Config): GoogleGenAI {
  if (cfg.useVertex) {
    return new GoogleGenAI({ vertexai: true, project: cfg.project, location: cfg.location });
  }
  return new GoogleGenAI({ apiKey: cfg.geminiApiKey });
}

type GenClient = Pick<GoogleGenAI, 'models'>;

export function createGeminiExtractor(cfg: Config, client: GenClient = createClient(cfg)): Extractor {
  return {
    async extract(req) {
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [{ text: buildUserParts(req) }];
      if (req.imageBase64) {
        parts.push({ inlineData: { data: req.imageBase64, mimeType: req.imageMimeType ?? 'image/jpeg' } });
      }
      let raw: string | undefined;
      try {
        const res = await client.models.generateContent({
          model: cfg.model,
          contents: [{ role: 'user', parts }],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2,
            maxOutputTokens: 2048,
            abortSignal: AbortSignal.timeout(cfg.upstreamTimeoutMs),
          },
        });
        raw = res.text;
      } catch (err) {
        throw new ApiError(502, 'upstream', `Model call failed: ${(err as Error).message}`);
      }
      return parseExtraction(raw, req);
    },
  };
}

export function parseExtraction(raw: string | undefined, req: CheckRequest): Extraction {
  let json: unknown;
  try {
    json = JSON.parse(raw ?? '');
  } catch {
    throw new ApiError(502, 'upstream', 'Model returned invalid JSON');
  }
  const r = parsed.safeParse(json);
  if (!r.success) throw new ApiError(502, 'upstream', 'Model output did not match the schema');
  const urls = mergeUrls(5, req.url ? [req.url] : [], r.data.urls, findUrls(req.text ?? ''));
  return { ...r.data, urls };
}
