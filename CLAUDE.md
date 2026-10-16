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
- `src/config/runtime.ts` resolves the API URL: `EXPO_PUBLIC_CONFIG_URLS` (comma list; default the web.app then the firebaseapp.com `config.json`) are tried in parallel with a short stagger, 6 s each. Each candidate (primary `EXPO_PUBLIC_STABLE_API_URL`, default the run.app URL; fallback `EXPO_PUBLIC_FALLBACK_API_URL`, default `https://saferoute-api.akkhayar.com`; cache; `EXPO_PUBLIC_API_URL`; remote source) is health-checked at `/health`, then `/healthz` on a 404, before it is trusted. A network error on a check re-resolves once and retries; the app also re-resolves after 5 minutes in the background. Settings > Connection shows the host and health.
- `src/lib/diagLog.ts` local diagnostics log (last 300 entries, 7 days, AsyncStorage only). Call `diag.info/warn/error(area, event, details)` with codes, statuses, durations, counts and booleans only; the sanitiser redacts anything else. Never pass message text, URLs, names, numbers, emails, tokens or uids. Settings > Connection > Diagnostics log shows it and builds the one shareable report (`src/lib/diagReport.ts`). `scripts/e2e-diagnostics.mjs` takes its screenshots.
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

In a dev build, `EXPO_PUBLIC_OFFLINE_MOCK=1` skips URL resolution so the offline mock answers (used by `scripts/e2e-jobshield.mjs` for the Job Shield screenshots).

Other env vars: `EXPO_PUBLIC_APK_URL` (download link on web), `EXPO_PUBLIC_FIREBASE_*` (web config, public identifiers; keep in gitignored `.env.local` or CI variables).

## Shield overlay (Android)

- `src/screens/ShieldScreen.tsx` explains and asks for "Display over other apps", then POST_NOTIFICATIONS (Android 13+, optional), then screen capture, then calls `startShield({ apiUrl, language, authToken })`. The same flow runs from the switch on Home (`useShieldControl`). "Check this screen now" calls `checkScreenNow()`.
- Overlay results are saved to recent checks by `useShieldSync` (listener plus `takeUnsyncedResults()` on start). `saferoute://report/<id>` opens the report through `useShieldDeepLink`.
- The native client is blocked from cleartext `http://` by Android. `EXPO_PUBLIC_API_URL` must be `https://` for the shield. Cleartext is not enabled. The web build and `pnpm web` may use `http://localhost`.
- The shield needs `EXPO_PUBLIC_API_URL`; it does not use the mock.
- After editing `modules/shield-module`, run `rm -rf node_modules/shield-module node_modules/live-audio && pnpm install (or copy modules/<name> into node_modules/<name> if pnpm skips the link)` (the `file:` dependency is copied).

## Permissions

- Nothing is requested at app start or in onboarding. Each permission is asked when its feature is used, after a short reason dialog (`src/components/PermissionHost.tsx`, strings in the `permissions` namespace). Use `ensureMicrophone`, `ensureNotifications`, `ensureContacts`, `explainPermission` and `showPermissionHelp` from `src/lib/permissions.ts`; never call `PermissionsAndroid.request` directly.
- Photos use the system photo picker (no permission). `plugins/with-minimal-permissions.js` strips CAMERA, storage, media and WRITE_CONTACTS from the merged manifest. Add a permission to its list only with a feature that needs it.

## Rules

- UI copy lives in `src/i18n/locales/<lang>/*.json` (English is the source, keys are typed). Use `t()` from react-i18next, never a string literal, and import `Text` from `src/components/Text`. See `docs/i18n.md`. The model response follows the report language, not the UI language.
- No seeded data in the UI. Every screen needs an empty state.
- Android only: share intent, shield overlay. Guard with `Platform.OS`; web shows `AndroidNote`.
- Keep the visual design in `src/theme/theme.ts`. Comments: one line, only when the code is not obvious.
