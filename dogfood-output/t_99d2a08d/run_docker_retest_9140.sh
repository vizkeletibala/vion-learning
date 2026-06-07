#!/usr/bin/env bash
set -euo pipefail
cd /home/vion/src/git/vion-learning
name="webtester-retest-9140-${HERMES_KANBAN_TASK:-manual}"
docker rm -f "$name" >/dev/null 2>&1 || true
docker run --name "$name" --network=host \
  -e BASE_URL \
  -e OUT_DIR \
  -v "$PWD":/work \
  -w /work \
  mcr.microsoft.com/playwright:v1.56.1-noble \
  node dogfood-output/t_99d2a08d/browser-retest.mjs
docker rm "$name" >/dev/null 2>&1 || true
