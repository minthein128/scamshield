import { describe, expect, it } from 'vitest';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';

const never = () => new Promise<never>(() => {});

describe('pipeline', () => {
  it('adds grounded flags to the score and returns sources', async () => {
    const p = createPipeline({
      extractor: createMockExtractor(),
      correlator: createMockCorrelator(),
      grounder: createMockGrounder(),
      model: 'm',
    });
    const r = await p.run({ kind: 'agency', language: 'en', text: 'Sunrise Overseas Agency, deposit 5000' });
    expect(r.sources).toHaveLength(2);
    expect(r.flags.some((f) => f.label.includes('could not find a licence record'))).toBe(true);
  });

  it('degrades when grounding and link checks hang past the budget', async () => {
    const p = createPipeline({
      extractor: createMockExtractor(),
      correlator: { checkAll: never },
      grounder: { ground: never },
      model: 'm',
      budgetMs: 700,
    });
    const t = Date.now();
    const r = await p.run({ kind: 'job', language: 'en', text: 'job https://a.example.com' });
    expect(Date.now() - t).toBeLessThan(1500);
    expect(r.sources).toEqual([]);
    expect(r.linkChecks[0]?.webRisk).toBe('unknown');
    expect(r.verdict).toBe('danger');
  });
});

describe('pipeline latency features', () => {
  const base = () => ({ extractor: createMockExtractor(), grounder: createMockGrounder(), model: 'm' });
  const text = 'Visit https://a.example.com now to claim your prize';

  it('starts link checks on regex URLs before extraction finishes', async () => {
    const order: string[] = [];
    const extractor = createMockExtractor();
    const p = createPipeline({
      ...base(),
      extractor: {
        extract: async (r) => {
          order.push('extract-start');
          await new Promise((res) => setTimeout(res, 30));
          order.push('extract-end');
          return extractor.extract(r);
        },
      },
      correlator: {
        checkAll: async (urls) => {
          order.push(`links:${urls.length}`);
          return urls.map((url) => ({ url, webRisk: 'clean' as const }));
        },
      },
    });
    const r = await p.run({ kind: 'message', language: 'en', text });
    expect(order.indexOf('links:1')).toBeLessThan(order.indexOf('extract-end'));
    expect(r.linkChecks.map((l) => l.url)).toContain('https://a.example.com/');
  });

  it('serves an identical check from the cache and keeps the id so feedback still resolves', async () => {
    let extracts = 0;
    const mock = createMockExtractor();
    const p = createPipeline({
      ...base(),
      extractor: {
        extract: (r) => {
          extracts++;
          return mock.extract(r);
        },
      },
      correlator: createMockCorrelator(),
      resultCacheTtlMs: 60_000,
    });
    const req = { kind: 'message' as const, language: 'en' as const, text: 'hello   there ' };
    const a = await p.run(req);
    const b = await p.run({ ...req, text: 'hello there' });
    const c = await p.run({ ...req, language: 'id' });
    expect(extracts).toBe(2);
    expect(b.id).toBe(a.id);
    expect({ ...b, createdAt: '' }).toEqual({ ...a, createdAt: '' });
    expect(c.id).not.toBe(a.id);
  });

  it('does not cache a degraded result', async () => {
    let extracts = 0;
    const mock = createMockExtractor();
    const p = createPipeline({
      ...base(),
      extractor: {
        extract: (r) => {
          extracts++;
          return mock.extract(r);
        },
      },
      correlator: { checkAll: never },
      budgetMs: 600,
      resultCacheTtlMs: 60_000,
    });
    const req = { kind: 'message' as const, language: 'en' as const, text };
    await p.run(req);
    await p.run(req);
    expect(extracts).toBe(2);
  });

  it('emits stage and verdict events before the final result', async () => {
    const events: string[] = [];
    const p = createPipeline({ ...base(), correlator: createMockCorrelator() });
    const r = await p.run(
      { kind: 'job', language: 'en', text: 'job abroad' },
      { onEvent: (e) => events.push(e.type === 'stage' ? `${e.stage}:${e.status}` : e.type) },
    );
    expect(events.indexOf('extract:done')).toBeLessThan(events.indexOf('verdict'));
    expect(events.indexOf('verdict')).toBeLessThan(events.indexOf('ground:done'));
    expect(r.verdict).toBe('danger');
  });

  it('caps grounding time when extraction and rules already say danger', async () => {
    const p = createPipeline({
      ...base(),
      correlator: createMockCorrelator(),
      grounder: { ground: () => new Promise((r) => setTimeout(() => r({ flags: [], sources: [] }), 400)) },
      dangerGroundCapMs: 50,
    });
    const t = Date.now();
    const r = await p.run({ kind: 'job', language: 'en', text: 'job abroad' });
    expect(Date.now() - t).toBeLessThan(300);
    expect(r.verdict).toBe('danger');
  });

  it('defers the intel write when asked and hands it to the caller', async () => {
    const recorded: string[] = [];
    const intel = {
      prepare: () => ({ kind: 'job', language: 'en', ind: [], domains: [] }),
      lookup: async () => ({ flags: [] }),
      recordSignal: async () => {
        await new Promise((r) => setTimeout(r, 100));
        recorded.push('done');
        return { status: 'recorded' as const, signalId: 's1' };
      },
    };
    const p = createPipeline({ ...base(), correlator: createMockCorrelator(), intel: intel as never, recordAfterResponse: true });
    let deferred: Promise<unknown> | undefined;
    await p.run({ kind: 'job', language: 'en', text: 'job abroad' }, { afterResponse: (d) => (deferred = d) });
    expect(recorded).toEqual([]);
    await deferred;
    expect(recorded).toEqual(['done']);
  });
});

describe('pipeline language guard', () => {
  it('re-asks once when certainty is heavy and reports stats', async () => {
    const mock = createMockExtractor();
    const heavy = async () => {
      const x = await mock.extract({ kind: 'job', language: 'en', text: 'job' });
      return { ...x, summary: 'This is a scam and definitely fake. It is a trap.', spokenWarning: 'It is a scam.' };
    };
    let calls = 0;
    const extractor = {
      extract: async (_r: unknown, opts?: { hedgeRetry?: boolean }) => {
        calls++;
        return opts?.hedgeRetry ? mock.extract({ kind: 'job', language: 'en', text: 'job' }) : heavy();
      },
    };
    let stats: unknown;
    const p = createPipeline({
      extractor: extractor as never,
      correlator: createMockCorrelator(),
      grounder: createMockGrounder(),
      model: 'm',
      onLanguage: (s) => {
        stats = s;
      },
    });
    const r = await p.run({ kind: 'job', language: 'en', text: 'job' });
    expect(calls).toBe(2);
    expect(stats).toMatchObject({ reasked: true, after: 0 });
    expect((stats as { before: number }).before).toBeGreaterThanOrEqual(3);
    expect(r.summary).not.toMatch(/is a scam/i);
  });

  it('rewrites light certainty without a second call', async () => {
    const mock = createMockExtractor();
    let calls = 0;
    const extractor = {
      extract: async () => {
        calls++;
        const x = await mock.extract({ kind: 'job', language: 'en', text: 'job' });
        return { ...x, spokenWarning: 'This is a scam.' };
      },
    };
    const p = createPipeline({
      extractor: extractor as never,
      correlator: createMockCorrelator(),
      grounder: createMockGrounder(),
      model: 'm',
    });
    const r = await p.run({ kind: 'job', language: 'en', text: 'job' });
    expect(calls).toBe(1);
    expect(r.spokenWarning).toBe('This looks like a scam.');
  });
});
