import { createClientFromEnv, streamsChecks } from '../api';
import { createHttpClient } from '../api/http';
import { diag } from '../lib/diagLog';
import { createMockClient } from '../api/mock';
import { createSseParser } from '../api/sse';
import type { CheckRequest, CheckUpdate } from '../api/types';

const request: CheckRequest = { kind: 'job', text: 'Urgent data entry in Thailand', language: 'en' };
const result = (verdict: string, extra: object = {}) => ({
  id: 'chk_1',
  createdAt: '2026-10-14T00:00:00Z',
  kind: 'job',
  verdict,
  score: 80,
  title: 't',
  summary: 's',
  spokenWarning: 'w',
  scamType: 'job_trafficking',
  flags: [],
  linkChecks: [],
  actions: [],
  model: 'gemini',
  ...extra,
});
const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const body = [
  sse('stage', { stage: 'extract', status: 'done', ms: 1500 }),
  sse('verdict', result('danger')),
  sse('final', result('danger', { sources: [{ title: 'a', url: 'https://a.example' }] })),
].join('');

const streamResponse = (text: string, chunk = 17) => {
  const bytes = new TextEncoder().encode(text);
  let i = 0;
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'text/event-stream' : null) },
    body: {
      getReader: () => ({
        read: async () => {
          if (i >= bytes.length) return { done: true, value: undefined };
          const value = bytes.slice(i, i + chunk);
          i += chunk;
          return { done: false, value };
        },
      }),
    },
  };
};

describe('sse parser', () => {
  it('emits events split across chunks', () => {
    const seen: string[] = [];
    const p = createSseParser(e => seen.push(`${e.event}:${e.data}`));
    p.push('event: a\ndata: 1\n\neve');
    p.push('nt: b\r\ndata: 2\r\n\r\n');
    expect(seen).toEqual(['a:1', 'b:2']);
  });
});

describe('streamed check', () => {
  it('calls onUpdate for stage, verdict and final, and resolves with the final result', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(streamResponse(body));
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl });
    const updates: CheckUpdate[] = [];
    const out = await client.check(request, { onUpdate: u => updates.push(u) });
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.test/v1/check?stream=1');
    expect(updates.map(u => u.type)).toEqual(['stage', 'verdict', 'final']);
    expect(out.sources).toHaveLength(1);
  });

  it('falls back to the plain reply when the server answers JSON', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => result('careful') });
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl });
    const onUpdate = jest.fn();
    const out = await client.check(request, { onUpdate });
    expect(out.verdict).toBe('careful');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('reads a whole body when the runtime cannot stream', async () => {
    const res = { ...streamResponse(body), body: null, text: async () => body };
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: jest.fn().mockResolvedValue(res) });
    const out = await client.check(request, { onUpdate: () => {} });
    expect(out.verdict).toBe('danger');
  });

  it('surfaces a stream error event as an ApiError', async () => {
    const res = streamResponse(sse('error', { error: { code: 'upstream', message: 'Model call failed' } }));
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: jest.fn().mockResolvedValue(res) });
    await expect(client.check(request, { onUpdate: () => {} })).rejects.toMatchObject({ code: 'upstream' });
  });

  it('posts normally without onUpdate or when streaming is off', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => result('danger') });
    await createHttpClient({ baseUrl: 'https://api.test', fetchImpl }).check(request);
    await createHttpClient({ baseUrl: 'https://api.test', fetchImpl, stream: false }).check(request, { onUpdate: () => {} });
    expect(fetchImpl.mock.calls.map(c => c[0])).toEqual(['https://api.test/v1/check', 'https://api.test/v1/check']);
  });

  it('keeps the check alive when the listener throws', async () => {
    const client = createHttpClient({ baseUrl: 'https://api.test', fetchImpl: jest.fn().mockResolvedValue(streamResponse(body)) });
    const out = await client.check(request, {
      onUpdate: () => {
        throw new Error('ui bug');
      },
    });
    expect(out.verdict).toBe('danger');
  });

  it('mock client emits a provisional verdict before the final result', async () => {
    const updates: string[] = [];
    await createMockClient({ delayMs: 10 }).check(request, { onUpdate: u => updates.push(u.type) });
    expect(updates.filter(u => u !== 'stage')).toEqual(['verdict', 'final']);
    expect(updates.filter(u => u === 'stage')).toHaveLength(8);
  });
});

describe('streamed check fallback', () => {
  const plainReply = (verdict = 'careful') => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => result(verdict) });
  const urls = (fetchImpl: jest.Mock) => fetchImpl.mock.calls.map(c => c[0]);
  const hangsUntilAbort = (_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      if (init.signal?.aborted) reject(new Error('aborted'));
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    });

  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(diag, 'warn');
  });
  afterEach(() => warn.mockRestore());

  it('retries plainly once when the streamed fetch rejects, and returns one result', async () => {
    const fetchImpl = jest.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(plainReply());
    const updates: CheckUpdate[] = [];
    const out = await createHttpClient({ baseUrl: 'https://api.test', fetchImpl }).check(request, { onUpdate: u => updates.push(u) });
    expect(urls(fetchImpl)).toEqual(['https://api.test/v1/check?stream=1', 'https://api.test/v1/check']);
    expect(out.verdict).toBe('careful');
    expect(updates.filter(u => u.type === 'final')).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith('api', 'stream_fallback', expect.objectContaining({ kind: 'network' }));
  });

  it('retries plainly when the stream ends without a final event', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(streamResponse(sse('stage', { stage: 'extract', status: 'done', ms: 5 }))).mockResolvedValueOnce(plainReply('safe'));
    const out = await createHttpClient({ baseUrl: 'https://api.test', fetchImpl }).check(request, { onUpdate: () => {} });
    expect(urls(fetchImpl)).toEqual(['https://api.test/v1/check?stream=1', 'https://api.test/v1/check']);
    expect(out.verdict).toBe('safe');
    expect(warn).toHaveBeenCalledWith('api', 'stream_fallback', expect.objectContaining({ kind: 'no_final' }));
  });

  it('retries plainly when the stream sends no byte in time', async () => {
    const silentStream = (_url: string, init: RequestInit) =>
      Promise.resolve({
        ...streamResponse(''),
        body: { getReader: () => ({ read: () => hangsUntilAbort(_url, init) }) },
      });
    const fetchImpl = jest.fn().mockImplementationOnce(silentStream).mockResolvedValueOnce(plainReply());
    const out = await createHttpClient({ baseUrl: 'https://api.test', fetchImpl, streamFirstByteMs: 20 }).check(request, { onUpdate: () => {} });
    expect(out.verdict).toBe('careful');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith('api', 'stream_fallback', expect.objectContaining({ kind: 'first_byte_timeout' }));
  });

  it('keeps the final result when the stream breaks after it', async () => {
    const res = streamResponse(body);
    const reader = res.body.getReader();
    const chunked = {
      ...res,
      body: {
        getReader: () => ({
          read: async () => {
            const r = await reader.read();
            if (r.done) throw new Error('connection reset');
            return r;
          },
        }),
      },
    };
    const fetchImpl = jest.fn().mockResolvedValue(chunked);
    const out = await createHttpClient({ baseUrl: 'https://api.test', fetchImpl }).check(request, { onUpdate: () => {} });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(out.sources).toHaveLength(1);
  });

  it('does not retry an answer from the server', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 429, headers: { get: () => null }, json: async () => ({ error: { code: 'rate_limited', message: 'slow down' } }) });
    await expect(createHttpClient({ baseUrl: 'https://api.test', fetchImpl }).check(request, { onUpdate: () => {} })).rejects.toMatchObject({ code: 'rate_limited' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry a cancelled check', async () => {
    const controller = new AbortController();
    const fetchImpl = jest.fn().mockImplementation(hangsUntilAbort);
    const pending = createHttpClient({ baseUrl: 'https://api.test', fetchImpl }).check(request, { onUpdate: () => {}, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('gives up when the stream used the whole check budget', async () => {
    const fetchImpl = jest.fn().mockImplementation(hangsUntilAbort);
    await expect(createHttpClient({ baseUrl: 'https://api.test', fetchImpl, checkTimeoutMs: 30 }).check(request, { onUpdate: () => {} })).rejects.toMatchObject({ code: 'timeout' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('stream choice by platform', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('streams only on web', () => {
    expect(streamsChecks('web')).toBe(true);
    expect(streamsChecks('android')).toBe(false);
    expect(streamsChecks('ios')).toBe(false);
  });

  it.each([
    ['android', 'https://api.test/v1/check'],
    ['web', 'https://api.test/v1/check?stream=1'],
  ])('on %s posts to %s', async (os, url) => {
    const fetchMock = jest.fn().mockResolvedValue({ ...streamResponse(body), json: async () => result('danger') });
    global.fetch = fetchMock as unknown as typeof fetch;
    const out = await createClientFromEnv('https://api.test', false, os).check(request, { onUpdate: () => {} });
    expect(fetchMock.mock.calls[0][0]).toBe(url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.verdict).toBe('danger');
  });
});
