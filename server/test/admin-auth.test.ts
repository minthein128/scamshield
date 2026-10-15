import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { adminOf, requireAdmin, requireRole } from '../src/admin/auth.js';
import { createMemoryStore } from '../src/admin/store.js';
import type { Identity, TokenVerifier } from '../src/auth.js';
import { ApiError } from '../src/types.js';

const ids: Record<string, Identity> = {
  a: { uid: 'u-admin', anonymous: false },
  e: { uid: 'u-editor', anonymous: false },
  n: { uid: 'u-nobody', anonymous: false },
  anon: { uid: 'u-admin', anonymous: true },
};
const verifier: TokenVerifier = async (t) => ids[t] ?? null;

async function make() {
  const store = createMemoryStore();
  await store.setAdmin({ uid: 'u-admin', email: 'a@x.org', role: 'admin', addedBy: 'cli', addedAt: 't' });
  await store.setAdmin({ uid: 'u-editor', email: 'e@x.org', role: 'editor', addedBy: 'cli', addedAt: 't' });
  const app = new Hono();
  app.use('*', requireAdmin(verifier, store));
  app.get('/who', (c) => c.json(adminOf(c)));
  app.get('/pub', requireRole('admin'), (c) => c.json({ ok: true }));
  app.onError((err, c) => (err instanceof ApiError ? c.json({ code: err.code }, err.status) : c.json({}, 500)));
  return app;
}
const get = (app: Hono, path: string, token?: string) => app.request(path, { headers: token ? { authorization: `Bearer ${token}` } : {} });

describe('admin auth', () => {
  it('401 without a token or with a bad one', async () => {
    const app = await make();
    expect((await get(app, '/who')).status).toBe(401);
    expect((await get(app, '/who', 'bogus')).status).toBe(401);
  });

  it('403 for a signed-in user without an admins record, and for anonymous tokens', async () => {
    const app = await make();
    expect((await get(app, '/who', 'n')).status).toBe(403);
    expect((await get(app, '/who', 'anon')).status).toBe(403);
  });

  it('resolves role and email from admins/{uid}', async () => {
    const app = await make();
    expect(await (await get(app, '/who', 'e')).json()).toEqual({ uid: 'u-editor', email: 'e@x.org', role: 'editor' });
  });

  it('an editor cannot reach an admin-only route', async () => {
    const app = await make();
    expect((await get(app, '/pub', 'e')).status).toBe(403);
    expect((await get(app, '/pub', 'a')).status).toBe(200);
  });
});
