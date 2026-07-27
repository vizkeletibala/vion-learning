import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Busboy from 'busboy';
import { appendLesson, loadLearningModel, landingPayload, trackPayload, sourcesPayload, resourcesPayload, createQuiz, evaluateAnswer, markCard, exportSnapshot } from '../src/lib/learningModel.js';
import { buildRagChunks, createOpenAiEmbeddingClient, createPgRagRetriever, embedRagChunks, evaluateRagRetrieval, ragDbConfig, searchRagChunks } from '../src/lib/ragPrototype.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
let model = loadLearningModel();

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function safeName(value) {
  return String(value || 'upload').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload';
}

function uploadsRoot() {
  return path.join(ROOT, 'var', 'uploads');
}

function batchDirFor(batchId) {
  return path.join(uploadsRoot(), safeName(batchId));
}

function manifestPathFor(batchDir) {
  return path.join(batchDir, 'manifest.json');
}

function parseMultipartForm(req, { targetDir }) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];
    const pendingWrites = [];
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      fs.accessSync(targetDir, fs.constants.W_OK);
      const mode = fs.statSync(targetDir).mode;
      if ((mode & 0o222) === 0) {
        const error = new Error(`permission denied: upload target is not writable: ${targetDir}`);
        error.code = 'EACCES';
        throw error;
      }
    } catch (error) {
      reject(error);
      return;
    }
    const busboy = Busboy({ headers: req.headers });
    busboy.on('field', (name, value) => {
      fields[name] = value;
    });
    busboy.on('file', (name, file, info) => {
      const filename = safeName(info.filename || `${name}.bin`);
      const filePath = path.join(targetDir, filename);
      const hash = crypto.createHash('sha256');
      const writeStream = fs.createWriteStream(filePath);
      let size = 0;
      const writeDone = new Promise((writeResolve, writeReject) => {
        writeStream.on('finish', () => {
          files.push({
            field_name: name,
            filename,
            path: filePath,
            mime_type: info.mimeType || 'application/octet-stream',
            size,
            sha256: `sha256:${hash.digest('hex')}`,
          });
          writeResolve();
        });
        writeStream.on('error', writeReject);
        file.on('error', writeReject);
      });
      pendingWrites.push(writeDone);
      file.on('data', (chunk) => {
        size += chunk.length;
        hash.update(chunk);
      });
      file.pipe(writeStream);
    });
    busboy.on('error', reject);
    busboy.on('finish', async () => {
      try {
        await Promise.all(pendingWrites);
        resolve({ fields, files });
      } catch (error) {
        reject(error);
      }
    });
    req.pipe(busboy);
  });
}

function uploadManifestFrom({ batchId, trackId, fields, files }) {
  return {
    batch_id: batchId,
    track_id: trackId || fields.trackId || fields.track_id || 'shared',
    title: fields.title || '',
    source_url: fields.sourceUrl || fields.source_url || '',
    source_type: fields.sourceType || fields.source_type || 'uploaded_document',
    notes: fields.notes || '',
    uploaded_at: new Date().toISOString(),
    verification: {
      verified_at: null,
      file_count: files.length,
      warnings: [],
    },
    files: files.map((file) => ({
      name: file.filename,
      path: file.path,
      mime_type: file.mime_type,
      size: file.size,
      sha256: file.sha256,
      extracted_text: isTextLike(file.mime_type, file.filename) ? fs.readFileSync(file.path, 'utf8') : '',
      extracted_with: isTextLike(file.mime_type, file.filename) ? 'utf8' : null,
      source_url: fields.sourceUrl || fields.source_url || '',
      title: fields.title || file.filename,
      source_type: fields.sourceType || fields.source_type || 'uploaded_document',
      citation_text: fields.citationText || fields.citation_text || '',
    })),
  };
}

function isTextLike(mimeType = '', filename = '') {
  const lower = String(filename || '').toLowerCase();
  return mimeType.startsWith('text/') || ['text/plain', 'text/markdown', 'application/json', 'text/csv'].includes(mimeType) || lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.json') || lower.endsWith('.csv') || lower.endsWith('.yml') || lower.endsWith('.yaml');
}

function runNodeScript(scriptName, args, env = {}) {
  const result = spawnSync('node', [path.join(ROOT, 'scripts', scriptName), ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  if (result.error) throw new Error(`${scriptName} failed to start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${scriptName} failed (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout;
}

function writeJson(filePath, body) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(body, null, 2)}\n`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeContentEvent(body = {}) {
  const eventType = String(body.event_type || body.eventType || '').trim();
  const aggregateType = String(body.aggregate_type || body.aggregateType || '').trim();
  const aggregateId = String(body.aggregate_id || body.aggregateId || '').trim();
  if (!eventType) throw new Error('content_event_requires_event_type');
  if (!aggregateType) throw new Error('content_event_requires_aggregate_type');
  if (!aggregateId) throw new Error('content_event_requires_aggregate_id');
  const payload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload : {};
  const eventVersion = Number(body.event_version || body.eventVersion || 1);
  const idempotencyKey = String(body.idempotency_key || body.idempotencyKey || '').trim() || `${eventType}:${aggregateType}:${aggregateId}:${sha256(stableJson({
    batch_id: body.batch_id || body.batchId || null,
    ingest_job_id: body.ingest_job_id || body.ingestJobId || null,
    payload,
    source_artifact_hash: body.source_artifact_hash || body.sourceArtifactHash || null,
    track_id: body.track_id || body.trackId || null,
  })).slice(0, 16)}`;
  return {
    event_type: eventType,
    aggregate_type: aggregateType,
    aggregate_id: aggregateId,
    track_id: body.track_id || body.trackId || null,
    batch_id: body.batch_id || body.batchId || null,
    ingest_job_id: body.ingest_job_id || body.ingestJobId || null,
    idempotency_key: idempotencyKey,
    event_version: Number.isFinite(eventVersion) && eventVersion > 0 ? eventVersion : 1,
    payload,
    source_artifact_path: body.source_artifact_path || body.sourceArtifactPath || null,
    source_artifact_hash: body.source_artifact_hash || body.sourceArtifactHash || null,
  };
}

function serializeContentEventRow(row = {}) {
  return {
    event_id: row.event_id,
    event_type: row.event_type,
    aggregate_type: row.aggregate_type,
    aggregate_id: row.aggregate_id,
    track_id: row.track_id,
    batch_id: row.batch_id,
    ingest_job_id: row.ingest_job_id,
    idempotency_key: row.idempotency_key,
    event_version: Number(row.event_version || 1),
    payload: row.payload || {},
    source_artifact_path: row.source_artifact_path,
    source_artifact_hash: row.source_artifact_hash,
    status: row.status || 'pending',
    attempt_count: Number(row.attempt_count || 0),
    next_attempt_at: row.next_attempt_at,
    created_at: row.created_at,
    delivered_at: row.delivered_at,
  };
}

function createPgContentEventStore(client) {
  return {
    async insert(event) {
      const result = await client.query(
        `INSERT INTO content_event_outbox (
           event_type, aggregate_type, aggregate_id, track_id, batch_id, ingest_job_id,
           idempotency_key, event_version, payload, source_artifact_path, source_artifact_hash
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
         ON CONFLICT (idempotency_key) DO UPDATE SET
           payload = EXCLUDED.payload,
           source_artifact_path = EXCLUDED.source_artifact_path,
           source_artifact_hash = EXCLUDED.source_artifact_hash
         RETURNING event_id, event_type, aggregate_type, aggregate_id, track_id, batch_id, ingest_job_id,
                   idempotency_key, event_version, payload, source_artifact_path, source_artifact_hash,
                   status, attempt_count, next_attempt_at, created_at, delivered_at`,
        [
          event.event_type,
          event.aggregate_type,
          event.aggregate_id,
          event.track_id,
          event.batch_id,
          event.ingest_job_id,
          event.idempotency_key,
          event.event_version,
          JSON.stringify(event.payload || {}),
          event.source_artifact_path,
          event.source_artifact_hash,
        ],
      );
      return result.rows[0];
    },
  };
}

async function insertContentEvent(body, rag = {}) {
  const event = normalizeContentEvent(body);
  if (rag.contentEventStore?.insert) return serializeContentEventRow(await rag.contentEventStore.insert(event));
  const db = ragDbConfig();
  const connectionString = process.env[db.connectionEnv] || process.env.VION_RAG_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('VION_RAG_DATABASE_URL or DATABASE_URL is required to write content events');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return serializeContentEventRow(await createPgContentEventStore(client).insert(event));
  } finally {
    await client.end();
  }
}

function serveStatic(req, res) {
  const dist = path.join(ROOT, 'dist');
  const url = new URL(req.url, 'http://localhost');
  const requested = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
  const candidate = path.normalize(path.join(dist, requested));
  const filePath = candidate.startsWith(dist) && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(dist, 'index.html');
  if (!fs.existsSync(filePath)) return false;
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function ragApiEnabled(config) {
  if (typeof config?.enabled === 'boolean') return config.enabled;
  return process.env.VION_RAG_API_ENABLED === '1';
}

function configuredRagAdminToken(config) {
  return config?.adminToken || '';
}

function localRagAdminRequest(req) {
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').toLowerCase();
  if (forwardedHost && !['localhost', '127.0.0.1', '::1'].some((value) => forwardedHost.includes(value))) return false;
  const remoteAddress = String(req.socket?.remoteAddress || req.connection?.remoteAddress || '').toLowerCase();
  return remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1';
}

function ragAdminRequestAuthorized(req, config) {
  const token = configuredRagAdminToken(config);
  if (!token) {
    return localRagAdminRequest(req) ? { authorized: true } : { authorized: false, status: 403, error: 'rag_admin_forbidden_outside_localhost' };
  }
  const authorization = req.headers.authorization || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : '';
  const provided = bearer || req.headers['x-vion-rag-admin-token'] || '';
  return provided === token ? { authorized: true } : { authorized: false, status: 401, error: 'rag_admin_unauthorized' };
}

function ragChunksFor(trackId) {
  return buildRagChunks(model, { trackId });
}

async function germanB2DbSearch(body, rag) {
  const db = ragDbConfig();
  const connectionString = process.env[db.connectionEnv] || process.env.VION_RAG_DATABASE_URL || process.env.DATABASE_URL;
  const providedClient = rag.dbClient || null;
  let client = providedClient;
  let shouldClose = false;
  if (!client) {
    if (!connectionString) {
      return {
        track_id: 'german-b2-exam',
        query: body.query,
        results: [],
        answer: {
          allowed: false,
          status: 'embedding_required',
          reason: 'German B2 DB retrieval requires VION_RAG_DATABASE_URL or DATABASE_URL so uploaded-document embeddings can be checked.',
          citations: [],
        },
      };
    }
    const { Client } = await import('pg');
    client = new Client({ connectionString });
    await client.connect();
    shouldClose = true;
  }
  try {
    const retriever = createPgRagRetriever(client);
    let queryEmbedding = body.queryEmbedding || body.query_embedding || null;
    if (!queryEmbedding && (rag.embeddingClient || process.env.OPENAI_API_KEY)) {
      const embeddingClient = rag.embeddingClient || createOpenAiEmbeddingClient();
      [queryEmbedding] = await embeddingClient.createEmbeddings({ query: body.query, model: 'text-embedding-3-small', input: [body.query || ''] });
    }
    return retriever.searchUploadedDocuments({
      trackId: 'german-b2-exam',
      query: body.query,
      queryEmbedding,
      sourceId: body.sourceId || body.source_id || null,
      lessonId: body.lessonId || body.lesson_id || null,
      limit: body.limit || 5,
    });
  } finally {
    if (shouldClose) await client.end();
  }
}

function normalizeDbLessonRecord(rawLesson) {
  if (!rawLesson?.id || !rawLesson?.title || !rawLesson?.source_type) return null;
  return {
    ...rawLesson,
    source_ids: Array.isArray(rawLesson.source_ids) ? rawLesson.source_ids : [],
    content_version: Number(rawLesson.content_version || rawLesson.review_packet?.content_version || 1),
    review_packet: rawLesson.review_packet ? {
      mutable: true,
      ...rawLesson.review_packet,
      content_version: Number(rawLesson.review_packet?.content_version || rawLesson.content_version || 1),
    } : null,
    review_history: Array.isArray(rawLesson.review_history) ? rawLesson.review_history : [],
  };
}

function createGermanB2LessonStore({ loadLessons = null } = {}) {
  if (loadLessons) return { loadLessons };
  const db = ragDbConfig();
  const connectionString = process.env[db.connectionEnv] || process.env.VION_RAG_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) return { loadLessons: async () => [] };
  return {
    async loadLessons(trackId) {
      if (trackId !== 'german-b2-exam') return [];
      const { Client } = await import('pg');
      const client = new Client({ connectionString });
      await client.connect();
      try {
        const result = await client.query(
          `SELECT completed_at, metadata
             FROM rag_ingest_jobs
            WHERE track_id = $1
              AND status = 'succeeded'
              AND metadata ? 'german_b2_lesson'
            ORDER BY completed_at ASC, started_at ASC`,
          [trackId],
        );
        const latestById = new Map();
        for (const row of result.rows || []) {
          const lesson = normalizeDbLessonRecord(row.metadata?.german_b2_lesson);
          if (!lesson) continue;
          latestById.set(lesson.id, {
            ...lesson,
            created_at: lesson.created_at || row.completed_at || new Date().toISOString(),
            updated_at: row.completed_at || lesson.updated_at || lesson.created_at || new Date().toISOString(),
          });
        }
        return [...latestById.values()];
      } finally {
        await client.end();
      }
    },
  };
}

async function trackPayloadWithDbLessons(baseModel, trackId, lessonStore) {
  if (trackId !== 'german-b2-exam') return trackPayload(baseModel, trackId);
  const lessons = await lessonStore.loadLessons(trackId);
  if (!lessons.length) return trackPayload(baseModel, trackId);
  const mergedModel = loadLearningModel();
  for (const lesson of lessons) {
    appendLesson(mergedModel, { trackId, lesson });
  }
  return trackPayload(mergedModel, trackId);
}

export function createServer({ log = true, rag = {}, germanB2LessonStore = null, runNodeScript: runNodeScriptOverride = runNodeScript } = {}) {
  const lessonStore = createGermanB2LessonStore(germanB2LessonStore || {});
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, {
          status: 'ok',
          app: model.app,
          tracks: Object.fromEntries(Object.values(model.tracks).map((t) => [t.id, { card_count: t.cards.length, question_count: t.questions.length, last_verified_date: t.last_verified_date }])),
        });
      }
      if (req.method === 'GET' && url.pathname === '/api/landing') return json(res, 200, landingPayload(model));
      const trackMatch = url.pathname.match(/^\/api\/tracks\/([^/]+)(?:\/(.*))?$/);
      if (trackMatch) {
        const [, trackId, rest = ''] = trackMatch;
        if (req.method === 'GET' && rest === '') return json(res, 200, await trackPayloadWithDbLessons(model, trackId, lessonStore));
        if (req.method === 'GET' && rest === 'sources') {
          const ids = url.searchParams.get('ids')?.split(',').map((value) => value.trim()).filter(Boolean) || [];
          return json(res, 200, sourcesPayload(model, trackId, { service: url.searchParams.get('service') || undefined, concept: url.searchParams.get('concept') || undefined, ids }));
        }
        if (req.method === 'GET' && rest === 'resources') return json(res, 200, resourcesPayload(model, trackId));
        const cardMatch = rest.match(/^cards\/([^/]+)$/);
        if (req.method === 'GET' && cardMatch) {
          const payload = trackPayload(model, trackId);
          const card = payload.cards.find((c) => c.id === cardMatch[1]);
          return card ? json(res, 200, card) : json(res, 404, { error: `Card ${cardMatch[1]} not found for ${trackId}` });
        }
        if (req.method === 'POST' && rest === 'quizzes') {
          const body = await readBody(req);
          return json(res, 200, createQuiz(model, { trackId, mode: body.mode, domainId: body.domainId, count: body.count }));
        }
        if (req.method === 'POST' && rest === 'answers') {
          const body = await readBody(req);
          return json(res, 200, evaluateAnswer(model, { trackId, questionId: body.questionId, selectedOptionId: body.selectedOptionId }));
        }
        if (req.method === 'POST' && rest === 'cards/mark') {
          const body = await readBody(req);
          return json(res, 200, markCard(model, { trackId, cardId: body.cardId, status: body.status }));
        }
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/reset') {
        model = loadLearningModel();
        return json(res, 200, { status: 'reset', tracks: Object.keys(model.tracks) });
      }
      if (url.pathname.startsWith('/api/admin/rag/') || url.pathname.startsWith('/api/admin/uploads/')) {
        const authorization = ragAdminRequestAuthorized(req, rag);
        if (!authorization.authorized) return json(res, authorization.status, { error: authorization.error });
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/uploads/verify') {
        const batchId = safeName((new URL(req.url, 'http://localhost')).searchParams.get('batchId') || `upload-${Date.now()}`);
        const batchDir = batchDirFor(batchId);
        const rawDir = path.join(batchDir, 'raw');
        const { fields, files } = await parseMultipartForm(req, { targetDir: rawDir });
        const manifest = uploadManifestFrom({ batchId, trackId: fields.trackId || fields.track_id || null, fields, files });
        manifest.verification = {
          verified_at: new Date().toISOString(),
          file_count: files.length,
          warnings: files.filter((file) => !isTextLike(file.mime_type, file.filename)).map((file) => `${file.filename} may need OCR or transcript extraction`),
        };
        writeJson(manifestPathFor(batchDir), manifest);
        return json(res, 200, { batch_dir: batchDir, manifest });
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/uploads/ingest') {
        const body = await readBody(req);
        const batchId = safeName(body.batchId || body.batch_id || body.batch || 'latest');
        const batchDir = batchDirFor(batchId);
        const manifestFile = manifestPathFor(batchDir);
        if (!fs.existsSync(manifestFile)) return json(res, 404, { error: `missing_upload_manifest:${manifestFile}` });
        const manifest = readJson(manifestFile);
        const trackId = body.trackId || body.track_id || manifest.track_id || 'shared';
        const stageOutput = JSON.parse(runNodeScriptOverride('upload-ingestion.mjs', ['stage', '--batch-dir', batchDir, '--track', trackId]));
        const populateArgs = ['--tracks', trackId, '--chunks-dir', path.join(batchDir, 'tracks')];
        if (body.apply || body.liveEmbeddings || body.live_embeddings) populateArgs.push('--apply');
        if (body.liveEmbeddings || body.live_embeddings) populateArgs.push('--live-embeddings');
        const populateResult = JSON.parse(runNodeScriptOverride('rag-populate-db.mjs', populateArgs));
        const contentEvent = (populateResult.apply && Array.isArray(populateResult.write_stats) && populateResult.write_stats.length)
          ? await insertContentEvent({
            event_type: body.eventType || body.event_type || 'german_tutor_content_ready',
            aggregate_type: 'rag_ingest_job',
            aggregate_id: populateResult.write_stats[0].ingest_job_id || `${trackId}:${batchId}`,
            track_id: trackId,
            batch_id: batchId,
            ingest_job_id: populateResult.write_stats[0].ingest_job_id || null,
            payload: {
              batch_id: batchId,
              track_id: trackId,
              chunk_count: populateResult.chunk_count,
              source_count: populateResult.source_count,
              written_embedding_count: populateResult.write_stats[0].written_embedding_count || 0,
              live_embeddings: Boolean(populateResult.live_embeddings),
              artifact_path: populateResult.write_stats[0].metadata?.artifact_path || path.join(batchDir, 'tracks', `${trackId}-chunks.json`),
              lesson_id: populateResult.write_stats[0].metadata?.german_b2_lesson?.id || null,
              review_status: populateResult.write_stats[0].metadata?.german_b2_lesson?.review_packet?.review_status || null,
            },
            source_artifact_path: populateResult.write_stats[0].metadata?.artifact_path || path.join(batchDir, 'tracks', `${trackId}-chunks.json`),
            source_artifact_hash: fs.existsSync(path.join(batchDir, 'tracks', `${trackId}-chunks.json`)) ? sha256(fs.readFileSync(path.join(batchDir, 'tracks', `${trackId}-chunks.json`))) : null,
          }, rag)
          : null;
        return json(res, 200, { batch_dir: batchDir, manifest, stage: stageOutput, populate: populateResult, content_event: contentEvent });
      }
      if (ragApiEnabled(rag) && url.pathname.startsWith('/api/admin/rag/')) {
        const authorization = ragAdminRequestAuthorized(req, rag);
        if (!authorization.authorized) return json(res, authorization.status, { error: authorization.error });
      }
      if (ragApiEnabled(rag) && req.method === 'GET' && url.pathname === '/api/admin/rag/ingest') {
        const trackId = url.searchParams.get('trackId') || 'clf-c02';
        const result = ragChunksFor(trackId);
        return json(res, 200, { ...result, chunks: result.chunks.slice(0, Number(url.searchParams.get('limit') || 25)) });
      }
      if (ragApiEnabled(rag) && req.method === 'POST' && url.pathname === '/api/admin/rag/embed') {
        const body = await readBody(req);
        const chunks = body.chunks || ragChunksFor(body.trackId || 'clf-c02').chunks;
        return json(res, 200, await embedRagChunks(chunks, { mode: body.mode || 'dry-run', forceRefresh: Boolean(body.forceRefresh || body.force_refresh) }));
      }
      if (ragApiEnabled(rag) && req.method === 'POST' && url.pathname === '/api/admin/rag/search') {
        const body = await readBody(req);
        if ((body.trackId || body.track_id) === 'german-b2-exam') {
          return json(res, 200, await germanB2DbSearch({ ...body, trackId: 'german-b2-exam' }, rag));
        }
        const chunks = ragChunksFor(body.trackId || 'clf-c02').chunks;
        return json(res, 200, searchRagChunks(chunks, { trackId: body.trackId || 'clf-c02', query: body.query, limit: body.limit || 5 }));
      }
      if (ragApiEnabled(rag) && req.method === 'POST' && url.pathname === '/api/admin/rag/eval') {
        const body = await readBody(req);
        const chunks = ragChunksFor(body.trackId || 'clf-c02').chunks;
        return json(res, 200, evaluateRagRetrieval(chunks, { cases: body.cases || [] }));
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/export') return json(res, 200, exportSnapshot(model));
      if (req.method === 'GET' && serveStatic(req, res)) return;
      return json(res, 404, { error: 'not_found' });
    } catch (error) {
      if (log) console.error(JSON.stringify({ level: 'error', message: error.message, path: url.pathname }));
      return json(res, /Unknown track|does not belong/.test(error.message) ? 404 : 500, { error: error.message });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer();
  server.listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({ level: 'info', message: 'vion-learning listening', port }));
  });
}
