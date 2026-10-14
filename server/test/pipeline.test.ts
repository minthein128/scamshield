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
