#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-crtest-511817}"
REGION="${REGION:-asia-southeast1}"
SERVICE="${SERVICE:-sg-dev}"
REPO="${REPO:-$SERVICE}"
SA_NAME="${SA_NAME:-$SERVICE}"
SECRET_PREFIX="${SECRET_PREFIX:-$SERVICE-}"
DATA_PROJECT="${DATA_PROJECT:-saferoute-aibc}"
DATA_GCLOUD_CONFIG="${DATA_GCLOUD_CONFIG:-}"
SECRETS_DIR="${SECRETS_DIR:-$HOME/work/scamshield-secrets}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.5-flash-lite}"
MIN_INSTANCES="${MIN_INSTANCES:-1}"
MAX_INSTANCES="${MAX_INSTANCES:-2}"
CONCURRENCY="${CONCURRENCY:-80}"
SA="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

gc() { gcloud --project "$PROJECT" --quiet "$@"; }

gc services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com iam.googleapis.com iamcredentials.googleapis.com \
  webrisk.googleapis.com safebrowsing.googleapis.com

gc iam service-accounts describe "$SA" >/dev/null 2>&1 ||
  gc iam service-accounts create "$SA_NAME" --display-name "$SERVICE runtime"
gc artifacts repositories describe "$REPO" --location "$REGION" >/dev/null 2>&1 ||
  gc artifacts repositories create "$REPO" --repository-format docker --location "$REGION"

number="$(gc projects describe "$PROJECT" --format 'value(projectNumber)')"
gc projects add-iam-policy-binding "$PROJECT" --condition=None --format none \
  --member "serviceAccount:${number}-compute@developer.gserviceaccount.com" --role roles/run.builder

if [ -n "$DATA_GCLOUD_CONFIG" ]; then
  CLOUDSDK_CONFIG="$DATA_GCLOUD_CONFIG" gcloud projects add-iam-policy-binding "$DATA_PROJECT" --quiet \
    --condition=None --format none --member "serviceAccount:$SA" --role roles/datastore.user
else
  echo "Skipping the $DATA_PROJECT grant (set DATA_GCLOUD_CONFIG); roles/datastore.user for $SA must exist." >&2
fi

read_var() { grep -E "^(export +)?$1=" "$2" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"'\r' || true; }
put_secret() {
  local name="${SECRET_PREFIX}$1" value="$2"
  [ -n "$value" ] || { echo "$1 is empty; not updating $name" >&2; return 0; }
  if gc secrets describe "$name" >/dev/null 2>&1; then
    [ "$(gc secrets versions access latest --secret "$name" 2>/dev/null || true)" = "$value" ] ||
      printf '%s' "$value" | gc secrets versions add "$name" --data-file=- >/dev/null
  else
    printf '%s' "$value" | gc secrets create "$name" --replication-policy automatic --data-file=- >/dev/null
  fi
  gc secrets add-iam-policy-binding "$name" --member "serviceAccount:$SA" \
    --role roles/secretmanager.secretAccessor --format none
}
put_secret gemini-api-key "$(read_var GEMINI_API_KEY "$SECRETS_DIR/.env")"
put_secret intel-pepper "$(read_var INTEL_PEPPER "$SECRETS_DIR/.env")"
put_secret safe-browsing-api-key "$(read_var SAFE_BROWSING_API_KEY "$SECRETS_DIR/safebrowsing.env")"

gc run deploy "$SERVICE" --source server --image "$IMAGE" --region "$REGION" \
  --service-account "$SA" --no-invoker-iam-check \
  --memory 1Gi --cpu 1 --cpu-boost --concurrency "$CONCURRENCY" --timeout 3600 \
  --min-instances "$MIN_INSTANCES" --max-instances "$MAX_INSTANCES" \
  --set-secrets "GEMINI_API_KEY=${SECRET_PREFIX}gemini-api-key:latest,INTEL_PEPPER=${SECRET_PREFIX}intel-pepper:latest,SAFE_BROWSING_API_KEY=${SECRET_PREFIX}safe-browsing-api-key:latest" \
  --set-env-vars "^|^GEMINI_MODEL=${GEMINI_MODEL}|FIREBASE_PROJECT_ID=${DATA_PROJECT}|INTEL_PROJECT=${DATA_PROJECT}|NODE_OPTIONS=--max-old-space-size=768"

URL="$(gc run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)')"
echo "Cloud Run URL: $URL"
curl -fsS "$URL/health"
echo
