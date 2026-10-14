#!/usr/bin/env bash
set -euo pipefail

: "${GOOGLE_CLOUD_PROJECT:?set GOOGLE_CLOUD_PROJECT}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-saferoute-api}"
MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
SA_NAME="${SA_NAME:-saferoute-api}"
SA="${SA_NAME}@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com"
cd "$(dirname "$0")"

gcloud services enable aiplatform.googleapis.com webrisk.googleapis.com run.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com --project "$GOOGLE_CLOUD_PROJECT"

gcloud iam service-accounts describe "$SA" --project "$GOOGLE_CLOUD_PROJECT" >/dev/null 2>&1 ||
  gcloud iam service-accounts create "$SA_NAME" --display-name "SafeRoute API" --project "$GOOGLE_CLOUD_PROJECT"

gcloud projects add-iam-policy-binding "$GOOGLE_CLOUD_PROJECT" \
  --member "serviceAccount:${SA}" --role roles/aiplatform.user --condition=None >/dev/null

gcloud run deploy "$SERVICE" --source . \
  --project "$GOOGLE_CLOUD_PROJECT" --region "$REGION" \
  --service-account "$SA" --allow-unauthenticated \
  --memory 512Mi --cpu 1 --concurrency 40 --max-instances 5 --timeout 60 \
  --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT},GOOGLE_CLOUD_LOCATION=${REGION},GEMINI_MODEL=${MODEL}${EXTRA_ENV:+,${EXTRA_ENV}}"

gcloud run services describe "$SERVICE" --project "$GOOGLE_CLOUD_PROJECT" --region "$REGION" --format 'value(status.url)'
