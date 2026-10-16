import type { CheckResponse } from '../api/types';
import type { LiveAudio } from '../lib/liveAudio.types';
import { createLiveSession, liveWsUrl, reportPayload, type LiveSessionDeps, type LiveView, type SocketLike } from '../lib/liveSession';

const RESULT: CheckResponse = {
  id: 'chk_1',
  createdAt: '2026-10-15T00:00:00Z',
  kind: 'job',
  verdict: 'danger',
  score: 90,
  title: 'High risk',
  summary: 'Asks for a fee first.',
  spokenWarning: 'Please do not pay.',
  scamType: 'job_trafficking',
  flags: [{ family: 'payment_route', label: 'Fee', evidence: 'pay first', severity: 'high' }],
  linkChecks: [],
  sources: [],
  actions: [],
  model: 'm',
};

class FakeSocket implements SocketLike {
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  closed = false;
  onopen: SocketLike['onopen'] = null;
  onmessage: SocketLike['onmessage'] = null;
  onerror: SocketLike['onerror'] = null;
  onclose: SocketLike['onclose'] = null;
  send(d: string) {
    this.sent.push(JSON.parse(d));
  }
  close() {
    this.closed = true;
    this.readyState = 3;
  }
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  push(o: object) {
    this.onmessage?.({ data: JSON.stringify(o) });
  }
}

function setup(over: Partial<LiveSessionDeps> = {}, perm = true) {
  const sockets: FakeSocket[] = [];
  const order: string[] = [];
  const chunkSink: { cb?: (b: string) => void } = {};
  const audio = {
    requestPermission: jest.fn(async () => perm),
    startCapture: jest.fn(async (cb: (b: string) => void) => {
      chunkSink.cb = cb;
    }),
    stopCapture: jest.fn(async () => undefined),
    playChunk: jest.fn(),
    stopPlayback: jest.fn(),
    outputLevel: () => 0.4,
    inputLevel: () => 0.1,
    dispose: jest.fn(async () => undefined),
  } satisfies LiveAudio;
  const deps: LiveSessionDeps = {
    createAudio: () => audio,
    openSocket: () => {
      order.push('socket');
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
    getUrl: async () => 'http://api.test',
    getToken: async () => 'tok',
    playWarning: async () => {
      order.push('warning');
    },
    stopWarning: jest.fn(),
    ...over,
  };
  const views: LiveView[] = [];
  const onAction = jest.fn();
  const session = createLiveSession({ result: RESULT, language: 'my', mode: 'self', home: 'MM', destination: 'TH', onAction }, deps, v => views.push(v));
  return { session, sockets, order, audio, chunkSink, views, onAction, deps };
}


describe('live session', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  async function toListening(h: ReturnType<typeof setup>, maxMs = 120000) {
    const p = h.session.start();
    await jest.advanceTimersByTimeAsync(0);
    await p;
    h.sockets[0].open();
    h.sockets[0].push({ type: 'ready', maxMs });
    await jest.advanceTimersByTimeAsync(0);
  }

  it('plays the approved warning before it opens the socket, then sends start', async () => {
    const h = setup();
    await toListening(h);
    expect(h.order).toEqual(['warning', 'socket']);
    expect(h.sockets[0].sent[0]).toMatchObject({ type: 'start', checkId: 'chk_1', language: 'my', mode: 'self', home: 'MM', destination: 'TH', token: 'tok' });
    expect(h.sockets[0].sent[0].report).toMatchObject({ verdict: 'danger', score: 90 });
    expect(h.session.view.state).toBe('listening');
    expect(h.audio.startCapture).toHaveBeenCalled();
  });

  it('builds the socket url from the api base', () => {
    expect(liveWsUrl('https://x.trycloudflare.com/')).toBe('wss://x.trycloudflare.com/v1/live');
    expect(liveWsUrl('http://localhost:8080')).toBe('ws://localhost:8080/v1/live');
    expect(liveWsUrl('https://sg-dev-808112092414.asia-southeast1.run.app')).toBe('wss://sg-dev-808112092414.asia-southeast1.run.app/v1/live');
  });

  it('sends mic chunks, drops them when muted', async () => {
    const h = setup();
    await toListening(h);
    h.chunkSink.cb?.('AAAA');
    h.session.setMuted(true);
    h.chunkSink.cb?.('BBBB');
    h.session.setMuted(false);
    h.chunkSink.cb?.('CCCC');
    expect(h.sockets[0].sent.filter(f => f.type === 'audio').map(f => f.data)).toEqual(['AAAA', 'CCCC']);
  });

  it('goes to speaking on audio, back to listening after it plays, and barge-in stops playback', async () => {
    const h = setup();
    await toListening(h);
    h.sockets[0].push({ type: 'audio', data: 'A'.repeat(64000) });
    expect(h.audio.playChunk).toHaveBeenCalled();
    expect(h.session.view.state).toBe('speaking');
    h.sockets[0].push({ type: 'interrupted' });
    expect(h.audio.stopPlayback).toHaveBeenCalled();
    expect(h.session.view.state).toBe('listening');
    h.sockets[0].push({ type: 'audio', data: 'A'.repeat(4000) });
    expect(h.session.view.state).toBe('speaking');
    await jest.advanceTimersByTimeAsync(2000);
    expect(h.session.view.state).toBe('listening');
  });

  it('shows the model caption and the heard line, and relays actions', async () => {
    const h = setup();
    await toListening(h);
    h.sockets[0].push({ type: 'transcript', role: 'model', text: 'ဟုတ်ကဲ့' });
    h.sockets[0].push({ type: 'transcript', role: 'user', text: 'Is it safe?' });
    h.sockets[0].push({ type: 'action', screen: 'HOTLINES' });
    h.sockets[0].push({ type: 'action', screen: 'BANK' });
    expect(h.session.view.caption).toBe('ဟုတ်ကဲ့');
    expect(h.session.view.userCaption).toBe('Is it safe?');
    expect(h.onAction).toHaveBeenCalledTimes(1);
    expect(h.onAction).toHaveBeenCalledWith('HOTLINES');
  });

  it('counts down and ends itself at the cap', async () => {
    const h = setup();
    await toListening(h, 5000);
    expect(h.session.view.remainingSec).toBe(5);
    await jest.advanceTimersByTimeAsync(2000);
    expect(h.session.view.remainingSec).toBe(3);
    await jest.advanceTimersByTimeAsync(3100);
    expect(h.session.view).toMatchObject({ state: 'ended', endedBy: 'cap', remainingSec: 0 });
    expect(h.sockets[0].closed).toBe(true);
    expect(h.audio.dispose).toHaveBeenCalled();
  });

  it('uses 120 s when the server does not say', async () => {
    const h = setup();
    const p = h.session.start();
    await jest.advanceTimersByTimeAsync(0);
    await p;
    h.sockets[0].open();
    h.sockets[0].push({ type: 'ready' });
    expect(h.session.view.remainingSec).toBe(120);
  });

  it('ends on a server cap close', async () => {
    const h = setup();
    await toListening(h);
    h.sockets[0].push({ type: 'closed', reason: 'cap' });
    expect(h.session.view).toMatchObject({ state: 'ended', endedBy: 'cap' });
  });

  it('end() tells the server, closes the socket and releases the audio', async () => {
    const h = setup();
    await toListening(h);
    h.session.end();
    expect(h.session.view).toMatchObject({ state: 'ended', endedBy: 'user' });
    expect(h.sockets[0].sent.at(-1)).toEqual({ type: 'end' });
    expect(h.sockets[0].closed).toBe(true);
    expect(h.audio.stopCapture).toHaveBeenCalled();
    expect(h.audio.dispose).toHaveBeenCalled();
    expect(h.deps.stopWarning).toHaveBeenCalled();
  });

  it('maps server errors to error codes', async () => {
    const h = setup();
    await toListening(h);
    h.sockets[0].push({ type: 'error', code: 'rate_limited', message: 'x' });
    expect(h.session.view).toMatchObject({ state: 'error', error: 'rate_limited' });
  });

  it('falls back to Listen when the server does not offer voice in this language', async () => {
    const h = setup();
    const p = h.session.start();
    await jest.advanceTimersByTimeAsync(0);
    await p;
    h.sockets[0].open();
    h.sockets[0].push({ type: 'error', code: 'unsupported_language', message: 'x' });
    expect(h.session.view).toMatchObject({ state: 'error', error: 'unavailable', fallback: true });
  });

  it('reports a denied microphone without opening a socket', async () => {
    const h = setup({}, false);
    await h.session.start();
    expect(h.session.view).toMatchObject({ state: 'error', error: 'mic_denied' });
    expect(h.sockets).toHaveLength(0);
  });

  it('stops at mic_denied when the explained request is refused', async () => {
    const ensureMic = jest.fn(async () => 'declined' as const);
    const h = setup({ ensureMic });
    await h.session.start();
    expect(ensureMic).toHaveBeenCalled();
    expect(h.session.view).toMatchObject({ state: 'error', error: 'mic_denied' });
    expect(h.sockets).toHaveLength(0);
  });

  it('falls back to Listen when the socket cannot open', async () => {
    const h = setup();
    const p = h.session.start();
    await jest.advanceTimersByTimeAsync(0);
    await p;
    h.sockets[0].onerror?.({});
    expect(h.session.view).toMatchObject({ state: 'error', error: 'unavailable', fallback: true });
  });

  it('falls back when the socket never gets ready', async () => {
    const h = setup();
    const p = h.session.start();
    await jest.advanceTimersByTimeAsync(0);
    await p;
    h.sockets[0].open();
    await jest.advanceTimersByTimeAsync(9000);
    expect(h.session.view).toMatchObject({ state: 'error', fallback: true });
  });

  it('skips the warning when asked to restart', async () => {
    const h = setup();
    const p = h.session.start({ skipWarning: true });
    await jest.advanceTimersByTimeAsync(0);
    await p;
    expect(h.order).toEqual(['socket']);
  });

  it('applies a mode change made during the warning', async () => {
    let release: () => void = () => undefined;
    const h = setup({ playWarning: () => new Promise<void>(r => (release = r)) });
    const p = h.session.start();
    await jest.advanceTimersByTimeAsync(0);
    expect(h.session.view.warning).toBe(true);
    h.session.setMode('family');
    release();
    await jest.advanceTimersByTimeAsync(0);
    await p;
    h.sockets[0].open();
    expect(h.sockets[0].sent[0]).toMatchObject({ mode: 'family' });
  });

  it('trims the report it sends', () => {
    const p = reportPayload({ ...RESULT, flags: [{ ...RESULT.flags[0], evidence: 'x'.repeat(900) }] });
    expect(p.flags[0].evidence).toHaveLength(600);
    expect(Object.keys(p)).not.toContain('linkChecks');
  });
});

