# SafeRoute network intelligence

TLDR: every risky check leaves one anonymous, redacted signal. Signals feed counters. Counters rank risk types, and they warn the next person who meets the same number, link or script. No image, raw text, uid or IP is ever stored.

## Flow

```
check request -> Extract (Gemini: flags + template + sender indicators)
              -> Redact  (regex pass over Gemini output, hashing of indicators)
              -> Correlate (Web Risk, RDAP, network lookup)  -> Score -> response (+ network)
              -> Record signal (careful or danger only, unless shareSignals=false)
```

## Redaction (two passes, fail closed)

1. Gemini pass, inside the existing extraction call (no extra request). It returns `template`: a short rewrite of the message with typed placeholders `[VICTIM_NAME] [PERSON] [PHONE] [EMAIL] [AMOUNT] [COMPANY] [ADDRESS] [ID_NUMBER] [ACCOUNT] [HANDLE] [LINK]`. It also returns `templateSafe`. When that is false, or when Gemini returns no template, no template is stored.
2. Deterministic pass, `server/src/intel/redact.ts`. Regex plus validators (Luhn, Thai ID checksum, NIK date, mod 97) for emails, SEA phones, Thai, Myanmar NRC, Indonesian NIK and Philippine PhilSys/TIN/SSS ids, passports, cards, bank accounts, IBAN, street addresses, @handles, amounts and honorific names. It runs over the Gemini template, so a model miss on a structured identifier is still caught. Any run of 7 or more digits that is left becomes `[NUMBER]`.

Victim data is never stored in any form, not even hashed. Only sender-side indicators are kept.

| Indicator | Stored as |
| --- | --- |
| Domain, URL host | clear text (public web infrastructure; common platforms such as facebook.com are skipped) |
| Phone, chat handle, payment account | `HMAC-SHA256(INTEL_PEPPER, type|normalised value)`, 128 bits |

Phones are normalised (country code and leading 0 removed) so `+66 81 234 5678` and `081-234-5678` give the same hash. Hashes allow counting and matching; nothing can be read back. Without `INTEL_PEPPER` the intel layer is off.

## Signal record: `intel_signals`

Written by firebase-admin only. `firestore.rules` denies all client access.

| Stored | Never stored |
| --- | --- |
| scamType, flag family + severity, verdict, score bucket (20 wide), kind, language, home and destination country, redacted template (max 300 chars), campaign label, cluster id, hashed indicators, public domains, UTC day, `expireAt` | uid, IP, image, raw text, flag evidence, victim PII, clear phone/handle/account |

Retention is 90 days, enforced on `expireAt`. A request with `shareSignals: false` writes nothing. Safe verdicts write nothing. With a verified uid (`req.uid`, set by the auth layer, never read from the body) each signal carries `rk = HMAC(pepper, uid + day)`. It changes every day, so it cannot be linked across days or reversed. Every counter (type, indicator, domain, campaign) counts one `rk` once per day, using marker docs in `intel_seen` (2 day expiry). Without a uid the document id is a keyed hash of day, scam type and indicators, so the same scam re-checked on the same day counts once.

## Aggregation: `intel_aggregates`

Incremental counters, updated in the same atomic batch as the signal. One doc per (kind, scope, key), scopes `GLOBAL` and each country. Kinds: `type`, `ind` (hashed indicator, GLOBAL), `dom`, `cluster` (template campaign). Each doc holds `days.{YYYYMMDD}` counts and `fam.{family}` counts, kept in separate `real` and `seed` buckets so `intel:purge-seed` removes demo data exactly. Equality-only queries need no composite index.

Trending score for a window of W days: `S = sum(count_d * 0.5^(age_d / 7))`. Baseline is the mean daily count of the previous min(W, 90-W) days. Ratio `r = (recent rate + e) / (baseline rate + e)`. Trend is up above 1.25, down below 0.8, else flat. Rank key is `S * clamp(r, 0.5, 2)`.

k-anonymity: a type, indicator, domain or campaign surfaces only with at least k=3 reports in the window. API output never contains a hash.

Campaigns: each template gets a 32-slot MinHash over character 4-grams. A signal joins the nearest active cluster with estimated Jaccard of 0.5 or more. Otherwise it opens one. Gemini names the campaign in the same extraction call. This costs no extra request.

## Feeding checks

The network lookup runs in parallel with Web Risk and RDAP, bounded by the request budget. Matches become flags of family `known_bad`, so the rules engine weighs them with its existing weight 3.0.

| Reports in 30 days | Severity |
| --- | --- |
| 3 to 5 | low |
| 6 to 14 | medium |
| 15 or more | high |

A campaign match is capped at low. A campaign sums every template cluster that matches by MinHash or by campaign name. The response gains `network: { seenCount, firstSeen, campaign? }`. The count is real; the value is never shown.

Poisoning is limited by: k=3, same-day dedupe, no signal from safe verdicts, and campaign matches capped at low.

## API

`GET /v1/insights?country=TH&days=30` returns ranked risk types, top public scam domains and active campaigns. `Cache-Control: public, max-age=60`. Mock mode returns seeded-looking data.

## Spark limits

Only Firestore is used (free quota: 20k writes, 50k reads per day). Firestore TTL policies need billing, so `expireAt` is kept for when billing exists and a sweep (server timer and `npm run intel:sweep`) deletes expired documents. Existing rules deny every `intel_*` path to clients. Single-field indexes suffice; no composite index exists. A signal costs about 10 writes. Insights reads are cached 60 s in memory.
