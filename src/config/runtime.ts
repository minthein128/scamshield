import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { API_URL, STABLE_API_URL } from './env';

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
export const HEALTH_TIMEOUT_MS = 3000;
export const INTERNET_PROBE_URLS = ['https://www.gstatic.com/generate_204', 'https://www.cloudflare.com/cdn-cgi/trace'];
export const FOREGROUND_REFRESH_MS = 5 * 60 * 1000;

export function validApiUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s/]+/i.test(v) ? v : null;
}

export function apiHost(url: string): string {
  return url.replace(/^https?:\/\//i, '').split(/[/?#]/)[0] ?? '';
}

async function timedFetch(fetchImpl: typeof fetch, url: string, timeoutMs: number, init: RequestInit = {}): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRemoteApiUrl(fetchImpl: typeof fetch = fetch, url: string = CONFIG_URLS[0], timeoutMs = CONFIG_TIMEOUT_MS): Promise<string | null> {
  const res = await timedFetch(fetchImpl, url, timeoutMs, { headers: { Accept: 'application/json' } });
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
  const res = await timedFetch(fetchImpl, `${url.replace(/\/+$/, '')}/healthz`, timeoutMs);
  return Boolean(res?.ok);
}

/** True when any reliable public endpoint answers, whatever the status. */
export async function hasInternet(fetchImpl: typeof fetch = fetch, urls: string[] = INTERNET_PROBE_URLS, timeoutMs = 4000): Promise<boolean> {
  const results = await Promise.all(urls.map(u => timedFetch(fetchImpl, u, timeoutMs, { method: 'GET', mode: 'no-cors' } as RequestInit)));
  return results.some(r => r !== null);
}

export interface ResolveDeps {
  fetchImpl?: typeof fetch;
  envUrl?: string;
  configUrls?: string[];
  staggerMs?: number;
  stableUrl?: string;
}

export async function resolveApiUrl(deps: ResolveDeps = {}): Promise<string> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const cached = validApiUrl(await AsyncStorage.getItem(API_URL_CACHE_KEY).catch(() => null));
  const baked = validApiUrl(deps.envUrl ?? API_URL);
  const remote = await fetchFirstApiUrl(fetchImpl, deps.configUrls ?? CONFIG_URLS, { staggerMs: deps.staggerMs });
  const stable = validApiUrl(deps.stableUrl ?? STABLE_API_URL);
  const known = [cached, baked, stable].filter((u, i, a): u is string => Boolean(u) && a.indexOf(u) === i);

  if (remote) {
    if (known[0] === remote) return remote;
    const [remoteOk, ...knownOk] = await Promise.all([remote, ...known].map(u => checkHealth(u, fetchImpl)));
    if (!remoteOk) {
      const alive = known.find((_, i) => knownOk[i]);
      if (alive) return alive;
    }
    await AsyncStorage.setItem(API_URL_CACHE_KEY, remote).catch(() => undefined);
    return remote;
  }

  if (known.length > 1) {
    const ok = await Promise.all(known.map(u => checkHealth(u, fetchImpl)));
    const alive = known.find((_, i) => ok[i]);
    if (alive) return alive;
  }
  return known[0] ?? '';
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
