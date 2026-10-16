import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type DiagArea = 'auth' | 'api' | 'connection' | 'shield' | 'messageGuard' | 'live' | 'jobShield' | 'sync' | 'app';
export type DiagLevel = 'info' | 'warn' | 'error';
export type DiagValue = string | number | boolean;
export type DiagDetails = Record<string, DiagValue>;

export interface DiagEntry {
  t: number;
  v: string;
  p: string;
  level: DiagLevel;
  area: DiagArea;
  event: string;
  d: DiagDetails;
}

export const DIAG_KEY = 'saferoute.diag.v1';
export const DIAG_MAX_ENTRIES = 300;
export const DIAG_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_KEYS = 8;
const MAX_VALUE_LEN = 40;
const REDACTED = '[redacted]';
const KEY_RE = /^[a-z][A-Za-z0-9]{0,23}$/;
const SAFE_CHARS_RE = /^[A-Za-z0-9_.:\- ()]+$/;
const AUTH_CODE_RE = /^auth\/[a-z0-9-]{1,30}$/;
const SNAKE_CODE_RE = /^[a-z]{1,12}(?:[_:][a-z0-9]{1,12}){1,6}$/;

/** Keeps short codes only. Anything long, free-form or identifying becomes "[redacted]". */
export function sanitizeValue(value: unknown): DiagValue | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const n = Math.round(value);
    return String(Math.abs(n)).length >= 6 ? REDACTED : n;
  }
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  if (AUTH_CODE_RE.test(s)) return s;
  if (s.length > MAX_VALUE_LEN) return REDACTED;
  if (!SAFE_CHARS_RE.test(s)) return REDACTED;
  if (/\d{6,}/.test(s) || /http|www\./i.test(s)) return REDACTED;
  if (/[A-Za-z0-9_-]{20,}/.test(s) && !SNAKE_CODE_RE.test(s)) return REDACTED;
  return s;
}

export function sanitizeDetails(details: unknown): DiagDetails {
  const out: DiagDetails = {};
  if (!details || typeof details !== 'object') return out;
  for (const [key, raw] of Object.entries(details as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_KEYS) break;
    if (!KEY_RE.test(key)) continue;
    const clean = sanitizeValue(raw);
    if (clean !== null) out[key] = clean;
  }
  return out;
}

/** Short stable code for an id, so two log lines can be matched without exposing the id. */
export function shortHash(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = ((h * 33) ^ value.charCodeAt(i)) >>> 0;
  return `h${h.toString(16).padStart(8, '0').slice(0, 5)}`;
}

export function pruneEntries(entries: DiagEntry[], now: number = Date.now()): DiagEntry[] {
  return entries.filter(e => now - e.t <= DIAG_MAX_AGE_MS).slice(-DIAG_MAX_ENTRIES);
}

function valid(e: unknown): e is DiagEntry {
  const x = e as Partial<DiagEntry> | null;
  return Boolean(x && typeof x.t === 'number' && typeof x.event === 'string' && typeof x.area === 'string' && typeof x.level === 'string');
}

let cache: DiagEntry[] | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

async function load(): Promise<DiagEntry[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(DIAG_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? pruneEntries(parsed.filter(valid)) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

function notify(): void {
  listeners.forEach(l => {
    try {
      l();
    } catch {
      // a failing listener must not break logging
    }
  });
}

function record(level: DiagLevel, area: DiagArea, event: string, details?: DiagDetails, at?: number): void {
  try {
    const clean = sanitizeValue(event);
    const now = Date.now();
    const entry: DiagEntry = {
      t: at !== undefined && Number.isFinite(at) && at <= now ? at : now,
      v: String(Constants.expoConfig?.version ?? ''),
      p: Platform.OS,
      level,
      area,
      event: typeof clean === 'string' && clean !== REDACTED ? clean : 'unknown',
      d: sanitizeDetails(details),
    };
    void enqueue(async () => {
      const list = await load();
      const merged = [...list, entry];
      if (list.length > 0 && list[list.length - 1].t > entry.t) merged.sort((a, b) => a.t - b.t);
      cache = pruneEntries(merged, now);
      await AsyncStorage.setItem(DIAG_KEY, JSON.stringify(cache)).catch(() => undefined);
      notify();
    });
  } catch {
    // logging never throws into app code
  }
}

export const diag = {
  info: (area: DiagArea, event: string, details?: DiagDetails) => record('info', area, event, details),
  warn: (area: DiagArea, event: string, details?: DiagDetails) => record('warn', area, event, details),
  error: (area: DiagArea, event: string, details?: DiagDetails) => record('error', area, event, details),
  /** Records an event that happened earlier, for example one read from native code. */
  at: (t: number, level: DiagLevel, area: DiagArea, event: string, details?: DiagDetails) => record(level, area, event, details, t),
};

/** Entries from oldest to newest, with expired ones dropped. */
export function readLog(): Promise<DiagEntry[]> {
  return enqueue(async () => {
    const list = await load();
    cache = pruneEntries(list);
    return cache.slice();
  });
}

export function clearLog(): Promise<void> {
  return enqueue(async () => {
    cache = [];
    await AsyncStorage.removeItem(DIAG_KEY).catch(() => undefined);
    notify();
  });
}

export function subscribeLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper: forgets the in-memory copy so the next call reads storage again. */
export function resetDiagMemory(): void {
  cache = null;
  queue = Promise.resolve();
}

/** Code-only view of a thrown value: its `code` or `name`, never its message. */
export function errorCode(error: unknown): string {
  const e = error as { code?: unknown; name?: unknown } | null;
  const code = e?.code ?? e?.name;
  if (typeof code === 'string' || typeof code === 'number') return String(code).slice(0, 40);
  return 'unknown';
}
