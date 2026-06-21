#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_DB:=vion_rag}"
: "${VION_RAG_APP_PASSWORD:?VION_RAG_APP_PASSWORD is required}"
: "${VION_RAG_READONLY_PASSWORD:?VION_RAG_READONLY_PASSWORD is required}"
: "${VION_RAG_MIGRATOR_PASSWORD:?VION_RAG_MIGRATOR_PASSWORD is required}"

psql --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB}" \
  --set=ON_ERROR_STOP=1 \
  --set=database="${POSTGRES_DB}" \
  --set=app_password="${VION_RAG_APP_PASSWORD}" \
  --set=readonly_password="${VION_RAG_READONLY_PASSWORD}" \
  --set=migrator_password="${VION_RAG_MIGRATOR_PASSWORD}" <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vion_rag_app') THEN
    CREATE ROLE vion_rag_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vion_rag_readonly') THEN
    CREATE ROLE vion_rag_readonly LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vion_rag_migrator') THEN
    CREATE ROLE vion_rag_migrator LOGIN;
  END IF;
END
$$;
ALTER ROLE vion_rag_app PASSWORD :'app_password';
ALTER ROLE vion_rag_readonly PASSWORD :'readonly_password';
ALTER ROLE vion_rag_migrator PASSWORD :'migrator_password';
GRANT CONNECT ON DATABASE :"database" TO vion_rag_app, vion_rag_readonly, vion_rag_migrator;
GRANT CREATE ON SCHEMA public TO vion_rag_migrator;
SQL
