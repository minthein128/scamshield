# GCP setup

TLDR: project `saferoute-aibc` (number 151183717652). The web demo and APK run now without billing. Link billing, then run `scripts/deploy-cloudrun.sh` to move the API to Cloud Run.

## State

| Piece | State |
|---|---|
| Firebase Hosting `saferoute-aibc.web.app` | live, Spark plan |
| API | temporary Cloudflare quick tunnel to a server on a dev machine |
| Runtime service account `saferoute-api` | created; `aiplatform.user`, `serviceusage.serviceUsageConsumer` |
| Deployer service account `saferoute-deployer` | created; `run.admin`, `cloudbuild.builds.editor`, `artifactregistry.writer`, `storage.admin`, `serviceusage.serviceUsageConsumer`, `serviceAccountUser` on the runtime account |
| Workload Identity pool `github`, provider `github-provider` | created, bound to `minthein128/scamshield` |
| Cloud Run, Cloud Build, Artifact Registry, Secret Manager | blocked until billing is linked |

## Link billing

```bash
gcloud billing projects link saferoute-aibc --billing-account=BILLING_ACCOUNT_ID
```

## Deploy

```bash
export CLOUDSDK_CONFIG=~/work/scamshield-secrets/gcloud-config PATH=~/work/google-cloud-sdk/bin:$PATH
scripts/deploy-cloudrun.sh
```

The script is idempotent. It:

1. enables run, cloudbuild, artifactregistry, secretmanager, webrisk, aiplatform;
2. creates or updates the secret `gemini-api-key` from `~/work/scamshield-secrets/.env` and grants the runtime account `secretAccessor`;
3. runs `gcloud run deploy saferoute-api --source server --region asia-southeast1` with the secret and `CORS_ORIGINS` set to the hosting origins;
4. sets the GitHub variable `EXPO_PUBLIC_API_URL` to the service URL;
5. rebuilds and redeploys the web demo, runs the Android workflow, and redeploys the web demo with the new APK.

Override with `PROJECT`, `REGION`, `GH_REPO`, `BRANCH`, `ENV_FILE`, `GEMINI_MODEL`.

## Hosting notes

- Spark rejects `.apk` uploads ("Executable files are forbidden"). The APK is uploaded as `dist/dl/saferoute.pkg` and `firebase.json` rewrites `/saferoute.apk` to it, with the Android package content type.
- Deploy by hand: `pnpm build:web`, copy the APK to `dist/dl/saferoute.pkg`, then `firebase deploy --only hosting --project saferoute-aibc`.
- The release APK is signed with the debug key because no keystore secrets exist. Sideloading works.

## GitHub variables

| Name | Value |
|---|---|
| EXPO_PUBLIC_API_URL | API base URL (tunnel now, Cloud Run later) |
| EXPO_PUBLIC_APK_URL | https://saferoute-aibc.web.app/saferoute.apk |
| GCP_PROJECT_ID | saferoute-aibc |
| GCP_REGION | asia-southeast1 |
| GOOGLE_CLOUD_LOCATION | global |
| GEMINI_MODEL | gemini-3.5-flash-lite |
| GCP_RUNTIME_SERVICE_ACCOUNT | saferoute-api@saferoute-aibc.iam.gserviceaccount.com |
| GCP_SERVICE_ACCOUNT | saferoute-deployer@saferoute-aibc.iam.gserviceaccount.com |
| GCP_WORKLOAD_IDENTITY_PROVIDER | projects/151183717652/locations/global/workloadIdentityPools/github/providers/github-provider |

Secrets are optional: `GCP_SA_KEY` (fallback when WIF is blocked) and `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` for a release keystore.

`server.yml` deploys on push to `main` with Vertex AI (`GOOGLE_GENAI_USE_VERTEXAI=true`) through the runtime account. The script deploys with the Gemini key secret instead. A later `main` deploy replaces the env vars and secret mount set by the script, so keep one path.

## Recreate the IAM objects

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

Web Risk has no IAM role. It needs the API enabled and billing linked; the runtime account calls it through ADC. If it returns 403, set `WEB_RISK_API_KEY` instead.

## Verify

```bash
curl -s "$(gcloud run services describe saferoute-api --region asia-southeast1 --format='value(status.url)')/healthz"
```

## Temporary backend

Until the Cloud Run API is live, a quick Cloudflare tunnel serves the backend from a dev host. The files live outside the repo in `~/work/scamshield-run`.

| Piece | Role |
|---|---|
| `start.sh` | Starts the server on port 18080 and a `cloudflared` quick tunnel, writes the URL to `tunnel-url.txt`, then calls `publish-config.sh` |
| `publish-config.sh` | Writes `{ "apiUrl": "<tunnel>" }` to `dist/config.json` and runs `firebase deploy --only hosting` when the URL differs from the live file |
| `watchdog.sh` | Checks `/healthz` locally and through the tunnel; reruns `start.sh` on failure |
| `scamshield-backend.service` | `systemd --user` oneshot unit that runs `start.sh` at boot (user linger enabled) |
| `scamshield-watchdog.timer` | Runs `watchdog.sh` every minute |

A quick tunnel gets a new URL on every start. The app is to read `https://saferoute-aibc.web.app/config.json` (served with `Cache-Control: no-cache`, see `firebase.json`) so builds need no baked URL. The GitHub variable `EXPO_PUBLIC_API_URL` must match the current tunnel for builds that still bake it.

## Firebase App Distribution

The `Android` workflow uploads the signed APK to the `dev-testers` group on pushes to `main` and `feat/production`, or on a manual run with `force_distribute` set. It needs the variables `FIREBASE_ANDROID_APP_ID`, `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_SERVICE_ACCOUNT`, and `roles/firebaseappdistro.admin` on the deployer account. Each build sets `versionCode` to the run number so testers see an update. Add testers with `firebase appdistribution:testers:add --group-alias dev-testers <email>`.

## Latency and cost settings

Measured on a loaded dev machine; list prices are approximate (tier 2 region, check the pricing page).

| Setting | Recommendation | Cost note |
|---|---|---|
| `--cpu-boost` | on (set in the script) | Extra CPU only during startup. Process start measured at 0.5 to 1.6 s. |
| `--min-instances` | 0 for the demo, 1 before a live pitch (`MIN_INSTANCES=1`) | Idle instance about 10 to 13 USD per month. Removes the container cold start (image pull plus about 1 s boot). |
| CPU always allocated (`--no-cpu-throttling`) | off | About 50 to 65 USD per month per instance. Only needed if `RECORD_AFTER_RESPONSE=1` is used; the write costs about 80 ms, so keep it off. |
| `--concurrency` | keep 40 | Requests wait on Google APIs, not on CPU. |
| Region | keep asia-southeast1 | Firestore `(default)` is in asia-southeast1; intel reads stay in region. |
| HTTP/2 | no change | The server speaks HTTP/1.1; Cloud Run's front end already serves clients over HTTP/2. |
| Keep-alive to Google APIs | no change | A 6 s idle gap vs 1 s gave the same latency (p50 828 vs 820 ms). The SDK reuses one client. |

SSE: Cloud Run supports streaming responses; keep `--timeout` above the 15 s budget.
