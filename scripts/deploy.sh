#!/usr/bin/env bash
# Build and deploy LexHelm V2 API + Worker to Cloud Run.
# Usage: ./scripts/deploy.sh [api|worker|all]
set -euo pipefail

PROJECT="lexhelm"
REGION="us-central1"
REPO="lexhelm-v2"
SA_EMAIL="lexhelm-v2-sa@${PROJECT}.iam.gserviceaccount.com"
IMAGE_BASE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}"
TAG="${TAG:-latest}"
TARGET="${1:-all}"

echo "=== LexHelm V2 — Deploy to Cloud Run ==="
echo "Project: $PROJECT | Region: $REGION | Target: $TARGET | Tag: $TAG"
echo ""

# ── Configure docker auth ─────────────────────────────────────
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet 2>/dev/null

# ── Build ──────────────────────────────────────────────────────
build_image() {
  local image="${IMAGE_BASE}/lexhelm-api:${TAG}"
  echo "[Build] Building image: $image"
  docker build \
    --platform linux/amd64 \
    -t "$image" \
    ./apps/api
  echo "[Build] Pushing image..."
  docker push "$image"
  echo "[Build] ✓ Pushed: $image"
  echo ""
}

# ── Secret mount flags (shared by api + worker) ───────────────
SECRET_FLAGS=(
  --set-secrets="DATABASE_URL=lexhelm-v2-database-url:latest"
  --set-secrets="X_API_TOKEN=lexhelm-v2-api-token:latest"
  --set-secrets="GEMINI_API_KEY=lexhelm-v2-gemini-key:latest"
  --set-secrets="IK_API_KEY=lexhelm-v2-ik-api-key:latest"
  --set-secrets="AMQP_LAVINMQ_URL=lexhelm-v2-amqp-url:latest"
  --set-secrets="JWT_SECRET=lexhelm-v2-jwt-secret:latest"
  --set-secrets="RESEND_API_KEY=lexhelm-v2-resend-api-key:latest"
  --set-secrets="GOOGLE_CLIENT_SECRET=lexhelm-v2-google-client-secret:latest"
)

# ── Deploy API ─────────────────────────────────────────────────
deploy_api() {
  local image="${IMAGE_BASE}/lexhelm-api:${TAG}"
  echo "[Deploy] Deploying API service..."
  gcloud run deploy lexhelm-v2-api \
    --image="$image" \
    --region="$REGION" \
    --project="$PROJECT" \
    --service-account="$SA_EMAIL" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --cpu=1 \
    --memory=512Mi \
    --min-instances=0 \
    --max-instances=5 \
    --timeout=60s \
    --concurrency=80 \
    --set-env-vars="GEMINI_MODEL=gemini-2.5-flash,GEMINI_LITE_MODEL=gemini-2.5-flash-lite,GCS_ARTIFACTS_BUCKET=lexhelm-artifacts,CORS_ORIGINS=*,RUN_DB_MIGRATIONS_ON_STARTUP=true,AUTO_PROVISION_USERS=true,NEXT_PUBLIC_GOOGLE_CLIENT_ID=302103822364-tl7jqkch8ocome6ojtin9hcapglfoq5d.apps.googleusercontent.com,FRONTEND_URL=${FRONTEND_URL:-https://lexhelm.com}" \
    "${SECRET_FLAGS[@]}" \
    --quiet

  API_URL=$(gcloud run services describe lexhelm-v2-api --region="$REGION" --project="$PROJECT" --format="value(status.url)")
  echo "[Deploy] ✓ API deployed: $API_URL"
  echo ""
}

# ── Deploy Worker ──────────────────────────────────────────────
deploy_worker() {
  local image="${IMAGE_BASE}/lexhelm-api:${TAG}"
  echo "[Deploy] Deploying Worker service..."
  gcloud run deploy lexhelm-v2-worker \
    --image="$image" \
    --region="$REGION" \
    --project="$PROJECT" \
    --service-account="$SA_EMAIL" \
    --platform=managed \
    --no-allow-unauthenticated \
    --no-cpu-throttling \
    --cpu=1 \
    --memory=512Mi \
    --min-instances=1 \
    --max-instances=3 \
    --timeout=300s \
    --concurrency=5 \
    --command="python,-m,app.worker" \
    --set-env-vars="GEMINI_MODEL=gemini-2.5-flash,GEMINI_LITE_MODEL=gemini-2.5-flash-lite,GCS_ARTIFACTS_BUCKET=lexhelm-artifacts" \
    "${SECRET_FLAGS[@]}" \
    --quiet

  echo "[Deploy] ✓ Worker deployed (always-on, consuming from LavinMQ)"
  echo ""
}

# ── Execute ────────────────────────────────────────────────────
cd "$(dirname "$0")/.."

case "$TARGET" in
  api)
    build_image
    deploy_api
    ;;
  worker)
    build_image
    deploy_worker
    ;;
  all|*)
    build_image
    deploy_api
    deploy_worker
    ;;
esac

echo "=== Deployment complete ==="
