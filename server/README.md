# SafeRoute server

Backend for the SafeRoute Android app. Implements `docs/api-contract.md` on Node 22, Hono and `@google/genai`. Runs on Cloud Run.

Default model: `gemini-3.5-flash-lite` (set `GEMINI_MODEL` to change it, for example `gemini-3.8-flash`, which was about 2x slower with no accuracy gain in our eval).

## Model choice (measured 2026-10-14, first 19 eval cases, grounding on, thinking LOW)

| Model | Accuracy | p50 | p95 | Notes |
| --- | --- | --- | --- | --- |
| gemini-3.5-flash-lite | 19/19 (final prompts) | 4.4 s | 7.5 s | default |
| gemini-3.8-flash | 16/19 (earlier prompts) | 9.4 s | 14.5 s | grounding and extraction often hit the 15 s budget |

Run `npm run eval` to repeat the measurement. `/v1/speak` uses `gemini-3.8-flash-tts` and takes about 5-8 s for a sentence.

## Pipeline

1. Extract: one Gemini call (text plus optional image) with a JSON response schema. It returns flags in 7 families, scam type, a draft verdict, summary, spoken warning and URLs, in `en`, `id`, `tl` or `my`.
2. Detect: when the input names a company, agency, phone number or domain, a second Gemini call with the Google Search grounding tool checks that the entity exists and is licensed, whether scam reports exist, and whether the salary is plausible. Findings join the flags (capped at medium severity) and the source pages are returned as `sources`. Skipped when nothing is named.
3. Correlate (runs in parallel with Detect): each URL goes to Google Web Risk (`uris.search`: MALWARE, SOCIAL_ENGINEERING, UNWANTED_SOFTWARE) and to RDAP (`rdap.org`) for domain age. Both have short timeouts and return `unknown` on failure.
4. Score: a deterministic rules engine (`src/score.ts`).
5. Explain: title, summary, spoken warning, actions in the requested language.

## Verdict rules

Each flag family counts once, at its strongest severity. Points = sum of family weight x severity multiplier (low 0.5, medium 1, high 1.5), minus 1.0 if the sender was unsolicited and any flag exists. Score = points x 70/3, clamped to 0-100. `safe` < 35 <= `careful` < 70 <= `danger`.

| Family | Weight |
| --- | --- |
| too_good | 1.4 |
| pressure | 0.6 |
| payment_route | 1.6 |
| identity | 0.8 |
| link_risk | 1.4 |
| known_bad | 3.0 |
| trafficking | 2.5 |

Link results add flags: a Web Risk hit adds `known_bad` (high); a domain under 180 days old adds `link_risk` (medium, high under 30 days). Overrides: a Web Risk hit forces score >= 90; a high `trafficking` flag forces score >= 80; one family alone cannot reach `danger` unless it is `known_bad` or high `trafficking`. The model cannot raise a result with no flags above `safe`.

## Endpoints

- `POST /v1/check`: see the contract. 400 `bad_request`, 413 `too_large` (body over 6 MB, image over ~4 MB), 429 `rate_limited`, 502 `upstream`.
- `POST /v1/speak`: `{text, language}` returns a base64 WAV from Gemini TTS (`TTS_MODEL`, default `gemini-3.8-flash-tts`; unverified, see CLAUDE.md).
- `GET /healthz`: `{ ok, model, mock }`.
- `GET /config.json`: `{ apiUrl }` from `PUBLIC_API_URL` (default `https://saferoute-api.akkhayar.com`), `Cache-Control: no-cache`. The app reads it as its first config source.
- `GET /download`: small HTML install page (English and Burmese, no external assets) for networks that block `*.web.app`.
- `GET|HEAD /download/saferoute.apk`: streams the file at `APK_PATH` as `application/vnd.android.package-archive` with `Content-Length`, `Cache-Control: no-cache` and an mtime/size `ETag`. 404 when `APK_PATH` is unset or the file is missing. Outside the check rate limit; own limit of `APK_LIMIT_PER_HOUR` per IP.

## Environment

| Variable | Meaning | Default |
| --- | --- | --- |
| `PORT` | listen port (Cloud Run sets it) | 8080 |
| `GEMINI_MODEL` | model id | gemini-3.5-flash-lite |
| `GOOGLE_GENAI_USE_VERTEXAI` | `true` for Vertex AI with the service account | unset |
| `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` | Vertex project and region | -, us-central1 |
| `GEMINI_API_KEY` | Gemini API key mode | unset |
| `WEB_RISK_API_KEY` | Web Risk key; if unset the service account (ADC) is used | unset |
| `MOCK` | `1` forces canned responses; also on when no credentials exist | unset |
| `CORS_ORIGINS` | comma list or `*` | `*` |
| `RATE_LIMIT_PER_MIN` | per-IP limit (in memory, per instance) | 30 |
| `MAX_BODY_BYTES` | request size cap | 6291456 |
| `UPSTREAM_TIMEOUT_MS`, `LINK_TIMEOUT_MS` | Gemini and link-check timeouts | 12000, 4000 |
| `REQUEST_BUDGET_MS` | total budget per check; Detect and Correlate stop early when it runs out | 15000 |
| `GROUNDING` | `0` disables the Google Search verification call | on |
| `THINKING_LEVEL` | MINIMAL, LOW, MEDIUM or HIGH; empty uses the model default | LOW |
| `TTS_MODEL`, `TTS_VOICE` | speech model and voice | gemini-3.8-flash-tts, Kore |
| `DEFAULT_HOTLINE` | call number when the destination is unknown (hotlines come from the shared data) | none |
| `FIREBASE_PROJECT_ID` | project for ID token verification | `saferoute-aibc` |
| `APK_PATH`, `APK_VERSION` | file served by `/download/saferoute.apk`; version shown on `/download` | unset |
| `APK_LIMIT_PER_HOUR` | APK downloads per IP per hour | 20 |
| `ANON_LIMIT_PER_HOUR`, `USER_LIMIT_PER_HOUR` | per-uid limits | 20, 60 |

## Local run

```
cd server
npm ci
MOCK=1 npm run dev
curl -s localhost:8080/v1/check -H 'content-type: application/json' \
  -d '{"kind":"job","text":"USD 1800, send passport, pickup at the border","language":"en"}'
GEMINI_API_KEY=... npm run dev     # real model
GEMINI_API_KEY=... npm run smoke   # one live end-to-end call
npm run check                      # typecheck + lint + tests
```

## Deploy to Cloud Run

Run `scripts/deploy-cloudrun.sh` from the repo root. Steps and prerequisites are in `docs/setup-gcp.md`.

APIs to enable: `aiplatform.googleapis.com`, `webrisk.googleapis.com`, `run.googleapis.com`, `cloudbuild.googleapis.com` (plus `artifactregistry.googleapis.com`).

Runtime service account roles: `roles/aiplatform.user` for Gemini on Vertex. Web Risk through ADC needs the Web Risk API enabled and works with the same account; if it returns 403, set `WEB_RISK_API_KEY` (restricted to the Web Risk API) instead. The deploying user needs `roles/run.admin`, `roles/cloudbuild.builds.editor`, `roles/iam.serviceAccountUser` on the runtime account.
