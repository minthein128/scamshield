export interface RateDecision {
  allowed: boolean;
  retryAfterSec: number;
}

export function createRateLimiter(limit: number, windowMs = 60_000, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return {
    check(key: string, max = limit, cost = 1): RateDecision {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
      if (recent.length + cost > max) {
        hits.set(key, recent);
        const oldest = recent[0] ?? t;
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - t) / 1000)) };
      }
      for (let i = 0; i < cost; i++) recent.push(t);
      hits.set(key, recent);
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.every((x) => t - x >= windowMs)) hits.delete(k);
      return { allowed: true, retryAfterSec: 0 };
    },
    allow(key: string): boolean {
      return this.check(key).allowed;
    },
  };
}
