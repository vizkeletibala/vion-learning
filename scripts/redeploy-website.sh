#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_TAG="vion-learning:kanban"
SERVICE_NAME="aws-cert-trainer"
HEALTH_URL="http://127.0.0.1:9140/health"

cd "$ROOT_DIR"

echo "[redeploy] building ${IMAGE_TAG}"
docker build -t "$IMAGE_TAG" .

echo "[redeploy] recreating ${SERVICE_NAME}"
docker compose up -d --no-build --force-recreate "$SERVICE_NAME"

echo "[redeploy] waiting for health"
for attempt in {1..30}; do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    break
  fi
  sleep 2
done

if ! curl -fsS "$HEALTH_URL" >/dev/null; then
  echo "[redeploy] health check failed: ${HEALTH_URL}" >&2
  docker ps --filter name="$SERVICE_NAME" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' >&2 || true
  docker logs --tail=100 "$SERVICE_NAME" >&2 || true
  exit 1
fi

echo "[redeploy] healthy"
docker ps --filter name="$SERVICE_NAME" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -fsS "$HEALTH_URL"
