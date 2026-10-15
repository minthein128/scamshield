import { NOT_AVAILABLE, type LiveAudio } from './liveAudio.types';

export type { LiveAudio };

/** Stub until modules/live-audio lands. Replace the body with the thin wrapper over the Android module. */
export function createLiveAudio(): LiveAudio {
  const fail = (): never => {
    throw new Error(NOT_AVAILABLE);
  };
  return {
    requestPermission: async () => false,
    startCapture: async () => fail(),
    stopCapture: async () => undefined,
    playChunk: fail,
    stopPlayback: () => undefined,
    outputLevel: () => 0,
    inputLevel: () => 0,
    dispose: async () => undefined,
  };
}

export default createLiveAudio;
