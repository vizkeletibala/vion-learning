#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateUploadTrackId } from '../src/lib/sourceRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_UPLOADS_DIR = path.join(ROOT, 'var', 'uploads');
const DEFAULT_TEXT_MIME = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/json',
  'application/yaml',
  'text/yaml',
  'application/xml',
  'text/xml',
  'text/csv',
]);

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
    if (!next || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function safeName(value) {
  return normalizeText(value || 'upload').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'upload';
}

function validateTrackId(trackId) {
  return validateUploadTrackId(trackId);
}

function coerceExtractedText(extracted, fallbackMethod = null) {
  if (!extracted) return null;
  if (typeof extracted === 'string') {
    return extracted.trim() ? { ok: true, text: extracted, method: fallbackMethod || 'manifest_text' } : { ok: false, error: 'no_extracted_text', needs_ocr: false };
  }
  if (typeof extracted.text === 'string') {
    const text = extracted.text;
    return text.trim()
      ? { ok: extracted.ok !== false, text, method: extracted.method || fallbackMethod || 'manifest_text', needs_ocr: extracted.needs_ocr }
      : { ok: false, error: extracted.error || 'no_extracted_text', needs_ocr: extracted.needs_ocr ?? false };
  }
  return extracted;
}

function batchDirFor(batchId, uploadsDir = DEFAULT_UPLOADS_DIR) {
  return path.join(uploadsDir, safeName(batchId));
}

function manifestPathFor(batchDir) {
  return path.join(batchDir, 'manifest.json');
}

function trackChunkPath(batchDir, trackId) {
  return path.join(batchDir, 'tracks', `${trackId}-chunks.json`);
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function isTextLike(mimeType = '', filename = '') {
  const lowerName = String(filename || '').toLowerCase();
  return Boolean(
    mimeType.startsWith('text/') ||
    DEFAULT_TEXT_MIME.has(mimeType) ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.markdown') ||
    lowerName.endsWith('.csv') ||
    lowerName.endsWith('.json') ||
    lowerName.endsWith('.yml') ||
    lowerName.endsWith('.yaml')
  );
}

function commandExists(command) {
  const result = spawnSync('bash', ['-lc', `command -v ${command} >/dev/null 2>&1`], { stdio: 'ignore' });
  return result.status === 0;
}

function tryRun(command, args, input = null) {
  const result = spawnSync(command, args, { encoding: 'utf8', input: input ?? undefined });
  if (result.error || result.status !== 0) {
    return { ok: false, output: result.stdout || '', error: result.error?.message || result.stderr || `exit ${result.status}` };
  }
  return { ok: true, output: result.stdout || '' };
}

function extractTextFromFile(filePath, mimeType, filename) {
  if (isTextLike(mimeType, filename)) {
    return { ok: true, text: fs.readFileSync(filePath, 'utf8'), method: 'utf8' };
  }
  if (mimeType === 'application/pdf' || String(filename).toLowerCase().endsWith('.pdf')) {
    if (!commandExists('pdftotext')) return { ok: false, error: 'pdftotext_not_available', needs_ocr: true };
    const result = tryRun('pdftotext', ['-layout', filePath, '-']);
    return result.ok ? { ok: true, text: result.output, method: 'pdftotext' } : { ok: false, error: result.error, needs_ocr: true };
  }
  if (mimeType.startsWith('image/') || /\.(png|jpe?g|webp|tiff?|bmp)$/i.test(filename || '')) {
    if (!commandExists('tesseract')) return { ok: false, error: 'tesseract_not_available', needs_ocr: true };
    const result = tryRun('tesseract', [filePath, 'stdout']);
    return result.ok ? { ok: true, text: result.output, method: 'tesseract' } : { ok: false, error: result.error, needs_ocr: true };
  }
  return { ok: false, error: 'unsupported_file_type', needs_ocr: true };
}

function splitIntoParagraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

function chunkText(text, maxParagraphs = 4) {
  const paragraphs = splitIntoParagraphs(text);
  if (!paragraphs.length) return [];
  const chunks = [];
  for (let index = 0; index < paragraphs.length; index += maxParagraphs) {
    chunks.push(paragraphs.slice(index, index + maxParagraphs).join('\n\n'));
  }
  return chunks;
}

const GERMAN_B2_TRACK_ID = 'german-b2-exam';
const GERMAN_B2_ALLOWED_SOURCE_TYPES = ['pdf', 'txt', 'markdown'];
const GERMAN_B2_VERB_FORMS = ['present', 'past', 'perfect'];

function germanB2SourceTypeForFile(file = {}) {
  const name = String(file.name || '').toLowerCase();
  const mime = String(file.mime_type || '').toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (mime === 'text/markdown' || mime === 'text/x-markdown' || name.endsWith('.md') || name.endsWith('.markdown')) return 'markdown';
  if (mime === 'text/plain' || name.endsWith('.txt')) return 'txt';
  return null;
}

function germanB2KindFromHeading(line) {
  const heading = normalizeText(line.replace(/^#+\s*/, '')).toLowerCase();
  if (/^(wortschatz|vokabeln?|vocab|vocabulary|szókincs|szokincs)\b/.test(heading)) return 'vocab';
  if (/^(grammatik|grammar|nyelvtan)\b/.test(heading)) return 'grammar';
  if (/^(lesen|reading|olvasás|olvasas)\b/.test(heading)) return 'reading';
  if (/^(schreiben|writing|írás|iras)\b/.test(heading)) return 'writing';
  return null;
}

function parseBoolean(value) {
  if (value === true || value === false) return value;
  const normalized = normalizeText(value).toLowerCase();
  if (['true', 'yes', 'ja', 'irregular', 'unregelmäßig', 'unregelmaessig'].includes(normalized)) return true;
  if (['false', 'no', 'nein', 'regular', 'regelmäßig', 'regelmaessig'].includes(normalized)) return false;
  return null;
}

function parseVocabLine(line, base) {
  const parts = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((part) => part.trim());
  const item = {
    ...base,
    kind: 'vocab',
    term: parts[0] || normalizeText(line),
    hungarian: parts[1] || '',
    text: line,
  };
  const metadata = parts.slice(2);
  const isPositionalTableRow = parts.length >= 6 && !metadata.some((token) => /:/.test(token));
  const tableVerbValues = isPositionalTableRow ? [
    ['present', parts[2]],
    ['past', parts[3]],
    ['perfect', parts[4]],
  ].filter(([, value]) => normalizeText(value)) : [];
  for (const [key, value] of tableVerbValues) {
    item.verb_forms = { ...(item.verb_forms || {}), [key]: value };
  }
  if (isPositionalTableRow && normalizeText(parts[5])) item.irregular = parseBoolean(parts[5]) ?? false;
  for (const token of metadata) {
    const match = token.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (GERMAN_B2_VERB_FORMS.includes(key)) {
      item.verb_forms = { ...(item.verb_forms || {}), [key]: value };
    } else if (key === 'irregular' || key === 'unregelmäßig' || key === 'unregelmaessig') {
      item.irregular = parseBoolean(value) ?? false;
    }
  }
  const lowerTerm = item.term.toLowerCase();
  const looksLikeVerb = Boolean(item.verb_forms) || lowerTerm.startsWith('sich ') || (!/^(der|die|das|ein|eine)\s/.test(lowerTerm) && /(?:en|eln|ern)$/.test(lowerTerm));
  if (looksLikeVerb) {
    item.part_of_speech = 'verb';
    item.verb_forms = item.verb_forms || {};
    item.irregular = item.irregular ?? false;
  }
  return item;
}

function isMarkdownTableHeaderOrDivider(line) {
  if (!/^\s*\|.*\|\s*$/.test(line)) return false;
  const parts = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((part) => part.trim().toLowerCase());
  if (parts.every((part) => /^:?-{3,}:?$/.test(part))) return true;
  return ['deutsch', 'german', 'wort', 'szó', 'szo'].includes(parts[0])
    && ['magyar', 'hungarian', 'ungarisch', 'jelentés', 'jelentes'].includes(parts[1]);
}

function validateGermanB2ReviewContent(content) {
  const issues = [];
  for (const item of content) {
    if (item.kind !== 'vocab') continue;
    if (!normalizeText(item.hungarian)) issues.push(`${item.id} missing Hungarian translation`);
    if (item.part_of_speech === 'verb') {
      for (const form of GERMAN_B2_VERB_FORMS) {
        if (!normalizeText(item.verb_forms?.[form])) issues.push(`${item.id} missing ${form} verb form`);
      }
      if (typeof item.irregular !== 'boolean') issues.push(`${item.id} missing irregular verb marker`);
    }
  }
  return {
    policy: {
      vocab_requires_hungarian: true,
      verb_forms_required: GERMAN_B2_VERB_FORMS,
      irregular_verbs_marked: true,
      mixed_german_hungarian_allowed: true,
      edits_require_re_review: true,
      zip_unpacking_supported: false,
    },
    issues,
  };
}

function buildGermanB2ReviewPacket({ manifest, files, chunks }) {
  const content = [];
  const sourceIssues = [];
  for (const file of files) {
    const sourceType = germanB2SourceTypeForFile(file);
    if (!sourceType || !GERMAN_B2_ALLOWED_SOURCE_TYPES.includes(sourceType)) {
      sourceIssues.push(`${file.name} unsupported German B2 source type`);
      continue;
    }
    let activeKind = null;
    const lines = String(file.extractedText || '').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = normalizeText(rawLine);
      if (!line) continue;
      const headingKind = germanB2KindFromHeading(line);
      if (headingKind) {
        activeKind = headingKind;
        continue;
      }
      if (/^#+\s+/.test(rawLine)) continue;
      const kind = activeKind || 'reading';
      const base = {
        id: `${manifest.track_id}:review:${safeName(file.name)}:${content.length + 1}`,
        source_id: `${manifest.track_id}:upload:${manifest.batch_id}:${safeName(file.name)}`,
        source_file: file.name,
        source_type: sourceType,
      };
      if (kind === 'vocab') {
        if (isMarkdownTableHeaderOrDivider(rawLine)) continue;
        content.push(parseVocabLine(line, base));
      }
      else content.push({ ...base, kind, text: line });
    }
  }
  const validation = validateGermanB2ReviewContent(content);
  validation.issues.unshift(...sourceIssues);
  return {
    schema_version: 'german-b2-note-review/v1',
    track_id: GERMAN_B2_TRACK_ID,
    batch_id: manifest.batch_id,
    generated_at: new Date().toISOString(),
    review_status: validation.issues.length ? 'needs_edit' : 'review',
    mutable: true,
    content_version: 1,
    allowed_source_types: GERMAN_B2_ALLOWED_SOURCE_TYPES,
    content,
    chunk_ids: chunks.map((chunk) => chunk.id),
    validation,
  };
}

export function verifyUploadBatch({ batchDir, expectedTrackId = null } = {}) {
  const manifest = readJson(manifestPathFor(batchDir));
  if (!manifest) throw new Error(`Missing upload manifest at ${manifestPathFor(batchDir)}`);
  if (expectedTrackId && manifest.track_id && manifest.track_id !== expectedTrackId) {
    throw new Error(`batch track_id ${manifest.track_id} does not match expected ${expectedTrackId}`);
  }
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const fileSummaries = files.map((file) => {
    const filePath = file.path || path.join(batchDir, 'raw', file.name);
    if (!fs.existsSync(filePath)) {
      return { ...file, ok: false, error: 'missing_file' };
    }
    const buffer = fs.readFileSync(filePath);
    const sha = `sha256:${sha256(buffer)}`;
    return {
      ...file,
      path: filePath,
      ok: true,
      sha256: sha,
      matches_manifest_hash: !file.sha256 || file.sha256 === sha,
      extracted_text_ready: Boolean(file.extracted_text || file.text || file.transcript),
      needs_ocr: !Boolean(file.extracted_text || file.text || file.transcript),
    };
  });
  const result = {
    ...manifest,
    verification: {
      verified_at: new Date().toISOString(),
      file_count: fileSummaries.length,
      warnings: fileSummaries.filter((file) => !file.extracted_text_ready).map((file) => `${file.name} needs OCR or text extraction`),
    },
    files: fileSummaries,
  };
  writeJson(manifestPathFor(batchDir), result);
  return result;
}

function buildSourceRecord(manifest, file, extractedText) {
  const url = file.source_url || manifest.source_url || '';
  const title = file.title || manifest.title || file.name;
  return {
    source_id: `${manifest.track_id || 'shared'}:upload:${manifest.batch_id}:${safeName(file.name)}`,
    track_id: manifest.track_id || 'shared',
    title,
    url,
    source_type: file.source_type || manifest.source_type || 'uploaded_document',
    citation_text: file.citation_text || `${title}${url ? `, ${url}` : ''}`,
    content_hash: file.sha256 || `sha256:${sha256(extractedText || '')}`,
    freshness_status: 'unverified',
    metadata: {
      batch_id: manifest.batch_id,
      uploaded_at: manifest.uploaded_at || null,
      verified_at: manifest.verification?.verified_at || null,
      file_name: file.name,
      mime_type: file.mime_type || null,
      size: file.size || null,
      extracted_with: file.extracted_with || null,
      source_url: url,
      notes: manifest.notes || '',
    },
  };
}

export function stageUploadBatch({ batchDir, trackId = null, maxParagraphs = 4 } = {}) {
  const manifest = verifyUploadBatch({ batchDir, expectedTrackId: trackId });
  const resolvedTrackId = validateTrackId(trackId || manifest.track_id || 'shared');
  const records = [];
  const germanB2Files = [];
  for (const file of manifest.files || []) {
    const filePath = file.path || path.join(batchDir, 'raw', file.name);
    const extracted = coerceExtractedText(file.extracted_text, file.extracted_with)
      || coerceExtractedText(file.text, file.extracted_with)
      || coerceExtractedText(file.transcript, file.extracted_with)
      || extractTextFromFile(filePath, file.mime_type || '', file.name);
    if (!extracted?.ok) {
      records.push({ file: file.name, skipped: true, reason: extracted?.error || 'no_extracted_text', needs_ocr: extracted?.needs_ocr !== false });
      continue;
    }
    const normalized = normalizeText(extracted.text);
    if (resolvedTrackId === GERMAN_B2_TRACK_ID) germanB2Files.push({ ...file, extractedText: extracted.text });
    const paragraphs = chunkText(extracted.text, maxParagraphs);
    const sourceRecord = buildSourceRecord(manifest, { ...file, extracted_with: extracted.method }, normalized);
    paragraphs.forEach((text, index) => {
      const chunkId = `${sourceRecord.source_id}:chunk-${index + 1}`;
      records.push({
        id: chunkId,
        track_id: resolvedTrackId,
        source_id: sourceRecord.source_id,
        url: sourceRecord.url,
        section_path: [resolvedTrackId, 'upload', safeName(file.name), `chunk-${index + 1}`],
        citation_text: sourceRecord.citation_text,
        content_hash: `sha256:${sha256(text)}`,
        freshness_status: 'unverified',
        text,
        token_estimate: text.split(/\s+/).filter(Boolean).length,
        chunk_index: index + 1,
        chunk_count: paragraphs.length,
        embedding_model: 'text-embedding-3-small',
        embedding_dimensions: 1536,
        generated_at: new Date().toISOString(),
        embedded_at: null,
        metadata: {
          source_record: sourceRecord,
          source_kind: 'uploaded_document',
          source_title: sourceRecord.title,
          extracted_with: extracted.method,
          batch_id: manifest.batch_id,
          file_name: file.name,
          page_or_segment: index + 1,
        },
      });
    });
  }

  const chunks = records.filter((item) => item.id);
  const germanB2ReviewPacket = resolvedTrackId === GERMAN_B2_TRACK_ID
    ? buildGermanB2ReviewPacket({ manifest: { ...manifest, track_id: resolvedTrackId }, files: germanB2Files, chunks })
    : undefined;
  const artifact = {
    schema_version: 'vion-upload-artifact/v1',
    track_id: resolvedTrackId,
    batch_id: manifest.batch_id,
    generated_at: new Date().toISOString(),
    chunk_count: chunks.length,
    policy: {
      verified_before_embedding: true,
      ocr_or_text_required: true,
      citation_required: true,
      no_citation_no_answer: true,
    },
    ...(germanB2ReviewPacket ? { german_b2_review_packet: germanB2ReviewPacket } : {}),
    chunks,
    skipped: records.filter((item) => item.skipped),
  };
  const outputPath = trackChunkPath(batchDir, resolvedTrackId);
  writeJson(outputPath, artifact);
  return { batch_dir: batchDir, output_path: outputPath, ...artifact };
}

export function loadBatchDir(batchDir) {
  const manifest = readJson(manifestPathFor(batchDir));
  if (!manifest) throw new Error(`Missing upload manifest at ${manifestPathFor(batchDir)}`);
  return manifest;
}

function usage() {
  console.log('Usage: node scripts/upload-ingestion.mjs <verify|stage> --batch-dir var/uploads/<batch> [--track clf-c02]');
  console.log('  verify  Rehash files and refresh the upload manifest with verification results.');
  console.log('  stage   Extract text via UTF-8, pdftotext, or tesseract when available and write a chunk artifact.');
}

async function main() {
  const [command = 'help', ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (command === 'help' || args.help) {
    usage();
    return;
  }
  const batchDir = args['batch-dir'] ? path.resolve(String(args['batch-dir'])) : batchDirFor(args.batch || args['batch-id'] || 'latest');
  const trackId = args.track || args['track-id'] || null;
  if (command === 'verify') {
    const result = verifyUploadBatch({ batchDir, expectedTrackId: trackId });
    printJson({ command: 'uploads:verify', batch_dir: batchDir, manifest: result });
    return;
  }
  if (command === 'stage') {
    const result = stageUploadBatch({ batchDir, trackId, maxParagraphs: Number(args['max-paragraphs'] || 4) });
    printJson({ command: 'uploads:stage', batch_dir: batchDir, output_path: result.output_path, chunk_count: result.chunk_count, skipped: result.skipped, policy: result.policy });
    return;
  }
  usage();
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
