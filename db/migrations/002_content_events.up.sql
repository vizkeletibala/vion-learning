-- Event outbox and job-step audit schema for content-driven German tutor pipelines.
-- Apply after 001_vion_rag_pgvector.up.sql with a credentialed migrator role.
-- Do not put secrets or connection strings in this file.

BEGIN;

CREATE TABLE IF NOT EXISTS content_event_outbox (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  track_id text REFERENCES rag_tracks(track_id) ON DELETE SET NULL,
  batch_id text,
  ingest_job_id uuid REFERENCES rag_ingest_jobs(ingest_job_id) ON DELETE SET NULL,
  idempotency_key text NOT NULL UNIQUE,
  event_version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_artifact_path text,
  source_artifact_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatching', 'delivered', 'failed', 'dead_letter')),
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS content_event_outbox_status_next_idx ON content_event_outbox (status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS content_event_outbox_track_created_idx ON content_event_outbox (track_id, created_at);
CREATE INDEX IF NOT EXISTS content_event_outbox_aggregate_idx ON content_event_outbox (aggregate_type, aggregate_id, created_at);
CREATE INDEX IF NOT EXISTS content_event_outbox_payload_gin_idx ON content_event_outbox USING gin (payload jsonb_path_ops);

CREATE TABLE IF NOT EXISTS rag_job_steps (
  job_step_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_job_id uuid NOT NULL REFERENCES rag_ingest_jobs(ingest_job_id) ON DELETE CASCADE,
  step_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ingest_job_id, step_type)
);

CREATE INDEX IF NOT EXISTS rag_job_steps_status_idx ON rag_job_steps (status, step_type, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON content_event_outbox, rag_job_steps TO vion_rag_app;
GRANT SELECT ON content_event_outbox, rag_job_steps TO vion_rag_readonly;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vion_rag_app, vion_rag_readonly;

COMMIT;
