import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { createConfigRoutes, type PublishedCache } from './admin/published.js';
import { type AdminDeps, createAdminRoutes } from './admin/routes.js';
import { bearerToken, type TokenVerifier } from './auth.js';
import type { Config } from './config.js';
import { downloadPage } from './download-page.js';
import type { Feedback } from './feedback/service.js';
import { parseFeedback } from './feedback/validate.js';
import { type Intel, isCountry } from './intel/service.js';
import { log } from './log.js';
import type { Pipeline } from './pipeline.js';
import { createRateLimiter } from './ratelimit.js';
import type { Speaker } from './speak.js';
import { Timings, timingStore } from './timing.js';
import { ApiError, type CheckResponse } from './types.js';
import { parseRequest, parseSpeakRequest } from './validate.js';

export const clientIp = (forwarded?: string, real?: string) => forwarded?.split(',')[0]?.trim() || real || 'local';

export interface Limits {
  ip: ReturnType<typeof createRateLimiter>;
  hourly: ReturnType<typeof createRateLimiter>;
}

/** The per-IP and per-uid limiters, shared by the HTTP routes and the live socket. */
export const createLimits = (cfg: Config): Limits => ({
  ip: createRateLimiter(cfg.rateLimitPerMin),
  hourly: createRateLimiter(0, 3_600_000),
});

const errorBody = (code: string, message: string) => ({ error: { code, message } });

export function createApp(
  cfg: Config,
  pipeline: Pipeline,
  speaker: Speaker,
  intel?: Intel,
  verifier?: TokenVerifier,
  feedback?: Feedback,
  limits: Limits = createLimits(cfg),
  admin?: AdminDeps,
  published?: PublishedCache,
) {
  const app = new Hono();
  const limiter = limits.ip;
  const hourly = limits.hourly;
  const feedbackIp = createRateLimiter(cfg.rateLimitPerMin);
  const feedbackHourly = createRateLimiter(0, 3_600_000);
  const apkHourly = createRateLimiter(0, 3_600_000);

  const anyOrigin = cfg.allowedOrigins.includes('*');
  const adminAllowed = new Set([...cfg.adminOrigins, ...cfg.allowedOrigins]);
  app.use(
    '*',
    cors({
      origin: (origin, c) => {
        if (c.req.path.startsWith('/v1/admin')) return anyOrigin || adminAllowed.has(origin) ? origin : null;
        return anyOrigin ? '*' : cfg.allowedOrigins.includes(origin) ? origin : null;
      },
    }),
  );

  app.get('/healthz', (c) => c.json({ ok: true, model: cfg.model, mock: cfg.mock }));

  app.get('/config.json', (c) => c.json({ apiUrl: cfg.publicApiUrl }, 200, { 'cache-control': 'no-cache' }));

  const apkFile = async () => {
    if (!cfg.apkPath) return null;
    try {
      const st = await stat(cfg.apkPath);
      return st.isFile() ? st : null;
    } catch {
      return null;
    }
  };

  const versionedName = cfg.apkVersion ? `saferoute-${encodeURIComponent(cfg.apkVersion)}.apk` : undefined;

  app.get('/download', async (c) => {
    const st = await apkFile();
    return c.html(
      downloadPage({ version: cfg.apkVersion, bytes: st?.size, href: versionedName ? `/download/${versionedName}` : undefined }),
      200,
      { 'cache-control': 'no-cache' },
    );
  });

  const serveApk = async (c: Context, immutable: boolean) => {
    const ip = clientIp(c.req.header('x-forwarded-for'), c.req.header('x-real-ip'));
    const decision = apkHourly.check(ip, cfg.apkPerHour);
    if (!decision.allowed) {
      return c.json(errorBody('rate_limited', 'Download limit reached, retry later'), 429, {
        'retry-after': String(decision.retryAfterSec),
      });
    }
    const st = await apkFile();
    if (!st || !cfg.apkPath) return c.json(errorBody('bad_request', 'APK not available'), 404 as never);
    const headers = {
      'content-type': 'application/vnd.android.package-archive',
      'content-disposition': 'attachment; filename="SafeRoute.apk"',
      'content-length': String(st.size),
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      etag: `"${Math.floor(st.mtimeMs).toString(16)}-${st.size.toString(16)}"`,
    };
    if (c.req.method === 'HEAD') return new Response(null, { status: 200, headers });
    const body = Readable.toWeb(createReadStream(cfg.apkPath)) as unknown as ReadableStream;
    return new Response(body, { status: 200, headers });
  };

  app.on(['GET', 'HEAD'], '/download/saferoute.apk', async (c) => {
    if (!versionedName || !(await apkFile())) return serveApk(c, false);
    c.header('cache-control', 'no-store');
    return c.redirect(`/download/${versionedName}`, 302);
  });

  app.on(['GET', 'HEAD'], '/download/:name', async (c) => {
    if (!versionedName || c.req.param('name') !== versionedName) {
      return c.json(errorBody('bad_request', 'APK not available'), 404 as never);
    }
    return await serveApk(c, true);
  });

  app.post(
    '/v1/check',
    async (c, next) => {
      if (!limiter.allow(clientIp(c.req.header('x-forwarded-for'), c.req.header('x-real-ip')))) {
        return c.json(errorBody('rate_limited', 'Too many requests, retry in a minute'), 429, { 'retry-after': '60' });
      }
      const token = bearerToken(c.req.header('authorization'));
      const identity = token && verifier ? await verifier(token) : null;
      if (identity) {
        c.set('uid' as never, identity.uid as never);
        const max = identity.anonymous ? cfg.anonPerHour : cfg.userPerHour;
        const decision = hourly.check(identity.uid, max);
        if (!decision.allowed) {
          log('WARNING', 'uid_rate_limited', { anonymous: identity.anonymous });
          return c.json(errorBody('rate_limited', 'Hourly check limit reached'), 429, { 'retry-after': String(decision.retryAfterSec) });
        }
      }
      await next();
    },
    bodyLimit({
      maxSize: cfg.maxBodyBytes,
      onError: (c) => c.json(errorBody('too_large', `Body exceeds ${cfg.maxBodyBytes} bytes`), 413),
    }),
    async (c) => {
      const started = Date.now();
      const tm = new Timings();
      let body: unknown;
      try {
        body = await tm.span('body', () => c.req.json());
      } catch {
        throw new ApiError(400, 'bad_request', 'Body must be valid JSON');
      }
      const req = await tm.span('validate', () => parseRequest(body));
      tm.meta.imageBytes = req.imageBase64 ? Math.floor((req.imageBase64.length * 3) / 4) : 0;
      tm.meta.textChars = req.text?.length ?? 0;
      const uid = c.get('uid' as never) as string | undefined;
      const full = uid ? { ...req, uid } : req;
      const debug = cfg.debugTimings || c.req.query('debug') === '1';
      const done = (res: CheckResponse) =>
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
          timings: tm.toJSON(),
        });

      if (c.req.query('stream') === '1') {
        return streamSSE(c, async (stream) => {
          let firstVerdictMs: number | undefined;
          let deferred: Promise<unknown> | undefined;
          try {
            const res = await timingStore.run(tm, () =>
              pipeline.run(full, {
                afterResponse: (p) => {
                  deferred = p;
                },
                onEvent: (e) => {
                  if (e.type === 'verdict' && firstVerdictMs === undefined) {
                    firstVerdictMs = Math.round(tm.now());
                    tm.meta.firstVerdictMs = firstVerdictMs;
                  }
                  void stream.writeSSE({
                    event: e.type,
                    data: JSON.stringify(e.type === 'stage' ? { stage: e.stage, status: e.status, ms: e.ms } : e.response),
                  });
                },
              }),
            );
            await stream.writeSSE({ event: 'final', data: JSON.stringify(debug ? { ...res, timings: tm.toJSON() } : res) });
            done(res);
          } catch (err) {
            const known = err instanceof ApiError;
            log(known && err.status < 500 ? 'WARNING' : 'ERROR', known ? 'api_error' : 'unhandled', {
              code: known ? err.code : 'upstream',
              error: (err as Error).message,
            });
            await stream.writeSSE({
              event: 'error',
              data: JSON.stringify(errorBody(known ? err.code : 'upstream', known ? err.message : 'Internal error')),
            });
          }
          await deferred;
        });
      }

      const res = await timingStore.run(tm, () => pipeline.run(full));
      done(res);
      return c.json(debug ? { ...res, timings: tm.toJSON() } : res);
    },
  );

  app.post(
    '/v1/feedback',
    async (c, next) => {
      if (!feedbackIp.allow(clientIp(c.req.header('x-forwarded-for'), c.req.header('x-real-ip')))) {
        return c.json(errorBody('rate_limited', 'Too many requests, retry in a minute'), 429, { 'retry-after': '60' });
      }
      const token = bearerToken(c.req.header('authorization'));
      const identity = token && verifier ? await verifier(token) : null;
      if (identity) {
        c.set('uid' as never, identity.uid as never);
        const decision = feedbackHourly.check(identity.uid, cfg.feedbackPerHour);
        if (!decision.allowed) {
          log('WARNING', 'uid_rate_limited', { route: 'feedback', anonymous: identity.anonymous });
          return c.json(errorBody('rate_limited', 'Hourly feedback limit reached'), 429, { 'retry-after': String(decision.retryAfterSec) });
        }
      }
      await next();
    },
    bodyLimit({ maxSize: 2 * 1024, onError: (c) => c.json(errorBody('too_large', 'Body exceeds 2048 bytes'), 413) }),
    async (c) => {
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        throw new ApiError(400, 'bad_request', 'Body must be valid JSON');
      }
      const input = parseFeedback(body);
      if (!feedback) return c.json({ ok: true });
      const uid = c.get('uid' as never) as string | undefined;
      const outcome = await feedback.submit(input, { uid });
      if (outcome === 'unknown') throw new ApiError(404, 'not_found', 'This check is no longer available for feedback');
      log('INFO', 'feedback_done', { outcome, correct: input.correct });
      return c.json({ ok: true });
    },
  );

  app.get('/v1/insights', async (c) => {
    const country = c.req.query('country')?.trim() || 'GLOBAL';
    const days = Number(c.req.query('days') ?? 30);
    if (!isCountry(country)) throw new ApiError(400, 'bad_request', 'country must be an ISO code such as TH, or GLOBAL');
    if (!Number.isInteger(days) || days < 1 || days > 90) throw new ApiError(400, 'bad_request', 'days must be an integer from 1 to 90');
    const out = intel
      ? await intel.insights(country, days)
      : { country: country.toUpperCase(), days, generatedAt: new Date().toISOString(), k: 3, risks: [], domains: [], campaigns: [] };
    c.header('Cache-Control', 'public, max-age=60');
    return c.json(out);
  });

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

  if (published) {
    app.use('/v1/config/*', async (c, next) => {
      if (!limiter.allow(clientIp(c.req.header('x-forwarded-for'), c.req.header('x-real-ip')))) {
        return c.json(errorBody('rate_limited', 'Too many requests, retry in a minute'), 429, { 'retry-after': '60' });
      }
      await next();
    });
    app.route('/v1/config', createConfigRoutes(published));
  }
  if (admin) app.route('/v1/admin', createAdminRoutes(admin));

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
