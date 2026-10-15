# SafeRoute app

Expo SDK 52 / React Native, TypeScript strict. Android anti-scam app. The Expo web build is also deployed (Firebase Hosting) for judges.

## Commands

- `pnpm check` runs typecheck, lint (0 warnings allowed) and tests. Run it before every commit.
- `pnpm start` / `pnpm web` / `pnpm android` start Expo. `pnpm build:web` writes `dist/`.
- Install with `pnpm install --frozen-lockfile`. Add Expo packages with `npx expo install <pkg>` so versions match SDK 52. The repo uses `node-linker=hoisted`.

## Layout

- `src/api/` contract types (`types.ts`, from `docs/api-contract.md`), HTTP client, mock backend, error mapping. Import from `src/api`.
- `src/lib/` pure helpers: image compression, speech, history storage, report mapping, request building, share-intent mapping.
- `src/state/AppState.tsx` profile (language, home and destination country, onboarded), history, trusted contacts; syncs to Firestore when signed in. `AuthState.tsx` wraps Firebase Auth (anonymous by default, email/password, Google and Facebook through `src/services/social.ts` (popup on web) and `social.native.ts` (google-signin and expo-auth-session on Android); Google needs `EXPO_PUBLIC_GOOGLE_SIGNIN=1` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, Facebook needs `EXPO_PUBLIC_FACEBOOK_APP_ID`; `public/privacy` and `public/delete-account` ship in the web build.
- `src/config/runtime.ts` resolves the API URL at startup: `EXPO_PUBLIC_CONFIG_URL` (default `https://saferoute-aibc.web.app/config.json`, 3 s), then the cached value, then `EXPO_PUBLIC_API_URL`.
- `src/data/hotlines.ts` verified hotlines with source URLs; the server reads a generated copy (`pnpm sync:hotlines`).
- `firestore.rules`, `firestore-tests/`: per-user rules and the emulator test (`pnpm test:rules`).
- `src/i18n/` i18next setup, UI language list, persistence. `pnpm i18n:check` lists missing or unreviewed translations; `pnpm i18n:translate` fills missing keys with Gemini.
- `src/navigation/` React Navigation: bottom tabs (Home, Check, Contacts, Learn) inside a native stack (Onboarding, Checking, Report, Shield, Settings, Account, GetHelp, DemoBoard).
- `src/hooks/useLayout.ts` size classes from window width: `compact` < 600 dp (phone layout), `medium` 600-899, `expanded` >= 900 (nav rail, two-pane Report). `Screen` centers a reading column on tablets (`wide` for grids); `Grid` lays out card columns; sheets become centered dialogs through `useSheetLayout`. Phones lock to portrait through `useOrientationPolicy`.
- `src/screens/` real screens. `src/screens/demo/` illustrated walkthroughs, listed in `boards.ts` and shown under Learn as "See how scams look".
- `src/hooks/useSharedDraft.android.ts` Android share intent. The default file is a no-op for web.
- `bench/` screenshot benchmark (run from `server/`, see `bench/README.md`). Never commit real screenshots. `media/` holds the deck PDF and the demo video (Git LFS).
- `modules/shield-module/` native overlay owned by another engineer. `server/` is the backend. Do not edit either from app work.

## Mock or real API

The resolved API URL is set: the app calls `POST {url}/v1/check` with the Firebase ID token. Unset: only in a dev build (`__DEV__`), `src/api/mock.ts` answers locally and the app shows an "Offline demo mode" banner. Release builds with no URL show an "unavailable" error. Tests never call the network.

Other env vars: `EXPO_PUBLIC_APK_URL` (download link on web), `EXPO_PUBLIC_FIREBASE_*` (web config, public identifiers; keep in gitignored `.env.local` or CI variables).

## Shield overlay (Android)

- `src/screens/ShieldScreen.tsx` asks for POST_NOTIFICATIONS (Android 13+), then screen capture, then calls `startShield({ apiUrl, language, authToken })`. The same flow runs from the switch on Home (`useShieldControl`). "Check this screen now" calls `checkScreenNow()`.
- Overlay results are saved to recent checks by `useShieldSync` (listener plus `takeUnsyncedResults()` on start). `saferoute://report/<id>` opens the report through `useShieldDeepLink`.
- The native client is blocked from cleartext `http://` by Android. `EXPO_PUBLIC_API_URL` must be `https://` for the shield. Cleartext is not enabled. The web build and `pnpm web` may use `http://localhost`.
- The shield needs `EXPO_PUBLIC_API_URL`; it does not use the mock.
- After editing `modules/shield-module`, run `rm -rf node_modules/shield-module node_modules/live-audio && pnpm install (or copy modules/<name> into node_modules/<name> if pnpm skips the link)` (the `file:` dependency is copied).

## Rules

- UI copy lives in `src/i18n/locales/<lang>/*.json` (English is the source, keys are typed). Use `t()` from react-i18next, never a string literal, and import `Text` from `src/components/Text`. See `docs/i18n.md`. The model response follows the report language, not the UI language.
- No seeded data in the UI. Every screen needs an empty state.
- Android only: share intent, shield overlay. Guard with `Platform.OS`; web shows `AndroidNote`.
- Keep the visual design in `src/theme/theme.ts`. Comments: one line, only when the code is not obvious.
