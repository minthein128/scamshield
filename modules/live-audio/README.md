# live-audio

Expo module (Android only) for SafeRoute live voice. It captures the microphone and plays the model's voice. The TypeScript interface is `LiveAudio` in `docs/live-audio-contract.md`. `index.ts` exports `createLiveAudio()`. On web and iOS the returned object throws a clear error on every call; the web build uses `src/lib/liveAudio.web.ts` instead.

## Audio format

| Direction | Rate | Channels | Sample | Frame |
|---|---|---|---|---|
| Capture (`onAudioChunk`) | 16 000 Hz | mono | PCM 16-bit little endian | 1 600 samples (100 ms), base64 |
| Playback (`playChunk`) | 24 000 Hz | mono | PCM 16-bit little endian | any size, base64 |

Capture reads may return fewer samples than asked. A `FrameAssembler` regroups them so every chunk has exactly 1 600 samples.

## Native API

`requestPermission`, `startCapture`, `stopCapture`, `playChunk`, `stopPlayback`, `inputLevel`, `outputLevel`, `dispose`, plus `setCommunicationMode(enabled)`. Events: `onAudioChunk {data}` and `onAudioError {message}`. `playChunk`, `stopPlayback` and the level functions are synchronous and never block the JS thread.

## Threading

- `live-audio-capture`: blocking `AudioRecord.read`, frames, base64, `sendEvent`.
- `live-audio-playback`: takes chunks from a queue and writes them to the `AudioTrack` in 20 ms slices with `WRITE_NON_BLOCKING`.
- The JS thread only decodes base64 and enqueues.
- `stopPlayback` (barge-in) takes the same lock as the writer, bumps a generation counter, clears the queue, then runs `AudioTrack.pause(); flush(); play()`. Slices of an older generation are never written, so at most one in-flight slice (20 ms) can follow the flush.
- The `AudioTrack` starts once on the first chunk and keeps running. An empty buffer plays silence.

## Levels

RMS of each 100 ms input frame, and of each slice written to the track for output. The value is scaled by 4, clamped to 0..1, rises at once and decays with a 120 ms time constant (also while no audio arrives). The output level follows the bytes written, which run up to the track buffer (about 200 ms) ahead of the speaker.

## Echo cancellation and audio mode

- Source is `VOICE_COMMUNICATION`. `AcousticEchoCanceler` and `NoiseSuppressor` attach to the record session when the device reports them as available.
- The `AudioTrack` uses `USAGE_VOICE_COMMUNICATION` and `CONTENT_TYPE_SPEECH`, so the platform can use its output as the echo reference.
- Choice: `AudioManager.MODE_IN_COMMUNICATION` is on by default. Several OEM echo cancellers only run in that mode, and speaker plus microphone at once on a phone squeals without it. The cost is call-style volume and routing, which the session controls explicitly.
- Fallback: `setCommunicationMode(false)` (call it before `startCapture`) keeps `MODE_NORMAL`. Routing then uses `setSpeakerphoneOn` only, with no Bluetooth SCO. Both paths are in `AndroidAudioSession`; test both on a device and flip the default in `LiveAudioModule` if one model squeals.
- Session: the first `startCapture` or `playChunk` requests transient audio focus, sets the mode and routes. `dispose()` restores mode, speakerphone, communication device and focus.
- Routing: wired or USB headset, else Bluetooth (communication device on API 31+, SCO below), else the loudspeaker.

## Permissions

`RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` are in this module's manifest and merge into the app. `requestPermission()` resolves true at once when already granted, otherwise it shows the system prompt through the current activity.

## Tests

`cd android && ./gradlew :live-audio:testDebugUnitTest`. Robolectric tests cover framing and the base64 round trip, queue order, flush on barge-in, the level maths and route choice. `AudioRecord` and `AudioTrack` sit behind `PcmSource` and `PcmSink`, and the tests use fakes. Nothing here proves echo cancellation; that needs a phone.

## On-device checklist

- [ ] First `requestPermission()` shows the system microphone prompt. Deny returns false and `startCapture` rejects with `ERR_NO_PERMISSION`. Allow returns true.
- [ ] On the loudspeaker the model voice is audible and loud enough.
- [ ] With a wired headset the voice moves to the headset and the loudspeaker stays silent. Test Bluetooth too.
- [ ] Unplugging the headset mid-session does not crash. Note where the audio goes.
- [ ] Speak while the model talks: `stopPlayback()` cuts the voice within about 100 ms and later chunks play again.
- [ ] No feedback squeal at full volume on the loudspeaker. The model does not answer its own voice.
- [ ] `inputLevel()` moves when you speak and falls to near 0 in silence. `outputLevel()` moves with the model voice.
- [ ] Long playback has no clicks or gaps between chunks.
- [ ] After `dispose()` other apps (music, a call) get audio focus back and the volume keys act normally.
- [ ] Repeat on at least one Samsung and one Pixel or Xiaomi phone.
