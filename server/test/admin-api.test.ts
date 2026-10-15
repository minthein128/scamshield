import { beforeEach, describe, expect, it } from 'vitest';
import { bundledToItem } from '../src/admin/changes.js';
import { createMemoryStore } from '../src/admin/store.js';
import { createApp } from '../src/app.js';
import type { Identity, TokenVerifier } from '../src/auth.js';
import { loadConfig } from '../src/config.js';
import { HOTLINES } from '../src/data/hotlines.generated.js';
import { createMockCorrelator, createMockExtractor, createMockGrounder } from '../src/mock.js';
import { createPipeline } from '../src/pipeline.js';
import { createMockSpeaker } from '../src/speak.js';

const ids: Record<string, Identity> = {
  admin: { uid: 'u-admin', anonymous: false },
  editor: { uid: 'u-editor', anonymous: false },
  nobody: { uid: 'u-nobody', anonymous: false },
};
const verifier: TokenVerifier = async (t) => ids[t] ?? null;

const newLine = {
  id: 'la-test-line',
  country: 'LA',
  category: 'trafficking',
  name: 'Test anti-trafficking line',
  number: '1234',
  dial: '1234',
  sourceUrl: 'https://example.gov.la/contact',
};

let store: ReturnType<typeof createMemoryStore>;
let app: ReturnType<typeof createApp>;
let published: string[];

beforeEach(async () => {
  store = createMemoryStore();
  published = [];
  await store.setAdmin({ uid: 'u-admin', email: 'a@x.org', role: 'admin', addedBy: 'cli', addedAt: 't' });
  await store.setAdmin({ uid: 'u-editor', email: 'e@x.org', role: 'editor', addedBy: 'cli', addedAt: 't' });
  await store.seed(
    'hotlines',
    HOTLINES.map((h) => bundledToItem(h, '2026-10-15T00:00:00.000Z')),
    'seed',
    false,
  );
  const cfg = loadConfig({ MOCK: '1', RATE_LIMIT_PER_MIN: '1000' });
  const pipeline = createPipeline({
    extractor: createMockExtractor(),
    correlator: createMockCorrelator(),
    grounder: createMockGrounder(),
    model: cfg.model,
  });
  app = createApp(cfg, pipeline, createMockSpeaker(cfg), undefined, verifier, undefined, undefined, {
    store,
    verifier,
    onPublished: (c) => published.push(c),
  });
});

const call = (method: string, path: string, token?: string, body?: unknown) =>
  app.request(`/v1/admin${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const draft = (token: string, over: Record<string, unknown> = {}) =>
  call('POST', '/drafts', token, { collection: 'hotlines', op: 'add', item: newLine, reason: 'Found on the official site', ...over });

describe('admin API', () => {
  it('me: 401 without a token, 403 for a non-admin, role for an admin', async () => {
    expect((await call('GET', '/me')).status).toBe(401);
    expect((await call('GET', '/me', 'nobody')).status).toBe(403);
    expect(await (await call('GET', '/me', 'editor')).json()).toEqual({ uid: 'u-editor', email: 'e@x.org', role: 'editor' });
  });

  it('lists the published hotlines with pending drafts', async () => {
    await draft('editor');
    const body = (await (await call('GET', '/hotlines', 'editor')).json()) as { version: number; items: unknown[]; drafts: unknown[] };
    expect(body.version).toBe(1);
    expect(body.items).toHaveLength(HOTLINES.length);
    expect(body.drafts).toHaveLength(1);
  });

  it('an editor drafts, cannot approve; an admin approves, bumping the version and auditing', async () => {
    const created = (await (await draft('editor')).json()) as { id: string; status: string; createdBy: string };
    expect(created).toMatchObject({ status: 'pending', createdBy: 'u-editor' });
    expect((await call('POST', `/drafts/${created.id}/approve`, 'editor')).status).toBe(403);
    expect((await call('POST', `/drafts/${created.id}/reject`, 'editor')).status).toBe(403);

    const approved = (await (await call('POST', `/drafts/${created.id}/approve`, 'admin')).json()) as {
      version: number;
      audit: { by: string; action: string };
    };
    expect(approved.version).toBe(2);
    expect(approved.audit).toMatchObject({ by: 'u-admin', action: 'add' });
    expect(published).toEqual(['hotlines']);

    const list = (await (await call('GET', '/hotlines', 'admin')).json()) as {
      version: number;
      items: Array<{ id: string; verifiedBy?: { uid: string }; history?: unknown[] }>;
    };
    expect(list.version).toBe(2);
    const added = list.items.find((i) => i.id === 'la-test-line');
    expect(added?.verifiedBy?.uid).toBe('u-admin');
    expect(added?.history).toHaveLength(1);

    const audit = (await (await call('GET', '/audit?limit=5', 'editor')).json()) as { entries: Array<{ draftId?: string }> };
    expect(audit.entries[0]?.draftId).toBe(created.id);
    expect((await call('POST', `/drafts/${created.id}/approve`, 'admin')).status).toBe(409);
  });

  it('rejecting leaves the published list unchanged', async () => {
    const created = (await (await draft('editor')).json()) as { id: string };
    const res = await call('POST', `/drafts/${created.id}/reject`, 'admin', { note: 'unsourced' });
    expect(await res.json()).toMatchObject({ status: 'rejected', reviewNote: 'unsourced' });
    const list = (await (await call('GET', '/hotlines', 'admin')).json()) as { version: number; items: unknown[] };
    expect(list.version).toBe(1);
    expect(list.items).toHaveLength(HOTLINES.length);
  });

  it('update and delete apply by id; retiring keeps the item', async () => {
    const target = HOTLINES[0]?.id as string;
    const current = (await store.getDoc('hotlines'))?.items.find((i) => i.id === target) as unknown as Record<string, unknown>;
    const { history: _h, verifiedBy: _v, ...editable } = current;
    const upd = (await (
      await draft('editor', { op: 'update', item: { ...editable, status: 'retired' }, reason: 'Line disconnected' })
    ).json()) as { id: string };
    await call('POST', `/drafts/${upd.id}/approve`, 'admin');
    const after = (await store.getDoc('hotlines'))?.items.find((i) => i.id === target);
    expect(after?.status).toBe('retired');
    expect(after?.history?.length).toBe(2);

    const del = (await (await draft('editor', { op: 'delete', item: { id: target }, reason: 'Duplicate entry' })).json()) as { id: string };
    await call('POST', `/drafts/${del.id}/approve`, 'admin');
    expect((await store.getDoc('hotlines'))?.items.some((i) => i.id === target)).toBe(false);
  });

  it('validates the hotline shape', async () => {
    const bad = async (item: Record<string, unknown>) => (await draft('editor', { item: { ...newLine, ...item } })).status;
    expect(await bad({ sourceUrl: undefined })).toBe(400);
    expect(await bad({ sourceUrl: 'http://insecure.example/' })).toBe(400);
    expect(await bad({ dial: '12 34' })).toBe(400);
    expect(await bad({ country: 'ZZ' })).toBe(400);
    expect(await bad({ category: 'friends' })).toBe(400);
    expect(await bad({ id: 'Bad Id' })).toBe(400);
    expect(await bad({ dial: undefined, number: undefined, reportUrl: 'https://example.gov.la/report' })).toBe(201);
    expect((await draft('editor', { reason: '' })).status).toBe(400);
  });

  it('rejects a duplicate add and an update of a missing id', async () => {
    expect((await draft('editor', { item: { ...newLine, id: HOTLINES[0]?.id } })).status).toBe(409);
    expect((await draft('editor', { op: 'update' })).status).toBe(404);
  });

  it('notices and content follow the same draft flow', async () => {
    const notice = {
      id: 'sms-scam-wave',
      title: 'SMS scams rising',
      body: 'Messages about parcels may be scams.',
      severity: 'warning',
      enabled: true,
      country: ['TH'],
    };
    const n = (await (await draft('editor', { collection: 'notices', item: notice })).json()) as { id: string };
    expect(((await (await call('POST', `/drafts/${n.id}/approve`, 'admin')).json()) as { version: number }).version).toBe(1);
    const content = { key: 'report:flags.too_good', en: 'The pay looks higher than usual.', my: 'x' };
    const c = (await (await draft('editor', { collection: 'content', item: content })).json()) as { id: string };
    await call('POST', `/drafts/${c.id}/approve`, 'admin');
    expect((await store.getDoc('content'))?.items['report:flags.too_good']).toEqual({ en: content.en, my: 'x' });
    expect((await draft('editor', { collection: 'notices', item: { ...notice, id: 'x', severity: 'critical' } })).status).toBe(400);
  });
});
