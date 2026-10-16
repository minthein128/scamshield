import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../src/ratelimit.js';

describe('rate limiter cost', () => {
  it('counts a cost of two as two hits and never half-spends', () => {
    let t = 0;
    const l = createRateLimiter(0, 1000, () => t);
    expect(l.check('u', 5, 2).allowed).toBe(true);
    expect(l.check('u', 5, 2).allowed).toBe(true);
    expect(l.check('u', 5, 2).allowed).toBe(false);
    expect(l.check('u', 5).allowed).toBe(true);
    expect(l.check('u', 5).allowed).toBe(false);
    t = 1500;
    expect(l.check('u', 5, 2).allowed).toBe(true);
  });
});
