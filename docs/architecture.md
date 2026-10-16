# SafeRoute architecture

SafeRoute checks a job offer, message, link, listing or screenshot and returns a verdict, the evidence behind it and a spoken warning. The Android app calls one Cloud Run service. The service runs a six-stage pipeline and uses Google AI and Google Cloud services at each stage that needs them.

## Pipeline and Google services

| Stage | What it does | Google service |
| --- | --- | --- |
| 1. Capture | The app sends text, a link or a screenshot (JPEG or PNG) with the language | Cloud Run (HTTPS endpoint `POST /v1/check`) |
| 2. Extract | One multimodal call reads the text and image (OCR included) and returns red flags in 7 families, scam type, URLs, named entities and a draft verdict as structured JSON, in en, id, tl, my or th | Gemini API (`@google/genai`, JSON response schema); Vertex AI with the same SDK when `GOOGLE_GENAI_USE_VERTEXAI=true` |
| 3. Detect | The named companies, agencies and websites are checked against the live web: does the agency exist and hold a licence, are there scam reports. Only organisation names, website hosts and the country go to search; phone numbers, chat ids, accounts and person names never do (the hashed network covers repeat numbers). Source pages are returned to the user | Gemini with Grounding with Google Search |
| 4. Correlate | Every URL is checked for known threats and for domain age | Google Web Risk API (`uris.search`), RDAP via rdap.org |
| 5. Score | A deterministic rules engine adds weighted flag families, link results and domain age. It sets the final score and verdict. The model's opinion cannot raise a result with no evidence | Cloud Run (no model call) |
| 6. Explain | Title, plain-language summary and actions in the user's language. `POST /v1/speak` turns the spoken warning into audio, so Burmese and Thai work on phones with no matching voice | Gemini text-to-speech |

Detect and Correlate run in parallel. The whole request has a 15 second budget. A stage that fails or runs late returns "unknown" or nothing, and the verdict is still produced from the remaining evidence.

## Why the score is not the model's opinion

Gemini finds and explains evidence. The rules engine decides.

- Each flag family counts once, at its strongest severity. Weights: payment route 1.6, too good 1.4, link risk 1.4, trafficking 2.5, known bad 3.0, identity 0.8, pressure 0.6.
- A Web Risk hit forces danger. A young domain adds link risk. A high trafficking flag forces danger.
- Grounded findings are capped at medium severity, so a single web search result never decides a verdict alone.
- The same input and the same link results always give the same score. The rules have unit tests.

## Runtime

- One Cloud Run service with one runtime service account. The Gemini API key lives in Secret Manager; Web Risk uses the service account. Setting `GOOGLE_GENAI_USE_VERTEXAI=true` switches Gemini to Vertex AI with no key.
- Per-IP rate limits, request size limits and CORS at the edge of the service.
- Structured JSON logs go to Cloud Logging. Request text and images are never logged.
- Mock mode (`MOCK=1`) returns canned responses for every endpoint so the app team can work offline.

## Request flow

```
Android app
   |  POST /v1/check {kind, text, imageBase64, language}
   v
Cloud Run (Hono)
   |-- Extract ---------> Gemini API, JSON schema
   |-- Detect  --+------> Gemini + Google Search grounding   (parallel)
   |-- Correlate-+------> Web Risk + RDAP
   |-- Score -----------> rules engine
   |-- Explain ---------> response {verdict, score, flags, linkChecks, sources, actions}
   v
Android app --- POST /v1/speak {text, language} ---> Gemini TTS ---> WAV
```

## Talk to SafeRoute (live voice)

After a check, the report screen offers a live voice conversation about that report. The app plays the approved spoken warning first, then opens a WebSocket to `/v1/live` on the same service. The server loads the report from the result cache (or takes the one the app sends), redacts personal data from it, builds a system instruction with the language rule, the likelihood rules and the verified hotlines for the user's home and destination countries, and relays 16 kHz microphone audio to the Gemini Live API and 24 kHz model audio back. Sessions end at 120 seconds, cost two checks, and are limited to one per user. The server stores no audio or text. It scans the model's spoken text with the language guard in detect-only mode and logs a count per session. The audio layer sits behind one interface (`docs/live-audio-contract.md`): the web build uses the Web Audio API and the Android build uses a native module.

## Language of verdicts

SafeRoute cannot know that a message is a scam, so every sentence it shows or speaks describes signs and likelihood, not conclusions: "shows signs of", "looks like", "could be", "we could not verify". It never calls a named person, company, phone number or handle a criminal, and it reports observations ("asks for a fee before the job starts", "no licence record found in our search"). The prompts for extraction and grounding carry these rules with native examples in each output language. A language guard (`server/src/language-guard.ts`) then checks the model output against a curated list of certainty phrases in English, Bahasa Indonesia, Tagalog, Burmese and Thai. Thai has no spaces between words, so its patterns use lookbehinds for negation and hedge prefixes instead of word boundaries. It rewrites light cases ("is a scam" becomes "looks like a scam") and, when three or more phrases appear, asks the model once more inside the same time budget. Each rewrite is logged as `certainty_rewrite`, and `npm run eval` and the benchmark report the share of responses that carry certainty wording before and after the guard.

