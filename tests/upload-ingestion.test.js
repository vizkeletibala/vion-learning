import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Blob } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { createServer } from '../server/index.js';
import { stageUploadBatch } from '../scripts/upload-ingestion.mjs';
import { UPLOAD_TRACK_IDS, validateUploadTrackId } from '../src/lib/sourceRegistry.js';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

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

test('upload ingest CLI stages a batch and invokes the database population entrypoint in dry-run mode', () => {
  const batchDir = createManifestBatch({ body: 'Teil 1\n\nTeil 2' });
  try {
    const result = spawnSync('node', [
      'scripts/upload-ingestion.mjs',
      'ingest',
      '--batch-dir',
      batchDir,
      '--track',
      'german-b2-exam',
      '--dry-run-db',
      '--max-paragraphs',
      '1',
    ], { cwd: ROOT, encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.command, 'uploads:ingest');
    assert.equal(payload.stage.command, 'uploads:stage');
    assert.equal(payload.stage.output_path, path.join(batchDir, 'tracks', 'german-b2-exam-chunks.json'));
    assert.equal(payload.populate.command, 'rag:populate-db');
    assert.equal(payload.populate.apply, false);
    assert.equal(payload.populate.write_plan.chunks, 2);
    assert.equal(payload.content_event, null);
  } finally {
    fs.rmSync(batchDir, { recursive: true, force: true });
  }
});

test('package uploads:ingest script points at the end-to-end ingestion entrypoint, not staging only', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['uploads:ingest'], 'node scripts/upload-ingestion.mjs ingest');
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

test('server verify returns a clean error when an existing batch raw dir is not writable', async () => {
  const batchId = `upload-eacces-${Date.now()}`;
  const batchDir = path.join(process.cwd(), 'var', 'uploads', batchId);
  const rawDir = path.join(batchDir, 'raw');
  fs.mkdirSync(rawDir, { recursive: true });
  fs.chmodSync(rawDir, 0o555);

  try {
    await withServer(async (base) => {
      const formData = new FormData();
      formData.append('trackId', 'german-b2-exam');
      formData.append('title', 'Blocked upload');
      formData.append('file', new Blob(['should fail cleanly'], { type: 'text/plain' }), 'blocked.txt');

      const verifyRes = await fetch(`${base}/api/admin/uploads/verify?batchId=${encodeURIComponent(batchId)}`, {
        method: 'POST',
        body: formData,
      });
      assert.equal(verifyRes.status, 500);
      const payload = await verifyRes.json();
      assert.match(payload.error, /EACCES|permission denied/i);

      const healthRes = await fetch(`${base}/health`);
      assert.equal(healthRes.status, 200);
    });
  } finally {
    fs.chmodSync(rawDir, 0o755);
    fs.rmSync(batchDir, { recursive: true, force: true });
  }
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

  assert.equal(result.german_b2_review_packet.schema_version, 'german-b2-note-review/v2');
  assert.equal(result.german_b2_review_packet.review_status, 'review');
  assert.equal(result.german_b2_review_packet.mutable, true);
  assert.equal(result.german_b2_review_packet.content_version, 1);
  assert.deepEqual(result.german_b2_review_packet.allowed_source_types, ['pdf', 'txt', 'markdown']);
  assert.deepEqual(result.german_b2_review_packet.validation.issues, []);
  assert.equal(result.german_b2_review_packet.content.filter((item) => item.kind === 'vocab').length, 2);
  assert.equal(result.german_b2_review_packet.content.filter((item) => item.kind === 'grammar').length, 5);
  assert.equal(result.german_b2_review_packet.content.some((item) => item.kind === 'reading'), true);
  assert.deepEqual(result.german_b2_review_packet.content.map((item) => item.kind), ['vocab', 'vocab', 'grammar', 'grammar', 'grammar', 'grammar', 'grammar', 'reading', 'writing']);
  const [verb, noun] = result.german_b2_review_packet.content;
  const grammar = result.german_b2_review_packet.content.filter((item) => item.kind === 'grammar');
  assert.deepEqual(new Set(grammar.map((item) => item.exercise_type)), new Set(['concept_check', 'transformation', 'fill_in', 'correction', 'short_production']));
  assert.equal(verb.term, 'sich bewerben');
  assert.equal(verb.hungarian, 'jelentkezni');
  assert.deepEqual(verb.verb_forms, { present: 'bewirbt sich', past: 'bewarb sich', perfect: 'hat sich beworben' });
  assert.equal(verb.irregular, true);
  assert.equal(noun.term, 'die Voraussetzung');
  assert.equal(noun.hungarian, 'feltétel');
  assert.equal(result.german_b2_review_packet.content.some((item) => item.text.includes('ha lenne időm')), false);
  assert.equal(grammar.every((item) => item.german_tutor_flow === 'uploaded_notes_to_grammar_exercises'), true);
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

  assert.equal(packet.content.filter((item) => item.kind === 'vocab').length, 2);
  assert.equal(packet.content.filter((item) => item.kind === 'grammar').length, 5);
  assert.equal(packet.content.some((item) => item.kind === 'reading'), true);
  assert.equal(packet.content.some((item) => item.kind === 'writing'), true);
  const [verb, noun] = packet.content;
  assert.equal(verb.term, 'sich bewerben');
  assert.equal(verb.hungarian, 'jelentkezni');
  assert.deepEqual(verb.verb_forms, { present: 'bewirbt sich', past: 'bewarb sich', perfect: 'hat sich beworben' });
  assert.equal(verb.irregular, true);
  assert.equal(noun.term, 'die Voraussetzung');
  assert.equal(noun.hungarian, 'feltétel');
  assert.equal(packet.validation.issues.length, 0);
});

test('German B2 uploaded vocab cards are synthesized in the lesson-one style instead of raw note lines', () => {
  const body = `# Német B2 — jegyzetek rendezve

## Wortschatz
| German | Hungarian | Notes |
| --- | --- | --- |
| der Brief | levél | plural: die Briefe |
| eigentlich | tulajdonképpen; igazából; valójában | softens questions |
| voll | tele | opposite: leer |
| die Teilzeit | részmunkaidő | in Teilzeit arbeiten |

## Grammatik
- sich kümmern um + Akkusativ means to take care of / be concerned with.
- Verb forms:
- wählen — ich wähle / ich wählte / ich habe gewählt
- schiefgehen — es geht schief / es ging schief / es ist schiefgegangen`;
  const batchDir = createManifestBatch({ body, filename: 'lektion_2_clean.md', mimeType: 'text/markdown' });

  const result = stageUploadBatch({ batchDir, trackId: 'german-b2-exam', maxParagraphs: 2 });
  const vocab = result.german_b2_review_packet.content.filter((item) => item.kind === 'vocab');

  assert.equal(vocab.length, 6);
  const brief = vocab.find((item) => item.term === 'der Brief');
  assert.equal(brief.text, 'der Brief — levél');
  assert.equal(brief.hungarian, 'levél');
  assert.equal(brief.translation.hu, 'levél');
  assert.equal(brief.note, 'plural: die Briefe');
  assert.equal(brief.usage_guidance, 'Plural: die Briefe.');
  assert.equal(brief.text.includes('|'), false);

  const eigentlich = vocab.find((item) => item.term === 'eigentlich');
  assert.equal(eigentlich.usage_guidance, 'Use it to soften questions.');

  const teilzeit = vocab.find((item) => item.term === 'die Teilzeit');
  assert.deepEqual(teilzeit.usage_examples, ['in Teilzeit arbeiten']);

  const waehlen = vocab.find((item) => item.term === 'wählen');
  assert.equal(waehlen.hungarian, 'választani');
  assert.equal(waehlen.part_of_speech, 'verb');
  assert.deepEqual(waehlen.verb_forms, { present: 'ich wähle', past: 'ich wählte', perfect: 'ich habe gewählt' });
  assert.equal(waehlen.text, 'wählen — választani');

  const schiefgehen = vocab.find((item) => item.term === 'schiefgehen');
  assert.equal(schiefgehen.hungarian, 'rosszul sikerülni / balul elsülni');
  assert.deepEqual(schiefgehen.verb_forms, { present: 'es geht schief', past: 'es ging schief', perfect: 'es ist schiefgegangen' });
  assert.equal(result.german_b2_review_packet.validation.issues.length, 0);
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

test('German B2 grammar tab derives varied tutor exercises from uploaded note concepts without copying note lines', () => {
  const body = `# Wortschatz
sich bewerben | jelentkezni | present: bewirbt sich | past: bewarb sich | perfect: hat sich beworben | irregular: true

# Grammatik
Konjunktiv II: Ich würde mich bewerben, wenn ich die Voraussetzungen erfüllen würde.
Nebensätze mit obwohl: Obwohl der Termin knapp ist, reicht sie den Antrag ein.`;
  const batchDir = createManifestBatch({ body, filename: 'grammar-source.md', mimeType: 'text/markdown' });

  const result = stageUploadBatch({ batchDir, trackId: 'german-b2-exam', maxParagraphs: 1 });
  const grammarItems = result.german_b2_review_packet.content.filter((item) => item.kind === 'grammar');

  assert.equal(grammarItems.length, 10);
  assert.deepEqual(new Set(grammarItems.map((item) => item.exercise_type)), new Set(['concept_check', 'transformation', 'fill_in', 'correction', 'short_production']));
  assert.equal(grammarItems.every((item) => item.german_tutor_flow === 'uploaded_notes_to_grammar_exercises'), true);
  assert.equal(grammarItems.every((item) => item.retrieval?.selection_flow === 'uploaded_note_chunks -> german_tutor_flow -> grammar_exercise_generator'), true);
  assert.equal(grammarItems.every((item) => item.chunk_id && result.german_b2_review_packet.chunk_ids.includes(item.chunk_id)), true);
  assert.equal(grammarItems.some((item) => /Konjunktiv II/.test(item.text) && /warum/.test(item.text.toLowerCase())), true);
  assert.equal(grammarItems.some((item) => /obwohl/.test(item.text) && /Verb am Ende/.test(item.answer_key)), true);
  assert.equal(grammarItems.some((item) => /sich bewerben/.test(item.text)), true);
  assert.equal(grammarItems.some((item) => item.text.includes('Ich würde mich bewerben, wenn ich die Voraussetzungen erfüllen würde.')), false);
  assert.equal(grammarItems.some((item) => item.text.includes('Obwohl der Termin knapp ist, reicht sie den Antrag ein.')), false);
});

test('German B2 grammar exercise prompts synthesize learner tasks from colon-less notes', () => {
  const body = `# Grammatik
- derselbe / dieselbe / dasselbe means "the same", not merely "similar"`;
  const batchDir = createManifestBatch({ body, filename: 'colonless-grammar.md', mimeType: 'text/markdown' });

  const result = stageUploadBatch({ batchDir, trackId: 'german-b2-exam', maxParagraphs: 1 });
  const grammarItems = result.german_b2_review_packet.content.filter((item) => item.kind === 'grammar');

  assert.equal(grammarItems.length, 5);
  assert.equal(grammarItems.every((item) => item.grammar_focus === 'derselbe / dieselbe / dasselbe'), true);
  assert.equal(grammarItems.every((item) => !item.generated_exercise.prompt.includes('derselbe / dieselbe / dasselbe means')), true);
  assert.equal(grammarItems.every((item) => !item.text.includes('derselbe / dieselbe / dasselbe means')), true);
  assert.equal(grammarItems.some((item) => /same|identisch|gleich/i.test(item.source_note_summary)), true);
  assert.equal(grammarItems.some((item) => /same|identisch|gleich/i.test(item.generated_exercise.answer_hint)), true);
});

test('German B2 multi-chunk review items cite the chunk containing their source section', () => {
  const body = `# Wortschatz
| German | Hungarian | Notes |
| --- | --- | --- |
| der Antrag | kérvény | plural: die Anträge |

# Grammatik
Nebensätze mit obwohl: Obwohl der Termin knapp ist, reicht sie den Antrag ein.

# Lesen
Kurzer Lesetext: Der Antrag ist wichtig, weil die Frist morgen endet.

# Schreiben
Aufgabe: Schreiben Sie eine kurze Nachricht über den Antrag.`;
  const batchDir = createManifestBatch({ body, filename: 'multi-section.md', mimeType: 'text/markdown' });

  const result = stageUploadBatch({ batchDir, trackId: 'german-b2-exam', maxParagraphs: 1 });
  const packet = result.german_b2_review_packet;
  const chunkIdContaining = (text) => result.chunks.find((chunk) => chunk.text.includes(text))?.id;
  const vocab = packet.content.find((item) => item.kind === 'vocab' && item.term === 'der Antrag');
  const grammar = packet.content.find((item) => item.kind === 'grammar' && item.exercise_type === 'concept_check');
  const reading = packet.content.find((item) => item.kind === 'reading');
  const writing = packet.content.find((item) => item.kind === 'writing');

  assert.equal(result.chunks.length, 4);
  assert.ok(vocab);
  assert.ok(grammar);
  assert.ok(reading);
  assert.ok(writing);
  assert.equal(vocab.chunk_id, chunkIdContaining('| der Antrag | kérvény | plural: die Anträge |'));
  assert.equal(grammar.chunk_id, chunkIdContaining('Nebensätze mit obwohl: Obwohl der Termin knapp ist, reicht sie den Antrag ein.'));
  assert.equal(reading.chunk_id, chunkIdContaining('Kurzer Lesetext: Der Antrag ist wichtig, weil die Frist morgen endet.'));
  assert.equal(writing.chunk_id, chunkIdContaining('Aufgabe: Schreiben Sie eine kurze Nachricht über den Antrag.'));
  assert.equal(new Set([vocab.chunk_id, grammar.chunk_id, reading.chunk_id, writing.chunk_id]).size, 4);
});

test('German B2 review packet emits structured source-backed exercises instead of label or bullet dumps', () => {
  const body = `# Lektion 2 Upload

## Wortschatz
| German | Hungarian | Notes |
| --- | --- | --- |
| der Antrag | kérvény | plural: die Anträge |
| sich kümmern um | gondoskodni valamiről | present: kümmert sich um | past: kümmerte sich um | perfect: hat sich gekümmert um | irregular: false |

## Grammatik
- Nebensätze mit obwohl: Obwohl der Termin knapp ist, reicht sie den Antrag ein.

## Lesen
Kurzer Lesetext: Der Antrag ist wichtig, weil die Frist morgen endet.
Fragen:
- Warum ist der Antrag wichtig?

## Schreiben
Aufgabe: Schreiben Sie eine kurze Nachricht über den Antrag.
Hilfe-Wörter: Antrag, Frist, kümmern`;
  const batchDir = createManifestBatch({ body, filename: 'lektion_2_structured.md', mimeType: 'text/markdown' });

  const result = stageUploadBatch({ batchDir, trackId: 'german-b2-exam', maxParagraphs: 2 });
  const packet = result.german_b2_review_packet;
  const allItems = packet.content;
  const vocab = allItems.filter((item) => item.kind === 'vocab');
  const grammar = allItems.find((item) => item.kind === 'grammar' && item.exercise_type === 'fill_in');
  const reading = allItems.find((item) => item.kind === 'reading');
  const writing = allItems.find((item) => item.kind === 'writing');

  assert.equal(packet.schema_version, 'german-b2-note-review/v2');
  assert.equal(allItems.every((item) => item.generated_from_note === true), true);
  assert.equal(allItems.every((item) => item.chunk_id && packet.chunk_ids.includes(item.chunk_id)), true);
  assert.equal(allItems.every((item) => Array.isArray(item.section_path) && item.section_path.includes('lektion_2_structured.md')), true);
  assert.equal(allItems.every((item) => item.citation_text && item.content_hash && item.freshness_status === 'unverified'), true);
  assert.equal(allItems.every((item) => item.retrieval?.track_id === 'german-b2-exam' && item.retrieval?.source_id === item.source_id && item.retrieval?.chunk_id === item.chunk_id), true);

  assert.equal(vocab.length, 2);
  assert.equal(vocab.every((item) => item.front && item.back && item.learner_task), true);
  assert.equal(vocab.find((item) => item.term === 'der Antrag').back.includes('kérvény'), true);
  assert.equal(vocab.find((item) => item.term === 'sich kümmern um').verb_forms.perfect, 'hat sich gekümmert um');

  assert.ok(grammar);
  assert.equal(grammar.source_example, 'Obwohl der Termin knapp ist, reicht sie den Antrag ein.');
  assert.equal(grammar.generated_exercise.type, 'fill_in');
  assert.equal(grammar.generated_exercise.prompt.includes('_____'), true);
  assert.equal(grammar.notice.length > 20, true);
  assert.equal(grammar.text.includes('Obwohl der Termin knapp ist, reicht sie den Antrag ein.'), false);

  assert.ok(reading);
  assert.equal(reading.text, reading.passage);
  assert.equal(reading.passage.includes('Der Antrag ist wichtig'), true);
  assert.equal(reading.generated_questions.length >= 2, true);
  assert.equal(reading.generated_questions.every((question) => question.question && question.expected_answer_hint), true);
  assert.notEqual(reading.text.trim(), 'Fragen:');

  assert.ok(writing);
  assert.equal(writing.prompt_type, 'short_answer');
  assert.equal(writing.prompt.includes('Antrag'), true);
  assert.equal(writing.expected_length, '5–6 sentences or 60–90 words');
  assert.deepEqual(writing.required_reuse, ['Antrag', 'Frist', 'kümmern']);
  assert.deepEqual(writing.help_words, ['Antrag', 'Frist', 'kümmern']);
  assert.equal(writing.checklist.length >= 3, true);
  assert.notEqual(writing.text.trim(), 'Hilfe-Wörter: Antrag, Frist, kümmern');
});

test('non German B2 upload staging remains isolated from note review packet behavior', () => {
  const batchDir = createManifestBatch({ trackId: 'clf-c02', body: '# Wortschatz\nS3 | tárhely', filename: 'aws.txt' });

  const result = stageUploadBatch({ batchDir, trackId: 'clf-c02', maxParagraphs: 1 });

  assert.equal(result.track_id, 'clf-c02');
  assert.equal(result.german_b2_review_packet, undefined);
});
