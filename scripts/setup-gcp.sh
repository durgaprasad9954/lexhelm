#!/usr/bin/env bash
# One-time GCP setup for LexHelm V2 Cloud Run deployment.
# Run once to create service account, Artifact Registry repo, and secrets.
set -euo pipefail

PROJECT="lexhelm"
REGION="us-central1"
REPO="lexhelm-v2"
SA_NAME="lexhelm-v2-sa"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format="value(projectNumber)")

echo "=== LexHelm V2 — GCP Setup ==="
echo "Project: $PROJECT | Region: $REGION"
echo ""

# ── 1. Ensure APIs are enabled ─────────────────────────────────
echo "[1/5] Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project="$PROJECT" --quiet

# ── 2. Create Artifact Registry repo ──────────────────────────
echo "[2/5] Creating Artifact Registry repo: $REPO..."
if gcloud artifacts repositories describe "$REPO" --location="$REGION" --project="$PROJECT" &>/dev/null; then
  echo "  → Already exists, skipping."
else
  gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --project="$PROJECT" \
    --description="LexHelm V2 container images"
  echo "  → Created."
fi

# ── 3. Create service account ─────────────────────────────────
echo "[3/5] Creating service account: $SA_NAME..."
if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT" &>/dev/null; then
  echo "  → Already exists, skipping."
else
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="LexHelm V2 Cloud Run SA" \
    --project="$PROJECT"
  echo "  → Created."
fi

# Grant roles
echo "  Granting IAM roles..."
for ROLE in \
  roles/secretmanager.secretAccessor \
  roles/storage.objectUser \
  roles/run.invoker \
  roles/cloudsql.client \
  roles/iam.serviceAccountTokenCreator; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE" \
    --condition=None \
    --quiet &>/dev/null
  echo "    ✓ $ROLE"
done

# ── 4. Create/update secrets ──────────────────────────────────
echo "[4/5] Setting up secrets in Secret Manager..."

# Read values from .env.local
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "  ERROR: $ENV_FILE not found. Create it first."
  exit 1
fi

# Helper: create or update a secret
upsert_secret() {
  local name="$1"
  local value="$2"

  if gcloud secrets describe "$name" --project="$PROJECT" &>/dev/null; then
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --project="$PROJECT" --quiet
    echo "    ↻ Updated: $name"
  else
    echo -n "$value" | gcloud secrets create "$name" --data-file=- \
      --replication-policy="automatic" --project="$PROJECT" --quiet
    echo "    + Created: $name"
  fi
}

# Extract values from .env.local (strip quotes)
get_env() {
  grep "^${1}=" "$ENV_FILE" | head -1 | cut -d'=' -f2- | sed 's/^"//;s/"$//'
}

upsert_secret "lexhelm-v2-database-url"   "$(get_env DATABASE_URL)"
upsert_secret "lexhelm-v2-api-token"      "$(get_env X_API_TOKEN)"
upsert_secret "lexhelm-v2-gemini-key"     "$(get_env GEMINI_API_KEY)"
upsert_secret "lexhelm-v2-ik-api-key"     "$(get_env IK_API_KEY)"
upsert_secret "lexhelm-v2-amqp-url"       "$(get_env AMQP_LAVINMQ_URL)"
upsert_secret "lexhelm-v2-jwt-secret"     "$(get_env JWT_SECRET || echo 'lexhelm-dev-jwt-secret')"
upsert_secret "lexhelm-v2-resend-api-key" "$(get_env RESEND_API_KEY)"
upsert_secret "lexhelm-v2-google-client-secret" "$(get_env GOOGLE_CLIENT_SECRET)"

# ── 5. Grant SA access to secrets ─────────────────────────────
echo "[5/5] Granting secret access to service account..."
for SECRET in \
  lexhelm-v2-database-url \
  lexhelm-v2-api-token \
  lexhelm-v2-gemini-key \
  lexhelm-v2-ik-api-key \
  lexhelm-v2-amqp-url \
  lexhelm-v2-jwt-secret \
  lexhelm-v2-resend-api-key \
  lexhelm-v2-google-client-secret; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT" --quiet &>/dev/null
  echo "    ✓ $SECRET"
done

echo ""
echo "=== Setup complete ==="
echo "Service Account: $SA_EMAIL"
echo "Artifact Registry: ${REGION}-docker.pkg.dev/${PROJECT}/${REPO}"
echo ""
echo "Next: run ./scripts/deploy.sh to build and deploy."
