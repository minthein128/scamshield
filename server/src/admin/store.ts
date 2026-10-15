import type { Firestore } from 'firebase-admin/firestore';
import { HOTLINES } from '../data/hotlines.generated.js';
import { getDb } from '../intel/firestore.js';
import { log } from '../log.js';
import { applyChange, bundledToItem, ConflictError } from './changes.js';
import type { AdminRecord, AnyDoc, AuditEntry, Collection, ConfigDoc, ContentDoc, Draft, HotlinesDoc, NoticesDoc } from './schema.js';

export const CONFIG = 'config';
export const DRAFTS = 'config_drafts';
export const AUDIT = 'config_audit';
export const ADMINS = 'admins';

export class NotFoundError extends Error {}

export type DocOf<C extends Collection> = C extends 'hotlines' ? HotlinesDoc : C extends 'notices' ? NoticesDoc : ContentDoc;

export interface DraftFilter {
  status?: Draft['status'];
  collection?: Collection;
  limit?: number;
}

export interface ConfigStore {
  getDoc<C extends Collection>(name: C): Promise<DocOf<C> | undefined>;
  /** Writes a whole published doc. Skips when a version exists unless force. */
  seed<C extends Collection>(
    name: C,
    items: DocOf<C>['items'],
    by: string,
    force: boolean,
  ): Promise<{ result: 'created' | 'replaced' | 'skipped'; version: number }>;
  createDraft(draft: Omit<Draft, 'id' | 'status'>): Promise<Draft>;
  getDraft(id: string): Promise<Draft | undefined>;
  listDrafts(filter?: DraftFilter): Promise<Draft[]>;
  approveDraft(id: string, by: string): Promise<{ draft: Draft; version: number; audit: AuditEntry }>;
  rejectDraft(id: string, by: string, note?: string): Promise<Draft>;
  listAudit(limit: number): Promise<AuditEntry[]>;
  getAdmin(uid: string): Promise<AdminRecord | undefined>;
  setAdmin(rec: AdminRecord): Promise<void>;
  listAdmins(): Promise<AdminRecord[]>;
}

export function emptyDoc<C extends Collection>(name: C, at?: string): DocOf<C> {
  if (name === 'hotlines') {
    const stamp = at ?? '1970-01-01T00:00:00.000Z';
    return { version: 0, items: HOTLINES.map((h) => bundledToItem(h, stamp)) } as DocOf<C>;
  }
  return { version: 0, items: name === 'notices' ? [] : {} } as DocOf<C>;
}

interface Plan {
  doc: AnyDoc;
  draft: Draft;
  audit: Omit<AuditEntry, 'id'>;
}

/** Pure approval step shared by both stores so the transaction body stays small. */
export function planApproval(draft: Draft | undefined, current: AnyDoc | undefined, by: string, at: string): Plan {
  if (!draft) throw new NotFoundError('draft not found');
  if (draft.status !== 'pending') throw new ConflictError(`draft is already ${draft.status}`);
  const base = (current ?? emptyDoc(draft.collection, at)) as AnyDoc;
  const result = applyChange(draft.collection, base, draft, { by, at });
  return {
    doc: { version: base.version + 1, updatedAt: at, updatedBy: by, items: result.items } as AnyDoc,
    draft: { ...draft, status: 'approved', reviewedBy: by, reviewedAt: at },
    audit: { at, by, action: `${draft.op}`, collection: draft.collection, before: result.before, after: result.after, draftId: draft.id },
  };
}

function rejection(draft: Draft | undefined, by: string, at: string, note?: string): Draft {
  if (!draft) throw new NotFoundError('draft not found');
  if (draft.status !== 'pending') throw new ConflictError(`draft is already ${draft.status}`);
  const out: Draft = { ...draft, status: 'rejected', reviewedBy: by, reviewedAt: at };
  if (note) out.reviewNote = note;
  return out;
}

export function createMemoryStore(now: () => string = () => new Date().toISOString()): ConfigStore {
  const docs = new Map<string, AnyDoc>();
  const drafts = new Map<string, Draft>();
  const audit: AuditEntry[] = [];
  const admins = new Map<string, AdminRecord>();
  let seq = 0;
  const nextId = (p: string) => `${p}${String(++seq).padStart(6, '0')}`;
  return {
    async getDoc(name) {
      return structuredClone(docs.get(name)) as never;
    },
    async seed(name, items, by, force) {
      const existing = docs.get(name);
      if (existing && existing.version >= 1 && !force) return { result: 'skipped', version: existing.version };
      const version = (existing?.version ?? 0) + 1;
      docs.set(name, { version, updatedAt: now(), updatedBy: by, items } as AnyDoc);
      audit.push({ id: nextId('a'), at: now(), by, action: 'seed', collection: name, before: existing ?? null, after: { version } });
      return { result: existing ? 'replaced' : 'created', version };
    },
    async createDraft(d) {
      const draft: Draft = { ...d, id: nextId('d'), status: 'pending' };
      drafts.set(draft.id, draft);
      return structuredClone(draft);
    },
    async getDraft(id) {
      return structuredClone(drafts.get(id));
    },
    async listDrafts(f = {}) {
      return [...drafts.values()]
        .filter((d) => (!f.status || d.status === f.status) && (!f.collection || d.collection === f.collection))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, f.limit ?? 200)
        .map((d) => structuredClone(d));
    },
    async approveDraft(id, by) {
      const draft = drafts.get(id);
      const plan = planApproval(structuredClone(draft), structuredClone(draft ? docs.get(draft.collection) : undefined), by, now());
      docs.set(plan.draft.collection, plan.doc);
      drafts.set(id, plan.draft);
      const entry: AuditEntry = { id: nextId('a'), ...plan.audit };
      audit.push(entry);
      return { draft: structuredClone(plan.draft), version: plan.doc.version, audit: entry };
    },
    async rejectDraft(id, by, note) {
      const next = rejection(drafts.get(id), by, now(), note);
      drafts.set(id, next);
      audit.push({
        id: nextId('a'),
        at: now(),
        by,
        action: 'reject',
        collection: next.collection,
        before: next.item,
        after: null,
        draftId: id,
      });
      return structuredClone(next);
    },
    async listAudit(limit) {
      return [...audit].reverse().slice(0, limit);
    },
    async getAdmin(uid) {
      return admins.get(uid);
    },
    async setAdmin(rec) {
      admins.set(rec.uid, rec);
    },
    async listAdmins() {
      return [...admins.values()];
    },
  };
}

export function createFirestoreConfigStore(opts: { projectId?: string; db?: Firestore } = {}): ConfigStore {
  const db = opts.db ?? getDb(opts.projectId);
  const now = () => new Date().toISOString();
  const docRef = (name: Collection) => db.collection(CONFIG).doc(name);
  const fromSnap = <T>(s: { id: string; data(): Record<string, unknown> | undefined }) => ({ ...(s.data() as object), id: s.id }) as T;

  return {
    async getDoc(name) {
      const snap = await docRef(name).get();
      return snap.exists ? (snap.data() as never) : undefined;
    },
    async seed(name, items, by, force) {
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef(name));
        const existing = snap.data() as AnyDoc | undefined;
        if (existing && existing.version >= 1 && !force) return { result: 'skipped' as const, version: existing.version };
        const version = (existing?.version ?? 0) + 1;
        const at = now();
        tx.set(docRef(name), { version, updatedAt: at, updatedBy: by, items });
        tx.set(db.collection(AUDIT).doc(), {
          at,
          by,
          action: 'seed',
          collection: name,
          before: existing ? { version: existing.version } : null,
          after: { version },
        });
        return { result: existing ? ('replaced' as const) : ('created' as const), version };
      });
    },
    async createDraft(d) {
      const ref = db.collection(DRAFTS).doc();
      const draft: Draft = { ...d, id: ref.id, status: 'pending' };
      const { id: _id, ...data } = draft;
      await ref.set(data);
      return draft;
    },
    async getDraft(id) {
      const s = await db.collection(DRAFTS).doc(id).get();
      return s.exists ? fromSnap<Draft>(s) : undefined;
    },
    async listDrafts(f = {}) {
      const col = db.collection(DRAFTS);
      const limit = f.limit ?? 200;
      const q = f.status ? col.where('status', '==', f.status).limit(500) : col.orderBy('createdAt', 'desc').limit(limit);
      const rows = (await q.get()).docs.map((s) => fromSnap<Draft>(s));
      return rows
        .filter((d) => !f.collection || d.collection === f.collection)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
    async approveDraft(id, by) {
      const at = now();
      const auditRef = db.collection(AUDIT).doc();
      const plan = await db.runTransaction(async (tx) => {
        const dSnap = await tx.get(db.collection(DRAFTS).doc(id));
        const draft = dSnap.exists ? fromSnap<Draft>(dSnap) : undefined;
        const cSnap = draft ? await tx.get(docRef(draft.collection)) : undefined;
        const p = planApproval(draft, cSnap?.exists ? (cSnap.data() as AnyDoc) : undefined, by, at);
        tx.set(docRef(p.draft.collection), p.doc);
        const { id: _id, ...draftData } = p.draft;
        tx.set(db.collection(DRAFTS).doc(id), draftData);
        tx.set(auditRef, p.audit);
        return p;
      });
      return { draft: plan.draft, version: plan.doc.version, audit: { id: auditRef.id, ...plan.audit } };
    },
    async rejectDraft(id, by, note) {
      const at = now();
      return db.runTransaction(async (tx) => {
        const ref = db.collection(DRAFTS).doc(id);
        const s = await tx.get(ref);
        const next = rejection(s.exists ? fromSnap<Draft>(s) : undefined, by, at, note);
        const { id: _id, ...data } = next;
        tx.set(ref, data);
        tx.set(db.collection(AUDIT).doc(), {
          at,
          by,
          action: 'reject',
          collection: next.collection,
          before: next.item,
          after: null,
          draftId: id,
        });
        return next;
      });
    },
    async listAudit(limit) {
      return (await db.collection(AUDIT).orderBy('at', 'desc').limit(limit).get()).docs.map((s) => fromSnap<AuditEntry>(s));
    },
    async getAdmin(uid) {
      const s = await db.collection(ADMINS).doc(uid).get();
      return s.exists ? ({ ...(s.data() as object), uid } as AdminRecord) : undefined;
    },
    async setAdmin(rec) {
      const { uid, ...data } = rec;
      await db.collection(ADMINS).doc(uid).set(data);
    },
    async listAdmins() {
      return (await db.collection(ADMINS).limit(200).get()).docs.map((s) => ({ ...(s.data() as object), uid: s.id }) as AdminRecord);
    },
  };
}

export interface Published<C extends Collection> {
  doc: DocOf<C>;
  source: 'firestore' | 'bundled';
}

export const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timeout after ${ms} ms`)), ms).unref())]);

/** Reads a published doc. Firestore errors, timeouts and empty docs fall back to the bundled data. */
export async function loadPublished<C extends Collection>(store: ConfigStore, name: C, timeoutMs = 4000): Promise<Published<C>> {
  try {
    const doc = await withTimeout(store.getDoc(name), timeoutMs);
    if (doc && doc.version >= 1) return { doc: doc as DocOf<C>, source: 'firestore' };
  } catch (err) {
    log('WARNING', 'config_load_failed', { collection: name, error: (err as Error).message.slice(0, 160) });
  }
  return { doc: emptyDoc(name), source: 'bundled' };
}

export type { ConfigDoc };
