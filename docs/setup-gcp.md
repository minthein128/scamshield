# GCP setup

TLDR: Firebase (Auth, Firestore, Hosting) stays in `saferoute-aibc` (no billing). The API runs on Cloud Run as service `sg-dev` in project `crtest-511817` (billing on), region `asia-southeast1`, and reads Firestore in `saferoute-aibc` across projects. `scripts/deploy-cloudrun.sh` sets it all up and deploys. The app calls `https://sg-dev-808112092414.asia-southeast1.run.app` directly; the APK downloads from `https://saferoute-aibc.web.app/saferoute.apk`.

## State

| Piece | Project | State |
|---|---|---|
| Firebase Auth, Firestore `(default)`, Hosting `saferoute-aibc.web.app` | `saferoute-aibc` | live, Spark plan |
| Cloud Run service `sg-dev` | `crtest-511817` | live; `https://sg-dev-808112092414.asia-southeast1.run.app` |
| Artifact Registry repo `sg-dev` (docker, `asia-southeast1`) | `crtest-511817` | holds the `sg-dev` image |
| Runtime service account `sg-dev@crtest-511817.iam.gserviceaccount.com` | `crtest-511817` | `secretAccessor` on the three secrets; `roles/datastore.user` on `saferoute-aibc` |
| Secrets `sg-dev-gemini-api-key`, `sg-dev-intel-pepper`, `sg-dev-safe-browsing-api-key` | `crtest-511817` | mounted as `GEMINI_API_KEY`, `INTEL_PEPPER`, `SAFE_BROWSING_API_KEY` |
| Build account `<number>-compute@developer.gserviceaccount.com` | `crtest-511817` | `roles/run.builder` |
| Old runtime and deployer accounts `saferoute-api`, `saferoute-deployer`, WIF pool `github` | `saferoute-aibc` | unused by `sg-dev`; `server.yml` still targets them |

## Service settings

| Setting | Value | Why |
|---|---|---|
| Gemini | `GEMINI_API_KEY` from Secret Manager | AI Studio key mode, no Vertex billing on `saferoute-aibc` |
| Firestore | `FIREBASE_PROJECT_ID=saferoute-aibc`, `INTEL_PROJECT=saferoute-aibc` | config, admin, intel and feedback stores and token checks use the Firebase project |
| Web Risk | ADC as `sg-dev`, billed to `crtest-511817` | Web Risk rejects API keys; Safe Browsing stays as the fallback |
| `APK_PATH` | unset | `/download` and `/download/saferoute.apk` answer 302 to `https://saferoute-aibc.web.app/saferoute.apk` |
| `PUBLIC_API_URL` | `https://sg-dev-808112092414.asia-southeast1.run.app` (script default, override with the env var) | `/config.json` points the app at the run.app URL |
| Instances | min 1, max 2 | no cold start; the in-memory limits and caches are per instance |
| Concurrency, timeout | 80, 3600 s | a `/v1/live` socket holds one request slot for its whole session |
| Memory | 1 GiB, `NODE_OPTIONS=--max-old-space-size=768` | |
| Access | `--no-invoker-iam-check` | the organisation policy blocks `allUsers`; the app calls the API without Google auth |

Cloud Run reserves `/healthz` on `run.app` URLs (Google answers 404 before the request reaches the container). The server also answers `/health`; probe that on `run.app`. The app probes `/health` and retries `/healthz` only on a 404, so servers older than `/health` still pass.

The app needs no Cloudflare hop. Its primary URL is the run.app URL (`src/config/env.ts`); it falls back to the web.app `config.json` only when that URL is unhealthy.

## Deploy

```bash
export CLOUDSDK_CONFIG=$(mktemp -d) PATH=~/work/google-cloud-sdk/bin:$PATH
gcloud auth activate-service-account --key-file ~/work/scamshield-secrets/cloud_run_svc.json
DATA_GCLOUD_CONFIG=~/work/scamshield-secrets/gcloud-config scripts/deploy-cloudrun.sh
```

The script is idempotent and holds no secrets. It:

1. enables run, cloudbuild, artifactregistry, secretmanager, iam, iamcredentials, webrisk and safebrowsing;
2. creates the runtime account and the Artifact Registry repo, and grants the build account `roles/run.builder`;
3. grants the runtime account `roles/datastore.user` on `DATA_PROJECT` with the gcloud config in `DATA_GCLOUD_CONFIG` (skipped when unset);
4. creates or updates the three secrets from `SECRETS_DIR/.env` and `SECRETS_DIR/safebrowsing.env` and grants the runtime account `secretAccessor`;
5. builds `server/` with Cloud Build into the repo and deploys the service;
6. prints the URL and calls `/health`.

Variables: `PROJECT`, `REGION`, `SERVICE`, `REPO`, `SA_NAME`, `SECRET_PREFIX`, `DATA_PROJECT`, `DATA_GCLOUD_CONFIG`, `SECRETS_DIR`, `GEMINI_MODEL`, `MIN_INSTANCES`, `MAX_INSTANCES`, `CONCURRENCY`. The script does not touch DNS, GitHub variables, the web demo or the APK.

`server.yml` deploys on push to `main` with Vertex AI into the `GCP_PROJECT_ID` variable (`saferoute-aibc`, no billing). Point it at `crtest-511817` and `sg-dev`, or disable it, before `main` gets a server change.

## Verify

```bash
curl -s https://sg-dev-808112092414.asia-southeast1.run.app/health
curl -s https://sg-dev-808112092414.asia-southeast1.run.app/v1/config/hotlines | head -c 200
```

## Hosting notes

- Spark rejects `.apk` uploads ("Executable files are forbidden"). The APK is uploaded as `dist/dl/saferoute.pkg` and `firebase.json` rewrites `/saferoute.apk` to it, with the Android package content type.
- Deploy by hand: `pnpm build:web`, copy the APK to `dist/dl/saferoute.pkg`, then `firebase deploy --only hosting --project saferoute-aibc`.
- Release APKs are signed with the private release key (see `docs/release-keystore.md`). The build fails on `main` and `feat/production` when the key secrets are missing.

## GitHub variables

| Name | Value |
|---|---|
| EXPO_PUBLIC_API_URL | `https://sg-dev-808112092414.asia-southeast1.run.app` for the final build; optional `EXPO_PUBLIC_STABLE_API_URL` and `EXPO_PUBLIC_FALLBACK_API_URL` override the primary and fallback candidates |
| EXPO_PUBLIC_APK_URL | https://saferoute-aibc.web.app/saferoute.apk |
| GCP_PROJECT_ID | saferoute-aibc |
| GCP_REGION | asia-southeast1 |
| GOOGLE_CLOUD_LOCATION | global |
| GEMINI_MODEL | gemini-3.5-flash-lite |
| GCP_RUNTIME_SERVICE_ACCOUNT | saferoute-api@saferoute-aibc.iam.gserviceaccount.com |
| GCP_SERVICE_ACCOUNT | saferoute-deployer@saferoute-aibc.iam.gserviceaccount.com |
| GCP_WORKLOAD_IDENTITY_PROVIDER | projects/151183717652/locations/global/workloadIdentityPools/github/providers/github-provider |

`GCP_SA_KEY` is optional (fallback when WIF is blocked). `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` are required on `main` and `feat/production`.

`server.yml` deploys on push to `main` with Vertex AI (`GOOGLE_GENAI_USE_VERTEXAI=true`) through these variables, not to `sg-dev`.

## Recreate the `saferoute-aibc` IAM objects

```bash
P=saferoute-aibc; G=minthein128/scamshield; N=$(gcloud projects describe $P --format='value(projectNumber)')
gcloud iam service-accounts create saferoute-api --project $P
gcloud iam service-accounts create saferoute-deployer --project $P
gcloud iam workload-identity-pools create github --location=global --project $P
gcloud iam workload-identity-pools providers create-oidc github-provider --location=global \
  --workload-identity-pool=github --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$G'" --project $P
gcloud iam service-accounts add-iam-policy-binding saferoute-deployer@$P.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser --project $P \
  --member="principalSet://iam.googleapis.com/projects/$N/locations/global/workloadIdentityPools/github/attribute.repository/$G"
```

Web Risk has no IAM role. It needs the API enabled and billing on the caller's project; `sg-dev` calls it through ADC and `crtest-511817` pays. The Safe Browsing key (`SAFE_BROWSING_API_KEY`) is the fallback when Web Risk fails.

## Firebase App Distribution

The `Android` workflow uploads the signed APK to the `dev-testers` group on pushes to `main` and `feat/production`, or on a manual run with `force_distribute` set. It needs the variables `FIREBASE_ANDROID_APP_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_SERVICE_ACCOUNT`, and `roles/firebaseappdistro.admin` on the deployer account. Each build sets `versionCode` to the run number so testers see an update. Add testers with `firebase appdistribution:testers:add --group-alias dev-testers <email>`.

## Latency and cost settings

Measured on a loaded dev machine; list prices are approximate (tier 2 region, check the pricing page).

| Setting | Recommendation | Cost note |
|---|---|---|
| `--cpu-boost` | on (set in the script) | Extra CPU only during startup. Process start measured at 0.5 to 1.6 s. |
| `--min-instances` | 1 (script default; `MIN_INSTANCES=0` for idle periods) | Idle instance about 10 to 13 USD per month. Removes the container cold start (image pull plus about 1 s boot). |
| CPU always allocated (`--no-cpu-throttling`) | off | About 50 to 65 USD per month per instance. Only needed if `RECORD_AFTER_RESPONSE=1` is used; the write costs about 80 ms, so keep it off. |
| `--concurrency` | 80 | Requests wait on Google APIs, not on CPU; each `/v1/live` socket holds a slot. |
| Region | keep asia-southeast1 | Firestore `(default)` is in asia-southeast1; intel reads stay in region. |
| HTTP/2 | no change | The server speaks HTTP/1.1; Cloud Run's front end already serves clients over HTTP/2. |
| Keep-alive to Google APIs | no change | A 6 s idle gap vs 1 s gave the same latency (p50 828 vs 820 ms). The SDK reuses one client. |

SSE: Cloud Run supports streaming responses. `--timeout 3600` covers both the 15 s check budget and `/v1/live` sessions.
