# SafeRoute Check API contract (v1)

Base URL comes from `EXPO_PUBLIC_API_URL` in the app. All bodies are JSON.

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

`score` is 0-100 (higher = riskier). `safe` < 35 <= `careful` < 70 <= `danger`.

Errors: `{ "error": { "code": "bad_request" | "too_large" | "upstream" | "rate_limited", "message": "..." } }` with 4xx/5xx.

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
