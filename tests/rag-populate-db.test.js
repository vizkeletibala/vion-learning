import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildChunkRows, buildGermanB2LessonFromArtifact, buildSourceRows, loadStagedChunkArtifacts, populateRagDatabase, summarizeArtifacts } from '../scripts/rag-populate-db.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const RAG_DIR = path.join(ROOT, 'var', 'rag');

test('staged rag artifacts load from var/rag and summarize deterministically', () => {
  const artifacts = loadStagedChunkArtifacts({ chunksDir: RAG_DIR, tracks: ['clf-c02', 'aif-c01', 'shared'] });
  const summary = summarizeArtifacts(artifacts);

  assert.equal(summary.track_count, 3);
  assert.equal(summary.tracks.length, 3);
  assert.equal(summary.tracks.find((track) => track.track_id === 'clf-c02').chunk_count, 191);
  assert.equal(summary.tracks.find((track) => track.track_id === 'aif-c01').chunk_count, 3);
  assert.equal(summary.tracks.find((track) => track.track_id === 'shared').chunk_count, 1);
  assert.equal(summary.chunk_count, 195);
  assert.ok(summary.source_count > 0);
});

test('staged rag artifacts can be transformed into unique source and chunk rows', () => {
  const artifacts = loadStagedChunkArtifacts({ chunksDir: RAG_DIR, tracks: ['clf-c02'] });
  const sourceRows = buildSourceRows(artifacts);
  const chunkRows = buildChunkRows(artifacts);

  assert.ok(sourceRows.length > 0);
  assert.equal(chunkRows.length, artifacts[0].chunks.length);
  assert.equal(sourceRows.some((row) => row.source_id === 'clf-c02:aws-certification-page:certified-cloud-practitioner'), true);

  const firstChunk = artifacts[0].chunks[0];
  const firstSource = sourceRows.find((row) => row.source_id === firstChunk.metadata.source_record.source_id);
  assert.equal(firstSource.last_checked_at, firstChunk.metadata.source_record.metadata.last_checked_at);
  assert.equal(firstSource.metadata.backing_source_section_id, firstChunk.metadata.backing_source_section_id);
  assert.equal(firstSource.metadata.source_kind, firstChunk.metadata.source_kind);
  assert.equal(chunkRows[0].chunk_id, firstChunk.id);
  assert.equal(chunkRows[0].metadata.source_kind, firstChunk.metadata.source_kind);
});

test('staged rag database population defaults to a dry-run write plan', async () => {
  const result = await populateRagDatabase({
    tracks: ['shared'],
    chunksDir: RAG_DIR,
    apply: false,
    liveEmbeddings: false,
  });

  assert.equal(result.apply, false);
  assert.equal(result.write_plan.sources, 1);
  assert.equal(result.write_plan.chunks, 1);
  assert.equal(result.write_plan.embeddings, 0);
  assert.equal(result.tracks[0].track_id, 'shared');
});

test('German B2 staged artifacts can be converted into lesson metadata persisted on ingest jobs', async () => {
  const artifact = {
    track_id: 'german-b2-exam',
    file_path: '/tmp/german-b2-exam-chunks.json',
    batch_id: 'batch-123',
    generated_at: '2026-06-19T12:00:00.000Z',
    chunk_count: 1,
    policy: {},
    chunks: [{ id: 'chunk-1', source_id: 'german-b2-exam:upload:batch-123:lektion-1-md' }],
    german_b2_review_packet: {
      schema_version: 'german-b2-note-review/v1',
      review_status: 'review',
      content_version: 1,
      chunk_ids: ['chunk-1'],
      content: [
        {
          id: 'v1',
          kind: 'vocab',
          term: 'sich bewerben',
          hungarian: 'jelentkezni',
          source_id: 'german-b2-exam:upload:batch-123:lektion-1-md',
          source_file: 'lektion-1.md',
          source_type: 'markdown',
        },
      ],
      validation: { issues: [] },
    },
  };

  const lesson = buildGermanB2LessonFromArtifact(artifact);
  assert.equal(lesson.id, 'german-b2-exam:lesson:batch-123');
  assert.equal(lesson.title, 'Uploaded notes: lektion-1.md');
  assert.equal(lesson.status, 'review');
  assert.equal(lesson.source_type, 'markdown');
  assert.deepEqual(lesson.source_ids, ['german-b2-exam:upload:batch-123:lektion-1-md']);
  assert.equal(lesson.review_packet.schema_version, 'german-b2-note-review/v1');

  const queries = [];
  const fakeClient = {
    async query(sql, params) {
      queries.push({ sql, params });
      return { rows: [] };
    },
  };
  const fakeWriter = {
    async upsertSources() { return 1; },
    async upsertChunks() { return 1; },
  };

  const chunksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'german-b2-rag-test-'));
  fs.writeFileSync(path.join(chunksDir, 'german-b2-exam-chunks.json'), `${JSON.stringify(artifact, null, 2)}\n`);

  const result = await populateRagDatabase({
    tracks: ['german-b2-exam'],
    chunksDir,
    apply: true,
    liveEmbeddings: false,
    dbClient: fakeClient,
    dbWriter: fakeWriter,
    now: '2026-06-19T12:00:00.000Z',
  });

  fs.rmSync(chunksDir, { recursive: true, force: true });

  assert.equal(result.apply, true);
  const ingestInsert = queries.find((entry) => entry.sql.includes('INSERT INTO rag_ingest_jobs'));
  assert.ok(ingestInsert);
  const metadata = JSON.parse(ingestInsert.params[7]);
  assert.equal(metadata.german_b2_lesson.review_packet.schema_version, 'german-b2-note-review/v1');
  assert.equal(metadata.german_b2_lesson.source_ids.length > 0, true);
  assert.equal(metadata.german_b2_lesson.review_packet.source_ids.length > 0, true);
});
