import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRagChunks, RAG_EMBEDDING_DIMENSIONS, RAG_EMBEDDING_MODEL } from '../src/lib/ragPrototype.js';
import { SCHEMA_VERSION, ingestSourceCatalog, validateIngestedEnvelope } from '../src/lib/sourceRegistry.js';

function catalogEntry(overrides = {}) {
  return {
    id: 'clf-c02:aws-doc:lambda-welcome',
    track_id: 'clf-c02',
    title: 'What is AWS Lambda?',
    source_type: 'aws_docs',
    url: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html',
    publisher: 'AWS',
    aws_service: ['AWS Lambda'],
    domains: [{ domain_id: '3', domain_name: 'Cloud Technology and Services', task_statement_ids: ['3.3'], weight_percent: 34 }],
    concepts: ['serverless', 'event-driven compute'],
    summary: 'AWS Lambda documentation for serverless compute foundations.',
    extracted_facts: [{ fact: 'AWS Lambda runs code without provisioning or managing servers.', fact_type: 'service_capability', source_locator: 'Lambda welcome', confidence: 'high' }],
    exam_relevance: { exam_code: 'CLF-C02', relevance_level: 'core', why_it_matters: 'Supports compute service selection questions.', question_use: ['learning_card', 'concept_card', 'quiz_fact'], separation_note: 'CLF-C02 compute framing only; do not reuse for AIF-C01.' },
    license_or_usage_note: 'AWS public documentation; summarize and cite.',
    citation_text: 'AWS, What is AWS Lambda?, https://docs.aws.amazon.com/lambda/latest/dg/welcome.html',
    freshness_status: 'unverified',
    notes: [],
    stale_after_days: 45,
    ...overrides,
  };
}

function response({ ok = true, status = 200, body = '', contentType = 'text/html', url = 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html' } = {}) {
  return {
    ok,
    status,
    url,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : '') },
    async arrayBuffer() { return Buffer.from(body, 'utf8'); },
  };
}

test('source ingestion extracts compact heading sections from allowed public AWS HTML', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vion-source-ingest-'));
  const catalogPath = path.join(root, 'catalog.json');
  fs.writeFileSync(catalogPath, `${JSON.stringify({ schema_version: SCHEMA_VERSION, sources: [catalogEntry()] }, null, 2)}\n`);
  const html = `<!doctype html><html><head><title>AWS Lambda</title></head><body>
    <nav>Skip nav</nav><h1>What is AWS Lambda?</h1>
    <p>AWS Lambda runs your code without provisioning or managing servers.</p>
    <h2>Benefits</h2><p>Lambda scales automatically and charges for compute time used.</p>
    <h2>Unsupported empty section</h2><script>ignore()</script>
  </body></html>`;

  const result = await ingestSourceCatalog({
    catalogPath,
    root,
    now: '2026-06-07T22:00:00.000Z',
    fetchImpl: async (url) => response({ body: url.endsWith('/robots.txt') ? 'User-agent: *\nAllow: /' : html, contentType: 'text/html', url }),
  });

  const source = result.tracks['clf-c02'][0];
  assert.equal(source.id, 'clf-c02:aws-doc:lambda-welcome');
  assert.equal(source.freshness_status, 'fresh');
  assert.ok(Array.isArray(source.sections));
  assert.equal(source.sections.length, 2);
  assert.deepEqual(source.sections.map((section) => section.section_path), [['What is AWS Lambda?'], ['What is AWS Lambda?', 'Benefits']]);
  assert.equal(source.sections.every((section) => section.content_hash.startsWith('sha256:')), true);
  assert.equal(source.sections.every((section) => section.token_estimate > 0 && section.citation_text === source.citation_text), true);
});

test('source ingestion records robots and HTTP failures deterministically without copied fallback content', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vion-source-ingest-fail-'));
  const catalogPath = path.join(root, 'catalog.json');
  fs.writeFileSync(catalogPath, `${JSON.stringify({ schema_version: SCHEMA_VERSION, sources: [catalogEntry()] }, null, 2)}\n`);

  const result = await ingestSourceCatalog({
    catalogPath,
    root,
    now: '2026-06-07T22:00:00.000Z',
    fetchImpl: async (url) => url.endsWith('/robots.txt')
      ? response({ body: 'User-agent: *\nDisallow: /lambda/', url })
      : response({ ok: false, status: 403, body: 'Forbidden', url }),
  });

  const source = result.tracks['clf-c02'][0];
  assert.equal(source.freshness_status, 'unavailable');
  assert.equal(source.sections.length, 0);
  assert.equal(source.content_hash, null);
  assert.ok(source.notes.some((note) => /robots.txt disallows/.test(note)));
});

test('ingested public HTML AWS sources must contain extracted sections before they are source-check valid', () => {
  const envelope = {
    track_id: 'clf-c02',
    schema_version: SCHEMA_VERSION,
    generated_at: '2026-06-07T22:00:00.000Z',
    sources: [
      {
        ...catalogEntry({ freshness_status: 'fresh' }),
        last_checked_at: '2026-06-07T22:00:00.000Z',
        retrieved_at: '2026-06-07T22:00:00.000Z',
        content_hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        sections: [],
      },
    ],
  };

  assert.throws(() => validateIngestedEnvelope(envelope, 'clf-c02'), /must include at least one extracted section/);
});

test('RAG chunks prefer ingested AWS document sections with deterministic provenance', () => {
  const source = {
    ...catalogEntry(),
    freshness_status: 'fresh',
    retrieved_at: '2026-06-07T22:00:00.000Z',
    content_hash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    sections: [
      {
        section_path: ['What is AWS Lambda?', 'Benefits'],
        title: 'Benefits',
        text: 'AWS Lambda runs code without provisioning servers. Lambda scales automatically for event-driven workloads.',
        content_hash: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        token_estimate: 12,
        citation_text: 'AWS, What is AWS Lambda?, https://docs.aws.amazon.com/lambda/latest/dg/welcome.html#benefits',
        url: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html#benefits',
      },
    ],
  };
  const model = { tracks: { 'clf-c02': { id: 'clf-c02', sources: [source], cards: [], questions: [], serviceResources: [] }, 'aif-c01': { id: 'aif-c01', sources: [], cards: [], questions: [], serviceResources: [] } } };

  const first = buildRagChunks(model, { trackId: 'clf-c02', maxTokens: 20, overlapTokens: 5, now: '2026-06-07T22:05:00.000Z' });
  const second = buildRagChunks(model, { trackId: 'clf-c02', maxTokens: 20, overlapTokens: 5, now: '2026-06-07T22:05:00.000Z' });

  assert.equal(first.chunks.length, 1);
  assert.equal(first.chunks[0].id, second.chunks[0].id);
  assert.equal(first.chunks[0].content_hash, second.chunks[0].content_hash);
  assert.equal(first.chunks[0].source_id, 'clf-c02:aws-doc:lambda-welcome');
  assert.equal(first.chunks[0].url, 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html#benefits');
  assert.deepEqual(first.chunks[0].section_path, ['clf-c02', 'source', 'What is AWS Lambda?', 'Benefits', 'chunk-1']);
  assert.match(first.chunks[0].text, /Lambda runs code/);
  assert.equal(first.chunks[0].embedding_model, RAG_EMBEDDING_MODEL);
  assert.equal(first.chunks[0].embedding_dimensions, RAG_EMBEDDING_DIMENSIONS);
  assert.equal(first.chunks[0].generated_at, '2026-06-07T22:05:00.000Z');
  assert.equal(first.chunks[0].embedded_at, null);
  assert.equal(first.chunks[0].metadata.source_kind, 'aws_doc_section');
});
