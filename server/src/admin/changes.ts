import type { Hotline } from '../data/hotlines.generated.js';
import {
  type AnyDoc,
  type Collection,
  type ContentDoc,
  type ContentTexts,
  type Draft,
  type HotlineItem,
  type HotlinesDoc,
  hotlineInputSchema,
  type Notice,
  type NoticesDoc,
} from './schema.js';

export class ConflictError extends Error {}

export interface ChangeContext {
  by: string;
  at: string;
}

const today = (at: string) => at.slice(0, 10);

type HotlineInput = ReturnType<typeof hotlineInputSchema.parse>;

/** Fills the fields the server owns: source, verifiedOn, history. */
export function toHotlineItem(
  input: HotlineInput,
  ctx: ChangeContext,
  opts: { ai?: boolean; prior?: HotlineItem; change: string; verified?: boolean },
): HotlineItem {
  const sourceUrl = input.sourceUrl ?? (input.reportUrl as string);
  const verifiedOn = input.verifiedOn ?? today(ctx.at);
  const item: HotlineItem = {
    ...input,
    sourceUrl,
    verifiedOn,
    status: input.status,
    source: input.source ?? { url: sourceUrl, asOf: input.asOf ?? verifiedOn, fetchedBy: opts.ai ? 'ai' : 'human' },
    history: [...(opts.prior?.history ?? []), { at: ctx.at, by: ctx.by, change: opts.change }],
  };
  if (opts.verified) item.verifiedBy = { uid: ctx.by, at: ctx.at };
  else if (opts.prior?.verifiedBy) item.verifiedBy = opts.prior.verifiedBy;
  return item;
}

/** Converts a bundled hotline into a published item (used by the seed script). */
export function bundledToItem(h: Hotline, at: string): HotlineItem {
  const input = hotlineInputSchema.parse({ ...h, status: 'published' });
  const item = toHotlineItem(input, { by: 'seed', at }, { change: 'seeded from bundled data' });
  item.source = { url: h.sourceUrl, asOf: h.asOf ?? h.verifiedOn, fetchedBy: 'human' };
  return item;
}

export interface ChangeResult<D extends AnyDoc> {
  items: D['items'];
  before: unknown;
  after: unknown;
}

function applyList<T extends { id: string }>(
  list: T[],
  draft: Draft,
  build: (prior?: T) => T,
): { items: T[]; before: unknown; after: unknown } {
  const id = String(draft.item.id);
  const idx = list.findIndex((x) => x.id === id);
  if (draft.op === 'add') {
    if (idx >= 0) throw new ConflictError(`${id} already exists`);
    const next = build();
    return { items: [...list, next], before: null, after: next };
  }
  if (idx < 0) throw new ConflictError(`${id} does not exist`);
  const prior = list[idx] as T;
  if (draft.op === 'delete') return { items: list.filter((_, i) => i !== idx), before: prior, after: null };
  const next = build(prior);
  return { items: list.map((x, i) => (i === idx ? next : x)), before: prior, after: next };
}

export function applyChange(collection: 'hotlines', doc: HotlinesDoc, draft: Draft, ctx: ChangeContext): ChangeResult<HotlinesDoc>;
export function applyChange(collection: 'notices', doc: NoticesDoc, draft: Draft, ctx: ChangeContext): ChangeResult<NoticesDoc>;
export function applyChange(collection: 'content', doc: ContentDoc, draft: Draft, ctx: ChangeContext): ChangeResult<ContentDoc>;
export function applyChange(collection: Collection, doc: AnyDoc, draft: Draft, ctx: ChangeContext): ChangeResult<AnyDoc>;
export function applyChange(collection: Collection, doc: AnyDoc, draft: Draft, ctx: ChangeContext): ChangeResult<AnyDoc> {
  if (collection === 'hotlines') {
    const list = (doc as HotlinesDoc).items;
    return applyList(list, draft, (prior) =>
      toHotlineItem(draft.item as HotlineInput, ctx, {
        ai: Boolean(draft.aiSource),
        prior,
        change: `${draft.op} via draft ${draft.id}: ${draft.reason}`,
        verified: true,
      }),
    );
  }
  if (collection === 'notices') {
    return applyList((doc as NoticesDoc).items, draft, () => draft.item as unknown as Notice);
  }
  const map = (doc as ContentDoc).items;
  const key = String(draft.item.key);
  const prior = map[key];
  if (draft.op === 'add' && prior) throw new ConflictError(`${key} already exists`);
  if (draft.op !== 'add' && !prior) throw new ConflictError(`${key} does not exist`);
  const { key: _k, ...texts } = draft.item;
  const items = { ...map };
  if (draft.op === 'delete') delete items[key];
  else items[key] = texts as unknown as ContentTexts;
  return { items, before: prior ?? null, after: draft.op === 'delete' ? null : items[key] };
}
