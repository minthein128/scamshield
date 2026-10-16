import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { ensureApiUrl } from '../config/runtime';
import { COUNTRIES, type CountryCode } from '../data/countries';
import type { Hotline, HotlineCategory } from '../data/hotlines';
import i18n from '../i18n';
import { diag } from './diagLog';

export const CONFIG_KEYS = {
  hotlines: 'saferoute.config.hotlines.v1',
  notices: 'saferoute.config.notices.v1',
  content: 'saferoute.config.content.v1',
} as const;
export const REFRESH_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const CATEGORIES: HotlineCategory[] = ['trafficking', 'police', 'cybercrime', 'consular', 'ngo'];
const LANGS = ['en', 'my', 'id', 'tl', 'th'] as const;

export interface RuntimeNotice {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'warning';
  country?: string[];
  language?: string[];
  startsAt?: string;
  endsAt?: string;
}

export type ContentOverrides = Record<string, Partial<Record<(typeof LANGS)[number], string>>>;

interface Snapshot<T> {
  version: number;
  items: T;
}

let hotlines: Snapshot<Hotline[]> | null = null;
let notices: Snapshot<RuntimeNotice[]> | null = null;
let content: Snapshot<ContentOverrides> | null = null;
let revision = 0;
const listeners = new Set<() => void>();

const bump = () => {
  revision += 1;
  listeners.forEach(l => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Re-renders the caller when runtime config changes. Call it in a screen that reads hotlines or notices. */
export function useRuntimeConfig(): number {
  return useSyncExternalStore(subscribe, () => revision, () => revision);
}

export const runtimeHotlines = (): Hotline[] | null => (hotlines && hotlines.items.length > 0 ? hotlines.items : null);
export const runtimeNotices = (): RuntimeNotice[] => notices?.items ?? [];

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 600): string | undefined => (typeof v === 'string' && v.trim() && v.length <= max ? v : undefined);
const https = (v: unknown): string | undefined => {
  const s = str(v, 500);
  return s && /^https:\/\//i.test(s) ? s : undefined;
};
const list = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined);

export function parseHotlines(body: unknown): Snapshot<Hotline[]> | null {
  if (!isRecord(body) || typeof body.version !== 'number' || !Array.isArray(body.items)) return null;
  const items: Hotline[] = [];
  for (const raw of body.items) {
    if (!isRecord(raw)) continue;
    const id = str(raw.id, 100);
    const name = str(raw.name, 300);
    const sourceUrl = https(raw.sourceUrl);
    const country = COUNTRIES.find(c => c.code === raw.country)?.code;
    const category = CATEGORIES.find(c => c === raw.category);
    const dial = typeof raw.dial === 'string' && /^\+?\d{2,15}$/.test(raw.dial) ? raw.dial : undefined;
    const reportUrl = https(raw.reportUrl);
    if (!id || !name || !sourceUrl || !country || !category || (!dial && !reportUrl)) continue;
    items.push({
      id,
      country,
      category,
      name,
      number: str(raw.number, 60),
      dial,
      domesticOnly: raw.domesticOnly === true ? true : undefined,
      reportUrl,
      hours: str(raw.hours),
      notes: str(raw.notes),
      sourceUrl,
      asOf: str(raw.asOf, 20),
      verifiedOn: str(raw.verifiedOn, 20) ?? '',
    });
  }
  return { version: body.version, items };
}

export function parseNotices(body: unknown): Snapshot<RuntimeNotice[]> | null {
  if (!isRecord(body) || typeof body.version !== 'number' || !Array.isArray(body.items)) return null;
  const items: RuntimeNotice[] = [];
  for (const raw of body.items) {
    if (!isRecord(raw)) continue;
    const id = str(raw.id, 100);
    const title = str(raw.title, 200);
    const text = str(raw.body, 1000);
    if (!id || !title || !text) continue;
    items.push({
      id,
      title,
      body: text,
      severity: raw.severity === 'warning' ? 'warning' : 'info',
      country: list(raw.country),
      language: list(raw.language),
      startsAt: str(raw.startsAt, 40),
      endsAt: str(raw.endsAt, 40),
    });
  }
  return { version: body.version, items };
}

export function parseContent(body: unknown): Snapshot<ContentOverrides> | null {
  if (!isRecord(body) || typeof body.version !== 'number' || !isRecord(body.items)) return null;
  const items: ContentOverrides = {};
  for (const [key, raw] of Object.entries(body.items)) {
    if (!isRecord(raw)) continue;
    const texts: ContentOverrides[string] = {};
    for (const lang of LANGS) {
      const t = str(raw[lang], 2000);
      if (t) texts[lang] = t;
    }
    if (Object.keys(texts).length) items[key] = texts;
  }
  return { version: body.version, items };
}

/** Writes override text into the i18n store for keys that exist in English. Returns how many were applied. */
export function applyContent(snap: Snapshot<ContentOverrides> | null): number {
  if (!snap) return 0;
  let applied = 0;
  for (const [key, texts] of Object.entries(snap.items)) {
    const sep = key.indexOf(':');
    if (sep < 1 || !i18n.exists(key, { lng: 'en' })) continue;
    const ns = key.slice(0, sep);
    const path = key.slice(sep + 1);
    for (const [lang, text] of Object.entries(texts)) {
      if (text) {
        i18n.addResource(lang, ns, path, text, { silent: true });
        applied += 1;
      }
    }
  }
  if (applied > 0) void i18n.changeLanguage(i18n.language);
  return applied;
}

async function readCache<T>(key: string, parse: (b: unknown) => T | null): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? parse(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Loads the last saved copies. Safe to call offline. */
export async function loadCachedConfig(): Promise<void> {
  const [h, n, c] = await Promise.all([
    readCache(CONFIG_KEYS.hotlines, parseHotlines),
    readCache(CONFIG_KEYS.notices, parseNotices),
    readCache(CONFIG_KEYS.content, parseContent),
  ]);
  hotlines = hotlines ?? h;
  notices = notices ?? n;
  if (!content && c) {
    content = c;
    applyContent(c);
  }
  bump();
}

async function getJson(fetchImpl: typeof fetch, url: string, name: string): Promise<unknown> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) diag.warn('api', 'config_failed', { endpoint: name, status: res.status, ms: Date.now() - started });
    return res.ok ? await res.json() : null;
  } catch {
    diag.warn('api', 'config_failed', { endpoint: name, kind: 'network', ms: Date.now() - started });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches hotlines, notices and content overrides. A failed or invalid reply keeps the current copy. */
export async function refreshConfig(fetchImpl: typeof fetch = fetch, baseUrl?: string): Promise<boolean> {
  const base = (baseUrl ?? (await ensureApiUrl().catch(() => ''))).replace(/\/+$/, '');
  if (!base) return false;
  const [hBody, nBody, cBody] = await Promise.all([
    getJson(fetchImpl, `${base}/v1/config/hotlines`, 'configHotlines'),
    getJson(fetchImpl, `${base}/v1/config/notices`, 'configNotices'),
    getJson(fetchImpl, `${base}/v1/config/content`, 'configContent'),
  ]);
  let changed = false;
  const h = parseHotlines(hBody);
  if (h && h.items.length > 0) {
    hotlines = h;
    changed = true;
    await AsyncStorage.setItem(CONFIG_KEYS.hotlines, JSON.stringify(h)).catch(() => undefined);
  }
  const n = parseNotices(nBody);
  if (n) {
    notices = n;
    changed = true;
    await AsyncStorage.setItem(CONFIG_KEYS.notices, JSON.stringify(n)).catch(() => undefined);
  }
  const c = parseContent(cBody);
  if (c) {
    content = c;
    applyContent(c);
    await AsyncStorage.setItem(CONFIG_KEYS.content, JSON.stringify(c)).catch(() => undefined);
  }
  if (changed) bump();
  return changed;
}

let started: ReturnType<typeof setInterval> | null = null;

/** Loads the cache, fetches once, then refreshes every 6 hours. Call once at startup. */
export function startRuntimeConfig(): () => void {
  if (!started) {
    void loadCachedConfig().then(() => refreshConfig());
    started = setInterval(() => void refreshConfig(), REFRESH_MS);
  }
  return () => {
    if (started) clearInterval(started);
    started = null;
  };
}

/** Test helper. */
export function resetRuntimeConfig(): void {
  hotlines = null;
  notices = null;
  content = null;
  bump();
}

export type { CountryCode };
