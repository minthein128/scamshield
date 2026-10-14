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
    expect(r.flags.some((f) => f.label.includes('No licence found'))).toBe(true);
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
