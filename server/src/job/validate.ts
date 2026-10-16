import { z } from 'zod';
import { ApiError, LANGS } from '../types.js';
import { parseAmount } from './parse.js';
import {
  CONTACT_CODES,
  CONTRACT_CODES,
  DOCUMENT_CODES,
  FACT_KEYS,
  type FactKey,
  type JobAssessRequest,
  type JobExtractRequest,
  type JobFacts,
  MEETING_CODES,
  PAYMENT_CODES,
  type PartialFacts,
  PERIOD_CODES,
  VISA_CODES,
} from './types.js';

const MAX_IMAGE_B64 = 5_600_000;
const MAX_TEXT = 20_000;

const contextSchema = z
  .object({
    destination: z.string().max(100).optional(),
    route: z.string().max(300).optional(),
    home: z.string().max(100).optional(),
  })
  .optional();

const sourceSchema = z
  .object({
    text: z.string().max(MAX_TEXT).optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
  })
  .refine((v) => Boolean(v.text?.trim() || v.imageBase64), {
    message: 'source must provide text or imageBase64',
  });

const extractSchema = z
  .object({
    ad: sourceSchema.optional(),
    chat: sourceSchema.optional(),
    language: z.enum(LANGS).default('en'),
    context: contextSchema,
  })
  .refine((v) => Boolean(v.ad || v.chat), {
    message: 'at least one of ad or chat is required',
  });

const issues = (e: z.ZodError) => e.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');

export function parseJobExtractRequest(body: unknown): JobExtractRequest {
  const r = extractSchema.safeParse(body);
  if (!r.success) throw new ApiError(400, 'bad_request', issues(r.error));
  const v = r.data;
  if (v.ad?.imageBase64 && v.ad.imageBase64.length > MAX_IMAGE_B64) {
    throw new ApiError(413, 'too_large', 'ad imageBase64 exceeds the 4 MB limit');
  }
  if (v.chat?.imageBase64 && v.chat.imageBase64.length > MAX_IMAGE_B64) {
    throw new ApiError(413, 'too_large', 'chat imageBase64 exceeds the 4 MB limit');
  }
  return v;
}

const text = z.string().max(500);
const salaryValue = z.object({
  amount: z
    .union([z.number(), z.string().max(60)])
    .nullable()
    .transform((a) => parseAmount(a)),
  currency: z.string().max(20).default(''),
  period: z.enum(PERIOD_CODES).default('unknown'),
});

function fact<T extends z.ZodType>(value: T) {
  return z.object({
    value,
    quote: z.string().max(2000).default(''),
    confidence: z.number().min(0).max(1).default(1),
    refused: z.boolean().optional(),
    edited: z.boolean().optional(),
  });
}

/** One zod shape per fact key. Enum keys accept only the documented codes. */
export const FACT_SCHEMAS: Record<FactKey, z.ZodType> = {
  employer: fact(text),
  jobTitle: fact(text),
  workplace: fact(text),
  destinationCountry: fact(text),
  salary: fact(salaryValue),
  workerFee: fact(text),
  contract: fact(z.enum(CONTRACT_CODES)),
  visaOrPermit: fact(z.enum(VISA_CODES)),
  travelArrangedBy: fact(text),
  route: fact(text),
  meetingPoint: fact(z.enum(MEETING_CODES)),
  documentRequest: fact(z.enum(DOCUMENT_CODES)),
  paymentRequest: fact(z.enum(PAYMENT_CODES)),
  urgency: fact(text),
  contactChannel: fact(z.enum(CONTACT_CODES)),
  secrecyRequest: fact(z.boolean()),
};

const factsSchema = z
  .object(Object.fromEntries(FACT_KEYS.map((k) => [k, FACT_SCHEMAS[k].nullable().optional()])) as unknown as Record<FactKey, z.ZodType>)
  .nullable()
  .optional();

const assessSchema = z
  .object({
    jobId: z.string().max(64).optional(),
    facts: z.object({ ad: factsSchema, chat: factsSchema }).optional(),
    language: z.enum(LANGS).default('en'),
    context: contextSchema,
  })
  .refine((v) => Boolean(v.jobId || v.facts), { message: 'facts or jobId is required' });

export function parseJobAssessRequest(body: unknown): JobAssessRequest {
  const r = assessSchema.safeParse(body);
  if (!r.success) throw new ApiError(400, 'bad_request', issues(r.error));
  const v = r.data;
  const facts = v.facts as { ad?: PartialFacts | null; chat?: PartialFacts | null } | undefined;
  return {
    language: v.language,
    ...(v.jobId ? { jobId: v.jobId } : {}),
    ...(facts ? { facts } : {}),
    ...(v.context ? { context: v.context } : {}),
  };
}

/** not_mentioned is the user's "not mentioned": it means the same as null. */
export function completeFacts(p: PartialFacts | null | undefined): JobFacts | null {
  if (!p) return null;
  const out = Object.fromEntries(FACT_KEYS.map((k) => [k, p[k] ?? null])) as unknown as JobFacts;
  for (const k of FACT_KEYS) {
    const f = out[k] as { value: unknown } | null;
    if (f && f.value === 'not_mentioned') (out as unknown as Record<FactKey, unknown>)[k] = null;
  }
  return out;
}
