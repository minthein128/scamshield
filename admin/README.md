# Kakwe admin console

Vite + React + TypeScript web app for managing runtime configuration: hotlines, notices and content copy, with AI assist. It follows `docs/admin-contract.md`. Live at https://saferoute-admin.web.app.

## Run it

```
cd admin
npm install
npm run dev        # mock API on :8790 plus the UI on :5174, sign-in skipped
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Mock API and UI together. Sets `VITE_MOCK_AUTH=1` and `VITE_API_URL=http://localhost:8790`. |
| `npm run dev:real` | UI only, real Firebase sign-in. Needs `.env` (copy `.env.example`). |
| `npm run mock` | Mock API only. `MOCK_ROLE=editor` tests the editor view, `PORT` changes the port. |
| `npm run build` | Type check and production build to `dist/`. |
| `npm run build:mock` | Build to `dist-mock/` with the mock flags baked in. For the e2e test only. |
| `npm run lint` | ESLint. |
| `npm run e2e` | Drives `dist-mock/` in headless Chrome, writes `screenshots/*.png`. Run `build:mock` first. |

## API address

1. `VITE_API_URL`, if set.
2. Otherwise `apiUrl` from `VITE_CONFIG_URL` (default `https://saferoute-aibc.web.app/config.json`), read at runtime like the app does. This follows the tunnel URL when it changes.

Every call sends `Authorization: Bearer <Firebase ID token>`. The Firebase web config is in `.env.example` (`VITE_FIREBASE_*`, same values as `EXPO_PUBLIC_FIREBASE_*`).

## How AI assist is bounded

- AI endpoints only return suggestions. No AI result is applied by the UI.
- "Use as draft", "Record verification", "Draft with AI" and "Translate with AI" fill a form. Saving always calls `POST /drafts`; the draft carries `aiSource` (prompt, model, sources).
- A candidate keeps its sources and quotes visible. Low confidence candidates show the reason.
- "Record verification" is enabled only for a `confirmed` verdict.
- AI text for notices shows the hedging note. AI translations are marked "AI draft, review" per field.
- Only an admin can approve a draft. Editors see the Drafts queue read-only.

## Contract assumptions

The contract does not list these, so the UI and mock assume them. Change `src/pages/*` if the server differs.

- `GET /v1/admin/drafts` returns `{ drafts: Draft[] }`.
- `GET /v1/admin/admins` returns `{ admins: [{ uid, email, role, addedBy, addedAt }] }`.
- `GET /v1/admin/hotlines|notices|content` return `{ version, items, drafts? }` (content `items` is the key map).
- `GET /v1/admin/audit` returns `{ entries }`.
- `POST /drafts/:id/approve` returns the draft with `version`.
- `POST /ai/translate` returns `{ translations: { [lang]: text }, model?, note? }`.
- AI responses may carry a `model` string; it is stored in `aiSource.model`.
- Hotline items carry `source` and also the legacy `sourceUrl` and `asOf` fields of `src/data/hotlines.ts`.

## Mock

`mock/server.mjs` keeps state in memory, seeded from `src/data/hotlines.ts` (read directly by Node type stripping). It accepts any bearer token and implements the contract endpoints including approve, reject, audit and fake AI results with sources.

## Deploy

Second Hosting site `saferoute-admin` in project `saferoute-aibc`, target `admin` in `firebase.json`.

```
npm run build
GOOGLE_APPLICATION_CREDENTIALS=~/work/scamshield-secrets/gcp-deployer.json \
  npx -y firebase-tools@latest deploy --only hosting:admin --project saferoute-aibc
```

Never run a plain `--only hosting`; it also deploys the app site.
