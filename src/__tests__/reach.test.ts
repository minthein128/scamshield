import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL_CACHE_KEY, apiHost, checkHealth, connectionReport, fetchFirstApiUrl, hasInternet, parseConfigUrls, resolveApiUrl } from '../config/runtime';
import { ApiError, createRuntimeClient, type CheckClient, type CheckRequest } from '../api';

const A = 'https://a.config/config.json';
const B = 'https://b.config/config.json';
const OLD = 'https://old.example';
const NEW = 'https://new.example';

type Route = 'down' | 'hang' | { apiUrl: string } | 'ok';

function fakeFetch(routes: Record<string, Route>) {
  const calls: string[] = [];
  const impl = jest.fn((url: string, init?: RequestInit) => {
    calls.push(url);
    const route = routes[url] ?? 'down';
    if (route === 'down') return Promise.reject(new TypeError('Failed to fetch'));
    if (route === 'hang') return new Promise((_r, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('abort'))));
    return Promise.resolve({ ok: true, json: async () => (route === 'ok' ? {} : route) });
  });
  return { fetchImpl: impl as unknown as typeof fetch, calls };
}

const base = { configUrls: [A, B], staggerMs: 0, envUrl: OLD, stableUrl: '' };

beforeEach(() => AsyncStorage.clear());

describe('config sources', () => {
  it('parses a comma list and defaults to the two Hosting domains', () => {
    expect(parseConfigUrls(' https://x.example/c.json, junk ,http://y.example/c.json ')).toEqual(['https://x.example/c.json', 'http://y.example/c.json']);
    expect(parseConfigUrls(undefined)).toEqual(['https://saferoute-api.akkhayar.com/config.json', 'https://saferoute-aibc.web.app/config.json', 'https://saferoute-aibc.firebaseapp.com/config.json']);
  });

  it('takes the second source when the first is blocked', async () => {
    const { fetchImpl } = fakeFetch({ [A]: 'down', [B]: { apiUrl: NEW }, [`${NEW}/healthz`]: 'ok' });
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
    const { fetchImpl } = fakeFetch({ [A]: { apiUrl: NEW }, [`${NEW}/healthz`]: 'ok' });
    expect(await resolveApiUrl({ ...base, envUrl: '', fetchImpl })).toBe(NEW);
  });

  it('never switches to a source url that fails health while the current one passes', async () => {
    await AsyncStorage.setItem(API_URL_CACHE_KEY, OLD);
    const { fetchImpl } = fakeFetch({ [A]: { apiUrl: NEW }, [`${OLD}/healthz`]: 'ok' });
    expect(await resolveApiUrl({ ...base, envUrl: '', fetchImpl })).toBe(OLD);
    expect(await AsyncStorage.getItem(API_URL_CACHE_KEY)).toBe(OLD);
  });

  it('replaces a dead cache with a healthy baked url when sources are blocked', async () => {
    await AsyncStorage.setItem(API_URL_CACHE_KEY, 'https://dead.example');
    const { fetchImpl } = fakeFetch({ [`${OLD}/healthz`]: 'ok' });
    expect(await resolveApiUrl({ ...base, fetchImpl })).toBe(OLD);
  });

  it('falls through a stable domain that does not resolve yet and keeps working', async () => {
    const stable = 'https://api.stable.test';
    const { fetchImpl } = fakeFetch({ [B]: { apiUrl: NEW }, [`${NEW}/healthz`]: 'ok' });
    expect(await resolveApiUrl({ ...base, configUrls: [`${stable}/config.json`, A, B], stableUrl: stable, fetchImpl })).toBe(NEW);
  });

  it('uses the stable domain when it is healthy and every config source is blocked', async () => {
    const stable = 'https://api.stable.test';
    await AsyncStorage.setItem(API_URL_CACHE_KEY, OLD);
    const { fetchImpl } = fakeFetch({ [`${stable}/healthz`]: 'ok' });
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
    const { fetchImpl, calls } = fakeFetch({ [`${stable}/healthz`]: 'ok', [A]: 'hang', [B]: 'hang' });
    expect(await resolveApiUrl({ ...base, stableUrl: stable, graceMs: 10, fetchImpl })).toBe(stable);
    expect(calls).toContain(`${stable}/healthz`);
  });

  it('builds a report with hosts and no user content', async () => {
    const { fetchImpl } = fakeFetch({ 'https://www.gstatic.com/generate_204': 'ok' });
    const report = await connectionReport({ version: '1.2.3', os: 'android' }, fetchImpl);
    expect(report).toContain('SafeRoute 1.2.3 (android)');
    expect(report).toContain('probe www.gstatic.com/generate_204 ok');
    expect(report).toContain('online true');
  });

  it('checks health and host helpers', async () => {
    const { fetchImpl } = fakeFetch({ [`${NEW}/healthz`]: 'ok' });
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
