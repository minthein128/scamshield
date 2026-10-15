import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';
import { createMockSpeaker } from '../src/speak.js';

function make(env: Record<string, string> = {}) {
  const cfg = loadConfig({ MOCK: '1', ...env });
  const pipeline = createPipeline({
    extractor: createMockExtractor(),
    correlator: createMockCorrelator(),
    grounder: createMockGrounder(),
    model: cfg.model,
  });
  return createApp(cfg, pipeline, createMockSpeaker(cfg));
}
const post = (app: ReturnType<typeof make>, body: unknown, headers: Record<string, string> = {}) =>
  app.request('/v1/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('app', () => {
  it('serves config.json with the public api url and no-cache', async () => {
    const res = await make().request('/config.json');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(await res.json()).toEqual({ apiUrl: 'https://saferoute-api.akkhayar.com' });
  });

  it('healthz reports mock mode', async () => {
    const res = await make().request('/healthz');
    expect(await res.json()).toEqual({ ok: true, model: 'gemini-3.5-flash-lite', mock: true });
  });

  it('is mock when no credentials exist', () => {
    expect(loadConfig({}).mock).toBe(true);
    expect(loadConfig({ GEMINI_API_KEY: 'k' }).mock).toBe(false);
    expect(loadConfig({ GOOGLE_GENAI_USE_VERTEXAI: 'true', GOOGLE_CLOUD_PROJECT: 'p' }).mock).toBe(false);
  });

  it('returns the contract shape for a job check', async () => {
    const res = await post(make(), { kind: 'job', text: 'Great job abroad', language: 'id' });
    expect(res.status).toBe(200);
    const b = await res.json();
    expect(b).toMatchObject({ kind: 'job', verdict: 'danger', scamType: 'job_trafficking' });
    expect(b.id).toMatch(/^chk_/);
    expect(b.score).toBeGreaterThanOrEqual(70);
    expect(Array.isArray(b.flags) && Array.isArray(b.linkChecks) && Array.isArray(b.actions)).toBe(true);
    expect(b.title).toContain('tanda bahaya');
  });

  it('flags a Web Risk link in mock mode', async () => {
    const b = await (await post(make(), { kind: 'link', url: 'https://scam-site.example/' })).json();
    expect(b.verdict).toBe('danger');
    expect(b.linkChecks[0].webRisk).toBe('social_engineering');
  });

  it('returns safe for harmless text', async () => {
    const b = await (await post(make(), { kind: 'message', text: 'hello, lunch at noon?' })).json();
    expect(b).toMatchObject({ verdict: 'safe', score: 0, scamType: 'none' });
  });

  it('400 on empty input, bad kind and bad json', async () => {
    for (const body of [{ kind: 'job' }, { kind: 'nope', text: 'x' }, '{oops']) {
      const res = await post(make(), body);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe('bad_request');
    }
  });

  it('413 on oversized body', async () => {
    const app = make({ MAX_BODY_BYTES: '200' });
    const res = await post(app, { kind: 'job', text: 'x'.repeat(500) }, { 'content-length': '600' });
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe('too_large');
  });

  it('429 after the per-IP limit', async () => {
    const app = make({ RATE_LIMIT_PER_MIN: '2' });
    const h = { 'x-forwarded-for': '1.2.3.4' };
    expect((await post(app, { kind: 'job', text: 'a' }, h)).status).toBe(200);
    expect((await post(app, { kind: 'job', text: 'a' }, h)).status).toBe(200);
    const res = await post(app, { kind: 'job', text: 'a' }, h);
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe('rate_limited');
    expect((await post(app, { kind: 'job', text: 'a' }, { 'x-forwarded-for': '9.9.9.9' })).status).toBe(200);
  });

  it('returns sources for a grounded check', async () => {
    const b = await (await post(make(), { kind: 'job', text: 'Golden Star Recruitment' })).json();
    expect(b.sources.length).toBeGreaterThan(0);
    expect(b.sources[0]).toHaveProperty('url');
  });

  it('speak returns base64 wav and validates input', async () => {
    const app = make();
    const ok = await app.request('/v1/speak', { method: 'POST', body: JSON.stringify({ text: 'Danger', language: 'my' }) });
    expect(ok.status).toBe(200);
    expect((await ok.json()).mimeType).toBe('audio/wav');
    const bad = await app.request('/v1/speak', { method: 'POST', body: JSON.stringify({ text: '' }) });
    expect(bad.status).toBe(400);
  });

  it('sets CORS headers', async () => {
    const res = await make().request('/healthz', { headers: { origin: 'http://localhost:8081' } });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('streaming check', () => {
  const events = (text: string) =>
    text
      .trim()
      .split('\n\n')
      .map((b) => ({ event: /^event: (.*)$/m.exec(b)?.[1], data: JSON.parse(/^data: (.*)$/m.exec(b)?.[1] ?? 'null') }));

  it('streams stage events, an early verdict and a final result', async () => {
    const res = await make().request('/v1/check?stream=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'job', text: 'Great job abroad', language: 'en' }),
    });
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const ev = events(await res.text());
    const names = ev.map((e) => e.event);
    expect(names.indexOf('verdict')).toBeGreaterThan(names.indexOf('stage'));
    expect(names.at(-1)).toBe('final');
    const verdict = ev.find((e) => e.event === 'verdict')?.data;
    const final = ev.at(-1)?.data;
    expect(final.id).toBe(verdict.id);
    expect(final.verdict).toBe('danger');
    expect(final.timings).toBeUndefined();
  });

  it('still answers validation errors as plain JSON', async () => {
    const res = await make().request('/v1/check?stream=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'job' }),
    });
    expect(res.status).toBe(400);
  });

  it('adds timings only with debug=1', async () => {
    const send = (q: string) =>
      make().request(`/v1/check${q}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'message', text: 'hello', language: 'en' }),
      });
    expect((await (await send('')).json()).timings).toBeUndefined();
    const t = (await (await send('?debug=1')).json()).timings;
    expect(t.spans.extract.ms).toBeGreaterThanOrEqual(0);
    expect(t.meta.imageBytes).toBe(0);
  });
});
