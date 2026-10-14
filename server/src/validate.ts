import { z } from 'zod';
import { ApiError, type CheckRequest, KINDS, LANGS, type Lang } from './types.js';

const MAX_IMAGE_B64 = 5_600_000;
const MAX_TEXT = 20_000;

const schema = z
  .object({
    kind: z.enum(KINDS),
    text: z.string().max(MAX_TEXT).optional(),
    url: z.string().max(2048).optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
    context: z
      .object({ destination: z.string().max(100).optional(), route: z.string().max(300).optional(), home: z.string().max(100).optional() })
      .optional(),
    shareSignals: z.boolean().optional(),
    language: z.enum(LANGS).default('en'),
  })
  .refine((v) => Boolean(v.text?.trim() || v.url?.trim() || v.imageBase64), {
    message: 'at least one of text, url, imageBase64 is required',
  });

export function parseRequest(body: unknown): CheckRequest {
  const r = schema.safeParse(body);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    if (r.error.issues.some((i) => i.code === 'too_big' && i.path[0] === 'text')) throw new ApiError(413, 'too_large', msg);
    throw new ApiError(400, 'bad_request', msg);
  }
  const v = r.data;
  if (v.imageBase64 && v.imageBase64.length > MAX_IMAGE_B64) {
    throw new ApiError(413, 'too_large', 'imageBase64 exceeds the 4 MB limit');
  }
  const out: CheckRequest = { kind: v.kind, language: v.language };
  if (v.text?.trim()) out.text = v.text;
  if (v.url?.trim()) out.url = v.url.trim();
  if (v.imageBase64) {
    out.imageBase64 = v.imageBase64.replace(/^data:[^,]+,/, '');
    out.imageMimeType = v.imageMimeType ?? 'image/jpeg';
  }
  if (v.context) out.context = v.context;
  if (v.shareSignals !== undefined) out.shareSignals = v.shareSignals;
  return out;
}

const speakSchema = z.object({ text: z.string().trim().min(1).max(600), language: z.enum(LANGS).default('en') });

export function parseSpeakRequest(body: unknown): { text: string; language: Lang } {
  const r = speakSchema.safeParse(body);
  if (!r.success) {
    throw new ApiError(400, 'bad_request', r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
  }
  return r.data;
}
