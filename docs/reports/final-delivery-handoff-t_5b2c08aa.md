# Vion Learning final delivery handoff

Task: `t_5b2c08aa`
Generated: 2026-06-05
Workspace: `/home/vion/src/git/vion-learning`

## 1. Architecture summary

Vion Learning is a private-by-default AWS certification trainer built as a Vite + React frontend with a lightweight Node HTTP API.

Core shape actually running now:
- Landing page at `/` is the only mixed-certification surface.
- Every track route is scoped under `/tracks/:trackId/*`.
- Runtime content is built from per-track source trees under `data/sources/clf-c02/*` and `data/sources/aif-c01/*`.
- Server APIs are track-scoped under `/api/tracks/:trackId...` and reject cross-track reads/updates.
- Progress is stored per track in the runtime model and exportable through `/api/admin/export`.
- Docker binds the app to loopback only: `127.0.0.1:9140 -> 3000`.
- Tailscale Serve publishes the app privately at `https://vion-kanban-ec2.tail276347.ts.net:8443/`.

Important implementation files:
- `src/main.jsx` — landing page, track shell, learn/quiz/study-plan/console/progress/sources views.
- `src/lib/learningModel.js` — track-scoped runtime model, quiz generation, answer evaluation, progress, source/video/report payloads.
- `src/lib/sourceRegistry.js` — local-first source registry and provenance handling.
- `server/index.js` — `/health`, landing, track, sources, resources, quiz, answer, mark, reset, export APIs.
- `README.md` — local run, Docker, Tailscale Serve, refresh, backup/export/reset instructions.

Separation verification from live code/model inspection:
- `clf-c02`: 124 cards, 147 questions, 18 sources, 0 cross-track cards/questions/sources.
- `aif-c01`: 20 cards, 20 questions, 3 sources, 0 cross-track cards/questions/sources.

## 2. Agent task breakdown

Executed board lanes:
- `t_b7a6f570` orchestrator — decomposed the project into research, design, build, deploy, review, and handoff lanes.
- `t_42e9c615` reviewer/research — built separate official-source corpora for CLF-C02 and AIF-C01 plus source verification report and seed outlines.
- `t_c02e3e54` designer — produced `docs/design/vion-learning-ux-spec.md` with the track-separation UX contract.
- `t_9d0ca5d8` coder — built the initial app, runtime model, API, tests, Docker, seed/export/reset support.
- follow-up coder lanes expanded CLF-C02 depth, repaired quiz/button flows, and integrated source registry/provenance workflow.
- `t_96b818a0` devops — deployed the container on loopback and published it via private Tailscale Serve on port 8443.
- `t_99d2a08d` reviewer — reverified exact MagicDNS/Tailnet reachability and browser flows after DNS recovery.
- `t_7c3cd307` reviewer — final readiness review, audit artifact, and final verdict.

Open remediation cards created by review:
- `t_bb629bf3` — fix CLF-C02 weak-area taxonomy mappings.
- `t_6a7a9589` — improve generated distractor quality.

## 3. Implementation plan actually executed

What happened in practice, not in fantasy:
1. Researched official AWS source corpora separately for CLF-C02 and AIF-C01.
2. Wrote the UX/spec contract that only `/` may show both tracks and everything else stays track-scoped.
3. Built the first app as Vite React + Node HTTP API with per-track cards, questions, study plans, console guides, sources, videos, and progress.
4. Added CLF-C02 deep content: concept records, curated question bank, and 91 service/resource explanation entries.
5. Repaired the initially broken quiz flow so Next / Finish / Results work end-to-end.
6. Added local-first source ingestion/provenance workflow:
   - `data/sources/source_catalog.json`
   - generated `ingested_sources.json` per track
   - `docs/reports/source-provenance.md`
   - validation/report scripts and tests
7. Containerized the app and served it privately through Tailscale Serve.
8. Ran browser and API acceptance checks against both `http://127.0.0.1:9140` and `https://vion-kanban-ec2.tail276347.ts.net:8443/`.
9. Final review marked the build as:
   - GO for deployment/app-flow mechanics
   - NO-GO for final exam-readiness acceptance

Current truth from live verification in this run:
- Track separation checks still pass.
- `npm test` now returns 29/31 passing with 2 expected failures, matching the final reviewer’s blockers:
  - wrong CLF-C02 weak-area taxonomy mapping
  - generic generated distractor labels
- That is not a surprise. It is the board telling the truth.

## 4. Files changed

Full repo delta from `b83f33c..HEAD` spans 56 files. Main groups:

App/runtime:
- `package.json`
- `package-lock.json`
- `index.html`
- `src/main.jsx`
- `src/styles.css`
- `src/lib/learningModel.js`
- `src/lib/sourceRegistry.js`
- `server/index.js`

Ops/runtime packaging:
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `.gitignore`
- `README.md`

Source corpora and generated provenance:
- `data/sources/source_catalog.json`
- `data/sources/clf-c02/source_metadata.json`
- `data/sources/clf-c02/seed_outline.json`
- `data/sources/clf-c02/learning_cards.json`
- `data/sources/clf-c02/concept_records.json`
- `data/sources/clf-c02/question_bank.json`
- `data/sources/clf-c02/resource_explanation_corpus.json`
- `data/sources/clf-c02/resource_explanation_corpus.md`
- `data/sources/clf-c02/ingested_sources.json`
- `data/sources/aif-c01/source_metadata.json`
- `data/sources/aif-c01/seed_outline.json`
- `data/sources/aif-c01/learning_cards.json`
- `data/sources/aif-c01/ingested_sources.json`

Source ingestion / maintenance:
- `scripts/seed.mjs`
- `scripts/export.mjs`
- `scripts/lint.mjs`
- `scripts/source-ingestion.mjs`
- `scripts/sources-check.mjs`
- `scripts/sources-report.mjs`
- `scripts/ingest-sources.mjs`
- `docs/reports/source-provenance.md`
- `docs/design/source-ingestion-schema.md`
- `docs/design/source-ingestion-schema.v1.json`

Design/research/docs:
- `docs/design/vion-learning-ux-spec.md`
- `docs/design/clf-c02-deep-curriculum-spec.md`
- `docs/design/webtester-ux-fix-guidance.md`
- `docs/research/clf-c02-deep-resource-map.md`
- `docs/milestone-1-findings.md`
- `reports/source-verification-report.md`
- `reports/clf-c02-resource-explanation-corpus-report.md`

Tests/QA:
- `tests/content-model.test.js`
- `tests/http-api.test.js`
- `tests/source-ingestion.test.js`
- `tests/source-integrity.test.js`
- `tests/ui-interactions.test.js`
- `qa/retest-vion-learning.mjs`
- `qa/verify-quiz-results-flow.mjs`
- `qa/verify-quiz-results.cjs`
- `qa/run-docker-quiz-results-flow.sh`
- `qa/run-docker-retest-fix.sh`
- `qa/webtester-button-usability-report.md`
- `qa/webtester-final-retest-report.md`
- `qa/webtester-final-retest-2026-06-04.md`

Final handoff artifact:
- `docs/reports/final-delivery-handoff-t_5b2c08aa.md`

## 5. How to run locally

From `/home/vion/src/git/vion-learning`:

```bash
npm install
npm run seed
npm test
npm run lint
npm run sources:check
npm run build
npm run api
```

Then open:
- `http://localhost:3000`
- or query `http://localhost:3000/health`

Private Docker run actually documented and used:

```bash
docker build -t vion-learning:kanban .
docker rm -f aws-cert-trainer 2>/dev/null || true
docker run -d \
  --name aws-cert-trainer \
  --restart unless-stopped \
  -p 127.0.0.1:9140:3000 \
  -v "$PWD/var:/app/var" \
  -v "$PWD/backups:/app/backups" \
  vion-learning:kanban
curl http://127.0.0.1:9140/health
```

## 6. How to serve through Tailscale

Current private serving path:
- host: `vion-kanban-ec2.tail276347.ts.net`
- tailnet IP: `100.124.15.123`
- private HTTPS port: `8443`
- target: `http://127.0.0.1:9140`

Commands:

```bash
tailscale serve status --json
sudo tailscale serve --https=8443 --bg http://127.0.0.1:9140
curl https://vion-kanban-ec2.tail276347.ts.net:8443/health
curl https://vion-kanban-ec2.tail276347.ts.net:8443/
curl https://vion-kanban-ec2.tail276347.ts.net:8443/api/landing
```

If local MagicDNS resolution misbehaves, use the fallback the devops lane verified:

```bash
curl --resolve vion-kanban-ec2.tail276347.ts.net:8443:100.124.15.123 \
  https://vion-kanban-ec2.tail276347.ts.net:8443/health
```

Do not do these unless you enjoy avoidable mess:
- do not expose `9140` on `0.0.0.0`
- do not use `tailscale funnel`
- do not front this app behind a public reverse proxy

## 7. How to update/refresh sources

Local-first workflow now implemented:

1. Edit `data/sources/source_catalog.json`.
2. Keep records per track. If one URL supports both exams, create two records, one for each `track_id`.
3. Run:

```bash
npm run ingest:sources
npm run sources:check
npm run sources:report
npm test
npm run build
```

Outputs to inspect:
- `data/sources/clf-c02/ingested_sources.json`
- `data/sources/aif-c01/ingested_sources.json`
- `docs/reports/source-provenance.md`

Rules encoded in code/docs:
- official AWS sources first
- no brain dumps, leaked questions, or copied proprietary training text
- auth-gated sources stay honestly marked `auth_gated` or `unverified`
- failed fetches stay `needs_refresh`; the scripts do not fabricate replacement content

## 8. How to add new learning cards/questions

For AIF-C01 seed content:
- add/update `data/sources/aif-c01/learning_cards.json`
- update `data/sources/aif-c01/source_metadata.json` and `seed_outline.json` as needed

For CLF-C02 seed content:
- base cards: `data/sources/clf-c02/learning_cards.json`
- richer concept cards: `data/sources/clf-c02/concept_records.json`
- curated questions: `data/sources/clf-c02/question_bank.json`
- resource explanations: `data/sources/clf-c02/resource_explanation_corpus.json`

Then validate:

```bash
npm test
npm run lint
npm run sources:check
npm run build
```

Track-separation rule that matters more than anyone’s optimism:
- keep `track_id: "clf-c02"` content under `data/sources/clf-c02/*`
- keep `track_id: "aif-c01"` content under `data/sources/aif-c01/*`
- do not let one track read the other’s corpus unless you want the tests to object, which they now do rather efficiently

## 9. Known limitations

The real blockers and caveats:
- Final readiness verdict is NO-GO for exam-readiness acceptance.
- High severity: `src/lib/learningModel.js` still maps 53 CLF-C02 resource families to wrong task statements in `RESOURCE_DOMAIN_MAP`.
- Medium severity: generated reinforcement distractors still include generic meta labels.
- `npm test` in this run confirms both defects: 29 pass, 2 fail.
- Security boundary is still Tailnet/loopback. `/api/admin/reset` and `/api/admin/export` are unauthenticated and should not be internet-exposed.
- Persistence is local runtime + seed/export/reset artifacts, not a true mutable SQLite-backed store.
- Video metadata and authenticated Skill Builder details remain partial/manual and are surfaced with freshness limitations.
- Browser verification on this host depended on Docker Playwright because native browser tooling lacked `libatk-1.0.so.0` earlier in the project.

## 10. Next recommended improvements

Order matters:
1. Complete `t_bb629bf3` — fix CLF-C02 resource weak-area taxonomy mapping and add invariant tests for representative families.
2. Complete `t_6a7a9589` — replace generic distractor labels with adjacent-service/concept misconceptions.
3. Rerun full acceptance after those fixes:
   - `npm test`
   - `npm run lint`
   - `npm run sources:check`
   - `npm run build`
   - local + Tailnet browser retests
   - `node qa/final-review-audit-t_7c3cd307.mjs`
4. Add authentication if the app ever needs exposure broader than the private Tailnet.
5. Replace in-memory progress with a persistent store if multi-session learner state matters.
6. Expand AIF-C01 depth to match the richer CLF-C02 content model.
7. Improve source freshness refresh for YouTube metadata and authenticated Skill Builder internals.

## Bottom line

Andrew-facing answer, stripped of perfume:
- The app and private deployment work.
- Track separation is real and verified.
- The product is not yet safe to call fully exam-ready.
- Fix the two review blockers first, then rerun final acceptance.
