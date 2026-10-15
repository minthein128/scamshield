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

export const CAPTURE_RATE = 16000;
export const PLAYBACK_RATE = 24000;
export const NOT_AVAILABLE = 'Talk to SafeRoute audio is not available in this build.';
