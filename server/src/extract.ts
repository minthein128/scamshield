import { GoogleGenAI, type Schema, Type } from '@google/genai';
import { z } from 'zod';
import { type Config, SAMPLING, thinkingOf } from './config.js';
import { buildUserParts, SYSTEM_PROMPT } from './prompt.js';
import { ApiError, type CheckRequest, type Entities, type Extraction, FAMILIES, SCAM_TYPES, SEVERITIES } from './types.js';
import { findUrls, mergeUrls } from './urls.js';

export const responseSchema: Schema = {
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
    template: { type: Type.STRING },
    templateSafe: { type: Type.BOOLEAN },
    campaign: { type: Type.STRING },
    inputLanguage: { type: Type.STRING },
    sender: {
      type: Type.OBJECT,
      properties: {
        phones: { type: Type.ARRAY, items: { type: Type.STRING } },
        handles: { type: Type.ARRAY, items: { type: Type.STRING } },
        accounts: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['phones', 'handles', 'accounts'],
    },
    entities: {
      type: Type.OBJECT,
      properties: {
        companies: { type: Type.ARRAY, items: { type: Type.STRING } },
        phones: { type: Type.ARRAY, items: { type: Type.STRING } },
        domains: { type: Type.ARRAY, items: { type: Type.STRING } },
        role: { type: Type.STRING, nullable: true },
        country: { type: Type.STRING, nullable: true },
        salaryClaim: { type: Type.STRING, nullable: true },
      },
      required: ['companies', 'phones', 'domains'],
    },
  },
  required: ['flags', 'scamType', 'verdictDraft', 'unsolicited', 'summary', 'spokenWarning', 'urls', 'entities'],
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
  template: z.string().nullish(),
  templateSafe: z.boolean().nullish(),
  campaign: z.string().nullish(),
  inputLanguage: z.string().nullish(),
  sender: z
    .object({
      phones: z.array(z.string()).default([]),
      handles: z.array(z.string()).default([]),
      accounts: z.array(z.string()).default([]),
    })
    .nullish(),
  entities: z
    .object({
      companies: z.array(z.string()).default([]),
      phones: z.array(z.string()).default([]),
      domains: z.array(z.string()).default([]),
      role: z.string().nullish(),
      country: z.string().nullish(),
      salaryClaim: z.string().nullish(),
    })
    .default({ companies: [], phones: [], domains: [] }),
});

export interface Extractor {
  extract(req: CheckRequest, opts?: { hedgeRetry?: boolean }): Promise<Extraction>;
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
    async extract(req, opts) {
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
        { text: buildUserParts(req, opts?.hedgeRetry) },
      ];
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
            ...SAMPLING,
            ...thinkingOf(cfg),
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
  const { role, country, salaryClaim, ...named } = r.data.entities;
  const entities: Entities = { ...named };
  if (role) entities.role = role;
  if (country) entities.country = country;
  if (salaryClaim) entities.salaryClaim = salaryClaim;
  const { template, templateSafe, campaign, inputLanguage, sender, ...core } = r.data;
  const out: Extraction = { ...core, entities, urls };
  if (template) out.template = template;
  if (templateSafe !== null && templateSafe !== undefined) out.templateSafe = templateSafe;
  if (campaign) out.campaign = campaign;
  if (inputLanguage) out.inputLanguage = inputLanguage;
  if (sender) out.sender = sender;
  return out;
}
