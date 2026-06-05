import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

export const SOURCE_CATALOG_PATH = path.join(ROOT, 'data/sources/source_catalog.json');
export const SOURCE_REPORT_PATH = path.join(ROOT, 'docs/reports/source-provenance.md');
export const GENERATED_SOURCES_DIR = path.join(ROOT, 'data/sources/generated');
export const SCHEMA_VERSION = 'source-ingestion/v1';

function sourceReportPath(root = ROOT) {
  return path.join(root, 'docs/reports/source-provenance.md');
}
export const TRACK_IDS = ['clf-c02', 'aif-c01'];

const EXAM_CODES_BY_TRACK = {
  'clf-c02': 'CLF-C02',
  'aif-c01': 'AIF-C01',
};

const FRESHNESS_STATUSES = new Set(['fresh', 'stale', 'needs_refresh', 'unverified', 'auth_gated']);
const SOURCE_TYPES = new Set([
  'aws_exam_guide',
  'aws_certification_page',
  'aws_docs',
  'aws_skill_builder',
  'aws_blog',
  'aws_whitepaper',
  'aws_faq',
  'aws_workshop',
  'aws_youtube',
  'third_party_video',
  'third_party_article',
  'other',
]);
const FACT_TYPES = new Set(['exam_fact', 'service_capability', 'responsibility_boundary', 'pricing_or_support', 'limitation', 'teaching_hint']);
const RELEVANCE_LEVELS = new Set(['core', 'supporting', 'background', 'candidate']);
const QUESTION_USES = new Set(['learning_card', 'concept_card', 'quiz_fact', 'quiz_distractor_context', 'study_plan', 'console_guide', 'do_not_use_for_questions']);

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureArray(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined);
  return value === null || value === undefined ? [] : [value];
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(html) {
  return normalizeText(
    decodeHtmlEntities(
      String(html || '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ),
  );
}

function extractTitle(html, fallbackUrl) {
  const title = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return normalizeText(decodeHtmlEntities(title || fallbackUrl));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashNormalizedContent(value) {
  return `sha256:${sha256(normalizeText(value))}`;
}

function isIsoDateTime(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function requiredString(value, field, id) {
  const normalized = normalizeText(value);
  if (!normalized) throw new Error(`${id} missing ${field}`);
  return normalized;
}

function normalizeDomain(domain, id) {
  return {
    domain_id: requiredString(domain?.domain_id, 'domains[].domain_id', id),
    domain_name: requiredString(domain?.domain_name, 'domains[].domain_name', id),
    task_statement_ids: ensureArray(domain?.task_statement_ids).map((item) => requiredString(item, 'domains[].task_statement_ids[]', id)),
    weight_percent: Number(domain?.weight_percent),
  };
}

function normalizeFact(fact, id) {
  const normalized = {
    fact: requiredString(fact?.fact, 'extracted_facts[].fact', id),
    fact_type: requiredString(fact?.fact_type, 'extracted_facts[].fact_type', id),
    source_locator: requiredString(fact?.source_locator, 'extracted_facts[].source_locator', id),
    confidence: requiredString(fact?.confidence, 'extracted_facts[].confidence', id),
  };
  if (!FACT_TYPES.has(normalized.fact_type)) throw new Error(`${id} invalid fact_type ${normalized.fact_type}`);
  if (!['high', 'medium', 'low'].includes(normalized.confidence)) throw new Error(`${id} invalid confidence ${normalized.confidence}`);
  return normalized;
}

function normalizeExamRelevance(relevance, id, trackId) {
  const normalized = {
    exam_code: requiredString(relevance?.exam_code, 'exam_relevance.exam_code', id),
    relevance_level: requiredString(relevance?.relevance_level, 'exam_relevance.relevance_level', id),
    why_it_matters: requiredString(relevance?.why_it_matters, 'exam_relevance.why_it_matters', id),
    question_use: ensureArray(relevance?.question_use).map((item) => requiredString(item, 'exam_relevance.question_use[]', id)),
    separation_note: requiredString(relevance?.separation_note, 'exam_relevance.separation_note', id),
  };
  if (normalized.exam_code !== EXAM_CODES_BY_TRACK[trackId]) throw new Error(`${id} exam_code ${normalized.exam_code} does not match ${trackId}`);
  if (!RELEVANCE_LEVELS.has(normalized.relevance_level)) throw new Error(`${id} invalid relevance_level ${normalized.relevance_level}`);
  for (const use of normalized.question_use) {
    if (!QUESTION_USES.has(use)) throw new Error(`${id} invalid question_use ${use}`);
  }
  return normalized;
}

export function normalizeCatalogEntry(entry) {
  const id = requiredString(entry?.id, 'id', 'source entry');
  const trackId = requiredString(entry?.track_id, 'track_id', id);
  if (!TRACK_IDS.includes(trackId)) throw new Error(`${id} unsupported track_id ${trackId}`);
  if (!id.startsWith(`${trackId}:`)) throw new Error(`${id} must start with ${trackId}:`);
  const sourceType = requiredString(entry?.source_type, 'source_type', id);
  if (!SOURCE_TYPES.has(sourceType)) throw new Error(`${id} invalid source_type ${sourceType}`);
  return {
    id,
    track_id: trackId,
    title: requiredString(entry?.title, 'title', id),
    source_type: sourceType,
    url: requiredString(entry?.url, 'url', id),
    publisher: requiredString(entry?.publisher || 'AWS', 'publisher', id),
    aws_service: ensureArray(entry?.aws_service).map((service) => requiredString(service, 'aws_service[]', id)),
    domains: ensureArray(entry?.domains).map((domain) => normalizeDomain(domain, id)),
    concepts: ensureArray(entry?.concepts).map((concept) => requiredString(concept, 'concepts[]', id)),
    summary: requiredString(entry?.summary, 'summary', id),
    extracted_facts: ensureArray(entry?.extracted_facts).map((fact) => normalizeFact(fact, id)),
    exam_relevance: normalizeExamRelevance(entry?.exam_relevance, id, trackId),
    last_checked_at: entry?.last_checked_at ?? null,
    retrieved_at: entry?.retrieved_at ?? null,
    content_hash: entry?.content_hash ?? null,
    license_or_usage_note: requiredString(entry?.license_or_usage_note || 'AWS public material; summarize, cite, and link rather than copying source text wholesale.', 'license_or_usage_note', id),
    citation_text: requiredString(entry?.citation_text || `${entry?.publisher || 'AWS'}, ${entry?.title}, ${entry?.url}`, 'citation_text', id),
    freshness_status: entry?.freshness_status || 'unverified',
    notes: ensureArray(entry?.notes).map((note) => requiredString(note, 'notes[]', id)),
    stale_after_days: Number(entry?.stale_after_days || 45),
  };
}

export function loadSourceCatalog(catalogPath = SOURCE_CATALOG_PATH) {
  const catalog = readJson(catalogPath, { schema_version: SCHEMA_VERSION, sources: [] });
  const sources = ensureArray(catalog.sources).map(normalizeCatalogEntry);
  return { schema_version: catalog.schema_version || SCHEMA_VERSION, sources };
}

export function validateSourceCatalog(catalog) {
  const errors = [];
  const seen = new Set();
  for (const source of catalog.sources || []) {
    try {
      const normalized = normalizeCatalogEntry(source);
      if (seen.has(normalized.id)) errors.push(`Duplicate source id ${normalized.id}`);
      seen.add(normalized.id);
      if (!SOURCE_TYPES.has(normalized.source_type)) errors.push(`${normalized.id} invalid source_type`);
      if (normalized.domains.some((domain) => Number.isNaN(domain.weight_percent))) errors.push(`${normalized.id} invalid domain weight_percent`);
      if (normalized.last_checked_at !== null && normalized.last_checked_at !== undefined && !isIsoDateTime(normalized.last_checked_at)) errors.push(`${normalized.id} invalid last_checked_at`);
      if (normalized.retrieved_at !== null && normalized.retrieved_at !== undefined && !isIsoDateTime(normalized.retrieved_at)) errors.push(`${normalized.id} invalid retrieved_at`);
      if (normalized.content_hash !== null && !/^sha256:[a-f0-9]{64}$/.test(normalized.content_hash)) errors.push(`${normalized.id} invalid content_hash`);
      if (!FRESHNESS_STATUSES.has(normalized.freshness_status)) errors.push(`${normalized.id} invalid freshness_status ${normalized.freshness_status}`);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length) {
    const error = new Error(`Source catalog validation failed:\n- ${errors.join('\n- ')}`);
    error.validationErrors = errors;
    throw error;
  }
  return true;
}

function extractFetchedDocument(buffer, contentType, url) {
  const mime = String(contentType || '').toLowerCase();
  if (mime.includes('text/html')) {
    const html = buffer.toString('utf8');
    const text = stripHtml(html);
    return { extracted_title: extractTitle(html, url), normalized_content: text, content_kind: 'html' };
  }
  if (mime.includes('application/json') || mime.includes('text/plain') || mime.includes('application/xml') || mime.includes('text/xml')) {
    const text = normalizeText(buffer.toString('utf8'));
    return { extracted_title: url, normalized_content: text, content_kind: 'text' };
  }
  if (mime.includes('application/pdf')) {
    return { extracted_title: url.split('/').pop() || url, normalized_content: buffer, content_kind: 'pdf' };
  }
  return { extracted_title: url, normalized_content: buffer, content_kind: 'binary' };
}

function freshnessForSuccessfulFetch(previousRecord, contentHash, now, staleAfterDays) {
  if (previousRecord?.content_hash && previousRecord.content_hash !== contentHash) return 'needs_refresh';
  const checkedAt = previousRecord?.last_checked_at ? Date.parse(previousRecord.last_checked_at) : Date.parse(now);
  const ageMs = Date.parse(now) - checkedAt;
  if (Number.isFinite(ageMs) && ageMs > staleAfterDays * 24 * 60 * 60 * 1000) return 'stale';
  return 'fresh';
}

export function normalizeSourceRecord(entry, fetched, previousRecord = null, now = new Date().toISOString()) {
  const base = normalizeCatalogEntry(entry);
  const checkedAt = now;

  if (!fetched.ok) {
    const preservedHash = previousRecord?.content_hash || base.content_hash || null;
    return {
      ...base,
      last_checked_at: checkedAt,
      retrieved_at: previousRecord?.retrieved_at || base.retrieved_at || now,
      content_hash: preservedHash,
      freshness_status: base.freshness_status === 'auth_gated' ? 'auth_gated' : 'needs_refresh',
      notes: [
        ...base.notes,
        ...(previousRecord?.notes || []).filter((note) => !base.notes.includes(note)),
        `Fetch unavailable during ingestion: ${fetched.error || 'unknown error'}`,
      ],
    };
  }

  const document = extractFetchedDocument(fetched.buffer, fetched.content_type, fetched.final_url || base.url);
  const contentHash = document.content_kind === 'pdf' || document.content_kind === 'binary'
    ? `sha256:${sha256(document.normalized_content)}`
    : hashNormalizedContent(document.normalized_content);
  const notes = [...base.notes];
  if (document.content_kind === 'pdf') notes.push('PDF fetched and hashed as binary; text extraction intentionally skipped to avoid ingestion dependencies.');
  if (document.content_kind === 'binary') notes.push(`Fetched ${fetched.content_type || 'binary content'} and hashed bytes; text extraction is not supported.`);

  return {
    ...base,
    title: base.title || document.extracted_title,
    last_checked_at: checkedAt,
    retrieved_at: now,
    content_hash: contentHash,
    freshness_status: freshnessForSuccessfulFetch(previousRecord, contentHash, now, base.stale_after_days),
    notes,
  };
}

async function fetchSource(entry, fetchImpl) {
  try {
    const response = await fetchImpl(entry.url, {
      redirect: 'follow',
      headers: { 'user-agent': 'VionLearningSourceIngestion/0.2 (+local private study app)' },
      signal: AbortSignal.timeout(20000),
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      ok: response.ok,
      http_status: response.status,
      content_type: response.headers.get('content-type') || '',
      final_url: response.url || entry.url,
      buffer,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return { ok: false, http_status: null, content_type: null, final_url: entry.url, buffer: Buffer.alloc(0), error: error.message };
  }
}

export function envelopePathForTrack(trackId, root = ROOT) {
  return path.join(root, 'data/sources', trackId, 'ingested_sources.json');
}

export function readIngestedEnvelope(trackId, root = ROOT) {
  return readJson(envelopePathForTrack(trackId, root), { track_id: trackId, schema_version: SCHEMA_VERSION, generated_at: null, sources: [] });
}

export function writeIngestedEnvelope(trackId, generatedAt, sources, root = ROOT) {
  const envelope = { track_id: trackId, schema_version: SCHEMA_VERSION, generated_at: generatedAt, sources };
  writeJson(envelopePathForTrack(trackId, root), envelope);
  return envelope;
}

export function loadAllIngestedSourceRecords(root = ROOT) {
  return Object.fromEntries(TRACK_IDS.map((trackId) => [trackId, readIngestedEnvelope(trackId, root).sources || []]));
}

export function loadGeneratedSourceRecords(trackId, generatedDir = null) {
  if (generatedDir) {
    const legacyPath = path.join(generatedDir, trackId, 'source_records.json');
    if (fs.existsSync(legacyPath)) return readJson(legacyPath, []);
  }
  return readIngestedEnvelope(trackId).sources || [];
}

export function loadAllGeneratedSourceRecords(generatedDir = null) {
  return Object.fromEntries(TRACK_IDS.map((trackId) => [trackId, loadGeneratedSourceRecords(trackId, generatedDir)]));
}

export async function ingestSourceCatalog({ catalogPath = SOURCE_CATALOG_PATH, root = ROOT, generatedDir = null, fetchImpl = fetch, now = new Date().toISOString() } = {}) {
  const catalog = loadSourceCatalog(catalogPath);
  validateSourceCatalog(catalog);
  const output = {};

  for (const trackId of TRACK_IDS) {
    const previous = readIngestedEnvelope(trackId, root).sources || [];
    const previousById = new Map(previous.map((record) => [record.id, record]));
    const entries = catalog.sources.filter((source) => source.track_id === trackId);
    output[trackId] = [];
    for (const entry of entries) {
      const fetched = await fetchSource(entry, fetchImpl);
      output[trackId].push(normalizeSourceRecord(entry, fetched, previousById.get(entry.id), now));
    }
    writeIngestedEnvelope(trackId, now, output[trackId], root);
    if (generatedDir) writeJson(path.join(generatedDir, trackId, 'source_records.json'), output[trackId]);
  }

  if (generatedDir) writeJson(path.join(generatedDir, 'index.json'), { generated_at: now, summary: summarizeSourceInventory(output), tracks: output });
  const report = buildFreshnessReport(output, now);
  const reportPath = sourceReportPath(root);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  return { generated_at: now, summary: summarizeSourceInventory(output), tracks: output, report_path: reportPath };
}

export function summarizeSourceInventory(recordsByTrack) {
  return Object.fromEntries(Object.entries(recordsByTrack).map(([trackId, records]) => {
    const freshness = records.reduce((acc, record) => {
      acc[record.freshness_status] = (acc[record.freshness_status] || 0) + 1;
      return acc;
    }, {});
    return [trackId, { count: records.length, freshness }];
  }));
}

function lookupKey(value) {
  return normalizeText(value).toLowerCase();
}

function addToLookup(map, key, record) {
  const normalized = lookupKey(key);
  if (!normalized) return;
  const bucket = map.get(normalized) || [];
  if (!bucket.some((candidate) => candidate.id === record.id)) bucket.push(record);
  map.set(normalized, bucket);
}

export function createSourceIndex(records = []) {
  const byId = new Map();
  const byUrl = new Map();
  const byService = new Map();
  const byConcept = new Map();
  const addUrlKey = (key, record) => {
    if (key && !byUrl.has(key)) byUrl.set(key, record);
  };
  const addDocsDirectoryKeys = (url, record) => {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.endsWith('amazonaws.com') && !parsed.hostname.endsWith('aws.amazon.com')) return;
      addUrlKey(`${parsed.origin}${parsed.pathname.replace(/[^/]*$/, '')}`, record);
      const docsMatch = parsed.pathname.match(/^\/([^/]+)\/latest\/([^/]+)\//);
      if (docsMatch) addUrlKey(`${parsed.origin}/${docsMatch[1]}/latest/${docsMatch[2]}/`, record);
    } catch {
      // Ignore non-URL local sources.
    }
  };
  for (const record of records) {
    byId.set(record.id, record);
    for (const key of [record.url, record.final_url].filter(Boolean)) {
      addUrlKey(key, record);
      addDocsDirectoryKeys(key, record);
    }
    for (const service of ensureArray(record.aws_service)) {
      addToLookup(byService, service, record);
      const serviceLower = service.toLowerCase();
      if (serviceLower.includes('elastic compute cloud')) addUrlKey('https://aws.amazon.com/ec2/', record);
      if (serviceLower.includes('organizations')) addUrlKey('https://docs.aws.amazon.com/singlesignon/', record);
      if (serviceLower.includes('virtual private cloud')) addUrlKey('https://docs.aws.amazon.com/directconnect/', record);
    }
    for (const concept of ensureArray(record.concepts)) addToLookup(byConcept, concept, record);
  }
  return { byId, byUrl, byService, byConcept };
}

export function createSourceRegistry(recordsByTrack = loadAllGeneratedSourceRecords()) {
  const tracks = {};
  for (const [trackId, rawRecords] of Object.entries(recordsByTrack || {})) {
    const records = ensureArray(rawRecords).filter((record) => !record.track_id || record.track_id === trackId);
    tracks[trackId] = { track_id: trackId, records, index: createSourceIndex(records) };
  }
  return { schema_version: SCHEMA_VERSION, tracks };
}

export function resolveSourceRegistry(registry, { trackId, ids = [], service, concept } = {}) {
  const track = registry?.tracks?.[trackId];
  if (!track) return [];
  let records = [...track.records];
  if (ids?.length) {
    const wanted = new Set(ensureArray(ids));
    records = records.filter((record) => wanted.has(record.id));
  }
  if (service) {
    const allowed = new Set((track.index.byService.get(lookupKey(service)) || []).map((record) => record.id));
    records = records.filter((record) => allowed.has(record.id));
  }
  if (concept) {
    const allowed = new Set((track.index.byConcept.get(lookupKey(concept)) || []).map((record) => record.id));
    records = records.filter((record) => allowed.has(record.id));
  }
  return records;
}

export function resolveSourceIdsFromUrls(urls = [], index = createSourceIndex([])) {
  return ensureArray(urls)
    .map((url) => {
      const direct = index.byUrl.get(url)?.id;
      if (direct) return direct;
      for (const [prefix, record] of index.byUrl.entries()) {
        if (String(url).startsWith(prefix)) return record.id;
      }
      return null;
    })
    .filter(Boolean)
    .filter((value, idx, arr) => arr.indexOf(value) === idx);
}

export function resolveSourceRecords({ records = [], ids = [], service, concept } = {}) {
  let filtered = [...records];
  if (ids?.length) {
    const wanted = new Set(ids);
    filtered = filtered.filter((record) => wanted.has(record.id));
  }
  if (service) filtered = filtered.filter((record) => ensureArray(record.aws_service).includes(service));
  if (concept) filtered = filtered.filter((record) => ensureArray(record.concepts).includes(concept));
  return filtered;
}

function escapeTable(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function buildFreshnessReport(recordsByTrack, generatedAt = new Date().toISOString()) {
  const lines = [
    '# Source freshness and provenance report',
    '',
    `Generated at: ${generatedAt}`,
    '',
    'This report is produced from checked-in local source ingestion artifacts. It records provenance, public fetch status, content hashes, and freshness without a database or vector store.',
    '',
  ];

  for (const trackId of Object.keys(recordsByTrack).sort()) {
    const records = recordsByTrack[trackId] || [];
    const counts = records.reduce((acc, record) => {
      acc[record.freshness_status] = (acc[record.freshness_status] || 0) + 1;
      return acc;
    }, {});
    lines.push(`## ${trackId}`);
    lines.push('');
    lines.push(`- sources: ${records.length}`);
    for (const status of [...FRESHNESS_STATUSES].sort()) lines.push(`- ${status}: ${counts[status] || 0}`);
    lines.push('');
    lines.push('| id | type | status | last checked | hash | title | citation |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const record of records) {
      lines.push(`| ${escapeTable(record.id)} | ${escapeTable(record.source_type)} | ${escapeTable(record.freshness_status)} | ${escapeTable(record.last_checked_at || 'n/a')} | ${escapeTable(record.content_hash || 'n/a')} | ${escapeTable(record.title)} | ${escapeTable(record.citation_text)} |`);
      for (const note of ensureArray(record.notes)) lines.push(`|  | note |  |  |  |  | ${escapeTable(note)} |`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

export function validateIngestedEnvelope(envelope, expectedTrackId) {
  const errors = [];
  if (envelope?.schema_version !== SCHEMA_VERSION) errors.push(`${expectedTrackId} schema_version must be ${SCHEMA_VERSION}`);
  if (envelope?.track_id !== expectedTrackId) errors.push(`${expectedTrackId} envelope track_id mismatch`);
  if (!isIsoDateTime(envelope?.generated_at)) errors.push(`${expectedTrackId} generated_at must be ISO 8601`);
  const ids = new Set();
  for (const record of ensureArray(envelope?.sources)) {
    try {
      const normalized = normalizeCatalogEntry(record);
      if (normalized.track_id !== expectedTrackId) errors.push(`${record.id} track_id mismatch for ${expectedTrackId}`);
      if (ids.has(normalized.id)) errors.push(`${expectedTrackId} duplicate ingested id ${normalized.id}`);
      ids.add(normalized.id);
      if (!isIsoDateTime(record.last_checked_at)) errors.push(`${record.id} last_checked_at must be ISO 8601`);
      if (!isIsoDateTime(record.retrieved_at)) errors.push(`${record.id} retrieved_at must be ISO 8601`);
      if (record.content_hash !== null && !/^sha256:[a-f0-9]{64}$/.test(record.content_hash)) errors.push(`${record.id} invalid content_hash`);
      if (!FRESHNESS_STATUSES.has(record.freshness_status)) errors.push(`${record.id} invalid freshness_status ${record.freshness_status}`);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (errors.length) {
    const error = new Error(`Ingested source validation failed:\n- ${errors.join('\n- ')}`);
    error.validationErrors = errors;
    throw error;
  }
  return true;
}
