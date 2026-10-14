# SafeRoute server (agent guide)

Hono + TypeScript service implementing `docs/api-contract.md`. Pipeline: Extract (Gemini) -> Correlate (Web Risk + RDAP) -> Score (rules) -> Explain.

## Commands (run in `server/`, use `NODE_OPTIONS=--max-old-space-size=1024`)

- `npm run check`: typecheck + biome lint + vitest. Run it before every commit. No network needed.
- `npm run format`: apply biome fixes.
- `MOCK=1 npm run dev`: server on :8080 with canned responses. Mock is also on when no credentials are set.
- `npm run smoke`: one real Gemini + Web Risk + RDAP call. Needs `GEMINI_API_KEY` (or Vertex env). Exits 2 if unconfigured.
- `npm run eval`: 27 labelled cases (en/my/id/tl) through the real pipeline, sequential, prints a verdict table, accuracy and p50/p95. Needs a key; never part of `npm test`. Env: `GEMINI_MODEL`, `EVAL_ONLY=id,id`, `EVAL_DELAY_MS`, `EVAL_JSON=path`.
- `npm run bench`: screenshot benchmark against a running server (`--api`) or `--inprocess`. Usage, labels format and privacy rules are in `../bench/README.md`. Never commit real screenshots.
- `../scripts/deploy-cloudrun.sh`: deploys to Cloud Run (see `../docs/setup-gcp.md`).

## Layout

- `src/score.ts`: pure rules engine. Weights are constants at the top. Change them with a test in `test/score.test.ts`.
- `src/extract.ts`, `src/prompt.ts`: Gemini call, JSON schema, system prompt. The SDK client is injected so tests mock it.
- `src/correlate.ts`: Web Risk (API key or ADC) and RDAP. Failures return "unknown", never throw.
- `src/ground.ts`: Search-grounded verification. `src/speak.ts`: Gemini TTS to WAV. Both degrade without throwing (speak returns 502 `upstream`).
- `src/auth.ts`: optional Firebase ID token check (`TokenVerifier`, injected in tests). A bad token counts as no token. `src/app.ts` applies 20/h anonymous and 60/h signed-in per uid on `/v1/check`, on top of the per-IP limit. Env: `FIREBASE_PROJECT_ID`, `ANON_LIMIT_PER_HOUR`, `USER_LIMIT_PER_HOUR`. Counters are in memory per instance.
- `src/data/hotlines.generated.ts`: generated from `../src/data` by `pnpm sync:hotlines` in the repo root. Never edit it. A test fails when it is stale.
- `src/language-guard.ts`: curated certainty-phrase patterns (en/id/tl/my) that rewrite or trigger one re-ask; the pipeline reports stats via `onLanguage` and logs `certainty_rewrite`. User-facing text must speak in likelihood: add a pattern and a test when you find a new certainty phrase.
- `src/feedback/`: `POST /v1/feedback`, check-id to signal link (7 days), tally, `npm run feedback:report` and `feedback:export` (writes the gitignored `eval/candidates.json`). Weights live in `src/intel/weights.ts`. `INTEL_COLLECTION_PREFIX=test_` sends a manual run to sandbox collections (delete them afterwards).
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
