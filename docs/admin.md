# Admin console backend

TLDR: hotlines, notices and copy live in Firestore. Editors draft, admins approve, every change is audited. AI only suggests. The app and the server read the published copy through `/v1/config/*` and fall back to bundled data.

The binding contract is `docs/admin-contract.md`. This page covers how it works.

## Roles

| Role | Can do |
| --- | --- |
| editor | Read everything, create drafts, call AI assist |
| admin | Everything an editor can, plus approve and reject drafts |

Roles live in `admins/{uid}`. A signed-in user without that document gets `403`. Anonymous tokens never pass. No client can read or write `config*` or `admins`; Firestore rules deny it and only the server writes.

## Grant a role

```
cd server
GOOGLE_APPLICATION_CREDENTIALS=<service account json> npm run admin:grant -- someone@example.org admin
```

The person must have signed in once with a verified email (for example Google). The script refuses an unverified email, because password sign-up does not prove ownership. Nobody is granted by default.

## Draft flow

1. `POST /v1/admin/drafts` with `{ collection, op, item, reason }`. The server validates the item with zod: dial format, country code, category, https `sourceUrl` for any item with a number.
2. An admin calls `POST /v1/admin/drafts/:id/approve`. In one Firestore transaction the server applies the change, bumps `version`, writes `config_audit` and marks the draft approved. The server fills `verifiedBy`, `history` and `source`.
3. Or `POST /v1/admin/drafts/:id/reject`.
4. The in-memory cache drops the document at once; other instances refresh within 60 seconds.

Retire an item with an `update` that sets `status: "retired"`. Retired and deleted ids leave the public list. Once a list is published it is the source of truth: the app no longer shows bundled ids missing from it.

Other endpoints: `GET /v1/admin/me|hotlines|notices|content|drafts|admins|audit`.

## AI assist bounds

- Routes `/v1/admin/ai/find-hotline|verify-hotline|draft-content|translate`. They hold no store handle and return candidates only. The UI turns a candidate into a draft.
- 30 calls per hour per uid (`ADMIN_AI_LIMIT_PER_HOUR`). Model `ADMIN_AI_MODEL`, default `gemini-3.8-flash`.
- `find-hotline` uses Gemini with Google Search and asks for official sources only. The server then decides confidence, not the model: `low` without an official-looking source domain (government, police, embassy, UN or IOM), `medium` when an official source quotes the number but its page could not be confirmed, `high` when the fetched official page shows the number. Each source reports `official`, `grounded` and `pageCheck`.
- Page checks fetch https pages only, block private hosts, and read at most about 800 KB.
- `verify-hotline` returns `confirmed` only when an official source shows the number.
- `draft-content` and `translate` use the likelihood rules and the glossary; certainty wording is re-asked, then rewritten.
- Prompt text is never logged.

## Seed and recovery

`npm run config:seed-hotlines` publishes the bundled list as version 1. It skips when a version exists; `--force` overwrites and raises the version. The bundled list stays the fallback when Firestore is down.

## App behaviour

`src/lib/runtimeConfig.ts` fetches at startup and every 6 hours, caches in AsyncStorage, and `src/lib/hotlines.ts` merges runtime over bundled by id. Notices show as a dismissible card on Home (dismissals are stored by notice id; use a new id to show it again). Content overrides apply to i18n keys that exist in English and take effect on the next render.

## Environment

`ADMIN_ORIGINS` (CORS for `/v1/admin`, default the admin site and localhost 5173 and 5174), `ADMIN_AI_MODEL`, `ADMIN_AI_LIMIT_PER_HOUR`, `CONFIG_STORE=memory|firestore` (memory in mock mode).
