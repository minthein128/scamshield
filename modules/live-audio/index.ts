import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

/** Same shape as docs/live-audio-contract.md. */
export interface LiveAudio {
  requestPermission(): Promise<boolean>;
  startCapture(onChunk: (base64Pcm16k: string) => void): Promise<void>;
  stopCapture(): Promise<void>;
  playChunk(base64Pcm24k: string): void;
  stopPlayback(): void;
  outputLevel(): number;
  inputLevel(): number;
  dispose(): Promise<void>;
}

interface Subscription {
  remove(): void;
}

interface LiveAudioNative {
  requestPermission(): Promise<boolean>;
  startCapture(): Promise<void>;
  stopCapture(): Promise<void>;
  playChunk(base64: string): void;
  stopPlayback(): void;
  inputLevel(): number;
  outputLevel(): number;
  setCommunicationMode(enabled: boolean): void;
  dispose(): Promise<void>;
  addListener(event: 'onAudioChunk', listener: (e: { data: string }) => void): Subscription;
  addListener(event: 'onAudioError', listener: (e: { message: string }) => void): Subscription;
}

const UNSUPPORTED = 'Live audio native module is only available on Android. Use liveAudio.web on the web.';

function createUnsupported(): LiveAudio {
  const fail = (): never => {
    throw new Error(UNSUPPORTED);
  };
  return {
    requestPermission: async () => fail(),
    startCapture: async () => fail(),
    stopCapture: async () => fail(),
    playChunk: fail,
    stopPlayback: fail,
    outputLevel: fail,
    inputLevel: fail,
    dispose: async () => fail(),
  };
}

function createAndroid(): LiveAudio {
  const native = requireNativeModule<LiveAudioNative>('LiveAudio');
  let chunkSub: Subscription | null = null;
  let errorSub: Subscription | null = null;

  const unsubscribe = () => {
    chunkSub?.remove();
    errorSub?.remove();
    chunkSub = null;
    errorSub = null;
  };

  return {
    requestPermission: () => native.requestPermission(),
    async startCapture(onChunk) {
      unsubscribe();
      chunkSub = native.addListener('onAudioChunk', (e) => onChunk(e.data));
      errorSub = native.addListener('onAudioError', (e) => console.warn('[LiveAudio]', e.message));
      try {
        await native.startCapture();
      } catch (err) {
        unsubscribe();
        throw err;
      }
    },
    async stopCapture() {
      unsubscribe();
      await native.stopCapture();
    },
    playChunk: (base64Pcm24k) => native.playChunk(base64Pcm24k),
    stopPlayback: () => native.stopPlayback(),
    outputLevel: () => native.outputLevel(),
    inputLevel: () => native.inputLevel(),
    async dispose() {
      unsubscribe();
      await native.dispose();
    },
  };
}

export function createLiveAudio(): LiveAudio {
  return Platform.OS === 'android' ? createAndroid() : createUnsupported();
}

export default createLiveAudio;
