# RAG milestone plan and source policy

Task: `t_d4b33d89`
Date: 2026-06-11
Scope: durable planning artifact for the Vion Learning RAG milestone and source-policy rollout. This document describes the repo as it exists now; it does not introduce runtime behavior.

## Current architecture summary

Vion Learning is a local/private AWS certification trainer with strict track scoping for `clf-c02` and `aif-c01` routes, data, sources, questions, and progress records. The current RAG/source-ingestion surface is intentionally local-first and opt-in:

- Source candidates and generated source artifacts are checked into the repo under `data/sources/*`; `README.md` documents the workflow around `data/sources/source_catalog.json`, per-track generated artifacts, `npm run ingest:sources`, `npm run sources:check`, and `npm run sources:report`.
- `src/lib/sourceRegistry.js` currently recognizes `clf-c02`, `aif-c01`, and `shared` source lanes. It validates catalog records, preserves provenance fields, fetches public sources with robots handling, computes hashes, and records freshness status.
- `docs/design/source-ingestion-schema.md` defines the static source artifact shape. It now describes `data/sources/clf-c02/ingested_sources.json`, `data/sources/aif-c01/ingested_sources.json`, and `data/sources/shared/ingested_sources.json`, while requiring folder/record track isolation and forbidding mixed CLF-C02/AIF-C01 interpretation.
- `src/lib/ragPrototype.js` builds section-aware RAG chunks from the learning model or source registry tracks. Chunk generation skips rows without a citation and URL, preserves `track_id`, `source_id`, `url`, `section_path`, `citation_text`, `content_hash`, `freshness_status`, and chunk `metadata`, and annotates each chunk with `text-embedding-3-small` / 1536-dimension embedding metadata.
- `src/lib/ragPrototype.js` dry-runs embedding refresh by default. Live mode requires a DB writer and OpenAI embedding client, compares prior `content_hash` values, and only refreshes changed or missing embeddings.
- `scripts/rag.mjs` exposes local CLI commands through `npm run rag:ingest`, `rag:embed`, `rag:search`, `rag:eval`, and `rag:migrate`.
- `db/migrations/001_vion_rag_pgvector.up.sql` is the current pgvector foundation. The CLI migration command is dry-plan by default; `--apply` requires a DB URL and `psql`.
- `server/index.js` exposes RAG admin routes only when explicitly enabled. The README states these are disabled by default and must remain localhost/private plus token guarded for any non-local/proxied use.

Known current conflicts and blockers from parent handoffs:

- The live runtime/tests currently support a `shared` track for cross-certification source retrieval. This conflicts with the stricter no-shared-corpus policy if that policy means no shared intake lane at all. This plan resolves the conflict by allowing `shared` only as a non-exam-serving intake/support lane; exam-facing RAG answers, cards, questions, and facts must use track-specific records or track-specific duplicates/overlays.
- `unavailable` is implemented in source/RAG code but was not consistently documented in older schema wording. This plan treats `unavailable` as an official supported freshness state.
- A parent rollout audit saw a transient gate-0 failure for `node scripts/rag.mjs ingest --track clf-c02 --dry-run` and `node --test tests/rag-prototype.test.js`; a separate parent audit later ran `node --test tests/rag-prototype.test.js tests/source-rag-ingestion.test.js` and passed 15/15. The acceptance gates below require current commands to pass at the time each phase is promoted.

## Source trust hierarchy

Use official AWS source authority before any convenience source. For the first exam-facing corpus, exclude third-party material from RAG answer/citation generation.

Order sources as follows:

1. Official AWS exam/certification pages and official exam guides for the specific exam track.
   - Examples: CLF-C02 and AIF-C01 exam guide PDFs/pages, official certification overview pages, official exam domain/task-statement material.
   - These are the only authority for exam scope, domain weights, task statements, in-scope/out-of-scope claims, duration, passing score, and similar exam facts.
2. Official AWS docs, FAQs, whitepapers, Well-Architected materials, and official AWS Training and Certification public landing pages.
   - These may support service explanations, architectural concepts, shared responsibility, support/pricing concepts, and training-plan context.
   - They must not outrank exam-guide/certification-page facts for scope or exam weighting.
3. Auth-gated AWS Skill Builder internals.
   - Public Skill Builder landing pages may be cataloged when available.
   - Auth-gated internals, labs, transcripts, official practice question text, or licensed course content must be marked `auth_gated` and kept as metadata/citation boundary only unless a separate licensed ingestion workflow is approved.
4. Third-party material.
   - Excluded from the first RAG corpus.
   - Third-party videos/articles may remain candidate teaching aids outside the first RAG corpus only if independently verified against official AWS public sources.
   - They must not drive quiz facts, exam claims, or RAG answers.

Track ownership rules:

- `clf-c02` records are the authority for CLF-C02-facing retrieval and learning artifacts.
- `aif-c01` records are the authority for AIF-C01-facing retrieval and learning artifacts.
- `shared` records, where present in the current repo, are supporting background/intake only. They may help discovery or explanations, but they must not be the only authority for certification-specific cards, questions, generated answers, or exam claims.
- If one AWS URL supports both CLF-C02 and AIF-C01, create track-specific records or overlays with separate domains, concepts, summaries, `exam_relevance`, and `separation_note`; do not dedupe certification-specific meaning by URL alone.

## Freshness and staleness rules

The supported source/RAG freshness vocabulary is:

- `fresh`: the source fetched or was manually verified successfully and remains inside its `stale_after_days` window.
- `stale`: the source was successfully fetched before, but the last successful check is outside the configured stale window.
- `needs_refresh`: a fetch failed, a content hash changed relative to the prior record, or a curator marked the record as needing review before it can be trusted for current answers.
- `unverified`: a source is cataloged but has not yet been verified by a successful check or approved manual review.
- `auth_gated`: the source is official but requires authenticated/licensed access; public workflow may retain metadata/citation boundary but must not ingest internal text.
- `unavailable`: public fetch is explicitly blocked or unreachable, such as robots exclusion or retired/unreachable content. Do not synthesize replacement content.

Operational rules:

- `sources:check` and tests must reject unsupported freshness values rather than silently normalizing them.
- RAG chunks must preserve source `freshness_status`; stale/unavailable/auth-gated records must not be silently promoted to `fresh` during chunking, embedding, or DB writes.
- Hash changes mean review is needed. A changed `content_hash` should produce `needs_refresh` / pending refresh behavior before answers depend on the changed text.
- Auth-gated and unavailable records may remain in the registry for provenance, but they are not enough to answer exam-facing questions unless a separate official public or licensed source supports the claim.

## Source registry and RAG artifact contract

Every exam-facing source record must preserve enough provenance to audit an answer back to an official source. Required source-level fields are the current schema contract plus the policy fields below:

- Stable id: `id` in the form `<track_id>:<source_type>:<slug-or-hash>`.
- Ownership: `track_id` matching the folder/lane (`clf-c02`, `aif-c01`, or `shared`).
- Publication identity: `title`, `source_type`, `url`, `publisher`.
- Scope mapping: `aws_service`, `domains`, `concepts`, `summary`, `extracted_facts`, and `exam_relevance`.
- Provenance/citation: `citation_text`, `license_or_usage_note`, `notes`, and if available section-level citation data.
- Freshness: `last_checked_at`, `retrieved_at`, `content_hash`, `freshness_status`, and `stale_after_days`.
- Separation: `exam_relevance.exam_code`, `question_use`, and `separation_note` must make clear whether a record is CLF-C02, AIF-C01, or shared/background only.

Every RAG chunk or DB row derived from those sources must preserve:

- `track_id`
- `source_id`
- `url`
- `section_path`
- `citation_text`
- `content_hash`
- `freshness_status`
- chunk text and token/chunk indexes
- embedding model/provider/dimensions metadata when embedded
- metadata needed for audit, including source kind/type, domain/concept/service tags when present, and shared-scope flags when present

No-citation/no-url rows must be skipped or refused. Retrieval output without cited results must not generate an answer.

## Phase order and milestone checklist

### Phase 0: gate-0 repo truth and command health

Goal: prove the local model/source/RAG surface loads on the current branch before promoting any RAG milestone.

Checklist:

- `npm run sources:check` passes.
- `node --test tests/rag-prototype.test.js tests/source-rag-ingestion.test.js` passes.
- `npm run rag:ingest -- --track clf-c02 --dry-run` returns JSON for `track_id=clf-c02` without DB/network prerequisites.
- Any previously observed missing generated source metadata or `initialProgress` import failures are resolved before rollout.

### Phase 1: CLF-C02 local source and chunk build

Goal: build the first corpus for CLF-C02 only.

Checklist:

- CLF-C02 source records prioritize official exam/certification pages and guides first, then official AWS docs/FAQs/whitepapers/training landing pages.
- Third-party material is excluded from the first RAG corpus.
- `npm run rag:ingest -- --track clf-c02 --dry-run` shows `policy.citation_required=true`, `policy.no_citation_no_answer=true`, and `policy.freshness_status_preserved=true`.
- Non-dry-run local chunk output, if generated, stays under ignored `var/rag/` and contains only `track_id=clf-c02` chunks.

### Phase 2: CLF-C02 cited retrieval eval

Goal: prove local retrieval refuses uncited answers and returns cited CLF-C02 answers for seeded eval cases.

Checklist:

- `npm run rag:eval -- --track clf-c02` passes with zero failed cases for the current accepted eval suite.
- Eval report confirms cited answers include `citation_text` and `source_id`.
- Refusal/no-citation cases refuse rather than hallucinate.
- Passing the current eval does not by itself override known source-breadth gaps; source-priority-map gaps remain curation work before broad product claims.

### Phase 3: private pgvector migration dry plan and apply

Goal: create the pgvector schema only in a private DB with explicit operator credentials.

Checklist:

- `npm run rag:migrate` prints the dry plan without applying changes.
- `VION_RAG_DATABASE_URL="$MIGRATOR_DATABASE_URL" npm run rag:migrate -- --apply` is used only for a private Postgres/pgvector instance with approved migrator credentials.
- Post-apply inspection confirms `rag_tracks`, `rag_sources`, `rag_chunks`, `rag_embeddings`, and eval tables/indexes/grants match the migration.
- No public DB, hardcoded password, committed `.env`, or superuser routine path is introduced.

### Phase 4: CLF-C02 live embedding refresh

Goal: write CLF-C02 chunks and embeddings only after a dry-run refresh plan proves what will change.

Checklist:

- `npm run rag:embed -- --track clf-c02` runs in dry-run mode and reports `requiresNetwork=false`, refreshed/pending counts, unchanged counts, model, and dimensions.
- Live mode is explicit: `OPENAI_API_KEY=... VION_RAG_DATABASE_URL="$APP_DATABASE_URL" npm run rag:embed -- --track clf-c02 --live`.
- DB verification proves only `clf-c02` rows were written for first rollout, content hashes match chunks, embedding model is `text-embedding-3-small`, dimensions are 1536, and freshness statuses are preserved.

### Phase 5: private/localhost RAG admin smoke

Goal: smoke-test the admin API without creating a public admin surface.

Checklist:

- RAG routes are disabled by default.
- If enabled, use local/private access plus `VION_RAG_ADMIN_TOKEN` for any non-local/proxied host.
- Smoke only the existing endpoints documented in README: ingest, embed dry-run, search, eval.
- Do not treat Host-header localhost checks as sufficient public security.

### Phase 6: AIF-C01 after CLF-C02 stability

Goal: repeat the pipeline for AIF-C01 only after CLF-C02 passes the local chunk, eval, migration, live refresh, and admin smoke gates.

Checklist:

- AIF-C01 starts as a separate `track_id=aif-c01` corpus with separate source records, chunks, eval cases, row counts, and retrieval filters.
- Shared AWS source URLs are duplicated into AIF-C01-specific records/overlays when they support AIF-C01 exam-facing claims.
- No CLF-C02 concepts, domain mappings, or quiz semantics are imported into AIF-C01 by shared URL dedupe.

## Acceptance gates by phase

Use current repo commands and artifacts only:

| Phase | Gate | Evidence |
|---|---|---|
| 0 | Source/RAG local health | `npm run sources:check`; `node --test tests/rag-prototype.test.js tests/source-rag-ingestion.test.js`; `npm run rag:ingest -- --track clf-c02 --dry-run` |
| 1 | CLF-C02 chunk build | Dry-run JSON with `track_id=clf-c02`, `chunk_count > 0`, citation/no-answer policy enabled, and preserved freshness/provenance fields |
| 2 | CLF-C02 retrieval eval | `npm run rag:eval -- --track clf-c02` with cited-result checks and no-citation refusal passing |
| 3 | Migration | `npm run rag:migrate` dry plan, then private `--apply` only with DB URL and verified schema/index/grants |
| 4 | Embedding refresh | dry-run embed plan first; live mode only with DB URL and `OPENAI_API_KEY`; DB row verification for CLF-C02-only writes |
| 5 | Admin smoke | RAG API disabled by default; explicit private/tokened enablement; existing admin endpoints smoke-tested only on local/private routes |
| 6 | AIF-C01 expansion | separate AIF-C01 sources/chunks/evals/DB counts; no mixed CLF/AIF retrieval |

## Non-goals and forbidden shortcuts

- No mixed-track corpus for exam-facing retrieval. `shared` is not a shortcut for a combined CLF-C02/AIF-C01 answer corpus.
- No no-citation answers. If retrieval cannot return cited source evidence, answer generation must refuse.
- No exam dumps, leaked questions, proprietary course text, unauthorized Skill Builder internals, or public copied course transcripts.
- No public admin endpoints. RAG admin remains disabled by default and private/token guarded when enabled.
- No unreviewed shared-source interpretations. Shared AWS sources require track-specific overlays/duplicates before they can drive CLF-C02 or AIF-C01 cards, questions, or claims.
- No stale/unavailable/auth-gated promotion to fresh without a successful fetch or reviewed manual verification.
- No live OpenAI/DB writes from default commands. Live embedding and migration require explicit credentials and operator intent.
- No treating current eval pass as proof that source breadth is complete; eval pass is a technical gate, not a corpus-completeness claim.
