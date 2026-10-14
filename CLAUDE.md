# SafeRoute app

Expo SDK 52 / React Native, TypeScript strict. Android anti-scam app. The Expo web build is also deployed (Firebase Hosting) for judges.

## Commands

- `pnpm check` runs typecheck, lint (0 warnings allowed) and tests. Run it before every commit.
- `pnpm start` / `pnpm web` / `pnpm android` start Expo. `pnpm build:web` writes `dist/`.
- Install with `pnpm install --frozen-lockfile`. Add Expo packages with `npx expo install <pkg>` so versions match SDK 52. The repo uses `node-linker=hoisted`.

## Layout

- `src/api/` contract types (`types.ts`, from `docs/api-contract.md`), HTTP client, mock backend, error mapping. Import from `src/api`.
- `src/lib/` pure helpers: image compression, speech, history storage, report mapping, request building, share-intent mapping.
- `src/state/AppState.tsx` language and recent checks (AsyncStorage).
- `src/navigation/` React Navigation: bottom tabs (Home, Check, Family, Learn) inside a native stack (Checking, Report, Shield, DemoBoard).
- `src/screens/` real screens. `src/screens/demo/` mock overlay walkthroughs, listed in `boards.ts` and shown under Learn.
- `src/hooks/useSharedDraft.android.ts` Android share intent. The default file is a no-op for web.
- `modules/shield-module/` native overlay owned by another engineer. `server/` is the backend. Do not edit either from app work.

## Mock or real API

`EXPO_PUBLIC_API_URL` set: the app calls `POST {url}/v1/check`. Unset: `src/api/mock.ts` answers locally with keyword rules, so the app works offline. Tests never call the network.

Other env vars: `EXPO_PUBLIC_HOTLINE_NUMBER` (fallback call target), `EXPO_PUBLIC_APK_URL` (download link on web).

## Shield overlay (Android)

- `src/screens/ShieldScreen.tsx` asks for POST_NOTIFICATIONS (Android 13+), then screen capture, then calls `startShield({ apiUrl, language })`. "Check this screen now" calls `checkScreenNow()`.
- Overlay results are saved to recent checks by `useShieldSync` (listener plus `takeUnsyncedResults()` on start). `saferoute://report/<id>` opens the report through `useShieldDeepLink`.
- The native client is blocked from cleartext `http://` by Android. `EXPO_PUBLIC_API_URL` must be `https://` for the shield. Cleartext is not enabled. The web build and `pnpm web` may use `http://localhost`.
- The shield needs `EXPO_PUBLIC_API_URL`; it does not use the mock.
- After editing `modules/shield-module`, run `rm -rf node_modules/shield-module && pnpm install` (the `file:` dependency is copied).

## Rules

- All UI copy is English. Only the model response follows the selected report language.
- `Family` screen data is mock (`src/lib/mockFamily.ts`); its call buttons are real `tel:` links.
- Android only: share intent, shield overlay. Guard with `Platform.OS`; web shows `AndroidNote`.
- Keep the visual design in `src/theme/theme.ts`. Comments: one line, only when the code is not obvious.
