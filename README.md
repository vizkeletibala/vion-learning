# Vion Learning

Vion Learning is a local/private AWS certification trainer with strict separation between the CLF-C02 AWS Certified Cloud Practitioner track and the AIF-C01 AWS Certified AI Practitioner track.

Only the landing page (`/`) shows both certifications. Every track experience is scoped under `/tracks/:trackId/*`, and all cards, domains, questions, progress records, sources, videos, study plans, and console guides carry `track_id`.

## Features implemented

- Landing page with track choice, readiness, next task, streak, milestone, weak domain count, and last source verification date.
- Track overview pages with official exam facts, domain weights, service/topic tags, weak areas, milestones, and mode entry points.
- Learning cards with prompt, short answer, detailed explanation, track/domain/service metadata, difficulty, source links, tags, know/review controls, and basic spaced repetition state.
- CLF-C02 concept records with scenario, exam angle, misconceptions, decision rules, service/concept mappings, and official source citations.
- CLF-C02 service/resource explanation corpus with beginner analogies, plain-English explanations, use cases, exam clue phrases, misconceptions, adjacent-service comparisons, source citations, verification dates, and weak-area mappings.
- Quiz engine modes: quick 10, domain 15-25, full 65 timed, weakness drill, and mixed review.
- Quick 10 quiz assembly that deliberately varies domain coverage, question type, difficulty, and answer position where the available pool allows it.
- Answer review with correct explanation, selected-option explanation, per-option distractor teaching, domain/topic/card/concept/source mapping, readiness update, next actions, and progress history.
- 7/14/30 day study plans per track.
- AWS Console guide structure with goal, prereqs, time, cost warning, path/steps, observe, exam relevance, cleanup, and related quiz IDs.
- Source ingestion/refresh metadata from `data/sources/*`, stale-warning limitations, and video resource metadata placeholders.
- Node HTTP API, `/health`, JSON structured logs, seed/reset/export commands, Dockerfile and docker-compose healthcheck.
- Milestone 3 RAG prototype foundation: section-aware chunk generation, dry-run embedding refresh planning for `text-embedding-3-small`, cited local retrieval, and retrieval eval reports. RAG admin API routes are disabled unless explicitly enabled.

## Original practice only

The seed practice and curated CLF-C02 questions are original learning content derived from official AWS task statements and documentation. Do not import or copy real exam questions, brain dumps, or unauthorized proprietary course material. Current limitations are shown in each track source report; YouTube publish dates/transcripts and authenticated Skill Builder internals still need richer refresh.

## Source ingestion workflow

Milestone 2 uses a local-first source registry rather than a vector database. Source candidates live in `data/sources/source_catalog.json`; generated per-track ingestion artifacts live in `data/sources/<trackId>/ingested_sources.json`; the human-readable provenance report lives at `docs/reports/source-provenance.md`.

Use the workflow below when refreshing or adding sources:

1. Add or update one catalog record per certification track. Keep ids deterministic with the `<track_id>:<source_type>:<slug>` pattern and keep `exam_relevance.exam_code` aligned with `track_id`.
2. Prefer official AWS exam guides, AWS documentation, AWS FAQs/whitepapers/blogs, and public certification/training pages. Third-party videos/articles may be cataloged as candidate teaching aids, but they should not drive quiz facts unless independently verified against official/public AWS sources.
3. Run `npm run ingest:sources` only when public fetches are acceptable. The ingestion script records HTTP failures honestly as `needs_refresh`, preserves prior hashes when available, and never invents replacement content for unreachable pages.
4. Run `npm run sources:check` after every catalog or generated-artifact change. It validates the source schema, duplicate ids, ISO timestamps, hash format, freshness status, and track/envelope isolation.
5. Run `npm run sources:report` if you only need to rebuild `docs/reports/source-provenance.md` from checked-in local artifacts.
6. Finish with `npm test`, `npm run lint`, and `npm run build` before handing off.

Ethical sourcing rules:

- Cite and summarize public sources; do not copy source text wholesale into cards, questions, or explanations.
- Never import real exam questions, brain dumps, leaked prep material, or proprietary course text/transcripts.
- Auth-gated material must stay marked `auth_gated` or `unverified` unless a human with legitimate access records a permissible summary and citation boundary.
- Do not dedupe source records across tracks by URL. If a URL supports both CLF-C02 and AIF-C01, create separate track-specific records with separate domains, concepts, summaries, and exam relevance.

## Commands

```bash
npm install
npm test
npm run lint
npm run build
npm run ingest:sources
npm run sources:check
npm run sources:report
npm run rag:ingest -- --track clf-c02 --dry-run
npm run rag:embed -- --track clf-c02
npm run rag:search -- --track clf-c02 --query "Amazon S3 storage"
npm run rag:eval -- --track clf-c02
npm run rag:migrate
npm run rag:populate-db -- --apply --tracks clf-c02,aif-c01,shared
npm run seed
npm run reset
npm run export
npm run api
```

Then open http://localhost:3000.

## API

- `GET /health`
- `GET /api/landing`
- `GET /api/tracks/:trackId`
- `GET /api/tracks/:trackId/resources` for track-scoped service/resource explanations (`clf-c02` currently returns the AWS resource corpus; `aif-c01` intentionally returns an empty list)
- `GET /api/tracks/:trackId/cards/:cardId`
- `POST /api/tracks/:trackId/quizzes` with `{ "mode": "quick|domain|full|weakness|mixed", "domainId": "1", "count": 15 }`
- `POST /api/tracks/:trackId/answers` with `{ "questionId": "...", "selectedOptionId": "a" }`
- `POST /api/tracks/:trackId/cards/mark` with `{ "cardId": "...", "status": "know|review" }`
- `POST /api/admin/reset`
- `GET /api/admin/export`

### RAG CLI, migrations, and admin API

RAG is deliberately opt-in. Normal app startup does not connect to Postgres, call OpenAI, or require live internet. Local CLI dry-run commands work from checked-in data; generated chunks are written under ignored `var/rag/` unless `--dry-run` is used.

```bash
# Section-aware ingestion; preserves track_id, source_id, url, section_path,
# citation_text, content_hash, freshness_status, embedding model, and dimensions.
npm run rag:ingest -- --track clf-c02 --dry-run
npm run rag:ingest -- --track clf-c02

# Populate the pgvector schema from staged chunk artifacts. The default is dry-run;
# add --apply to write rag_tracks, rag_sources, rag_chunks, and rag_ingest_jobs.
npm run rag:populate-db -- --tracks clf-c02,aif-c01,shared
VION_RAG_DATABASE_URL="$APP_DATABASE_URL" npm run rag:populate-db -- --apply --tracks clf-c02,aif-c01,shared

# Reviewed pgvector migrations. Without --apply this only prints paths and DB metadata.
npm run rag:migrate
# Live apply is explicit and requires a migrator connection string from the environment.
VION_RAG_DATABASE_URL="$MIGRATOR_DATABASE_URL" npm run rag:migrate -- --apply
# If the host does not have psql installed, run the reviewed migration through the rag-db container instead.
docker compose --profile rag exec -T rag-db \
  psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-vion_rag}" -v ON_ERROR_STOP=1 \
  < db/migrations/001_vion_rag_pgvector.up.sql
# Rollback path, also explicit.
VION_RAG_DATABASE_URL="$MIGRATOR_DATABASE_URL" npm run rag:migrate -- --apply --down

# Embedding refresh planning only by default. It uses text-embedding-3-small metadata
# and marks chunks pending_refresh when content_hash changes; no network or DB writes.
npm run rag:embed -- --track clf-c02

# Live pgvector/OpenAI writes are opt-in and refresh only chunks whose stored
# content_hash is missing or changed. Requires the migrations above, OPENAI_API_KEY,
# and a DB URL for vion_rag_app or another approved runtime writer role.
OPENAI_API_KEY=... VION_RAG_DATABASE_URL="$APP_DATABASE_URL" npm run rag:embed -- --track clf-c02 --live

# Local cited prototype retrieval. If no cited chunks are retrieved, the answer is refused.
npm run rag:search -- --track clf-c02 --query "Amazon S3 storage"
npm run rag:eval -- --track clf-c02
```

Controlled DB environment variables are recognized but never required for startup or dry-run CLI use:

- `VION_RAG_DATABASE_URL` or `DATABASE_URL` for future pgvector-backed operations.
- `VION_RAG_PGHOST`, `VION_RAG_PGPORT`, `VION_RAG_PGDATABASE` for operator-visible connection metadata. The Milestone 3 foundation host is loopback `127.0.0.1:55432` and database `vion_rag`.
- Runtime roles expected by the foundation are `vion_rag_app`, `vion_rag_readonly`, and `vion_rag_migrator`. Do not hardcode passwords or commit `.env` files.

The HTTP admin RAG routes are disabled by default and return 404 unless the server is started with `VION_RAG_API_ENABLED=1` (or tests call `createServer({ rag: { enabled: true } })`). When enabled without `VION_RAG_ADMIN_TOKEN`, requests are accepted only for localhost operator use (`localhost`, `127.0.0.1`, or `[::1]` hostnames). Any non-local/proxied host must satisfy the bearer-token guard by setting `VION_RAG_ADMIN_TOKEN` and sending either an `Authorization: Bearer <token>` or `X-Vion-Rag-Admin-Token: <token>` header. Do not commit this token, put it in `.env`, or expose these routes on public internet paths without an upstream private network/ACL plus the token guard.

- `GET /api/admin/rag/ingest?trackId=clf-c02`
- `POST /api/admin/rag/embed` with `{ "trackId": "clf-c02", "mode": "dry-run" }`
- `POST /api/admin/rag/search` with `{ "trackId": "clf-c02", "query": "Amazon S3 storage", "limit": 3 }`
- `POST /api/admin/rag/eval` with `{ "trackId": "clf-c02", "cases": [...] }`

## Docker and private deployment

The checked-in compose file is intentionally private-by-default: it publishes the app only on `127.0.0.1:9140`, not on a public interface. It also includes an opt-in `rag` profile for a loopback-only pgvector database on `127.0.0.1:55432`.

Operational details for app deployment, pgvector startup, migrations, refresh/re-embed, backups, restores, logs, and smoke checks live in `docs/operations/rag-deployment.md`.

```bash
# Preferred private deployment path.
docker compose up --build -d aws-cert-trainer
curl http://127.0.0.1:9140/health

# If compose build complains about buildx on the host, prebuild once and reuse the image.
docker build -t vion-learning:kanban .
docker compose up -d --no-build aws-cert-trainer

# Optional pgvector profile for live RAG writes.
docker compose --profile rag up -d rag-db

docker compose ps

# Fallback only if the Docker Compose plugin is unavailable:
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

The container healthcheck calls `/health` and exits non-zero if the app is unhealthy. Logs are JSON lines:

```bash
docker ps --filter name=aws-cert-trainer
docker logs --tail=100 aws-cert-trainer
```

## Private Tailscale Serve deployment

Recommended hostname/ports for this deployment:

- Tailnet host: `vion-kanban-ec2.tail276347.ts.net`
- Tailnet IP: `100.124.15.123`
- Local container bind: `127.0.0.1:9140 -> container :3000`
- Private Tailscale HTTPS: `https://vion-kanban-ec2.tail276347.ts.net:8443/`

Publish privately with Tailscale Serve only after the loopback healthcheck passes:

```bash
# Confirm there is no public Funnel state. Funnel is forbidden unless Andrew explicitly asks.
tailscale serve status --json

# Serve to the tailnet only. This does not enable Funnel.
tailscale serve --https=8443 --bg http://127.0.0.1:9140

# On this host, Tailscale required root/operator privileges; Andrew applied the route with:
sudo tailscale serve --https=8443 --bg http://127.0.0.1:9140

# Verify the private endpoint and core app/API pages.
curl https://vion-kanban-ec2.tail276347.ts.net:8443/health
curl https://vion-kanban-ec2.tail276347.ts.net:8443/
curl https://vion-kanban-ec2.tail276347.ts.net:8443/api/landing
curl https://vion-kanban-ec2.tail276347.ts.net:8443/api/tracks/clf-c02
curl https://vion-kanban-ec2.tail276347.ts.net:8443/api/tracks/aif-c01

# If the local resolver cannot resolve MagicDNS but tailscale status shows the node IP:
curl --resolve vion-kanban-ec2.tail276347.ts.net:8443:100.124.15.123 \
  https://vion-kanban-ec2.tail276347.ts.net:8443/health
```

From another Tailnet device, open `https://vion-kanban-ec2.tail276347.ts.net:8443/` or run the same `curl .../health` command. If it does not load, check that the device is logged into the same tailnet, MagicDNS is enabled, and Tailscale ACLs permit the connection.

Stop/change commands:

```bash
# Remove only the aws-cert-trainer private serve route on 8443.
tailscale serve --https=8443 off

# Stop the app container.
docker rm -f aws-cert-trainer

# Change the serve target after restarting the app on a different local port.
tailscale serve --https=8443 --bg http://127.0.0.1:<new-port>
```

Security caveats:

- Do not run `tailscale funnel` for this app unless Andrew explicitly asks for public exposure.
- Do not change the Docker port mapping to `0.0.0.0` or bare `9140:3000` for the private deployment.
- Do not attach this app to existing public Traefik/nginx routes; it assumes root paths (`/assets`, `/api`, `/health`) and is meant to sit behind the private tailnet URL.
- `/api/admin/reset` and `/api/admin/export` are currently unauthenticated, so tailnet/ACL access is the security boundary.

## Seed, reset, backup, and export

```bash
# Seed/reset the repo-local JSON snapshot before rebuilding, if needed.
npm run seed
npm run reset
npm run export

# Runtime API export through the private route.
curl https://vion-kanban-ec2.tail276347.ts.net:8443/api/admin/export > backups/vion-learning-export-$(date -u +%Y%m%dT%H%M%SZ).json

# Runtime reset through the private route.
curl -X POST https://vion-kanban-ec2.tail276347.ts.net:8443/api/admin/reset
```

The `docker run` command above bind-mounts `./var` and `./backups` into the container so seed/export artifacts remain available on the host.

## Troubleshooting

- `curl http://127.0.0.1:9140/health` fails: inspect `docker logs aws-cert-trainer` and `docker inspect --format '{{json .State.Health}}' aws-cert-trainer`.
- Tailnet URL fails but loopback works: run `tailscale status`, `tailscale serve status --json`, and reapply `tailscale serve --https=8443 --bg http://127.0.0.1:9140`.
- Browser loads blank/static asset 404s: ensure the app is served at `/` on its own HTTPS port, not under a path prefix.
- Port 8443 already in use in Tailscale Serve: pick another tailnet HTTPS port and update the verification URL/commands.

## Data model notes

Source corpora live in:

- `data/sources/clf-c02/*`
- `data/sources/aif-c01/*`

The app adapts these into a track-scoped runtime model in `src/lib/learningModel.js`. If a requested card/question/track does not belong to the route's `trackId`, the API rejects it rather than falling back to another certification.

## CLF-C02 content maintenance

Deep CLF-C02 AWS service/resource explanations live in `data/sources/clf-c02/resource_explanation_corpus.json`. Richer milestone-1 study content also lives in:

- `data/sources/clf-c02/concept_records.json`
- `data/sources/clf-c02/question_bank.json`

`src/lib/learningModel.js` adapts these static JSON files into track-scoped concept cards, curated scenario questions, generated reinforcement cards/questions, and answer-review mappings. The AIF-C01 track does not read these CLF-C02 files; keep AI Practitioner content under `data/sources/aif-c01/*` only.

When refreshing official sources or adding CLF-C02 content:

1. Refresh official AWS references first: the CLF-C02 exam guide, AWS Certification page, and the specific service documentation URLs cited in each entry.
2. For `concept_records.json`, add original teaching content only: scenario, exam angle, misconceptions, decision rules, services, concepts, difficulty, and source URLs. Keep the writing explanatory rather than dump-like.
3. For `question_bank.json`, every question must remain original and include:
   - one clearly correct answer
   - plausible distractors
   - explanation for the correct choice
   - explanation for each distractor
   - domain/service/concept/difficulty metadata
   - official/public source URLs
4. Do not paste real exam questions, brain dumps, or proprietary course text. If wording starts sounding suspiciously like leaked prep material, delete it and write the concept from first principles instead.
5. Preserve `track_id: "clf-c02"` in CLF content files and keep AIF-C01 content in its own tree.
6. Re-run `npm test`, `npm run lint`, and `npm run build`. For API validation, run the app and check `/health`, `/api/tracks/clf-c02`, `/api/tracks/clf-c02/resources`, and `/api/tracks/aif-c01/resources` to confirm track separation and richer quiz metadata.

Quality checks worth keeping an eye on:

- Quick 10 should mix question types and difficulty when the pool allows it.
- Correct answers should not cluster in one position across repeated runs.
- Distractors should be meaningfully different, not generic duplicates with new shoes.
- Every review screen should teach why the wrong answers are wrong, not merely announce that they are.

## Document upload ingestion

The learning site now exposes a private `/uploads` page for verified document intake. Upload routing is track-scoped, but the upload track list is intentionally broader than the learner track list:

- `clf-c02` and `aif-c01` remain full learner tracks.
- `german-b2-exam` is a personalized German B2 Exam tutor track built gradually from private user notes.
- `shared` remains a private/shared intake lane.

Phase-1 upload readiness is limited to these document inputs:

- `pdf`
- `txt`
- `markdown` (`.md`, `.markdown`)

ZIP bundle upload/unpacking is explicitly deferred and out of scope for this phase. Do not treat this list as general document-readiness: unsupported containers and rich office formats should remain in the manifest stage until a dedicated extractor, provenance mapping, and safety review exist.

Workflow:

1. Upload a supported document and fill in optional provenance fields.
2. The server stores the raw file under `var/uploads/<batch_id>/raw/` and writes a manifest with SHA-256 hashes.
3. User-upload verification bypasses only external source verification; local safety checks, hashes, track scoping, and provenance requirements still apply.
4. The staging script accepts plain UTF-8 text/markdown manifests directly, otherwise it tries `pdftotext`, then `tesseract` when OCR is needed.
5. Staged chunks are written to `var/uploads/<batch_id>/tracks/<track_id>-chunks.json`.
6. Jenkins can then call `scripts/rag-populate-db.mjs --apply --chunks-dir <batch>/tracks` to write the vector DB, optionally with live embeddings.

If the file cannot be extracted by the phase-1 path, the batch should stay in the manifest stage until a supported extractor is available. No citation, no answer; no extracted text, no staging.
