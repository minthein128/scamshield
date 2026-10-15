import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { TokenVerifier } from '../auth.js';
import { log } from '../log.js';
import { ApiError } from '../types.js';
import { adminOf, requireAdmin, requireRole } from './auth.js';
import { ConflictError } from './changes.js';
import { COLLECTIONS, type Collection, type Draft, draftInputSchema, ValidationError, validateItem } from './schema.js';
import { type ConfigStore, loadPublished, NotFoundError } from './store.js';

export interface AdminDeps {
  store: ConfigStore;
  verifier?: TokenVerifier;
  /** Called after a draft is approved so readers drop their cached copy. */
  onPublished?: (collection: Collection) => void;
  now?: () => string;
}

const tooLarge = (c: { json(body: unknown, status: 413): Response }) =>
  c.json({ error: { code: 'too_large', message: 'Body exceeds 65536 bytes' } }, 413);

async function readJson(c: { req: { json(): Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ApiError(400, 'bad_request', 'Body must be valid JSON');
  }
}

function mapError(err: unknown): never {
  if (err instanceof ApiError) throw err;
  if (err instanceof ValidationError) throw new ApiError(400, 'bad_request', err.message);
  if (err instanceof NotFoundError) throw new ApiError(404, 'not_found', err.message);
  if (err instanceof ConflictError) throw new ApiError(409, 'conflict', err.message);
  log('ERROR', 'admin_store_failed', { error: (err as Error).message.slice(0, 160) });
  throw new ApiError(502, 'upstream', 'The config store is unavailable');
}

const isCollection = (v: string | undefined): v is Collection => COLLECTIONS.includes(v as Collection);

export function createAdminRoutes(deps: AdminDeps) {
  const { store, onPublished } = deps;
  const now = deps.now ?? (() => new Date().toISOString());
  const app = new Hono();

  app.use('*', requireAdmin(deps.verifier, store));
  app.use('*', bodyLimit({ maxSize: 64 * 1024, onError: tooLarge }));

  app.get('/me', (c) => c.json(adminOf(c)));

  for (const name of COLLECTIONS) {
    app.get(`/${name}`, async (c) => {
      try {
        const [published, drafts] = await Promise.all([
          loadPublished(store, name),
          store.listDrafts({ status: 'pending', collection: name }),
        ]);
        const { version, updatedAt, updatedBy, items } = published.doc;
        return c.json({ version, updatedAt, updatedBy, source: published.source, items, drafts });
      } catch (err) {
        return mapError(err);
      }
    });
  }

  app.get('/drafts', async (c) => {
    const status = c.req.query('status');
    const collection = c.req.query('collection');
    if (status && !['pending', 'approved', 'rejected'].includes(status))
      throw new ApiError(400, 'bad_request', 'status must be pending, approved or rejected');
    if (collection && !isCollection(collection)) throw new ApiError(400, 'bad_request', 'collection must be hotlines, notices or content');
    try {
      const drafts = await store.listDrafts({
        status: status as Draft['status'] | undefined,
        collection: collection as Collection | undefined,
        limit: clampLimit(c.req.query('limit'), 200),
      });
      return c.json({ drafts });
    } catch (err) {
      return mapError(err);
    }
  });

  app.post('/drafts', async (c) => {
    const admin = adminOf(c);
    const parsed = draftInputSchema.safeParse(await readJson(c));
    if (!parsed.success)
      throw new ApiError(400, 'bad_request', parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '));
    const { collection, op, reason, aiSource } = parsed.data;
    try {
      const item = validateItem(collection, op, parsed.data.item);
      const key = String(collection === 'content' ? item.key : item.id);
      const current = (await loadPublished(store, collection)).doc.items as unknown;
      const exists = Array.isArray(current) ? current.some((x: { id: string }) => x.id === key) : key in (current as object);
      if (op === 'add' && exists) throw new ConflictError(`${key} already exists`);
      if (op !== 'add' && !exists) throw new NotFoundError(`${key} does not exist`);
      const draft = await store.createDraft({
        collection,
        op,
        item,
        reason,
        ...(aiSource ? { aiSource } : {}),
        createdBy: admin.uid,
        createdAt: now(),
      });
      log('INFO', 'admin_draft_created', { uid: admin.uid, draftId: draft.id, collection, op, ai: Boolean(aiSource) });
      return c.json(draft, 201);
    } catch (err) {
      return mapError(err);
    }
  });

  app.post('/drafts/:id/approve', requireRole('admin'), async (c) => {
    const admin = adminOf(c);
    try {
      const out = await store.approveDraft(c.req.param('id'), admin.uid);
      onPublished?.(out.draft.collection);
      log('INFO', 'admin_draft_approved', {
        uid: admin.uid,
        draftId: out.draft.id,
        collection: out.draft.collection,
        version: out.version,
      });
      return c.json(out);
    } catch (err) {
      return mapError(err);
    }
  });

  app.post('/drafts/:id/reject', requireRole('admin'), async (c) => {
    const admin = adminOf(c);
    const body = (await c.req.json().catch(() => ({}))) as { note?: unknown };
    const note = typeof body.note === 'string' ? body.note.slice(0, 500) : undefined;
    try {
      const draft = await store.rejectDraft(c.req.param('id'), admin.uid, note);
      log('INFO', 'admin_draft_rejected', { uid: admin.uid, draftId: draft.id, collection: draft.collection });
      return c.json(draft);
    } catch (err) {
      return mapError(err);
    }
  });

  app.get('/audit', async (c) => {
    try {
      return c.json({ entries: await store.listAudit(clampLimit(c.req.query('limit'), 50)) });
    } catch (err) {
      return mapError(err);
    }
  });

  return app;
}

function clampLimit(raw: string | undefined, fallback: number): number {
  const n = Number(raw ?? fallback);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, 500) : fallback;
}
