import { describe, expect, it } from 'vitest';
import { JOB_PAIRS, runJobPairEval } from '../eval/job-pairs.js';
import { assessJobOffer } from '../src/job/assess.js';

describe('Job Shield 10-Pair Evaluation', () => {
  it('evaluates all 10 pairs with 100% compliance with tier criteria', async () => {
    const summary = await runJobPairEval();
    expect(summary.passed).toBe(true);
    for (const r of summary.results) {
      expect(r.ok).toBe(true);
    }
  });

  for (const pair of JOB_PAIRS) {
    it(`evaluates pair ${pair.id} [${pair.lang}] as expected tier: ${pair.expectedTier} (must not be: ${pair.mustNotBe})`, async () => {
      const res = await assessJobOffer({
        facts: { ad: pair.ad, chat: pair.chat },
        language: pair.lang,
      });

      expect(res.attention).not.toBe(pair.mustNotBe);
      if (pair.expectedTier === 'pause') {
        expect(res.attention).toBe('pause');
      } else {
        expect(res.attention).not.toBe('pause');
      }
    });
  }
});
