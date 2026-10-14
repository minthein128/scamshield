# GCP setup (run once by a human)

TLDR: one project, five APIs, two service accounts, one Workload Identity pool, then set GitHub variables. Run in Cloud Shell or any shell with `gcloud` logged in as a project owner.

## 1. Variables

```bash
export PROJECT_ID=saferoute-hackathon
export REGION=asia-southeast1
export GH_REPO=OWNER/REPO
export SERVICE=saferoute-api
export RUNTIME_SA=saferoute-runtime
export DEPLOYER_SA=saferoute-deployer
```

## 2. Project and APIs

```bash
gcloud projects create "$PROJECT_ID" --name="SafeRoute"
gcloud config set project "$PROJECT_ID"
gcloud billing projects link "$PROJECT_ID" --billing-account=BILLING_ACCOUNT_ID

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  webrisk.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com
```

To reuse an existing project, skip `projects create` and run only `gcloud config set project`.

## 3. Runtime service account

The Cloud Run service runs as this account. Gemini on Vertex AI needs `roles/aiplatform.user`.

```bash
gcloud iam service-accounts create "$RUNTIME_SA" --display-name="SafeRoute API runtime"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

Web Risk has no dedicated IAM role. The API must be enabled (step 2), billing must be linked, and the caller must be able to use the project's quota. `serviceUsageConsumer` covers that when the server calls Web Risk with the runtime account through Application Default Credentials.

## 4. Deployer service account

GitHub Actions deploys as this account.

```bash
gcloud iam service-accounts create "$DEPLOYER_SA" --display-name="SafeRoute GitHub deployer"

for ROLE in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.writer \
            roles/storage.admin roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$DEPLOYER_SA@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="$ROLE"
done

gcloud iam service-accounts add-iam-policy-binding \
  "$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --member="serviceAccount:$DEPLOYER_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

Source deploys also use the default Compute and Cloud Build accounts. If the first deploy fails with a permission error on a `...-compute@developer.gserviceaccount.com` or `...@cloudbuild.gserviceaccount.com` account, grant that account `roles/cloudbuild.builds.builder` and retry.

## 5. Workload Identity Federation (preferred)

```bash
gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github \
  --display-name="GitHub OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$GH_REPO'"

export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

gcloud iam service-accounts add-iam-policy-binding \
  "$DEPLOYER_SA@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$GH_REPO"

gcloud iam workload-identity-pools providers describe github-provider \
  --location=global --workload-identity-pool=github --format='value(name)'
```

The last command prints the value for `GCP_WORKLOAD_IDENTITY_PROVIDER`.

## 6. Service account key (fallback)

Use this only if WIF is blocked by org policy.

```bash
gcloud iam service-accounts keys create key.json \
  --iam-account="$DEPLOYER_SA@$PROJECT_ID.iam.gserviceaccount.com"
gh secret set GCP_SA_KEY --repo "$GH_REPO" < key.json
shred -u key.json
```

## 7. Allow unauthenticated invoke

The workflow passes `--allow-unauthenticated` on every deploy. To set it up before the first deploy, or if your org blocks that flag, run after the service exists:

```bash
gcloud run services add-iam-policy-binding "$SERVICE" \
  --region="$REGION" \
  --member="allUsers" \
  --role="roles/run.invoker"
```

If an org policy (`iam.allowedPolicyMemberDomains`) blocks `allUsers`, an org admin must relax it for this project.

## 8. GitHub variables and secrets

```bash
gh variable set GCP_PROJECT_ID --repo "$GH_REPO" --body "$PROJECT_ID"
gh variable set GCP_REGION --repo "$GH_REPO" --body "$REGION"
gh variable set GOOGLE_CLOUD_LOCATION --repo "$GH_REPO" --body "global"
gh variable set GEMINI_MODEL --repo "$GH_REPO" --body "gemini-2.5-flash"
gh variable set GCP_RUNTIME_SERVICE_ACCOUNT --repo "$GH_REPO" --body "$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com"
gh variable set GCP_SERVICE_ACCOUNT --repo "$GH_REPO" --body "$DEPLOYER_SA@$PROJECT_ID.iam.gserviceaccount.com"
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo "$GH_REPO" --body "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-provider"
```

After the first deploy, point the app at the service:

```bash
gh variable set EXPO_PUBLIC_API_URL --repo "$GH_REPO" \
  --body "$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"
```

| Name | Kind | Used by | Notes |
|---|---|---|---|
| GCP_PROJECT_ID | variable | server | required |
| GCP_REGION | variable | server | default asia-southeast1 |
| GOOGLE_CLOUD_LOCATION | variable | server | Vertex location, default global |
| GEMINI_MODEL | variable | server | default gemini-2.5-flash |
| GCP_RUNTIME_SERVICE_ACCOUNT | variable | server | required |
| GCP_SERVICE_ACCOUNT | variable | server | WIF path |
| GCP_WORKLOAD_IDENTITY_PROVIDER | variable | server | WIF path |
| GCP_SA_KEY | secret | server | fallback when WIF vars are unset |
| EXPO_PUBLIC_API_URL | variable | android | Cloud Run URL |
| ANDROID_KEYSTORE_BASE64 | secret | android | see release-keystore.md |
| ANDROID_KEYSTORE_PASSWORD | secret | android | |
| ANDROID_KEY_ALIAS | secret | android | |
| ANDROID_KEY_PASSWORD | secret | android | |

## 9. Verify

```bash
curl -s "$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')/healthz"
```
