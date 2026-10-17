import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiClient } from '../api';
import type { CheckResponse, LanguageCode } from '../api/types';
import { ensureApiUrl } from '../config/runtime';
import { createLiveAudio } from '../lib/liveAudio';
import { createLiveSession, type LiveAction, type LiveSessionDeps, type LiveView, type SocketLike } from '../lib/liveSession';
import { ensureMicrophone } from '../lib/permissions';
import { speak, stopSpeaking } from '../lib/speech';
import { getAuthToken } from '../services/token';

export type { LiveAction, LiveErrorCode, LiveState, LiveView } from '../lib/liveSession';

interface Options {
  result: CheckResponse;
  language: LanguageCode;
  mode: 'self' | 'family';
  home?: string;
  destination?: string;
  onAction?: (screen: LiveAction) => void;
}

const WARNING_MAX_MS = 30_000;

function playWarning(text: string, language: LanguageCode): Promise<void> {
  return new Promise<void>(resolve => {
    const guard = setTimeout(resolve, Math.min(WARNING_MAX_MS, 5000 + text.length * 110));
    const done = () => {
      clearTimeout(guard);
      resolve();
    };
    speak(text, language, done, getApiClient()).catch(done);
  });
}

export const realDeps: LiveSessionDeps = {
  createAudio: createLiveAudio,
  openSocket: url => new WebSocket(url) as unknown as SocketLike,
  getUrl: ensureApiUrl,
  getToken: getAuthToken,
  playWarning,
  stopWarning: stopSpeaking,
  ensureMic: () => ensureMicrophone(),
};

const IDLE: LiveView = { state: 'idle', caption: '', userCaption: '', remainingSec: 120, muted: false, error: null, fallback: false, warning: false, endedBy: null };

/** Talk to Kakwe: plays the approved warning, then runs a live voice session over /v1/live. */
export function useLiveVoice(options: Options, deps: LiveSessionDeps = realDeps) {
  const [view, setView] = useState<LiveView>(IDLE);
  const session = useRef<ReturnType<typeof createLiveSession> | null>(null);
  const latest = useRef(options);
  latest.current = options;

  const stop = useCallback(() => {
    session.current?.dispose();
    session.current = null;
  }, []);

  const launch = useCallback(
    (mode: Options['mode'], skipWarning: boolean) => {
      stop();
      const o = { ...latest.current, mode };
      const s = createLiveSession({ ...o, onAction: screen => latest.current.onAction?.(screen) }, deps, setView);
      session.current = s;
      setView({ ...IDLE, state: 'connecting' });
      s.start({ skipWarning }).catch(() => undefined);
    },
    [deps, stop],
  );
  const start = useCallback(() => launch(latest.current.mode, false), [launch]);
  const changeMode = useCallback(
    (mode: Options['mode']) => {
      const s = session.current;
      if (s && s.view.state !== 'idle' && !s.view.warning && s.view.state !== 'connecting' && s.view.state !== 'ended' && s.view.state !== 'error' && s.view.state !== 'declined') launch(mode, true);
      else s?.setMode(mode);
    },
    [launch],
  );

  const end = useCallback(() => session.current?.end(), []);
  const setMuted = useCallback((muted: boolean) => session.current?.setMuted(muted), []);
  const outputLevel = useCallback(() => session.current?.outputLevel() ?? 0, []);
  const reset = useCallback(() => {
    stop();
    setView(IDLE);
  }, [stop]);

  useEffect(() => stop, [stop]);

  const inputLevel = useCallback(() => session.current?.inputLevel() ?? 0, []);

  return { ...view, start, changeMode, end, setMuted, outputLevel, inputLevel, reset };
}

export default useLiveVoice;
