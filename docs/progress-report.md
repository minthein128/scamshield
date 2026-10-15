# SafeRoute progress report

Status date: 15 October 2026. Submission deadline: 18 October 2026 (3 days left). Entry: Google Cloud AI Builder Cup 2026, track "Sustainability & Social Impact" (`pitch/deck.md`, slide 2).

Audience: Ricky and the team. Sources are repo files unless marked. Items marked **(lead)** come from the project lead and are not in the repo. Items marked **(inferred)** or **(not verified)** are our reading, not a measurement.

## Contents

1. TL;DR
2. What SafeRoute is
3. How it looks
4. How it works
5. Quality and numbers
6. Real, mock and untested
7. Deployment and infrastructure
8. Hackathon readiness
9. Risks and known limitations
10. What is next

## 1. TL;DR

- The app works end to end today. A user pastes text, a link or a screenshot and gets a safe, careful or danger report with evidence, actions, hotlines and a spoken warning.
- The backend is real: Gemini extraction, Google Search grounding, rules scoring, Gemini speech, a shared scam radar and a feedback loop. `/healthz` reports `"mock":false` right now.
- Text eval is 27/27 with `gemini-3.5-flash-lite`, p50 3.1 s, p95 4.8 s (`bench/RESULTS.md`).
- Web demo and APK are live. Every merge to `feat/production` builds and ships a signed APK to testers (**lead**).
- Single biggest blocker: the GCP project `saferoute-aibc` has no billing account. Cloud Run cannot deploy, so the rule "deployed on Google Cloud via Cloud Run or Firebase" is only partly met, and the API runs on a build machine behind a Cloudflare quick tunnel.
- Missing for submission: public repo, demo video under 3 minutes, team names in the deck, benchmark screenshots, and device tests of the Android-only features.
- Deadline: 18 October 2026, three days from today.

## 2. What SafeRoute is

SafeRoute checks a job offer, message, link or screenshot for scams and human trafficking. It explains the result in the user's language (`README.md`).

Who it is for (`pitch/deck.md`, slides 3 and 4):

- **Rina, 24, job seeker.** A migrant worker in South-East Asia who gets job ads on social media and chat apps. She needs an answer in minutes, in her own language, on the phone she already owns.
- **Her mother, Ibu.** The family member who waits at home. The deck calls this Family Guardian. It is design-stage only: the screens exist, the backend does not (`pitch/deck.md`, Roadmap slide).

Languages:

- The report (verdict text and spoken warning) comes in English, Bahasa Indonesia, Tagalog or Burmese (`docs/api-contract.md`).
- The app UI also speaks Thai. A Thai UI user gets English verdicts (`docs/i18n.md`).

Design rules the team set:

- The wording speaks in likelihood ("shows signs of", "looks like"). It never calls a person or company a criminal (`docs/architecture.md`).
- No seeded data in the UI. Every screen has an empty state (`CLAUDE.md`).

## 3. How it looks

Screenshots are real captures of the running web build at phone width. The brand pass changed colours, icons and type. The "before" set is kept next to the "after" set in `pitch/e2e/`.

### 3.1 Onboarding

<p>
<img src="../pitch/e2e/prod-01-onboarding-language.png" width="240" alt="Onboarding language">
<img src="../pitch/e2e/prod-02-onboarding-countries.png" width="240" alt="Onboarding countries">
<img src="../pitch/e2e/prod-03-onboarding-how.png" width="240" alt="Onboarding how it works">
</p>
<p>
<img src="../pitch/e2e/prod-04-onboarding-account-choice.png" width="240" alt="Onboarding account choice">
</p>

Four steps: language, home and destination country, how it works, account choice (anonymous, email, Google).

### 3.2 Home and Check

<p>
<img src="../pitch/e2e/brand-after-05-home.png" width="240" alt="Home">
<img src="../pitch/e2e/brand-after-06-check.png" width="240" alt="Check">
<img src="../pitch/e2e/brand-after-07-check-filled.png" width="240" alt="Check with a pasted job post">
</p>

Home holds the shield switch, the recent checks and the entry points. Check takes pasted text, a link or a screenshot.

### 3.3 The shield loader

<p>
<img src="../pitch/e2e/brand-after-08-checking.png" width="240" alt="Checking screen">
<img src="../pitch/e2e/prod-19-loader.png" width="240" alt="Shield mascot loader">
<img src="../pitch/e2e/prod-20-loader-verdict.png" width="240" alt="Loader resolving to a verdict">
</p>

A six-stage progress screen with the shield mascot. The shield pops into the verdict colour when the check ends.

### 3.4 Reports

<p>
<img src="../pitch/e2e/brand-after-09-report-danger.png" width="240" alt="Danger report">
<img src="../pitch/e2e/brand-after-09-report-careful.png" width="240" alt="Careful report">
<img src="../pitch/e2e/brand-after-09-report-safe.png" width="240" alt="Safe report">
</p>
<p>
<img src="../pitch/e2e/brand-after-09-report-danger-my.png" width="240" alt="Danger report in Burmese">
</p>

Danger, careful and safe reports, plus a danger report in Burmese. Each report shows the verdict band, flags with icons, sources, actions and a Listen button. The safe verdict is shown as "Low risk" in the UI (`docs/i18n.md`).

### 3.5 Feedback and report a scam

<p>
<img src="../pitch/e2e/feedback-1-row-risky.png" width="240" alt="Feedback row on a risky verdict">
<img src="../pitch/e2e/feedback-2-sheet-risky.png" width="240" alt="Feedback sheet">
<img src="../pitch/e2e/feedback-4-thanks.png" width="240" alt="Feedback thanks">
</p>
<p>
<img src="../pitch/e2e/feedback-5-row-safe.png" width="240" alt="Feedback row on a safe verdict">
<img src="../pitch/e2e/feedback-8-get-help-entry.png" width="240" alt="Report entry in Get help">
<img src="../pitch/e2e/feedback-9-report-form.png" width="240" alt="Report a scam form">
</p>

Users can say a verdict was right or wrong, and can report a scam they met outside the app.

### 3.6 Learn and the scam guide

<p>
<img src="../pitch/e2e/learn-01-top.png" width="240" alt="Learn tab">
<img src="../pitch/e2e/learn-03-guide-top.png" width="240" alt="Scam guide">
<img src="../pitch/e2e/learn-04-guide-stepper.png" width="240" alt="Guide stepper">
</p>
<p>
<img src="../pitch/e2e/learn-06-flag-sheet.png" width="240" alt="Red flag sheet">
<img src="../pitch/e2e/learn-07-shield-howto.png" width="240" alt="Shield how-to">
</p>

Scam guides with a step-by-step walkthrough, a red-flag sheet, and a how-to for the floating shield.

### 3.7 Scam radar, Contacts, Get help, Settings

<p>
<img src="../pitch/e2e/brand-after-10-radar.png" width="240" alt="Scam radar">
<img src="../pitch/e2e/brand-after-12-contacts.png" width="240" alt="Trusted contacts">
<img src="../pitch/e2e/brand-after-13-get-help.png" width="240" alt="Get help">
</p>
<p>
<img src="../pitch/e2e/brand-after-14-settings.png" width="240" alt="Settings">
<img src="../pitch/e2e/prod-15-settings-signed-in.png" width="240" alt="Settings, signed in">
<img src="../pitch/e2e/prod-17-contacts-synced.png" width="240" alt="Contacts synced after sign-in">
</p>

Scam radar ranks risk types by country. Contacts holds trusted people. Get help lists verified hotlines. Settings holds language, sharing opt-out, account and deletion.

### 3.8 UI languages

<p>
<img src="../pitch/e2e/i18n-my-05-home.png" width="240" alt="Home in Burmese">
<img src="../pitch/e2e/i18n-id-05-home.png" width="240" alt="Home in Bahasa Indonesia">
<img src="../pitch/e2e/i18n-tl-05-home.png" width="240" alt="Home in Tagalog">
</p>
<p>
<img src="../pitch/e2e/i18n-th-05-home.png" width="240" alt="Home in Thai">
</p>

Home in Burmese, Bahasa Indonesia, Tagalog and Thai. All four are machine translated and unreviewed.

### 3.9 Floating shield overlay

The overlay snapshot PNGs (`modules/shield-module/android/build/shield-snapshots/`) are generated by a Gradle test and are not in this checkout, so no overlay image is embedded. The overlay states are described in `modules/shield-module/README.md`: idle, checking, safe, careful, danger and error, each with a pill that expands to a sheet. The only overlay images in the repo are mockup crops (`pitch/img/shield.png`, `pitch/img/spot.png`) and are not shown here.

### 3.10 Logo concepts

<p>
<img src="../assets/brand/concepts/sheet.png" width="480" alt="Logo concept sheet">
</p>

The team compared several logo concepts. The pin-shield mark was chosen and now appears in the header, onboarding and loader (git log: "feat: replace shield-check icon with pin-shield mark and lockups").

## 4. How it works

### 4.1 User flows

| Flow | Steps | Source |
| --- | --- | --- |
| Check text, link or screenshot | Open Check, paste or upload, pick the report language, tap check. The loader runs six stages. The report opens. | `CLAUDE.md`, `pitch/video-script.md` |
| Floating shield (Android) | Switch on the shield on Home. The app asks for notifications, then screen capture. A bubble floats over other apps. One tap captures the screen and posts one JPEG to `/v1/check`. A pill shows the verdict and expands to a sheet. "Full report" opens `saferoute://report/<id>`. | `modules/shield-module/README.md`, `CLAUDE.md` |
| Share to SafeRoute (Android) | Share text or an image from another app into SafeRoute. It opens Check with the draft. | `CLAUDE.md` (`useSharedDraft.android.ts`) |
| Report a scam | From Get help, fill the form. The report becomes a confirmed signal with weight 1. | `docs/intel-design.md` |
| Feedback on a verdict | Mark the verdict right or wrong, and name the right type. A wrong risky verdict counts 0.25. A missed scam counts as confirmed. | `docs/intel-design.md` |
| Warn contacts | On a risky result, send a warning to trusted contacts by SMS. | `src/screens/ContactsScreen.tsx` (inferred from screen name; not verified) |
| Listen | Local text-to-speech when the device has the voice, otherwise Gemini speech from `/v1/speak`. This is how Burmese works on phones with no Burmese voice. | `docs/architecture.md` |

### 4.2 Backend pipeline

One service, one endpoint `POST /v1/check`. Six stages (`docs/architecture.md`):

| Stage | What it does | Google service |
| --- | --- | --- |
| 1. Capture | App sends text, link or JPEG/PNG with the language | Cloud Run endpoint (target; see section 7) |
| 2. Extract | One multimodal call reads text and image (OCR included). Returns 7 flag families, scam type, URLs, entities, a draft verdict and a redacted template as JSON | Gemini API (`@google/genai`), Vertex AI with the same SDK when `GOOGLE_GENAI_USE_VERTEXAI=true` |
| 3. Detect | Checks named companies, agencies, phones and pay claims against the live web. Returns source pages | Gemini with Grounding with Google Search |
| 4. Correlate | Checks each URL for known threats and domain age. Also looks up the shared network | Web Risk API, RDAP (rdap.org) |
| 5. Score | Rules engine adds weighted flag families, link results and domain age. The model cannot raise a verdict that has no evidence | none (deterministic code) |
| 6. Explain | Title, summary and actions in the user's language. `/v1/speak` makes the audio | Gemini text-to-speech (`gemini-3.8-flash-tts`) |

Rules:

- Detect and Correlate run in parallel. The request has a 15 s budget. A stage that fails returns "unknown" and the verdict still comes out (`docs/architecture.md`).
- Weights: payment route 1.6, too good 1.4, link risk 1.4, trafficking 2.5, known bad 3.0, identity 0.8, pressure 0.6. A Web Risk hit or a high trafficking flag forces danger. Grounded findings cap at medium (`docs/architecture.md`).
- A language guard (`server/src/language-guard.ts`) rewrites certainty phrases in en, id, tl and my. With three or more phrases it asks the model once more.
- Rate limits: 20 per hour anonymous and 60 per hour signed in, per uid, plus a per-IP limit. Counters live in memory per instance (`server/CLAUDE.md`).

```mermaid
flowchart LR
  A[App or web] -->|POST /v1/check| B[API]
  B --> C[Extract: Gemini]
  C --> D[Detect: Search grounding]
  C --> E[Correlate: Web Risk, RDAP, network]
  D --> F[Score: rules engine]
  E --> F
  F --> G[Explain]
  G -->|report| A
  A -->|POST /v1/speak| H[Gemini TTS]
  F -.risky only.-> I[(Redacted signal in Firestore)]
  A -->|POST /v1/feedback| I
```

### 4.3 Intelligence network

Every careful or danger check can leave one anonymous signal (`docs/intel-design.md`).

- Signals feed counters per scam type, indicator, domain and campaign, per country.
- A type, indicator, domain or campaign surfaces only with at least k=3 reports in the window.
- A match against the network becomes a `known_bad` flag in the next check. Severity grows with reports in 30 days: 3 to 5 low, 6 to 14 medium, 15 or more high.
- Campaigns group similar redacted templates with a MinHash over character 4-grams (Jaccard 0.5).
- `GET /v1/insights` powers the Scam radar.
- Feedback adjusts weights: confirmed reports count 1, a risky verdict marked wrong counts 0.25.

### 4.4 Privacy model

| Rule | Detail | Source |
| --- | --- | --- |
| Not stored | Image, raw text, uid, IP, flag evidence, victim PII, clear phone, handle or account | `docs/intel-design.md` |
| Two-pass redaction | Gemini writes a typed-placeholder template inside the extract call. A regex pass with validators (Luhn, Thai ID, NIK, mod 97) runs over it. Fails closed | `docs/intel-design.md` |
| Indicators | Domains in clear. Phones, handles and accounts as HMAC-SHA256 with a server pepper (128 bits). Without the pepper the layer is off | `docs/intel-design.md` |
| Reporter key | `HMAC(pepper, uid + day)`. Changes daily, so it cannot be linked across days | `docs/intel-design.md` |
| Retention | Signals 90 days, check links 7 days | `docs/intel-design.md` |
| Opt out | Settings, "share signals". With it off nothing is written | `docs/intel-design.md` |
| Client access | `firestore.rules` denies all client access to `intel_*`. User data (history, contacts) is per-user and only syncs after sign-in | `docs/intel-design.md`, `README.md` |
| Logs | One JSON line per event. No request text or images | `server/CLAUDE.md` |
| Account deletion | In Settings and at `/delete-account` | `README.md` |

Limit: Firestore TTL needs billing, so expiry runs from a sweep timer and `npm run intel:sweep` instead (`docs/intel-design.md`).

## 5. Quality and numbers

All model runs use `gemini-3.5-flash-lite`. The harnesses call the real pipeline.

### 5.1 Text eval

Source: `bench/results/2026-10-14-gemini-3.5-flash-lite-text-eval.json`, summarised in `bench/RESULTS.md`.

| Language | Correct |
| --- | --- |
| en | 10/10 |
| id | 8/8 |
| my | 3/3 |
| tl | 6/6 |
| **Total** | **27/27** |

| Metric | Value | Source |
| --- | --- | --- |
| Latency p50 | 3.09 s (3090 ms) | `bench/results/...text-eval.json` |
| Latency p95 | 4.81 s (4810 ms) | `bench/results/...text-eval.json` |

The lead quotes p50 about 3.0 s and p95 about 4.6 s **(lead)**. The committed file shows 3.1 and 4.8. Use the committed numbers unless a newer run is added.

The set includes hard negatives and subtle scams (`server/eval/cases.ts`, 27 ids counted).

### 5.2 Screenshot bench

Source: `bench/results/2026-10-14-gemini-3.5-flash-lite-synthetic.json` and `bench/RESULTS.md`. This is a harness check on 6 synthetic images, not an accuracy claim.

| Metric | Value |
| --- | --- |
| Risky vs safe accuracy | 6/6 (100%) |
| Exact 3-class accuracy | 83.3% (the one "careful" case came back "danger") |
| False positives on safe cases | 0 of 2 |
| Missed scams | 0 of 4 |
| Scam type accuracy | 100% |
| Latency p50 / p95 | 4.3 s / 5.9 s |
| PII surviving in model text | 0 |
| Request errors | 0 |

The real benchmark on team screenshots is pending: `README.md` shows "pending: screenshots being collected".

### 5.3 Model choice

`gemini-3.5-flash-lite` was chosen over `gemini-3.8-flash`. It was about 2x faster with no accuracy loss on the eval **(lead)**. The deck repeats the 2x claim (`pitch/deck.md`, slide 10). The side-by-side numbers are not in a committed result file, so the comparison cannot be re-checked from the repo.

### 5.4 Likelihood language

- Certainty phrases in responses went from 41% to 0% after the prompt change plus the guard **(lead)**. The metric exists in code (`bench/lib.ts`, `bench/report.ts`: "responses with certainty wording before and after guard"). No committed result file carries the 41% figure.
- The guard has its own tests (`server/test/language-guard.test.ts`).

### 5.5 Redaction

- Redaction eval: 100% structured-PII recall with regex plus Gemini on 98 items **(lead)**. The 98 PII items are confirmed in `server/eval/pii-set.ts` (45 cases, 12 marked hard). The 100% result itself is not in a committed file.
- Caveat from the lead: the hard set was tuned on twice, so 100% is optimistic.
- Names are excluded from the "structured" recall (`server/eval/redaction.ts` reports names apart).

### 5.6 Tests

Counts come from a static search for `it(` and `test(` in test files. The suites were not run for this report, so they are counts of cases, not of passes.

| Suite | Files | Cases | Source |
| --- | --- | --- | --- |
| Server (vitest) | 17 | 159 | `server/test/` |
| App (jest) | 14 | 120 | `src/**/*.test.ts*` |
| Firestore rules | 1 | 5 | `firestore-tests/rules.test.mjs` |
| Shield module (Robolectric) | 2 | 17 | `modules/shield-module/android/src/test` |

The deck says "49 server tests" and a "19-case eval ... p50 4.4 s" (`pitch/deck.md`, slide 10). Both are out of date. See risks.

### 5.7 Cost

An estimate, not a measurement: about USD 0.006 per check without grounding and about USD 0.04 with it (`pitch/deck.md`, slide 10 and speaker notes). The TTS price for the deployed model is unconfirmed there.

## 6. Real, mock and untested

| Area | Status | Notes |
| --- | --- | --- |
| Text, link, screenshot check | Real | `/healthz` shows `mock:false` (measured 15 Oct) |
| Extraction, grounding, scoring | Real | Gemini plus rules engine |
| Spoken warning | Real | Gemini TTS through `/v1/speak` |
| Web Risk link check | Failing | Returns 403 until billing is linked, probably because of billing **(lead)** |
| Domain age (RDAP) | Real | Needs a User-Agent header, set in code |
| Scam radar and network lookup | Real, thin data | Seed data can be purged (`intel:purge-seed`). Live volume is tiny **(inferred)** |
| Feedback and reports | Real | `POST /v1/feedback` |
| Anonymous, email, Google sign-in | Real | Live **(lead)** |
| Facebook sign-in | Built, off | Waits for a Meta App ID **(lead)** |
| History and contacts sync | Real when signed in | Firestore, per-user rules |
| Hotlines | Real data, partly unconfirmed | Sourced with URLs in `src/data/hotlines.ts`. The Myanmar anti-trafficking line still needs confirming **(lead)** |
| UI translations (en, my, id, tl, th) | Machine translated | None reviewed (`docs/i18n.md`) |
| Thai verdicts | Not supported | Thai UI sends `en` (`docs/i18n.md`) |
| Family Guardian | Mock / design only | Screens exist, no backend (`pitch/deck.md`) |
| Offline demo API | Mock, dev builds only | `src/api/mock.ts`; shows an "Offline demo mode" banner (`CLAUDE.md`) |
| Floating shield | Partly device-tested | The owner tried an early build and said it "works really well". A drag bug was fixed but is unverified **(lead)** |
| Google sign-in on Android | Not device-tested by the team **(lead)** | |
| Share to SafeRoute | Not device-tested by the team **(lead)** | |
| Contact picker and SMS | Not device-tested by the team **(lead)** | |
| Message Guard (notification scanning) | In progress, not merged | Branch `feat/notifguard`, 3 commits ahead of `feat/production` |
| Latency work (overlap, SSE, caches) | In progress, not merged | Branch `feat/perf`, has local unpushed commits and uncommitted edits |
| Overlay in Burmese, Thai, Bahasa, Tagalog | Not translated | Kotlin strings are English (`docs/i18n.md`) |

## 7. Deployment and infrastructure

### 7.1 Today

Measured on 15 October 2026:

| Check | Result |
| --- | --- |
| `https://saferoute-aibc.web.app/` | HTTP 200 |
| `https://saferoute-aibc.web.app/saferoute.apk` | HTTP 200, type `application/vnd.android.package-archive` |
| `/config.json` | `{ "apiUrl": "https://laundry-pierre-bent-repairs.trycloudflare.com" }` |
| `<apiUrl>/healthz` | `{"ok":true,"model":"gemini-3.5-flash-lite","mock":false}` |
| Latest CI on `feat/production` | Server workflow success (PR run); Android workflow success, 21 min 31 s, 14 Oct 18:14 UTC |
| Repository `minthein128/scamshield` | PRIVATE |
| PR #1 "SafeRoute hackathon release" | OPEN, draft, `feat/production` into `main` |

The APK URL redirects through a rewrite to `dist/dl/saferoute.pkg` because Firebase Spark rejects `.apk` uploads (`docs/setup-gcp.md`). The release APK is signed with the debug key unless keystore secrets exist (`docs/setup-gcp.md`, `docs/release-keystore.md`).

### 7.2 Pieces

| Piece | State | Source |
| --- | --- | --- |
| Web demo on Firebase Hosting | Live, Spark plan | `docs/setup-gcp.md` |
| APK build and Firebase App Distribution | Every merge to `feat/production` builds a signed APK versioned 1.0.<run>, sent to group `dev-testers` (3 testers) | **(lead)**, `docs/setup-gcp.md` |
| API | Build machine behind a Cloudflare quick tunnel | **(lead)**, `docs/setup-gcp.md` |
| Cloud Run, Cloud Build, Artifact Registry, Secret Manager | Blocked until billing is linked | `docs/setup-gcp.md` |
| Deploy script | `scripts/deploy-cloudrun.sh`, idempotent, ready | `docs/setup-gcp.md` |
| Service accounts, Workload Identity pool | Created | `docs/setup-gcp.md` |
| Runtime URL | App reads `/config.json` (3 s), then a cached value, then a baked URL | `CLAUDE.md` |

### 7.3 How the tunnel makes it fragile

```mermaid
flowchart LR
  P[Phone or browser] -->|reads| H[Firebase Hosting config.json]
  P -->|HTTPS| T[Cloudflare quick tunnel]
  T --> S[API on build machine]
  W[Watchdog timer, 1 min] -->|restart on failure| S
  S -->|new URL| H
```

- A quick tunnel gets a new URL at every restart. The restart script republishes `config.json` with a Firebase deploy (`docs/setup-gcp.md`).
- Between a restart and the republish, apps fail or read a stale URL. The cached URL can also be stale **(inferred)**.
- If the build machine reboots, loses network or runs out of memory, the whole API is down. A watchdog runs every minute, so a gap of about a minute or more is expected **(inferred)**.
- The floating shield needs `https://`. A baked URL in an old APK points at a dead tunnel unless the shield reads `config.json` as well **(not verified)**.
- Quick tunnels have no uptime guarantee. A judge test during a restart will fail.
- One network refused `saferoute-aibc.web.app` **(lead)**. A custom domain would help.
- Per-instance memory rate limits and caches reset on each restart.

## 8. Hackathon readiness

Requirement list from the lead and the deck. The official rules text was not read for this report.

### 8.1 Requirements

| Requirement | Status | Detail |
| --- | --- | --- |
| Deployed, working link | Done | Web demo and APK respond. Backend depends on the tunnel (section 7.3) |
| Public GitHub repo | Blocked | Repo is PRIVATE. Only the owner can change it. README, LICENSE (MIT) and benchmarks are ready |
| Demo video under 3 minutes | Not started | `pitch/video-script.md` is ready (about 2:20 spoken). `media/demo.mp4` does not exist. README links to it |
| PDF deck | Partial | `pitch/deck.pdf` and `media/SafeRoute-deck.pdf` exist. Team slide has `[NAME]` placeholders. Slide 10 numbers are stale. README says the deck is `media/SafeRoute-deck.pdf` |
| Uses a Google AI model | Done | Gemini for extraction, grounding and speech |
| Deployed on Google Cloud (Cloud Run or Firebase) | Partial | Web demo is on Firebase Hosting. Cloud Run is blocked by billing |
| Team names | Open | README says "Team: TBD" |

### 8.2 Judging criteria

Weights from `pitch/deck.md`, slide 2. Self-assessment, so treat it as opinion.

| Criterion | Weight | Where we are |
| --- | --- | --- |
| Technical merit and Gen AI | 40% | Strong. Multimodal extraction, search grounding, rules guard, speech, redaction, intelligence network, 27/27 eval. Weak spots: Web Risk 403, tunnel, thin benchmark on real screenshots |
| Problem alignment and impact | 25% | Strong story: scam-compound recruitment in SEA, hotlines, Burmese. Weak spot: no pilot data, Family Guardian is design only |
| Innovation and creativity | 25% | Good. Floating shield, likelihood language guard, privacy-first shared radar. Message Guard would add to this but is not merged |
| UX and solution design | 10% | Good. Five UI languages, empty states, 48 px targets. Weak spot: translations unreviewed |

## 9. Risks and known limitations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Tunnel or build machine fails during judging | App returns errors | Link billing and deploy to Cloud Run. Until then, keep the watchdog running and test before submitting |
| Billing not linked by the deadline | Cloud Run rule unmet, Web Risk 403 | Link billing today. Fallback: state Firebase Hosting as the Google Cloud deployment and remove Web Risk from the narration (`pitch/README.md` already warns about this) |
| Repo stays private | Disqualification risk **(inferred)** | Owner makes it public |
| Android features untested on a device | Bugs show up in the video | One test pass on a real phone before recording |
| Drag bug fix unverified | Overlay can misbehave | Test on device |
| Machine-translated UI | Wrong or odd wording, harm in a safety app | Native review, Burmese first |
| Thai users get English verdicts | Gap for one UI language | Say so in the deck, or add `th` to the server |
| Hotline accuracy | A wrong number is a safety issue | Confirm the Myanmar line against a source |
| Small eval sets | 27 text cases and 6 synthetic screenshots do not prove real-world accuracy | Say so. Add team screenshots (pending) |
| Redaction eval tuned on its hard set | 100% recall is optimistic | Report it as such |
| Stale numbers in the deck | Judges see conflicting figures | Refresh slide 10 (49 tests, 19-case eval, 4.4 s) |
| Model is a language model | Can be wrong; the app cannot know a message is a scam | Likelihood wording, rules guard, hotlines. Already built |
| Debug-key signed APK on some builds | Sideload only, no Play Store | Acceptable for a hackathon |
| Abuse and poisoning of the radar | False signals | k=3, daily dedupe, caps (`docs/intel-design.md`). Not tested at scale |
| Firebase Spark limits | 20k writes per day (about 10 writes per signal) | Fine for a demo (`docs/intel-design.md`) |
| In-progress branches drift from production | Merge conflicts late | Merge or park them by Friday |

Other limits:

- Web has no floating shield and no share intent. It shows an Android-only note (`CLAUDE.md`).
- On web, the app UI is always English until the user picks a language (`docs/i18n.md`).
- Demo screens under "See how scams look" and the overlay copy stay English (`docs/i18n.md`).
- Family Guardian is not built.

## 10. What is next

### 10.1 Before submission (by 18 October)

In priority order:

1. **Link billing** to `saferoute-aibc`, run `scripts/deploy-cloudrun.sh`, check `/healthz`, confirm Web Risk stops returning 403. Then re-run the text eval against Cloud Run.
2. **Make the repo public.** Only the owner can.
3. **Real-phone test pass:** floating shield (including the drag fix), Google sign-in, share-to-SafeRoute, contact picker and SMS.
4. **Merge decisions:** decide if Message Guard and the latency work go in. If they do, merge, rebuild and test on a device. If not, say they are future work.
5. **Record the video** under 3 minutes from `pitch/video-script.md`. Check `/healthz` shows `mock:false` first. Add the file as `media/demo.mp4`.
6. **Fix the deck:** team names and roles, deployed URL and contact email, slide 10 numbers (use 27/27, p50 3.1 s, p95 4.8 s and the current test count), the Family Guardian wording. Re-render the PDF and copy to `media/`.
7. **Send benchmark screenshots** and run the real screenshot bench. Update `README.md` and `bench/RESULTS.md`.
8. **Confirm the Myanmar anti-trafficking hotline** and fix `src/data/hotlines.ts` if needed.
9. **Native-speaker review of translations,** Burmese first. Even one reviewed file is better than none.
10. **Meta App ID** to switch on Facebook sign-in (optional).
11. **Custom domain** (optional) for networks that block `web.app`.
12. Update `README.md`: team line, benchmark table, demo video link. Align p50 and p95 with one source.

### 10.2 After submission

- Move the API permanently to Cloud Run with min instances, and a shared store for rate limits.
- Add `th` to the backend so Thai users read verdicts in Thai.
- Native overlay strings in Android resource files for all five languages.
- Build Family Guardian for real: check-in reminders, consented sharing.
- Pilot with a migrant-worker NGO and measure accuracy on labelled real reports (`pitch/deck.md`, Roadmap).
- More languages: Khmer, Lao, Vietnamese (`pitch/deck.md`, Roadmap).
- Measure real cost per check from Cloud Billing and replace the estimate.

## Appendix: timeline

Source: `git log origin/feat/production` (168 commits, by author date).

| Date | Work |
| --- | --- |
| 11 Oct 2026 | Initial commit, "UI Complete" |
| 14 Oct 2026 (most of the history) | "Completely Working version"; CI and GCP setup; server scaffold, extraction, Web Risk and RDAP, scoring; grounding and TTS; app screens and API client; 27-case eval; shield overlay and screen capture; Hosting, APK and App Distribution; network intelligence and redaction; accounts, onboarding, contacts, radar, Google sign-in; brand pass and logo; benchmark harness; feedback and reports; hotlines; Learn redesign; likelihood language and guard; i18n in five languages; overlay drag fix |

The two earlier dates are the only ones in the log. Almost all work was merged on 14 October **(inferred from author dates, which may not match when each feature was built)**.

Last commit on `feat/production`: 14 Oct 2026 18:14 UTC, "merge fix/overlay-drag card follows the bubble".
