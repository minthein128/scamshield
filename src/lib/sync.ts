import type { CheckResponse } from '../api/types';
import { isCountryCode } from './countries';
import type { TrustedContact } from './contacts';
import { MAX_HISTORY, type HistoryEntry } from './history';
import { isLanguage, type Profile } from './profile';

export const MAX_REMOTE_REPORT_CHARS = 60000;

export interface HistoryDoc {
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

const IMAGE_KEYS = new Set(['imageBase64', 'imageMimeType', 'image', 'screenshot']);

export function stripImages(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripImages);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !IMAGE_KEYS.has(k))
        .map(([k, v]) => [k, stripImages(v)]),
    );
  }
  return value;
}

export function historyToDoc(entry: HistoryEntry): HistoryDoc | null {
  const report = JSON.stringify(stripImages(entry.result));
  if (report.length > MAX_REMOTE_REPORT_CHARS) return null;
  return {
    createdAt: entry.createdAt,
    language: entry.language,
    ...(entry.source ? { source: entry.source.slice(0, 200) } : {}),
    report,
  };
}

export function docToHistory(id: string, data: Record<string, unknown>): HistoryEntry | null {
  if (typeof data.report !== 'string' || typeof data.createdAt !== 'string') return null;
  try {
    const result = JSON.parse(data.report) as CheckResponse;
    if (!result || typeof result !== 'object' || typeof result.verdict !== 'string' || !Array.isArray(result.flags)) return null;
    return {
      id,
      createdAt: data.createdAt,
      language: isLanguage(data.language) ? data.language : 'en',
      ...(typeof data.source === 'string' ? { source: data.source } : {}),
      result: { ...result, id: result.id ?? id, actions: result.actions ?? [], linkChecks: result.linkChecks ?? [] },
    };
  } catch {
    return null;
  }
}

export function mergeHistory(local: HistoryEntry[], remote: HistoryEntry[]): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>();
  for (const e of [...remote, ...local]) if (!byId.has(e.id)) byId.set(e.id, e);
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

export function profileToDoc(p: Profile, now: Date = new Date()): ProfileDoc {
  return {
    language: p.language,
    ...(p.homeCountry ? { homeCountry: p.homeCountry } : {}),
    ...(p.destinationCountry ? { destinationCountry: p.destinationCountry } : {}),
    updatedAt: now.toISOString(),
  };
}

export function docToProfile(data: Record<string, unknown>): Profile | null {
  if (!isLanguage(data.language)) return null;
  return {
    onboarded: true,
    language: data.language,
    ...(isCountryCode(data.homeCountry) ? { homeCountry: data.homeCountry } : {}),
    ...(isCountryCode(data.destinationCountry) ? { destinationCountry: data.destinationCountry } : {}),
  };
}
