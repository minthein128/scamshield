import type { CheckResponse, LanguageCode } from '../api/types';
import type { LiveAudio } from './liveAudio.types';

export type LiveState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'ended' | 'error';
export type LiveAction = 'WARN_FAMILY' | 'HOTLINES';
export type LiveErrorCode = 'mic_denied' | 'unavailable' | 'rate_limited' | 'busy' | 'not_found' | 'upstream' | 'bad_request' | 'audio';

export interface LiveView {
  state: LiveState;
  caption: string;
  userCaption: string;
  remainingSec: number;
  muted: boolean;
  error: LiveErrorCode | null;
  /** True when the live socket could not open, so the sheet points to the Listen button. */
  fallback: boolean;
  /** True while the approved spoken warning plays, before the live conversation opens. */
  warning: boolean;
  /** Why an ended session ended. */
  endedBy: 'user' | 'cap' | 'server' | null;
}

export interface SocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((e: unknown) => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onclose: ((e: unknown) => void) | null;
}

export interface LiveSessionOptions {
  result: CheckResponse;
  language: LanguageCode;
  mode: 'self' | 'family';
  home?: string;
  destination?: string;
  onAction?: (screen: LiveAction) => void;
}

export interface LiveSessionDeps {
  createAudio: () => LiveAudio;
  openSocket: (url: string) => SocketLike;
  getUrl: () => Promise<string>;
  getToken: () => Promise<string | null>;
  /** Plays the approved spoken warning and resolves when it ends. */
  playWarning: (text: string, language: LanguageCode) => Promise<void>;
  stopWarning: () => void;
}

export const DEFAULT_CAP_MS = 120_000;
export const CONNECT_TIMEOUT_MS = 8_000;
const OPEN = 1;
const PLAYBACK_BYTES_PER_SEC = 24000 * 2;

export const liveWsUrl = (base: string) => `${base.replace(/\/+$/, '').replace(/^http/i, 'ws')}/v1/live`;

export function reportPayload(r: CheckResponse) {
  return {
    verdict: r.verdict,
    score: r.score,
    title: r.title,
    summary: r.summary,
    scamType: r.scamType,
    flags: r.flags.map(f => ({ family: f.family, label: f.label, evidence: f.evidence.slice(0, 600), severity: f.severity })),
    sources: (r.sources ?? []).slice(0, 10).map(s => ({ title: s.title.slice(0, 200), url: s.url.slice(0, 500) })),
    ...(r.network ? { network: { seenCount: r.network.seenCount } } : {}),
  };
}

const knownError = (code: unknown): LiveErrorCode =>
  code === 'rate_limited' || code === 'busy' || code === 'not_found' || code === 'bad_request' ? code : 'upstream';

/** Owns the WebSocket, the mic and the state machine of one Talk to SafeRoute session. */
export function createLiveSession(options: LiveSessionOptions, deps: LiveSessionDeps, onChange: (v: LiveView) => void) {
  let view: LiveView = { state: 'idle', caption: '', userCaption: '', remainingSec: Math.round(DEFAULT_CAP_MS / 1000), muted: false, error: null, fallback: false, warning: false, endedBy: null };
  let audio: LiveAudio | null = null;
  let ws: SocketLike | null = null;
  let finished = false;
  let cancelled = false;
  let capTimer: ReturnType<typeof setTimeout> | undefined;
  let tick: ReturnType<typeof setInterval> | undefined;
  let connectTimer: ReturnType<typeof setTimeout> | undefined;
  let speakTimer: ReturnType<typeof setTimeout> | undefined;
  let playUntil = 0;
  let deadline = 0;

  const set = (patch: Partial<LiveView>) => {
    view = { ...view, ...patch };
    onChange(view);
  };

  const teardown = () => {
    clearTimeout(capTimer);
    clearTimeout(connectTimer);
    clearTimeout(speakTimer);
    clearInterval(tick);
    deps.stopWarning();
    const a = audio;
    audio = null;
    if (a) {
      a.stopPlayback();
      a.stopCapture().catch(() => undefined);
      a.dispose().catch(() => undefined);
    }
    const s = ws;
    ws = null;
    if (s) {
      s.onopen = s.onmessage = s.onerror = s.onclose = null;
      try {
        if (s.readyState === OPEN) s.send(JSON.stringify({ type: 'end' }));
        s.close();
      } catch {
        // socket already gone
      }
    }
  };

  const finish = (next: Pick<LiveView, 'state'> & Partial<LiveView>) => {
    if (finished) return;
    finished = true;
    teardown();
    set(next);
  };

  const fail = (error: LiveErrorCode, extra: Partial<LiveView> = {}) => finish({ state: 'error', error, ...extra });

  const settleListening = () => {
    clearTimeout(speakTimer);
    const wait = Math.max(0, playUntil - Date.now());
    speakTimer = setTimeout(() => {
      if (!finished && view.state === 'speaking') set({ state: 'listening' });
    }, wait + 150);
  };

  const onFrame = (raw: unknown) => {
    let f: { type?: string; data?: string; role?: string; text?: string; screen?: LiveAction; code?: string; reason?: string; maxMs?: number };
    try {
      f = JSON.parse(String(raw));
    } catch {
      return;
    }
    switch (f.type) {
      case 'ready':
        clearTimeout(connectTimer);
        beginListening(typeof f.maxMs === 'number' && f.maxMs > 0 ? f.maxMs : DEFAULT_CAP_MS);
        break;
      case 'audio':
        if (!f.data || !audio) break;
        try {
          audio.playChunk(f.data);
        } catch {
          return fail('audio');
        }
        playUntil = Math.max(playUntil, Date.now()) + (f.data.length * 3) / 4 / PLAYBACK_BYTES_PER_SEC * 1000;
        if (view.state !== 'speaking') set({ state: 'speaking' });
        settleListening();
        break;
      case 'interrupted':
        audio?.stopPlayback();
        playUntil = 0;
        if (view.state === 'speaking') set({ state: 'listening' });
        break;
      case 'transcript':
        if (f.role === 'model') set({ caption: f.text ?? '' });
        else if (f.role === 'user') set({ userCaption: f.text ?? '' });
        break;
      case 'action':
        if (f.screen === 'WARN_FAMILY' || f.screen === 'HOTLINES') options.onAction?.(f.screen);
        break;
      case 'error':
        fail(knownError(f.code));
        break;
      case 'closed':
        if (f.reason === 'error' && view.state !== 'error') fail('upstream');
        else finish({ state: 'ended', endedBy: f.reason === 'cap' ? 'cap' : 'server', ...(f.reason === 'cap' ? { remainingSec: 0 } : {}) });
        break;
    }
  };

  const beginListening = (capMs: number) => {
    deadline = Date.now() + capMs;
    set({ state: 'listening', warning: false, remainingSec: Math.ceil(capMs / 1000) });
    capTimer = setTimeout(() => finish({ state: 'ended', remainingSec: 0, endedBy: 'cap' }), capMs);
    tick = setInterval(() => set({ remainingSec: Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) }), 1000);
    audio
      ?.startCapture(chunk => {
        if (!view.muted && ws && ws.readyState === OPEN) ws.send(JSON.stringify({ type: 'audio', data: chunk }));
      })
      .catch(() => fail('audio'));
  };

  const connect = async () => {
    let url: string;
    let token: string | null;
    try {
      [url, token] = [liveWsUrl(await deps.getUrl()), await deps.getToken()];
      if (!/^wss?:\/\//.test(url)) throw new Error('no url');
    } catch {
      return fail('unavailable', { fallback: true });
    }
    if (finished) return;
    const socket = deps.openSocket(url);
    ws = socket;
    connectTimer = setTimeout(() => fail('unavailable', { fallback: true }), CONNECT_TIMEOUT_MS);
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: 'start',
          checkId: options.result.id,
          report: reportPayload(options.result),
          language: options.language,
          mode: options.mode,
          ...(options.home ? { home: options.home } : {}),
          ...(options.destination ? { destination: options.destination } : {}),
          ...(token ? { token } : {}),
        }),
      );
    };
    socket.onmessage = e => onFrame(e.data);
    socket.onerror = () => {
      if (view.state === 'connecting') fail('unavailable', { fallback: true });
    };
    socket.onclose = () => {
      if (finished) return;
      if (view.state === 'connecting') fail('unavailable', { fallback: true });
      else fail('upstream');
    };
  };

  return {
    get view() {
      return view;
    },
    async start(opts: { skipWarning?: boolean } = {}) {
      if (view.state !== 'idle') return;
      set({ state: 'connecting', caption: opts.skipWarning ? '' : options.result.spokenWarning });
      try {
        audio = deps.createAudio();
      } catch {
        return fail('audio');
      }
      if (!(await audio.requestPermission().catch(() => false))) return fail('mic_denied');
      if (cancelled || finished) return;
      if (!opts.skipWarning) {
        set({ state: 'speaking', warning: true });
        await deps.playWarning(options.result.spokenWarning, options.language).catch(() => undefined);
        if (cancelled || finished) return;
      }
      set({ state: 'connecting', warning: false, caption: '' });
      await connect();
    },
    end() {
      cancelled = true;
      finish({ state: 'ended', endedBy: 'user' });
    },
    setMode(mode: LiveSessionOptions['mode']) {
      options.mode = mode;
    },
    setMuted(muted: boolean) {
      set({ muted });
    },
    outputLevel: () => audio?.outputLevel() ?? 0,
    inputLevel: () => audio?.inputLevel() ?? 0,
    dispose() {
      cancelled = true;
      finished = true;
      teardown();
    },
  };
}
