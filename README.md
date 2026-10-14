# SafeRoute: Anti-Fraud & Scam Shield App

An anti-scam and anti-trafficking app built with **Expo SDK 52 (React Native)**. Paste text, a link or a screenshot, get a risk report from the Gemini-backed Check API, and hear the warning in your language. The same code runs on Android and in the browser.

## Try it

- Web demo: https://saferoute-aibc.web.app (open it, tap Check, paste a job post or SMS)
- Android APK: https://saferoute-aibc.web.app/saferoute.apk

The demo calls the live SafeRoute API (Gemini with Google Search grounding, plus RDAP and Web Risk link checks). Install the APK by opening the link on an Android phone and allowing "install unknown apps" for your browser. The APK is signed with a debug key, so Play Protect may ask for confirmation. The floating Shield overlay needs the notification and screen capture permissions.

## Install as a tester

Testers get builds through Firebase App Distribution, with update notices.

1. Open the invite email from Firebase App Distribution and tap **Get started** on your Android phone. Sign in with the Google account the invite went to.
2. Accept the invite. Firebase App Tester opens in the browser; tap **Download App Tester** and install it (allow installs from your browser if asked).
3. Open App Tester, choose SafeRoute, and tap **Download** on the latest release. Install it.
4. App Tester shows a notification when a new build is ready. Open it and tap **Update**.

## Development

```bash
pnpm install
pnpm check            # typecheck + lint + tests
pnpm web              # browser, uses the local mock API
EXPO_PUBLIC_API_URL=https://your-cloud-run-url pnpm web   # real backend
pnpm build:web && firebase deploy --only hosting
```

See `CLAUDE.md` for the code layout and the mock/real API switch.

---

## 📱 Features & Implemented Designs

This application reproduces all **24 design screens and flows**:

1. **Core SafeRoute Screens**:
   - **Board 1 · Home Screen**: Header, greeting, primary overseas job check CTA card, 3 quick actions (link, screenshot, chat), protection cards (romance scam, travel plan), family guardian circle badge, and recent checks list with severity badges.
   - **Board 2 · Check a Job Offer**: TikTok video ad review, destination/travel route, language selector (English, Bahasa, Tagalog, Myanmar), and 4-step check preview.
   - **Board 3 · Risk Report (Verdict)**: High-risk trafficking verdict, 5-point evidence breakdown (salary anomalies, visa omission, anonymous recruiter, company registry absence, border route pickup), and emergency hotline integration.
   - **Board 4 · Family Guardian (Ibu's View)**: Check-in timeline (airport departure, Bangkok arrival, company car pickup, missed check-in), emergency dialer, and one-tap consular SOS dispatch.

2. **Interactive Floating Shield Overlay Flows**:
   - **Board A · Turn on Shield**: Edge floating bubble interactive demo and 3-level threat indicator (Safe, Careful, Danger).
   - **Boards B to F · Job Scam Flow**: Simulated social feed -> truncated job post detection -> expand post to reveal passport seizure -> auto-check analysis -> picture verdict with voice warning.
   - **Boards G to J · Romance / Pig Butchering Scam Flow**: Online friend chat with trading profit lure -> scroll-up prompt -> 3-week grooming timeline analysis -> love & money trap verdict.
   - **Boards K & L · SMS Parcel Phishing Flow**: Warehouse fee delivery SMS -> on-device heuristic warning -> known Web Risk trap verdict.
   - **Boards M & N · Recruitment Agency Verification**: Fake overseas agency profile -> official license registry check -> Careful verdict.
   - **Boards O to R · Cheap Tech Marketplace Scam**: 80% discounted smartphone listing -> seller profile inspection (Toko Murah88) -> direct bank transfer trap verdict.

3. **Taxonomy & Architecture Guides**:
   - **Board 23 · Scam Types by Shield**: Matrix mapping all fraud categories across Job Shield, Message Shield, and E-commerce Shield to the 7 Red-Flag Families (*Too good, Pressure, Payment route, Identity, Link risk, Known bad, Trafficking*).
   - **Board 24 · Case Study: 6-Stage Detection Pipeline**: Complete architectural breakdown of the Viber gambling lure through Capture, Extract (OCR + Gemini), Detect, Correlate (Web Risk & RDAP), Score (Rules engine), and Explain (Voice synthesis).

---

## Install and run

| Goal | Steps |
|---|---|
| Use the app | Open the APK link above on an Android phone |
| Run the web app locally | `pnpm install --frozen-lockfile && pnpm web` (offline mock API unless `EXPO_PUBLIC_API_URL` is set) |
| Run the backend locally | `cd server && npm ci && MOCK=1 npm run dev`, or set `GEMINI_API_KEY` for the real model |
| Build the APK | Push a `feat/**` branch; the Android workflow uploads the `saferoute-apk` artifact |
| Deploy to Google Cloud | `scripts/deploy-cloudrun.sh` (see `docs/setup-gcp.md`) |
