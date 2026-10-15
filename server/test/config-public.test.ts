import { afterEach, describe, expect, it } from 'vitest';
import { bundledToItem } from '../src/admin/changes.js';
import { activeNotices, contentFor, createPublishedCache } from '../src/admin/published.js';
import type { Notice } from '../src/admin/schema.js';
import { type ConfigStore, createMemoryStore } from '../src/admin/store.js';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { HOTLINES } from '../src/data/hotlines.generated.js';
import { hotlineFor, setHotlineSource } from '../src/explain.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';
import { createMockSpeaker } from '../src/speak.js';

const cfg = loadConfig({ MOCK: '1', RATE_LIMIT_PER_MIN: '1000' });
const items = () => HOTLINES.map((h) => bundledToItem(h, '2026-10-15T00:00:00.000Z'));

function appOf(store: ConfigStore, cache = createPublishedCache(store)) {
  const pipeline = createPipeline({
    extractor: createMockExtractor(),
    correlator: createMockCorrelator(),
    grounder: createMockGrounder(),
    model: cfg.model,
  });
  return { app: createApp(cfg, pipeline, createMockSpeaker(cfg), undefined, undefined, undefined, undefined, undefined, cache), cache };
}

afterEach(() => setHotlineSource(() => HOTLINES));

describe('public config API', () => {
  it('serves the bundled list when nothing is published, with cache headers and an ETag', async () => {
    const { app } = appOf(createMemoryStore());
    const res = await app.request('/v1/config/hotlines');
    const body = (await res.json()) as { version: number; items: unknown[] };
    expect(body.version).toBe(0);
    expect(body.items).toHaveLength(HOTLINES.length);
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    expect(res.headers.get('etag')).toMatch(/^W\//);
  });

  it('serves the published version, hides retired items and internal fields, and answers 304', async () => {
    const store = createMemoryStore();
    const list = items();
    (list[0] as { status: string }).status = 'retired';
    await store.seed('hotlines', list, 'seed', false);
    const { app } = appOf(store);
    const res = await app.request('/v1/config/hotlines');
    const body = (await res.json()) as { version: number; items: Array<Record<string, unknown>> };
    expect(body.version).toBe(1);
    expect(body.items).toHaveLength(HOTLINES.length - 1);
    expect(body.items[0]).not.toHaveProperty('history');
    expect(body.items[0]).not.toHaveProperty('verifiedBy');
    const again = await app.request('/v1/config/hotlines', { headers: { 'if-none-match': res.headers.get('etag') as string } });
    expect(again.status).toBe(304);
  });

  it('filters notices by window, country and language', async () => {
    const base = { title: 't', body: 'b', severity: 'info', enabled: true } as const;
    const all: Notice[] = [
      { ...base, id: 'all-now' },
      { ...base, id: 'th-only', country: ['TH'] },
      { ...base, id: 'my-lang', language: ['my'] },
      { ...base, id: 'off', enabled: false },
      { ...base, id: 'future', startsAt: '2999-01-01T00:00:00Z' },
      { ...base, id: 'expired', endsAt: '2000-01-01T00:00:00Z' },
    ];
    expect(activeNotices(all, {}).map((n) => n.id)).toEqual(['all-now', 'th-only', 'my-lang']);
    expect(activeNotices(all, { country: 'MM', language: 'en' }).map((n) => n.id)).toEqual(['all-now']);
    expect(activeNotices(all, { country: 'TH', language: 'my' }).map((n) => n.id)).toEqual(['all-now', 'th-only', 'my-lang']);
  });

  it('maps content to one language', () => {
    const map = { a: { en: 'A', my: 'M' }, b: { en: 'B' } };
    expect(contentFor(map, 'my')).toEqual({ a: 'M' });
    expect(contentFor(map, 'en')).toEqual({ a: 'A', b: 'B' });
    expect(contentFor(map)).toEqual(map);
  });

  it('rejects an unknown content language', async () => {
    const { app } = appOf(createMemoryStore());
    expect((await app.request('/v1/config/content?language=xx')).status).toBe(400);
    expect(((await (await app.request('/v1/config/notices')).json()) as { items: unknown[] }).items).toEqual([]);
  });
});

describe('published cache', () => {
  it('refreshes after the ttl and keeps the last good copy when the store fails', async () => {
    const store = createMemoryStore();
    await store.seed('hotlines', items(), 'seed', false);
    let t = 0;
    const cache = createPublishedCache(store, { ttlMs: 60_000, now: () => t });
    expect((await cache.get('hotlines')).doc.version).toBe(1);
    await store.seed('hotlines', items(), 'seed', true);
    expect((await cache.get('hotlines')).doc.version).toBe(1);
    t = 61_000;
    expect((await cache.get('hotlines')).doc.version).toBe(2);
    store.getDoc = () => Promise.reject(new Error('down'));
    t = 130_000;
    const out = await cache.get('hotlines');
    expect(out.doc.version).toBe(2);
    expect(out.source).toBe('firestore');
  });

  it('invalidate drops the cached copy', async () => {
    const store = createMemoryStore();
    await store.seed('hotlines', items(), 'seed', false);
    const cache = createPublishedCache(store);
    await cache.get('hotlines');
    await store.seed('hotlines', items(), 'seed', true);
    cache.invalidate('hotlines');
    expect((await cache.get('hotlines')).doc.version).toBe(2);
  });

  it('feeds explain.ts: a retired or changed hotline changes the report action', async () => {
    const store = createMemoryStore();
    const list = items();
    const th = list.find((h) => h.id === 'th-rtp-ahtd-1599');
    if (!th) throw new Error('fixture missing');
    th.status = 'retired';
    await store.seed('hotlines', list, 'seed', false);
    const cache = createPublishedCache(store);
    setHotlineSource(() => cache.hotlines());
    expect(hotlineFor('Bangkok, Thailand', {})).toBe('1599');
    await cache.get('hotlines');
    expect(hotlineFor('Bangkok, Thailand', {})).not.toBe('1599');
  });

  it('serves the bundled list when the store is down from the start', async () => {
    const down = { getDoc: () => Promise.reject(new Error('down')) } as unknown as ConfigStore;
    const cache = createPublishedCache(down);
    const out = await cache.get('hotlines');
    expect(out.source).toBe('bundled');
    expect(out.doc.items).toHaveLength(HOTLINES.length);
    expect(cache.hotlines()).toHaveLength(HOTLINES.length);
  });
});
