export type Role = 'admin' | 'editor';
export interface Me { uid: string; email: string; role: Role }

export const COUNTRIES = [
  { code: 'MM', name: 'Myanmar' },
  { code: 'TH', name: 'Thailand' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'LA', name: 'Laos' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },
] as const;
export const countryName = (c: string) => COUNTRIES.find((x) => x.code === c)?.name ?? c;

export const CATEGORIES = ['trafficking', 'police', 'cybercrime', 'consular', 'ngo'] as const;
export type Category = (typeof CATEGORIES)[number];

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'my', name: 'Burmese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'tl', name: 'Filipino' },
  { code: 'th', name: 'Thai' },
] as const;
export type LangCode = (typeof LANGUAGES)[number]['code'];

export interface AiSourceRef { title: string; url: string; quote?: string }
export interface AiSource { prompt: string; model: string; sources: AiSourceRef[] }

export interface HotlineItem {
  id: string;
  country: string;
  category: Category;
  name: string;
  number?: string;
  dial?: string;
  domesticOnly?: boolean;
  reportUrl?: string;
  hours?: string;
  notes?: string;
  status: 'published' | 'retired';
  source: { url: string; asOf: string; fetchedBy: 'human' | 'ai'; note?: string };
  sourceUrl?: string;
  asOf?: string;
  verifiedBy?: { uid: string; at: string };
  history?: { at: string; by: string; change: string }[];
}

export interface Notice {
  id: string;
  country?: string[];
  language?: string[];
  title: string;
  body: string;
  severity: 'info' | 'warning';
  startsAt?: string;
  endsAt?: string;
  enabled: boolean;
}

export type ContentCell = { en: string } & Partial<Record<Exclude<LangCode, 'en'>, string>>;
export type ContentItem = ContentCell & { key: string };

export type Collection = 'hotlines' | 'notices' | 'content';
export type DraftItem = Record<string, unknown>;

export interface Draft {
  id: string;
  collection: Collection;
  op: 'add' | 'update' | 'delete';
  item: DraftItem;
  reason: string;
  aiSource?: AiSource;
  createdBy: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  version?: number;
}

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  action: string;
  collection: Collection;
  before: unknown;
  after: unknown;
  draftId?: string;
}

export interface Candidate {
  name: string;
  number: string;
  dial: string;
  hours?: string;
  notes?: string;
  sources: AiSourceRef[];
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}
export interface Verification {
  verdict: 'confirmed' | 'conflict' | 'unverified';
  sources: AiSourceRef[];
  note: string;
  model?: string;
}
