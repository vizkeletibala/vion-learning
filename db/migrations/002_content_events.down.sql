-- Roll back event outbox and job-step audit schema.
-- Apply with a credentialed migrator role only; no credentials belong in this file.

BEGIN;

DROP TABLE IF EXISTS rag_job_steps;
DROP TABLE IF EXISTS content_event_outbox;

COMMIT;
