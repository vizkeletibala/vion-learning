# German B2 lesson 1 embedding retrospective

Scope: `german-b2-exam` only, using lesson 1 as the evidence set.

This note is for the next German B2 lesson-ingestion / embedding iteration. It is intentionally operational rather than a diary.

## Evidence base

Observed lesson-1 state came from these completed lanes:

- RAG/vector verification report: `docs/reports/german-b2-lesson-1-rag-verification-t_331cfb45.md`
- Content contract report: `docs/reports/german-b2-lesson-1-content-contract-t_b3dfbd74.md`
- Final lesson integration handoff from `t_1ab64038`
- QA handoff from `t_b2f0b2df`
- Current implementation in `src/lib/learningModel.js`, especially the embedded lesson-1 fallback and provenance/retrieval metadata around `buildEmbeddedGermanB2Lesson1()`

Final implementation state, after the lesson-1 integration lane, is:

- Track: `german-b2-exam`
- Lesson surface: embedded lesson 1, not live vector retrieval
- Vocab: 23 source-backed items
- Grammar: 5 source-backed items
- Reading: 1 source-backed lesson-note exercise
- Writing: 2 retrieval-dependent/source-backed prompts
- Article status: no researched article source available
- Retrieval selection flow: `embedded_lesson_1_notes -> lesson_1_payload_tabs -> UI sections`
- DB vector status: embeddings still required before vector retrieval is honestly available

## What went wrong

### 1. Chunks existed, embeddings did not

Lesson-1 upload `upload-1781897753483` had 7 `rag_chunks` rows for source
`german-b2-exam:upload:upload-1781897753483:lektion_1.md`, but `german-b2-exam` had 0 `rag_embeddings` rows during verification.

Consequence: vector retrieval could not support vocab expansion, article matching, or writing-prompt selection. The correct behavior was to return or render `embedding_required`, not to pretend retrieval worked.

Next iteration rule: before assigning any retrieval-backed content task, verify both chunks and embeddings for the exact track/source scope.

### 2. Lesson metadata was not materialized for the rich upload

The rich lesson-1 upload had chunks in the DB, but the existing ingest jobs did not include `metadata.german_b2_lesson`. The app only loads DB-backed German lessons from successful `rag_ingest_jobs` where that metadata exists.

Consequence: the richer `upload-1781897753483` material could not appear through `/api/tracks/german-b2-exam`; the visible DB-backed lesson was only the tiny `german-b2-live-pipeline` draft with 1 vocab item, 5 grammar-ish items, 0 reading, and 0 writing.

Next iteration rule: treat source/chunk writes and lesson-payload materialization as separate gates. A chunk row is not a usable lesson.

### 3. Parser assumptions did not fit the lesson-1 source language

The older upload review packet flattened 77 items into `reading` because heading recognition did not cover the Hungarian headings used in the lesson note, such as `Szókincs`, `Nyelvtan`, `Olvasás`, and `Írás`.

A later non-mutating restage with the current parser was better (`reading: 8`, `vocab: 13`, `grammar: 28`, `writing: 13`), but table headers still leaked into content. Example failure: `| Német | Magyar | Megjegyzés |` can become a bogus vocab item such as `Német — Magyar` if not filtered.

Next iteration rule: parser acceptance must be based on the actual lesson source format, not English-only section names or optimistic markdown-table handling.

### 4. Admin search originally excluded German uploaded notes

The verified failure pattern was that `/api/admin/rag/search` returned 0 German results for representative lesson queries because the existing path used in-memory chunks and an AWS-only `source_kind === 'aws_doc_section'` filter. Uploaded German notes use `source_kind='uploaded_document'`.

Consequence: a staged/uploaded German note could exist and still be invisible to the operator search path.

Next iteration rule: German B2 search must use the DB-backed uploaded-document path and must not inherit AWS-only filters.

### 5. Cross-track leakage was real, not theoretical

The DB contained a German `lektion_1.md` upload under `clf-c02` as well as under `german-b2-exam`. A lexical query for German lesson terms could see both if retrieval did not force a track filter.

Consequence: any unscoped retrieval can leak German content into AWS certification tracks or vice versa.

Next iteration rule: every German B2 query must require `track_id='german-b2-exam'`, and lesson-specific retrieval should additionally scope by `source_id`, `lessonId`, or the lesson payload's source ids.

### 6. Article source coverage was absent

QA and source audit found no separate researched German article source for lesson 1. The only reading material was uploaded/embedded lesson notes.

Consequence: the implementation had to render a source-backed reading exercise from lesson notes and explicitly state that no researched article source was available. Fabricating an article would have violated the citation rule.

Next iteration rule: article matching requires a real article/source row first. If the research lane is missing, the product surface must expose a source gap rather than inventing article text.

## Working commands and checks

Use these from the project root, with secrets loaded through the environment and not printed.

### Confirm the target DB topology

Known local private target from the verification lanes:

- Container: `vion-rag-pgvector`
- Host access: `127.0.0.1:55433`
- Database: `vion_rag`
- Routine role: `vion_rag_app`

Do not use or expose public Postgres. Do not rely on `127.0.0.1:55432`; that mapped to `vion-rag-postgres-foundation` and rejected the current app-role password during earlier troubleshooting.

### Inspect DB counts before claiming retrieval is available

```sql
select
  c.track_id,
  count(distinct c.source_id) as sources,
  count(distinct c.chunk_id) as chunks,
  count(distinct e.chunk_id) as embedded_chunks
from rag_chunks c
left join rag_embeddings e
  on e.chunk_id = c.chunk_id
 and e.embedding_model = 'text-embedding-3-small'
 and e.embedding_dimensions = 1536
where c.track_id = 'german-b2-exam'
group by c.track_id;
```

Expected next-iteration gate:

- `chunks > 0`
- `embedded_chunks > 0` for vector retrieval
- for lesson-1 vector retrieval, embedded chunks must match the lesson-1 source scope, not just the track total

### Inspect lesson-1 source/chunk provenance

```sql
select
  c.chunk_id,
  c.track_id,
  c.source_id,
  c.section_path,
  c.citation_text,
  c.content_hash,
  c.freshness_status,
  c.url,
  c.metadata->>'batch_id' as batch_id,
  c.metadata->>'file_name' as file_name,
  e.embedding_model,
  e.embedding_dimensions
from rag_chunks c
left join rag_embeddings e on e.chunk_id = c.chunk_id
where c.track_id = 'german-b2-exam'
  and c.source_id = 'german-b2-exam:upload:upload-1781897753483:lektion_1.md'
order by c.chunk_index;
```

Required result fields for retrieval/citations:

- `track_id`
- `source_id`
- `chunk_id`
- `section_path`
- `citation_text`
- `content_hash`
- `freshness_status`
- `batch_id` / `file_name`
- embedding model/dimensions when vector mode is used

Empty `url` is acceptable for user-uploaded notes only if the UI/API honestly labels the source as internal/uploaded/unverified and still exposes the internal citation fields.

### Dry-run population before live writes

```bash
node scripts/rag-populate-db.mjs \
  --tracks german-b2-exam \
  --chunks-dir var/uploads/upload-1781897753483/tracks \
  --live-embeddings
```

The earlier dry run planned 1 source, 7 chunks, 7 embeddings, and 1 ingest job, with `apply=false`. Use this shape to confirm the script sees the expected artifact before adding `--apply`.

### Populate live only after env and DB target are verified

```bash
node scripts/rag-populate-db.mjs \
  --apply \
  --tracks german-b2-exam \
  --chunks-dir var/uploads/upload-1781897753483/tracks \
  --live-embeddings
```

Before running this, verify:

- `OPENAI_API_KEY` is present in the process environment but not printed
- the database URL resolves to the private `vion-rag-pgvector` target
- the app role can connect
- the artifact contains a `german_b2_review_packet` if the goal is to materialize a lesson, not just chunks/embeddings

### Verify live app behavior

Useful checks from the earlier lanes:

```bash
curl -sS http://127.0.0.1:9140/health
curl -sS http://127.0.0.1:9140/api/tracks/german-b2-exam
node --test tests/content-model.test.js tests/http-api.test.js tests/ui-interactions.test.js tests/upload-ingestion.test.js
npm run build
```

For the final lesson-1 integration, targeted tests passed with 35/35 in the implementation lane, and a larger targeted run passed 39/39 in the orchestrator handoff. Preserve those gates or replace them with stricter German B2-specific tests.

## Retrieval and embedding lessons for the next iteration

### Gate sequence

Use this sequence for lesson 2 or a lesson-1 re-ingest:

1. Stage source artifact.
2. Inspect staged JSON for `german_b2_review_packet` and sensible kind counts.
3. Reject or repair parser output if table headers/divider rows became lesson items.
4. Populate DB chunks and ingest job metadata.
5. Verify `metadata.german_b2_lesson` exists on the latest successful ingest job.
6. Run live embeddings with `text-embedding-3-small` only after DB target and OpenAI key presence are verified.
7. Query DB counts and lesson-specific embedded chunk counts.
8. Hit the app/API route and confirm lesson tabs use the intended lesson/source ids.
9. Run retrieval eval queries for vocab, reading, and writing prompts.
10. Browser/QA check that missing article or missing embedding states remain visible.

Do not start UI expansion before gates 2, 5, and 7 are green unless the task explicitly asks for an embedded fallback.

### Retrieval contract

For German B2 uploaded-note retrieval, every result must be source-citable and track-scoped:

```sql
where c.track_id = 'german-b2-exam'
  and c.metadata->>'source_kind' = 'uploaded_document'
  and c.citation_text <> ''
  and c.source_id <> ''
  and e.embedding_model = 'text-embedding-3-small'
  and e.embedding_dimensions = 1536
```

Prefer additional scope:

- `source_id = 'german-b2-exam:upload:upload-1781897753483:lektion_1.md'` for lesson 1
- or source ids from the active lesson payload

If there are chunks but no matching embeddings, return `embedding_required`. If there are embeddings but citation fields are missing, return `source_verification_needed`. No citation, no answer.

### Evaluation queries to keep

At minimum, run queries that cover the observed lesson-1 surfaces:

- Vocabulary: `die Erfahrung gemeinsam erfolgreich lernen`
- Writing prompt: `Wie lernt man am besten eine Sprache?`
- Reading: `Gemeinsam lernt man oft besser Erfahrung im Ausland Bahn Veranstaltung Wettkampf`
- Leakage guard: `erfahrung erfolgreich lernen` with `track_id='german-b2-exam'` must not return `clf-c02`
- Missing article guard: article-generation request must report no researched article source unless a real article source has been ingested

## Changes needed for reliable vocab expansion

1. Keep structured vocab source fields, not just display text.
   - Required: `term`, `hungarian`, `source_id`, `source_file`, `chunk_id`, `citation_text`.
   - For verbs: `present`, `past`, `perfect`, and `irregular` should be present when source material supports them.

2. Add parser tests using the actual lesson-1 Hungarian markdown shape.
   - Recognize `Szókincs`, `Nyelvtan`, `Olvasás`, `Írás`.
   - Skip vocab table headers such as `Német/Magyar/Megjegyzés`.
   - Skip markdown divider rows in all active sections.
   - Skip grammar table headers such as `Ige/Jelen idő/Präteritum/Perfekt/Magyar`.

3. Do not auto-expand from dictionaries or model priors.
   - Lesson 1 succeeded by using embedded/source-backed items; future expansion must cite the active lesson/source chunks.
   - If a desired vocab item is not in a cited source, it belongs in a research/content task, not in the retrieval layer.

## Changes needed for article matching

1. Create a research/source lane before promising article matching.
   - Lesson 1 had no separate researched article source.
   - The UI correctly had to avoid fabricated article text and label the reading as a source-backed lesson-note exercise.

2. Store article sources with normal provenance before retrieval.
   - Required: `track_id='german-b2-exam'`, `source_id`, URL or explicit internal-source marker, `citation_text`, `content_hash`, `freshness_status`, source title, and source kind.

3. Make article matching fail closed.
   - If no article source exists: `no_researched_article_source_available`.
   - If chunks exist but embeddings do not: `embedding_required`.
   - If citation/provenance is missing: `source_verification_needed`.

## Changes needed for writing-prompt retrieval

1. Writing prompts must depend on cited lesson content.
   - Lesson 1 used source-backed prompts around `Wie lernt man am besten eine Sprache?` and a 5-6 sentence learning-experience prompt.
   - Prompt helper words (`gemeinsam`, `regelmäßig`, `erfolgreich`, `üben`, `lernen`) should remain traceable to the lesson source.

2. Retrieval-backed prompts must expose retrieval status.
   - Embedded fallback can say `vector_status='not_required_for_embedded_source'`.
   - DB-backed prompts must require matching embeddings and citations.

3. Avoid silent lexical fallback.
   - If vector embeddings are absent, the app should not generate plausible prompts from memory or unscoped text search.

## Staffing and process gaps

- Missing research-lane coverage slowed the article/reading part of the work. The RAG and coder lanes could prove that no article source existed, but they could not legitimately create a researched article source without a dedicated research/source task.
- RAG verification happened after UI expectations were already being discussed. For future lessons, run the RAG/source audit first so frontend/coder tasks receive a known-good content contract rather than discovering missing embeddings, parser gaps, and absent article sources mid-implementation.
- The same German note appearing under `clf-c02` shows that ingestion/source routing needs an operator check before downstream agents rely on search results. Track isolation should be a required QA item, not an optional database note.

## Definition of ready for the next lesson iteration

A German B2 lesson is ready for retrieval-backed implementation only when all of these are true:

- Staged artifact has a `german_b2_review_packet` with plausible `vocab`, `grammar`, `reading`, and `writing` counts.
- Parser output has no table header/divider rows as lesson items.
- Latest successful DB ingest job has `metadata.german_b2_lesson` for the intended lesson/batch.
- `rag_chunks` rows exist for `track_id='german-b2-exam'` and the exact source/lesson scope.
- `rag_embeddings` rows exist for those chunks using `text-embedding-3-small` with 1536 dimensions, if vector retrieval is expected.
- Retrieval queries return only `german-b2-exam` chunks and include citation fields.
- Missing article or missing embedding states are visible to operators and learners.
- Tests cover content model shape, upload ingestion/parser behavior, HTTP payloads, UI tab behavior, and no cross-track leakage.

If any item is false, the correct next action is a blocked/source-gap/retry state, not fabricated lesson content.
