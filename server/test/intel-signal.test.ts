import { describe, expect, it } from 'vitest';
import { leaks } from '../eval/leak.js';
import { PII_SET } from '../eval/pii-set.js';
import { createHasher } from '../src/intel/indicators.js';
import { generateSeedChecks, runSeed } from '../src/intel/seed-data.js';
import { createIntel } from '../src/intel/service.js';
import { aggregateWrites, buildSignal, prepare } from '../src/intel/signal.js';
import { createMemoryStore } from '../src/intel/store.js';
import type { Extraction } from '../src/types.js';

const hasher = createHasher('test-pepper');
const KNOWN_MISSES = ['demo.travel.agency'];

function extractionFor(text: string, pii: Array<{ type: string; value: string }>): Extraction {
  let template = text;
  for (const p of pii.filter((x) => x.type === 'name')) template = template.split(p.value).join('[PERSON]');
  const by = (t: string) => pii.filter((x) => x.type === t).map((x) => x.value);
  return {
    entities: { companies: [], phones: [], domains: [] },
    flags: [{ family: 'pressure', label: 'l', evidence: text, severity: 'medium' }],
    scamType: 'job_trafficking',
    verdictDraft: 'danger',
    unsolicited: true,
    summary: text,
    spokenWarning: text,
    urls: ['https://fee-pay.example/pay?id=1'],
    template,
    templateSafe: true,
    campaign: 'Test campaign',
    sender: { phones: by('phone'), handles: by('handle'), accounts: by('account') },
  };
}

describe('persisted records carry no fixture PII', () => {
  it.each(PII_SET.filter((c) => c.pii.length > 0).map((c) => [c.id, c] as const))('%s', async (_id, c) => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'test-pepper' });
    const ex = extractionFor(c.text, c.pii);
    const prepared = intel.prepare({ kind: 'message', language: 'en', context: { destination: 'Thailand' } }, ex);
    await intel.record(prepared, { verdict: 'danger', score: 80, scamType: 'job_trafficking', flags: ex.flags });

    const persisted = JSON.stringify({ signals: [...store.signals.values()], aggs: [...store.aggs.values()] });
    for (const p of c.pii) {
      if (p.type === 'name' && c.hard) continue;
      if (KNOWN_MISSES.includes(p.value)) continue;
      expect(leaks(p.value, persisted), `${p.type} ${p.value}`).toBe(false);
    }
    expect(persisted).not.toContain(c.text);
  });
});

describe('signal record', () => {
  const ex = extractionFor('Call +66 81 234 5678 for the job in Mae Sot, send passport today', [
    { type: 'phone', value: '+66 81 234 5678' },
  ]);
  const p = prepare({ kind: 'job', language: 'en', destination: 'Thailand', home: 'MM' }, ex, hasher);
  const { id, doc } = buildSignal(p, { verdict: 'danger', score: 87, scamType: 'job_trafficking', flags: ex.flags }, hasher, {
    now: new Date('2026-10-14T10:00:00Z'),
  });

  it('stores only the allowed fields', () => {
    expect(Object.keys(doc).sort()).toEqual(
      [
        'campaign',
        'day',
        'dayTs',
        'dest',
        'domains',
        'expireAt',
        'flags',
        'home',
        'ind',
        'kind',
        'language',
        'scamType',
        'scoreBucket',
        'template',
        'v',
        'verdict',
      ].sort(),
    );
    expect(doc.day).toBe('20261014');
    expect(doc.scoreBucket).toBe(80);
    expect(doc.home).toBe('MM');
    expect(doc.dest).toBe('TH');
    expect(doc.domains).toEqual(['fee-pay.example']);
    expect(doc.flags).toEqual([{ family: 'pressure', severity: 'medium' }]);
  });

  it('expires 90 days after the day', () => {
    expect(doc.expireAt.toISOString()).toBe('2027-01-12T00:00:00.000Z');
  });

  it('never contains clear indicators, raw text or the evidence quote', () => {
    const json = JSON.stringify(doc);
    expect(json).not.toContain('234 5678');
    expect(json).not.toContain('812345678');
    expect(json).not.toContain('evidence');
    expect(doc.template).toBe('Call [PHONE] for the job in Mae Sot, send passport today');
    expect(doc.ind.map((i) => i.t)).toEqual(['phone']);
  });

  it('gives the same id for the same scam on the same day, whatever the wording', () => {
    const ex2 = {
      ...extractionFor('Different words, number 0812345678 now', [{ type: 'phone', value: '0812345678' }]),
      urls: ['https://fee-pay.example/x'],
    };
    const p2 = prepare({ kind: 'job', language: 'en' }, ex2, hasher);
    const again = buildSignal(p2, { verdict: 'danger', score: 70, scamType: 'job_trafficking', flags: ex.flags }, hasher, {
      now: new Date('2026-10-14T20:00:00Z'),
    });
    expect(again.id).toBe(id);
  });

  it('writes counters for global and each country scope', () => {
    const w = aggregateWrites(doc, hasher);
    const scopes = new Set(w.filter((x) => x.kind === 'type').map((x) => x.scope));
    expect(scopes).toEqual(new Set(['GLOBAL', 'MM', 'TH']));
    expect(w.filter((x) => x.kind === 'ind').every((x) => x.scope === 'GLOBAL')).toBe(true);
    expect(JSON.stringify(w)).not.toContain('812345678');
  });
});

describe('recording rules', () => {
  const ex = extractionFor('Send passport photo and call 0812345678 today for the job', [{ type: 'phone', value: '0812345678' }]);
  const outcome = { verdict: 'danger' as const, score: 80, scamType: 'job_trafficking' as const, flags: ex.flags };

  it('skips safe verdicts and scamType none', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p' });
    const p = intel.prepare({ kind: 'job', language: 'en' }, ex);
    expect(await intel.record(p, { ...outcome, verdict: 'safe' })).toBe('skipped');
    expect(await intel.record(p, { ...outcome, scamType: 'none' })).toBe('skipped');
    expect(store.signals.size).toBe(0);
  });

  it('counts the same scam on the same day once', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p' });
    const p = intel.prepare({ kind: 'job', language: 'en' }, ex);
    expect(await intel.record(p, outcome)).toBe('recorded');
    expect(await intel.record(p, outcome)).toBe('duplicate');
    expect(store.signals.size).toBe(1);
  });
});

describe('seed data', () => {
  const now = new Date('2026-10-14T12:00:00Z');

  it('produces about 200 fictional checks', () => {
    expect(generateSeedChecks(now).length).toBe(200);
  });

  it('persists no fictional PII from the seed path and tags every signal', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'seed-pepper' });
    const r = await runSeed(intel, now);
    expect(r.recorded).toBeGreaterThan(120);
    expect([...store.signals.values()].every((s) => s.seed === true)).toBe(true);
    const persisted = JSON.stringify({ s: [...store.signals.values()], a: [...store.aggs.values()] });
    const compact = persisted.replace(/[\s-]/g, '');
    for (const v of new Set(r.fictional)) {
      expect(persisted.toLowerCase(), v).not.toContain(v.toLowerCase());
      const digits = v.replace(/\D/g, '');
      if (digits.length >= 6) expect(compact, v).not.toContain(digits);
    }
  });

  it('purges every seed record and counter', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'seed-pepper' });
    await runSeed(intel, now);
    const out = await store.purgeSeed();
    expect(out.signals).toBeGreaterThan(0);
    expect(store.signals.size).toBe(0);
    expect(store.aggs.size).toBe(0);
  });
});

describe('retention sweep', () => {
  it('removes signals past expireAt', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p' });
    const ex = extractionFor('Send passport photo and call 0812345678 today', [{ type: 'phone', value: '0812345678' }]);
    const p = intel.prepare({ kind: 'job', language: 'en' }, ex);
    const o = { verdict: 'danger' as const, score: 80, scamType: 'job_trafficking' as const, flags: ex.flags };
    await intel.record(p, o, { now: new Date(Date.now() - 100 * 86_400_000) });
    expect(await store.sweepExpired(new Date())).toBe(1);
    expect(store.signals.size).toBe(0);
  });
});

describe('reporter keys', () => {
  const NOW1 = new Date('2026-10-14T10:00:00Z');
  const ex = (domain?: string) => ({
    ...extractionFor('Call 0812345678 now for the job in Mae Sot, send passport', [{ type: 'phone', value: '0812345678' }]),
    urls: domain ? [`https://${domain}/x`] : [],
  });
  const o = { verdict: 'danger' as const, score: 80, scamType: 'job_trafficking' as const, flags: ex().flags };
  const phoneCount = (store: ReturnType<typeof createMemoryStore>) => {
    const a = [...store.aggs.values()].find((x) => x.kind === 'ind');
    return Object.values(a?.real.days ?? {}).reduce((s, n) => s + n, 0);
  };

  it('counts one person once per day across different wordings', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p' });
    for (const d of [undefined, 'a.example', 'b.example']) {
      await intel.record(intel.prepare({ kind: 'job', language: 'en' }, ex(d)), o, { now: NOW1, uid: 'user-1' });
    }
    expect(phoneCount(store)).toBe(1);
  });

  it('counts different people separately on the same day', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p' });
    for (const uid of ['user-1', 'user-2', 'user-3']) {
      await intel.record(intel.prepare({ kind: 'job', language: 'en' }, ex()), o, { now: NOW1, uid });
    }
    expect(phoneCount(store)).toBe(3);
    expect(store.signals.size).toBe(3);
  });

  it('counts the same person again on another day, with an unlinkable key', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p' });
    await intel.record(intel.prepare({ kind: 'job', language: 'en' }, ex()), o, { now: NOW1, uid: 'user-1' });
    await intel.record(intel.prepare({ kind: 'job', language: 'en' }, ex()), o, { now: new Date('2026-10-15T10:00:00Z'), uid: 'user-1' });
    expect(phoneCount(store)).toBe(2);
    const keys = [...store.signals.values()].map((s) => s.rk);
    expect(keys[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(keys[0]).not.toBe(keys[1]);
    expect(JSON.stringify([...store.signals.values()])).not.toContain('user-1');
  });

  it('falls back to the old behaviour without a uid', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p' });
    await intel.record(intel.prepare({ kind: 'job', language: 'en' }, ex()), o, { now: NOW1 });
    await intel.record(intel.prepare({ kind: 'job', language: 'en' }, ex()), o, { now: NOW1 });
    expect(phoneCount(store)).toBe(1);
    expect([...store.signals.values()][0]?.rk).toBeUndefined();
  });

  it('takes the uid from the auth layer, never from the body', async () => {
    const { createApp } = await import('../src/app.js');
    const { loadConfig } = await import('../src/config.js');
    const { createPipeline } = await import('../src/pipeline.js');
    const { createMockCorrelator, createMockGrounder } = await import('../src/mock.js');
    const { createMockSpeaker } = await import('../src/speak.js');
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p' });
    const cfg = loadConfig({ MOCK: '1' });
    const pipeline = createPipeline({
      extractor: { extract: async () => ex() },
      correlator: createMockCorrelator(),
      grounder: createMockGrounder(),
      model: 'm',
      intel,
    });
    const app = createApp(cfg, pipeline, createMockSpeaker(cfg), intel);
    await app.request('/v1/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'job', text: 'offer', uid: 'spoofed' }),
    });
    expect([...store.signals.values()][0]?.rk).toBeUndefined();
  });
});
