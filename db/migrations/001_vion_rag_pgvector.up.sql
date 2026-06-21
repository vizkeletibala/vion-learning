-- Vion Learning RAG pgvector schema
-- Apply with a credentialed migrator role, for example:
--   psql "$VION_RAG_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_vion_rag_pgvector.up.sql
-- Do not put secrets or connection strings in this file.

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS rag_tracks (
  track_id text PRIMARY KEY,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_sources (
  source_id text PRIMARY KEY,
  track_id text NOT NULL REFERENCES rag_tracks(track_id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  source_type text NOT NULL DEFAULT 'source',
  citation_text text NOT NULL,
  content_hash text,
  freshness_status text NOT NULL DEFAULT 'unknown' CHECK (freshness_status IN ('fresh', 'stale', 'needs_refresh', 'unverified', 'auth_gated', 'unavailable', 'unknown')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, url, source_id)
);

CREATE TABLE IF NOT EXISTS rag_ingest_jobs (
  ingest_job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL REFERENCES rag_tracks(track_id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('planned', 'running', 'succeeded', 'failed')),
  chunk_count integer NOT NULL DEFAULT 0,
  refreshed_count integer NOT NULL DEFAULT 0,
  unchanged_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS rag_chunks (
  chunk_id text PRIMARY KEY,
  track_id text NOT NULL REFERENCES rag_tracks(track_id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES rag_sources(source_id) ON DELETE CASCADE,
  url text NOT NULL,
  section_path text[] NOT NULL DEFAULT ARRAY[]::text[],
  citation_text text NOT NULL,
  content_hash text NOT NULL,
  freshness_status text NOT NULL DEFAULT 'unknown' CHECK (freshness_status IN ('fresh', 'stale', 'needs_refresh', 'unverified', 'auth_gated', 'unavailable', 'unknown')),
  chunk_text text NOT NULL,
  token_estimate integer,
  chunk_index integer NOT NULL,
  chunk_count integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, source_id, content_hash, chunk_index)
);

CREATE TABLE IF NOT EXISTS rag_embeddings (
  chunk_id text PRIMARY KEY REFERENCES rag_chunks(chunk_id) ON DELETE CASCADE,
  track_id text NOT NULL,
  source_id text NOT NULL,
  content_hash text NOT NULL,
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small' CHECK (embedding_model = 'text-embedding-3-small'),
  embedding_dimensions integer NOT NULL DEFAULT 1536 CHECK (embedding_dimensions = 1536),
  embedding vector(1536) NOT NULL,
  provider text NOT NULL DEFAULT 'openai',
  freshness_status text NOT NULL DEFAULT 'unknown' CHECK (freshness_status IN ('fresh', 'stale', 'needs_refresh', 'unverified', 'auth_gated', 'unavailable', 'unknown')),
  embedded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS rag_eval_cases (
  eval_case_id text PRIMARY KEY,
  track_id text NOT NULL REFERENCES rag_tracks(track_id) ON DELETE CASCADE,
  query text NOT NULL,
  expected_source_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  expected_concepts text[] NOT NULL DEFAULT ARRAY[]::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_eval_runs (
  eval_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL REFERENCES rag_tracks(track_id) ON DELETE CASCADE,
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS rag_eval_results (
  eval_result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_run_id uuid NOT NULL REFERENCES rag_eval_runs(eval_run_id) ON DELETE CASCADE,
  eval_case_id text NOT NULL REFERENCES rag_eval_cases(eval_case_id) ON DELETE CASCADE,
  track_id text NOT NULL,
  query text NOT NULL,
  retrieved_count integer NOT NULL DEFAULT 0,
  expected_concept_hit boolean NOT NULL DEFAULT false,
  expected_source_hit boolean NOT NULL DEFAULT false,
  citation_gate boolean NOT NULL DEFAULT false,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rag_eval_result_retrievals (
  eval_result_id uuid NOT NULL REFERENCES rag_eval_results(eval_result_id) ON DELETE CASCADE,
  rank integer NOT NULL,
  chunk_id text NOT NULL REFERENCES rag_chunks(chunk_id) ON DELETE CASCADE,
  track_id text NOT NULL,
  source_id text NOT NULL,
  url text NOT NULL,
  section_path text[] NOT NULL,
  citation_text text NOT NULL,
  content_hash text NOT NULL,
  freshness_status text NOT NULL,
  vector_score double precision,
  text_score double precision,
  hybrid_score double precision,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (eval_result_id, rank)
);

CREATE INDEX IF NOT EXISTS rag_sources_track_freshness_idx ON rag_sources (track_id, freshness_status);
CREATE INDEX IF NOT EXISTS rag_chunks_track_source_idx ON rag_chunks (track_id, source_id);
CREATE INDEX IF NOT EXISTS rag_chunks_track_freshness_idx ON rag_chunks (track_id, freshness_status);
CREATE INDEX IF NOT EXISTS rag_chunks_metadata_gin_idx ON rag_chunks USING gin (metadata jsonb_path_ops);
CREATE INDEX IF NOT EXISTS rag_chunks_section_path_gin_idx ON rag_chunks USING gin (section_path);
CREATE INDEX IF NOT EXISTS rag_chunks_search_vector_idx ON rag_chunks USING gin (to_tsvector('english', chunk_text));
CREATE INDEX IF NOT EXISTS rag_embeddings_track_source_idx ON rag_embeddings (track_id, source_id);
CREATE INDEX IF NOT EXISTS rag_embeddings_content_hash_idx ON rag_embeddings (content_hash);
CREATE INDEX IF NOT EXISTS rag_embeddings_embedding_hnsw_idx ON rag_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS rag_eval_cases_track_idx ON rag_eval_cases (track_id);
CREATE INDEX IF NOT EXISTS rag_eval_results_track_passed_idx ON rag_eval_results (track_id, passed);

GRANT USAGE ON SCHEMA public TO vion_rag_app, vion_rag_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON rag_tracks, rag_sources, rag_ingest_jobs, rag_chunks, rag_embeddings, rag_eval_cases, rag_eval_runs, rag_eval_results, rag_eval_result_retrievals TO vion_rag_app;
GRANT SELECT ON rag_tracks, rag_sources, rag_chunks, rag_embeddings, rag_eval_cases, rag_eval_runs, rag_eval_results, rag_eval_result_retrievals TO vion_rag_readonly;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vion_rag_app, vion_rag_readonly;

COMMIT;
