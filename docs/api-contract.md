# SafeRoute Check API contract (v1)

Base URL comes from `EXPO_PUBLIC_API_URL` in the app. All bodies are JSON.

## Authentication and limits

`Authorization: Bearer <Firebase ID token>` is optional on `/v1/check`. The server verifies it with firebase-admin for project `saferoute-aibc` and limits per uid:

| Caller | Limit |
| --- | --- |
| Anonymous Firebase user | 20 checks per hour |
| Signed-in user (email or Google) | 60 checks per hour |
| No token, or a token that fails verification | per-IP limit only (30 per minute by default) |

The per-IP limit always applies as a backstop. Requests without a token keep working, so the web demo and old APKs are unaffected. A uid over its limit gets `429 rate_limited` with a `Retry-After` header in seconds. `/v1/speak` is limited per IP only.

## POST /v1/check

Request:

```json
{
  "kind": "job" | "message" | "link" | "shop" | "agency" | "screen",
  "text": "optional pasted text (post, chat, SMS, listing)",
  "url": "optional link",
  "imageBase64": "optional JPEG/PNG screenshot, base64, max ~4 MB",
  "imageMimeType": "image/jpeg",
  "context": { "destination": "optional, e.g. Thailand", "route": "optional" },
  "language": "en" | "id" | "tl" | "my" | "th",
  "shareSignals": false
}
```

`context.home` is an optional home country. `reported`, `reportedType` and `lostMoney` are optional and belong to the report-a-scam flow. They are described below. `shareSignals: false` keeps this check out of the anonymous network signals (default true). See `docs/intel-design.md`.

At least one of `text`, `url`, `imageBase64` is required.

Response 200:

```json
{
  "id": "chk_...",
  "createdAt": "ISO-8601",
  "kind": "job",
  "verdict": "safe" | "careful" | "danger",
  "score": 0,
  "title": "Short verdict headline in the requested language",
  "summary": "1-2 sentence plain-language explanation",
  "spokenWarning": "Short sentence for text-to-speech",
  "scamType": "job_trafficking | romance_pig_butchering | parcel_phishing | fake_agency | marketplace_fraud | investment | other | none",
  "flags": [
    {
      "family": "too_good" | "pressure" | "payment_route" | "identity" | "link_risk" | "known_bad" | "trafficking",
      "label": "Short label",
      "evidence": "Quote or fact from the input that triggered it",
      "severity": "low" | "medium" | "high"
    }
  ],
  "linkChecks": [
    { "url": "...", "webRisk": "clean" | "malware" | "social_engineering" | "unwanted_software" | "unknown",
      "domainAgeDays": 12, "registrar": "optional" }
  ],
  "sources": [ { "title": "Page title", "url": "https://..." } ],
  "actions": [ { "label": "Call hotline", "type": "call" | "share" | "block" | "learn", "value": "optional" } ],
  "model": "gemini model id used",
  "network": { "seenCount": 14, "firstSeen": "2026-07-20", "campaign": { "name": "Mae Sot data-entry job", "seenThisWeek": 23 } }
}
```

`sources` lists the Google Search pages used to verify the named company, phone number, domain or salary. It is `[]` when the input names no entity or verification did not finish in time. Flags from verification use the families `known_bad`, `identity` and `too_good`.

`network` is present only when a phone, chat account, payment account or domain from the input was reported by at least 3 separate checks in the last 30 days, or the text matches an active campaign. `seenCount` is the 30 day count; the value itself is never returned. A match also adds a `known_bad` flag. `campaign` is optional.

`actions[].value` for `type: "call"` is a dial string from the shared hotline data (`src/data/hotlines.ts`): the destination country's anti-trafficking line, else its police line. It is absent when `context.destination` names no known country. The app resolves the number against the same data.

`score` is 0-100 (higher = riskier). `safe` < 35 <= `careful` < 70 <= `danger`.

Errors: `{ "error": { "code": "bad_request" | "not_found" | "too_large" | "upstream" | "rate_limited", "message": "..." } }` with 4xx/5xx.

### Report a scam (`reported: true`)

The same request, with these extra fields:

```json
{ "kind": "message", "text": "...", "language": "en", "reported": true, "reportedType": "parcel_phishing", "lostMoney": false }
```

`reportedType` is one of the scam types except `none`, and is required when `reported` is true. `lostMoney` is optional and only yes or no; there is no amount. The check runs through the same pipeline and returns the normal response (the verdict is the model's own). The server records a confirmed signal with the user's `reportedType`, even if the verdict was `safe`. The text still goes through both redaction passes first. `lostMoney` is counted in an admin-only tally and is not stored on the signal. A report counts once per reporter, day and counter like any signal, and `shareSignals: false` still keeps it out of the network. See the weighting in `docs/intel-design.md`.

## POST /v1/feedback

Verdict feedback for a check the user got. The same optional `Authorization: Bearer <Firebase ID token>` as `/v1/check`.

```json
{ "checkId": "chk_...", "correct": false, "actualVerdict": "safe" | "careful" | "danger", "actualScamType": "<scam type>" }
```

`correct` is required. `actualVerdict` and `actualScamType` are optional and are ignored when `correct` is true. Unknown keys are rejected, so there is no free text.

| Check verdict | Answer | `actualVerdict` / `actualScamType` | Effect |
| --- | --- | --- | --- |
| careful or danger | It was safe | `safe` | Signal weight drops to 0.25 |
| careful or danger | A different scam | a type other than the model's | Type count moves to the named type; indicators stay |
| safe | It was a scam | `danger` and/or a type | New confirmed signal at weight 1 |
| any | Right, or wrong with no detail | none | Tally only |

Response 200: `{ "ok": true }`. The first feedback for a check wins; later ones are accepted and ignored. Errors: `400 bad_request`, `404 not_found` when the check is older than 7 days, was made with `shareSignals: false`, or the server has no network storage, `429 rate_limited`. Limits: per uid 30 per hour (`FEEDBACK_LIMIT_PER_HOUR`), plus the per-IP limit. In mock mode the in-memory network answers the same way. When the server has no network storage at all it answers `{ "ok": true }` and keeps nothing.

## POST /v1/check?stream=1 (progressive result)

Same request, auth and limits as `/v1/check`. The reply is `text/event-stream` (Server-Sent Events). Request errors that are found before the stream starts (bad JSON, bad fields, 413, 429) are plain JSON errors with the usual status. A client that cannot read a stream sends the normal POST and gets one JSON reply.

| Event | Data | When |
| --- | --- | --- |
| `stage` | `{ "stage": "extract" \| "links" \| "ground" \| "intel", "status": "start" \| "done", "ms": 1520 }` | A stage starts or ends. `ms` is time since the request began. |
| `verdict` | A full check response (shape above) | Once, right after extraction and the rules. `sources` is `[]`, and `linkChecks` holds only the results that were ready. |
| `final` | The full check response | Once, after verification and the network lookup. Same `id` as `verdict`. |
| `error` | `{ "error": { "code", "message" } }` | The check failed after the stream started. The stream ends. |

Rules for clients:

- The `verdict` response is provisional. Later evidence only adds flags, so `final.score >= verdict.score` and the verdict never goes down. A `safe` verdict can rise to `careful` or `danger`.
- `final` always arrives unless `error` does. It is the response to store in history.
- Unknown events and unknown fields must be ignored.
- Time to `verdict` is the extraction time (about 1.5 to 2.5 s); `final` adds the verification time that is not already hidden by it.
- A repeat of an identical check inside 10 minutes is answered from the server cache. `verdict` and `final` then arrive together, with the same `id`.

Add `debug=1` to get a `timings` object in the response (`final` event or JSON body). It lists per-stage durations and token counts. It is off by default.

### Client use (`src/api`)

`getApiClient().check(request, { signal, onUpdate })` streams when `onUpdate` is set. It resolves with the `final` response, like the plain call. When the server or the runtime cannot stream, it falls back to one plain reply and never calls `onUpdate`, so the screen must work without any update.

```ts
const result = await getApiClient().check(request, {
  signal: controller.signal,
  onUpdate: (u) => {
    if (u.type === 'stage') setStep(STAGE_STEP[u.stage]);          // drive the step list
    if (u.type === 'verdict') setVerdict(u.response.verdict);      // show the verdict early
    if (u.type === 'final') setSources(u.response.sources ?? []);  // add sources and network data
  },
});
```

How the Checking screen should use it:

1. Map `stage` events to the existing step list: `extract` to "Reading", `links` to "Checking links", `ground` to "Verifying claims". Keep the timer-based steps when no `stage` event arrives.
2. On `verdict`, call the existing `setVerdict(response.verdict)` so the loader shows the result about 1.5 to 3 s sooner. Do not navigate yet.
3. Navigate to the Report with the resolved `final` result, as today, and save that result to history. Never save the `verdict` response.
4. If the user leaves the screen, abort with the `AbortController`, as today.

The native fetch in React Native does not expose a response stream, so on Android the app reads the whole reply at the end and the result is the same as the plain call. Use `expo/fetch` (SDK 52) as `fetchImpl` in `createHttpClient` to get early events on devices.

## POST /v1/speak

Spoken warning audio from a Gemini text-to-speech model, for phones with no voice for the language (for example Burmese or Thai).

Request: `{ "text": "max 600 chars", "language": "en" | "id" | "tl" | "my" | "th" }`

Response 200: `{ "audioBase64": "...", "mimeType": "audio/wav", "sampleRate": 24000, "model": "..." }`

The audio is a mono 16-bit PCM WAV file. Errors use the same body as `/v1/check`.

## WebSocket /v1/live (Talk to SafeRoute)

A live two-way voice conversation about a finished report, relayed to the Gemini Live API (`LIVE_MODEL`, default `gemini-3.8-live`). The socket upgrades on the same HTTP server and port as the REST routes, so a Cloudflare tunnel or Cloud Run passes it. The message schema, audio formats and client behaviour are in `docs/live-audio-contract.md`.

- First frame from the client: `start` with `checkId`, `language`, `mode` (`self`, `family` or `companion`), optional `home`, `destination`, `token` and a `report` fallback. Audio frames carry 16 kHz mono PCM16 (base64), the server sends 24 kHz mono PCM16 (base64) plus `transcript`, `interrupted`, `action` (`WARN_FAMILY` or `HOTLINES`), `error` and `closed` frames.
- The system instruction is built from the report with personal data redacted, the language rule, the likelihood rules and the verified hotlines for `home` and `destination`. The model may call `open_action_sheet(screen)`; the server relays it as an `action` frame. In `companion` mode it may also call `recheck_screen`, relayed as `action` `RECHECK`; the app answers with a `context` frame carrying the new report (see `docs/live-audio-contract.md`).
- Languages: the model answers in the listener's language when it is in `LIVE_LANGUAGES` (default `en,my,th,id,tl`), else in the `start` language. A `start` language outside the list gets `error unsupported_language`.
- Limits: 120 s per session (`LIVE_MAX_MS`), 300 s in companion mode (`LIVE_COMPANION_MAX_MS`), one session per uid (or per IP without a token), at most `LIVE_MAX_CONCURRENT` (20) at once. One session counts as 2 checks for the per-uid limiter and for the per-IP limiter. A bad or missing token falls back to the per-IP limit, as on `/v1/check`.
- Privacy: audio and transcripts are not stored or logged. The only log line per session carries a hash of the check id, the duration, the turn count, whether an action fired and the count of certainty phrases the language guard saw in the spoken text (detect only).
- Origin: browsers must send an `Origin` listed in `CORS_ORIGINS` (default any).

## GET /v1/insights?country=TH&days=30

`country` is an ISO code or `GLOBAL` (default). `days` is 1 to 90 (default 30). Sent with `Cache-Control: public, max-age=60`. Every item needs at least k=3 reports; no hashes are returned.

```json
{
  "country": "TH", "days": 30, "generatedAt": "ISO-8601", "k": 3,
  "risks": [ { "scamType": "job_trafficking", "label": "...", "count": 34, "trend": "up" | "down" | "flat",
               "example": "redacted template", "topFlagFamilies": [ { "family": "trafficking", "share": 0.9 } ] } ],
  "domains": [ { "domain": "example.example", "count": 7, "trend": "up" } ],
  "campaigns": [ { "name": "...", "scamType": "...", "count": 11, "trend": "up", "example": "..." } ]
}
```

Risks are ordered by trending score. Errors: 400 `bad_request` for a bad `country` or `days`.

## GET /v1/config/hotlines, /v1/config/notices, /v1/config/content (published runtime config)

No auth. Per-IP limit. Every reply carries `Cache-Control: public, max-age=300` and a weak `ETag`; send `If-None-Match` to get `304`. The server keeps an in-memory copy and refreshes it every 60 seconds. When Firestore is unreachable or empty the server answers from the bundled data (`version: 0`).

- `/v1/config/hotlines` returns `{ "version": 3, "items": Hotline[] }`. Retired items are left out. Each item has the `src/data/hotlines.ts` fields plus `status` and `source`.
- `/v1/config/notices?country=TH&language=my` returns `{ "version": 1, "items": Notice[] }` with only enabled notices inside their `startsAt`/`endsAt` window. A notice with `country` or `language` set appears only for those values. Both parameters are optional.
- `/v1/config/content?language=my` returns `{ "version": 1, "items": { "<ns>:<key>": "text" } }`. Without `language`, each value is an object of per-language texts. `language` is one of en, my, id, tl, th.

The app fetches hotlines, notices and content at startup and every 6 hours, caches them, and uses the cache offline. See `docs/admin.md`.

Admin errors extend the error body: codes `unauthorized` (401), `forbidden` (403) and `conflict` (409) join the existing ones. The admin API itself is under `/v1/admin` and is described in `docs/admin.md`.

## GET /healthz

`{ "ok": true, "model": "...", "mock": false }`

## GET /download, GET|HEAD /download/saferoute.apk

`/download` returns a plain HTML install page (English and Burmese, no external assets) with the version (`APK_VERSION`), the file size and a link to the APK.

`/download/saferoute.apk` streams the file at `APK_PATH`. Headers: `Content-Type: application/vnd.android.package-archive`, `Content-Disposition: attachment; filename="SafeRoute.apk"`, `Content-Length`, `Cache-Control: no-cache`, `ETag` (mtime and size). When `APK_PATH` is unset or the file is missing the response is 404 with the usual error body. Limit: `APK_LIMIT_PER_HOUR` (default 20) per IP, separate from the check limits; over it the response is 429 `rate_limited`.
