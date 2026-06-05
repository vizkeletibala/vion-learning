import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildFreshnessReport,
  createSourceIndex,
  createSourceRegistry,
  ingestSourceCatalog,
  loadSourceCatalog,
  normalizeCatalogEntry,
  normalizeSourceRecord,
  resolveSourceIdsFromUrls,
  resolveSourceRegistry,
  validateIngestedEnvelope,
  validateSourceCatalog,
} from '../src/lib/sourceRegistry.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vion-learning-sources-'));
}

const domain = { domain_id: '3', domain_name: 'Cloud Technology and Services', task_statement_ids: ['3.2'], weight_percent: 34 };
const relevance = {
  exam_code: 'CLF-C02',
  relevance_level: 'core',
  why_it_matters: 'Supports service-selection questions.',
  question_use: ['learning_card', 'quiz_fact'],
  separation_note: 'CLF-C02-only mapping; do not reuse for AIF-C01 without a separate record.',
};

function schemaEntry(overrides = {}) {
  return {
    id: 'clf-c02:aws-doc:demo-source',
    track_id: 'clf-c02',
    title: 'Demo Source',
    source_type: 'aws_docs',
    url: 'https://example.com/demo',
    publisher: 'Example',
    aws_service: ['Amazon Demo'],
    domains: [domain],
    concepts: ['demo concept'],
    summary: 'A concise demo summary.',
    extracted_facts: [{ fact: 'Amazon Demo demonstrates the source schema.', fact_type: 'service_capability', source_locator: 'Demo section', confidence: 'high' }],
    exam_relevance: relevance,
    last_checked_at: null,
    retrieved_at: null,
    content_hash: null,
    license_or_usage_note: 'Public page; summarize and cite.',
    citation_text: 'Example, Demo Source, https://example.com/demo',
    freshness_status: 'unverified',
    notes: [],
    ...overrides,
  };
}

test('source catalog validates expected fields and preserves track separation', () => {
  const catalog = loadSourceCatalog();
  assert.ok(catalog.sources.length >= 18);
  assert.doesNotThrow(() => validateSourceCatalog(catalog));
  const clf = catalog.sources.filter((source) => source.track_id === 'clf-c02');
  const aif = catalog.sources.filter((source) => source.track_id === 'aif-c01');
  assert.ok(clf.length >= 18);
  assert.equal(aif.length, 0);
  assert.equal(clf.every((source) => source.id.startsWith('clf-c02:')), true);
  assert.equal(clf.every((source) => source.exam_relevance.exam_code === 'CLF-C02'), true);
});

test('catalog entries normalize arrays, citations, and schema defaults', () => {
  const source = normalizeCatalogEntry(schemaEntry());
  assert.deepEqual(source.domains, [domain]);
  assert.deepEqual(source.concepts, ['demo concept']);
  assert.deepEqual(source.aws_service, ['Amazon Demo']);
  assert.ok(source.citation_text.includes('https://example.com/demo'));
  assert.ok(source.license_or_usage_note.includes('Public page'));
});

test('source records mark changed content hashes and preserve provenance fields', () => {
  const entry = normalizeCatalogEntry(schemaEntry({ id: 'clf-c02:aws-doc:hash-test', title: 'Hash Test', url: 'https://example.com/hash' }));
  const previous = { id: entry.id, content_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000', retrieved_at: '2026-01-01T00:00:00.000Z' };
  const record = normalizeSourceRecord(entry, {
    ok: true,
    http_status: 200,
    content_type: 'text/html',
    final_url: entry.url,
    buffer: Buffer.from('<html><title>Hash Test</title><body>Fresh content for hashing and summary generation.</body></html>'),
  }, previous, '2026-06-05T00:00:00.000Z');
  assert.equal(record.freshness_status, 'needs_refresh');
  assert.match(record.content_hash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(record.last_checked_at, '2026-06-05T00:00:00.000Z');
  assert.equal(record.retrieved_at, '2026-06-05T00:00:00.000Z');
});

test('unavailable fetches fail honestly without inventing content', () => {
  const entry = normalizeCatalogEntry(schemaEntry({ id: 'clf-c02:aws-doc:broken-source', title: 'Broken Source', url: 'https://example.com/missing' }));
  const record = normalizeSourceRecord(entry, {
    ok: false,
    error: 'HTTP 404',
    http_status: 404,
    final_url: entry.url,
    content_type: 'text/html',
  }, null, '2026-06-05T00:00:00.000Z');
  assert.equal(record.freshness_status, 'needs_refresh');
  assert.equal(record.content_hash, null);
  assert.ok(record.notes.some((note) => note.includes('HTTP 404')));
});

test('ingestSourceCatalog writes local records and reports failures using mocked fetch only', async () => {
  const tmp = tempDir();
  const catalogPath = path.join(tmp, 'catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify({
    sources: [
      schemaEntry({ id: 'clf-c02:aws-doc:good-source', title: 'Good Source', url: 'https://example.com/good' }),
      schemaEntry({ id: 'aif-c01:aws-doc:bad-source', track_id: 'aif-c01', title: 'Bad Source', url: 'https://example.com/bad', exam_relevance: { ...relevance, exam_code: 'AIF-C01', separation_note: 'AIF-C01-only mapping.' } }),
    ],
  }, null, 2));

  const fetchImpl = async (url) => {
    if (url.endsWith('/good')) {
      return new Response('<html><title>Good Source</title><body>Amazon S3 buckets store objects. Buckets support policies.</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
    }
    throw new Error('network unreachable');
  };

  const result = await ingestSourceCatalog({
    catalogPath,
    root: tmp,
    generatedDir: path.join(tmp, 'generated'),
    fetchImpl,
    now: '2026-06-05T00:00:00.000Z',
  });

  assert.equal(result.tracks['clf-c02'][0].freshness_status, 'fresh');
  assert.equal(result.tracks['aif-c01'][0].freshness_status, 'needs_refresh');
  assert.equal(result.report_path, path.join(tmp, 'docs/reports/source-provenance.md'));
  assert.ok(fs.existsSync(path.join(tmp, 'docs/reports/source-provenance.md')));
  assert.ok(fs.existsSync(path.join(tmp, 'data/sources/clf-c02/ingested_sources.json')));
  assert.ok(fs.existsSync(path.join(tmp, 'generated', 'clf-c02', 'source_records.json')));
});

test('source indexes resolve source ids from URLs and service/concept lookups', () => {
  const records = [
    { id: 'clf-1', track_id: 'clf-c02', url: 'https://example.com/1', final_url: 'https://example.com/1', aws_service: ['Amazon S3'], concepts: ['buckets'] },
    { id: 'clf-2', track_id: 'clf-c02', url: 'https://example.com/2', final_url: 'https://example.com/2', aws_service: ['AWS IAM'], concepts: ['roles'] },
  ];
  const index = createSourceIndex(records);
  assert.deepEqual(resolveSourceIdsFromUrls(['https://example.com/2', 'https://example.com/1'], index), ['clf-2', 'clf-1']);
});

test('runtime source registry resolves local source metadata by track, service, concept, and id without network access', () => {
  const recordsByTrack = {
    'clf-c02': [
      { id: 'clf-1', track_id: 'clf-c02', url: 'https://example.com/1', aws_service: ['Amazon S3'], concepts: ['Object storage', 'buckets'] },
      { id: 'clf-2', track_id: 'clf-c02', url: 'https://example.com/2', aws_service: ['AWS IAM'], concepts: ['Identity'] },
    ],
    'aif-c01': [
      { id: 'aif-1', track_id: 'aif-c01', url: 'https://example.com/3', aws_service: ['Amazon Bedrock'], concepts: ['Foundation models'] },
    ],
  };
  const registry = createSourceRegistry(recordsByTrack);

  assert.deepEqual(resolveSourceRegistry(registry, { trackId: 'clf-c02', service: 'amazon s3' }).map((source) => source.id), ['clf-1']);
  assert.deepEqual(resolveSourceRegistry(registry, { trackId: 'clf-c02', concept: 'object storage' }).map((source) => source.id), ['clf-1']);
  assert.deepEqual(resolveSourceRegistry(registry, { trackId: 'clf-c02', ids: ['aif-1', 'clf-2'] }).map((source) => source.id), ['clf-2']);
  assert.deepEqual(resolveSourceRegistry(registry, { trackId: 'aif-c01', service: 'amazon s3' }).map((source) => source.id), []);
});

test('catalog and ingested envelope validation reject schema and track mismatches', () => {
  assert.throws(
    () => validateSourceCatalog({ sources: [schemaEntry(), schemaEntry()] }),
    /Duplicate source id clf-c02:aws-doc:demo-source/,
  );

  assert.throws(
    () => validateSourceCatalog({ sources: [schemaEntry({ exam_relevance: { ...relevance, exam_code: 'AIF-C01' } })] }),
    /exam_code AIF-C01 does not match clf-c02/,
  );

  assert.throws(
    () => validateSourceCatalog({ sources: [schemaEntry({ content_hash: 'sha256:not-a-real-hash' })] }),
    /invalid content_hash/,
  );

  assert.throws(
    () => validateIngestedEnvelope({
      track_id: 'clf-c02',
      schema_version: 'source-ingestion/v1',
      generated_at: '2026-06-05T00:00:00.000Z',
      sources: [schemaEntry({ track_id: 'aif-c01', id: 'aif-c01:aws-doc:cross-track', exam_relevance: { ...relevance, exam_code: 'AIF-C01', separation_note: 'AIF-only.' } })],
    }, 'clf-c02'),
    /track_id mismatch for clf-c02/,
  );
});

test('freshness status handling distinguishes fresh, stale, changed, failed, and auth-gated records', () => {
  const entry = normalizeCatalogEntry(schemaEntry({ id: 'clf-c02:aws-doc:freshness-test', title: 'Freshness Test', url: 'https://example.com/freshness' }));
  const fetched = {
    ok: true,
    http_status: 200,
    content_type: 'text/plain',
    final_url: entry.url,
    buffer: Buffer.from('Stable source content'),
  };
  const first = normalizeSourceRecord(entry, fetched, null, '2026-06-05T00:00:00.000Z');
  assert.equal(first.freshness_status, 'fresh');

  const unchanged = normalizeSourceRecord(entry, fetched, first, '2026-06-06T00:00:00.000Z');
  assert.equal(unchanged.freshness_status, 'fresh');
  assert.equal(unchanged.content_hash, first.content_hash);

  const stale = normalizeSourceRecord(entry, fetched, { ...first, last_checked_at: '2026-01-01T00:00:00.000Z' }, '2026-06-05T00:00:00.000Z');
  assert.equal(stale.freshness_status, 'stale');

  const changed = normalizeSourceRecord(entry, { ...fetched, buffer: Buffer.from('Changed source content') }, first, '2026-06-07T00:00:00.000Z');
  assert.equal(changed.freshness_status, 'needs_refresh');
  assert.notEqual(changed.content_hash, first.content_hash);

  const authGated = normalizeSourceRecord({ ...entry, freshness_status: 'auth_gated' }, { ok: false, error: 'HTTP 403', http_status: 403 }, first, '2026-06-08T00:00:00.000Z');
  assert.equal(authGated.freshness_status, 'auth_gated');
  assert.equal(authGated.content_hash, first.content_hash);
});

test('source references resolve only to records owned by the requested track', () => {
  const registry = createSourceRegistry({
    'clf-c02': [
      { id: 'clf-c02:aws-doc:shared-url', track_id: 'clf-c02', url: 'https://example.com/shared', final_url: 'https://example.com/shared', aws_service: ['Amazon S3'], concepts: ['object storage'] },
    ],
    'aif-c01': [
      { id: 'aif-c01:aws-doc:shared-url', track_id: 'aif-c01', url: 'https://example.com/shared', final_url: 'https://example.com/shared', aws_service: ['Amazon Bedrock'], concepts: ['foundation models'] },
    ],
  });

  assert.deepEqual(resolveSourceRegistry(registry, { trackId: 'clf-c02', ids: ['aif-c01:aws-doc:shared-url', 'clf-c02:aws-doc:shared-url'] }).map((source) => source.id), ['clf-c02:aws-doc:shared-url']);
  assert.deepEqual(resolveSourceRegistry(registry, { trackId: 'aif-c01', service: 'Amazon S3' }), []);
});

test('freshness report includes per-track provenance summary', () => {
  const markdown = buildFreshnessReport({
    'clf-c02': [{ id: 'clf-1', source_type: 'aws_docs', freshness_status: 'fresh', last_checked_at: '2026-06-05T00:00:00.000Z', title: 'Source A', citation_text: 'Citation A', notes: [] }],
    'aif-c01': [{ id: 'aif-1', source_type: 'aws_exam_guide', freshness_status: 'needs_refresh', last_checked_at: '2026-06-05T00:00:00.000Z', title: 'Source B', citation_text: 'Citation B', notes: ['Fetch failed'] }],
  }, '2026-06-05T00:00:00.000Z');
  assert.ok(markdown.includes('# Source freshness and provenance report'));
  assert.ok(markdown.includes('## clf-c02'));
  assert.ok(markdown.includes('## aif-c01'));
  assert.ok(markdown.includes('needs_refresh'));
});
