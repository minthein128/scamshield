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
