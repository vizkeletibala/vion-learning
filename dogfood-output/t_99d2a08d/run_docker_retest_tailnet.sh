#!/usr/bin/env bash
set -euo pipefail
cd /home/vion/src/git/vion-learning
name="webtester-retest-tailnet-${HERMES_KANBAN_TASK:-manual}"
docker rm -f "$name" >/dev/null 2>&1 || true
docker run --name "$name" \
  --network=host \
  -e BASE_URL \
  -e OUT_DIR \
  -e TAILNET_HOST \
  -e TAILNET_IP \
  -v "$PWD":/work \
  -w /work \
  mcr.microsoft.com/playwright:v1.56.1-noble \
  node dogfood-output/t_99d2a08d/browser-retest-tailnet.mjs
status=$?
docker rm "$name" >/dev/null 2>&1 || true
exit "$status"
