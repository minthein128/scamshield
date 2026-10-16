import { Hono } from 'hono';
import { z } from 'zod';
import { COUNTRIES } from '../data/hotlines.generated.js';
import { log } from '../log.js';
import { createRateLimiter } from '../ratelimit.js';
import { ApiError } from '../types.js';
import type { AiAssist } from './ai.js';
import { adminOf } from './auth.js';
import { CATEGORIES, CONTENT_LANGS } from './schema.js';

const country = z.enum(COUNTRIES.map((c) => c.code) as [string, ...string[]]);
const lang = z.enum(CONTENT_LANGS);

const findBody = z.object({ country, category: z.enum(CATEGORIES), query: z.string().trim().max(200).optional() });
const verifyBody = z.object({
  item: z.object({
    name: z.string().min(2).max(200),
    country,
    category: z.enum(CATEGORIES),
    number: z.string().max(40).optional(),
    dial: z.string().max(20).optional(),
    sourceUrl: z.string().max(500).optional(),
  }),
});
const draftBody = z.object({ key: z.string().min(2).max(120), instruction: z.string().trim().min(3).max(600), language: lang });
const translateBody = z.object({ text: z.string().trim().min(1).max(2000), from: lang, to: z.array(lang).min(1).max(4) });

async function parse<T>(c: { req: { json(): Promise<unknown> } }, schema: z.ZodType<T>): Promise<T> {
  const body = await c.req.json().catch(() => {
    throw new ApiError(400, 'bad_request', 'Body must be valid JSON');
  });
  const r = schema.safeParse(body);
  if (!r.success)
    throw new ApiError(400, 'bad_request', r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
  return r.data;
}

/** AI assist routes. They return candidates only and hold no store handle, so they cannot write config. */
export function createAiRoutes(ai: AiAssist, perHour: number, limiter = createRateLimiter(0, 3_600_000)) {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const { uid } = adminOf(c);
    const decision = limiter.check(uid, perHour);
    if (!decision.allowed) {
      log('WARNING', 'admin_ai_rate_limited', { uid });
      return c.json({ error: { code: 'rate_limited', message: `Limit of ${perHour} AI calls per hour reached` } }, 429, {
        'retry-after': String(decision.retryAfterSec),
      });
    }
    await next();
  });

  const run = async <T>(c: Parameters<typeof adminOf>[0], action: string, work: () => Promise<T>) => {
    const started = Date.now();
    const out = await work();
    log('INFO', 'admin_ai', { uid: adminOf(c).uid, action, model: ai.model, latencyMs: Date.now() - started });
    return out;
  };

  app.post('/find-hotline', async (c) => {
    const body = await parse(c, findBody);
    return c.json(await run(c, 'find-hotline', () => ai.findHotline(body)));
  });
  app.post('/verify-hotline', async (c) => {
    const { item } = await parse(c, verifyBody);
    return c.json(await run(c, 'verify-hotline', () => ai.verifyHotline(item)));
  });
  app.post('/draft-content', async (c) => {
    const body = await parse(c, draftBody);
    return c.json(await run(c, 'draft-content', () => ai.draftContent(body)));
  });
  app.post('/translate', async (c) => {
    const body = await parse(c, translateBody);
    return c.json(await run(c, 'translate', () => ai.translate({ ...body, to: [...new Set(body.to)].filter((l) => l !== body.from) })));
  });
  return app;
}
