# shield-module

Expo module for Android. It draws a floating bubble over other apps. A tap captures the screen with MediaProjection, posts one JPEG to `${apiUrl}/v1/check` (kind `screen`, see `docs/api-contract.md`) and shows the verdict on the bubble and in a compact result pill that expands into a sheet.

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
| `ShieldBridge.kt` | Shared state between module, service and activity |

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
2. Tap the bubble in another app. The bubble disappears for about 0.3 s, fades back with a progress ring, then shows the verdict ring and a result pill.
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
| Idle | `#CBD5E1` / `#475569` | Brand blue shield | Half-tucked at the edge: 20dp of the circle sits off screen, 48dp stay visible |
| Checking | Faint static blue track | Blue shield that pulses (scale 1.0 to 1.05) while a scan line sweeps down it, 1.4 s per pass | Bubble is hidden during capture, then fades and scales in from 70%. With animator scale 0 the shield is static |
| Safe | `#1D4ED8` / `#8FB0FF` (theme safe is blue) | Shield with check | Pill auto-collapses after 8 s, bubble returns to idle |
| Careful | `#B45309` / `#FBBF24` | Shield with "!" | Pill stays until dismissed |
| Danger | `#C2410C` / `#FB923C` | Shield with alert triangle | Pill stays until dismissed |
| Error | `#64748B` / `#94A3B8` | Shield with "!" | Neutral pill with "Tap to retry" |

On a verdict the shield pops (scale 80% to 100% with overshoot, 340 ms) while its mark fades in, in the verdict color. Shapes and colors come from `src/theme/theme.ts`.

Circle fill is the theme surface (`#FFFFFF`, dark `#1E293B`). Ring width is 3dp. The shadow is a 8dp blur, 3dp offset.

Gestures:

- Tap: check the screen (idle, error) or show and hide the pill (result states).
- Drag: the bubble follows the finger. A close target fades in at the bottom center. Within 84dp of it the bubble snaps to it and the target grows. Release there closes the shield. Elsewhere, the bubble springs to the nearest side edge (damping 0.65). A visible pill is hidden while dragging and returns at the new edge.
- Long press (about 0.7 s without moving): closes the shield with a tick.
- Closing stops the service. Start it again from the app.

### Result pill and sheet

- Position: below the bubble when the bubble is in the upper half of the screen, above it otherwise. It is anchored to the bubble's side edge with a 12dp margin.
- Enter: alpha 0 to 1 and scale 45% to 100% about the bubble center, 200 ms, `cubic-bezier(0.2, 0, 0, 1)`. Exit is 170 ms.
- Collapsed: a pill at least 48dp tall with radius 24dp. It holds a verdict chip (12sp bold, 14dp radius), a one-line title (14sp semibold, ellipsized) and a chevron.
- Expanded (tap, 220 ms): width grows to min(344dp, screen - 48dp), radius goes to 20dp, a detail area opens. It holds a summary (14sp, up to 4 lines), up to 3 flag rows (18dp severity icon, 13sp, up to 2 lines) and two text buttons, "Dismiss" and "Full report" (48dp tall, at least 48dp wide).
- Surface: theme surface color, 1dp border, 10dp elevation. Font is Plus Jakarta Sans (Regular, SemiBold, Bold) from `assets/fonts` in the APK, system sans if the load fails.
- Swipe left or right to dismiss. Past 40% of the width, or a fast fling, it flies off. Otherwise it springs back.
- Error pill: neutral chip (Offline, Rate limited, Service busy or Not checked) and "Tap to retry". It does not expand. Tapping it, or the bubble, retries.

| Verdict chip | Light (bg / text) | Dark (bg / text) |
| --- | --- | --- |
| Safe | `#DBE5FF` / `#1E3A8A` | `#1E3A8A` / `#DBE5FF` |
| Be careful | `#FEF3C7` / `#854D0E` | `#78350F` / `#FDE68A` |
| High risk | `#C2410C` / `#FFFFFF` | `#9A3412` / `#FFFFFF` |
| Error | `#EEF2F6` / `#334155` | `#334155` / `#E2E8F0` |

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
            tap                    hide 250 ms, capture, upload
  IDLE ───────────────► (hidden) ───────────────────────────► CHECKING
   ▲  ▲                                                        │
   │  │ Dismiss, swipe, 8 s (safe only)        verdict         ▼
   │  └──────────────── SAFE / CAREFUL / DANGER ◄───────────────┤
   │                          │ tap bubble: hide or show pill   │ failure
   │                                                            ▼
   └────────── Dismiss, swipe ───────────────────────────────  ERROR
                                      tap pill or bubble ─► (retry) ─► CHECKING
  Any state: long press, or drag onto the close target ─► service stops
```

### Preview

`./gradlew :shield-module:testDebugUnitTest` renders every state, light and dark, to `android/build/shield-snapshots/*.png` with Robolectric native graphics. Elevation shadows and the Plus Jakarta Sans fonts are not part of that render (the test has no APK assets), so check those on a device.

## Auth token

`startShield({ apiUrl, language, authToken })` takes an optional Firebase ID token that `CheckClient` sends as `Authorization: Bearer`. `setShieldAuthToken(token)` replaces it while the shield runs. Without a token the server limits by IP. The token is held in memory only (`ShieldBridge.authToken`).

## Rules to keep

- Android 14 allows one `createVirtualDisplay` per MediaProjection and one `getMediaProjection` per consent result. The capturer keeps one display for the session. Do not create one per tap.
- On Android 14 `startForeground` with type `mediaProjection` throws before consent. The service starts as `specialUse` and switches type after consent.
- UI labels are English. Result text comes from the server in the requested language.
