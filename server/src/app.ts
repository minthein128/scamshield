import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import type { Config } from './config.js';
import { log } from './log.js';
import type { Pipeline } from './pipeline.js';
import { createRateLimiter } from './ratelimit.js';
import type { Speaker } from './speak.js';
import { ApiError } from './types.js';
import { parseRequest, parseSpeakRequest } from './validate.js';

const clientIp = (forwarded?: string, real?: string) => forwarded?.split(',')[0]?.trim() || real || 'local';

const errorBody = (code: string, message: string) => ({ error: { code, message } });

export function createApp(cfg: Config, pipeline: Pipeline, speaker: Speaker) {
  const app = new Hono();
  const limiter = createRateLimiter(cfg.rateLimitPerMin);

  app.use('*', cors({ origin: cfg.allowedOrigins.includes('*') ? '*' : cfg.allowedOrigins }));

  app.get('/healthz', (c) => c.json({ ok: true, model: cfg.model, mock: cfg.mock }));

  app.post(
    '/v1/check',
    async (c, next) => {
      if (!limiter.allow(clientIp(c.req.header('x-forwarded-for'), c.req.header('x-real-ip')))) {
        return c.json(errorBody('rate_limited', 'Too many requests, retry in a minute'), 429, { 'retry-after': '60' });
      }
      await next();
    },
    bodyLimit({
      maxSize: cfg.maxBodyBytes,
      onError: (c) => c.json(errorBody('too_large', `Body exceeds ${cfg.maxBodyBytes} bytes`), 413),
    }),
    async (c) => {
      const started = Date.now();
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        throw new ApiError(400, 'bad_request', 'Body must be valid JSON');
      }
      const req = parseRequest(body);
      const res = await pipeline.run(req);
      log('INFO', 'check_done', {
        id: res.id,
        kind: res.kind,
        verdict: res.verdict,
        score: res.score,
        language: req.language,
        flagCount: res.flags.length,
        linkCount: res.linkChecks.length,
        sourceCount: res.sources.length,
        hasImage: Boolean(req.imageBase64),
        latencyMs: Date.now() - started,
      });
      return c.json(res);
    },
  );

  app.post(
    '/v1/speak',
    async (c, next) => {
      if (!limiter.allow(clientIp(c.req.header('x-forwarded-for'), c.req.header('x-real-ip')))) {
        return c.json(errorBody('rate_limited', 'Too many requests, retry in a minute'), 429, { 'retry-after': '60' });
      }
      await next();
    },
    bodyLimit({ maxSize: 8 * 1024, onError: (c) => c.json(errorBody('too_large', 'Body exceeds 8192 bytes'), 413) }),
    async (c) => {
      const started = Date.now();
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        throw new ApiError(400, 'bad_request', 'Body must be valid JSON');
      }
      const req = parseSpeakRequest(body);
      const out = await speaker.speak(req.text);
      log('INFO', 'speak_done', { language: req.language, chars: req.text.length, model: out.model, latencyMs: Date.now() - started });
      return c.json(out);
    },
  );

  app.notFound((c) => c.json(errorBody('bad_request', `No route for ${c.req.method} ${c.req.path}`), 404 as never));

  app.onError((err, c) => {
    if (err instanceof ApiError) {
      log(err.status >= 500 ? 'ERROR' : 'WARNING', 'api_error', { code: err.code, error: err.message });
      return c.json(errorBody(err.code, err.message), err.status);
    }
    log('ERROR', 'unhandled', { error: err.message });
    return c.json(errorBody('upstream', 'Internal error'), 502);
  });

  return app;
}
