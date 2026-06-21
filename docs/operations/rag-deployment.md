# Vion Learning private RAG operations

This runbook keeps the Vion Learning app and its pgvector RAG store private by default. The app is bound to loopback and can be published to the tailnet with Tailscale Serve; the database is also loopback-only and is never exposed as a public admin surface.

## Files and secrets

- Copy `.env.example` to `.env` on the deployment host and fill strong unique passwords there.
- `.env` and `.env.*` are ignored by git. Do not commit database URLs, OpenAI keys, or RAG admin tokens.
- RAG HTTP admin routes stay disabled unless `VION_RAG_API_ENABLED=1` is set. If enabled through a non-local hostname, also set `VION_RAG_ADMIN_TOKEN` and send it as a bearer token.

## Private app deployment

```bash
npm install
npm test
npm run build

docker compose up --build -d aws-cert-trainer
curl -fsS http://127.0.0.1:${VION_APP_HOST_PORT:-9140}/health

# If compose build fails because the host buildx plugin is too old, prebuild once
# and then start the reviewed compose service without rebuilding.
docker build -t vion-learning:kanban .
docker compose up -d --no-build aws-cert-trainer
```

Publish only after the loopback healthcheck passes:

```bash
tailscale serve status --json
sudo tailscale serve --https=8443 --bg http://127.0.0.1:${VION_APP_HOST_PORT:-9140}
curl -fsS https://vion-kanban-ec2.tail276347.ts.net:8443/health
```

Do not run `tailscale funnel`, do not bind Docker ports to `0.0.0.0`, and do not attach the app or database to public nginx/Traefik routes.

## pgvector profile

The database profile is opt-in so the static app can still run without credentials.

```bash
cp .env.example .env
# edit .env and replace every password/token placeholder

docker compose --profile rag up -d rag-db
docker compose --profile rag ps rag-db
docker compose --profile rag exec rag-db pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-vion_rag}"
```

Apply the reviewed schema after the db healthcheck is green:

```bash
# Preferred when the host has the PostgreSQL client installed.
VION_RAG_DATABASE_URL="$VION_RAG_MIGRATOR_DATABASE_URL" npm run rag:migrate -- --apply

# Fallback when the host does not have psql: run the reviewed migration from the rag-db container.
docker compose --profile rag exec -T rag-db \
  psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-vion_rag}" -v ON_ERROR_STOP=1 \
  < db/migrations/001_vion_rag_pgvector.up.sql
```

Schema dimension check: the application constant `RAG_EMBEDDING_DIMENSIONS` is `1536` for `text-embedding-3-small`, and `db/migrations/001_vion_rag_pgvector.up.sql` defines both `embedding_dimensions ... CHECK (embedding_dimensions = 1536)` and `embedding vector(1536)`. The test suite asserts these remain in sync.

## RAG refresh and re-embed

Dry-run commands are safe and do not call OpenAI or Postgres:

```bash
npm run rag:ingest -- --track clf-c02 --dry-run
npm run rag:embed -- --track clf-c02
npm run rag:search -- --track clf-c02 --query "Amazon S3 storage"
npm run rag:eval -- --track clf-c02
```

To generate local chunk artifacts:

```bash
npm run rag:ingest -- --track clf-c02
```

To populate the database from the staged chunk artifacts, write the sourced rows and chunk rows first. The default is dry-run; `--apply` writes the data and records an ingest job row. Use `--live-embeddings` only when `OPENAI_API_KEY` is present and you actually want `rag_embeddings` refreshed as well:

```bash
npm run rag:populate-db -- --tracks clf-c02,aif-c01,shared
VION_RAG_DATABASE_URL="$VION_RAG_DATABASE_URL" npm run rag:populate-db -- --apply --tracks clf-c02,aif-c01,shared
OPENAI_API_KEY="$OPENAI_API_KEY" VION_RAG_DATABASE_URL="$VION_RAG_DATABASE_URL" npm run rag:populate-db -- --apply --live-embeddings --tracks clf-c02,aif-c01,shared
```

To write live embeddings, use the app role connection string and an OpenAI key from the host environment. The writer refreshes only chunks whose `content_hash` is missing or changed:

```bash
OPENAI_API_KEY="$OPENAI_API_KEY" \
VION_RAG_DATABASE_URL="$VION_RAG_DATABASE_URL" \
npm run rag:embed -- --track clf-c02 --live
```

## Backups and restore

The compose file mounts `./backups` into the app and database containers.

App snapshot through the private route:

```bash
mkdir -p backups
curl -fsS https://vion-kanban-ec2.tail276347.ts.net:8443/api/admin/export \
  > backups/vion-learning-export-$(date -u +%Y%m%dT%H%M%SZ).json
```

Database logical backup from the loopback-only Postgres port:

```bash
mkdir -p backups
pg_dump "$VION_RAG_MIGRATOR_DATABASE_URL" \
  --format=custom \
  --file "backups/vion-rag-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Restore into a fresh local pgvector database after confirming the target is disposable:

```bash
pg_restore --clean --if-exists --no-owner \
  --dbname "$VION_RAG_MIGRATOR_DATABASE_URL" \
  backups/vion-rag-YYYYmmddTHHMMSSZ.dump
```

## Logs and smoke checks

```bash
docker compose logs --tail=100 aws-cert-trainer
docker compose --profile rag logs --tail=100 rag-db
docker inspect --format '{{json .State.Health}}' aws-cert-trainer
docker inspect --format '{{json .State.Health}}' vion-rag-pgvector
curl -fsS http://127.0.0.1:${VION_APP_HOST_PORT:-9140}/health
curl -fsS http://127.0.0.1:${VION_APP_HOST_PORT:-9140}/api/landing
npm run rag:eval -- --track clf-c02
```

If RAG admin HTTP routes are intentionally enabled for a local operator check:

```bash
VION_RAG_API_ENABLED=1 VION_RAG_ADMIN_TOKEN="$VION_RAG_ADMIN_TOKEN" npm run api
curl -fsS -H "X-Vion-Rag-Admin-Token: <configured-token>" \
  http://127.0.0.1:3000/api/admin/rag/ingest?trackId=clf-c02
```

Keep these routes off public paths; localhost or tailnet plus token is the intended boundary.
