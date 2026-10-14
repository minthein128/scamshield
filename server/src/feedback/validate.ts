import { z } from 'zod';
import { ApiError, SCAM_TYPES } from '../types.js';
import type { FeedbackInput } from './types.js';

const schema = z
  .object({
    checkId: z.string().regex(/^chk_[A-Za-z0-9_]{4,48}$/),
    correct: z.boolean(),
    actualVerdict: z.enum(['safe', 'careful', 'danger']).optional(),
    actualScamType: z.enum(SCAM_TYPES).optional(),
  })
  .strict();

export function parseFeedback(body: unknown): FeedbackInput {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new ApiError(400, 'bad_request', r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
  }
  const v = r.data;
  const out: FeedbackInput = { checkId: v.checkId, correct: v.correct };
  if (!v.correct) {
    if (v.actualVerdict) out.actualVerdict = v.actualVerdict;
    if (v.actualScamType) out.actualScamType = v.actualScamType;
  }
  return out;
}
