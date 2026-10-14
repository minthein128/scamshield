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
  "language": "en" | "id" | "tl" | "my"
}
```

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
  "actions": [ { "label": "Call hotline", "type": "call" | "share" | "block" | "learn", "value": "optional" } ],
  "model": "gemini model id used"
}
```

`score` is 0-100 (higher = riskier). `safe` < 35 <= `careful` < 70 <= `danger`.

Errors: `{ "error": { "code": "bad_request" | "too_large" | "upstream" | "rate_limited", "message": "..." } }` with 4xx/5xx.

## GET /healthz

`{ "ok": true, "model": "...", "mock": false }`
