import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { API_URL } from './env';

export const CONFIG_URL = process.env.EXPO_PUBLIC_CONFIG_URL?.trim() || 'https://saferoute-aibc.web.app/config.json';
export const API_URL_CACHE_KEY = 'saferoute.apiUrl.v1';
const CONFIG_TIMEOUT_MS = 3000;

export function validApiUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s/]+/i.test(v) ? v : null;
}

export async function fetchRemoteApiUrl(fetchImpl: typeof fetch = fetch, url: string = CONFIG_URL, timeoutMs = CONFIG_TIMEOUT_MS): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return null;
    return validApiUrl(((await res.json()) as { apiUrl?: unknown } | null)?.apiUrl);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveApiUrl(deps: { fetchImpl?: typeof fetch; envUrl?: string } = {}): Promise<string> {
  const remote = await fetchRemoteApiUrl(deps.fetchImpl);
  if (remote) {
    await AsyncStorage.setItem(API_URL_CACHE_KEY, remote).catch(() => undefined);
    return remote;
  }
  const cached = validApiUrl(await AsyncStorage.getItem(API_URL_CACHE_KEY).catch(() => null));
  return cached ?? validApiUrl(deps.envUrl ?? API_URL) ?? '';
}

let pending: Promise<string> | null = null;
let current: string | null = null;

export function ensureApiUrl(): Promise<string> {
  pending ??= resolveApiUrl().then(url => {
    current = url;
    return url;
  });
  return pending;
}

export function getResolvedApiUrl(): string | null {
  return current;
}

export function useApiUrl(): string | null {
  const [url, setUrl] = useState<string | null>(current);
  useEffect(() => {
    let live = true;
    ensureApiUrl().then(u => live && setUrl(u));
    return () => {
      live = false;
    };
  }, []);
  return url;
}
