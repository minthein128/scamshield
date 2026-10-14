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
  "language": "en" | "id" | "tl" | "my",
  "shareSignals": false
}
```

`context.home` is an optional home country. `shareSignals: false` keeps this check out of the anonymous network signals (default true). See `docs/intel-design.md`.

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

Errors: `{ "error": { "code": "bad_request" | "too_large" | "upstream" | "rate_limited", "message": "..." } }` with 4xx/5xx.

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
- A repeat of an identical check inside 10 minutes is answered from the server cache. `verdict` and `final` then arrive together, with a new `id`.

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

Spoken warning audio from a Gemini text-to-speech model, for phones with no voice for the language (for example Burmese).

Request: `{ "text": "max 600 chars", "language": "en" | "id" | "tl" | "my" }`

Response 200: `{ "audioBase64": "...", "mimeType": "audio/wav", "sampleRate": 24000, "model": "..." }`

The audio is a mono 16-bit PCM WAV file. Errors use the same body as `/v1/check`.

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

## GET /healthz

`{ "ok": true, "model": "...", "mock": false }`
