import { createHash } from 'node:crypto';
import { type Context, Hono } from 'hono';
import { HOTLINES as BUNDLED, type Hotline } from '../data/hotlines.generated.js';
import { log } from '../log.js';
import type { Collection, ContentTexts, HotlineItem, Notice } from './schema.js';
import { CONTENT_LANGS } from './schema.js';
import { type ConfigStore, type DocOf, emptyDoc, withTimeout } from './store.js';

interface Entry {
  doc: DocOf<Collection>;
  source: 'firestore' | 'bundled';
  at: number;
}

export interface PublishedCache {
  get<C extends Collection>(name: C): Promise<{ doc: DocOf<C>; source: 'firestore' | 'bundled' }>;
  /** Last known published hotlines for synchronous callers; the bundled list until the first load. */
  hotlines(): Hotline[];
  invalidate(name: Collection): void;
  start(): void;
  stop(): void;
}

export function createPublishedCache(
  store: ConfigStore,
  opts: { ttlMs?: number; timeoutMs?: number; now?: () => number } = {},
): PublishedCache {
  const ttl = opts.ttlMs ?? 60_000;
  const timeout = opts.timeoutMs ?? 4000;
  const now = opts.now ?? Date.now;
  const entries = new Map<Collection, Entry>();
  const inflight = new Map<Collection, Promise<Entry>>();
  let timer: NodeJS.Timeout | undefined;

  async function load(name: Collection): Promise<Entry> {
    try {
      const doc = await withTimeout(store.getDoc(name), timeout);
      const entry: Entry =
        doc && doc.version >= 1 ? { doc, source: 'firestore', at: now() } : { doc: emptyDoc(name), source: 'bundled', at: now() };
      entries.set(name, entry);
      return entry;
    } catch (err) {
      log('WARNING', 'config_load_failed', { collection: name, error: (err as Error).message.slice(0, 160) });
      const last = entries.get(name);
      const entry: Entry = last
        ? { ...last, at: now() - ttl + 10_000 }
        : { doc: emptyDoc(name), source: 'bundled', at: now() - ttl + 10_000 };
      entries.set(name, entry);
      return entry;
    }
  }

  function refresh(name: Collection): Promise<Entry> {
    let p = inflight.get(name);
    if (!p) {
      p = load(name).finally(() => inflight.delete(name));
      inflight.set(name, p);
    }
    return p;
  }

  return {
    async get(name) {
      const hit = entries.get(name);
      const entry = hit && now() - hit.at < ttl ? hit : await refresh(name);
      return entry as never;
    },
    hotlines() {
      const doc = entries.get('hotlines')?.doc as DocOf<'hotlines'> | undefined;
      return doc ? doc.items.filter((h) => h.status !== 'retired') : BUNDLED;
    },
    invalidate(name) {
      entries.delete(name);
      if (name === 'hotlines') void refresh(name);
    },
    start() {
      void refresh('hotlines');
      timer = setInterval(() => void refresh('hotlines'), ttl);
      timer.unref();
    },
    stop() {
      if (timer) clearInterval(timer);
    },
  };
}

const publicHotline = ({ history: _h, verifiedBy: _v, ...rest }: HotlineItem) => rest;

export function activeNotices(items: Notice[], q: { country?: string; language?: string }, at = Date.now()): Notice[] {
  return items.filter((n) => {
    if (!n.enabled) return false;
    if (n.startsAt && Date.parse(n.startsAt) > at) return false;
    if (n.endsAt && Date.parse(n.endsAt) < at) return false;
    if (q.country && n.country?.length && !n.country.includes(q.country)) return false;
    if (q.language && n.language?.length && !n.language.includes(q.language as never)) return false;
    return true;
  });
}

export function contentFor(items: Record<string, ContentTexts>, language?: string): Record<string, unknown> {
  if (!language) return items;
  const out: Record<string, string> = {};
  for (const [key, texts] of Object.entries(items)) {
    const text = texts[language as keyof ContentTexts];
    if (text) out[key] = text;
  }
  return out;
}

export function createConfigRoutes(cache: PublishedCache) {
  const app = new Hono();

  const reply = (c: Context, body: unknown) => {
    const etag = `W/"${createHash('sha1').update(JSON.stringify(body)).digest('hex').slice(0, 16)}"`;
    c.header('Cache-Control', 'public, max-age=300');
    c.header('ETag', etag);
    if (c.req.header('if-none-match') === etag) return c.body(null, 304);
    return c.json(body);
  };

  app.get('/hotlines', async (c) => {
    const { doc } = await cache.get('hotlines');
    return reply(c, { version: doc.version, items: doc.items.filter((h) => h.status !== 'retired').map(publicHotline) });
  });

  app.get('/notices', async (c) => {
    const { doc } = await cache.get('notices');
    const country = c.req.query('country')?.toUpperCase();
    const language = c.req.query('language');
    return reply(c, { version: doc.version, items: activeNotices(doc.items, { country, language }) });
  });

  app.get('/content', async (c) => {
    const { doc } = await cache.get('content');
    const language = c.req.query('language');
    if (language && !CONTENT_LANGS.includes(language as never))
      return c.json({ error: { code: 'bad_request', message: 'language must be en, my, id, tl or th' } }, 400);
    return reply(c, { version: doc.version, items: contentFor(doc.items, language) });
  });

  return app;
}
