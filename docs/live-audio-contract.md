# Live voice audio contract

Shared by the web implementation (`src/lib/liveAudio.web.ts`) and the Android native module
(`modules/live-audio`, consumed through `src/lib/liveAudio.native.ts`). The Report screen and the
`useLiveVoice` hook depend only on this interface.

```ts
export interface LiveAudio {
  // Ask for microphone permission. Resolves false when denied.
  requestPermission(): Promise<boolean>;
  // Start capturing 16 kHz, mono, 16-bit little-endian PCM. Chunks are about 100 ms and base64 encoded.
  startCapture(onChunk: (base64Pcm16k: string) => void): Promise<void>;
  stopCapture(): Promise<void>;
  // Queue a 24 kHz, mono, 16-bit little-endian PCM chunk (base64) for gapless playback.
  playChunk(base64Pcm24k: string): void;
  // Drop everything queued and stop output now (barge-in).
  stopPlayback(): void;
  // 0..1 output loudness for the mascot pulse; cheap to call every frame.
  outputLevel(): number;
  // 0..1 input loudness.
  inputLevel(): number;
  // Release all resources.
  dispose(): Promise<void>;
}
```

Messages between app and server over the `/v1/live` WebSocket are JSON text frames:

- Client to server, first frame: `{ "type": "start", "checkId": string, "language": "en|my|id|tl|th", "mode": "self|family", "home"?: string, "destination"?: string }`. The server looks up the report by `checkId` from its result cache, so the client never resends report text. If the id is unknown the client may include `report` (the check response JSON) instead.
- Client to server: `{ "type": "audio", "data": base64Pcm16k }`, `{ "type": "end" }`.
- Server to client: `{ "type": "ready" }`, `{ "type": "audio", "data": base64Pcm24k }`, `{ "type": "interrupted" }`, `{ "type": "transcript", "role": "user|model", "text": string }`, `{ "type": "action", "screen": "WARN_FAMILY|HOTLINES" }`, `{ "type": "error", "code": string, "message": string }`, `{ "type": "closed", "reason": "cap|end|error" }`.

Auth: the client sends the Firebase ID token as `?token=` on the WebSocket URL or in the `start` frame. Sessions are capped at 90 s and count as 2 checks against the per-uid limiter.
