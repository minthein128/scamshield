import { describe, expect, it } from 'vitest';
import { bundledToItem } from '../src/admin/changes.js';
import { type ConfigStore, createMemoryStore, emptyDoc, loadPublished } from '../src/admin/store.js';
import { HOTLINES } from '../src/data/hotlines.generated.js';

describe('config store', () => {
  it('falls back to the bundled hotlines when nothing is published', async () => {
    const out = await loadPublished(createMemoryStore(), 'hotlines');
    expect(out.source).toBe('bundled');
    expect(out.doc.items).toHaveLength(HOTLINES.length);
    expect(out.doc.version).toBe(0);
  });

  it('falls back when the store throws or hangs', async () => {
    const broken = { getDoc: () => Promise.reject(new Error('unreachable')) } as unknown as ConfigStore;
    expect((await loadPublished(broken, 'hotlines')).source).toBe('bundled');
    const hung = { getDoc: () => new Promise(() => undefined) } as unknown as ConfigStore;
    expect((await loadPublished(hung, 'hotlines', 20)).doc.items).toHaveLength(HOTLINES.length);
  });

  it('seeds once and skips unless forced', async () => {
    const store = createMemoryStore();
    const items = HOTLINES.map((h) => bundledToItem(h, '2026-10-15T00:00:00.000Z'));
    expect(await store.seed('hotlines', items, 'seed', false)).toEqual({ result: 'created', version: 1 });
    expect(await store.seed('hotlines', items, 'seed', false)).toEqual({ result: 'skipped', version: 1 });
    expect(await store.seed('hotlines', items, 'seed', true)).toEqual({ result: 'replaced', version: 2 });
    const out = await loadPublished(store, 'hotlines');
    expect(out.source).toBe('firestore');
    expect(out.doc.items[0]).toMatchObject({ status: 'published', source: { fetchedBy: 'human' } });
  });

  it('empty notices and content docs start at version 0', () => {
    expect(emptyDoc('notices')).toEqual({ version: 0, items: [] });
    expect(emptyDoc('content')).toEqual({ version: 0, items: {} });
  });
});
