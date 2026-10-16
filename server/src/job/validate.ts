import { z } from 'zod';
import { ApiError, LANGS } from '../types.js';
import type { JobAssessRequest, JobExtractRequest } from './types.js';

const MAX_IMAGE_B64 = 5_600_000;
const MAX_TEXT = 20_000;

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
    context: z
      .object({
        destination: z.string().max(100).optional(),
        route: z.string().max(300).optional(),
        home: z.string().max(100).optional(),
      })
      .optional(),
  })
  .refine((v) => Boolean(v.ad || v.chat), {
    message: 'at least one of ad or chat is required',
  });

export function parseJobExtractRequest(body: unknown): JobExtractRequest {
  const r = extractSchema.safeParse(body);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    throw new ApiError(400, 'bad_request', msg);
  }
  const v = r.data;
  if (v.ad?.imageBase64 && v.ad.imageBase64.length > MAX_IMAGE_B64) {
    throw new ApiError(413, 'too_large', 'ad imageBase64 exceeds the 4 MB limit');
  }
  if (v.chat?.imageBase64 && v.chat.imageBase64.length > MAX_IMAGE_B64) {
    throw new ApiError(413, 'too_large', 'chat imageBase64 exceeds the 4 MB limit');
  }
  return v as JobExtractRequest;
}

const assessSchema = z.object({
  jobId: z.string().optional(),
  facts: z.object({
    ad: z.any().optional().nullable(),
    chat: z.any().optional().nullable(),
  }),
  language: z.enum(LANGS).default('en'),
  context: z
    .object({
      destination: z.string().max(100).optional(),
      route: z.string().max(300).optional(),
      home: z.string().max(100).optional(),
    })
    .optional(),
});

export function parseJobAssessRequest(body: unknown): JobAssessRequest {
  const r = assessSchema.safeParse(body);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    throw new ApiError(400, 'bad_request', msg);
  }
  return r.data as JobAssessRequest;
}
