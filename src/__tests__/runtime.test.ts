import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL_CACHE_KEY, resolveApiUrl, validApiUrl } from '../config/runtime';
import { createRuntimeClient } from '../api';

const remote = (body: unknown, ok = true) => jest.fn().mockResolvedValue({ ok, json: async () => body });

describe('runtime api url', () => {
  beforeEach(() => AsyncStorage.clear());

  it('uses and caches the remote value', async () => {
    expect(await resolveApiUrl({ fetchImpl: remote({ apiUrl: 'https://t.example/' }), envUrl: 'https://env.example' })).toBe('https://t.example');
    expect(await AsyncStorage.getItem(API_URL_CACHE_KEY)).toBe('https://t.example');
  });

  it('falls back to the cache, then to the env value', async () => {
    await AsyncStorage.setItem(API_URL_CACHE_KEY, 'https://cached.example');
    const down = jest.fn().mockRejectedValue(new Error('offline'));
    expect(await resolveApiUrl({ fetchImpl: down, envUrl: 'https://env.example' })).toBe('https://cached.example');
    await AsyncStorage.clear();
    expect(await resolveApiUrl({ fetchImpl: down, envUrl: 'https://env.example' })).toBe('https://env.example');
    expect(await resolveApiUrl({ fetchImpl: remote({ apiUrl: 'nope' }), envUrl: '' })).toBe('');
  });

  it('rejects bad values and non-200 answers', async () => {
    expect(validApiUrl('ftp://x')).toBeNull();
    expect(validApiUrl(5)).toBeNull();
    expect(await resolveApiUrl({ fetchImpl: remote({ apiUrl: 'https://t.example' }, false), envUrl: 'https://env.example' })).toBe('https://env.example');
  });

  it('times out after 3 seconds', async () => {
    jest.useFakeTimers();
    const hang = jest.fn((_u: string, init: RequestInit) => new Promise((_r, rej) => init.signal?.addEventListener('abort', () => rej(new Error('abort')))));
    const p = resolveApiUrl({ fetchImpl: hang as unknown as typeof fetch, envUrl: 'https://env.example' });
    await jest.advanceTimersByTimeAsync(3100);
    expect(await p).toBe('https://env.example');
    jest.useRealTimers();
  });

  it('builds the api client from the resolved url, and reports unavailable without one', async () => {
    await expect(createRuntimeClient(async () => '', false).check({ kind: 'job', text: 'x', language: 'en' })).rejects.toMatchObject({ code: 'unavailable' });
  });
});
