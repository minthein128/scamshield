# Admin console contract

The admin console (`admin/`, a small web app on a second Firebase Hosting site) manages runtime
configuration that the app and server read at runtime instead of from bundled files. First
collection: hotlines. Then notices and a few content items. Every AI-generated item is a draft a
human must approve, with a source URL for any phone number.

## Storage (Firestore, project saferoute-aibc)

- `config/hotlines`: `{ version: number, updatedAt, updatedBy, items: Hotline[] }` (published).
- `config_drafts/{draftId}`: `{ collection: "hotlines"|"notices"|"content", op: "add"|"update"|"delete", item, reason, aiSource?: { prompt, model, sources: [{title,url}] }, createdBy, createdAt, status: "pending"|"approved"|"rejected", reviewedBy?, reviewedAt? }`.
- `config_audit/{id}`: append-only `{ at, by, action, collection, before, after, draftId? }`.
- `config/notices`: `{ version, items: [{ id, country?: string[], language?: string[], title, body, severity: "info"|"warning", startsAt?, endsAt?, enabled }] }`.
- `config/content`: `{ version, items: { [key: string]: { en: string, my?: string, id?: string, tl?: string, th?: string } } }` for overridable copy such as red-flag explanations and Learn guide text, keyed by the i18n key.
- `admins/{uid}`: `{ email, role: "admin"|"editor", addedBy, addedAt }`. Admin = can publish; editor = can draft.

Firestore rules deny all client access to `config*` and `admins`; only the server writes. The app reads published config through the API.

## Hotline item shape

Same as `src/data/hotlines.ts` `Hotline`, plus `status: "published"|"retired"`, `source: { url, asOf, fetchedBy: "human"|"ai", note? }`, `verifiedBy?: { uid, at }`, `history?: [{ at, by, change }]`.

## Server API (all under `/v1/admin`, Firebase ID token required, `admins/{uid}` required)

- `GET /v1/admin/me` → `{ uid, email, role }` or 403.
- `GET /v1/admin/hotlines` → published list plus pending drafts affecting it.
- `POST /v1/admin/drafts` body `{ collection, op, item, reason }` → draft. Editors and admins.
- `POST /v1/admin/drafts/:id/approve`, `/reject` (admins). Approve applies the change to the published doc, bumps `version`, writes audit.
- `POST /v1/admin/ai/find-hotline` body `{ country, category, query? }` → `{ candidates: [{ name, number, dial, hours?, notes?, sources: [{title,url,quote}], confidence }] }`. Uses Gemini with Google Search grounding. It never writes; the UI turns a candidate into a draft. Candidates without at least one official-looking source are returned with `confidence: "low"` and a reason.
- `POST /v1/admin/ai/verify-hotline` body `{ item }` → `{ verdict: "confirmed"|"conflict"|"unverified", sources, note }`. Re-checks an existing number against the web.
- `POST /v1/admin/ai/draft-content` body `{ key, instruction, language }` → `{ text, note }` for notices and content copy, hedged per the likelihood rules.
- `POST /v1/admin/ai/translate` body `{ text, from, to[] }` → translations using the glossary from `scripts/translate.mjs`.
- `GET /v1/admin/audit?limit=` → audit entries.
- `GET /v1/admin/notices`, `GET /v1/admin/content` and the same draft flow.

Rate limit admin AI calls per uid (for example 30/hour). Log admin actions with uid and action, never the AI prompt text.

## Public read API (no auth, cached)

- `GET /v1/config/hotlines` → `{ version, items }` (published only, `Cache-Control: public, max-age=300`, ETag). The server also uses this data for the hotline action in reports, falling back to the bundled generated list when Firestore is unreachable.
- `GET /v1/config/notices?country=&language=` → active notices.
- `GET /v1/config/content?language=` → overrides map.

## App behaviour

At startup and every 6 hours the app fetches `/v1/config/hotlines` and `/v1/config/notices`, caches them in AsyncStorage, and uses the cached copy offline. The bundled `src/data/hotlines.ts` is the fallback when there is no cache. Notices show as a dismissible card on Home. Content overrides apply on top of i18n resources at render time.

## Admin console

- Firebase Auth (Google or email), then `GET /v1/admin/me`; non-admins see "not authorised".
- Pages: Hotlines (table by country, filter, edit, retire, add; "Find with AI" and "Verify with AI" buttons; each AI result shows its sources and must be turned into a draft), Drafts (review queue with before/after diff, approve/reject), Notices, Content, Audit, Admins.
- Every draft shows who or what produced it and the sources. Publishing requires an admin.
