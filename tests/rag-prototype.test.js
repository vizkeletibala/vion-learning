import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from '../server/index.js';
import { loadLearningModel } from '../src/lib/learningModel.js';
import {
  RAG_EMBEDDING_DIMENSIONS,
  RAG_EMBEDDING_MODEL,
  buildRagChunks,
  createPgRagRetriever,
  createPgRagWriter,
  embedRagChunks,
  evaluateRagRetrieval,
  searchRagChunks,
} from '../src/lib/ragPrototype.js';

async function withServer(options, fn) {
  const server = createServer({ log: false, ...options });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('RAG chunking is track scoped, section aware, citation carrying, and freshness preserving', () => {
  const model = loadLearningModel();
  const result = buildRagChunks(model, { trackId: 'clf-c02', maxTokens: 80, overlapTokens: 20 });

  assert.equal(result.track_id, 'clf-c02');
  assert.equal(result.policy.primary_split, 'section_path');
  assert.equal(result.policy.overlap_tokens, 20);
  assert.ok(result.chunks.length >= 1);
  assert.equal(result.chunks.every((chunk) => chunk.track_id === 'clf-c02'), true);
  assert.equal(result.chunks.every((chunk) => Array.isArray(chunk.section_path) && chunk.section_path.length >= 2), true);
  assert.equal(result.chunks.every((chunk) => chunk.source_id && chunk.url && chunk.citation_text && chunk.content_hash && chunk.freshness_status), true);
  assert.equal(result.chunks.every((chunk) => chunk.metadata.source_kind === 'aws_doc_section'), true);
  assert.equal(result.chunks.some((chunk) => ['card', 'resource', 'question'].some((kind) => chunk.section_path.includes(kind))), false);

  const aif = buildRagChunks(model, { trackId: 'aif-c01', maxTokens: 80, overlapTokens: 20 });
  assert.equal(aif.chunks.some((chunk) => chunk.track_id === 'clf-c02' || chunk.id.startsWith('clf-c02:')), false);
});

test('RAG supports a SHARED source track without leaking certification-specific cards or questions', () => {
  const model = loadLearningModel();
  assert.ok(model.sourceRegistry.tracks.shared, 'expected a shared source registry track for cross-certification retrieval');

  const result = buildRagChunks(model, { trackId: 'shared', maxTokens: 80, overlapTokens: 20 });

  assert.equal(result.track_id, 'shared');
  assert.ok(result.chunks.length >= 1);
  assert.equal(result.chunks.every((chunk) => chunk.track_id === 'shared'), true);
  assert.equal(result.chunks.every((chunk) => chunk.source_id.startsWith('shared:')), true);
  assert.equal(result.chunks.some((chunk) => chunk.section_path.includes('card') || chunk.section_path.includes('question')), false);
  assert.equal(result.chunks.every((chunk) => chunk.metadata.shared_scope === true), true);
});

test('RAG embedding dry run never calls the network and refreshes only changed content hashes', async () => {
  const model = loadLearningModel();
  const { chunks } = buildRagChunks(model, { trackId: 'clf-c02', maxTokens: 80, overlapTokens: 20 });
  const sample = chunks.slice(0, 3);
  const previous = new Map(sample.map((chunk) => [chunk.id, { content_hash: chunk.content_hash, embedding_status: 'embedded' }]));
  previous.set(sample[1].id, { content_hash: 'sha256:changed', embedding_status: 'embedded' });

  const result = await embedRagChunks(sample, { mode: 'dry-run', previousEmbeddings: previous });

  assert.equal(result.model, RAG_EMBEDDING_MODEL);
  assert.equal(result.dimensions, RAG_EMBEDDING_DIMENSIONS);
  assert.equal(result.requiresNetwork, false);
  assert.deepEqual(result.items.map((item) => item.embedding_status), ['unchanged', 'pending_refresh', 'unchanged']);
  assert.equal(result.items[1].refresh_reason, 'content_hash_changed');
});

test('RAG chunking deduplicates identical source text within a track', () => {
  const model = {
    tracks: {
      'clf-c02': {
        id: 'clf-c02',
        sources: [
          {
            id: 'clf-c02:aws-doc:duplicate-one',
            track_id: 'clf-c02',
            title: 'Duplicate one',
            url: 'https://docs.aws.amazon.com/example/one.html',
            citation_text: 'AWS duplicate one',
            freshness_status: 'fresh',
            sections: [{ id: 'one:intro', title: 'Intro', section_path: ['Intro'], text: 'Amazon S3 stores objects in buckets with durable storage.' }],
          },
          {
            id: 'clf-c02:aws-doc:duplicate-two',
            track_id: 'clf-c02',
            title: 'Duplicate two',
            url: 'https://docs.aws.amazon.com/example/two.html',
            citation_text: 'AWS duplicate two',
            freshness_status: 'fresh',
            sections: [{ id: 'two:intro', title: 'Intro', section_path: ['Intro'], text: 'Amazon S3 stores objects in buckets with durable storage.' }],
          },
        ],
        cards: [],
        questions: [],
        serviceResources: [],
      },
    },
  };

  const result = buildRagChunks(model, { trackId: 'clf-c02', maxTokens: 40, overlapTokens: 5 });

  assert.equal(result.chunk_count, 1);
  assert.equal(result.policy.deduplicate_by_content_hash, true);
  assert.equal(result.chunks[0].metadata.deduped_from.length, 1);
  assert.equal(result.chunks[0].metadata.deduped_from[0].source_id, 'clf-c02:aws-doc:duplicate-two');
});

test('RAG embedding force refresh ignores unchanged content hashes without changing the embedding model contract', async () => {
  const model = loadLearningModel();
  const { chunks } = buildRagChunks(model, { trackId: 'clf-c02', maxTokens: 80, overlapTokens: 20 });
  const sample = chunks.slice(0, 2);
  const previous = new Map(sample.map((chunk) => [chunk.id, { content_hash: chunk.content_hash, embedding_status: 'embedded' }]));

  const result = await embedRagChunks(sample, { mode: 'dry-run', previousEmbeddings: previous, forceRefresh: true });

  assert.equal(result.model, RAG_EMBEDDING_MODEL);
  assert.equal(result.dimensions, RAG_EMBEDDING_DIMENSIONS);
  assert.equal(result.force_refresh, true);
  assert.deepEqual(result.items.map((item) => item.embedding_status), ['pending_refresh', 'pending_refresh']);
  assert.deepEqual(result.items.map((item) => item.refresh_reason), ['force_refresh', 'force_refresh']);
});

test('RAG live embedding writer is explicit and writes only changed content hashes with provenance', async () => {
  const model = loadLearningModel();
  const { chunks } = buildRagChunks(model, { trackId: 'clf-c02', maxTokens: 80, overlapTokens: 20 });
  const sample = chunks.slice(0, 3);
  const previous = new Map(sample.map((chunk) => [chunk.id, { content_hash: chunk.content_hash, embedding_status: 'embedded' }]));
  previous.set(sample[1].id, { content_hash: 'sha256:changed', embedding_status: 'embedded' });
  const calls = [];
  const dbWriter = {
    async upsertChunks(rows) {
      calls.push(['chunks', rows]);
      return rows.length;
    },
    async upsertEmbeddings(rows) {
      calls.push(['embeddings', rows]);
      return rows.length;
    },
  };
  const embeddingClient = {
    async createEmbeddings({ model: embeddingModel, input }) {
      calls.push(['openai', { model: embeddingModel, input }]);
      return input.map((_, index) => Array.from({ length: RAG_EMBEDDING_DIMENSIONS }, (_value, dimension) => (dimension === 0 ? index + 1 : 0)));
    },
  };

  const result = await embedRagChunks(sample, {
    mode: 'live',
    previousEmbeddings: previous,
    dbWriter,
    embeddingClient,
    now: '2026-06-07T20:00:00.000Z',
  });

  assert.equal(result.requiresNetwork, true);
  assert.equal(result.refreshed_count, 1);
  assert.equal(result.unchanged_count, 2);
  assert.deepEqual(calls.find((call) => call[0] === 'openai')[1].input, [sample[1].text]);
  const chunkRows = calls.find((call) => call[0] === 'chunks')[1];
  assert.equal(chunkRows.length, 3);
  assert.deepEqual(chunkRows.map((row) => row.track_id), ['clf-c02', 'clf-c02', 'clf-c02']);
  const embeddingRows = calls.find((call) => call[0] === 'embeddings')[1];
  assert.equal(embeddingRows.length, 1);
  assert.equal(embeddingRows[0].chunk_id, sample[1].id);
  assert.equal(embeddingRows[0].content_hash, sample[1].content_hash);
  assert.equal(embeddingRows[0].embedding_model, RAG_EMBEDDING_MODEL);
  assert.equal(embeddingRows[0].embedding_dimensions, RAG_EMBEDDING_DIMENSIONS);
  assert.equal(embeddingRows[0].freshness_status, sample[1].freshness_status);
  assert.equal(embeddingRows[0].embedded_at, '2026-06-07T20:00:00.000Z');
});

test('RAG live embedding mode requires explicit writer and embedding client', async () => {
  await assert.rejects(
    () => embedRagChunks([{ id: 'chunk-1', content_hash: 'sha256:x', text: 'hello', track_id: 'clf-c02', source_id: 'source-1' }], { mode: 'live' }),
    /requires dbWriter and embeddingClient/,
  );
});

test('RAG pgvector migrations define vector schema, provenance indexes, and least-privilege grants', () => {
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
  const upSql = fs.readFileSync(path.join(migrationsDir, '001_vion_rag_pgvector.up.sql'), 'utf8');
  const downSql = fs.readFileSync(path.join(migrationsDir, '001_vion_rag_pgvector.down.sql'), 'utf8');

  assert.match(upSql, /CREATE EXTENSION IF NOT EXISTS vector/);
  assert.match(upSql, new RegExp(`embedding\\s+vector\\(${RAG_EMBEDDING_DIMENSIONS}\\)`));
  assert.match(upSql, new RegExp(`embedding_dimensions integer NOT NULL DEFAULT ${RAG_EMBEDDING_DIMENSIONS} CHECK \\(embedding_dimensions = ${RAG_EMBEDDING_DIMENSIONS}\\)`, 'i'));
  assert.match(upSql, new RegExp(RAG_EMBEDDING_MODEL));
  assert.match(upSql, /track_id/);
  assert.match(upSql, /source_id/);
  assert.match(upSql, /content_hash/);
  assert.match(upSql, /freshness_status/);
  assert.match(upSql, /CREATE INDEX .*hnsw/i);
  assert.match(upSql, /GRANT .* TO vion_rag_app/i);
  assert.match(upSql, /GRANT .* TO vion_rag_readonly/i);
  assert.doesNotMatch(upSql, /PASSWORD|127\.0\.0\.1:55432|postgres:\/\//i);
  assert.match(downSql, /DROP TABLE IF EXISTS rag_eval_result_retrievals/i);
  assert.match(downSql, /DROP TABLE IF EXISTS rag_sources/i);
});

test('content event migration creates outbox and job step audit schema', () => {
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
  const upSql = fs.readFileSync(path.join(migrationsDir, '002_content_events.up.sql'), 'utf8');
  const downSql = fs.readFileSync(path.join(migrationsDir, '002_content_events.down.sql'), 'utf8');

  assert.match(upSql, /CREATE TABLE IF NOT EXISTS content_event_outbox/);
  assert.match(upSql, /idempotency_key text NOT NULL UNIQUE/);
  assert.match(upSql, /CREATE TABLE IF NOT EXISTS rag_job_steps/);
  assert.match(upSql, /GRANT SELECT, INSERT, UPDATE, DELETE ON content_event_outbox, rag_job_steps TO vion_rag_app/);
  assert.match(downSql, /DROP TABLE IF EXISTS rag_job_steps/);
  assert.match(downSql, /DROP TABLE IF EXISTS content_event_outbox/);
});

test('RAG search requires citations and refuses generated answers when evidence is absent', () => {
  const model = loadLearningModel();
  const { chunks } = buildRagChunks(model, { trackId: 'clf-c02', maxTokens: 80, overlapTokens: 20 });

  const hit = searchRagChunks(chunks, { trackId: 'clf-c02', query: 'Amazon S3 storage', limit: 5 });
  assert.equal(hit.track_id, 'clf-c02');
  assert.equal(hit.answer.allowed, true);
  assert.match(hit.answer.text, /Sources:/);
  assert.ok(hit.results.length >= 1);
  assert.equal(hit.results.every((result) => result.citation_text && result.source_id), true);

  const noHit = searchRagChunks(chunks, { trackId: 'clf-c02', query: 'quantum banana syllabus', limit: 5, minScore: 999 });
  assert.equal(noHit.results.length, 0);
  assert.equal(noHit.answer.allowed, false);
  assert.equal(noHit.answer.status, 'source_verification_needed');
  assert.match(noHit.answer.reason, /No verified supporting AWS source chunks were found/);
});

test('RAG search visibly downgrades stale or unverified evidence instead of answering from it', () => {
  const chunk = {
    id: 'clf-c02:aws_doc_section:lambda:chunk-1',
    track_id: 'clf-c02',
    source_id: 'clf-c02:aws-doc:lambda',
    url: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html',
    section_path: ['clf-c02', 'source', 'Lambda', 'chunk-1'],
    citation_text: 'AWS Lambda docs',
    freshness_status: 'needs_refresh',
    content_hash: 'sha256:1',
    text: 'AWS Lambda runs code without provisioning servers.',
    metadata: { source_kind: 'aws_doc_section', concepts: ['Lambda'] },
  };

  const result = searchRagChunks([chunk], { trackId: 'clf-c02', query: 'Lambda servers', limit: 5 });

  assert.equal(result.results.length, 0);
  assert.equal(result.degraded_results.length, 1);
  assert.equal(result.answer.allowed, false);
  assert.equal(result.answer.status, 'source_verification_needed');
  assert.match(result.answer.reason, /needs_refresh/);
});

test('RAG live embedding writer persists source records separately from chunk-derived rows', async () => {
  const source = {
    id: 'clf-c02:aws-doc:lambda',
    track_id: 'clf-c02',
    title: 'AWS Lambda docs',
    url: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html',
    source_type: 'aws_docs',
    citation_text: 'AWS Lambda docs',
    content_hash: 'sha256:sourcehash',
    freshness_status: 'fresh',
    metadata: { record: true },
  };
  const chunk = {
    id: 'clf-c02:aws_doc_section:lambda:chunk-1',
    track_id: 'clf-c02',
    source_id: source.id,
    url: `${source.url}#intro`,
    section_path: ['clf-c02', 'source', 'Intro', 'chunk-1'],
    citation_text: source.citation_text,
    freshness_status: 'fresh',
    content_hash: 'sha256:chunkhash',
    text: 'AWS Lambda runs code without provisioning servers.',
    token_estimate: 7,
    chunk_index: 1,
    chunk_count: 1,
    metadata: { source_kind: 'aws_doc_section', source_record: source },
  };
  const calls = [];
  const dbWriter = {
    async upsertSources(rows) { calls.push(['sources', rows]); return rows.length; },
    async upsertChunks(rows) { calls.push(['chunks', rows]); return rows.length; },
    async upsertEmbeddings(rows) { calls.push(['embeddings', rows]); return rows.length; },
  };
  const embeddingClient = {
    async createEmbeddings({ input }) {
      return input.map(() => Array.from({ length: RAG_EMBEDDING_DIMENSIONS }, () => 0));
    },
  };

  await embedRagChunks([chunk], { mode: 'live', dbWriter, embeddingClient });

  const sourceRows = calls.find((call) => call[0] === 'sources')[1];
  assert.equal(sourceRows.length, 1);
  assert.equal(sourceRows[0].source_id, source.id);
  assert.equal(sourceRows[0].source_type, 'aws_docs');
  assert.equal(sourceRows[0].content_hash, 'sha256:sourcehash');
  assert.notEqual(sourceRows[0].content_hash, chunk.content_hash);
});

test('RAG pgvector writer inserts rag_sources from explicit source rows, not chunk rows', async () => {
  const queries = [];
  const writer = createPgRagWriter({ query: async (sql, params) => { queries.push({ sql, params }); return { rows: [] }; } });

  await writer.upsertSources([{ source_id: 'clf-c02:aws-doc:lambda', track_id: 'clf-c02', url: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html', title: 'AWS Lambda docs', source_type: 'aws_docs', citation_text: 'AWS Lambda docs', content_hash: 'sha256:sourcehash', freshness_status: 'fresh', metadata: {} }]);
  await writer.upsertChunks([{ chunk_id: 'chunk-1', track_id: 'clf-c02', source_id: 'clf-c02:aws-doc:lambda', url: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html#intro', section_path: ['Intro'], citation_text: 'AWS Lambda docs', content_hash: 'sha256:chunkhash', freshness_status: 'fresh', text: 'chunk text', token_estimate: 2, chunk_index: 1, chunk_count: 1, metadata: { source_kind: 'aws_doc_section' } }]);

  const sourceUpserts = queries.filter((query) => /INSERT INTO rag_sources/.test(query.sql));
  assert.equal(sourceUpserts.length, 1);
  assert.equal(sourceUpserts[0].params[4], 'aws_docs');
  assert.equal(sourceUpserts[0].params[6], 'sha256:sourcehash');
});

test('German B2 DB retriever refuses lesson search when embeddings are absent', async () => {
  const queries = [];
  const retriever = createPgRagRetriever({
    query: async (sql, params) => {
      queries.push({ sql, params });
      return { rows: [{ embedding_count: '0', chunk_count: '7' }] };
    },
  });

  const result = await retriever.searchUploadedDocuments({
    trackId: 'german-b2-exam',
    query: 'sich bewerben',
    sourceId: 'german-b2-exam:upload:upload-1781897753483:lektion_1.md',
  });

  assert.equal(result.track_id, 'german-b2-exam');
  assert.equal(result.results.length, 0);
  assert.equal(result.answer.allowed, false);
  assert.equal(result.answer.status, 'embedding_required');
  assert.match(result.answer.reason, /7 German B2 uploaded chunks but 0 embeddings/);
  assert.equal(queries[0].params[0], 'german-b2-exam');
  assert.match(queries[0].sql, /JOIN rag_embeddings/i);
});

test('German B2 DB retriever is track scoped, source scoped, and returns cited uploaded-document provenance', async () => {
  const queryEmbedding = Array.from({ length: RAG_EMBEDDING_DIMENSIONS }, (_, index) => (index === 0 ? 1 : 0));
  const rows = [
    {
      chunk_id: 'german-b2-exam:upload:upload-1781897753483:lektion_1.md:chunk-1',
      track_id: 'german-b2-exam',
      source_id: 'german-b2-exam:upload:upload-1781897753483:lektion_1.md',
      url: '',
      section_path: ['german-b2-exam', 'upload', 'lektion_1.md', 'chunk-1'],
      citation_text: 'Lektion 1',
      content_hash: 'sha256:german',
      freshness_status: 'unverified',
      chunk_text: 'sich bewerben bedeutet jelentkezni',
      chunk_metadata: { source_kind: 'uploaded_document', batch_id: 'upload-1781897753483', file_name: 'lektion_1.md', source_title: 'Lektion 1' },
      embedding_model: RAG_EMBEDDING_MODEL,
      embedding_dimensions: RAG_EMBEDDING_DIMENSIONS,
      score: 0.99,
    },
  ];
  const queries = [];
  const retriever = createPgRagRetriever({
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (/count/i.test(sql)) return { rows: [{ embedding_count: '1', chunk_count: '1' }] };
      return { rows };
    },
  });

  const result = await retriever.searchUploadedDocuments({
    trackId: 'german-b2-exam',
    query: 'sich bewerben',
    queryEmbedding,
    sourceId: 'german-b2-exam:upload:upload-1781897753483:lektion_1.md',
  });

  assert.equal(result.answer.allowed, true);
  assert.equal(result.results.length, 1);
  assert.equal(result.results.every((row) => row.track_id === 'german-b2-exam'), true);
  assert.equal(result.results.some((row) => row.source_id.startsWith('clf-c02:upload:')), false);
  assert.equal(result.results.every((row) => row.chunk_id && row.source_id && row.section_path && row.citation_text && row.content_hash && row.freshness_status && row.batch_id && row.file_name && row.snippet && row.embedding_model && typeof row.score === 'number'), true);
  assert.match(queries[1].sql, /JOIN rag_embeddings/i);
  assert.doesNotMatch(queries[1].sql, /aws_doc_section/);
  assert.equal(queries[1].params[0], 'german-b2-exam');
  assert.equal(queries[1].params[1], 'german-b2-exam:upload:upload-1781897753483:lektion_1.md');
});

test('RAG eval reports retrieval failures without inventing benchmark results', () => {
  const model = loadLearningModel();
  const { chunks } = buildRagChunks(model, { trackId: 'clf-c02', maxTokens: 80, overlapTokens: 20 });
  const report = evaluateRagRetrieval(chunks, {
    cases: [
      { id: 's3-foundation', track_id: 'clf-c02', query: 'S3 storage durability', expected_concepts: ['S3'], expected_source_ids: [] },
      { id: 'missing', track_id: 'clf-c02', query: 'quantum banana syllabus', expected_concepts: ['not-present'], expected_source_ids: [] },
    ],
    minScore: 2,
  });

  assert.equal(report.case_count, 2);
  assert.equal(report.results[0].passed, true);
  assert.equal(report.results[1].passed, false);
  assert.equal(report.no_benchmark_results_invented, true);
});

test('RAG HTTP admin endpoints are disabled by default and opt-in for local prototype use', async () => {
  await withServer({ rag: { enabled: false } }, async (base) => {
    const disabled = await fetch(`${base}/api/admin/rag/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trackId: 'clf-c02', query: 'S3' }),
    });
    assert.equal(disabled.status, 404);
  });

  await withServer({ rag: { enabled: true } }, async (base) => {
    const ingest = await fetch(`${base}/api/admin/rag/ingest?trackId=clf-c02`);
    assert.equal(ingest.status, 200);
    const ingestBody = await ingest.json();
    assert.equal(ingestBody.track_id, 'clf-c02');
    assert.ok(ingestBody.chunk_count > 20);

    const search = await fetch(`${base}/api/admin/rag/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trackId: 'clf-c02', query: 'Amazon S3 storage', limit: 3 }),
    });
    assert.equal(search.status, 200);
    const searchBody = await search.json();
    assert.equal(searchBody.answer.allowed, true);
    assert.equal(searchBody.results.every((result) => result.track_id === 'clf-c02'), true);
  });
});

test('RAG HTTP German B2 search uses DB-backed uploaded-document retrieval with citations', async () => {
  const rows = [
    {
      chunk_id: 'german-b2-exam:upload:upload-1781897753483:lektion_1.md:chunk-1',
      track_id: 'german-b2-exam',
      source_id: 'german-b2-exam:upload:upload-1781897753483:lektion_1.md',
      url: '',
      section_path: ['german-b2-exam', 'upload', 'lektion_1.md', 'chunk-1'],
      citation_text: 'Lektion 1',
      content_hash: 'sha256:german',
      freshness_status: 'unverified',
      chunk_text: 'sich bewerben bedeutet jelentkezni',
      chunk_metadata: { source_kind: 'uploaded_document', batch_id: 'upload-1781897753483', file_name: 'lektion_1.md' },
      embedding_model: RAG_EMBEDDING_MODEL,
      embedding_dimensions: RAG_EMBEDDING_DIMENSIONS,
      score: 0.95,
    },
  ];
  const queries = [];
  const dbClient = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (/COUNT/i.test(sql)) return { rows: [{ embedding_count: '1', chunk_count: '1' }] };
      return { rows };
    },
  };
  const embeddingClient = {
    async createEmbeddings({ input }) {
      assert.deepEqual(input, ['sich bewerben']);
      return [Array.from({ length: RAG_EMBEDDING_DIMENSIONS }, (_, index) => (index === 0 ? 1 : 0))];
    },
  };

  await withServer({ rag: { enabled: true, dbClient, embeddingClient } }, async (base) => {
    const search = await fetch(`${base}/api/admin/rag/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trackId: 'german-b2-exam', query: 'sich bewerben', sourceId: 'german-b2-exam:upload:upload-1781897753483:lektion_1.md' }),
    });
    assert.equal(search.status, 200);
    const body = await search.json();
    assert.equal(body.answer.allowed, true);
    assert.equal(body.results.length, 1);
    assert.equal(body.results[0].track_id, 'german-b2-exam');
    assert.equal(body.results[0].citation_text, 'Lektion 1');
    assert.equal(body.results[0].batch_id, 'upload-1781897753483');
  });

  assert.match(queries[1].sql, /JOIN rag_embeddings/i);
  assert.doesNotMatch(queries[1].sql, /aws_doc_section/);
});

test('RAG HTTP admin endpoints reject unauthorized enabled-mode requests unless the guard is satisfied', async () => {
  await withServer({ rag: { enabled: true, adminToken: 'test-rag-token' } }, async (base) => {
    const missingToken = await fetch(`${base}/api/admin/rag/ingest?trackId=clf-c02`);
    assert.equal(missingToken.status, 401);

    const wrongToken = await fetch(`${base}/api/admin/rag/ingest?trackId=clf-c02`, {
      headers: { authorization: 'Bearer wrong-token' },
    });
    assert.equal(wrongToken.status, 401);

    const authorized = await fetch(`${base}/api/admin/rag/ingest?trackId=clf-c02`, {
      headers: { authorization: 'Bearer test-rag-token' },
    });
    assert.equal(authorized.status, 200);
    const authorizedBody = await authorized.json();
    assert.equal(authorizedBody.track_id, 'clf-c02');
  });

  await withServer({ rag: { enabled: true } }, async (base) => {
    const remoteWithoutGuard = await fetch(`${base}/api/admin/rag/ingest?trackId=clf-c02`, {
      headers: { 'x-forwarded-host': 'public.example.com' },
    });
    assert.equal(remoteWithoutGuard.status, 403);
  });
});

test('RAG CLI exposes controlled commands without requiring DB credentials for dry-run operations', () => {
  const result = spawnSync(process.execPath, ['scripts/rag.mjs', 'ingest', '--track', 'clf-c02', '--dry-run'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.command, 'rag:ingest');
  assert.equal(payload.track_id, 'clf-c02');
  assert.equal(payload.db.enabled, false);
  assert.ok(payload.chunk_count > 20);

  const migrate = spawnSync(process.execPath, ['scripts/rag.mjs', 'migrate'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });
  assert.equal(migrate.status, 0, migrate.stderr);
  const migratePayload = JSON.parse(migrate.stdout);
  assert.deepEqual(migratePayload.up, [
    'db/migrations/001_vion_rag_pgvector.up.sql',
    'db/migrations/002_content_events.up.sql',
  ]);
  assert.deepEqual(migratePayload.down, [
    'db/migrations/002_content_events.down.sql',
    'db/migrations/001_vion_rag_pgvector.down.sql',
  ]);
});

test('RAG CLI eval covers CLF-C02 exam domains with citations or explicit refusals only', () => {
  const result = spawnSync(process.execPath, ['scripts/rag.mjs', 'eval', '--track', 'clf-c02'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.command, 'rag:eval');
  assert.equal(payload.track_id, 'clf-c02');
  assert.equal(payload.results.every((row) => row.track_id === 'clf-c02'), true);
  assert.equal(payload.results.some((row) => row.track_id === 'aif-c01'), false);

  const requiredScopes = [
    's3-durability-storage-classes',
    'iam-least-privilege-roles-users',
    'shared-responsibility-model',
    'vpc-basics-network-isolation',
    'pricing-support-billing-tools',
    'cloudwatch-vs-cloudtrail',
    'well-architected-basics',
  ];
  for (const scope of requiredScopes) {
    const row = payload.results.find((candidate) => candidate.id === `clf-c02-${scope}`);
    assert.ok(row, `missing eval scope ${scope}`);
    assert.equal(row.expected_outcome, 'cited_result');
    assert.equal(row.passed, true, `expected ${scope} to pass with cited retrieval`);
    assert.ok(row.retrieved_count > 0, `expected ${scope} to retrieve cited rows`);
    assert.equal(row.citation_gate, true, `expected ${scope} citations to be present`);
  }

  const refusal = payload.results.find((row) => row.id === 'clf-c02-no-citation-refusal');
  assert.ok(refusal, 'missing explicit no-citation refusal eval');
  assert.equal(refusal.expected_outcome, 'refusal');
  assert.equal(refusal.passed, true);
  assert.equal(refusal.retrieved_count, 0);
  assert.match(refusal.refusal_reason, /No cited retrieval results/);
  assert.ok(payload.case_count >= requiredScopes.length + 1);
  assert.equal(payload.failed_count, 0);
});
