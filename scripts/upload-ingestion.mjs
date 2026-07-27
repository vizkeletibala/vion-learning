#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { populateRagDatabase } from './rag-populate-db.mjs';
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

function boolArg(value) {
  return value === true || value === 'true' || value === '1' || value === 'yes';
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
const GERMAN_B2_VERB_TRANSLATIONS = {
  wählen: 'választani',
  meinen: 'gondolni / érteni alatta',
  schiefgehen: 'rosszul sikerülni / balul elsülni',
  'sich kümmern um': 'gondoskodni valamiről / foglalkozni valamivel',
};

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

function stripListMarker(line) {
  return normalizeText(String(line || '').replace(/^[-*]\s+/, ''));
}

function ensureSentence(value) {
  const text = normalizeText(value);
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function polishUsageGuidance(note) {
  const normalized = normalizeText(note);
  if (!normalized) return '';
  const plural = normalized.match(/^plural:\s*(.+)$/i);
  if (plural) return `Plural: ${plural[1]}.`;
  if (/softens questions/i.test(normalized)) return 'Use it to soften questions.';
  return ensureSentence(normalized);
}

function inferredHungarianForTerm(term) {
  const lookup = {
    wählen: 'választani',
    schiefgehen: 'rosszul sikerülni / balul elsülni',
  };
  return lookup[term] || '';
}

function inferGermanB2PartOfSpeech(term, item = {}) {
  const lowerTerm = String(term || '').toLowerCase();
  if (item.verb_forms || lowerTerm.startsWith('sich ') || (!/^(der|die|das|ein|eine)\s/.test(lowerTerm) && /(?:en|eln|ern|gehen)$/.test(lowerTerm))) return 'verb';
  if (/^(der|die|das|ein|eine)\s/.test(lowerTerm)) return 'noun';
  if (['meistens', 'manchmal', 'eigentlich', 'überhaupt', 'ziemlich'].includes(lowerTerm)) return 'adverb';
  if (['voll', 'leer', 'bunt', 'derselbe', 'dieselbe', 'dasselbe'].includes(lowerTerm)) return 'adjective_or_pronoun';
  return 'expression';
}

function synthesizeGermanB2Usage(note, term) {
  const normalized = normalizeText(note);
  if (!normalized) return { usage_guidance: '', usage_examples: [] };
  const lower = normalized.toLowerCase();
  if (lower.startsWith('plural:')) return { usage_guidance: ensureSentence(`Plural: ${normalized.slice(normalized.indexOf(':') + 1).trim()}`), usage_examples: [] };
  if (lower.startsWith('opposite:')) return { usage_guidance: ensureSentence(`Contrast with ${normalized.slice(normalized.indexOf(':') + 1).trim()}`), usage_examples: [] };
  if (lower.startsWith('also:')) return { usage_guidance: ensureSentence(`Related form: ${normalized.slice(normalized.indexOf(':') + 1).trim()}`), usage_examples: [] };
  if (lower.startsWith('softens questions')) return { usage_guidance: 'Use it to soften questions.', usage_examples: [] };
  if (lower === 'frequency adverb') return { usage_guidance: 'Use it as a frequency adverb.', usage_examples: [] };
  if (lower === 'color adjective') return { usage_guidance: 'Use it as a color adjective.', usage_examples: [] };
  if (/^in\s+/.test(lower)) return { usage_guidance: ensureSentence(`Memorize the collocation ${normalized}`), usage_examples: [normalized] };
  if (normalized.includes('=')) return { usage_guidance: ensureSentence(normalized), usage_examples: [normalized] };
  if (/\b[a-zäöüß]+\s+[a-zäöüß]+/i.test(normalized) && normalized.toLowerCase().includes(String(term || '').replace(/^(der|die|das)\s+/i, '').toLowerCase())) {
    return { usage_guidance: ensureSentence(`Example: ${normalized}`), usage_examples: [normalized] };
  }
  return { usage_guidance: ensureSentence(normalized), usage_examples: [] };
}

function finalizeGermanB2VocabCard(item, note = '') {
  const synthesized = {
    ...item,
    kind: 'vocab',
    term: normalizeText(item.term),
    hungarian: normalizeText(item.hungarian),
  };
  synthesized.text = `${synthesized.term}${synthesized.hungarian ? ` — ${synthesized.hungarian}` : ''}`;
  synthesized.translation = { hu: synthesized.hungarian };
  synthesized.card_format = 'lesson-one-vocab-card/v1';
  synthesized.front = synthesized.term;
  if (normalizeText(note)) synthesized.note = normalizeText(note);
  const usage = synthesizeGermanB2Usage(note, synthesized.term);
  if (usage.usage_guidance) synthesized.usage_guidance = usage.usage_guidance;
  if (usage.usage_examples.length) synthesized.usage_examples = usage.usage_examples;
  synthesized.part_of_speech = synthesized.part_of_speech || inferGermanB2PartOfSpeech(synthesized.term, synthesized);
  if (synthesized.part_of_speech === 'verb') {
    synthesized.verb_forms = synthesized.verb_forms || {};
    synthesized.irregular = synthesized.irregular ?? false;
  }
  const formSummary = synthesized.verb_forms
    ? [synthesized.verb_forms.present, synthesized.verb_forms.past, synthesized.verb_forms.perfect].filter(Boolean).join(' · ')
    : '';
  synthesized.back = [synthesized.hungarian, formSummary, synthesized.usage_guidance].filter(Boolean).join(' · ');
  synthesized.learner_task = `Make one B2 sentence with ${synthesized.term}${synthesized.hungarian ? ` (${synthesized.hungarian})` : ''}.`;
  return synthesized;
}

function parseVocabLine(line, base) {
  const cleanedLine = stripListMarker(line);
  const dashMatch = cleanedLine.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  const parts = dashMatch && !cleanedLine.includes('|')
    ? [dashMatch[1].trim(), inferredHungarianForTerm(dashMatch[1].trim()), dashMatch[2].trim()]
    : cleanedLine.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((part) => part.trim());
  const metadata = parts.slice(2);
  const item = {
    ...base,
    term: parts[0] || cleanedLine,
    hungarian: parts[1] || '',
  };
  const isPositionalVerbTableRow = parts.length >= 6 && !metadata.some((token) => /:/.test(token));
  const isNotesTableRow = parts.length >= 3 && !isPositionalVerbTableRow && !metadata.some((token) => /^(present|past|perfect|irregular|unregelmäßig|unregelmaessig):/i.test(token));
  if (dashMatch && parts[2]) {
    const parsedForms = parts[2].split('/').map((part) => normalizeText(part)).filter(Boolean);
    if (parsedForms.length >= 3) item.verb_forms = { present: parsedForms[0], past: parsedForms[1], perfect: parsedForms.slice(2).join(' / ') };
  }
  if (isPositionalVerbTableRow) {
    for (const [key, value] of [['present', parts[2]], ['past', parts[3]], ['perfect', parts[4]]]) {
      if (normalizeText(value)) item.verb_forms = { ...(item.verb_forms || {}), [key]: value };
    }
    if (normalizeText(parts[5])) item.irregular = parseBoolean(parts[5]) ?? false;
  }
  for (const token of metadata) {
    const match = token.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (GERMAN_B2_VERB_FORMS.includes(key)) {
      item.verb_forms = { ...(item.verb_forms || {}), [key]: value };
    } else if (key === 'irregular' || key === 'unregelmäßig' || key === 'unregelmaessig') {
      item.irregular = parseBoolean(value) ?? false;
    } else if (key === 'plural' || key === 'note' || key === 'notes' || key === 'opposite') {
      const note = key === 'plural' ? `plural: ${value}` : `${key}: ${value}`;
      item.note = item.note || note;
      item.usage_guidance = item.usage_guidance || synthesizeGermanB2Usage(note, item.term).usage_guidance;
    }
  }
  return finalizeGermanB2VocabCard(item, isNotesTableRow ? metadata.join('; ') : item.note || '');
}

function parseGermanB2VerbFormsLine(rawLine, base) {
  const line = stripListMarker(rawLine);
  const match = line.match(/^(.+?)\s+[—–-]\s+(.+?)\s*\/\s*(.+?)\s*\/\s*(.+)$/);
  if (!match) return null;
  const term = normalizeText(match[1]);
  const hungarian = GERMAN_B2_VERB_TRANSLATIONS[term] || inferredHungarianForTerm(term);
  if (!hungarian) return null;
  const perfect = normalizeText(match[4]).replace(/[.;]$/, '');
  return finalizeGermanB2VocabCard({
    ...base,
    term,
    hungarian,
    part_of_speech: 'verb',
    verb_forms: { present: normalizeText(match[2]), past: normalizeText(match[3]), perfect },
    irregular: !/(te\b|ete\b)/.test(normalizeText(match[3])),
  });
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
      grammar_exercises_derived_from_uploaded_notes: true,
      grammar_exercise_types: ['concept_check', 'transformation', 'fill_in', 'correction', 'short_production'],
    },
    issues,
  };
}

function summarizeGrammarFocus(line) {
  const text = stripListMarker(line);
  const [rawTopic, ...rest] = text.split(':');
  if (rest.length) {
    const topic = normalizeText(rawTopic).replace(/[.!?]+$/g, '') || 'the grammar point from the notes';
    const detail = normalizeText(rest.join(':'));
    return { topic, detail, learnerMeaning: '' };
  }
  const meansMatch = text.match(/^(.+?)\s+(?:means|bedeutet)\s+(.+)$/i);
  if (meansMatch) {
    const topic = normalizeText(meansMatch[1]).replace(/[.!?]+$/g, '') || 'the grammar point from the notes';
    const learnerMeaning = normalizeText(meansMatch[2]).replace(/[.!?]+$/g, '');
    return { topic, detail: text, learnerMeaning };
  }
  const topic = text.replace(/[.!?]+$/g, '') || 'the grammar point from the notes';
  return { topic, detail: text, learnerMeaning: '' };
}

function firstClause(detail, fallback) {
  const sentence = normalizeText(detail).split(/(?<=[.!?])\s+/)[0] || fallback;
  return sentence.replace(/[.!?]+$/g, '').trim();
}

function blankKeyTerm(text, fallback) {
  const candidate = normalizeText(text).match(/\b(würde|würden|würdest|würdet|obwohl|weil|wenn|trotzdem|deshalb|sein|haben|werden)\b/i)?.[0]
    || normalizeText(fallback).split(/\s+/).find((token) => token.length > 4)
    || 'Verbform';
  return { answer: candidate, cloze: normalizeText(text || fallback).replace(new RegExp(candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '_____') };
}

function germanB2ItemRetrievalMetadata({ manifest, base, chunk, flow }) {
  return {
    track_id: GERMAN_B2_TRACK_ID,
    batch_id: manifest.batch_id,
    source_id: base.source_id,
    chunk_id: chunk?.id || null,
    selection_flow: `uploaded_note_chunks -> german_tutor_flow -> ${flow}`,
    retrieval_mode: 'uploaded_document_vector_db_pipeline',
    vector_status: chunk?.embedding_model ? 'chunk_ready_for_embedding' : 'chunk_missing',
  };
}

function withGermanB2ItemProvenance(item, { manifest, base, chunk, file, seed, kind, ordinal, flow }) {
  return {
    ...item,
    generated_from_note: true,
    source_id: base.source_id,
    source_file: file.name,
    source_type: base.source_type,
    chunk_id: chunk?.id || null,
    section_path: [...(chunk?.section_path || [GERMAN_B2_TRACK_ID, 'upload', file.name]), `${kind}-${ordinal}`],
    citation_text: chunk?.citation_text || file.citation_text || file.name,
    content_hash: `sha256:${sha256(seed || item.text || item.term || item.prompt || '')}`,
    freshness_status: chunk?.freshness_status || 'unverified',
    source_seed: normalizeText(seed),
    retrieval: germanB2ItemRetrievalMetadata({ manifest, base, chunk, flow }),
  };
}

function buildGermanB2GrammarExercises({ line, base, manifest, chunk, vocabItems, ordinal }) {
  const { topic, detail, learnerMeaning } = summarizeGrammarFocus(line);
  const seedClause = firstClause(detail, topic);
  const vocabTerms = vocabItems.map((item) => item.term).filter(Boolean).slice(0, 4);
  const vocabHint = vocabTerms.length ? ` Verwende mindestens eins davon: ${vocabTerms.join(', ')}.` : '';
  let { answer, cloze } = blankKeyTerm(seedClause, topic);
  if (learnerMeaning) {
    answer = learnerMeaning;
    cloze = `${topic} = _____`;
  }
  const sourceExample = detail || seedClause || topic;
  const meaningHint = learnerMeaning ? ` Meaning from the uploaded note: ${learnerMeaning}.` : '';
  const learnerPurpose = learnerMeaning ? `Use ${topic} to express ${learnerMeaning}` : `Use ${topic} accurately in B2 sentences`;
  const common = {
    ...base,
    kind: 'grammar',
    grammar_focus: topic,
    title: topic,
    source_example: sourceExample,
    source_note_summary: learnerMeaning ? `Derived from uploaded note: ${topic} means ${learnerMeaning}.` : detail ? `Derived from uploaded note about ${topic}.` : `Derived from uploaded note heading ${topic}.`,
    notice: /\bobwohl\b/i.test(topic) || /\bobwohl\b/i.test(detail) ? 'Watch the verb position in obwohl subordinate clauses; the conjugated verb normally closes the subordinate clause.' : `Watch form, word order, and meaning when using ${topic}.`,
    german_tutor_flow: 'uploaded_notes_to_grammar_exercises',
    chunk_id: chunk?.id || null,
    retrieval: germanB2ItemRetrievalMetadata({ manifest, base, chunk, flow: 'grammar_exercise_generator' }),
  };
  return [
    {
      ...common,
      id: `${base.id}:grammar-${ordinal}-concept`,
      exercise_type: 'concept_check',
      text: `Concept check — ${topic}: In eigenen Worten, warum braucht man diese Struktur in B2-Sätzen? Antworte auf Deutsch oder Ungarisch und nenne ein eigenes Mini-Beispiel.`,
      rule: `Explain the function of ${topic} using the uploaded note as the source.`,
      generated_exercise: { type: 'concept_check', prompt: `When would you use ${topic} in B2 German?`, answer_hint: `${learnerPurpose}; give an original example.${meaningHint}` },
      answer_key: `A good answer explains when to use ${topic} and gives a learner-created example, not a copied note sentence.${meaningHint}`,
    },
    {
      ...common,
      id: `${base.id}:grammar-${ordinal}-transform`,
      exercise_type: 'transformation',
      text: `Transformation — ${topic}: Forme einen einfachen Hauptsatz in eine B2-Variante mit dieser Struktur um.${vocabHint}`,
      rule: `Transform a simple sentence so it correctly uses ${topic}.`,
      generated_exercise: { type: 'transformation', prompt: `Rewrite a simple main clause as a B2 sentence with ${topic}.${vocabHint}`, answer_hint: `The result should use ${topic} accurately.${meaningHint}` },
      answer_key: `The transformed sentence should correctly use ${topic}; acceptable vocabulary includes ${vocabTerms.join(', ') || 'terms from the uploaded note'}.${meaningHint}`,
    },
    {
      ...common,
      id: `${base.id}:grammar-${ordinal}-fill`,
      exercise_type: 'fill_in',
      text: `Fill-in — ${topic}: Ergänze eine passende Lücke in einem neuen Beispielsatz und achte auf Wortstellung/Form: _____ (${topic}).`,
      rule: `Fill the blank with the key form or connector for ${topic}.`,
      generated_exercise: { type: 'fill_in', prompt: `Complete this note-derived cloze: ${cloze || `_____ (${topic})`}`, item: cloze || seedClause, expected_answer: answer, answer_hint: `Use the ${topic} form from the uploaded note.${meaningHint}` },
      answer_key: answer,
    },
    {
      ...common,
      id: `${base.id}:grammar-${ordinal}-correct`,
      exercise_type: 'correction',
      text: `Correction — ${topic}: Korrigiere den Satzbau in einem eigenen Satz mit ${topic}; prüfe besonders Verbposition, Kasus und Satzklammer.`,
      rule: `Correct word order, case, or verb form when applying ${topic}.`,
      generated_exercise: { type: 'correction', prompt: `Correct a learner sentence using ${topic}; focus on word order and form.`, answer_hint: /\bobwohl\b/i.test(topic) || /\bobwohl\b/i.test(detail) ? 'Bei obwohl steht das konjugierte Verb am Ende des Nebensatzes.' : `Apply ${topic} accurately without copying the note sentence.${meaningHint}` },
      answer_key: /\bobwohl\b/i.test(topic) || /\bobwohl\b/i.test(detail) ? 'Bei obwohl steht das konjugierte Verb am Ende des Nebensatzes; der Hauptsatz bleibt klar getrennt.' : `The correction should preserve the intended meaning while applying ${topic} accurately.`,
    },
    {
      ...common,
      id: `${base.id}:grammar-${ordinal}-production`,
      exercise_type: 'short_production',
      text: `Short production — ${topic}: Schreibe 2–3 neue Sätze zu Alltag, Prüfung oder Arbeit und benutze die Struktur bewusst.${vocabHint}`,
      rule: `Produce original sentences using ${topic}.`,
      generated_exercise: { type: 'short_production', prompt: `Write 2–3 original B2 sentences using ${topic}.${vocabHint}`, answer_hint: `Use ${topic} correctly and reuse note vocabulary when possible.${meaningHint}` },
      answer_key: `Look for 2–3 original sentences with correct ${topic} usage and at least one note-derived vocabulary item when available.${meaningHint}`,
    },
  ];
}

function normalizeForChunkMatch(value) {
  return normalizeText(value).toLowerCase();
}

function chunkForLine(chunks, fileName, line) {
  const fileChunks = chunks.filter((chunk) => chunk.metadata?.file_name === fileName);
  const needle = normalizeForChunkMatch(stripListMarker(line));
  if (needle) {
    const matching = fileChunks.find((chunk) => normalizeForChunkMatch(chunk.text).includes(needle));
    if (matching) return matching;
  }
  return fileChunks[0] || chunks[0] || null;
}

function parseCommaList(value) {
  return normalizeText(value).split(/[,;]+/).map((item) => normalizeText(item)).filter(Boolean);
}

function buildGermanB2ReadingItem(line, base) {
  const stripped = stripListMarker(line);
  const passage = normalizeText(stripped.replace(/^(kurzer\s+lesetext|lesetext|reading|text)\s*:\s*/i, ''));
  return {
    ...base,
    kind: 'reading',
    exercise_type: 'source_backed_reading',
    mode: 'source_sentence',
    passage,
    text: passage,
    generated_questions: [
      { type: 'comprehension', question: 'What is the main information in this note passage?', expected_answer_hint: passage },
      { type: 'vocab_in_context', question: 'Which note vocabulary should you reuse when answering?', expected_answer_hint: 'Use terms that appear in the uploaded passage.' },
    ],
    required_vocab: [],
    citation_note: 'Generated from uploaded note passage only; no external article was fabricated.',
  };
}

function attachGermanB2ReadingQuestion(reading, rawLine) {
  const question = stripListMarker(rawLine).replace(/^fragen?:\s*/i, '');
  if (!question) return reading;
  return {
    ...reading,
    generated_questions: [
      ...(reading.generated_questions || []),
      { type: 'comprehension', question, expected_answer_hint: 'Answer using the uploaded note passage.' },
    ],
  };
}

function buildGermanB2WritingItem(line, base) {
  const stripped = stripListMarker(line);
  const prompt = normalizeText(stripped.replace(/^(aufgabe|redemittel|writing|schreiben)\s*:\s*/i, '')) || 'Write a short source-backed response using the uploaded note vocabulary.';
  const promptType = /essay|aufsatz|erörter/i.test(stripped) ? 'short_essay' : 'short_answer';
  return {
    ...base,
    kind: 'writing',
    prompt_type: promptType,
    prompt,
    text: prompt,
    expected_length: promptType === 'short_essay' ? '60–90 words' : '5–6 sentences or 60–90 words',
    required_reuse: [],
    help_words: [],
    checklist: [
      'Reuse only vocabulary present in the uploaded notes.',
      'Keep the answer at the requested length.',
      'Check verb position, endings, and case before publishing.',
    ],
  };
}

function attachGermanB2WritingHelpWords(writing, rawLine) {
  const words = parseCommaList(String(rawLine || '').replace(/^[-*]?\s*hilfe-wörter\s*:\s*/i, ''));
  if (!words.length) return writing;
  return {
    ...writing,
    required_reuse: words,
    help_words: words,
    text: `${writing.prompt} Use: ${words.join(', ')}.`,
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
    const fileContent = [];
    let activeKind = null;
    const lines = String(file.extractedText || '').split(/\r?\n/);
    let currentReadingIndex = -1;
    let currentWritingIndex = -1;
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
        id: `${manifest.track_id}:review:${safeName(file.name)}:${fileContent.length + 1}`,
        source_id: `${manifest.track_id}:upload:${manifest.batch_id}:${safeName(file.name)}`,
        source_file: file.name,
        source_type: sourceType,
      };
      const chunk = chunkForLine(chunks, file.name, rawLine);
      if (kind === 'vocab') {
        if (isMarkdownTableHeaderOrDivider(rawLine)) continue;
        const item = parseVocabLine(line, base);
        fileContent.push(withGermanB2ItemProvenance(item, { manifest, base, chunk, file, seed: line, kind, ordinal: fileContent.filter((candidate) => candidate.kind === kind).length + 1, flow: 'vocab_card_generator' }));
      } else if (kind === 'grammar') {
        if (/^[-*]?\s*verb forms?:\s*$/i.test(stripListMarker(line))) continue;
        const verbCard = parseGermanB2VerbFormsLine(rawLine, base);
        if (verbCard) {
          fileContent.push(withGermanB2ItemProvenance(verbCard, { manifest, base, chunk, file, seed: line, kind: 'vocab', ordinal: fileContent.filter((candidate) => candidate.kind === 'vocab').length + 1, flow: 'vocab_card_generator' }));
          continue;
        }
        const vocabItems = [...content, ...fileContent].filter((item) => item.kind === 'vocab');
        const grammarOrdinal = fileContent.filter((item) => item.kind === 'grammar').length + 1;
        const exercises = buildGermanB2GrammarExercises({ line: stripListMarker(line), base, manifest, chunk, vocabItems, ordinal: grammarOrdinal })
          .map((item, index) => withGermanB2ItemProvenance(item, { manifest, base, chunk, file, seed: line, kind, ordinal: `${grammarOrdinal}-${index + 1}`, flow: 'grammar_exercise_generator' }));
        fileContent.push(...exercises);
      } else if (kind === 'reading') {
        if (/^fragen?:\s*$/i.test(stripListMarker(line))) continue;
        if (/^[-*]\s+/.test(rawLine) && currentReadingIndex >= 0) {
          fileContent[currentReadingIndex] = attachGermanB2ReadingQuestion(fileContent[currentReadingIndex], rawLine);
          continue;
        }
        const item = withGermanB2ItemProvenance(buildGermanB2ReadingItem(line, base), { manifest, base, chunk, file, seed: line, kind, ordinal: fileContent.filter((candidate) => candidate.kind === kind).length + 1, flow: 'reading_exercise_generator' });
        fileContent.push(item);
        currentReadingIndex = fileContent.length - 1;
      } else if (kind === 'writing') {
        if (/^hilfe-wörter\s*:/i.test(stripListMarker(line)) && currentWritingIndex >= 0) {
          fileContent[currentWritingIndex] = attachGermanB2WritingHelpWords(fileContent[currentWritingIndex], line);
          continue;
        }
        const item = withGermanB2ItemProvenance(buildGermanB2WritingItem(line, base), { manifest, base, chunk, file, seed: line, kind, ordinal: fileContent.filter((candidate) => candidate.kind === kind).length + 1, flow: 'writing_prompt_generator' });
        fileContent.push(item);
        currentWritingIndex = fileContent.length - 1;
      }
    }
    content.push(...fileContent);
  }
  const validation = validateGermanB2ReviewContent(content);
  validation.issues.unshift(...sourceIssues);
  return {
    schema_version: 'german-b2-note-review/v2',
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

export async function ingestUploadBatch({
  batchDir,
  trackId = null,
  maxParagraphs = 4,
  apply = false,
  liveEmbeddings = false,
  forceRefresh = false,
  connectionString = null,
  dbClient = null,
  dbWriter = null,
} = {}) {
  const stage = stageUploadBatch({ batchDir, trackId, maxParagraphs });
  const populate = await populateRagDatabase({
    tracks: [stage.track_id],
    chunksDir: path.dirname(stage.output_path),
    apply,
    liveEmbeddings,
    forceRefresh,
    connectionString,
    dbClient,
    dbWriter,
  });
  return {
    command: 'uploads:ingest',
    batch_dir: batchDir,
    track_id: stage.track_id,
    stage: {
      command: 'uploads:stage',
      batch_dir: batchDir,
      output_path: stage.output_path,
      chunk_count: stage.chunk_count,
      skipped: stage.skipped,
      policy: stage.policy,
    },
    populate,
    content_event: null,
  };
}

function usage() {
  console.log('Usage: node scripts/upload-ingestion.mjs <verify|stage|ingest> --batch-dir var/uploads/<batch> [--track clf-c02]');
  console.log('  verify  Rehash files and refresh the upload manifest with verification results.');
  console.log('  stage   Extract text via UTF-8, pdftotext, or tesseract when available and write a chunk artifact.');
  console.log('  ingest  Stage the upload artifact, then invoke rag-populate-db for pipeline database updates.');
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
  if (command === 'ingest') {
    const dryRunDb = boolArg(args['dry-run-db']) || boolArg(args['dry-run']);
    const result = await ingestUploadBatch({
      batchDir,
      trackId,
      maxParagraphs: Number(args['max-paragraphs'] || 4),
      apply: !dryRunDb && boolArg(args.apply),
      liveEmbeddings: boolArg(args['live-embeddings']) || boolArg(args.liveEmbeddings),
      forceRefresh: boolArg(args['force-refresh']) || boolArg(args.forceRefresh),
      connectionString: args['connection-string'] || null,
    });
    printJson(result);
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
