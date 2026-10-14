# SafeRoute server (agent guide)

Hono + TypeScript service implementing `docs/api-contract.md`. Pipeline: Extract (Gemini) -> Correlate (Web Risk + RDAP) -> Score (rules) -> Explain.

## Commands (run in `server/`, use `NODE_OPTIONS=--max-old-space-size=1024`)

- `npm run check`: typecheck + biome lint + vitest. Run it before every commit. No network needed.
- `npm run format`: apply biome fixes.
- `MOCK=1 npm run dev`: server on :8080 with canned responses. Mock is also on when no credentials are set.
- `npm run smoke`: one real Gemini + Web Risk + RDAP call. Needs `GEMINI_API_KEY` (or Vertex env). Exits 2 if unconfigured.
- `npm run eval`: 27 labelled cases (en/my/id/tl) through the real pipeline, sequential, prints a verdict table, accuracy and p50/p95. Needs a key; never part of `npm test`. Env: `GEMINI_MODEL`, `EVAL_ONLY=id,id`, `EVAL_DELAY_MS`, `EVAL_JSON=path`.
- `./deploy.sh`: needs `GOOGLE_CLOUD_PROJECT` and an authenticated gcloud. Deploys with `gcloud run deploy --source`.

## Layout

- `src/score.ts`: pure rules engine. Weights are constants at the top. Change them with a test in `test/score.test.ts`.
- `src/extract.ts`, `src/prompt.ts`: Gemini call, JSON schema, system prompt. The SDK client is injected so tests mock it.
- `src/correlate.ts`: Web Risk (API key or ADC) and RDAP. Failures return "unknown", never throw.
- `src/ground.ts`: Search-grounded verification. `src/speak.ts`: Gemini TTS to WAV. Both degrade without throwing (speak returns 502 `upstream`).
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
