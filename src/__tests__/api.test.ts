import { createHttpClient } from '../api/http';
import { ApiError, userMessage } from '../api/errors';
import { createClientFromEnv } from '../api';
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
    expect(userMessage(new Error('x'))).toMatch(/went wrong/i);
  });
});

describe('client selection', () => {
  it('uses the mock when the API URL is unset', () => {
    expect(createClientFromEnv(undefined).isMock).toBe(true);
    expect(createClientFromEnv('  ').isMock).toBe(true);
    expect(createClientFromEnv('https://api.test').isMock).toBe(false);
  });
});
