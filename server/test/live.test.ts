import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createLimits } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { HOTLINES } from '../src/data/hotlines.generated.js';
import {
  attachLive,
  type LiveCallbacks,
  type LiveConnect,
  type LiveSessionLike,
  liveConfig,
  liveCounters,
  parseContext,
  parseStart,
} from '../src/live.js';
import { createMockLiveConnect } from '../src/live-mock.js';
import { allowedNumbers, buildContextTurn, buildSystemInstruction, type LiveReport, redactText } from '../src/live-prompt.js';
import type { Pipeline } from '../src/pipeline.js';

const REPORT: LiveReport = {
  verdict: 'danger',
  score: 82,
  title: 'High risk',
  summary: 'The offer asks for a fee before work and holds your passport. Call +66 81 234 5678 to apply.',
  scamType: 'job_trafficking',
  flags: [
    {
      family: 'payment_route',
      label: 'Fee before the job starts',
      evidence: 'Send 5000 baht to account 123-4-56789-0 first',
      severity: 'high',
    },
    { family: 'trafficking', label: 'Passport kept by the recruiter', evidence: 'We keep your passport safe', severity: 'high' },
  ],
  sources: [{ title: 'Recruitment warning', url: 'https://example.org/warning' }],
  network: { seenCount: 4 },
};

describe('parseStart', () => {
  const ok = (o: object) => parseStart(JSON.stringify({ type: 'start', language: 'en', ...o }));

  it('accepts a check id and defaults the mode', () => {
    const r = ok({ checkId: 'chk_abc' });
    expect(r).toMatchObject({ ok: true, start: { checkId: 'chk_abc', mode: 'self', language: 'en' } });
  });

  it('upper-cases country codes and accepts the report fallback', () => {
    const r = ok({ report: REPORT, home: 'mm', destination: 'th', mode: 'family' });
    expect(r).toMatchObject({ ok: true, start: { home: 'MM', destination: 'TH', mode: 'family' } });
  });

  it('rejects a start with neither id nor report', () => {
    expect(ok({}).ok).toBe(false);
  });

  it('rejects unknown languages, modes and malformed countries', () => {
    expect(ok({ checkId: 'c', language: 'fr' }).ok).toBe(false);
    expect(ok({ checkId: 'c', mode: 'x' }).ok).toBe(false);
    expect(ok({ checkId: 'c', home: 'Myanmar' }).ok).toBe(false);
  });

  it('rejects a report with an out-of-range score or too many flags', () => {
    expect(ok({ report: { ...REPORT, score: 500 } }).ok).toBe(false);
    expect(ok({ report: { ...REPORT, flags: Array(21).fill(REPORT.flags[0]) } }).ok).toBe(false);
  });

  it('rejects non-JSON, a wrong type and an oversized frame', () => {
    expect(parseStart('nope').ok).toBe(false);
    expect(parseStart(JSON.stringify({ type: 'audio', checkId: 'c' })).ok).toBe(false);
    expect(parseStart(JSON.stringify({ type: 'start', checkId: 'c', token: 'x'.repeat(70_000) })).ok).toBe(false);
  });
});

describe('buildSystemInstruction', () => {
  const prompt = (o: Partial<Parameters<typeof buildSystemInstruction>[0]> = {}) =>
    buildSystemInstruction({ report: REPORT, language: 'my', mode: 'self', home: 'MM', destination: 'TH', ...o });

  it('lists the verified hotlines of both countries', () => {
    const p = prompt();
    for (const h of HOTLINES.filter((x) => x.country === 'TH' && x.number && x.category !== 'consular').slice(0, 3))
      expect(p).toContain(h.number as string);
    expect(p).toContain('Never say any phone number that is not in this list');
    expect(p).toContain('Home country - Myanmar');
  });

  it('keeps consular lines for the home country only', () => {
    const consular = HOTLINES.find((h) => h.country === 'TH' && h.category === 'consular' && h.number);
    expect(consular).toBeDefined();
    expect(prompt({ home: 'MM', destination: 'TH' })).not.toContain(consular?.number as string);
    expect(prompt({ home: 'TH', destination: undefined })).toContain(consular?.number as string);
  });

  it('answers in the listener language from the allowed set, starting in the session language', () => {
    const p = prompt();
    expect(p).not.toContain('Speak ONLY');
    expect(p).toContain('Answer in the language the listener is speaking, if it is one of these');
    expect(p).toContain('Start in Burmese (Myanmar script)');
    expect(p).toContain('Kakwe can talk in မြန်မာ, English, ไทย, Bahasa Indonesia, Tagalog');
    expect(p).toContain('ဒီအလုပ်ကမ်းလှမ်းချက်မှာ');
    expect(p).toContain('Two or three short sentences');
    const narrow = prompt({ allowed: ['en', 'my'] });
    expect(narrow).toContain('You can speak Burmese (Myanmar script), English.');
    expect(narrow).not.toContain('ไทย');
  });

  it('forbids promising actions Kakwe cannot take, in every mode', () => {
    for (const mode of ['self', 'family', 'companion'] as const) {
      const p = prompt({ mode, language: 'en' });
      expect(p).toContain('Never promise anything Kakwe cannot do');
      expect(p).toContain('Never say "we will send"');
      expect(p).toContain('Warn my family');
    }
  });

  it('uses female speaker forms in every mode', () => {
    for (const mode of ['self', 'family', 'companion'] as const) {
      const p = prompt({ mode });
      expect(p).toContain("Your voice is a woman's voice");
      expect(p).toContain('ကျွန်မ');
      expect(p).toContain('never ကျွန်တော်');
      expect(p).toContain('ค่ะ');
      expect(p).toContain('never ครับ');
    }
  });

  it('carries the likelihood rules, the scope rule and the danger rule', () => {
    const p = prompt({ language: 'en' });
    expect(p).toContain('You cannot know that something is a scam');
    expect(p).toContain('run a new check');
    expect(p).toContain('passport is held');
    expect(p).toContain('open_action_sheet');
    expect(p).toContain('Never ask for a name, passport');
  });

  it('says no number outside the hotline list', () => {
    let text = prompt({ language: 'en' });
    for (const n of allowedNumbers('MM', 'TH')) text = text.replaceAll(n, '');
    const stray = (text.match(/\d{3,}/g) ?? []).filter((d) => d !== '100');
    expect(stray).toEqual([]);
  });

  it('redacts phone numbers and account numbers quoted from the input', () => {
    const p = prompt({ language: 'en' });
    expect(p).not.toContain('234 5678');
    expect(p).not.toContain('56789');
    expect(p).toContain('Fee before the job starts');
  });

  it('works without any country and says the list is empty', () => {
    expect(prompt({ home: undefined, destination: undefined })).toContain('no verified hotline is known');
  });

  it('speaks to a relative in family mode', () => {
    expect(prompt({ mode: 'family' })).toContain('relative or close friend');
    expect(prompt({ mode: 'self' })).not.toContain('relative or close friend');
  });

  it('keeps every rule in companion mode and adds the recheck rule', () => {
    const p = prompt({ mode: 'companion', language: 'en' });
    expect(p).toContain('using another app');
    expect(p).toContain('One or two short sentences');
    expect(p).not.toContain('Two or three short sentences');
    expect(p).toContain('You never judge new content yourself');
    expect(p).toContain('recheck_screen');
    expect(p).toContain('NEW CURRENT REPORT');
    expect(p).toContain('You cannot know that something is a scam');
    expect(p).toContain('Never call a named person');
    expect(p).toContain('Never say any phone number that is not in this list');
    expect(p).toContain('Never ask for a name, passport');
    expect(p).toContain('passport is held');
    expect(p).toContain('do not speak first');
    expect(p).not.toContain('234 5678');
  });

  it('leaves the recheck rule out of the in-app modes', () => {
    expect(prompt({ mode: 'self' })).not.toContain('recheck_screen');
    expect(prompt({ mode: 'family' })).not.toContain('recheck_screen');
  });
});

describe('companion tools and context', () => {
  const names = (mode: 'self' | 'companion') =>
    (liveConfig({ liveVoice: 'v' }, 'x', ['en'], mode).tools ?? []).flatMap((t) =>
      ((t as { functionDeclarations?: { name: string }[] }).functionDeclarations ?? []).map((d) => d.name),
    );

  it('declares recheck_screen only in companion mode', () => {
    expect(names('companion')).toEqual(['open_action_sheet', 'recheck_screen']);
    expect(names('self')).toEqual(['open_action_sheet']);
  });

  it('sets no fixed output language and hints the allowed languages to transcription', () => {
    const c = liveConfig({ liveVoice: 'Sulafat' }, 'x', ['en', 'my', 'th']);
    expect(c.speechConfig).toEqual({ voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Sulafat' } } });
    expect(c.inputAudioTranscription).toEqual({ languageCodes: ['en-US', 'my-MM', 'th-TH'] });
  });

  it('validates context frames', () => {
    const ok = (o: object) => parseContext(JSON.stringify({ type: 'context', ...o }));
    expect(ok({ report: REPORT })).toMatchObject({ ok: true });
    expect(ok({ checkId: 'chk_1' })).toMatchObject({ ok: true });
    expect(ok({ error: 'check_failed' })).toMatchObject({ ok: true });
    expect(ok({}).ok).toBe(false);
    expect(ok({ report: { ...REPORT, verdict: 'scam' } }).ok).toBe(false);
    expect(ok({ report: { ...REPORT, summary: 'x'.repeat(2001) } }).ok).toBe(false);
    expect(ok({ error: 'other' }).ok).toBe(false);
    expect(parseContext('nope').ok).toBe(false);
    expect(parseContext(JSON.stringify({ type: 'context', report: REPORT, pad: 'x'.repeat(70_000) })).ok).toBe(false);
  });

  it('redacts the injected report and marks it as the current one', () => {
    const turn = buildContextTurn(REPORT);
    expect(turn).toMatch(/^NEW CURRENT REPORT/);
    expect(turn).toContain('replaces the earlier one');
    expect(turn).toContain('Fee before the job starts');
    expect(turn).not.toContain('234 5678');
    expect(turn).not.toContain('56789');
    expect(buildContextTurn(undefined)).toContain('could not run');
  });
});

describe('redactText', () => {
  it('removes long digit runs and emails', () => {
    expect(redactText('call 0812345678 or mail a.b@example.com')).not.toMatch(/\d{5}|@/);
  });
});

interface Fake {
  connect: LiveConnect;
  sessions: { cb: LiveCallbacks; audio: string[]; tools: unknown[]; texts: string[]; closed: boolean; config: unknown }[];
}

function fakeConnect(fail = false): Fake {
  const sessions: Fake['sessions'] = [];
  const connect: LiveConnect = async (p) => {
    if (fail) throw new Error('boom');
    const s = { cb: p.callbacks, audio: [] as string[], tools: [] as unknown[], texts: [] as string[], closed: false, config: p.config };
    sessions.push(s);
    const live: LiveSessionLike = {
      sendRealtimeInput: (x) => void (x.audio && s.audio.push(x.audio.data)),
      sendToolResponse: (x) => void s.tools.push(x),
      sendClientContent: (x) => void s.texts.push(...x.turns.flatMap((t) => t.parts.map((q) => q.text))),
      close: () => {
        s.closed = true;
      },
    };
    return live;
  };
  return { connect, sessions };
}

const pipeline: Pipeline = {
  run: async () => Promise.reject(new Error('unused')),
  byId: (id) => (id === 'chk_known' ? ({ ...REPORT, id } as never) : undefined),
};

let servers: Server[] = [];
afterEach(() => {
  for (const s of servers) s.closeAllConnections();
  servers = [];
});

async function boot(env: Record<string, string> = {}, fake = fakeConnect(), verifier?: Parameters<typeof attachLive>[1]['verifier']) {
  const cfg = loadConfig({ MOCK: '1', ...env });
  const limits = createLimits(cfg);
  const server = createServer();
  attachLive(server, { cfg, pipeline, limits, connect: fake.connect, verifier });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  const port = (server.address() as AddressInfo).port;
  return { fake, limits, url: `ws://127.0.0.1:${port}/v1/live`, port };
}

function client(url: string) {
  const ws = new WebSocket(url);
  const frames: Record<string, unknown>[] = [];
  const waiters: (() => void)[] = [];
  ws.on('message', (d) => {
    frames.push(JSON.parse(d.toString()));
    for (const w of waiters.splice(0)) w();
  });
  const until = async (pred: (f: Record<string, unknown>) => boolean, ms = 2000) => {
    const end = Date.now() + ms;
    for (;;) {
      const hit = frames.find(pred);
      if (hit) return hit;
      if (Date.now() > end) throw new Error(`timeout; got ${JSON.stringify(frames.map((f) => f.type))}`);
      await new Promise<void>((r) => {
        waiters.push(r);
        setTimeout(r, 50);
      });
    }
  };
  const open = new Promise<void>((r) => ws.on('open', () => r()));
  const closed = new Promise<void>((r) => ws.on('close', () => r()));
  return { ws, frames, until, open, closed, send: (o: object) => ws.send(JSON.stringify(o)) };
}

const start = (o: object = {}) => ({
  type: 'start',
  checkId: 'chk_known',
  language: 'en',
  mode: 'self',
  home: 'MM',
  destination: 'TH',
  ...o,
});

describe('live relay', () => {
  it('rejects an unknown check id with not_found', async () => {
    const { url } = await boot();
    const c = client(url);
    await c.open;
    c.send(start({ checkId: 'chk_nope' }));
    expect(await c.until((f) => f.type === 'error')).toMatchObject({ code: 'not_found' });
    expect(await c.until((f) => f.type === 'closed')).toMatchObject({ reason: 'error' });
  });

  it('accepts the report fallback when the id is unknown', async () => {
    const { url } = await boot();
    const c = client(url);
    await c.open;
    c.send(start({ checkId: 'chk_nope', report: REPORT }));
    await c.until((f) => f.type === 'ready');
  });

  it('refuses a language outside LIVE_LANGUAGES with unsupported_language', async () => {
    const { url } = await boot({ LIVE_LANGUAGES: 'en,my' });
    const c = client(url);
    await c.open;
    c.send(start({ language: 'th' }));
    expect(await c.until((f) => f.type === 'error')).toMatchObject({ code: 'unsupported_language' });
    expect(await c.until((f) => f.type === 'closed')).toMatchObject({ reason: 'error' });
  });

  it('parses LIVE_LANGUAGES with a full default', () => {
    expect(loadConfig({}).liveLanguages).toEqual(['en', 'my', 'th', 'id', 'tl']);
    expect(loadConfig({ LIVE_LANGUAGES: ' MY, en ,xx,my' }).liveLanguages).toEqual(['my', 'en']);
    expect(loadConfig({ LIVE_LANGUAGES: 'xx' }).liveLanguages).toEqual(['en', 'id', 'tl', 'my', 'th']);
  });

  it('counts promises in the spoken text, detect only', async () => {
    const { url, fake } = await boot();
    const before = liveCounters.promise_hit;
    const c = client(url);
    await c.open;
    c.send(start({ language: 'my' }));
    await c.until((f) => f.type === 'ready');
    const cb = fake.sessions[0]?.cb as LiveCallbacks;
    cb.onmessage({ serverContent: { outputTranscription: { text: 'ဖုန်းနံပါတ်တွေကို ပေးပို့ပေးပါမယ်။' } } });
    cb.onmessage({ serverContent: { turnComplete: true } });
    await c.until((f) => f.type === 'transcript' && f.final === true);
    expect(liveCounters.promise_hit - before).toBe(1);
  });

  it('counts male speaker forms in the spoken text, detect only', async () => {
    const { url, fake } = await boot();
    const before = liveCounters.gender_form_hit;
    const c = client(url);
    await c.open;
    c.send(start({ language: 'my' }));
    await c.until((f) => f.type === 'ready');
    const cb = fake.sessions[0]?.cb as LiveCallbacks;
    cb.onmessage({ serverContent: { outputTranscription: { text: 'ကျွန်တော် ပြောပါမယ် ခင်ဗျာ' } } });
    cb.onmessage({ serverContent: { turnComplete: true } });
    const line = await c.until((f) => f.type === 'transcript' && f.final === true);
    expect(line.text).toBe('ကျွန်တော် ပြောပါမယ် ခင်ဗျာ');
    expect(liveCounters.gender_form_hit - before).toBe(2);
  });

  it('rejects a bad start frame with bad_request', async () => {
    const { url } = await boot();
    const c = client(url);
    await c.open;
    c.send({ type: 'start', language: 'zz' });
    expect(await c.until((f) => f.type === 'error')).toMatchObject({ code: 'bad_request' });
  });

  it('relays audio both ways, sends cumulative transcripts and a final line', async () => {
    const { url, fake } = await boot();
    const c = client(url);
    await c.open;
    c.send(start());
    expect(await c.until((f) => f.type === 'ready')).toMatchObject({ maxMs: 120_000 });
    c.send({ type: 'audio', data: 'AAAA' });
    await new Promise((r) => setTimeout(r, 50));
    expect(fake.sessions[0]?.audio).toEqual(['AAAA']);
    const cb = fake.sessions[0]?.cb as LiveCallbacks;
    cb.onmessage({ serverContent: { inputTranscription: { text: 'Is it ' } } });
    cb.onmessage({ serverContent: { inputTranscription: { text: 'safe?' } } });
    cb.onmessage({
      serverContent: { outputTranscription: { text: 'It looks risky. ' }, modelTurn: { parts: [{ inlineData: { data: 'UENN' } }] } },
    });
    cb.onmessage({ serverContent: { outputTranscription: { text: 'Please check first.' } } });
    cb.onmessage({ serverContent: { turnComplete: true } });
    await c.until((f) => f.type === 'transcript' && f.role === 'model' && f.final === true);
    expect(c.frames).toContainEqual({ type: 'audio', data: 'UENN' });
    expect(c.frames).toContainEqual({ type: 'transcript', role: 'user', text: 'Is it safe?' });
    expect(c.frames).toContainEqual({ type: 'transcript', role: 'model', text: 'It looks risky. Please check first.', final: true });
  });

  it('sends interrupted and starts a fresh model line', async () => {
    const { url, fake } = await boot();
    const c = client(url);
    await c.open;
    c.send(start());
    await c.until((f) => f.type === 'ready');
    const cb = fake.sessions[0]?.cb as LiveCallbacks;
    cb.onmessage({ serverContent: { outputTranscription: { text: 'First' } } });
    cb.onmessage({ serverContent: { interrupted: true } });
    cb.onmessage({ serverContent: { outputTranscription: { text: 'Second' } } });
    await c.until((f) => f.type === 'transcript' && f.text === 'Second');
    expect(c.frames.map((f) => f.type)).toContain('interrupted');
  });

  it('relays a valid tool call as an action frame and answers the tool', async () => {
    const { url, fake } = await boot();
    const c = client(url);
    await c.open;
    c.send(start());
    await c.until((f) => f.type === 'ready');
    const cb = fake.sessions[0]?.cb as LiveCallbacks;
    cb.onmessage({ toolCall: { functionCalls: [{ id: 'a', name: 'open_action_sheet', args: { screen: 'HOTLINES' } }] } });
    cb.onmessage({ toolCall: { functionCalls: [{ id: 'b', name: 'open_action_sheet', args: { screen: 'BANK' } }] } });
    expect(await c.until((f) => f.type === 'action')).toEqual({ type: 'action', screen: 'HOTLINES' });
    expect(c.frames.filter((f) => f.type === 'action')).toHaveLength(1);
    expect(fake.sessions[0]?.tools).toHaveLength(2);
  });

  it('closes cleanly on end', async () => {
    const { url, fake } = await boot();
    const c = client(url);
    await c.open;
    c.send(start());
    await c.until((f) => f.type === 'ready');
    c.send({ type: 'end' });
    expect(await c.until((f) => f.type === 'closed')).toMatchObject({ reason: 'end' });
    await c.closed;
    expect(fake.sessions[0]?.closed).toBe(true);
  });

  it('enforces the session cap with closed reason cap', async () => {
    const { url, fake } = await boot({ LIVE_MAX_MS: '150' });
    const c = client(url);
    await c.open;
    c.send(start());
    expect(await c.until((f) => f.type === 'ready')).toMatchObject({ maxMs: 150 });
    const t = Date.now();
    expect(await c.until((f) => f.type === 'closed')).toMatchObject({ reason: 'cap' });
    expect(Date.now() - t).toBeLessThan(1000);
    await c.closed;
    expect(fake.sessions[0]?.closed).toBe(true);
  });

  it('defaults the cap to 120 s and the companion cap to 300 s', () => {
    expect(loadConfig({}).liveMaxMs).toBe(120_000);
    expect(loadConfig({ LIVE_MAX_MS: '90000' }).liveMaxMs).toBe(90_000);
    expect(loadConfig({}).liveCompanionMaxMs).toBe(300_000);
    expect(loadConfig({ LIVE_COMPANION_MAX_MS: '60000' }).liveCompanionMaxMs).toBe(60_000);
  });

  it('runs a companion session: own cap, recheck action, injected context', async () => {
    const { url, fake } = await boot({ LIVE_COMPANION_MAX_MS: '5000' });
    const c = client(url);
    await c.open;
    c.send(start({ mode: 'companion', report: REPORT }));
    expect(await c.until((f) => f.type === 'ready')).toMatchObject({ maxMs: 5000 });
    const cb = fake.sessions[0]?.cb as LiveCallbacks;
    cb.onmessage({ toolCall: { functionCalls: [{ id: 'r', name: 'recheck_screen', args: {} }] } });
    expect(await c.until((f) => f.type === 'action')).toEqual({ type: 'action', screen: 'RECHECK' });
    expect(JSON.stringify(fake.sessions[0]?.tools)).toContain('NEW CURRENT REPORT');
    c.send({ type: 'context', report: { ...REPORT, verdict: 'safe', title: 'No major warning signs', flags: [] } });
    c.send({ type: 'context', checkId: 'chk_known' });
    c.send({ type: 'context', error: 'check_failed' });
    await new Promise((r) => setTimeout(r, 80));
    const texts = fake.sessions[0]?.texts ?? [];
    expect(texts).toHaveLength(3);
    expect(texts[0]).toContain('Verdict: safe');
    expect(texts[1]).toContain('Verdict: danger');
    expect(texts[1]).not.toContain('234 5678');
    expect(texts[2]).toContain('could not run');
    expect(c.frames.some((f) => f.type === 'error')).toBe(false);
  });

  it('ignores recheck_screen outside companion mode and rejects context frames there', async () => {
    const { url, fake } = await boot();
    const c = client(url);
    await c.open;
    c.send(start());
    await c.until((f) => f.type === 'ready');
    const cb = fake.sessions[0]?.cb as LiveCallbacks;
    cb.onmessage({ toolCall: { functionCalls: [{ id: 'r', name: 'recheck_screen', args: {} }] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(c.frames.some((f) => f.type === 'action')).toBe(false);
    c.send({ type: 'context', report: REPORT });
    expect(await c.until((f) => f.type === 'error')).toMatchObject({ code: 'bad_request' });
  });

  it('rejects an invalid context frame and caps their number', async () => {
    const { url } = await boot();
    const c = client(url);
    await c.open;
    c.send(start({ mode: 'companion' }));
    await c.until((f) => f.type === 'ready');
    for (let i = 0; i < 11; i++) c.send({ type: 'context', error: 'check_failed' });
    expect(await c.until((f) => f.type === 'error')).toMatchObject({ code: 'bad_request', message: 'too many context frames' });
    const d = client(url);
    await d.open;
    d.send(start({ mode: 'companion' }));
    await d.until((f) => f.type === 'ready');
    d.send({ type: 'context', report: { ...REPORT, score: 900 } });
    expect(await d.until((f) => f.type === 'error')).toMatchObject({ code: 'bad_request' });
  });

  it('counts certainty phrases in the model transcript, detect only', async () => {
    const { url, fake } = await boot();
    const before = liveCounters.live_certainty_hit;
    const c = client(url);
    await c.open;
    c.send(start());
    await c.until((f) => f.type === 'ready');
    const cb = fake.sessions[0]?.cb as LiveCallbacks;
    cb.onmessage({ serverContent: { outputTranscription: { text: 'This is a scam and it is definitely fake.' } } });
    cb.onmessage({ serverContent: { turnComplete: true } });
    const line = await c.until((f) => f.type === 'transcript' && f.final === true);
    expect(line.text).toBe('This is a scam and it is definitely fake.');
    expect(liveCounters.live_certainty_hit - before).toBeGreaterThanOrEqual(2);
  });

  it('reports an upstream error when the model cannot connect', async () => {
    const { url } = await boot({}, fakeConnect(true));
    const c = client(url);
    await c.open;
    c.send(start());
    expect(await c.until((f) => f.type === 'error')).toMatchObject({ code: 'upstream' });
  });

  it('writes no transcript or audio text to the logs', async () => {
    const lines: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.env.LOG_SILENT = '0';
    process.stdout.write = ((s: string) => {
      lines.push(String(s));
      return true;
    }) as never;
    try {
      const { url, fake } = await boot();
      const c = client(url);
      await c.open;
      c.send(start());
      await c.until((f) => f.type === 'ready');
      c.send({ type: 'audio', data: 'SECRETAUDIO' });
      const cb = fake.sessions[0]?.cb as LiveCallbacks;
      cb.onmessage({ serverContent: { outputTranscription: { text: 'PRIVATE WORDS definitely' } } });
      cb.onmessage({ serverContent: { turnComplete: true } });
      c.send({ type: 'end' });
      await c.closed;
    } finally {
      process.stdout.write = orig;
      process.env.LOG_SILENT = '1';
    }
    const out = lines.join('');
    expect(out).toContain('live_session_done');
    expect(out).not.toMatch(/PRIVATE|SECRETAUDIO|chk_known/);
    const done = JSON.parse(lines.find((l) => l.includes('live_session_done')) as string);
    expect(Object.keys(done).sort()).toEqual([
      'actionFired',
      'certaintyHits',
      'checkIdHash',
      'durationMs',
      'message',
      'severity',
      'time',
      'turns',
    ]);
  });
});

describe('live limits', () => {
  const verifier = async (token: string) => ({ uid: token, anonymous: true });

  it('counts one session as two checks in the per-uid limiter', async () => {
    const { url, limits } = await boot({ ANON_LIMIT_PER_HOUR: '4' }, undefined, verifier);
    for (const expectOk of [true, true, false]) {
      const c = client(`${url}?token=u1`);
      await c.open;
      c.send(start());
      if (expectOk) {
        await c.until((f) => f.type === 'ready');
        c.send({ type: 'end' });
        await c.closed;
      } else {
        expect(await c.until((f) => f.type === 'error')).toMatchObject({ code: 'rate_limited' });
      }
    }
    expect(limits.hourly.check('u1', 100).allowed).toBe(true);
    expect(limits.hourly.check('other', 4, 2).allowed).toBe(true);
  });

  it('counts two checks against the per-IP backstop', async () => {
    const { url } = await boot({ RATE_LIMIT_PER_MIN: '3' });
    const results: string[] = [];
    for (let i = 0; i < 2; i++) {
      const c = client(url);
      await c.open;
      c.send(start());
      const f = await c.until((x) => x.type === 'ready' || x.type === 'error');
      results.push(String(f.type === 'error' ? f.code : f.type));
      c.send({ type: 'end' });
      await c.closed;
    }
    expect(results).toEqual(['ready', 'rate_limited']);
  });

  it('allows one live session per uid at a time', async () => {
    const { url } = await boot({}, undefined, verifier);
    const a = client(`${url}?token=u2`);
    await a.open;
    a.send(start());
    await a.until((f) => f.type === 'ready');
    const b = client(`${url}?token=u2`);
    await b.open;
    b.send(start());
    expect(await b.until((f) => f.type === 'error')).toMatchObject({ code: 'busy' });
    a.send({ type: 'end' });
    await a.closed;
    await new Promise((r) => setTimeout(r, 50));
    const c = client(`${url}?token=u2`);
    await c.open;
    c.send(start());
    await c.until((f) => f.type === 'ready');
  });

  it('treats a rejected token as no token', async () => {
    const { url } = await boot({}, undefined, async () => null);
    const c = client(`${url}?token=bad`);
    await c.open;
    c.send(start());
    await c.until((f) => f.type === 'ready');
  });

  it('refuses upgrades from a disallowed origin', async () => {
    const { url } = await boot({ CORS_ORIGINS: 'https://app.example' });
    const ws = new WebSocket(url, { headers: { origin: 'https://evil.example' } });
    const err = await new Promise<Error>((r) => ws.on('error', r));
    expect(err.message).toContain('403');
  });
});

describe('mock live session', () => {
  it('answers with a tone and captions in the requested language', async () => {
    const cfg = loadConfig({ MOCK: '1' });
    const server = createServer();
    attachLive(server, { cfg, pipeline, limits: createLimits(cfg), connect: createMockLiveConnect() });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    servers.push(server);
    const c = client(`ws://127.0.0.1:${(server.address() as AddressInfo).port}/v1/live`);
    await c.open;
    c.send(start({ language: 'my' }));
    await c.until((f) => f.type === 'ready');
    const chunk = Buffer.alloc(3200).toString('base64');
    for (let i = 0; i < 14; i++) c.send({ type: 'audio', data: chunk });
    await c.until((f) => f.type === 'audio', 3000);
    const line = await c.until((f) => f.type === 'transcript' && f.role === 'model' && f.final === true, 4000);
    expect(String(line.text)).toMatch(/[က-႟]/);
  });
});
