import { z } from 'zod';
import { COUNTRIES } from '../data/hotlines.generated.js';

export const COLLECTIONS = ['hotlines', 'notices', 'content'] as const;
export type Collection = (typeof COLLECTIONS)[number];
export const ROLES = ['admin', 'editor'] as const;
export type Role = (typeof ROLES)[number];
export const CATEGORIES = ['trafficking', 'police', 'cybercrime', 'consular', 'ngo'] as const;
export const CONTENT_LANGS = ['en', 'my', 'id', 'tl', 'th'] as const;

const countryCodes = COUNTRIES.map((c) => c.code) as [string, ...string[]];
const httpsUrl = z
  .string()
  .max(500)
  .refine((v) => {
    try {
      return new URL(v).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'must be an https URL');
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const asOfDate = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'must be YYYY-MM or YYYY-MM-DD');
const isoTime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'must be an ISO date or time');

export const sourceSchema = z.object({
  url: httpsUrl,
  asOf: asOfDate,
  fetchedBy: z.enum(['human', 'ai']),
  note: z.string().max(400).optional(),
});

export const hotlineInputSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,63}$/, 'id must be a lowercase slug of 3 to 64 characters'),
    country: z.enum(countryCodes),
    category: z.enum(CATEGORIES),
    name: z.string().trim().min(2).max(200),
    number: z.string().trim().min(2).max(40).optional(),
    dial: z
      .string()
      .regex(/^\+?\d{2,15}$/, 'dial must be digits with an optional leading +')
      .optional(),
    domesticOnly: z.boolean().optional(),
    reportUrl: httpsUrl.optional(),
    hours: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(500).optional(),
    sourceUrl: httpsUrl.optional(),
    asOf: asOfDate.optional(),
    verifiedOn: day.optional(),
    status: z.enum(['published', 'retired']).default('published'),
    source: sourceSchema.optional(),
  })
  .superRefine((h, ctx) => {
    if ((h.number || h.dial) && !h.sourceUrl)
      ctx.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'sourceUrl is required for an item with a number' });
    if (!h.dial && !h.reportUrl) ctx.addIssue({ code: 'custom', path: ['dial'], message: 'an item needs a dial number or a reportUrl' });
  });

export interface HotlineItem {
  id: string;
  country: string;
  category: (typeof CATEGORIES)[number];
  name: string;
  number?: string;
  dial?: string;
  domesticOnly?: boolean;
  reportUrl?: string;
  hours?: string;
  notes?: string;
  sourceUrl: string;
  asOf?: string;
  verifiedOn: string;
  status: 'published' | 'retired';
  source: z.infer<typeof sourceSchema>;
  verifiedBy?: { uid: string; at: string };
  history?: Array<{ at: string; by: string; change: string }>;
}

export const noticeSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,63}$/, 'id must be a lowercase slug of 3 to 64 characters'),
  country: z.array(z.enum(countryCodes)).max(20).optional(),
  language: z.array(z.enum(CONTENT_LANGS)).max(5).optional(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(600),
  severity: z.enum(['info', 'warning']),
  startsAt: isoTime.optional(),
  endsAt: isoTime.optional(),
  enabled: z.boolean(),
});
export type Notice = z.infer<typeof noticeSchema>;

const copy = z.string().trim().min(1).max(2000);
export const contentSchema = z.object({
  key: z.string().regex(/^[A-Za-z0-9_.:-]{2,120}$/, 'key must be an i18n key'),
  en: copy,
  my: copy.optional(),
  id: copy.optional(),
  tl: copy.optional(),
  th: copy.optional(),
});
export type ContentItem = z.infer<typeof contentSchema>;
export type ContentTexts = Omit<ContentItem, 'key'>;

export const draftInputSchema = z.object({
  collection: z.enum(COLLECTIONS),
  op: z.enum(['add', 'update', 'delete']),
  item: z.record(z.string(), z.unknown()),
  reason: z.string().trim().min(3).max(500),
  aiSource: z
    .object({
      prompt: z.string().max(500),
      model: z.string().max(100),
      sources: z.array(z.object({ title: z.string().max(300), url: z.string().max(500), quote: z.string().max(500).optional() })).max(10),
    })
    .optional(),
});

const deleteSchema = z.object({ id: z.string().min(1).max(120) });
const deleteContentSchema = z.object({ key: z.string().min(1).max(120) });

export class ValidationError extends Error {
  constructor(public issues: string[]) {
    super(issues.join('; '));
  }
}

const issuesOf = (e: z.ZodError) => e.issues.map((i) => `${i.path.join('.') || 'item'}: ${i.message}`);

/** Validates one draft item against its collection. Returns the cleaned item or throws ValidationError. */
export function validateItem(collection: Collection, op: 'add' | 'update' | 'delete', item: unknown): Record<string, unknown> {
  const schema =
    op === 'delete'
      ? collection === 'content'
        ? deleteContentSchema
        : deleteSchema
      : collection === 'hotlines'
        ? hotlineInputSchema
        : collection === 'notices'
          ? noticeSchema
          : contentSchema;
  const r = schema.safeParse(item);
  if (!r.success) throw new ValidationError(issuesOf(r.error));
  return r.data as Record<string, unknown>;
}

export interface AiSource {
  prompt: string;
  model: string;
  sources: Array<{ title: string; url: string; quote?: string }>;
}

export interface Draft {
  id: string;
  collection: Collection;
  op: 'add' | 'update' | 'delete';
  item: Record<string, unknown>;
  reason: string;
  aiSource?: AiSource;
  createdBy: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  action: string;
  collection: Collection | 'admins';
  before: unknown;
  after: unknown;
  draftId?: string;
}

export interface AdminRecord {
  uid: string;
  email: string;
  role: Role;
  addedBy: string;
  addedAt: string;
}

export interface ConfigDoc<T> {
  version: number;
  updatedAt?: string;
  updatedBy?: string;
  items: T;
}
export type HotlinesDoc = ConfigDoc<HotlineItem[]>;
export type NoticesDoc = ConfigDoc<Notice[]>;
export type ContentDoc = ConfigDoc<Record<string, ContentTexts>>;
export type AnyDoc = HotlinesDoc | NoticesDoc | ContentDoc;
