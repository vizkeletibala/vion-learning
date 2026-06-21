-- Roll back Vion Learning RAG pgvector schema objects.
-- Apply with a credentialed migrator role only; no credentials belong in this file.

BEGIN;

DROP TABLE IF EXISTS rag_eval_result_retrievals;
DROP TABLE IF EXISTS rag_eval_results;
DROP TABLE IF EXISTS rag_eval_runs;
DROP TABLE IF EXISTS rag_eval_cases;
DROP TABLE IF EXISTS rag_embeddings;
DROP TABLE IF EXISTS rag_chunks;
DROP TABLE IF EXISTS rag_ingest_jobs;
DROP TABLE IF EXISTS rag_sources;
DROP TABLE IF EXISTS rag_tracks;

COMMIT;
