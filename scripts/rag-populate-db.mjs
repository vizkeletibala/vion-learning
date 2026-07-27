#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { createOpenAiEmbeddingClient, createPgRagWriter, embedRagChunks, ragDbConfig } from '../src/lib/ragPrototype.js';
import { TRACK_IDS } from '../src/lib/sourceRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_CHUNKS_DIR = path.join(ROOT, 'var', 'rag');
const DEFAULT_TRACKS = [...TRACK_IDS];

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function parseTrackList(args) {
  const raw = args.tracks || args.track || '';
  if (!raw) return [...DEFAULT_TRACKS];
  return [...new Set(String(raw).split(',').map((value) => value.trim()).filter(Boolean))];
}

function resolveChunksDir(args) {
  return args['chunks-dir'] || args.chunksDir || DEFAULT_CHUNKS_DIR;
}

function boolArg(value) {
  return value === true || value === 'true' || value === '1';
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function chunkArtifactPath(trackId, chunksDir = DEFAULT_CHUNKS_DIR) {
  return path.join(chunksDir, `${trackId}-chunks.json`);
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

export function loadStagedChunkArtifacts({ tracks = DEFAULT_TRACKS, chunksDir = DEFAULT_CHUNKS_DIR, requireAll = true } = {}) {
  const artifacts = [];
  for (const trackId of tracks) {
    const filePath = chunkArtifactPath(trackId, chunksDir);
    if (!fs.existsSync(filePath)) {
      if (requireAll) throw new Error(`Missing staged chunk artifact for ${trackId}: ${filePath}`);
      continue;
    }
    const artifact = loadJson(filePath);
    if (artifact.track_id !== trackId) {
      throw new Error(`Staged artifact ${filePath} has track_id=${artifact.track_id}, expected ${trackId}`);
    }
    if (!Array.isArray(artifact.chunks)) {
      throw new Error(`Staged artifact ${filePath} is missing a chunks array`);
    }
    artifacts.push({
      track_id: trackId,
      file_path: filePath,
      schema_version: artifact.schema_version,
      generated_at: artifact.generated_at,
      batch_id: artifact.batch_id,
      chunk_count: artifact.chunk_count ?? artifact.chunks.length,
      policy: artifact.policy || {},
      german_b2_review_packet: artifact.german_b2_review_packet || null,
      chunks: artifact.chunks,
    });
  }
  return artifacts;
}

function sourceRowFromChunk(chunk) {
  const record = chunk.metadata?.source_record || {};
  const metadata = record.metadata || {};
  return {
    source_id: record.source_id || chunk.source_id,
    track_id: record.track_id || chunk.track_id,
    url: record.url || chunk.url,
    title: record.title || chunk.metadata?.source_title || chunk.source_id,
    source_type: record.source_type || chunk.metadata?.source_type || 'source',
    citation_text: record.citation_text || chunk.citation_text,
    content_hash: record.content_hash || null,
    freshness_status: record.freshness_status || chunk.freshness_status,
    last_checked_at: metadata.last_checked_at || chunk.metadata?.last_checked_at || null,
    metadata: {
      ...metadata,
      source_kind: chunk.metadata?.source_kind || metadata.source_kind || null,
      source_title: chunk.metadata?.source_title || record.title || null,
      backing_source_section_id: chunk.metadata?.backing_source_section_id || null,
      shared_scope: Boolean(chunk.metadata?.shared_scope),
    },
  };
}

function chunkRowFromChunk(chunk) {
  return {
    chunk_id: chunk.id,
    track_id: chunk.track_id,
    source_id: chunk.source_id,
    url: chunk.url,
    section_path: chunk.section_path || [],
    citation_text: chunk.citation_text,
    content_hash: chunk.content_hash,
    freshness_status: chunk.freshness_status,
    text: chunk.text,
    token_estimate: chunk.token_estimate,
    chunk_index: chunk.chunk_index,
    chunk_count: chunk.chunk_count,
    metadata: chunk.metadata || {},
  };
}

export function buildSourceRows(artifacts) {
  const rowsById = new Map();
  for (const artifact of artifacts) {
    for (const chunk of artifact.chunks || []) {
      const row = sourceRowFromChunk(chunk);
      if (!row.source_id) continue;
      if (!rowsById.has(row.source_id)) rowsById.set(row.source_id, row);
    }
  }
  return [...rowsById.values()];
}

export function buildChunkRows(artifacts) {
  return artifacts.flatMap((artifact) => (artifact.chunks || []).map(chunkRowFromChunk));
}

export function summarizeArtifacts(artifacts) {
  const trackSummaries = artifacts.map((artifact) => ({
    track_id: artifact.track_id,
    file_path: artifact.file_path,
    chunk_count: artifact.chunk_count,
    source_count: new Set((artifact.chunks || []).map((chunk) => chunk.metadata?.source_record?.source_id || chunk.source_id).filter(Boolean)).size,
  }));
  return {
    track_count: trackSummaries.length,
    chunk_count: trackSummaries.reduce((acc, item) => acc + item.chunk_count, 0),
    source_count: trackSummaries.reduce((acc, item) => acc + item.source_count, 0),
    tracks: trackSummaries,
  };
}

function germanB2LessonSourceType(artifact) {
  const packetTypes = unique((artifact.german_b2_review_packet?.content || []).map((item) => item.source_type));
  return packetTypes[0] || 'txt';
}

export function buildGermanB2LessonFromArtifact(artifact) {
  const packet = artifact?.german_b2_review_packet;
  if (!packet || artifact?.track_id !== 'german-b2-exam') return null;
  const content = Array.isArray(packet.content) ? packet.content : [];
  const sourceIds = unique(content.map((item) => item.source_id).concat((artifact.chunks || []).map((chunk) => chunk.source_id)));
  const sourceFiles = unique(content.map((item) => item.source_file));
  const titleBase = sourceFiles[0] || artifact.batch_id || 'German B2 upload';
  return {
    id: `german-b2-exam:lesson:${artifact.batch_id}`,
    track_id: 'german-b2-exam',
    title: `Uploaded notes: ${titleBase}`,
    source_type: germanB2LessonSourceType(artifact),
    source_ids: sourceIds,
    status: packet.review_status === 'needs_edit' ? 'draft' : 'review',
    content_version: Number(packet.content_version || 1),
    created_at: artifact.generated_at || new Date().toISOString(),
    updated_at: artifact.generated_at || new Date().toISOString(),
    review_packet: {
      ...packet,
      track_id: 'german-b2-exam',
      batch_id: artifact.batch_id,
      chunk_ids: unique(packet.chunk_ids || (artifact.chunks || []).map((chunk) => chunk.id)),
      source_ids: sourceIds,
      source_files: sourceFiles,
    },
    review_history: [],
  };
}

function ingestJobMetadata({ artifact, sourceCount, liveEmbeddings }) {
  const metadata = {
    populated_from: 'staged_artifacts',
    artifact_path: artifact.file_path,
    generated_at: artifact.generated_at,
    source_count: sourceCount,
    live_embeddings: Boolean(liveEmbeddings),
  };
  const germanB2Lesson = buildGermanB2LessonFromArtifact(artifact);
  if (germanB2Lesson) metadata.german_b2_lesson = germanB2Lesson;
  return metadata;
}

async function insertIngestJob(client, { trackId, artifact, sourceCount, chunkCount, refreshedCount, unchangedCount, liveEmbeddings, now }) {
  const result = await client.query(
    `INSERT INTO rag_ingest_jobs (track_id, status, chunk_count, refreshed_count, unchanged_count, started_at, completed_at, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING ingest_job_id, track_id, status, chunk_count, refreshed_count, unchanged_count, started_at, completed_at, metadata`,
    [
      trackId,
      'succeeded',
      chunkCount,
      refreshedCount,
      unchangedCount,
      now,
      now,
      JSON.stringify(ingestJobMetadata({ artifact, sourceCount, liveEmbeddings })),
    ],
  );
  return result.rows[0];
}

async function connectDatabase(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

export async function populateRagDatabase({
  tracks = DEFAULT_TRACKS,
  chunksDir = DEFAULT_CHUNKS_DIR,
  apply = false,
  liveEmbeddings = false,
  forceRefresh = false,
  connectionString = null,
  now = new Date().toISOString(),
  dbClient = null,
  dbWriter = null,
} = {}) {
  const artifacts = loadStagedChunkArtifacts({ tracks, chunksDir, requireAll: true });
  const summary = summarizeArtifacts(artifacts);
  const db = ragDbConfig();
  const connection = connectionString || process.env[db.connectionEnv] || process.env.VION_RAG_DATABASE_URL || process.env.DATABASE_URL;

  if (!apply) {
    return {
      command: 'rag:populate-db',
      apply: false,
      live_embeddings: Boolean(liveEmbeddings),
      force_refresh: Boolean(forceRefresh),
      db,
      ...summary,
      write_plan: {
        sources: summary.source_count,
        chunks: summary.chunk_count,
        embeddings: liveEmbeddings ? summary.chunk_count : 0,
        ingest_jobs: summary.track_count,
      },
    };
  }

  if (!dbClient && !connection) throw new Error('VION_RAG_DATABASE_URL or DATABASE_URL is required when --apply is used');
  const client = dbClient || await connectDatabase(connection);
  const writer = dbWriter || createPgRagWriter(client);
  let embeddingClient = null;
  const writeStats = [];

  try {
    await client.query('BEGIN');
    if (liveEmbeddings) embeddingClient = createOpenAiEmbeddingClient();

    for (const artifact of artifacts) {
      const chunks = artifact.chunks || [];
      const sourceRows = buildSourceRows([artifact]);
      const chunkRows = buildChunkRows([artifact]);
      let refreshedCount = 0;
      let unchangedCount = 0;
      let embeddingCount = 0;

      if (liveEmbeddings) {
        const result = await embedRagChunks(chunks, {
          mode: 'live',
          dbWriter: writer,
          embeddingClient,
          forceRefresh,
          now,
        });
        refreshedCount = result.refreshed_count;
        unchangedCount = result.unchanged_count;
        embeddingCount = result.written_embedding_count;
      } else {
        await writer.upsertSources(sourceRows);
        await writer.upsertChunks(chunkRows);
      }

      const ingestJob = await insertIngestJob(client, {
        trackId: artifact.track_id,
        artifact,
        sourceCount: sourceRows.length,
        chunkCount: chunkRows.length,
        refreshedCount,
        unchangedCount,
        liveEmbeddings,
        now,
      });

      writeStats.push({
        ingest_job_id: ingestJob.ingest_job_id,
        track_id: artifact.track_id,
        source_count: sourceRows.length,
        chunk_count: chunkRows.length,
        refreshed_count: refreshedCount,
        unchanged_count: unchangedCount,
        written_embedding_count: embeddingCount,
        metadata: ingestJob.metadata || {},
      });
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    if (!dbClient) await client.end();
  }

  return {
    command: 'rag:populate-db',
    apply: true,
    live_embeddings: Boolean(liveEmbeddings),
    force_refresh: Boolean(forceRefresh),
    db,
    ...summary,
    write_stats: writeStats,
    write_plan: {
      sources: summary.source_count,
      chunks: summary.chunk_count,
      embeddings: liveEmbeddings ? summary.chunk_count : 0,
      ingest_jobs: summary.track_count,
    },
  };
}

function usage() {
  console.log('Usage: node scripts/rag-populate-db.mjs [--apply] [--live-embeddings] [--force-refresh] [--tracks clf-c02,aif-c01,shared] [--chunks-dir var/rag]');
  console.log('  Reads staged chunk artifacts from var/rag/<track>-chunks.json and populates rag_tracks, rag_sources, rag_chunks, and rag_ingest_jobs.');
  console.log('  Add --live-embeddings to refresh rag_embeddings using OPENAI_API_KEY; otherwise this step only loads the staged source and chunk rows.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    usage();
    return;
  }

  const result = await populateRagDatabase({
    tracks: parseTrackList(args),
    chunksDir: path.resolve(String(args['chunks-dir'] || args.chunksDir || DEFAULT_CHUNKS_DIR)),
    apply: boolArg(args.apply),
    liveEmbeddings: boolArg(args['live-embeddings']),
    forceRefresh: boolArg(args['force-refresh']),
  });

  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
