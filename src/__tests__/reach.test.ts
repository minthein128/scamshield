import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_URL_CACHE_KEY,
  STABLE_RECHECK_MS,
  apiHost,
  checkHealth,
  connectionReport,
  ensureApiUrl,
  fetchFirstApiUrl,
  getResolvedApiUrl,
  hasInternet,
  parseConfigUrls,
  resetRuntimeUrl,
  resolveApiUrl,
} from '../config/runtime';
import { CLOUD_RUN_API_URL, FALLBACK_API_URL, STABLE_API_URL } from '../config/env';
import { readLog, resetDiagMemory } from '../lib/diagLog';
import { ApiError, createRuntimeClient, type CheckClient, type CheckRequest } from '../api';

const A = 'https://a.config/config.json';
const B = 'https://b.config/config.json';
const OLD = 'https://old.example';
const NEW = 'https://new.example';
const LEGACY = 'https://saferoute-api.akkhayar.com';

type Route = 'down' | 'hang' | 'notfound' | { apiUrl: string } | 'ok';

function fakeFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const impl = jest.fn((url: string, init?: RequestInit) => {
    calls.push(url);
    const route = routes[url] ?? 'down';
    if (route === 'down') return Promise.reject(new TypeError('Failed to fetch'));
    if (route === 'notfound') return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    if (route === 'hang') return new Promise((_r, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('abort'))));
    return Promise.resolve({ ok: true, status: 200, json: async () => (route === 'ok' ? {} : route) });
  });
  return { fetchImpl: impl as unknown as typeof fetch, calls };
}

const base = { configUrls: [A, B], staggerMs: 0, envUrl: OLD, stableUrl: '', fallbackUrl: '' };

beforeEach(() => AsyncStorage.clear());

describe('config sources', () => {
  it('parses a comma list and defaults to the two Hosting domains', () => {
    expect(parseConfigUrls(' https://x.example/c.json, junk ,http://y.example/c.json ')).toEqual(['https://x.example/c.json', 'http://y.example/c.json']);
    expect(parseConfigUrls(undefined)).toEqual(['https://saferoute-aibc.web.app/config.json', 'https://saferoute-aibc.firebaseapp.com/config.json']);
  });

  it('takes the second source when the first is blocked', async () => {
    const { fetchImpl } = fakeFetch({ [A]: 'down', [B]: { apiUrl: NEW }, [`${NEW}/health`]: 'ok' });
    expect(await resolveApiUrl({ ...base, fetchImpl })).toBe(NEW);
    expect(await AsyncStorage.getItem(API_URL_CACHE_KEY)).toBe(NEW);
  });

  it('does not wait for a hanging first source when the second answers', async () => {
    jest.useFakeTimers();
    const { fetchImpl } = fakeFetch({ [A]: 'hang', [B]: { apiUrl: NEW } });
    const p = fetchFirstApiUrl(fetchImpl, [A, B], { timeoutMs: 6000, staggerMs: 1500 });
    await jest.advanceTimersByTimeAsync(1600);
    expect(await p).toBe(NEW);
    jest.useRealTimers();
  });

  it('falls back to the cache when every source fails', async () => {
    await AsyncStorage.setItem(API_URL_CACHE_KEY, 'https://cached.example');
    const { fetchImpl } = fakeFetch({});
    expect(await resolveApiUrl({ ...base, fetchImpl })).toBe('https://cached.example');
  });

  it('picks the new url when the cached one is dead', async () => {
    await AsyncStorage.setItem(API_URL_CACHE_KEY, OLD);
    const { fetchImpl } = fakeFetch({ [A]: { apiUrl: NEW }, [`${NEW}/health`]: 'ok' });
    expect(await resolveApiUrl({ ...base, envUrl: '', fetchImpl })).toBe(NEW);
  });

  it('never switches to a source url that fails health while the current one passes', async () => {
    await AsyncStorage.setItem(API_URL_CACHE_KEY, OLD);
    const { fetchImpl } = fakeFetch({ [A]: { apiUrl: NEW }, [`${OLD}/health`]: 'ok' });
    expect(await resolveApiUrl({ ...base, envUrl: '', fetchImpl })).toBe(OLD);
    expect(await AsyncStorage.getItem(API_URL_CACHE_KEY)).toBe(OLD);
  });

  it('replaces a dead cache with a healthy baked url when sources are blocked', async () => {
    await AsyncStorage.setItem(API_URL_CACHE_KEY, 'https://dead.example');
    const { fetchImpl } = fakeFetch({ [`${OLD}/health`]: 'ok' });
    expect(await resolveApiUrl({ ...base, fetchImpl })).toBe(OLD);
  });

  it('falls through a stable domain that does not resolve yet and keeps working', async () => {
    const stable = 'https://api.stable.test';
    const { fetchImpl } = fakeFetch({ [B]: { apiUrl: NEW }, [`${NEW}/health`]: 'ok' });
    expect(await resolveApiUrl({ ...base, configUrls: [`${stable}/config.json`, A, B], stableUrl: stable, fetchImpl })).toBe(NEW);
  });

  it('uses the stable domain when it is healthy and every config source is blocked', async () => {
    const stable = 'https://api.stable.test';
    await AsyncStorage.setItem(API_URL_CACHE_KEY, OLD);
    const { fetchImpl } = fakeFetch({ [`${stable}/health`]: 'ok' });
    expect(await resolveApiUrl({ ...base, stableUrl: stable, fetchImpl })).toBe(stable);
  });

  it('never ends empty when every health check fails on a slow network: stable first, not the dead cache', async () => {
    const stable = 'https://api.stable.test';
    await AsyncStorage.setItem(API_URL_CACHE_KEY, 'https://dead-tunnel.example');
    const { fetchImpl } = fakeFetch({});
    expect(await resolveApiUrl({ ...base, stableUrl: stable, fetchImpl })).toBe(stable);
  });

  it('ignores a dead cached tunnel left by an older build without waiting for it', async () => {
    const stable = 'https://api.stable.test';
    await AsyncStorage.setItem(API_URL_CACHE_KEY, 'https://dead-tunnel.example');
    const { fetchImpl, calls } = fakeFetch({ [`${stable}/health`]: 'ok', [A]: 'hang', [B]: 'hang' });
    expect(await resolveApiUrl({ ...base, stableUrl: stable, graceMs: 10, fetchImpl })).toBe(stable);
    expect(calls).toContain(`${stable}/health`);
  });

  it('orders candidates: stable run.app first, then the fallback, then the cache, while config.json answers', async () => {
    const stable = 'https://api.stable.test';
    const fallback = 'https://api.fallback.test';
    await AsyncStorage.setItem(API_URL_CACHE_KEY, 'https://cached.example');
    const { fetchImpl, calls } = fakeFetch({ [A]: { apiUrl: fallback }, [B]: { apiUrl: fallback }, [`${stable}/health`]: 'ok', [`${fallback}/health`]: 'ok' });
    expect(await resolveApiUrl({ ...base, stableUrl: stable, fallbackUrl: fallback, envUrl: '', graceMs: 10, fetchImpl })).toBe(stable);
    expect(calls.slice(0, 3)).toEqual([`${stable}/health`, `${fallback}/health`, 'https://cached.example/health']);
  });

  it('keeps run.app when config.json names the healthy legacy host, and replaces a cached legacy host with run.app', async () => {
    await AsyncStorage.setItem(API_URL_CACHE_KEY, LEGACY);
    const { fetchImpl, calls } = fakeFetch({ [A]: { apiUrl: LEGACY }, [B]: { apiUrl: LEGACY }, [`${CLOUD_RUN_API_URL}/health`]: 'ok', [`${LEGACY}/health`]: 'ok' });
    expect(await resolveApiUrl({ ...base, stableUrl: CLOUD_RUN_API_URL, envUrl: '', fetchImpl })).toBe(CLOUD_RUN_API_URL);
    expect(await AsyncStorage.getItem(API_URL_CACHE_KEY)).toBe(CLOUD_RUN_API_URL);
    expect(calls).not.toContain(A);
  });

  it('uses the config.json host only when run.app fails its health check', async () => {
    const { fetchImpl } = fakeFetch({ [A]: { apiUrl: NEW }, [`${NEW}/health`]: 'ok' });
    expect(await resolveApiUrl({ ...base, stableUrl: CLOUD_RUN_API_URL, envUrl: '', fetchImpl })).toBe(NEW);
    expect(await AsyncStorage.getItem(API_URL_CACHE_KEY)).toBe(NEW);
  });

  it('moves a running app from a cached legacy host back to run.app once run.app is healthy again', async () => {
    jest.useFakeTimers();
    let stableUp = false;
    const impl = jest.fn((url: string) => {
      const up = url === `${LEGACY}/health` || (stableUp && url === `${CLOUD_RUN_API_URL}/health`);
      return up ? Promise.resolve({ ok: true, status: 200, json: async () => ({}) }) : Promise.reject(new TypeError('Failed to fetch'));
    });
    const realFetch = global.fetch;
    global.fetch = impl as unknown as typeof fetch;
    try {
      await AsyncStorage.setItem(API_URL_CACHE_KEY, LEGACY);
      resetRuntimeUrl();
      const first = ensureApiUrl();
      await jest.advanceTimersByTimeAsync(9000);
      expect(await first).toBe(LEGACY);
      stableUp = true;
      await jest.advanceTimersByTimeAsync(STABLE_RECHECK_MS + 100);
      expect(getResolvedApiUrl()).toBe(CLOUD_RUN_API_URL);
      expect(await AsyncStorage.getItem(API_URL_CACHE_KEY)).toBe(CLOUD_RUN_API_URL);
    } finally {
      resetRuntimeUrl();
      global.fetch = realFetch;
      jest.useRealTimers();
    }
  });

  it('uses the fallback host when the stable one is down', async () => {
    const stable = 'https://api.stable.test';
    const fallback = 'https://api.fallback.test';
    const { fetchImpl } = fakeFetch({ [`${fallback}/health`]: 'ok' });
    expect(await resolveApiUrl({ ...base, stableUrl: stable, fallbackUrl: fallback, fetchImpl })).toBe(fallback);
  });

  it('defaults to Cloud Run only: no fallback host, no legacy host in the config sources', () => {
    expect(STABLE_API_URL).toBe('https://sg-dev-808112092414.asia-southeast1.run.app');
    expect(FALLBACK_API_URL).toBe('');
  });

  it('never fetches config.json from the legacy host by default', () => {
    expect(parseConfigUrls(undefined).some(u => u.includes('akkhayar'))).toBe(false);
  });

  it('builds a report with hosts and no user content', async () => {
    const { fetchImpl } = fakeFetch({ 'https://www.gstatic.com/generate_204': 'ok' });
    const report = await connectionReport({ version: '1.2.3', os: 'android' }, fetchImpl);
    expect(report).toContain('Kakwe 1.2.3 (android)');
    expect(report).toContain('probe www.gstatic.com/generate_204 ok');
    expect(report).toContain('online true');
  });

  it('falls back to /healthz only when /health is 404', async () => {
    const { fetchImpl, calls } = fakeFetch({ [`${OLD}/health`]: 'notfound', [`${OLD}/healthz`]: 'ok', [`${NEW}/health`]: 'down', [`${NEW}/healthz`]: 'ok' });
    expect(await checkHealth(OLD, fetchImpl)).toBe(true);
    expect(calls).toEqual([`${OLD}/health`, `${OLD}/healthz`]);
    expect(await checkHealth(NEW, fetchImpl)).toBe(false);
    expect(calls).not.toContain(`${NEW}/healthz`);
  });

  it('logs one health line with the outcome, not a 404 failure, when /healthz answers', async () => {
    resetDiagMemory();
    const { fetchImpl } = fakeFetch({ [`${OLD}/health`]: 'notfound', [`${OLD}/healthz`]: 'ok', [`${NEW}/health`]: 'down' });
    await checkHealth(OLD, fetchImpl);
    await checkHealth(NEW, fetchImpl);
    const health = (await readLog()).filter(e => e.area === 'connection' && e.event === 'health');
    expect(health).toHaveLength(2);
    expect(health[0]).toMatchObject({ level: 'info', d: { host: 'old.example', ok: true, via: 'healthz' } });
    expect(health[1]).toMatchObject({ level: 'warn', d: { host: 'new.example', ok: false } });
  });

  it('checks health and host helpers', async () => {
    const { fetchImpl } = fakeFetch({ [`${NEW}/health`]: 'ok' });
    expect(await checkHealth(NEW, fetchImpl)).toBe(true);
    expect(await checkHealth(OLD, fetchImpl)).toBe(false);
    expect(apiHost('https://a-b.trycloudflare.com/v1?x=1')).toBe('a-b.trycloudflare.com');
  });
});

const REQ: CheckRequest = { kind: 'job', text: 'x', language: 'en' };

function fakeClient(url: string, behaviour: Record<string, 'network' | 'ok'>): CheckClient {
  const check = jest.fn(async () => {
    if (behaviour[url] === 'network') throw new ApiError('network', 'Failed to fetch');
    return { verdict: `from ${url}` } as never;
  });
  return { isMock: false, check, speak: check, health: check, insights: check, feedback: check } as unknown as CheckClient;
}

describe('runtime client retry and classification', () => {
  const make = (behaviour: Record<string, 'network' | 'ok'>) => jest.fn((url: string) => fakeClient(url, behaviour));

  it('re-resolves once on a network error and retries on the new url', async () => {
    const makeClient = make({ [OLD]: 'network', [NEW]: 'ok' });
    const refresh = jest.fn().mockResolvedValue(NEW);
    const client = createRuntimeClient(async () => OLD, false, { refresh, internet: async () => true, makeClient });
    await expect(client.check(REQ)).resolves.toEqual({ verdict: `from ${NEW}` });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not retry when the url is unchanged, and says the server is unreachable if internet works', async () => {
    const makeClient = make({ [OLD]: 'network' });
    const refresh = jest.fn().mockResolvedValue(OLD);
    const client = createRuntimeClient(async () => OLD, false, { refresh, internet: async () => true, makeClient });
    await expect(client.check(REQ)).rejects.toMatchObject({ code: 'server_unreachable' });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the offline error when the internet probe fails too', async () => {
    const makeClient = make({ [OLD]: 'network' });
    const client = createRuntimeClient(async () => OLD, false, { refresh: async () => OLD, internet: async () => false, makeClient });
    await expect(client.check(REQ)).rejects.toMatchObject({ code: 'network' });
  });

  it('retries only once when the new url fails too', async () => {
    const makeClient = make({ [OLD]: 'network', [NEW]: 'network' });
    const refresh = jest.fn().mockResolvedValue(NEW);
    const client = createRuntimeClient(async () => OLD, false, { refresh, internet: async () => true, makeClient });
    await expect(client.check(REQ)).rejects.toMatchObject({ code: 'server_unreachable' });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh for HTTP errors', async () => {
    const check = jest.fn().mockRejectedValue(new ApiError('upstream', 'HTTP 502', 502));
    const refresh = jest.fn();
    const client = createRuntimeClient(async () => OLD, false, { refresh, makeClient: () => ({ check } as unknown as CheckClient) });
    await expect(client.check(REQ)).rejects.toMatchObject({ code: 'upstream' });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('probes the internet with any answer counting as online', async () => {
    const up = jest.fn().mockResolvedValue({ ok: false, status: 0 });
    expect(await hasInternet(up as unknown as typeof fetch)).toBe(true);
    const down = jest.fn().mockRejectedValue(new TypeError('x'));
    expect(await hasInternet(down as unknown as typeof fetch)).toBe(false);
    const onlyOne = jest.fn((u: string) => (u.includes('hicloud') ? Promise.resolve({ ok: true }) : Promise.reject(new TypeError('blocked'))));
    expect(await hasInternet(onlyOne as unknown as typeof fetch)).toBe(true);
  });
});
