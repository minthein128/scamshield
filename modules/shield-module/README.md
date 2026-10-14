# shield-module

Expo module for Android. It draws a floating bubble over other apps. A tap captures the screen with MediaProjection, posts one JPEG to `${apiUrl}/v1/check` (kind `screen`, see `docs/api-contract.md`) and shows the verdict on the bubble and in a result card.

## Layout

| File | Role |
| --- | --- |
| `index.ts` | JS API, types and a mock for web and iOS |
| `ShieldModule.kt` | Expo module: functions and the `onShieldResult` event |
| `ShieldService.kt` | Foreground service: owns the overlay, the capture session and the check flow |
| `ShieldOverlay.kt` | Ball and card views, built in code |
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
2. Tap the bubble in another app. The bubble disappears for about 0.3 s, shows a spinner, then turns green, amber or red with a card.
3. "Open full report" opens `saferoute://report/<id>`. The app must declare the `saferoute` scheme and read the result with `getShieldResult(id)`.
4. Android 14 and up: the consent dialog must appear again after the user stops sharing from the status bar chip.

## Auth token

`startShield({ apiUrl, language, authToken })` takes an optional Firebase ID token that `CheckClient` sends as `Authorization: Bearer`. `setShieldAuthToken(token)` replaces it while the shield runs. Without a token the server limits by IP. The token is held in memory only (`ShieldBridge.authToken`).

## Rules to keep

- Android 14 allows one `createVirtualDisplay` per MediaProjection and one `getMediaProjection` per consent result. The capturer keeps one display for the session. Do not create one per tap.
- On Android 14 `startForeground` with type `mediaProjection` throws before consent. The service starts as `specialUse` and switches type after consent.
- UI labels are English. Result text comes from the server in the requested language.
