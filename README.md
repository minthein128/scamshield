# SafeRoute: Anti-Fraud & Scam Shield App

A mobile anti-fraud and anti-trafficking application built in **React + Tailwind CSS** and configured for **Android Studio** via **Capacitor Android**.

Based on the designs from `SafeRoute Anti-Fraud App Mockup.html`.

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

## 🚀 Running on Android Studio

The native Android project is generated and synced in the `android/` directory.

### Quick Launch in Android Studio:
1. Open **Android Studio** (`D:\Android Studio\bin\studio64.exe`).
2. Select **File → Open...**
3. Navigate to and select the folder:
   ```
   D:\scamshield\android
   ```
4. Wait for Gradle to finish indexing (the SDK path is already configured to `D:\Android\Sdk` in [local.properties](file:///D:/scamshield/android/local.properties)).
5. Select your target device or emulator in the toolbar and click **▶ Run (Shift + F10)**.

### Updating Android after React edits:
Whenever you make changes to React components, re-sync with a single command:
```bash
pnpm run build:android
```
This builds the React app into `dist/` and copies all assets directly into Android Studio's asset bundle (`android/app/src/main/assets/public`).

---

## 🌐 Running Locally in Web Browser

To test or develop in your browser:
```bash
pnpm dev
```
Open [http://localhost:5173](http://localhost:5173). You can switch between:
- **Mobile Simulator** (iPhone chassis frame preview)
- **Scam Taxonomy Matrix**
- **6-Stage Pipeline Architecture**
- **All 24 Boards Catalog**
