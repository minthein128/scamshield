import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { diag } from '../lib/diagLog';
import { API_URL, OFFLINE_MOCK, STABLE_API_URL } from './env';

const DEFAULT_CONFIG_URLS = [`${STABLE_API_URL}/config.json`, 'https://saferoute-aibc.web.app/config.json', 'https://saferoute-aibc.firebaseapp.com/config.json'];

export function parseConfigUrls(raw: string | undefined): string[] {
  const urls = (raw ?? '')
    .split(',')
    .map(u => u.trim())
    .filter(u => /^https?:\/\//i.test(u));
  return urls.length ? urls : DEFAULT_CONFIG_URLS;
}

export const CONFIG_URLS = parseConfigUrls(process.env.EXPO_PUBLIC_CONFIG_URLS);
export const API_URL_CACHE_KEY = 'saferoute.apiUrl.v1';
export const CONFIG_TIMEOUT_MS = 6000;
export const CONFIG_STAGGER_MS = 1500;
export const HEALTH_TIMEOUT_MS = 5000;
export const CONFIG_GRACE_MS = 2000;
export const INTERNET_PROBE_URLS = [
  'https://www.gstatic.com/generate_204',
  'https://www.cloudflare.com/cdn-cgi/trace',
  'https://www.msftconnecttest.com/connecttest.txt',
  'https://captive.apple.com/hotspot-detect.html',
  'https://connectivitycheck.platform.hicloud.com/generate_204',
];
const RECENT_REACH_MS = 30_000;
export const FOREGROUND_REFRESH_MS = 5 * 60 * 1000;

export function validApiUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s/]+/i.test(v) ? v : null;
}

export function apiHost(url: string): string {
  return url.replace(/^https?:\/\//i, '').split(/[/?#]/)[0] ?? '';
}

export interface TraceEntry {
  kind: 'config' | 'health' | 'probe';
  target: string;
  ok: boolean;
  ms: number;
  status?: number;
}

let trace: TraceEntry[] = [];
let reachedAt = 0;

const traceTarget = (url: string) => url.replace(/^https?:\/\//i, '').split(/[?#]/)[0] ?? '';

/** True when any request answered a moment ago, whatever the status. */
export function recentlyReached(): boolean {
  return Date.now() - reachedAt < RECENT_REACH_MS;
}

async function timedFetch(fetchImpl: typeof fetch, url: string, timeoutMs: number, kind: TraceEntry['kind'], init: RequestInit = {}): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  let res: Response | null = null;
  try {
    res = await fetchImpl(url, { ...init, signal: controller.signal, cache: 'no-store' });
    reachedAt = Date.now();
  } catch {
    res = null;
  } finally {
    clearTimeout(timer);
  }
  const ok = kind === 'probe' ? res !== null : Boolean(res?.ok);
  const ms = Date.now() - started;
  trace.push({ kind, target: traceTarget(url), ok, ms, ...(res ? { status: res.status } : {}) });
  if (kind !== 'probe') diag[ok ? 'info' : 'warn']('connection', kind, { host: apiHost(url), ok, ms, ...(res ? { status: res.status } : {}) });
  return res;
}

export async function fetchRemoteApiUrl(fetchImpl: typeof fetch = fetch, url: string = CONFIG_URLS[0], timeoutMs = CONFIG_TIMEOUT_MS): Promise<string | null> {
  const res = await timedFetch(fetchImpl, url, timeoutMs, 'config', { headers: { Accept: 'application/json' } });
  if (!res?.ok) return null;
  try {
    return validApiUrl(((await res.json()) as { apiUrl?: unknown } | null)?.apiUrl);
  } catch {
    return null;
  }
}

/** Starts each source a little after the previous one and returns the first valid answer. */
export function fetchFirstApiUrl(
  fetchImpl: typeof fetch = fetch,
  urls: string[] = CONFIG_URLS,
  opts: { timeoutMs?: number; staggerMs?: number } = {}
): Promise<string | null> {
  const { timeoutMs = CONFIG_TIMEOUT_MS, staggerMs = CONFIG_STAGGER_MS } = opts;
  return new Promise(resolve => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let left = urls.length;
    let done = false;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      resolve(value);
    };
    if (left === 0) return finish(null);
    const started = new Set<number>();
    const start = (i: number) => {
      if (done || started.has(i)) return;
      started.add(i);
      void fetchRemoteApiUrl(fetchImpl, urls[i], timeoutMs).then(found => {
        left -= 1;
        if (found) finish(found);
        else if (left === 0) finish(null);
        else startNext();
      });
    };
    const startNext = () => {
      const i = urls.findIndex((_, k) => !started.has(k));
      if (i >= 0) start(i);
    };
    start(0);
    for (let i = 1; i < urls.length; i++) {
      if (staggerMs <= 0) start(i);
      else timers.push(setTimeout(() => start(i), staggerMs * i));
    }
  });
}

export async function checkHealth(url: string, fetchImpl: typeof fetch = fetch, timeoutMs = HEALTH_TIMEOUT_MS): Promise<boolean> {
  const res = await timedFetch(fetchImpl, `${url.replace(/\/+$/, '')}/healthz`, timeoutMs, 'health');
  return Boolean(res?.ok);
}

/** True when any reliable public endpoint answers, whatever the status. */
export async function hasInternet(fetchImpl: typeof fetch = fetch, urls: string[] = INTERNET_PROBE_URLS, timeoutMs = 5000): Promise<boolean> {
  const results = await Promise.all(urls.map(u => timedFetch(fetchImpl, u, timeoutMs, 'probe', { method: 'GET', mode: 'no-cors' } as RequestInit)));
  const reached = results.filter(r => r !== null).length;
  diag[reached > 0 ? 'info' : 'warn']('connection', 'internet_probe', { reached, of: results.length });
  return reached > 0;
}

export interface ResolveDeps {
  fetchImpl?: typeof fetch;
  envUrl?: string;
  configUrls?: string[];
  staggerMs?: number;
  stableUrl?: string;
  graceMs?: number;
}

export async function resolveApiUrl(deps: ResolveDeps = {}): Promise<string> {
  if (OFFLINE_MOCK) return '';
  const started = Date.now();
  const chosen = await resolveUrlInner(deps);
  diag[chosen ? 'info' : 'warn']('connection', 'url_resolved', { host: chosen ? apiHost(chosen) : 'none', ms: Date.now() - started });
  return chosen;
}

async function resolveUrlInner(deps: ResolveDeps): Promise<string> {
  if (OFFLINE_MOCK) return '';
  const fetchImpl = deps.fetchImpl ?? fetch;
  trace = [];
  const cached = validApiUrl(await AsyncStorage.getItem(API_URL_CACHE_KEY).catch(() => null));
  const baked = validApiUrl(deps.envUrl ?? API_URL);
  const stable = validApiUrl(deps.stableUrl ?? STABLE_API_URL);
  const known = [stable, cached, baked].filter((u, i, a): u is string => Boolean(u) && a.indexOf(u) === i);

  const memo = new Map<string, Promise<boolean>>();
  const healthy = (u: string) => {
    let p = memo.get(u);
    if (!p) memo.set(u, (p = checkHealth(u, fetchImpl)));
    return p;
  };
  const firstAlive = async (): Promise<string | null> => {
    for (const u of known) if (await healthy(u)) return u;
    return null;
  };
  known.forEach(healthy);

  const remoteP = fetchFirstApiUrl(fetchImpl, deps.configUrls ?? CONFIG_URLS, { staggerMs: deps.staggerMs });
  const grace = firstAlive().then(u => (u ? new Promise<null>(r => setTimeout(() => r(null), deps.graceMs ?? CONFIG_GRACE_MS)) : new Promise<null>(() => undefined)));
  const remote = await Promise.race([remoteP, grace]);

  if (remote) {
    if (await healthy(remote)) {
      await AsyncStorage.setItem(API_URL_CACHE_KEY, remote).catch(() => undefined);
      return remote;
    }
    const alive = await firstAlive();
    if (alive) return alive;
    await AsyncStorage.setItem(API_URL_CACHE_KEY, remote).catch(() => undefined);
    return remote;
  }
  return (await firstAlive()) ?? known[0] ?? '';
}

let pending: Promise<string> | null = null;
let current: string | null = null;
let refreshing: Promise<string> | null = null;
const listeners = new Set<(url: string) => void>();

function publish(url: string): string {
    const changed = url !== current;
  current = url;
  if (changed) listeners.forEach(l => l(url));
  return url;
}

export function ensureApiUrl(): Promise<string> {
  pending ??= resolveApiUrl().then(publish);
  return pending;
}

/** Resolves again and skips the per-process memo. Calls made during a refresh share it. */
export function refreshApiUrl(): Promise<string> {
  refreshing ??= resolveApiUrl()
    .then(publish)
    .then(url => {
      pending = Promise.resolve(url);
      return url;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export function getResolvedApiUrl(): string | null {
  return current;
}

export function useApiUrl(): string | null {
  const [url, setUrl] = useState<string | null>(current);
  useEffect(() => {
    let live = true;
    ensureApiUrl().then(u => live && setUrl(u));
    listeners.add(setUrl);
    return () => {
      live = false;
      listeners.delete(setUrl);
    };
  }, []);
  return url;
}

/** Test helper. */
export function resetRuntimeUrl(): void {
  pending = null;
  current = null;
  refreshing = null;
}

export async function connectionReport(info: { version: string; os: string }, fetchImpl: typeof fetch = fetch): Promise<string> {
  const url = await refreshApiUrl().catch(() => current ?? '');
  const resolution = trace.slice();
  await hasInternet(fetchImpl);
  const probes = trace.filter(e => e.kind === 'probe');
  const line = (e: TraceEntry) => `${e.kind} ${e.target} ${e.ok ? 'ok' : 'fail'} ${e.status ?? '-'} ${e.ms}ms`;
  return [
    `SafeRoute ${info.version} (${info.os})`,
    `time ${new Date().toISOString()}`,
    `chosen ${url ? apiHost(url) : 'none'}`,
    `baked ${apiHost(API_URL) || 'none'}`,
    'resolution',
    ...resolution.map(line),
    'internet probes',
    ...probes.map(line),
    `online ${probes.some(e => e.ok)}`,
  ].join('\n');
}
