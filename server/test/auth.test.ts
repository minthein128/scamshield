import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { bearerToken, type Identity, type TokenVerifier } from '../src/auth.js';
import { loadConfig } from '../src/config.js';
import { createIntel } from '../src/intel/service.js';
import { createMemoryStore } from '../src/intel/store.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';
import { createMockSpeaker } from '../src/speak.js';
import type { Extraction } from '../src/types.js';

const identities: Record<string, Identity> = {
  'anon-token': { uid: 'u-anon', anonymous: true },
  'anon-token-2': { uid: 'u-anon-2', anonymous: true },
  'user-token': { uid: 'u-user', anonymous: false },
};
const verifier: TokenVerifier = async (token) => identities[token] ?? null;

function make(env: Record<string, string> = {}) {
  const cfg = loadConfig({ MOCK: '1', RATE_LIMIT_PER_MIN: '1000', ...env });
  const pipeline = createPipeline({
    extractor: createMockExtractor(),
    correlator: createMockCorrelator(),
    grounder: createMockGrounder(),
    model: cfg.model,
  });
  return createApp(cfg, pipeline, createMockSpeaker(cfg), undefined, verifier);
}

const check = (app: ReturnType<typeof make>, token?: string, ip = '1.1.1.1') =>
  app.request('/v1/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ kind: 'message', text: 'hello' }),
  });

describe('bearerToken', () => {
  it('extracts a bearer token only', () => {
    expect(bearerToken('Bearer abc')).toBe('abc');
    expect(bearerToken('bearer abc')).toBe('abc');
    expect(bearerToken('Basic abc')).toBeUndefined();
    expect(bearerToken(undefined)).toBeUndefined();
  });
});

describe('per-uid rate limits', () => {
  it('limits anonymous uids to 20 an hour and signed-in uids to 60', async () => {
    const app = make();
    for (let i = 0; i < 20; i++) expect((await check(app, 'anon-token')).status).toBe(200);
    const blocked = await check(app, 'anon-token');
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error.code).toBe('rate_limited');
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(60);
    expect((await check(app, 'anon-token-2')).status).toBe(200);

    for (let i = 0; i < 60; i++) expect((await check(app, 'user-token')).status).toBe(200);
    expect((await check(app, 'user-token')).status).toBe(429);
  });

  it('treats missing and invalid tokens as unauthenticated and keeps the per-ip limit', async () => {
    const app = make({ RATE_LIMIT_PER_MIN: '3' });
    expect((await check(app)).status).toBe(200);
    expect((await check(app, 'garbage')).status).toBe(200);
    expect((await check(app, 'anon-token')).status).toBe(200);
    expect((await check(app, 'anon-token')).status).toBe(429);
    expect((await check(app, undefined, '2.2.2.2')).status).toBe(200);
  });

  it('works without a verifier', async () => {
    const cfg = loadConfig({ MOCK: '1' });
    const pipeline = createPipeline({
      extractor: createMockExtractor(),
      correlator: createMockCorrelator(),
      grounder: createMockGrounder(),
      model: cfg.model,
    });
    const app = createApp(cfg, pipeline, createMockSpeaker(cfg));
    expect((await check(app as never, 'anon-token')).status).toBe(200);
  });
});

describe('reporter key', () => {
  const extraction: Extraction = {
    entities: { companies: [], phones: [], domains: [] },
    flags: [{ family: 'trafficking', label: 'x', evidence: 'x', severity: 'high' }],
    scamType: 'job_trafficking',
    verdictDraft: 'danger',
    unsolicited: true,
    summary: 's',
    spokenWarning: 'w',
    urls: [],
    template: 'Urgent data entry jobs in Mae Sot, send your passport photo today',
    templateSafe: true,
    campaign: 'Mae Sot data-entry job',
    sender: { phones: ['0812345678'], handles: [], accounts: [] },
  };

  async function run(token?: string) {
    const cfg = loadConfig({ MOCK: '1' });
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p' });
    const pipeline = createPipeline({
      extractor: { extract: async () => extraction },
      correlator: createMockCorrelator(),
      grounder: createMockGrounder(),
      model: cfg.model,
      intel,
    });
    const app = createApp(cfg, pipeline, createMockSpeaker(cfg), intel, verifier);
    const res = await app.request('/v1/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ kind: 'job', text: 'Urgent data entry jobs in Mae Sot', language: 'en' }),
    });
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 20));
    return [...store.signals.values()];
  }

  it('records a signal with a reporter key for verified and anonymous tokens', async () => {
    for (const token of ['user-token', 'anon-token']) {
      const signals = await run(token);
      expect(signals).toHaveLength(1);
      expect(signals[0]?.rk).toMatch(/\S+/);
    }
  });

  it('records no reporter key without a verified token', async () => {
    for (const token of [undefined, 'garbage']) {
      const signals = await run(token);
      expect(signals.length).toBeLessThanOrEqual(1);
      expect(signals[0]?.rk).toBeUndefined();
    }
  });
});
