import crypto from 'node:crypto';

export const RAG_EMBEDDING_MODEL = 'text-embedding-3-small';
export const RAG_EMBEDDING_DIMENSIONS = 1536;
export const RAG_SCHEMA_VERSION = 'vion-rag-prototype/v1';
export const RAG_DEFAULT_MAX_TOKENS = 360;
export const RAG_DEFAULT_OVERLAP_TOKENS = 120;

const FRESHNESS_STATUSES = new Set(['fresh', 'stale', 'needs_refresh', 'unverified', 'auth_gated', 'unavailable', 'unknown']);
const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'with', 'aws', 'amazon']);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function tokenize(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

function terms(value) {
  return tokenize(String(value || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' '))
    .map((token) => token.replace(/^-+|-+$/g, ''))
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function sourceMap(track) {
  return new Map((track.sources || []).map((source) => [source.id, source]));
}

function sourceForItem(item, sourcesById) {
  const ids = unique(item.source_ids || []);
  for (const id of ids) {
    const source = sourcesById.get(id);
    if (source) return source;
  }
  const url = unique(item.source_links || item.source_urls || [item.official_docs_url]).find(Boolean);
  const source = [...sourcesById.values()].find((candidate) => candidate.url === url || (url && candidate.url && candidate.url.includes(url)));
  if (source) return source;
  return null;
}

function citationFor(item, source) {
  if (item?.citation_text) return item.citation_text;
  if (source?.citation_text) return source.citation_text;
  if (source?.title && source?.url) return `${source.title}, ${source.url}`;
  const url = unique(item.source_links || item.source_urls || [item.official_docs_url]).find(Boolean);
  return url ? `Vion Learning source, ${url}` : '';
}

function urlFor(item, source) {
  if (item?.url) return item.url;
  return source?.url || unique(item.source_links || item.source_urls || [item.official_docs_url]).find(Boolean) || '';
}

function sourceRecordMetadata(source) {
  return {
    source_id: source.id,
    track_id: source.track_id,
    title: source.title,
    url: source.url,
    source_type: source.source_type || source.type || 'source',
    citation_text: source.citation_text,
    content_hash: source.content_hash || null,
    freshness_status: source.freshness_status || source.refresh_status || 'unknown',
    metadata: {
      publisher: source.publisher,
      concepts: source.concepts || [],
      aws_service: source.aws_service || [],
      retrieved_at: source.retrieved_at || null,
      last_checked_at: source.last_checked_at || source.last_verified_date || null,
    },
  };
}

function itemSections(track, sourcesById) {
  const rows = [];
    const sectionIdCounts = new Map();
    const hasExtractedSections = (track.sources || []).some((source) => Array.isArray(source.sections) && source.sections.some((section) => normalizeText(section.text)));
    const nextSectionId = (source, section, fallback) => {
      const base = section.id || `${source.id}:section:${sha256((section.section_path || [section.title || fallback || 'section']).join('>')).slice(0, 12)}`;
      const count = sectionIdCounts.get(base) || 0;
      sectionIdCounts.set(base, count + 1);
      return count === 0 ? base : `${base}:occurrence-${count + 1}:${sha256(section.text).slice(0, 12)}`;
    };
    for (const source of track.sources || []) {
      const sections = Array.isArray(source.sections) ? source.sections.filter((section) => normalizeText(section.text)) : [];
      const sourceRecord = sourceRecordMetadata(source);
      if (sections.length) {
        for (const section of sections) {
          const sectionId = nextSectionId(source, section, source.title);
          rows.push({
            kind: 'aws_doc_section',
            id: sectionId,
            source,
            title: section.title || source.title,
            url: section.url,
            citation_text: section.citation_text,
            section_path: [track.id, 'source', ...(section.section_path || [section.title || source.title || source.id])],
            text: section.text,
            metadata: { source_type: source.source_type || source.type || 'source', concepts: source.concepts || [], aws_service: source.aws_service || [], source_title: source.title, section_title: section.title, source_record: sourceRecord, backing_source_section_id: sectionId, shared_scope: source.track_id === 'shared' },
          });
        }
      } else if (!hasExtractedSections) {
        const text = [source.title, source.summary, ...(source.extracted_facts || []).map((fact) => fact.fact), ...(source.concepts || [])].filter(Boolean).join('. ');
        if (!normalizeText(text)) continue;
        const sectionId = `${source.id}:section:seed-summary`;
        rows.push({
          kind: 'aws_doc_section',
          id: sectionId,
          source,
          title: source.title,
          url: source.url,
          citation_text: source.citation_text,
          section_path: [track.id, 'source', source.title || source.id, 'seed-summary'],
          text,
          metadata: { source_type: source.source_type || source.type || 'source', concepts: source.concepts || [], aws_service: source.aws_service || [], source_title: source.title, source_record: sourceRecord, backing_source_section_id: sectionId, section_extraction_status: 'seeded_summary', shared_scope: source.track_id === 'shared' },
        });
      }
    }
    return rows;
  }

function splitWithOverlap(words, maxTokens, overlapTokens) {
  if (words.length <= maxTokens) return [words];
  const chunks = [];
  const step = Math.max(1, maxTokens - overlapTokens);
  for (let start = 0; start < words.length; start += step) {
    chunks.push(words.slice(start, start + maxTokens));
    if (start + maxTokens >= words.length) break;
  }
  return chunks;
}

export function buildRagChunks(model, { trackId, maxTokens = RAG_DEFAULT_MAX_TOKENS, overlapTokens = RAG_DEFAULT_OVERLAP_TOKENS, now = new Date().toISOString() } = {}) {
  const registryTrack = model.sourceRegistry?.tracks?.[trackId];
  const track = model.tracks?.[trackId] || (registryTrack ? { id: trackId, sources: registryTrack.records, cards: [], questions: [], serviceResources: [] } : null);
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  if (overlapTokens >= maxTokens) throw new Error('overlapTokens must be smaller than maxTokens');
  const sourcesById = sourceMap(track);
  const chunks = [];
  for (const row of itemSections(track, sourcesById)) {
    const source = row.source;
    const citationText = citationFor(row, source);
    const url = urlFor(row, source);
    if (!citationText || !url) continue;
    const words = tokenize(row.text);
    if (!words.length) continue;
    const parts = splitWithOverlap(words, maxTokens, overlapTokens);
    parts.forEach((part, index) => {
      const text = part.join(' ');
      const sourceId = source?.id || unique(row.source_ids || [])[0] || `${trackId}:unmapped`;
      const freshness = source?.freshness_status || source?.refresh_status || 'unknown';
      chunks.push({
        id: `${trackId}:${row.kind}:${row.id}:chunk-${index + 1}`,
        schema_version: RAG_SCHEMA_VERSION,
        track_id: trackId,
        source_id: sourceId,
        url,
        section_path: [...row.section_path, `chunk-${index + 1}`],
        citation_text: citationText,
        content_hash: `sha256:${sha256(text)}`,
        freshness_status: FRESHNESS_STATUSES.has(freshness) ? freshness : 'unknown',
        text,
        token_estimate: part.length,
        chunk_index: index + 1,
        chunk_count: parts.length,
        embedding_model: RAG_EMBEDDING_MODEL,
        embedding_dimensions: RAG_EMBEDDING_DIMENSIONS,
        generated_at: now,
        embedded_at: null,
        metadata: {
          ...row.metadata,
          source_kind: row.kind,
          embedding_model: RAG_EMBEDDING_MODEL,
          embedding_dimensions: RAG_EMBEDDING_DIMENSIONS,
          generated_at: now,
        },
      });
    });
  }
  const dedupedChunks = [];
  const chunksByContent = new Map();
  for (const chunk of chunks) {
    const dedupeKey = `${chunk.track_id}:${chunk.content_hash}`;
    const existing = chunksByContent.get(dedupeKey);
    if (existing) {
      existing.metadata.deduped_from.push({
        chunk_id: chunk.id,
        source_id: chunk.source_id,
        citation_text: chunk.citation_text,
        url: chunk.url,
        section_path: chunk.section_path,
      });
      continue;
    }
    const retained = { ...chunk, metadata: { ...(chunk.metadata || {}), deduped_from: [] } };
    chunksByContent.set(dedupeKey, retained);
    dedupedChunks.push(retained);
  }
  return {
    schema_version: RAG_SCHEMA_VERSION,
    track_id: trackId,
    generated_at: now,
    chunk_count: dedupedChunks.length,
    policy: {
      primary_split: 'section_path',
      max_tokens: maxTokens,
      overlap_tokens: overlapTokens,
      citation_required: true,
      no_citation_no_answer: true,
      freshness_status_preserved: true,
      deduplicate_by_content_hash: true,
    },
    chunks: dedupedChunks,
  };
}

function sourceRowFromChunk(chunk) {
  const record = chunk.metadata?.source_record;
  return {
    source_id: record?.source_id || chunk.source_id,
    track_id: record?.track_id || chunk.track_id,
    url: record?.url || chunk.url,
    title: record?.title || chunk.metadata?.source_title || chunk.source_id,
    source_type: record?.source_type || chunk.metadata?.source_type || 'source',
    citation_text: record?.citation_text || chunk.citation_text,
    content_hash: record?.content_hash || null,
    freshness_status: record?.freshness_status || chunk.freshness_status,
    last_checked_at: record?.metadata?.last_checked_at || chunk.metadata?.last_checked_at || null,
    metadata: record?.metadata || {},
  };
}

function uniqueSourceRows(chunks) {
  const rowsById = new Map();
  for (const chunk of chunks) {
    const row = sourceRowFromChunk(chunk);
    if (!rowsById.has(row.source_id)) rowsById.set(row.source_id, row);
  }
  return [...rowsById.values()];
}

function chunkRow(chunk) {
  return {
    chunk_id: chunk.id,
    track_id: chunk.track_id,
    source_id: chunk.source_id,
    url: chunk.url,
    section_path: chunk.section_path,
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

function embeddingRow(chunk, embedding, now) {
  return {
    chunk_id: chunk.id,
    track_id: chunk.track_id,
    source_id: chunk.source_id,
    content_hash: chunk.content_hash,
    embedding_model: RAG_EMBEDDING_MODEL,
    embedding_dimensions: RAG_EMBEDDING_DIMENSIONS,
    embedding,
    freshness_status: chunk.freshness_status,
    embedded_at: now,
    provider: 'openai',
  };
}

export async function embedRagChunks(chunks, { mode = 'dry-run', previousEmbeddings = new Map(), dbWriter = null, embeddingClient = null, now = new Date().toISOString(), forceRefresh = false } = {}) {
  let embeddingLookup = previousEmbeddings;
  if (mode === 'live' && dbWriter?.getExistingEmbeddings && (!previousEmbeddings || previousEmbeddings.size === 0)) {
    embeddingLookup = await dbWriter.getExistingEmbeddings(chunks.map((chunk) => chunk.id));
  }
  const previousFor = (chunk) => embeddingLookup instanceof Map ? embeddingLookup.get(chunk.id) : embeddingLookup?.[chunk.id];
  const items = chunks.map((chunk) => {
    const previous = previousFor(chunk);
    const unchanged = !forceRefresh && previous?.content_hash === chunk.content_hash;
    return {
      chunk_id: chunk.id,
      track_id: chunk.track_id,
      source_id: chunk.source_id,
      content_hash: chunk.content_hash,
      embedding_model: RAG_EMBEDDING_MODEL,
      embedding_dimensions: RAG_EMBEDDING_DIMENSIONS,
      embedding_status: unchanged ? 'unchanged' : 'pending_refresh',
      refresh_reason: unchanged ? 'content_hash_unchanged' : forceRefresh ? 'force_refresh' : previous ? 'content_hash_changed' : 'missing_embedding',
    };
  });
  if (mode === 'live') {
    if (!dbWriter?.upsertChunks || !dbWriter?.upsertEmbeddings || !embeddingClient?.createEmbeddings) {
      throw new Error('Live RAG embedding mode requires dbWriter and embeddingClient; dry-run remains the default and never calls the network');
    }
    const refreshItems = items.filter((item) => item.embedding_status === 'pending_refresh');
    const refreshIds = new Set(refreshItems.map((item) => item.chunk_id));
    const refreshChunks = chunks.filter((chunk) => refreshIds.has(chunk.id));
    if (dbWriter.upsertSources) await dbWriter.upsertSources(uniqueSourceRows(chunks));
    await dbWriter.upsertChunks(chunks.map(chunkRow));
    let embeddingRows = [];
    if (refreshChunks.length) {
      const embeddings = await embeddingClient.createEmbeddings({ model: RAG_EMBEDDING_MODEL, input: refreshChunks.map((chunk) => chunk.text) });
      if (!Array.isArray(embeddings) || embeddings.length !== refreshChunks.length) {
        throw new Error('Embedding client returned an unexpected embedding count');
      }
      embeddingRows = refreshChunks.map((chunk, index) => embeddingRow(chunk, embeddings[index], now));
      await dbWriter.upsertEmbeddings(embeddingRows);
    }
    return {
      model: RAG_EMBEDDING_MODEL,
      dimensions: RAG_EMBEDDING_DIMENSIONS,
      mode,
      force_refresh: Boolean(forceRefresh),
      requiresNetwork: true,
      refreshed_count: refreshItems.length,
      unchanged_count: items.filter((item) => item.embedding_status === 'unchanged').length,
      written_chunk_count: chunks.length,
      written_embedding_count: embeddingRows.length,
      items,
    };
  }
  return {
    model: RAG_EMBEDDING_MODEL,
    dimensions: RAG_EMBEDDING_DIMENSIONS,
    mode,
    force_refresh: Boolean(forceRefresh),
    requiresNetwork: false,
    refreshed_count: items.filter((item) => item.embedding_status === 'pending_refresh').length,
    unchanged_count: items.filter((item) => item.embedding_status === 'unchanged').length,
    items,
  };
}

export function createOpenAiEmbeddingClient({ apiKey = process.env.OPENAI_API_KEY, fetchImpl = globalThis.fetch } = {}) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for live RAG embeddings');
  if (!fetchImpl) throw new Error('fetch is required for live RAG embeddings');
  return {
    async createEmbeddings({ model = RAG_EMBEDDING_MODEL, input = [] }) {
      const response = await fetchImpl('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model, input }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`OpenAI embeddings request failed with ${response.status}: ${body.slice(0, 500)}`);
      }
      const payload = await response.json();
      return (payload.data || []).sort((a, b) => a.index - b.index).map((item) => item.embedding);
    },
  };
}

function vectorLiteral(values) {
  if (!Array.isArray(values) || values.length !== RAG_EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding must be an array with ${RAG_EMBEDDING_DIMENSIONS} dimensions`);
  }
  return `[${values.map((value) => Number(value)).join(',')}]`;
}

export function createPgRagWriter(client) {
  if (!client?.query) throw new Error('A pg-compatible client with query(sql, params) is required');
  return {
    async getExistingEmbeddings(chunkIds) {
      if (!chunkIds.length) return new Map();
      const result = await client.query('SELECT chunk_id, content_hash FROM rag_embeddings WHERE chunk_id = ANY($1)', [chunkIds]);
      return new Map((result.rows || []).map((row) => [row.chunk_id, { content_hash: row.content_hash, embedding_status: 'embedded' }]));
    },
    async upsertSources(rows) {
      for (const row of rows) {
        await client.query(
          `INSERT INTO rag_tracks (track_id, title) VALUES ($1, $1)
           ON CONFLICT (track_id) DO UPDATE SET updated_at = now()`,
          [row.track_id],
        );
        await client.query(
          `INSERT INTO rag_sources (source_id, track_id, url, title, source_type, citation_text, content_hash, freshness_status, metadata, last_checked_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
           ON CONFLICT (source_id) DO UPDATE SET
             track_id = EXCLUDED.track_id,
             url = EXCLUDED.url,
             title = EXCLUDED.title,
             source_type = EXCLUDED.source_type,
             citation_text = EXCLUDED.citation_text,
             content_hash = EXCLUDED.content_hash,
             freshness_status = EXCLUDED.freshness_status,
             metadata = EXCLUDED.metadata,
             last_checked_at = EXCLUDED.last_checked_at,
             updated_at = now()`,
          [row.source_id, row.track_id, row.url, row.title || row.source_id, row.source_type || 'source', row.citation_text, row.content_hash, row.freshness_status, JSON.stringify(row.metadata || {}), row.last_checked_at || null],
        );
      }
      return rows.length;
    },
    async upsertChunks(rows) {
      for (const row of rows) {
        await client.query(
          `INSERT INTO rag_tracks (track_id, title) VALUES ($1, $1)
           ON CONFLICT (track_id) DO UPDATE SET updated_at = now()`,
          [row.track_id],
        );
        await client.query(
          `INSERT INTO rag_chunks (chunk_id, track_id, source_id, url, section_path, citation_text, content_hash, freshness_status, chunk_text, token_estimate, chunk_index, chunk_count, metadata)
           VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
           ON CONFLICT (chunk_id) DO UPDATE SET
             track_id = EXCLUDED.track_id,
             source_id = EXCLUDED.source_id,
             url = EXCLUDED.url,
             section_path = EXCLUDED.section_path,
             citation_text = EXCLUDED.citation_text,
             content_hash = EXCLUDED.content_hash,
             freshness_status = EXCLUDED.freshness_status,
             chunk_text = EXCLUDED.chunk_text,
             token_estimate = EXCLUDED.token_estimate,
             chunk_index = EXCLUDED.chunk_index,
             chunk_count = EXCLUDED.chunk_count,
             metadata = EXCLUDED.metadata,
             updated_at = now()`,
          [row.chunk_id, row.track_id, row.source_id, row.url, row.section_path || [], row.citation_text, row.content_hash, row.freshness_status, row.text, row.token_estimate, row.chunk_index, row.chunk_count, JSON.stringify(row.metadata || {})],
        );
      }
      return rows.length;
    },
    async upsertEmbeddings(rows) {
      for (const row of rows) {
        await client.query(
          `INSERT INTO rag_embeddings (chunk_id, track_id, source_id, content_hash, embedding_model, embedding_dimensions, embedding, provider, freshness_status, embedded_at, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9, $10, $11::jsonb)
           ON CONFLICT (chunk_id) DO UPDATE SET
             track_id = EXCLUDED.track_id,
             source_id = EXCLUDED.source_id,
             content_hash = EXCLUDED.content_hash,
             embedding_model = EXCLUDED.embedding_model,
             embedding_dimensions = EXCLUDED.embedding_dimensions,
             embedding = EXCLUDED.embedding,
             provider = EXCLUDED.provider,
             freshness_status = EXCLUDED.freshness_status,
             embedded_at = EXCLUDED.embedded_at,
             metadata = EXCLUDED.metadata`,
          [row.chunk_id, row.track_id, row.source_id, row.content_hash, row.embedding_model, row.embedding_dimensions, vectorLiteral(row.embedding), row.provider, row.freshness_status, row.embedded_at, JSON.stringify({ refreshed_by: 'rag:embed' })],
        );
      }
      return rows.length;
    },
  };
}

function scoreChunk(chunk, queryTerms) {
  const haystack = new Set(terms([chunk.text, chunk.section_path.join(' '), chunk.metadata?.concepts?.join(' '), chunk.metadata?.aws_service?.join(' ')].join(' ')));
  let score = 0;
  for (const term of queryTerms) {
    if (haystack.has(term)) score += 3;
    else if ([...haystack].some((candidate) => candidate.includes(term) || term.includes(candidate))) score += 1;
  }
  return score;
}

function formatRefusal(reason, citations = [], status = 'source_verification_needed') {
  return {
    allowed: false,
    status,
    reason,
    citations,
  };
}

function dbRetrievalResult({ trackId, query, results = [], answer }) {
  return {
    track_id: trackId,
    query,
    results,
    answer,
  };
}

function scopedSourceClause(sourceId, lessonId, params) {
  if (sourceId) {
    params.push(sourceId);
    return ` AND c.source_id = $${params.length}`;
  }
  if (lessonId) {
    params.push(`%${lessonId}%`);
    return ` AND (c.source_id ILIKE $${params.length} OR array_to_string(c.section_path, ' / ') ILIKE $${params.length})`;
  }
  return '';
}

export function createPgRagRetriever(client) {
  if (!client?.query) throw new Error('A pg-compatible client with query(sql, params) is required');
  return {
    async searchUploadedDocuments({ trackId, query, queryEmbedding = null, sourceId = null, lessonId = null, limit = 5 } = {}) {
      if (trackId !== 'german-b2-exam') throw new Error('German B2 uploaded-document retrieval requires trackId=german-b2-exam');
      const countParams = [trackId];
      const countScope = scopedSourceClause(sourceId, lessonId, countParams);
      const counts = await client.query(
        `SELECT COUNT(c.chunk_id)::int AS chunk_count,
                COUNT(e.chunk_id)::int AS embedding_count
           FROM rag_chunks c
           LEFT JOIN rag_embeddings e ON e.chunk_id = c.chunk_id
            AND e.embedding_model = $${countParams.length + 1}
            AND e.embedding_dimensions = $${countParams.length + 2}
          WHERE c.track_id = $1
            AND c.metadata->>'source_kind' = 'uploaded_document'
            ${countScope}`,
        [...countParams, RAG_EMBEDDING_MODEL, RAG_EMBEDDING_DIMENSIONS],
      );
      const countRow = counts.rows?.[0] || {};
      const chunkCount = Number(countRow.chunk_count || 0);
      const embeddingCount = Number(countRow.embedding_count || 0);
      if (chunkCount > 0 && embeddingCount === 0) {
        return dbRetrievalResult({
          trackId,
          query,
          results: [],
          answer: formatRefusal(`${chunkCount} German B2 uploaded chunks but 0 embeddings are available; run live embeddings before vector retrieval.`, [], 'embedding_required'),
        });
      }
      if (!queryEmbedding) {
        return dbRetrievalResult({
          trackId,
          query,
          results: [],
          answer: formatRefusal('German B2 DB retrieval requires a query embedding before searching uploaded lesson chunks.', [], 'embedding_required'),
        });
      }
      const searchParams = [trackId];
      const searchScope = scopedSourceClause(sourceId, lessonId, searchParams);
      searchParams.push(vectorLiteral(queryEmbedding));
      const vectorParam = searchParams.length;
      searchParams.push(Number(limit || 5));
      const result = await client.query(
        `SELECT c.chunk_id,
                c.track_id,
                c.source_id,
                c.url,
                c.section_path,
                c.citation_text,
                c.content_hash,
                c.freshness_status,
                c.chunk_text,
                c.metadata AS chunk_metadata,
                e.embedding_model,
                e.embedding_dimensions,
                (1 - (e.embedding <=> $${vectorParam}::vector))::float AS score
           FROM rag_chunks c
           JOIN rag_embeddings e ON e.chunk_id = c.chunk_id
            AND e.embedding_model = $${vectorParam + 2}
            AND e.embedding_dimensions = $${vectorParam + 3}
          WHERE c.track_id = $1
            AND c.metadata->>'source_kind' = 'uploaded_document'
            AND c.citation_text <> ''
            AND c.source_id <> ''
            ${searchScope}
          ORDER BY e.embedding <=> $${vectorParam}::vector ASC, c.chunk_id ASC
          LIMIT $${vectorParam + 1}`,
        [...searchParams, RAG_EMBEDDING_MODEL, RAG_EMBEDDING_DIMENSIONS],
      );
      const results = (result.rows || []).map((row) => ({
        chunk_id: row.chunk_id,
        id: row.chunk_id,
        track_id: row.track_id,
        source_id: row.source_id,
        url: row.url || '',
        section_path: row.section_path || [],
        citation_text: row.citation_text,
        content_hash: row.content_hash,
        freshness_status: row.freshness_status,
        source_title: row.chunk_metadata?.source_title || row.chunk_metadata?.source_record?.title || row.source_id,
        batch_id: row.chunk_metadata?.batch_id || row.chunk_metadata?.source_record?.metadata?.batch_id || null,
        file_name: row.chunk_metadata?.file_name || row.chunk_metadata?.source_record?.metadata?.file_name || null,
        snippet: String(row.chunk_text || '').slice(0, 360),
        embedding_model: row.embedding_model,
        embedding_dimensions: Number(row.embedding_dimensions || RAG_EMBEDDING_DIMENSIONS),
        score: Number(row.score || 0),
        metadata: row.chunk_metadata || {},
      }));
      const citations = results.map((row) => ({ source_id: row.source_id, citation_text: row.citation_text, url: row.url, section_path: row.section_path, chunk_id: row.chunk_id, batch_id: row.batch_id, file_name: row.file_name }));
      return dbRetrievalResult({
        trackId,
        query,
        results,
        answer: results.length
          ? { allowed: true, status: 'answered_with_uploaded_document_sources', text: `DB retrieval found cited German B2 uploaded lesson chunks for "${query}". Sources: ${citations.map((citation) => citation.citation_text).slice(0, 3).join(' | ')}`, citations }
          : formatRefusal('No cited German B2 uploaded-document vector results were found for the scoped query.', [], 'source_verification_needed'),
      });
    },
  };
}

export function searchRagChunks(chunks, { trackId, query, limit = 5, minScore = 1, freshness = ['fresh'] } = {}) {
  const queryTerms = terms(query);
  const allowedFreshness = new Set(freshness);
  const eligibleChunks = chunks
    .filter((chunk) => (!trackId || chunk.track_id === trackId) && chunk.citation_text && chunk.source_id && chunk.metadata?.source_kind === 'aws_doc_section')
    .map((chunk) => ({ ...chunk, score: scoreChunk(chunk, queryTerms) }))
    .filter((chunk) => chunk.score >= minScore)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const degraded = eligibleChunks.filter((chunk) => !allowedFreshness.has(chunk.freshness_status));
  const results = eligibleChunks
    .filter((chunk) => allowedFreshness.has(chunk.freshness_status))
    .slice(0, limit)
    .map((chunk) => ({
      id: chunk.id,
      track_id: chunk.track_id,
      source_id: chunk.source_id,
      url: chunk.url,
      section_path: chunk.section_path,
      citation_text: chunk.citation_text,
      freshness_status: chunk.freshness_status,
      content_hash: chunk.content_hash,
      score: chunk.score,
      snippet: chunk.text.slice(0, 360),
      retrieved_chunk_kind: chunk.metadata?.source_kind,
      retrieved_chunk_id: chunk.id,
      backing_source_section_id: chunk.metadata?.backing_source_section_id || chunk.id.replace(/:chunk-\d+$/, ''),
      metadata: chunk.metadata,
    }));
  const degradedResults = degraded.slice(0, limit).map((chunk) => ({
    id: chunk.id,
    track_id: chunk.track_id,
    source_id: chunk.source_id,
    url: chunk.url,
    section_path: chunk.section_path,
    citation_text: chunk.citation_text,
    freshness_status: chunk.freshness_status,
    score: chunk.score,
    retrieved_chunk_kind: chunk.metadata?.source_kind,
    retrieved_chunk_id: chunk.id,
    backing_source_section_id: chunk.metadata?.backing_source_section_id || chunk.id.replace(/:chunk-\d+$/, ''),
  }));
  const cited = results.filter((result) => result.citation_text && result.source_id);
  const degradedStatuses = unique(degradedResults.map((result) => result.freshness_status));
  return {
    track_id: trackId || null,
    query,
    results,
    degraded_results: degradedResults,
    answer: cited.length ? {
      allowed: true,
      status: 'answered_with_verified_sources',
      text: `Prototype retrieval found cited AWS source chunks for "${query}". Sources: ${cited.map((result) => result.citation_text).slice(0, 3).join(' | ')}`,
      citations: cited.map((result) => ({ source_id: result.source_id, citation_text: result.citation_text, url: result.url, section_path: result.section_path, retrieved_chunk_kind: result.retrieved_chunk_kind, retrieved_chunk_id: result.retrieved_chunk_id, backing_source_section_id: result.backing_source_section_id })),
    } : degradedResults.length ? formatRefusal(`Only freshness-degraded supporting AWS source chunks were found (${degradedStatuses.join(', ')}); source verification needed before answering.`, degradedResults.map((result) => ({ source_id: result.source_id, citation_text: result.citation_text, url: result.url, section_path: result.section_path, retrieved_chunk_kind: result.retrieved_chunk_kind, retrieved_chunk_id: result.retrieved_chunk_id, backing_source_section_id: result.backing_source_section_id }))) : formatRefusal('No cited retrieval results. No verified supporting AWS source chunks were found; no generated answer is allowed.'),
  };
}

export function evaluateRagRetrieval(chunks, { cases = [], limit = 5, minScore = 1 } = {}) {
  const results = cases.map((testCase) => {
    const expectedOutcome = testCase.expected_outcome || 'cited_result';
    const search = searchRagChunks(chunks, {
      trackId: testCase.track_id,
      query: testCase.query,
      limit: testCase.limit || limit,
      minScore: testCase.min_score || minScore,
    });
    const text = search.results.map((result) => [result.source_id, result.snippet, result.metadata?.concepts?.join(' ')].join(' ')).join(' ').toLowerCase();
    const expectedConceptHit = expectedOutcome === 'refusal' ? true : (testCase.expected_concepts || []).some((concept) => text.includes(String(concept).toLowerCase()));
    const expectedSourceHit = expectedOutcome === 'refusal' || !(testCase.expected_source_ids || []).length || search.results.some((result) => testCase.expected_source_ids.includes(result.source_id));
    const citationGate = search.results.every((result) => result.citation_text && result.source_id);
    const refused = search.results.length === 0 && search.answer.allowed === false;
    const passed = expectedOutcome === 'refusal'
      ? refused && citationGate
      : search.results.length > 0 && expectedConceptHit && expectedSourceHit && citationGate;
    return {
      id: testCase.id,
      track_id: testCase.track_id,
      query: testCase.query,
      expected_outcome: expectedOutcome,
      retrieved_count: search.results.length,
      expected_concept_hit: expectedConceptHit,
      expected_source_hit: expectedSourceHit,
      citation_gate: citationGate,
      refusal_reason: refused ? search.answer.reason : null,
      passed,
      top_sources: search.results.map((result) => result.source_id),
      top_citations: search.results.map((result) => ({ source_id: result.source_id, citation_text: result.citation_text, url: result.url })),
    };
  });
  return {
    schema_version: RAG_SCHEMA_VERSION,
    evaluated_at: new Date().toISOString(),
    case_count: cases.length,
    passed_count: results.filter((result) => result.passed).length,
    failed_count: results.filter((result) => !result.passed).length,
    no_benchmark_results_invented: true,
    metrics: {
      citation_gate_rate: results.length ? results.filter((result) => result.citation_gate).length / results.length : 0,
      pass_rate: results.length ? results.filter((result) => result.passed).length / results.length : 0,
    },
    results,
  };
}

export function ragDbConfig(env = process.env) {
  const connectionString = env.VION_RAG_DATABASE_URL || env.DATABASE_URL || '';
  return {
    enabled: Boolean(connectionString),
    connectionEnv: connectionString ? (env.VION_RAG_DATABASE_URL ? 'VION_RAG_DATABASE_URL' : 'DATABASE_URL') : null,
    host: env.VION_RAG_PGHOST || '127.0.0.1',
    port: Number(env.VION_RAG_PGPORT || 55432),
    database: env.VION_RAG_PGDATABASE || 'vion_rag',
    appRole: 'vion_rag_app',
    migratorRole: 'vion_rag_migrator',
    readonlyRole: 'vion_rag_readonly',
  };
}
