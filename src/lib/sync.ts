import type { CheckKind, CheckResponse, LanguageCode, ScamType, Verdict } from '../api/types';
import { isCountryCode } from './countries';
import type { TrustedContact } from './contacts';
import { MAX_HISTORY, type HistoryEntry } from './history';
import { isLanguage, type Profile } from './profile';

export const SCORE_BUCKET = 20;
export const MAX_TITLE_CHARS = 300;
export const MAX_SUMMARY_CHARS = 2000;

/** Synced history: the verdict and Kakwe's own words only. Never the user's message, quotes, links or sources. */
export interface HistoryDoc {
  createdAt: string;
  language: string;
  kind: CheckKind;
  verdict: Verdict;
  scoreBucket: number;
  scamType: ScamType;
  title: string;
  summary: string;
}

/** The shape apps up to this release wrote: the whole report as JSON plus a snippet of the input. */
export interface LegacyHistoryDoc {
  createdAt: string;
  language: string;
  source?: string;
  report: string;
}

export interface ContactDoc {
  name: string;
  phone: string;
  updatedAt: string;
}

export interface ProfileDoc {
  language: string;
  homeCountry?: string;
  destinationCountry?: string;
  updatedAt: string;
}

const KINDS: CheckKind[] = ['job', 'message', 'link', 'shop', 'agency', 'screen'];
const VERDICTS: Verdict[] = ['safe', 'careful', 'danger'];
const SCAM_TYPES: ScamType[] = ['job_trafficking', 'romance_pig_butchering', 'parcel_phishing', 'fake_agency', 'marketplace_fraud', 'investment', 'other', 'none'];

export function scoreBucket(score: number): number {
  const s = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
  return Math.min(80, Math.floor(s / SCORE_BUCKET) * SCORE_BUCKET);
}

const pick = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? (value as T) : fallback);
const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');

export function slimReport(r: Pick<CheckResponse, 'createdAt' | 'kind' | 'verdict' | 'score' | 'scamType' | 'title' | 'summary'>, language: string, createdAt = r.createdAt): HistoryDoc {
  return {
    createdAt,
    language: isLanguage(language) ? language : 'en',
    kind: pick(KINDS, r.kind, 'message'),
    verdict: pick(VERDICTS, r.verdict, 'careful'),
    scoreBucket: scoreBucket(r.score),
    scamType: pick(SCAM_TYPES, r.scamType, 'other'),
    title: clip(r.title, MAX_TITLE_CHARS),
    summary: clip(r.summary, MAX_SUMMARY_CHARS),
  };
}

export function historyToDoc(entry: HistoryEntry): HistoryDoc {
  return slimReport(entry.result, entry.language, entry.createdAt);
}

export function isLegacyDoc(data: Record<string, unknown>): boolean {
  return typeof data.report === 'string';
}

type SlimInput = Parameters<typeof slimReport>[0];

/** Rewrites an old full-report doc in the slim shape, or null when it cannot be read. */
export function legacyToSlim(data: Record<string, unknown>): HistoryDoc | null {
  if (!isLegacyDoc(data) || typeof data.createdAt !== 'string') return null;
  try {
    const r = JSON.parse(data.report as string) as Record<string, unknown> | null;
    if (!r || typeof r !== 'object' || !VERDICTS.includes(r.verdict as Verdict)) return null;
    return slimReport({ ...(r as unknown as SlimInput), score: Number(r.score) }, String(data.language), data.createdAt);
  } catch {
    return null;
  }
}

function readSlim(data: Record<string, unknown>): HistoryDoc | null {
  if (typeof data.createdAt !== 'string' || !VERDICTS.includes(data.verdict as Verdict)) return null;
  return slimReport({ ...(data as unknown as SlimInput), score: Number(data.scoreBucket) }, String(data.language), data.createdAt);
}

export function docToHistory(id: string, data: Record<string, unknown>): HistoryEntry | null {
  const doc = isLegacyDoc(data) ? legacyToSlim(data) : readSlim(data);
  if (!doc) return null;
  const { createdAt, kind, verdict, scoreBucket: score, scamType, title, summary } = doc;
  return {
    id,
    createdAt,
    language: doc.language as LanguageCode,
    result: { id, createdAt, kind, verdict, score, title, summary, spokenWarning: '', scamType, flags: [], linkChecks: [], actions: [], model: '' },
  };
}

export function mergeHistory(local: HistoryEntry[], remote: HistoryEntry[]): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>();
  for (const e of [...local, ...remote]) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_HISTORY);
}

export function historyMissingRemotely(local: HistoryEntry[], remote: HistoryEntry[]): HistoryEntry[] {
  const known = new Set(remote.map(e => e.id));
  return local.filter(e => !known.has(e.id));
}

export function contactToDoc(c: TrustedContact): ContactDoc {
  return { name: c.name, phone: c.phone, updatedAt: c.updatedAt };
}

export function docToContact(id: string, data: Record<string, unknown>): TrustedContact | null {
  if (typeof data.name !== 'string' || typeof data.phone !== 'string') return null;
  return { id, name: data.name, phone: data.phone, updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date(0).toISOString() };
}

export function profileToDoc(p: Profile, language: LanguageCode, now: Date = new Date()): ProfileDoc {
  return {
    language,
    ...(p.homeCountry ? { homeCountry: p.homeCountry } : {}),
    ...(p.destinationCountry ? { destinationCountry: p.destinationCountry } : {}),
    updatedAt: now.toISOString(),
  };
}

export function docToProfile(data: Record<string, unknown>): { profile: Profile; language: LanguageCode } | null {
  if (!isLanguage(data.language)) return null;
  return {
    language: data.language,
    profile: {
      onboarded: true,
      shareSignals: false,
      sharingAsked: false,
      keepHistory: true,
      ...(isCountryCode(data.homeCountry) ? { homeCountry: data.homeCountry } : {}),
      ...(isCountryCode(data.destinationCountry) ? { destinationCountry: data.destinationCountry } : {}),
    },
  };
}
