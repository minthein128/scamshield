import { describe, expect, it } from 'vitest';
import { createIntel } from '../src/intel/service.js';
import { createMemoryStore } from '../src/intel/store.js';
import { CONFIRMED_WEIGHT, CONTRADICTED_WEIGHT, shown, weightDelta, weightOf } from '../src/intel/weights.js';
import { createMockExtractor } from '../src/mock.js';

const NOW = new Date('2026-10-14T10:00:00Z');

async function recorded(opts: { confirmed?: boolean } = {}) {
  const store = createMemoryStore();
  const intel = createIntel({ store, pepper: 'p', now: () => NOW });
  const req = { kind: 'job' as const, language: 'en' as const, text: 'Job in Thailand, send passport. Telegram @gold_hr_agent' };
  const ex = await createMockExtractor().extract(req);
  const p = intel.prepare(req, ex);
  const o = { verdict: 'danger' as const, score: 90, scamType: 'job_trafficking' as const, flags: ex.flags };
  const r = await intel.recordSignal(p, o, opts);
  return { store, intel, id: r.signalId as string };
}

describe('weights', () => {
  it('uses 1 for confirmed and 0.25 for contradicted', () => {
    expect(CONFIRMED_WEIGHT).toBe(1);
    expect(CONTRADICTED_WEIGHT).toBe(0.25);
    expect(weightOf({})).toBe(1);
    expect(weightDelta({}, CONTRADICTED_WEIGHT)).toBe(-0.75);
    expect(weightDelta({ w: CONTRADICTED_WEIGHT }, CONTRADICTED_WEIGHT)).toBe(0);
    expect(shown(2.75)).toBe(3);
  });

  it('contradicts every counter of a signal and is idempotent', async () => {
    const { store, intel, id } = await recorded();
    const total = () => [...store.aggs.values()].map((a) => Object.values(a.real.days).reduce((x, y) => x + y, 0));
    expect(total().every((n) => n === 1)).toBe(true);
    expect(await intel.reweight(id, { contradict: true })).toBe('applied');
    expect(total().every((n) => n === 0.25)).toBe(true);
    expect(await intel.reweight(id, { contradict: true })).toBe('unchanged');
    expect(total().every((n) => n === 0.25)).toBe(true);
  });

  it('never drives a counter below zero', async () => {
    const { store, intel, id } = await recorded();
    for (const a of store.aggs.values()) for (const d of Object.keys(a.real.days)) a.real.days[d] = 0.1;
    await intel.reweight(id, { contradict: true });
    for (const a of store.aggs.values()) for (const n of Object.values(a.real.days)) expect(n).toBe(0);
  });

  it('reports a missing signal', async () => {
    const { intel } = await recorded();
    expect(await intel.reweight('nope', { contradict: true })).toBe('missing');
  });

  it('a confirmed record is stored when the verdict is safe, and none otherwise', async () => {
    const store = createMemoryStore();
    const intel = createIntel({ store, pepper: 'p', now: () => NOW });
    const req = { kind: 'message' as const, language: 'en' as const, text: 'Pay the release fee at once for your prize' };
    const p = intel.prepare(req, await createMockExtractor().extract(req));
    const safe = { verdict: 'safe' as const, score: 5, scamType: 'investment' as const, flags: [] };
    expect((await intel.recordSignal(p, safe)).status).toBe('skipped');
    expect((await intel.recordSignal(p, safe, { confirmed: true })).status).toBe('recorded');
    expect((await intel.recordSignal(p, { ...safe, scamType: 'none' }, { confirmed: true })).status).toBe('skipped');
  });
});
