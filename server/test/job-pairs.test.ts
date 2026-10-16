import { describe, expect, it } from 'vitest';
import { JOB_PAIRS } from '../eval/job-pairs.js';

describe('Job Shield eval pairs', () => {
  it('has 5 scam and 5 legit text pairs with unique ids', () => {
    expect(JOB_PAIRS).toHaveLength(10);
    expect(JOB_PAIRS.filter((p) => p.kind === 'scam')).toHaveLength(5);
    expect(new Set(JOB_PAIRS.map((p) => p.id)).size).toBe(10);
    for (const p of JOB_PAIRS) {
      expect(p.ad.trim().length).toBeGreaterThan(40);
      expect(p.chat.trim().length).toBeGreaterThan(40);
    }
  });

  it('has at least two Burmese pairs and one Thai pair', () => {
    expect(JOB_PAIRS.filter((p) => p.lang === 'my').length).toBeGreaterThanOrEqual(2);
    expect(JOB_PAIRS.filter((p) => p.lang === 'th').length).toBeGreaterThanOrEqual(1);
  });

  it('uses only example domains', () => {
    for (const p of JOB_PAIRS) {
      for (const host of `${p.ad} ${p.chat}`.match(/@[a-z0-9.-]+/gi) ?? []) expect(host).toMatch(/\.example\./);
    }
  });
});
