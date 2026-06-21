import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Blob } from 'node:buffer';
import { createServer } from '../server/index.js';
import { stageUploadBatch } from '../scripts/upload-ingestion.mjs';
import { UPLOAD_TRACK_IDS, validateUploadTrackId } from '../src/lib/sourceRegistry.js';

function tempBatchDir(prefix = 'vion-upload-batch-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createManifestBatch({ trackId = 'german-b2-exam', filename = 'lesson.txt', mimeType = 'text/plain', body = 'Hallo Welt\n\nNoch ein Absatz.' } = {}) {
  const batchDir = tempBatchDir();
  const rawDir = path.join(batchDir, 'raw');
  fs.mkdirSync(rawDir, { recursive: true });
  const filePath = path.join(rawDir, filename);
  fs.writeFileSync(filePath, body, 'utf8');
  writeJson(path.join(batchDir, 'manifest.json'), {
    batch_id: path.basename(batchDir),
    track_id: trackId,
    title: 'German B2 sample upload',
    source_url: 'https://example.test/german-b2-sample',
    source_type: 'uploaded_document',
    uploaded_at: '2026-06-18T00:00:00.000Z',
    verification: {
      verified_at: '2026-06-18T00:00:00.000Z',
      file_count: 1,
      warnings: [],
    },
    files: [
      {
        name: filename,
        path: filePath,
        mime_type: mimeType,
        size: Buffer.byteLength(body),
        sha256: '',
        extracted_text: body,
        extracted_with: 'utf8',
        source_url: 'https://example.test/german-b2-sample',
        title: 'German B2 sample upload',
        source_type: 'uploaded_document',
        citation_text: 'Example Test, German B2 sample upload, https://example.test/german-b2-sample',
      },
    ],
  });
  return batchDir;
}

async function withServer(fn) {
  const server = createServer({ log: false });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('upload track validation accepts German B2 id and display name while preserving existing upload tracks', () => {
  assert.equal(validateUploadTrackId('german-b2-exam'), 'german-b2-exam');
  assert.equal(validateUploadTrackId('german-b2'), 'german-b2-exam');
  assert.equal(validateUploadTrackId('German B2 Exam'), 'german-b2-exam');
  assert.equal(validateUploadTrackId('clf-c02'), 'clf-c02');
  assert.equal(validateUploadTrackId('aif-c01'), 'aif-c01');
  assert.equal(validateUploadTrackId('shared'), 'shared');
  assert.equal(UPLOAD_TRACK_IDS.includes('german-b2-exam'), true);
  assert.throws(() => validateUploadTrackId('zip-bundle'), /Unsupported track_id/);
});

test('stageUploadBatch accepts manifest string extracted_text and emits chunks instead of no_extracted_text', () => {
  const batchDir = createManifestBatch({ body: 'Teil 1\n\nTeil 2' });
  const result = stageUploadBatch({ batchDir, trackId: 'german-b2-exam', maxParagraphs: 1 });

  assert.equal(result.track_id, 'german-b2-exam');
  assert.equal(result.chunk_count, 2);
  assert.deepEqual(result.skipped, []);
  assert.equal(result.chunks.every((chunk) => chunk.track_id === 'german-b2-exam'), true);
  assert.equal(result.chunks.every((chunk) => chunk.freshness_status === 'unverified'), true);
  assert.equal(result.chunks.every((chunk) => chunk.metadata.source_record?.freshness_status === 'unverified'), true);
  assert.deepEqual(result.chunks.map((chunk) => chunk.text), ['Teil 1', 'Teil 2']);
});

test('server verify plus stage smoke test works for German B2 txt and markdown uploads', async () => {
  await withServer(async (base) => {
    const batchId = `german-b2-exam-smoke-${Date.now()}`;
    const formData = new FormData();
    formData.append('trackId', 'german-b2-exam');
    formData.append('title', 'German B2 smoke batch');
    formData.append('sourceUrl', 'https://example.test/german-b2-smoke');
    formData.append('sourceType', 'uploaded_document');
    formData.append('file', new Blob(['Abschnitt eins\n\nAbschnitt zwei'], { type: 'text/plain' }), 'sample.txt');
    formData.append('file', new Blob(['# Titel\n\nErster Absatz\n\nZweiter Absatz'], { type: 'text/markdown' }), 'sample.md');

    const verifyRes = await fetch(`${base}/api/admin/uploads/verify?batchId=${encodeURIComponent(batchId)}`, {
      method: 'POST',
      body: formData,
    });
    assert.equal(verifyRes.status, 200);
    const verified = await verifyRes.json();
    assert.equal(verified.manifest.track_id, 'german-b2-exam');
    assert.equal(verified.manifest.files.length, 2);
    const filesByName = new Map(verified.manifest.files.map((file) => [file.name, file]));
    assert.equal(filesByName.get('sample.txt')?.extracted_text, 'Abschnitt eins\n\nAbschnitt zwei');
    assert.equal(filesByName.get('sample.md')?.extracted_text, '# Titel\n\nErster Absatz\n\nZweiter Absatz');

    const staged = stageUploadBatch({ batchDir: verified.batch_dir, trackId: 'german-b2-exam', maxParagraphs: 1 });
    assert.equal(staged.track_id, 'german-b2-exam');
    assert.equal(staged.chunk_count, 5);
    assert.deepEqual(staged.skipped, []);
    assert.equal(staged.chunks.every((chunk) => chunk.track_id === 'german-b2-exam'), true);
    assert.equal(new Set(staged.chunks.map((chunk) => chunk.metadata.file_name)).size, 2);
    assert.equal(staged.chunks.some((chunk) => chunk.text.includes('Erster Absatz')), true);
    assert.equal(staged.chunks.some((chunk) => chunk.text.includes('Abschnitt zwei')), true);
  });
});

test('German B2 note uploads normalize mixed DE/HU vocab, grammar, reading, and writing into a review packet', () => {
  const body = `# Wortschatz
sich bewerben | jelentkezni | present: bewirbt sich | past: bewarb sich | perfect: hat sich beworben | irregular: true
die Voraussetzung | feltétel

# Grammatik
Konjunktiv II: Ich würde mich bewerben, ha lenne időm.

# Lesen
Kurzer Lesetext: Die Bewerberin erfüllt alle Voraussetzungen.

# Schreiben
Redemittel: Sehr geehrte Damen und Herren, ich interessiere mich für ...`;
  const batchDir = createManifestBatch({ body, filename: 'b2-notes.md', mimeType: 'text/markdown' });

  const result = stageUploadBatch({ batchDir, trackId: 'german-b2-exam', maxParagraphs: 1 });

  assert.equal(result.german_b2_review_packet.schema_version, 'german-b2-note-review/v1');
  assert.equal(result.german_b2_review_packet.review_status, 'review');
  assert.equal(result.german_b2_review_packet.mutable, true);
  assert.equal(result.german_b2_review_packet.content_version, 1);
  assert.deepEqual(result.german_b2_review_packet.allowed_source_types, ['pdf', 'txt', 'markdown']);
  assert.deepEqual(result.german_b2_review_packet.validation.issues, []);
  assert.deepEqual(result.german_b2_review_packet.content.map((item) => item.kind), ['vocab', 'vocab', 'grammar', 'reading', 'writing']);
  const [verb, noun] = result.german_b2_review_packet.content;
  assert.equal(verb.term, 'sich bewerben');
  assert.equal(verb.hungarian, 'jelentkezni');
  assert.deepEqual(verb.verb_forms, { present: 'bewirbt sich', past: 'bewarb sich', perfect: 'hat sich beworben' });
  assert.equal(verb.irregular, true);
  assert.equal(noun.term, 'die Voraussetzung');
  assert.equal(noun.hungarian, 'feltétel');
  assert.equal(result.german_b2_review_packet.content.some((item) => item.text.includes('ha lenne időm')), true);
});

test('German B2 lesson 1 Hungarian headings and markdown tables produce stable review packet kinds', () => {
  const body = `# Lektion 1

## Szókincs
| Deutsch | Magyar | present | past | perfect | irregular |
| --- | --- | --- | --- | --- | --- |
| sich bewerben | jelentkezni | bewirbt sich | bewarb sich | hat sich beworben | true |
| die Voraussetzung | feltétel | | | | |

## Nyelvtan
Konjunktiv II: Ich würde mich bewerben, ha lenne időm.

## Olvasás
Kurzer Lesetext: Die Bewerberin erfüllt alle Voraussetzungen.

## Írás
Redemittel: Sehr geehrte Damen und Herren, ich interessiere mich für ...`;
  const batchDir = createManifestBatch({ body, filename: 'lektion_1.md', mimeType: 'text/markdown' });

  const result = stageUploadBatch({ batchDir, trackId: 'german-b2-exam', maxParagraphs: 2 });
  const packet = result.german_b2_review_packet;

  assert.deepEqual(packet.content.map((item) => item.kind), ['vocab', 'vocab', 'grammar', 'reading', 'writing']);
  const [verb, noun] = packet.content;
  assert.equal(verb.term, 'sich bewerben');
  assert.equal(verb.hungarian, 'jelentkezni');
  assert.deepEqual(verb.verb_forms, { present: 'bewirbt sich', past: 'bewarb sich', perfect: 'hat sich beworben' });
  assert.equal(verb.irregular, true);
  assert.equal(noun.term, 'die Voraussetzung');
  assert.equal(noun.hungarian, 'feltétel');
  assert.equal(packet.validation.issues.length, 0);
});

test('German B2 note upload review packet validates Hungarian translations and complete verb metadata', () => {
  const body = `# Wortschatz
anbieten | | present: bietet an | past: bot an | irregular: true
der Antrag

# Grammatik
Nebensätze mit obwohl.`;
  const batchDir = createManifestBatch({ body, filename: 'invalid-vocab.txt', mimeType: 'text/plain' });

  const result = stageUploadBatch({ batchDir, trackId: 'german-b2-exam', maxParagraphs: 2 });

  assert.equal(result.german_b2_review_packet.review_status, 'needs_edit');
  assert.match(result.german_b2_review_packet.validation.issues.join('\n'), /Hungarian translation/);
  assert.match(result.german_b2_review_packet.validation.issues.join('\n'), /perfect/);
  assert.equal(result.german_b2_review_packet.validation.policy.vocab_requires_hungarian, true);
  assert.deepEqual(result.german_b2_review_packet.validation.policy.verb_forms_required, ['present', 'past', 'perfect']);
});

test('non German B2 upload staging remains isolated from note review packet behavior', () => {
  const batchDir = createManifestBatch({ trackId: 'clf-c02', body: '# Wortschatz\nS3 | tárhely', filename: 'aws.txt' });

  const result = stageUploadBatch({ batchDir, trackId: 'clf-c02', maxParagraphs: 1 });

  assert.equal(result.track_id, 'clf-c02');
  assert.equal(result.german_b2_review_packet, undefined);
});
