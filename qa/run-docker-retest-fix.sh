#!/usr/bin/env bash
set -euo pipefail
cd /home/vion/src/git/vion-learning
docker run --rm --network=host -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.56.1-noble bash -lc 'BASE_URL=http://127.0.0.1:9144 OUT_DIR=/work/qa/retest-2026-06-04-fix node qa/retest-vion-learning.mjs'
