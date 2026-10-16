# SafeRoute server (agent guide)

Hono + TypeScript service implementing `docs/api-contract.md`. Pipeline: Extract (Gemini) -> Correlate (Web Risk + RDAP) -> Score (rules) -> Explain.

## Commands (run in `server/`, use `NODE_OPTIONS=--max-old-space-size=1024`)

- `npm run check`: typecheck + biome lint + vitest. Run it before every commit. No network needed.
- `npm run format`: apply biome fixes.
- `MOCK=1 npm run dev`: server on :8080 with canned responses. Mock is also on when no credentials are set.
- `npm run smoke`: one real Gemini + Web Risk + RDAP call. Needs `GEMINI_API_KEY` (or Vertex env). Exits 2 if unconfigured.
- `npm run eval`: 31 labelled cases (en/my/id/tl/th) through the real pipeline, sequential, prints a verdict table, accuracy and p50/p95. Needs a key; never part of `npm test`. Env: `GEMINI_MODEL`, `EVAL_ONLY=id,id`, `EVAL_DELAY_MS`, `EVAL_JSON=path`.
- `npm run eval:job`: 10 fictional ad and chat pairs through live extraction, grounding and assessment. Targets: no legit pair at `pause`, no scam pair at `lower`, no banned phrases. Same env as `eval`.
- `npm run bench`: screenshot benchmark against a running server (`--api`) or `--inprocess`. Usage, labels format and privacy rules are in `../bench/README.md`. Never commit real screenshots.
- `../scripts/deploy-cloudrun.sh`: deploys to Cloud Run (see `../docs/setup-gcp.md`).

## Layout

- `src/score.ts`: pure rules engine. Weights are constants at the top. Change them with a test in `test/score.test.ts`.
- `src/extract.ts`, `src/prompt.ts`: Gemini call, JSON schema, system prompt. The SDK client is injected so tests mock it.
- `src/correlate.ts`: Web Risk (API key or ADC), Safe Browsing v4 `threatMatches:find` fallback (`SAFE_BROWSING_API_KEY`, used when Web Risk fails; a 403 pauses Web Risk for 10 min; sends only the URL) and RDAP. Failures return "unknown" (shown as "Not checked", and the summary says the link is not verified), never throw. The `saferoute-aibc` project has no billing, so Web Risk is disabled there and the Safe Browsing key is the live source.
- `src/ground.ts`: Search-grounded verification. `src/speak.ts`: Gemini TTS to WAV. Both degrade without throwing (speak returns 502 `upstream`).
- `src/auth.ts`: optional Firebase ID token check (`TokenVerifier`, injected in tests). A bad token counts as no token. `src/app.ts` applies 20/h anonymous and 60/h signed-in per uid on `/v1/check`, on top of the per-IP limit. Env: `FIREBASE_PROJECT_ID`, `ANON_LIMIT_PER_HOUR`, `USER_LIMIT_PER_HOUR`. Counters are in memory per instance.
- `src/data/hotlines.generated.ts`: generated from `../src/data` by `pnpm sync:hotlines` in the repo root. Never edit it. A test fails when it is stale.
- `src/language-guard.ts`: curated certainty-phrase patterns (en/id/tl/my/th; Thai uses lookbehinds, not \b) that rewrite or trigger one re-ask; the pipeline reports stats via `onLanguage` and logs `certainty_rewrite`. User-facing text must speak in likelihood: add a pattern and a test when you find a new certainty phrase.
- `src/feedback/`: `POST /v1/feedback`, check-id to signal link (7 days), tally, `npm run feedback:report` and `feedback:export` (writes the gitignored `eval/candidates.json`). Weights live in `src/intel/weights.ts`. `INTEL_COLLECTION_PREFIX=test_` sends a manual run to sandbox collections (delete them afterwards).
- `src/live.ts`, `src/live-prompt.ts`, `src/live-mock.ts`: `/v1/live` WebSocket relay to the Gemini Live API (contract in `../docs/live-audio-contract.md`). The prompt builder redacts the report and lists verified hotlines. Never log audio or transcripts. `npm run live:smoke` drives a running server with spoken questions and judges the replies (`LIVE_SMOKE_API`, `--only=id`). Companion mode (the shield bubble) adds the `recheck_screen` tool and `context` frames. Env: `LIVE_MODEL`, `LIVE_VOICE` (female, default Sulafat), `LIVE_MAX_MS`, `LIVE_COMPANION_MAX_MS`, `LIVE_MAX_CONCURRENT`, `LIVE_LANGUAGES` (default `en,my,th,id,tl`; the model answers in the listener's language from this list, other start languages get `unsupported_language`). Voices are female, so prompts ask for female speaker forms and `findMaleForms` counts misses (`gender_form_hit`).
- `src/admin/`: admin console backend (see `../docs/admin.md`). `schema.ts` zod shapes, `store.ts` Firestore and in-memory stores plus the bundled fallback, `changes.ts` draft application, `auth.ts` admin middleware, `routes.ts` and `ai-routes.ts` under `/v1/admin`, `ai.ts` and `sources.ts` AI assist, `published.ts` public `/v1/config/*` and the 60 s cache. `npm run config:seed-hotlines` and `npm run admin:grant -- <email> <admin|editor>` use real Firestore. AI code must never get a store handle. `explain.ts` reads hotlines through `setHotlineSource`.
- `src/job/`: Job Shield. `extract.ts` makes one Gemini call for ad and chat (rules in `systemInstruction`), drops quotes not found in the source, keeps extractions in memory for 10 minutes and returns 502 on any model or JSON failure (never invented facts). `rules.ts` holds the conflict rules and single-source signals; a border-town route is context and scores only with a non-geographic signal. Strong conflicts (`STRONG_CONFLICTS`: fee, passport photo or hold, contract, tourist visa) floor the job score at 70 in `scoreJob`; `score.ts` is not changed. `parse.ts` reads amounts (Burmese and Thai digits), fees, salaries and employer names. `text.ts` holds every user-facing job string in en/my/id/tl/th; job output goes through `guardJobText` (no "safe", "verified job", "scam confirmed", "no risk", "detected"). `assess.ts` merges user edits over the stored extraction and asks grounding for `companyFound`; company found never changes the score.
- `src/pipeline.ts`: wires the stages. `src/app.ts`: HTTP, limits, errors. `src/mock.ts`: offline stubs.

## Rules

- Tests never hit the network. Inject `fetchFn` or the SDK client.
- RDAP rejects requests without a User-Agent (403). Keep the header.
- Errors use `ApiError(status, code, message)` and the contract error body.
- Logs are one JSON object per line via `log()`. Do not log request text or images.
- Change the API shape only together with `docs/api-contract.md`.
- Verified live: extraction schema, Search grounding, and `gemini-3.8-flash-tts` through `generateContent` with AUDIO modality (returns 24 kHz PCM, wrapped to WAV). Web Risk rejects API keys: it needs ADC.
- Default model is `gemini-3.5-flash-lite` (measured: see README). `THINKING_LEVEL` defaults to LOW; set it empty to use the model default.
- Grounding must not report brand-impersonation advisories as `known_bad`; the eval case `legit-sms-en` guards this.
- Grounding cannot share a call with `responseSchema`, so `ground.ts` asks for JSON in plain text and parses leniently.
- Grounding searches only when the user turn is a plain question. A "reply with ONLY JSON" rule, or the rules in the user turn, make `gemini-3.5-flash-lite` answer from memory with no search and no sources. Keep the rules in `systemInstruction` and let the model write a short answer before the JSON.
