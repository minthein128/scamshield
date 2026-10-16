import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { Extractor } from '../src/extract.js';
import { buildInsights } from '../src/intel/insights.js';
import { decayedCount, rankOf } from '../src/intel/rank.js';
import { runSeed } from '../src/intel/seed-data.js';
import { createIntel, type Intel, severityForCount } from '../src/intel/service.js';
import { createMemoryStore } from '../src/intel/store.js';
import { createMockCorrelator, createMockGrounder } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';
import { score } from '../src/score.js';
import { createMockSpeaker } from '../src/speak.js';
import type { Extraction, Flag } from '../src/types.js';

const NOW = new Date('2026-10-14T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const flags: Flag[] = [{ family: 'trafficking', label: 'x', evidence: 'x', severity: 'high' }];

function extraction(phone: string, text: string, campaign = 'Mae Sot data-entry job'): Extraction {
  return {
    entities: { companies: [], phones: [], domains: [] },
    flags,
    scamType: 'job_trafficking',
    verdictDraft: 'danger',
    unsolicited: true,
    summary: 's',
    spokenWarning: 'w',
    urls: [],
    template: text,
    templateSafe: true,
    campaign,
    sender: { phones: [phone], handles: [], accounts: [] },
  };
}

async function reportPhone(intel: Intel, phone: string, ages: number[]) {
  for (const age of ages) {
    const p = intel.prepare(
      { kind: 'job', language: 'en' },
      extraction(phone, 'Urgent data entry jobs in Mae Sot, send your passport photo today'),
    );
    await intel.record(p, { verdict: 'danger', score: 85, scamType: 'job_trafficking', flags }, { now: daysAgo(age) });
  }
}

describe('network lookup', () => {
  it('stays silent below k=3 reports', async () => {
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    await reportPhone(intel, '+66 81 234 5678', [1, 2]);
    const p = intel.prepare(
      { kind: 'job', language: 'en' },
      extraction('081-234-5678', 'something else entirely different', 'Courier parcel fee link'),
    );
    expect((await intel.lookup(p, 'en')).flags).toEqual([]);
  });

  it('flags a number reported by 3 or more separate checks, whatever the format', async () => {
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    await reportPhone(intel, '+66 81 234 5678', [1, 2, 3, 4]);
    const p = intel.prepare(
      { kind: 'job', language: 'en' },
      extraction('081-234-5678', 'something else entirely different', 'Courier parcel fee link'),
    );
    const r = await intel.lookup(p, 'en');
    expect(r.flags).toHaveLength(1);
    expect(r.flags[0]).toMatchObject({ family: 'known_bad', severity: 'low' });
    expect(r.flags[0]?.label).toBe('This phone number was reported 4 times in the last 30 days');
    expect(r.network).toMatchObject({ seenCount: 4, firstSeen: '2026-10-10' });
    expect(JSON.stringify(r)).not.toContain('812345678');
  });

  it('localises the flag', async () => {
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    await reportPhone(intel, '0812345678', [1, 2, 3]);
    const p = intel.prepare({ kind: 'job', language: 'id' }, extraction('0812345678', 'x'));
    expect((await intel.lookup(p, 'id')).flags[0]?.label).toBe('Nomor telepon ini dilaporkan 3 kali dalam 30 hari terakhir');
  });

  it('ignores reports older than 30 days', async () => {
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    await reportPhone(intel, '0812345678', [40, 41, 42, 43]);
    const p = intel.prepare({ kind: 'job', language: 'en' }, extraction('0812345678', 'x'));
    expect((await intel.lookup(p, 'en')).flags).toEqual([]);
  });

  it('names a campaign by template similarity when it is active', async () => {
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    for (const [i, phone] of ['0811111111', '0822222222', '0833333333', '0844444444'].entries()) {
      await reportPhone(intel, phone, [i]);
    }
    const p = intel.prepare(
      { kind: 'job', language: 'en' },
      extraction('0899999999', 'Urgent data entry jobs in Mae Sot, send your passport photo today now'),
    );
    const r = await intel.lookup(p, 'en');
    expect(r.network?.campaign).toEqual({ name: 'Mae Sot data-entry job', seenThisWeek: 4 });
    expect(r.flags[0]).toMatchObject({ family: 'known_bad', severity: 'low' });
  });

  it('matches a campaign by the model campaign name when the wording differs', async () => {
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    for (const [i, phone] of ['0811111111', '0822222222', '0833333333'].entries()) await reportPhone(intel, phone, [i]);
    const p = intel.prepare(
      { kind: 'job', language: 'en' },
      extraction('0899999999', 'Totally different phrasing about clerical work abroad, nothing alike', 'Data entry job in Mae Sot'),
    );
    expect((await intel.lookup(p, 'en')).network?.campaign?.name).toBe('Mae Sot data-entry job');
  });

  it('does not match an unrelated template', async () => {
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    await reportPhone(intel, '0812345678', [0, 1, 2, 3]);
    const p = intel.prepare(
      { kind: 'message', language: 'en' },
      extraction('0899999999', 'Your parcel is held at customs, pay a small release fee at the link', 'Courier parcel fee link'),
    );
    expect((await intel.lookup(p, 'en')).network).toBeUndefined();
  });
});

describe('campaign across clusters', () => {
  it('sums every cluster of one campaign instead of picking one', async () => {
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    const texts = [
      'Urgent data entry jobs in Mae Sot, send your passport photo today',
      'Wir suchen zwei Leute fuer Dateneingabe, melden Sie sich sofort bitte',
      'zzzz qqqq wwww xxxx vvvv nnnn mmmm kkkk jjjj hhhh gggg ffff dddd ssss aaaa pppp',
    ];
    for (const [i, t] of texts.entries()) {
      for (const [j, phone] of [`08${i}1111111`, `08${i}2222222`].entries()) {
        const p = intel.prepare({ kind: 'job', language: 'en' }, extraction(phone, t));
        await intel.record(p, { verdict: 'danger', score: 85, scamType: 'job_trafficking', flags }, { now: daysAgo(i + j) });
      }
    }
    const q = intel.prepare(
      { kind: 'job', language: 'en' },
      extraction('0899999999', 'some other words entirely different from all of them here', 'Mae Sot data entry job'),
    );
    const r = await intel.lookup(q, 'en');
    expect(r.network?.campaign).toEqual({ name: 'Mae Sot data-entry job', seenThisWeek: 6 });
  });
});

describe('severity ladder', () => {
  it('maps counts to low, medium and high', () => {
    expect([3, 5, 6, 14, 15, 40].map(severityForCount)).toEqual(['low', 'low', 'medium', 'medium', 'high', 'high']);
  });

  it('feeds the rules engine through the known_bad weight', () => {
    const base = { linkChecks: [], unsolicited: false };
    const mk = (severity: 'low' | 'medium' | 'high'): Flag[] => [{ family: 'known_bad', label: 'n', evidence: 'n', severity }];
    const low = score({ ...base, flags: mk('low') });
    const med = score({ ...base, flags: mk('medium') });
    const high = score({ ...base, flags: mk('high') });
    expect(low.verdict).toBe('careful');
    expect(med.verdict).toBe('danger');
    expect(high.score).toBeGreaterThan(med.score);
    expect(score({ ...base, flags: [] }).verdict).toBe('safe');
  });
});

describe('pipeline integration', () => {
  const extractorFor = (phone: string, text: string): Extractor => ({ extract: async () => extraction(phone, text) });

  function make(intel: Intel, phone = '081-234-5678') {
    return createPipeline({
      extractor: extractorFor(phone, 'Urgent data entry jobs in Mae Sot, send your passport photo today'),
      correlator: createMockCorrelator(),
      grounder: createMockGrounder(),
      model: 'm',
      intel,
    });
  }

  it('adds network info and a known_bad flag when the number was seen', async () => {
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    await reportPhone(intel, '+66 81 234 5678', [1, 2, 3, 4, 5, 6]);
    const res = await make(intel).run({ kind: 'job', language: 'en', text: 'different wording of an offer' });
    expect(res.network?.seenCount).toBe(6);
    expect(res.flags.some((f) => f.family === 'known_bad' && f.label.includes('reported 6 times'))).toBe(true);
    expect(JSON.stringify(res)).not.toContain('812345678');
  });

  it('omits network when nothing matches', async () => {
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    const res = await make(intel).run({ kind: 'job', language: 'en', text: 'first ever report' });
    expect(res.network).toBeUndefined();
  });

  it('records one signal per risky check and none when shareSignals is false', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p' });
    await make(intel).run({ kind: 'job', language: 'en', text: 'offer', shareSignals: false });
    expect(store.signals.size).toBe(0);
    await make(intel).run({ kind: 'job', language: 'en', text: 'offer' });
    expect(store.signals.size).toBe(1);
  });

  it('does not count its own network flags as new evidence', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p', now: () => NOW });
    await reportPhone(intel, '+66 81 234 5678', [1, 2, 3]);
    const noFlagsExtractor: Extractor = {
      extract: async () => ({ ...extraction('0812345678', 'x'), flags: [], scamType: 'job_trafficking' }),
    };
    const p = createPipeline({
      extractor: noFlagsExtractor,
      correlator: createMockCorrelator(),
      grounder: createMockGrounder(),
      model: 'm',
      intel,
    });
    const before = store.signals.size;
    const res = await p.run({ kind: 'job', language: 'en', text: 'innocent looking text' });
    expect(res.flags.some((f) => f.family === 'known_bad')).toBe(true);
    expect(store.signals.size).toBe(before);
  });

  it('survives a failing store', async () => {
    const store = createMemoryStore();
    store.getAggs = async () => {
      throw new Error('firestore down');
    };
    store.record = async () => {
      throw new Error('firestore down');
    };
    const res = await make(createIntel({ store, pepper: 'p' })).run({ kind: 'job', language: 'en', text: 'offer' });
    expect(res.verdict).toBe('danger');
    expect(res.network).toBeUndefined();
  });
});

describe('ranking', () => {
  const key = (n: number) => daysAgo(n).toISOString().slice(0, 10).replaceAll('-', '');

  it('halves the weight every 7 days', () => {
    expect(decayedCount({ [key(0)]: 8 }, NOW, 30)).toBeCloseTo(8);
    expect(decayedCount({ [key(7)]: 8 }, NOW, 30)).toBeCloseTo(4);
    expect(decayedCount({ [key(14)]: 8 }, NOW, 30)).toBeCloseTo(2);
  });

  it('marks rising, falling and flat against the baseline', () => {
    const rising = { [key(1)]: 6, [key(3)]: 6, [key(40)]: 1 };
    const falling = { [key(1)]: 1, [key(35)]: 8, [key(40)]: 8 };
    const flat = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [key(i), 1]));
    expect(rankOf(rising, NOW, 30).trend).toBe('up');
    expect(rankOf(falling, NOW, 30).trend).toBe('down');
    expect(rankOf(flat, NOW, 30).trend).toBe('flat');
  });

  it('ranks recent activity above the same count long ago', () => {
    const recent = rankOf({ [key(1)]: 10 }, NOW, 30).rank;
    const old = rankOf({ [key(28)]: 10 }, NOW, 30).rank;
    expect(recent).toBeGreaterThan(old);
  });
});

describe('insights', () => {
  async function seeded() {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p', now: () => NOW });
    await runSeed(intel, NOW);
    return { store, intel };
  }

  it('ranks risk types with trend, example and flag families', async () => {
    const { intel } = await seeded();
    const out = await intel.insights('GLOBAL', 30);
    expect(out.risks.length).toBeGreaterThanOrEqual(4);
    expect(out.risks[0]?.scamType).toBe('job_trafficking');
    const parcel = out.risks.find((r) => r.scamType === 'parcel_phishing');
    expect(parcel?.trend).toBe('up');
    for (const r of out.risks) {
      expect(r.count).toBeGreaterThanOrEqual(3);
      expect(r.topFlagFamilies.length).toBeGreaterThan(0);
    }
    expect(out.risks.some((r) => r.example)).toBe(true);
    expect(out.domains.length).toBeGreaterThan(0);
    expect(out.campaigns[0]?.name).toBe('Mae Sot data-entry job');
  });

  it('filters by country', async () => {
    const { intel } = await seeded();
    const th = await intel.insights('TH', 30);
    expect(th.country).toBe('TH');
    expect(th.risks.length).toBeGreaterThan(0);
    const global = await intel.insights('GLOBAL', 30);
    const thTotal = th.risks.reduce((s, r) => s + r.count, 0);
    const globalTotal = global.risks.reduce((s, r) => s + r.count, 0);
    expect(thTotal).toBeLessThan(globalTotal);
  });

  it('exposes no hashes and only counts of at least k', async () => {
    const { intel } = await seeded();
    for (const c of ['GLOBAL', 'TH', 'ID', 'PH']) {
      const out = await intel.insights(c, 90);
      expect(JSON.stringify(out)).not.toMatch(/[0-9a-f]{24,}/);
      for (const d of out.domains) expect(d.count).toBeGreaterThanOrEqual(3);
      for (const x of out.campaigns) expect(x.count).toBeGreaterThanOrEqual(3);
    }
  });

  it('hides a type with fewer than 3 reports', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p', now: () => NOW });
    await reportPhone(intel, '0811111111', [1]);
    await reportPhone(intel, '0822222222', [2]);
    expect((await intel.insights('GLOBAL', 30)).risks).toEqual([]);
    await reportPhone(intel, '0833333333', [3]);
    expect((await intel.insights('GLOBAL', 30)).risks).toHaveLength(1);
  });

  it('caches for the configured time', async () => {
    const { store, intel } = await seeded();
    const a = await intel.insights('TH', 30);
    const spy = store.listAggs;
    let calls = 0;
    store.listAggs = async (...args) => {
      calls++;
      return spy(...args);
    };
    expect(await intel.insights('TH', 30)).toBe(a);
    expect(calls).toBe(0);
  });

  it('builds from raw aggregates', () => {
    expect(buildInsights({ types: [], clusters: [], domains: [] }, 'GLOBAL', 30, NOW).risks).toEqual([]);
  });
});

describe('GET /v1/insights', () => {
  async function app() {
    const cfg = loadConfig({ MOCK: '1' });
    const intel = createIntel({ store: createMemoryStore(), pepper: 'p', now: () => NOW });
    await runSeed(intel, NOW);
    const pipeline = createPipeline({
      extractor: { extract: async () => extraction('0812345678', 'x') },
      correlator: createMockCorrelator(),
      grounder: createMockGrounder(),
      model: 'm',
      intel,
    });
    return createApp(cfg, pipeline, createMockSpeaker(cfg), intel);
  }

  it('returns ranked insights with cache headers', async () => {
    const res = await (await app()).request('/v1/insights?country=TH&days=30');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=60');
    const b = await res.json();
    expect(b.country).toBe('TH');
    expect(b.risks.length).toBeGreaterThan(0);
  });

  it('defaults to global and 30 days', async () => {
    const b = await (await (await app()).request('/v1/insights')).json();
    expect(b).toMatchObject({ country: 'GLOBAL', days: 30 });
  });

  it('rejects a bad country or days', async () => {
    const a = await app();
    expect((await a.request('/v1/insights?country=ZZ')).status).toBe(400);
    expect((await a.request('/v1/insights?days=0')).status).toBe(400);
    expect((await a.request('/v1/insights?days=abc')).status).toBe(400);
  });

  it('returns an empty list when intel is off', async () => {
    const cfg = loadConfig({ MOCK: '1' });
    const pipeline = createPipeline({
      extractor: { extract: async () => extraction('1', 'x') },
      correlator: createMockCorrelator(),
      grounder: createMockGrounder(),
      model: 'm',
    });
    const b = await (await createApp(cfg, pipeline, createMockSpeaker(cfg)).request('/v1/insights')).json();
    expect(b.risks).toEqual([]);
  });

  it('accepts shareSignals on /v1/check', async () => {
    const res = await (await app()).request('/v1/check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'job', text: 'offer', shareSignals: false, context: { home: 'Myanmar' } }),
    });
    expect(res.status).toBe(200);
  });
});
