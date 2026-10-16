import { createHttpClient } from '../api/http';
import { ApiError, errorCopy, userMessage } from '../api/errors';
import { createClientFromEnv } from '../api';
import { createMockClient } from '../api/mock';
import type { CheckRequest } from '../api/types';

const request: CheckRequest = { kind: 'job', text: 'Urgent data entry in Thailand', language: 'en' };

const okBody = {
  id: 'chk_1',
  createdAt: '2026-10-14T00:00:00Z',
  kind: 'job',
  verdict: 'danger',
  score: 82,
  title: 't',
  summary: 's',
  spokenWarning: 'w',
  scamType: 'job_trafficking',
  flags: [],
  linkChecks: [],
  actions: [],
  model: 'gemini',
};

const reply = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });

describe('http client', () => {
  it('posts to /v1/check and returns the response', async () => {
    const fetchImpl = reply(200, okBody);
    const client = createHttpClient({ baseUrl: 'https://api.test/', fetchImpl });
    const result = await client.check(request);
    expect(result.verdict).toBe('danger');
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/v1/check', expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }));
  });

  it('maps contract error bodies to ApiError codes', async () => {
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: reply(429, { error: { code: 'rate_limited', message: 'slow down' } }) });
    await expect(client.check(request)).rejects.toMatchObject({ code: 'rate_limited', status: 429 });
  });

  it('maps bare HTTP statuses', async () => {
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: reply(503, null) });
    await expect(client.check(request)).rejects.toMatchObject({ code: 'upstream' });
  });

  it('maps network failures and bad shapes', async () => {
    const down = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: jest.fn().mockRejectedValue(new Error('offline')) });
    await expect(down.check(request)).rejects.toMatchObject({ code: 'network' });
    const odd = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: reply(200, { hello: 1 }) });
    await expect(odd.check(request)).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it('times out', async () => {
    const fetchImpl = jest.fn((_url: string, init: RequestInit) => new Promise((_res, rej) => init.signal?.addEventListener('abort', () => rej(new Error('aborted')))));
    const client = createHttpClient({ baseUrl: 'https://api.test', timeoutMs: 20, fetchImpl: fetchImpl as unknown as typeof fetch });
    await expect(client.check(request)).rejects.toMatchObject({ code: 'timeout' });
  });

  it('rejects empty input before sending', async () => {
    const fetchImpl = reply(200, okBody);
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl });
    await expect(client.check({ kind: 'job', language: 'en' })).rejects.toBeInstanceOf(ApiError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('gives a user message for every error', () => {
    expect(userMessage(new ApiError('network', 'x'))).toMatch(/connection/i);
    expect(errorCopy(new Error('x')).title).toMatch(/went wrong/i);
  });

  it('separates offline, rate-limited and server-down states', () => {
    expect(errorCopy(new ApiError('network', 'x')).title).toMatch(/offline/i);
    expect(errorCopy(new ApiError('upstream', 'x')).title).toMatch(/down/i);
    expect(errorCopy(new ApiError('rate_limited', 'x', 429, 1800)).message).toMatch(/30 minutes/);
    expect(errorCopy(new ApiError('rate_limited', 'x', 429)).message).toMatch(/free account/i);
  });

  it('sends the auth token when there is one and keeps working without', async () => {
    const withToken = reply(200, okBody);
    await createHttpClient({ baseUrl: 'https://api.test', fetchImpl: withToken, getToken: async () => 'tok' }).check(request);
    expect((withToken.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });

    const without = reply(200, okBody);
    await createHttpClient({ baseUrl: 'https://api.test', fetchImpl: without, getToken: async () => null }).check(request);
    expect((without.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty('Authorization');

    const broken = reply(200, okBody);
    await createHttpClient({ baseUrl: 'https://api.test', fetchImpl: broken, getToken: async () => { throw new Error('offline'); } }).check(request);
    expect(broken).toHaveBeenCalled();
  });

  it('reads Retry-After from a 429', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => '1200' },
      json: async () => ({ error: { code: 'rate_limited', message: 'm' } }),
    });
    await expect(createHttpClient({ baseUrl: 'https://api.test', fetchImpl }).check(request)).rejects.toMatchObject({ code: 'rate_limited', retryAfterSec: 1200 });
  });
});

describe('client selection', () => {
  it('uses the mock only as a development fallback when the API URL is unset', () => {
    expect(createClientFromEnv(undefined, true).isMock).toBe(true);
    expect(createClientFromEnv('  ', true).isMock).toBe(true);
    expect(createClientFromEnv('https://api.test', true).isMock).toBe(false);
  });

  it('never uses the mock in a release build', async () => {
    const client = createClientFromEnv(undefined, false);
    expect(client.isMock).toBe(false);
    await expect(client.check(request)).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('speak and sources', () => {
  it('posts to /v1/speak', async () => {
    const fetchImpl = reply(200, { audioBase64: 'AAAA', mimeType: 'audio/wav', sampleRate: 24000, model: 'tts' });
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl });
    const out = await client.speak({ text: 'hi', language: 'my' });
    expect(out.audioBase64).toBe('AAAA');
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/v1/speak', expect.objectContaining({ method: 'POST' }));
  });

  it('defaults sources to an empty list and keeps given ones', async () => {
    const plain = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: reply(200, okBody) });
    expect((await plain.check(request)).sources).toEqual([]);
    const withSrc = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: reply(200, { ...okBody, sources: [{ title: 'T', url: 'https://x.test' }] }) });
    expect((await withSrc.check(request)).sources).toHaveLength(1);
  });

  it('mock speak fails so the app falls back to a local voice', async () => {
    await expect(createMockClient({ delayMs: 0 }).speak({ text: 'x', language: 'my' })).rejects.toMatchObject({ code: 'upstream' });
  });
});
