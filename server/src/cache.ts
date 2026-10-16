export interface TtlLru<V> {
  get(key: string): V | undefined;
  set(key: string, value: V, ttlMs?: number): void;
  delete(key: string): void;
  readonly size: number;
  clear(): void;
}

/** In-memory LRU with a per-entry expiry. Never persisted. */
export function createTtlLru<V>(opts: { max: number; ttlMs: number; now?: () => number }): TtlLru<V> {
  const now = opts.now ?? Date.now;
  const map = new Map<string, { value: V; expires: number }>();
  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return undefined;
      if (hit.expires <= now()) {
        map.delete(key);
        return undefined;
      }
      map.delete(key);
      map.set(key, hit);
      return hit.value;
    },
    set(key, value, ttlMs = opts.ttlMs) {
      map.delete(key);
      map.set(key, { value, expires: now() + ttlMs });
      while (map.size > opts.max) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        map.delete(oldest);
      }
    },
    delete: (key) => void map.delete(key),
    get size() {
      return map.size;
    },
    clear: () => map.clear(),
  };
}

/** Caches the promise so concurrent callers share one lookup. Failed results are dropped. */
export function memoize<V>(cache: TtlLru<Promise<V>>, key: string, load: () => Promise<V>, keep: (v: V) => boolean): Promise<V> {
  const hit = cache.get(key);
  if (hit) return hit;
  const p = load();
  cache.set(key, p);
  p.then(
    (v) => keep(v) || cache.delete(key),
    () => cache.delete(key),
  );
  return p;
}
