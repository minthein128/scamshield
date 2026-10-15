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

- Client to server, first frame: `{ "type": "start", "checkId": string, "language": "en|my|id|tl|th", "mode": "self|family|companion", "home"?: "MM", "destination"?: "TH", "token"?: string, "report"?: {...} }`. `home` and `destination` are ISO country codes from the user profile; the server uses them to pick the verified hotlines. The server looks up the report by `checkId` in its result cache (10 minutes, per instance). The app also sends `report` (verdict, score, title, summary, scamType, flags, sources, network) so the session still works when the id is unknown to that instance. The cache wins when both exist. An unknown id with no `report` gives `error not_found`.
- Client to server: `{ "type": "audio", "data": base64Pcm16k }` (one frame per chunk, about 100 ms, under 64 KB), `{ "type": "end" }`.
- Client to server, companion mode only: `{ "type": "context", "checkId"?: string, "report"?: {...} }` after a `RECHECK` action, with the new check result (same `report` shape as `start`, cache wins by `checkId`), or `{ "type": "context", "error": "check_failed" }` when the re-check could not run. At most 64 KB and 10 per session; a bad frame gives `error bad_request`.
- Server to client: `{ "type": "ready", "maxMs": number }`, `{ "type": "audio", "data": base64Pcm24k }`, `{ "type": "interrupted" }`, `{ "type": "transcript", "role": "user|model", "text": string, "final"?: true }`, `{ "type": "action", "screen": "WARN_FAMILY|HOTLINES|RECHECK" }`, `{ "type": "error", "code": string, "message": string }`, `{ "type": "closed", "reason": "cap|end|error" }`.

Behaviour the clients rely on:

- `transcript.text` is cumulative for the current line of that role. Replace the caption with it; do not append. `final: true` closes the line. The next frame of that role starts a new line.
- `ready` arrives after the model session is open. Start capture on `ready`, not before. Audio sent earlier is dropped. `maxMs` is the session cap (default 120000, `LIVE_MAX_MS`; companion mode 300000, `LIVE_COMPANION_MAX_MS`); count down from `ready`.
- On `interrupted` call `stopPlayback()` at once and drop queued audio. The model heard the user talk over it.
- `error` codes: `bad_request`, `not_found`, `rate_limited`, `busy` (one live session per user), `upstream`. An `error` is always followed by `closed` with reason `error`.
- The app plays the approved `spokenWarning` through `/v1/speak` first and opens the socket afterwards. The model never speaks first and never repeats the warning.
- Auth: send the Firebase ID token as `token` in the `start` frame (preferred, keeps it out of URLs and logs). `?token=` and `Authorization: Bearer` also work. A missing or invalid token is treated as no token and limited per IP.
- Limits: one session costs 2 checks in the per-uid hourly limiter and 2 in the per-IP limiter. Sessions end at the cap with `closed` reason `cap`. Nothing from the session (audio or text) is stored or logged.

## Companion mode (floating bubble)

`mode: "companion"` is the voice session the Android shield bubble runs over other apps (`modules/shield-module`). The prompt tells the model the listener is in another app, keeps turns to one or two sentences and keeps every rule of the in-app modes.

The session gets a second tool, `recheck_screen`. The model calls it when the listener asks about something new on the screen ("what about this one?"). The model never judges new content itself; a re-check is the only way new content enters a conversation.

```
model calls recheck_screen
  server -> app   { "type": "action", "screen": "RECHECK" }   (tool answered at once: "wait for the new report")
  app             stop the mic, flush playback, hide the bubble, capture, POST /v1/check, show the new verdict,
                  play the new approved spokenWarning through /v1/speak
  app -> server   { "type": "context", "checkId": "...", "report": {...} }
  server          redacts the report and sends it to the model as a text turn (sendClientContent, turnComplete),
                  marked "NEW CURRENT REPORT", which replaces the earlier report
  model           explains the new report in one or two sentences
  app             resume the mic
```

A re-check costs one normal check on `/v1/check`; the context frame itself costs nothing. The session still costs 2 checks at `start`.
