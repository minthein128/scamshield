# SafeRoute architecture

SafeRoute checks a job offer, message, link, listing or screenshot and returns a verdict, the evidence behind it and a spoken warning. The Android app calls one Cloud Run service. The service runs a six-stage pipeline and uses Google AI and Google Cloud services at each stage that needs them.

## Pipeline and Google services

| Stage | What it does | Google service |
| --- | --- | --- |
| 1. Capture | The app sends text, a link or a screenshot (JPEG or PNG) with the language | Cloud Run (HTTPS endpoint `POST /v1/check`) |
| 2. Extract | One multimodal call reads the text and image (OCR included) and returns red flags in 7 families, scam type, URLs, named entities and a draft verdict as structured JSON, in en, id, tl or my | Gemini on Vertex AI (`@google/genai`, JSON response schema) |
| 3. Detect | The named companies, agencies, phone numbers and salary claims are checked against the live web: does the agency exist and hold a licence, are there scam reports, is the pay plausible. Source pages are returned to the user | Gemini with Grounding with Google Search |
| 4. Correlate | Every URL is checked for known threats and for domain age | Google Web Risk API (`uris.search`), RDAP via rdap.org |
| 5. Score | A deterministic rules engine adds weighted flag families, link results and domain age. It sets the final score and verdict. The model's opinion cannot raise a result with no evidence | Cloud Run (no model call) |
| 6. Explain | Title, plain-language summary and actions in the user's language. `POST /v1/speak` turns the spoken warning into audio, so Burmese works on phones with no Burmese voice | Gemini text-to-speech |

Detect and Correlate run in parallel. The whole request has a 15 second budget. A stage that fails or runs late returns "unknown" or nothing, and the verdict is still produced from the remaining evidence.

## Why the score is not the model's opinion

Gemini finds and explains evidence. The rules engine decides.

- Each flag family counts once, at its strongest severity. Weights: payment route 1.6, too good 1.4, link risk 1.4, trafficking 2.5, known bad 3.0, identity 0.8, pressure 0.6.
- A Web Risk hit forces danger. A young domain adds link risk. A high trafficking flag forces danger.
- Grounded findings are capped at medium severity, so a single web search result never decides a verdict alone.
- The same input and the same link results always give the same score. The rules have unit tests.

## Runtime

- One Cloud Run service, one runtime service account with `roles/aiplatform.user`. No keys are stored: Vertex AI and Web Risk use the service account.
- Per-IP rate limits, request size limits and CORS at the edge of the service.
- Structured JSON logs go to Cloud Logging. Request text and images are never logged.
- Mock mode (`MOCK=1`) returns canned responses for every endpoint so the app team can work offline.

## Request flow

```
Android app
   |  POST /v1/check {kind, text, imageBase64, language}
   v
Cloud Run (Hono)
   |-- Extract ---------> Gemini (Vertex AI), JSON schema
   |-- Detect  --+------> Gemini + Google Search grounding   (parallel)
   |-- Correlate-+------> Web Risk + RDAP
   |-- Score -----------> rules engine
   |-- Explain ---------> response {verdict, score, flags, linkChecks, sources, actions}
   v
Android app --- POST /v1/speak {text, language} ---> Gemini TTS ---> WAV
```
