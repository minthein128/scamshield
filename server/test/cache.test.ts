import { describe, expect, it } from 'vitest';
import { createTtlLru, memoize } from '../src/cache.js';

describe('ttl lru', () => {
  it('expires entries and evicts the least recently used', () => {
    let t = 0;
    const c = createTtlLru<number>({ max: 2, ttlMs: 100, now: () => t });
    c.set('a', 1);
    c.set('b', 2);
    expect(c.get('a')).toBe(1);
    c.set('c', 3);
    expect(c.get('b')).toBeUndefined();
    expect(c.get('a')).toBe(1);
    t = 101;
    expect(c.get('a')).toBeUndefined();
    expect(c.size).toBe(1);
  });

  it('memoize shares one load and drops results that are not kept', async () => {
    const c = createTtlLru<Promise<string>>({ max: 10, ttlMs: 1000 });
    let calls = 0;
    const load = async () => `v${++calls}`;
    const [x, y] = await Promise.all([memoize(c, 'k', load, () => true), memoize(c, 'k', load, () => true)]);
    expect([x, y, calls]).toEqual(['v1', 'v1', 1]);
    const drop = createTtlLru<Promise<string>>({ max: 10, ttlMs: 1000 });
    await memoize(drop, 'k', load, () => false);
    await memoize(drop, 'k', load, () => false);
    expect(calls).toBe(3);
  });
});
