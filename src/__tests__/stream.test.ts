import { createHttpClient } from '../api/http';
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
    expect(updates).toEqual(['verdict', 'final']);
  });
});
