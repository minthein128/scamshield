# shield-module

Expo module for Android. It draws a floating bubble over other apps. A tap captures the screen with MediaProjection, posts one JPEG to `${apiUrl}/v1/check` (kind `screen`, see `docs/api-contract.md`) and shows the verdict on the bubble and in a compact result pill that expands into a sheet. A double tap (or "Ask" on a result) starts the voice companion: the user talks to Kakwe about the screen while they keep using the other app.

## Layout

| File | Role |
| --- | --- |
| `index.ts` | JS API, types and a mock for web and iOS |
| `ShieldModule.kt` | Expo module: functions and the `onShieldResult` event |
| `ShieldService.kt` | Foreground service: owns the overlay, the capture session and the check flow |
| `ShieldOverlay.kt` | Overlay controller: windows, drag, snap, close target, card lifecycle |
| `BubbleView.kt` | Bubble (ring, progress arc, glyph) and the close target view |
| `ResultCardView.kt` | Pill that expands into a sheet, swipe to dismiss, accessibility actions |
| `ShieldPalette.kt` | Light and dark colors from `src/theme/theme.ts`, chip and error labels |
| `ShieldFonts.kt` | Plus Jakarta Sans from app assets, system sans as fallback |
| `ShieldHaptics.kt` | Vibration patterns |
| `ScreenCapturer.kt` | One MediaProjection, one VirtualDisplay, JPEG encoding |
| `CheckClient.kt` | HttpURLConnection call to `/v1/check` |
| `ConsentActivity.kt` | Transparent activity that shows the screen-capture consent dialog |
| `CompanionSession.kt` | Voice companion state machine: check, warning, `/v1/live` in companion mode, recheck, mute, focus, end |
| `CompanionAudioEngine.kt` | Mic and speaker for a session, built on the `live-audio` engines, plus audio focus events |
| `CompanionClients.kt` | `/v1/speak` client, WAV to 24 kHz PCM, OkHttp `/v1/live` socket |
| `CompanionPillView.kt` | Companion pill: status word, mute toggle, End (no transcript text) |
| `ShieldStrings.kt` | Companion labels from the app (`startShield({ strings })`), English fallback |
| `ShieldBridge.kt` | Shared state between module, service and activity |
| `MessageGuardListener.kt` | `NotificationListenerService` for Message Guard. Drops every app outside the allowlist before reading content |
| `MessageApps.kt` | Allowlist of messaging apps and the default SMS app |
| `MessagePrefilter.kt`, `GuardKeywords.kt`, `MessageLinks.kt` | On-device scoring. Keywords live in `res/raw/message_guard_keywords.json` |
| `MessageRedactor.kt` | Removes phone numbers, emails, codes, account numbers, likely names, sender names and link paths before sending |
| `MessageGuardEngine.kt`, `MessageGuardLimiter.kt` | Prefilter, redaction, duplicate check, the 20 per hour and 60 per day caps |
| `MessageCheckClient.kt` | `/v1/check` call with `kind: "message"` |
| `MessageGuardNotifier.kt` | Discreet notice with no verdict or message text |
| `MessageGuardStore.kt`, `MessageGuardLog.kt` | Consent, settings, recent results and the on-device log of sent text |
| `MessageGuardBridge.kt` | Message Guard functions behind `ShieldModule` |

## Build and verify

Needs JDK 17 or newer, the Android SDK (platform 35, build-tools 35.0.0) and `pnpm`.

```sh
export ANDROID_HOME=~/work/android-sdk
export NODE_OPTIONS=--max-old-space-size=1536
pnpm install
npx expo prebuild -p android --clean --no-install
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
cd android
./gradlew :shield-module:compileDebugKotlin --no-daemon --max-workers=2
```

`android/` is generated and not tracked. Set `org.gradle.jvmargs=-Xmx2g` in `android/gradle.properties` on small machines and run one Gradle build at a time. Run `npx tsc --noEmit` from the repo root for the TypeScript side. Use `./gradlew assembleDebug` for a full APK.

The compile check does not exercise runtime behavior. Verify these on a real device:

1. Overlay permission, then `requestScreenCapturePermission()`, then `startShield({ apiUrl, language })`.
2. Tap the bubble in another app. The bubble stays on screen and the doll starts rocking under the scan sweep at once (after the 300 ms double-tap window), then shows the verdict ring, a verdict badge and a result pill. `adb logcat -s ShieldCapture` prints the capture path and timings.
3. "Full report" opens `saferoute://report/<id>`. The app must declare the `saferoute` scheme and read the result with `getShieldResult(id)`.
4. Android 14 and up: the consent dialog must appear again after the user stops sharing from the status bar chip.

## Visual spec

The overlay is plain Views in `WindowManager` windows. Compose in a Service needs a lifecycle owner and a saved-state owner on every window, which is fragile. Views are reliable here and add no dependency. Springs use `androidx.dynamicanimation`.

Three windows exist. All use `TYPE_APPLICATION_OVERLAY` with `NOT_FOCUSABLE | NOT_TOUCH_MODAL`, so touches outside a window reach the app below.

| Window | Size | Lives |
| --- | --- | --- |
| Bubble | 80 x 80dp (56dp circle plus 12dp shadow margin) | While the shield runs |
| Result | Wraps the card plus 12dp shadow margin | While a result or error is shown |
| Close target | 72 x 72dp, not touchable | Only during a drag |

### Bubble

| State | Ring (light / dark) | Glyph | Notes |
| --- | --- | --- | --- |
| Idle | `#D7CDC0` / `#6B635C` | Pyit Taing Htaung doll on its gold disc | Half-tucked at the edge: 20dp of the circle sits off screen, 48dp stay visible |
| Checking | Faint lacquer-black track | Doll rocking (about 9 degrees) under an ink scan sweep, 1.4 s per pass | The bubble stays visible; see "Capture without hiding". With animator scale 0 the doll is static |
| Safe | `#1D4ED8` / `#8FB0FF` (blue is used only for Low risk) | Doll with a check in a circle | Pill auto-collapses after 8 s, bubble returns to idle |
| Careful | `#B45309` / `#FBBF24` | Doll with "!" in a triangle | Pill stays until dismissed |
| Danger | `#9F1239` / `#E11D48` (deep crimson, never the doll's red) | Doll with "!" in an octagon | Pill stays until dismissed |
| Error | `#6B635C` / `#A89E94` | Doll with a grey "!" circle | Neutral pill with "Tap to retry" |

The badge (18dp) sits at the doll's lower right in the ring color with a white mark; its shape repeats the app's verdict marks, so the verdict never rests on color alone. Colors follow `src/theme/theme.ts` and `docs/brand.md`; `BrandPaletteTest` fails when they drift. The doll is `res/drawable-nodpi/companion_doll.png`; without it the old shield glyph is drawn. Every state, light and dark, is in `pitch/e2e/bubble-doll-states.png` (from `ShieldSnapshotTest`).

### Capture without hiding

A tap starts the loader at once and the bubble stays put (it untucks only after the frame is taken). The capturer grabs the first frame at least 34 ms after the tap, so a dismissed result card is gone, then paints over every overlay window rect (bubble window with its 12dp shadow margin, companion pill) with the average color of a ring around it before JPEG encoding (`CaptureMask`).

Before encoding, the frame is also cropped to drop the status bar with the notification shade area and display cutout (top inset) and the navigation bar (bottom, or side in landscape), using the current window insets; no inset may remove more than 20% of a side. A 480 px copy of exactly what was sent stays in memory for the expanded sheet ("This is what we checked", tap to enlarge full screen, tap to close). It is never written to disk and is dropped when the card closes.

When the ring is busy (luminance spread over 20 of 255, for example text or a photo next to the bubble), filling would erase content, so the capture falls back: the windows fade to alpha 0 in 60 ms, the first frame 17 ms later is taken (150 ms cap), and they fade back in 120 ms with the loader still running.

On a verdict the shield pops (scale 80% to 100% with overshoot, 340 ms) while its mark fades in, in the verdict color. Shapes and colors come from `src/theme/theme.ts`.

Circle fill is the theme surface (`#FFFFFF`, dark `#2E2723`). Ring width is 3dp. The shadow is a 8dp blur, 3dp offset.

Gestures:

- Tap: check the screen (idle, error) or show and hide the pill (result states).
- Drag: past the touch slop (the larger of the system slop and 6dp) the pill or sheet collapses into the bubble (120 ms fade and scale toward it) and only the bubble follows the finger. A close target fades in at the bottom center. Within 84dp of it the bubble snaps to it and the target grows. Release there discards the result and closes the shield. Elsewhere, the bubble springs to the nearest side edge (damping 0.65). When the spring settles, the card is anchored again at the new position and comes back with its old state, expanded or collapsed. Moves under the slop stay a tap.
- Long press (about 0.7 s without moving): closes the shield with a tick.
- Closing stops the service. Start it again from the app.

### Result pill and sheet

- Position: the card window is anchored, not tied to the bubble every frame. It is placed once per rest position by `AnchorMath`. It is below the bubble when the bubble is in the upper half of the screen, above it otherwise. It is anchored to the bubble's side edge with a 12dp margin.
- Enter: alpha 0 to 1 and scale 45% to 100% about the bubble center, 200 ms, `cubic-bezier(0.2, 0, 0, 1)`. Exit is 170 ms.
- Collapsed: a pill at least 48dp tall with radius 24dp. It holds a verdict chip (12sp bold, 14dp radius), a one-line title (14sp semibold, ellipsized) and a chevron.
- Ask chip (results only): the app's primary button, lacquer black `#1F1A17` with white text and a white mic (17:1), pressed `#3D3631`; on dark it inverts to cream `#F7F3EE` with ink text. The visible chip is 36dp tall inside a 48dp touch target. Blue stays reserved for Low risk and red and gold for the doll.
- Voice halo: the doll's red `#B8321C` while listening (also the mic badge), gold `#F2B01E` while thinking or speaking, as in `src/components/avatarArt.ts`. The End control is lacquer black, not crimson.
- Flag icons: "!" in an octagon (high), triangle (medium) or circle (low).
- Expanded (tap, 220 ms): width grows to min(344dp, screen - 48dp), radius goes to 20dp, a detail area opens. It holds a summary (14sp, up to 4 lines), up to 3 flag rows (18dp severity icon, 13sp, up to 2 lines) and two text buttons, "Dismiss" and "Full report" (48dp tall, at least 48dp wide).
- Surface: theme surface color, 1dp border, 10dp elevation. Font is Plus Jakarta Sans (Regular, SemiBold, Bold) from `assets/fonts` in the APK, system sans if the load fails.
- Swipe left or right to dismiss. Past 40% of the width, or a fast fling, it flies off. Otherwise it springs back.
- Error pill: neutral chip (Offline, Too many checks, Service busy or Not checked, localized) and "Tap to retry". It does not expand. Tapping it, or the bubble, retries.

| Verdict chip | Light (bg / text) | Dark (bg / text) |
| --- | --- | --- |
| Low risk | `#DBE5FF` / `#1E3A8A` | `#1E3A8A` / `#DBE5FF` |
| Be careful | `#FEF3C7` / `#854D0E` | `#78350F` / `#FDE68A` |
| High risk | `#9F1239` / `#FFFFFF` | `#9F1239` / `#FFFFFF` |
| Error | `#F1EBE3` / `#3D3631` | `#4A403A` / `#EFE8DF` |

Dark mode follows the system setting. The service re-reads it in `onConfigurationChanged`.

### Haptics

Safe: one 18 ms tick. Careful: one 35 ms pulse. Danger: three strong pulses (45, 45, 110 ms). Entering the close target and a long press give a short tick. The manifest adds `VIBRATE`.

### Accessibility

- Every view has a content description. The bubble announces its state and what a double tap does.
- Custom actions: "Close shield" on the bubble, "Dismiss" on the pill (the swipe is not reachable by TalkBack).
- On danger the overlay calls `announceForAccessibility` with the verdict, title and summary.
- Text scales with the system font scale, capped at 1.3. Buttons, the pill and the visible part of the tucked bubble are at least 48dp.

### State diagram

```
            tap (bubble stays, loader starts)   capture with masks, upload
  IDLE ─────────────────────────────────► CHECKING ─────────────────────
   ▲  ▲                                                        │
   │  │ Dismiss, swipe, 8 s (safe only)        verdict         ▼
   │  └──────────────── SAFE / CAREFUL / DANGER ◄───────────────┤
   │                          │ tap bubble: hide or show pill   │ failure
   │                                                            ▼
   └────────── Dismiss, swipe ───────────────────────────────  ERROR
                                      tap pill or bubble ─► (retry) ─► CHECKING
  Any state: long press, or drag onto the close target ─► service stops
```

Bubble gesture, with a result card showing:

```
  PRESSED ──move under slop, release──► TAP (check, or toggle the card)
     │
     └─move past slop─► DRAGGING   card collapses into the bubble (120 ms), result remembered
                          │
                          ├─release on the × target─► CLOSE   result discarded, service stops
                          │
                          └─release elsewhere───────► SNAPPING   spring to the edge
                                                         │ spring settles (or 800 ms)
                                                         ▼
                                                      IDLE   card re-anchored on the new side,
                                                             old expanded or collapsed state restored
  Grabbing the bubble while it snaps starts a new PRESSED gesture and cancels the pending return.
  A new result that arrives mid-drag is held and shown after the snap.
```

### Preview

`./gradlew :shield-module:testDebugUnitTest` also runs `ShieldDragTest` (anchor maths for left, right, top, bottom and nav-bar positions, the drag state machine, and drag, close and configuration change against a real overlay). It renders every state, light and dark, to `android/build/shield-snapshots/*.png` with Robolectric native graphics. Elevation shadows and the Plus Jakarta Sans fonts are not part of that render (the test has no APK assets), so check those on a device.

## Notifications

The foreground-service notification is neutral: title "Kakwe", text "Ready when you need it", channel "Kakwe", `VISIBILITY_PRIVATE` with a public version that shows only "Kakwe" (`ShieldNotification.kt`). It never names a check, a verdict or a scam. Message Guard warnings are separate (`MessageGuardNotifier.kt`).

## Message Guard

Off by default. Turning it on is a three-step opt-in: the in-app consent screen (`MessageGuardConsent.tsx`), where the user picks each app, then `grantMessageGuardConsent(ids)`, then Android's notification access screen (`openNotificationAccessSettings()`), then `setMessageGuardEnabled(true)`. Native code refuses to turn on without current consent for at least one app. Nothing is read while it is off.

Flow for each notification:

1. Drop it unless the package belongs to an app the user picked: the SMS app, Google Messages, WhatsApp (and Business), Viber, Telegram (and Telegram X), LINE, Messenger, Zalo or Signal. "SMS" covers the default SMS app (`Telephony.Sms.getDefaultSmsPackage`) when it is not in the list above, plus phone makers' SMS apps (`MessageApps.oemSms`: Samsung, AOSP/Xiaomi/Huawei `com.android.mms`, OnePlus, Sony, Motorola, HTC). No app is on by default. Email and banking apps are never in the list. Ongoing and foreground-service notifications are dropped. A group summary is dropped when the app also posted a child; otherwise it is read.
2. Read the newest message: the last MessagingStyle message (skipped when it is the user's own reply: no sender, or the `EXTRA_MESSAGING_PERSON` / self display name), then `EXTRA_BIG_TEXT`, then the last `EXTRA_TEXT_LINES` line, then `EXTRA_TEXT`. Placeholders an app shows when its preview is off ("New message", "3 new messages", "Pesan baru", "ข้อความใหม่" and others in `MessageGuardExtractor`) are skipped as hidden previews.
3. Score it on the device. Signals and weights are in `message_guard_keywords.json` (link 2, shortener +1, payment 2, OTP 2, account 2, urgency 1, parcel 2, bank 2, job 2, chat-app move 1, unknown sender 1). A score of 3 or more passes. English, Bahasa, Tagalog, Burmese and Thai lists are scanned for every message, whatever the app language. Thai has no spaces between words, so Thai entries are whole phrases ("บัญชีของคุณ", "ไม่ต้องมีประสบการณ์"), never single short words.
4. A short message with a code word, a 4 to 8 digit code, no link and no phone number is a genuine OTP. It is skipped before scoring and never leaves the device.
5. Redact (below), log the redacted text on the device, then send `{ kind: "message", text, language, shareSignals }` with the Firebase token if the app set one.
6. `careful` or `danger`: post a discreet notice (below). `safe` shows nothing. The result also goes through `ShieldBridge.publishResult`, so it reaches `onShieldResult` and `takeUnsyncedResults` with `kind: "message"`, and is stored in the no-backup directory so the deep link still works after the process was killed.

### Decision record

Every notification from an app the user chose gets one outcome code while Message Guard is on or paused (`MessageGuardActivity.kt`, `activity.json` in the no-backup directory, last 100 events, 7 days). Notifications from any other app leave no record: no code, no time, no count. Codes: `skipped_paused`, `skipped_self`, `skipped_no_text`, `skipped_hidden_preview`, `skipped_too_short`, `skipped_otp`, `skipped_not_risky`, `skipped_duplicate`, `skipped_rate_limited`, `sent`, then `check_failed:<kind>` (`no_server`, `bad_url`, `timeout`, `no_connection`, `network`, `server_<status>`, `unreadable`, `unknown`) or `result:<verdict>`, with `:notice_blocked` when Android would not show the notice. Group summaries and ongoing notifications only add to the counts. An event holds the time, the app id (`viber`, `sms`) and the code; never text, sender or title. Turning Message Guard off clears it. `getMessageGuardActivity(afterSeq)` returns new events and the counts; the app copies them into the Diagnostics log (area `messageGuard`). `getMessageGuardStatus()` also returns `listenerConnected`, `notificationsEnabled`, `batteryOptimized`, `missingApps` and `last`, which the card shows. `openBatteryOptimizationSettings()` opens the battery optimisation list (no `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` permission). A safe result posts no notice by design; the card's "Last activity" line shows that a message was seen.

The Burmese lists are Unicode text. Zawgyi-encoded messages do not match. Tune the JSON, then run `./gradlew :shield-module:testDebugUnitTest`.

### Privacy

| Topic | Rule |
| --- | --- |
| Consent | Shown in the app before the system screen: what it reads, what leaves the phone, what never leaves, who processes it (Kakwe's server and Google's AI), that it can be turned off, and that anyone holding the phone may see notices. "Turn on" and "Not now" have equal weight. Turning an extra app on asks again. Turning Message Guard off withdraws consent and clears the app list. Installs from before consent existed stay off. |
| Sender | The notification title, sender, chat title and other participants never leave the device. A `Name:` prefix is cut from the text; a two-word or longer sender name is replaced with `[NAME]` anywhere in the text. A one-word title such as a brand name stays in the body. |
| Redaction | Emails `[EMAIL]`, phone numbers `[PHONE]`, other runs of 6 or more digits `[NUMBER]`, a code next to a code word `[CODE]`. Account and card numbers become `[ACCOUNT]`: numbers after an account word (account, card, rekening, a/c, ending in, บัญชี, အကောင့် and others), masked cards (`**** 1234`), 13 to 19 digit runs and IBANs. Links keep scheme and host; path, query and user info become `/[PATH]`. Amounts like `1.500.000` and dates stay. |
| Names | Conservative heuristic, `[NAME]` replaces the name and keeps the title: capitalised words after Hi, Hello, Dear, Mr, Mrs, Ms, Miss, Dr, Ko, Ma, U, Daw, Khun, Pak, Bu, Kuya, Ate, a.n.; Burmese ဒေါ် and ဦး followed by a space and a name, ကို and မ only after a greeting, at the start of a sentence or before the vocative ရေ; Thai คุณ followed by a name, but not when คุณ is the pronoun ("you") or part of a word such as ขอบคุณ or คุณสมบัติ. Generic words (Customer, Sir, Valued) stay. Names without such a marker are not detected. |
| Length | Text is cut to 600 characters after redaction. |
| Limits | The same message (ignoring digits and spacing) is checked once per 10 minutes. At most 20 checks per hour and 60 per day leave the device. The 61st check in a day is not sent; Message Guard pauses itself and the card shows why. Turning it on again resumes it without a new consent. |
| Transparency log | The last 50 checks, at most 7 days old: time, app name, the exact redacted text and the verdict. Stored in `noBackupFilesDir`, so Android backup does not copy it. Never synced. "What Message Guard sent" on the card shows it and has "Delete all". |
| Notice | Title "Kakwe", body "A message may need a second look. Open to see why." in the app language, one "Open" action for `saferoute://report/<id>`. No verdict, no scam words, no quoted text. `VISIBILITY_PRIVATE`; the lock-screen version says only "Kakwe". One default-importance channel, one gentle vibration for every verdict. |
| Kill switch | "Turn off and remove access" on the card turns Message Guard off and opens Android's notification access screen, so the user can revoke access at the system level. |
| Auth | The auth token is held in memory only, so a check after the app process died goes out without it and the server limits by IP. |

Tests: `MessageRedactionTest` (multilingual fixtures; asserts that no fixture name, number or email survives), `MessageGuardPrivacyTest` (consent gating, empty default app list, log retention, neutral notice, caps), `MessageGuardTest` (prefilter, OTP, extractor, SMS packages, request body) and `MessageGuardActivityTest` (decision codes, listener paths, status).

### Google Play declaration

Notification access (`BIND_NOTIFICATION_LISTENER_SERVICE`) is a sensitive permission, and reading messages falls under Play's User Data and SMS policies. The listing must: describe Message Guard as an optional core feature that warns about scam messages; state that it reads notifications only from the listed messaging apps; state that text is scored on the device and only risky-looking text is sent, with phone numbers, emails, account numbers, likely names and link paths removed first, and that genuine one-time codes are never sent; point to the privacy policy section that says this; and make the in-app prominent disclosure and consent (the Message Guard consent screen, shown before the system settings screen opens) match the declaration. Do not request `READ_SMS` or `RECEIVE_SMS`. If Play review asks for a video, show the consent screen, the settings screen and a notice. Sideloaded builds on Android 13 and up need "Allow restricted settings" in App info before the switch can be turned on.

## Voice companion

The user talks to Pyit Taing Htaung (ပစ်တိုင်းထောင်), Kakwe's roly-poly doll companion, through the bubble while another app stays in front. The overlay windows stay `NOT_FOCUSABLE`, so touches still reach the app below. Rules: `memory live-voice-rules` and `docs/live-audio-contract.md` (companion mode).

### Start and end

| Action | Effect |
| --- | --- |
| Double tap the bubble (idle, error or a result) | Starts a session. A single tap now waits for the double-tap timeout (300 ms) before it checks the screen |
| "Ask" chip on the result pill or sheet | Starts a session about the result on show |
| Tap the bubble, or the mic on the pill, during a session | Mute or unmute. After a lost audio focus, a tap resumes |
| End on the pill, or long press the bubble | Ends the session. The shield stays on; a second long press closes it |
| Session cap (`LIVE_COMPANION_MAX_MS`, 300 s), the shield stops, drag to the close target, server error | Ends the session |
| TalkBack | Custom action "Talk to Pyit Taing Htaung" on the bubble |

Double tap was kept over a separate mic badge: it adds no window and no clutter, and 300 ms on a check that takes seconds is not noticeable.

### Flow

```
            double tap / Ask
  IDLE ───────────────────────► CHECKING  (normal capture and /v1/check; skipped when a result is on show)
                                    │ result
                                    ▼
                                 WARNING   approved spokenWarning from /v1/speak, played natively
                                    │ done
                                    ▼
                                CONNECTING  /v1/live, start { mode: "companion", report, checkId, home, destination }
                                    │ ready
                                    ▼
             ┌──────────────► LISTENING ◄───── playback drained ─── SPEAKING
             │                 │   ▲  │ user transcript          ▲
             │                 │   │  └────────► THINKING ───────┘ model audio
             │  action RECHECK ▼   │
             │             RECHECKING  mic gated, capture, /v1/check, new verdict on the bubble
             │                 │
             │                 ▼
             └── context ── WARNING (new approved warning), then { type: "context", report } and THINKING
  Any live state: End, long press, cap, shield stop, server error ─► ENDED
```

Barge-in: `interrupted` flushes playback at once. Audio focus: `AUDIOFOCUS_LOSS*` (a call, another app) flushes playback, closes the mic and shows "Paused"; `AUDIOFOCUS_GAIN` resumes. Everything is released on end.

### What the bubble and pill show

The pill shows no transcript text: only a short status word, a mute toggle (live states only) and End. It wraps its content and the status chip is capped to fit the screen width minus 48dp; Burmese status words fit at 320dp with the 1.3 font scale cap. The status chip is a polite live region, so TalkBack announces each status change. The session reads `transcript` frames only as a signal (a user line moves Listening to Thinking); the server keeps transcription on because it also feeds the certainty, gender-form and promise counters and the turn count in the session log.

| State | Bubble | Pill chip | Pill text |
| --- | --- | --- | --- |
| Checking, rechecking | Scanning shield | Checking / Checking again | |
| Warning | Doll rocking with the output level | Warning | |
| Connecting | Doll with three moving dots | Connecting | |
| Listening | Doll with a mic badge, input-level ring | Listening | |
| Thinking | Doll with three moving dots | Thinking | |
| Speaking | Doll rocking and growing with the output level, level ring | Speaking | |
| Muted, paused | Grey mic with a slash | Muted / Paused | |
| Ended | Verdict bubble; the result pill returns | | A notice for cap or errors |

The doll is `res/drawable-nodpi/companion_doll.png` (192 px, rendered from `assets/avatar/doll.svg`), clipped to the circle inside the ring. The ring keeps the verdict color of the current report. TalkBack and the pill name the companion with the `name` string.

### Android 14 foreground service

The service type is `specialUse|mediaProjection|microphone`. Starting a while-in-use type (microphone) needs the app to be visible: [developer.android.com, restrictions on starting a foreground service from the background](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start). The `SYSTEM_ALERT_WINDOW` exemption on that page covers starting a service from the background, not while-in-use access; on Android 14 `startForeground` with type microphone throws `SecurityException` without it.

So the service adds the microphone type while Kakwe is visible (`startShield`, and `OnActivityEntersForeground` in the module) whenever `RECORD_AUDIO` is granted, and only calls `startForeground` again at session start if the type is missing. If that call throws, the pill shows "Open Kakwe once to allow voice"; a tap opens the Shield screen, which re-arms the type. On Android 11 to 13 a blocked mic records silence instead of throwing: 4 s of digital silence ends the session with the same notice. Missing `RECORD_AUDIO` shows "Open Kakwe to allow the microphone". The app asks for it, after a short reason dialog, from the "Talk to Pyit Taing Htaung from the bubble" card and when the user starts a voice chat. Turning the shield on does not ask for it.

### Strings

`startShield({ strings })` takes the labels in `COMPANION_STRING_KEYS` (`index.ts`); the app builds them from `live:companion` in the UI language. Unknown keys and blank values are dropped, values are capped at 160 characters, and missing keys fall back to English (`ShieldStrings.DEFAULTS`). The labels are read when the shield starts.

### On-device checklist

- [ ] Shield screen: "Allow microphone" shows the system prompt; the card then says the microphone is allowed.
- [ ] In another app, double tap the idle bubble: the bubble hides, checks, shows the verdict, the warning plays, then the pill says Listening.
- [ ] A single tap still checks the screen, about 0.3 s later than before.
- [ ] Ask a question while the other app is in front; scroll and type in it during the answer (touches pass through).
- [ ] Talk over the answer: the voice stops within about 100 ms.
- [ ] Say "what about this one?" on a new message: the bubble hides, checks, shows the new verdict, plays its warning, and the model explains the new result.
- [ ] Tap the bubble: Muted, the mic indicator goes off; tap again: Listening.
- [ ] Incoming call or music app: Paused; after the call the session resumes.
- [ ] End on the pill and a long press both end the session and keep the shield; drag to the close target closes both.
- [ ] Android 14: kill Kakwe from recents, start the shield from the Home switch, leave the app, double tap: voice works; if not, the pill says "Open Kakwe once to allow voice".
- [ ] "Ask me for the hotline" opens Kakwe on Get help; TalkBack offers "Talk to Pyit Taing Htaung".

## Signal sharing

Scam-pattern sharing is opt-in. `startShield({ shareSignals })` and `setShieldShareSignals(enabled)` set it; native starts at false and every screen check sends `shareSignals` explicitly, `true` only after the user opted in. The app keeps it in step with the profile setting (`useShieldShareSync`).

## Auth token

`startShield({ apiUrl, language, authToken })` takes an optional Firebase ID token that `CheckClient` sends as `Authorization: Bearer`. `setShieldAuthToken(token)` replaces it while the shield runs. Without a token the server limits by IP. The token is held in memory only (`ShieldBridge.authToken`).

## Rules to keep

- Android 14 allows one `createVirtualDisplay` per MediaProjection and one `getMediaProjection` per consent result. The capturer keeps one display for the session. Do not create one per tap.
- On Android 14 `startForeground` with type `mediaProjection` throws before consent. The service starts as `specialUse` and switches type after consent.
- Overlay labels (verdict and error chips, "Tap to retry", Dismiss, Full report, TalkBack actions and the voice companion) come from the app in the user's language through `startShield({ strings })`. Verdict chips reuse the app's `common:verdict` words (Low risk, Be careful, High risk), never "Safe"; English fallbacks live in `ShieldStrings.DEFAULTS`. Result text comes from the server in the requested language. TalkBack sentences (the bubble description, "Expanded") and the error sentences TalkBack reads come from the same map (`a11y*`, `err*`); each failure kind maps to one translated sentence, and an unknown server message reads as "The check failed". `pitch/e2e/bubble-doll-states-my.png` shows the Burmese labels.
- `startShield` options also carry `home` and `destination` country codes for the companion's verified hotlines.
