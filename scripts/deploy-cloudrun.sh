#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-saferoute-aibc}"
REGION="${REGION:-asia-southeast1}"
SERVICE="${SERVICE:-saferoute-api}"
GH_REPO="${GH_REPO:-minthein128/scamshield}"
BRANCH="${BRANCH:-feat/deploy}"
ENV_FILE="${ENV_FILE:-$HOME/work/scamshield-secrets/.env}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.5-flash-lite}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
SECRET=gemini-api-key
SA="saferoute-api@${PROJECT}.iam.gserviceaccount.com"
APK_URL="https://${PROJECT}.web.app/saferoute.apk"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] && [ -f "$HOME/work/scamshield-secrets/gcp-deployer.json" ]; then
  export GOOGLE_APPLICATION_CREDENTIALS="$HOME/work/scamshield-secrets/gcp-deployer.json"
fi

gcloud config set project "$PROJECT" >/dev/null

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com webrisk.googleapis.com aiplatform.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com

gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 ||
  gcloud iam service-accounts create saferoute-api --display-name "SafeRoute API runtime"
for role in roles/aiplatform.user roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" \
    --role "$role" --condition=None --quiet >/dev/null
done

key="$(grep -E '^GEMINI_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'"'\r')"
[ -n "$key" ] || { echo "GEMINI_API_KEY missing in $ENV_FILE" >&2; exit 1; }
if gcloud secrets describe "$SECRET" >/dev/null 2>&1; then
  current="$(gcloud secrets versions access latest --secret "$SECRET" 2>/dev/null || true)"
  [ "$current" = "$key" ] || printf '%s' "$key" | gcloud secrets versions add "$SECRET" --data-file=-
else
  printf '%s' "$key" | gcloud secrets create "$SECRET" --replication-policy automatic --data-file=-
fi
unset key current
gcloud secrets add-iam-policy-binding "$SECRET" --member "serviceAccount:$SA" \
  --role roles/secretmanager.secretAccessor --quiet >/dev/null

gcloud run deploy "$SERVICE" --source server --region "$REGION" \
  --service-account "$SA" --allow-unauthenticated \
  --memory 512Mi --cpu 1 --cpu-boost --concurrency 40 --min-instances "$MIN_INSTANCES" --max-instances 5 --timeout 60 \
  --set-secrets "GEMINI_API_KEY=${SECRET}:latest" \
  --set-env-vars "^|^GOOGLE_CLOUD_PROJECT=${PROJECT}|GEMINI_MODEL=${GEMINI_MODEL}|CORS_ORIGINS=https://${PROJECT}.web.app,https://${PROJECT}.firebaseapp.com|RATE_LIMIT_PER_MIN=30"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)')"
echo "Cloud Run URL: $URL"
curl -fsS "$URL/healthz"; echo

gh variable set EXPO_PUBLIC_API_URL -R "$GH_REPO" -b "$URL"
gh variable set EXPO_PUBLIC_APK_URL -R "$GH_REPO" -b "$APK_URL"

firebase() { npx -y firebase-tools@latest "$@" --project "$PROJECT"; }
deploy_web() {
  NODE_OPTIONS=--max-old-space-size=2048 EXPO_PUBLIC_API_URL="$URL" EXPO_PUBLIC_APK_URL="$APK_URL" pnpm build:web
  mkdir -p dist/dl
  if [ -n "${1:-}" ]; then cp "$1" dist/dl/saferoute.pkg
  else curl -fsS "$APK_URL" -o dist/dl/saferoute.pkg || rm -f dist/dl/saferoute.pkg; fi
  firebase deploy --only hosting
}
deploy_web

before="$(gh run list -R "$GH_REPO" -w Android -b "$BRANCH" -L 1 --json databaseId -q '.[0].databaseId // 0')"
gh workflow run android.yml -R "$GH_REPO" --ref "$BRANCH"
run=""
for _ in $(seq 30); do
  run="$(gh run list -R "$GH_REPO" -w Android -b "$BRANCH" -L 1 --json databaseId -q '.[0].databaseId')"
  [ "$run" != "$before" ] && break
  sleep 5
done
gh run watch -R "$GH_REPO" "$run" --exit-status
tmp="$(mktemp -d)"
gh run download -R "$GH_REPO" "$run" -n saferoute-apk -D "$tmp"
deploy_web "$(ls "$tmp"/*.apk | head -1)"
echo "Web demo: https://${PROJECT}.web.app"
echo "APK: $APK_URL"
