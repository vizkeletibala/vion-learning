import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSourceIndex, createSourceRegistry, loadGeneratedSourceRecords, resolveSourceIdsFromUrls, resolveSourceRegistry } from './sourceRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const TRACK_IDS = ['clf-c02', 'aif-c01'];
const TRACK_ACCENTS = { 'clf-c02': 'blue', 'aif-c01': 'purple' };
const DIFFICULTY_ORDER = { foundation: 0, intermediate: 1, advanced: 2, review: 3 };

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function tryReadJson(relativePath, fallback) {
  const filePath = path.join(ROOT, relativePath);
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : fallback;
}

function addDays(days) {
  const date = new Date('2026-06-03T12:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function uniqueBy(items = [], keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function rotate(items = [], offset = 0) {
  if (!items.length) return [];
  const start = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function serviceTags(topics = []) {
  const known = ['AWS', 'Amazon', 'IAM', 'EC2', 'Lambda', 'RDS', 'S3', 'Bedrock', 'SageMaker', 'CloudWatch', 'Organizations', 'WAF', 'Shield', 'GuardDuty', 'Q', 'VPC', 'CloudTrail', 'Config'];
  const found = new Set();
  for (const topic of topics) {
    for (const word of known) {
      if (String(topic).toLowerCase().includes(word.toLowerCase())) found.add(word.startsWith('AWS') || word.startsWith('Amazon') ? word : `AWS ${word}`);
    }
  }
  if (!found.size) found.add('AWS foundational services');
  return [...found].slice(0, 5);
}

function option(id, label, explanation) {
  return { id, label, explanation };
}

function buildDistractorLabels(trackId, card, points, correct, taskId) {
  const primary = points[0] || card.services?.[0] || card.domain_name;
  const secondary = points[1] || card.services?.[1] || `another ${card.domain_name} concept`;
  const tertiary = points[2] || card.services?.[2] || `a different ${card.domain_name} task`;
  const candidates = [
    ...(card.misconceptions || card.common_misconceptions || []),
    `A single product feature such as ${secondary} without explaining ${primary}.`,
    `${tertiary} by itself, missing how ${primary} answers ${trackId.toUpperCase()} task ${taskId}.`,
    `${card.domain_name} terminology from another task area instead of the specific ${taskId} clue.`,
    `An adjacent AWS service choice that sounds related to ${primary} but does not satisfy the scenario.`,
  ];
  return unique(candidates)
    .filter((label) => label && label !== correct)
    .slice(0, 3);
}

function buildQuestionFromCard(trackId, card, index) {
  const points = unique(card.expected_answer_points || card.concepts || []);
  const taskId = card.topic_id || card.task_statement_id || 'unmapped';
  const sourceIds = unique(card.source_ids || []);
  const correct = card.short_answer || points.slice(0, 2).join('; ') || card.domain_name;
  const wrongs = buildDistractorLabels(trackId, card, points, correct, taskId);
  const options = [
    option('opt-1', correct, `${correct} fits because it lines up with ${trackId.toUpperCase()} task statement ${taskId} and the teaching points on this card.`),
    option('opt-2', wrongs[0], 'This distractor reflects a plausible misconception rather than the best exam decision.'),
    option('opt-3', wrongs[1], 'This distractor names an adjacent concept, but it does not answer the actual AWS decision being tested.'),
    option('opt-4', wrongs[2], 'This distractor follows a different task angle and therefore misses the intended exam clue.'),
  ];
  return {
    id: `${card.id}-q${index + 1}`,
    track_id: trackId,
    card_id: card.id,
    concept_id: card.concept_id || null,
    domain_id: String(card.domain_id),
    domain_name: card.domain_name,
    topic_id: taskId,
    services: unique(card.services || serviceTags(points)),
    concepts: unique(card.concepts || points).slice(0, 6),
    difficulty: card.difficulty || 'review',
    question_type: card.origin === 'concept_record' ? 'concept_reinforcement' : 'knowledge_check',
    scenario: card.scenario || `Review the mapped idea behind ${card.domain_name}.`,
    exam_angle: card.exam_angle || `Reinforce the original ${trackId.toUpperCase()} mapped concept without using copied exam wording.`,
    common_misconceptions: unique(card.misconceptions || []),
    decision_rules: unique(card.decision_rules || []),
    prompt: card.origin === 'concept_record'
      ? `${card.exam_angle} Which answer best matches this CLF-C02 situation? ${card.scenario}`
      : `For ${trackId.toUpperCase()} ${card.domain_name}, which answer best addresses: ${card.prompt.replace(/^Explain:\s*/i, '')}`,
    options,
    correct_option_id: 'opt-1',
    explanations: {
      correct: `${correct} is the strongest answer because it matches the mapped domain, concept, and scenario rather than a vague definition.`,
      distractors: options.filter((candidate) => candidate.id !== 'opt-1').map((candidate) => ({ option_id: candidate.id, explanation: candidate.explanation })),
    },
    source_links: card.source_links || [],
    source_ids: sourceIds,
  };
}

function buildCards(trackId, rawCards, verifiedDate, sourceIndex) {
  return rawCards.map((raw, index) => {
    const points = raw.expected_answer_points || [];
    const sourceLinks = raw.source_links || [];
    return {
      id: raw.id,
      track_id: trackId,
      domain_id: String(raw.domain_id ?? '0'),
      domain_name: raw.domain_name || 'Cross-domain synthesis',
      topic_id: raw.task_statement_id || raw.topic_id || 'cross-domain',
      task_statement_id: raw.task_statement_id || raw.topic_id || 'cross-domain',
      prompt: raw.prompt,
      short_answer: points.slice(0, 3).join('; ') || raw.domain_name,
      detailed_explanation: `Original ${trackId.toUpperCase()} learning card for ${raw.domain_name}. A strong answer should connect ${points.slice(0, 5).join(', ')} to the official task statement without using copied exam items.`,
      services: serviceTags(points),
      concepts: points,
      difficulty: index % 3 === 0 ? 'foundation' : index % 3 === 1 ? 'intermediate' : 'review',
      source_links: sourceLinks,
      source_ids: resolveSourceIdsFromUrls(sourceLinks, sourceIndex),
      last_verified: verifiedDate,
      tags: [trackId, `domain-${raw.domain_id}`, raw.task_statement_id, ...points.slice(0, 3).map((point) => slugify(point))].filter(Boolean),
      status: 'new',
      origin: 'original_seed',
      spaced_repetition: { interval_days: 0, ease: 2.5, due_at: addDays(0), review_count: 0 },
      expected_answer_points: points,
    };
  });
}

function buildConceptCards(trackId, concepts, verifiedDate, sourceIndex) {
  if (!Array.isArray(concepts) || !concepts.length) return [];
  return concepts.map((concept, index) => ({
    id: `${concept.id}-card`,
    concept_id: concept.id,
    track_id: trackId,
    domain_id: String(concept.domain.id),
    domain_name: concept.domain.name,
    topic_id: concept.domain.task_statement_id,
    task_statement_id: concept.domain.task_statement_id,
    prompt: `${concept.exam_angle} Scenario: ${concept.scenario}`,
    short_answer: concept.summary,
    detailed_explanation: concept.detailed_explanation,
    services: unique(concept.services),
    concepts: unique(concept.concepts),
    difficulty: concept.difficulty,
    scenario: concept.scenario,
    exam_angle: concept.exam_angle,
    misconceptions: unique(concept.common_misconceptions),
    decision_rules: unique(concept.decision_rules),
    source_links: unique(concept.source_urls),
    source_ids: resolveSourceIdsFromUrls(concept.source_urls, sourceIndex),
    last_verified: verifiedDate,
    tags: [trackId, `domain-${concept.domain.id}`, concept.domain.task_statement_id, ...concept.services.map((service) => slugify(service)), ...concept.concepts.map((item) => slugify(item))].slice(0, 12),
    status: 'new',
    origin: 'concept_record',
    spaced_repetition: { interval_days: 0, ease: 2.5, due_at: addDays(index % 6), review_count: 0 },
    expected_answer_points: unique([...concept.concepts, ...concept.decision_rules]).slice(0, 8),
  }));
}

const RESOURCE_DOMAIN_MAP = {
  'AI/ML basics': { domain_id: '3', topic_id: '3.7', domain_name: 'Cloud Technology and Services' },
  'Billing/cost': { domain_id: '4', topic_id: '4.1', domain_name: 'Billing, Pricing, and Support' },
  Compute: { domain_id: '3', topic_id: '3.3', domain_name: 'Cloud Technology and Services' },
  'Databases/analytics': { domain_id: '3', topic_id: '3.4', domain_name: 'Cloud Technology and Services' },
  'Global infrastructure': { domain_id: '3', topic_id: '3.2', domain_name: 'Cloud Technology and Services' },
  'IAM/security': { domain_id: '2', topic_id: '2.3', domain_name: 'Security and Compliance' },
  'Integration/app': { domain_id: '3', topic_id: '3.8', domain_name: 'Cloud Technology and Services' },
  'Management/observability': { domain_id: '3', topic_id: '3.8', domain_name: 'Cloud Technology and Services' },
  Migration: { domain_id: '1', topic_id: '1.3', domain_name: 'Cloud Concepts' },
  'Networking/CDN': { domain_id: '3', topic_id: '3.5', domain_name: 'Cloud Technology and Services' },
  Storage: { domain_id: '3', topic_id: '3.6', domain_name: 'Cloud Technology and Services' },
};

function resourceDomain(entry, domains) {
  const mapped = RESOURCE_DOMAIN_MAP[entry.family] || RESOURCE_DOMAIN_MAP.Compute;
  const domain = domains.find((candidate) => String(candidate.id) === mapped.domain_id);
  return { ...mapped, domain_name: domain?.name || mapped.domain_name };
}

function buildServiceResources(trackId, corpus, domains, verifiedDate, sourceIndex) {
  if (trackId !== 'clf-c02' || !corpus?.entries) return [];
  return corpus.entries.map((entry) => {
    const mapping = resourceDomain(entry, domains);
    const sourceLinks = unique([...(entry.source_urls || []), entry.official_docs_url]);
    return {
      id: entry.id,
      track_id: trackId,
      name: entry.name,
      family: entry.family,
      priority: entry.priority,
      learner_level: entry.learner_level,
      teaching_goal: entry.teaching_goal,
      simple_analogy: entry.simple_analogy,
      plain_english_explanation: entry.plain_english_explanation,
      real_world_use_case: entry.real_world_use_case,
      exam_clues: entry.exam_clue_phrases || [],
      misconceptions: entry.common_misconceptions || [],
      comparison: entry.adjacent_services_comparison,
      official_docs_url: entry.official_docs_url,
      source_citations: sourceLinks.map((url, index) => ({ id: `${entry.id}-source-${index + 1}`, url, type: url.includes('Exam-Guide') ? 'exam_guide' : 'official_docs', last_verified_date: verifiedDate, source_id: resolveSourceIdsFromUrls([url], sourceIndex)[0] || null })),
      source_ids: resolveSourceIdsFromUrls(sourceLinks, sourceIndex),
      last_verified: verifiedDate,
      weak_area_mappings: [{ track_id: trackId, domain_id: mapping.domain_id, topic_id: mapping.topic_id, reason: `${entry.family} questions can expose weak understanding of ${mapping.domain_name}.` }],
    };
  });
}

function buildResourceCards(trackId, resources) {
  return resources.map((resource, index) => {
    const mapping = resource.weak_area_mappings[0];
    const mapped = RESOURCE_DOMAIN_MAP[resource.family] || RESOURCE_DOMAIN_MAP.Compute;
    const clueText = resource.exam_clues.slice(0, 3).join(', ') || resource.name;
    return {
      id: `${resource.id}-study-card`,
      track_id: trackId,
      domain_id: mapping.domain_id,
      domain_name: mapped.domain_name,
      topic_id: mapping.topic_id,
      task_statement_id: mapping.topic_id,
      resource_id: resource.id,
      prompt: `Explain ${resource.name} for a beginner and name when AWS would suggest it in CLF-C02 scenarios.`,
      short_answer: `${resource.simple_analogy} ${resource.real_world_use_case}`,
      detailed_explanation: `${resource.plain_english_explanation} For CLF-C02, listen for clues such as ${clueText}. Avoid this misconception: ${resource.misconceptions[0] || 'Do not treat adjacent AWS services as interchangeable.'} Comparison: ${resource.comparison}`,
      services: [resource.name, resource.family],
      concepts: unique([resource.name, resource.family, ...resource.exam_clues]),
      difficulty: resource.priority === 'P0' ? 'foundation' : resource.priority === 'P1' ? 'intermediate' : 'review',
      source_links: resource.source_citations.map((source) => source.url),
      source_ids: unique(resource.source_citations.map((source) => source.source_id).filter(Boolean)),
      last_verified: resource.last_verified,
      tags: [trackId, `domain-${mapping.domain_id}`, mapping.topic_id, slugify(resource.family), slugify(resource.name)],
      status: 'new',
      origin: 'resource_explanation_corpus',
      exam_clues: resource.exam_clues,
      misconceptions: resource.misconceptions,
      comparison: resource.comparison,
      weak_area_mappings: resource.weak_area_mappings,
      expected_answer_points: [resource.simple_analogy, resource.real_world_use_case, resource.comparison, ...resource.exam_clues],
      spaced_repetition: { interval_days: 0, ease: 2.5, due_at: addDays(index % 5), review_count: 0 },
    };
  });
}

function normalizeQuestion(rawQuestion, sourceIndex) {
  const options = rawQuestion.options.map((candidate) => ({ id: candidate.id, label: candidate.label, explanation: candidate.explanation, is_correct: Boolean(candidate.is_correct) }));
  const correct = options.find((candidate) => candidate.is_correct);
  return {
    id: rawQuestion.id,
    track_id: rawQuestion.track_id,
    concept_id: rawQuestion.concept_id || null,
    card_id: rawQuestion.card_id || `${rawQuestion.concept_id || rawQuestion.id}-card`,
    domain_id: String(rawQuestion.domain.id),
    domain_name: rawQuestion.domain.name,
    topic_id: rawQuestion.domain.task_statement_id,
    services: unique(rawQuestion.services),
    concepts: unique(rawQuestion.concepts),
    difficulty: rawQuestion.difficulty,
    question_type: rawQuestion.question_type,
    scenario: rawQuestion.scenario,
    exam_angle: rawQuestion.exam_angle,
    common_misconceptions: unique(rawQuestion.common_misconceptions),
    decision_rules: unique(rawQuestion.decision_rules),
    prompt: rawQuestion.prompt,
    options,
    correct_option_id: correct?.id || options[0]?.id,
    explanations: {
      correct: correct?.explanation || 'See the mapped explanation.',
      distractors: options.filter((candidate) => candidate.id !== correct?.id).map((candidate) => ({ option_id: candidate.id, explanation: candidate.explanation })),
    },
    source_links: unique(rawQuestion.source_urls),
    source_ids: resolveSourceIdsFromUrls(rawQuestion.source_urls, sourceIndex),
    answer_pattern_signature: options.map((candidate) => (candidate.is_correct ? 'C' : 'W')).join(''),
  };
}

function buildStudyPlans(trackId, domains) {
  const make = (days) => Array.from({ length: days }, (_, i) => {
    const domain = domains[i % domains.length];
    return {
      track_id: trackId,
      day: i + 1,
      title: `${trackId.toUpperCase()} day ${i + 1}: ${domain.name}`,
      tasks: [
        `Review ${domain.name} official facts`,
        'Complete due learning cards',
        i % 3 === 2 ? 'Take a weakness drill' : 'Take a quick 10 quiz',
      ],
      estimated_minutes: days === 7 ? 60 : days === 14 ? 40 : 25,
    };
  });
  return { '7': make(7), '14': make(14), '30': make(30) };
}

function buildConsoleGuides(trackId, domains) {
  return domains.slice(0, 3).map((domain, index) => ({
    id: `${trackId}-console-${domain.id}`,
    track_id: trackId,
    domain_id: domain.id,
    title: `${domain.name} console orientation`,
    goal: `Observe AWS console areas relevant to ${domain.name} without creating exam-dump style content.`,
    prerequisites: ['AWS account with least-privilege access', 'Billing alarm or sandbox budget configured'],
    time_minutes: 20 + index * 5,
    cost_warning: 'Use free-tier or sandbox resources only; stop immediately if a paid resource is required.',
    path: ['Open AWS Console', 'Search relevant services', 'Open service overview pages', 'Inspect settings only'],
    steps: ['Read the landing page help text', 'Find one configuration concept from the exam guide', 'Record what you observed', 'Do not create production resources unless explicitly allowed'],
    observe: ['Service purpose', 'Shared responsibility boundaries', 'Cost and region indicators'],
    exam_relevance: `Maps to ${trackId.toUpperCase()} ${domain.name} task statements.`,
    cleanup: ['Close any dashboards', 'Delete any sandbox resource if created', 'Confirm no billable resource remains'],
    cleanup_required: true,
    related_quiz_question_ids: [],
  }));
}

function sourceRows(trackId, metadata) {
  const rows = [];
  const add = (title, url, type = 'official') => rows.push({
    id: `${trackId}-source-${rows.length + 1}`,
    track_id: trackId,
    title,
    url,
    type,
    citation_text: `Local seed metadata, ${title}, ${url}`,
    last_checked_at: `${metadata.last_verified_date}T00:00:00.000Z`,
    freshness_status: 'fresh',
    last_verified_date: metadata.last_verified_date,
    refresh_status: 'verified',
    stale_warning: false,
  });
  add(`${metadata.exam_code} exam guide`, findPdf(metadata) || `data/sources/${trackId}/source_metadata.json`);
  add(`${metadata.certification} AWS certification page`, 'https://aws.amazon.com/certification/', 'official_page');
  add('AWS Skill Builder exam prep', 'https://skillbuilder.aws/', 'course');
  if (trackId === 'clf-c02') {
    add('CLF-C02 beginner AWS resource explanation corpus', 'data/sources/clf-c02/resource_explanation_corpus.json', 'local_corpus');
    add('CLF-C02 concept records', 'data/sources/clf-c02/concept_records.json', 'local_corpus');
    add('CLF-C02 question bank', 'data/sources/clf-c02/question_bank.json', 'local_corpus');
  }
  return rows;
}

function findPdf(obj) {
  const text = JSON.stringify(obj);
  const match = text.match(/https:\/\/[^"\s]+Exam-Guide\.pdf/);
  return match?.[0];
}

function buildVideos(trackId, verifiedDate) {
  return [
    { id: `${trackId}-video-exam-prep`, track_id: trackId, title: `${trackId.toUpperCase()} official exam prep video/course`, provider: 'AWS Skill Builder / YouTube candidate', url: 'https://skillbuilder.aws/', duration_minutes: null, published_at: null, last_verified_date: verifiedDate, metadata_status: 'needs_authenticated_refresh' },
    { id: `${trackId}-video-review`, track_id: trackId, title: `${trackId.toUpperCase()} domain review resource`, provider: 'AWS', url: 'https://aws.amazon.com/training/digital/', duration_minutes: null, published_at: null, last_verified_date: verifiedDate, metadata_status: 'seed_metadata_only' },
  ];
}

function buildTrack(trackId) {
  const metadata = readJson(`data/sources/${trackId}/source_metadata.json`);
  const outline = readJson(`data/sources/${trackId}/seed_outline.json`);
  const rawCards = readJson(`data/sources/${trackId}/learning_cards.json`);
  const resourceCorpus = tryReadJson(`data/sources/${trackId}/resource_explanation_corpus.json`, null);
  const rawConceptRecords = tryReadJson(`data/sources/${trackId}/concept_records.json`, []);
  const questionBank = tryReadJson(`data/sources/${trackId}/question_bank.json`, []);
  const generatedSources = loadGeneratedSourceRecords(trackId);
  const sourceIndex = createSourceIndex(generatedSources);
  const conceptRecords = rawConceptRecords.map((concept) => ({
    ...concept,
    source_ids: resolveSourceIdsFromUrls(concept.source_urls || [], sourceIndex),
  }));
  const domains = metadata.domains.map((domain) => ({ ...domain, track_id: trackId, progress: 0, accuracy: 0, due_card_count: 0 }));
  const seedCards = buildCards(trackId, rawCards, metadata.last_verified_date, sourceIndex);
  const serviceResources = buildServiceResources(trackId, resourceCorpus, domains, metadata.last_verified_date, sourceIndex);
  const resourceCards = buildResourceCards(trackId, serviceResources);
  const conceptCards = buildConceptCards(trackId, conceptRecords, metadata.last_verified_date, sourceIndex);
  const cards = [...conceptCards, ...seedCards, ...resourceCards];
  domains.forEach((domain) => { domain.due_card_count = cards.filter((card) => String(card.domain_id) === String(domain.id)).length; });

  const generatedQuestions = cards.map((card, index) => buildQuestionFromCard(trackId, card, index));
  const curatedQuestions = questionBank.map((question) => normalizeQuestion(question, sourceIndex));
  const questions = trackId === 'clf-c02'
    ? uniqueBy([...curatedQuestions, ...generatedQuestions], (question) => question.id)
    : generatedQuestions;

  const consoleGuides = buildConsoleGuides(trackId, domains);
  consoleGuides.forEach((guide) => { guide.related_quiz_question_ids = questions.filter((question) => question.domain_id === guide.domain_id).slice(0, 3).map((question) => question.id); });

  return {
    id: trackId,
    code: metadata.exam_code,
    name: metadata.certification,
    accent: TRACK_ACCENTS[trackId],
    last_verified_date: metadata.last_verified_date,
    official_facts: metadata.official_exam_facts,
    domains,
    outline,
    cards,
    questions,
    questionBank: curatedQuestions,
    conceptRecords,
    serviceResources,
    studyPlans: buildStudyPlans(trackId, domains),
    consoleGuides,
    sources: generatedSources.length ? generatedSources : sourceRows(trackId, metadata),
    sourceIndex,
    videos: buildVideos(trackId, metadata.last_verified_date),
    milestones: [
      { track_id: trackId, id: `${trackId}-m1`, title: 'Finish first quick quiz', complete: false },
      { track_id: trackId, id: `${trackId}-m2`, title: 'Review every domain once', complete: false },
      { track_id: trackId, id: `${trackId}-m3`, title: 'Pass a full timed simulation', complete: false },
    ],
    limitations: ['Content is original and source-linked, but it remains a local static trainer. Do not import exam dumps, proprietary course copies, or vector-database retrieval shortcuts into this milestone.'],
  };
}

function initialProgress(track) {
  return {
    track_id: track.id,
    readiness_score: 18,
    streak_days: 0,
    current_milestone: track.milestones[0].title,
    next_task: 'Start with a quick 10 quiz, then review due cards.',
    weak_areas: track.domains.slice(0, 3).map((domain) => ({ domain_id: domain.id, name: domain.name, accuracy: 0, reason: 'No quiz attempts yet' })),
    history: [],
    cards: Object.fromEntries(track.cards.map((card) => [card.id, { ...card.spaced_repetition, status: 'new' }])),
  };
}

function ensureRuntime(model) {
  if (!model.runtime) model.runtime = { quiz_serial: 0, track_serials: {} };
  return model.runtime;
}

function questionSortKey(question) {
  return [question.domain_id, DIFFICULTY_ORDER[question.difficulty] ?? 99, question.question_type || 'zzz', question.id].join('|');
}

function scoreQuestion(candidate, selected) {
  let score = 0;
  const domainCount = selected.filter((item) => item.domain_id === candidate.domain_id).length;
  const typeCount = selected.filter((item) => item.question_type === candidate.question_type).length;
  const difficultyCount = selected.filter((item) => item.difficulty === candidate.difficulty).length;
  const serviceOverlap = selected.filter((item) => item.services.some((service) => candidate.services.includes(service))).length;
  score += domainCount * 6;
  score += typeCount * 4;
  score += difficultyCount * 3;
  score += serviceOverlap * 2;
  return score;
}

function chooseQuestions(pool, desired, serial) {
  if (!pool.length) return [];
  const ordered = [...pool].sort((a, b) => questionSortKey(a).localeCompare(questionSortKey(b)));
  const selected = [];
  const remaining = [...ordered];
  while (selected.length < Math.min(desired, ordered.length) && remaining.length) {
    const scored = remaining.map((question, index) => ({ question, index, score: scoreQuestion(question, selected) }));
    scored.sort((a, b) => a.score - b.score || ((serial + a.index) % 7) - ((serial + b.index) % 7) || a.question.id.localeCompare(b.question.id));
    const pick = scored[0];
    selected.push(pick.question);
    remaining.splice(remaining.indexOf(pick.question), 1);
  }
  return selected;
}

function materializeQuestion(question, serial, index) {
  const rotatedOptions = rotate(question.options, serial + index);
  return {
    ...question,
    options: rotatedOptions,
    instance_id: `${question.id}-${serial}-${index + 1}`,
  };
}

function repeatToCount(items, count) {
  if (!items.length) return [];
  return Array.from({ length: count }, (_, index) => ({ ...items[index % items.length], instance_id: `${items[index % items.length].id}-${Math.floor(index / items.length) + 1}` }));
}

export function loadLearningModel() {
  const tracks = Object.fromEntries(TRACK_IDS.map((id) => [id, buildTrack(id)]));
  const progress = Object.fromEntries(Object.values(tracks).map((track) => [track.id, initialProgress(track)]));
  const sourceRegistry = createSourceRegistry(Object.fromEntries(Object.values(tracks).map((track) => [track.id, track.sources])));
  return { app: { name: 'Vion Learning', version: '0.1.0' }, tracks, progress, logs: [], runtime: { quiz_serial: 0, track_serials: {} }, sourceRegistry };
}

export function getTrack(model, trackId) {
  const track = model.tracks[trackId];
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  return track;
}

export function createQuiz(model, { trackId, mode = 'quick', domainId, count } = {}) {
  const track = getTrack(model, trackId);
  const progress = model.progress[trackId];
  const runtime = ensureRuntime(model);
  runtime.quiz_serial += 1;
  runtime.track_serials[trackId] = (runtime.track_serials[trackId] || 0) + 1;
  const serial = runtime.track_serials[trackId];

  const desired = mode === 'full'
    ? 65
    : mode === 'domain'
      ? Math.max(15, Math.min(25, count ?? 15))
      : mode === 'quick'
        ? 10
        : Math.min(count ?? 10, 25);

  const filterPool = (questions) => {
    let filtered = [...questions];
    if (mode === 'domain') filtered = filtered.filter((question) => question.domain_id === String(domainId ?? track.domains[0].id));
    if (mode === 'weakness') filtered = filtered.filter((question) => progress.weak_areas.some((weak) => weak.domain_id === question.domain_id));
    return filtered;
  };

  const curatedPool = filterPool(mode === 'full' ? track.questions : (track.questionBank.length ? track.questionBank : track.questions));
  const fullTrackPool = filterPool(track.questions);
  let pool = mode === 'full'
    ? fullTrackPool
    : uniqueBy([...curatedPool, ...fullTrackPool], (question) => question.id);
  if ((mode === 'quick' || mode === 'mixed') && pool.filter((question) => question.domain_id !== '0').length >= desired) {
    pool = pool.filter((question) => question.domain_id !== '0');
  }
  if (!pool.length) pool = [...track.questions];

  const varied = chooseQuestions(pool, desired, serial);
  const questions = varied.length >= desired
    ? varied.map((question, index) => materializeQuestion(question, serial, index))
    : repeatToCount(varied.length ? varied.map((question, index) => materializeQuestion(question, serial, index)) : pool.map((question, index) => materializeQuestion(question, serial, index)), desired);

  return {
    id: `${trackId}-${mode}-${Date.now()}`,
    track_id: trackId,
    mode,
    question_count: desired,
    timed_minutes: mode === 'full' ? 90 : null,
    structure: mode === 'full'
      ? '65-question timed simulation based on original source-linked practice items'
      : `${mode} practice with balanced domain, difficulty, and question-type selection where possible`,
    questions,
  };
}

export function evaluateAnswer(model, { trackId, questionId, selectedOptionId }) {
  const track = getTrack(model, trackId);
  const question = track.questions.find((candidate) => candidate.id === questionId || questionId?.startsWith(`${candidate.id}-`));
  if (!question) throw new Error(`Question ${questionId} does not belong to track ${trackId}`);
  const selected = question.options.find((candidate) => candidate.id === selectedOptionId);
  const correctOption = question.options.find((candidate) => candidate.id === question.correct_option_id);
  const correct = selectedOptionId === question.correct_option_id;
  const progress = model.progress[trackId];
  progress.readiness_score = Math.max(0, Math.min(100, progress.readiness_score + (correct ? 2 : -1)));
  progress.streak_days = correct ? progress.streak_days + 1 : progress.streak_days;
  const event = { at: new Date().toISOString(), track_id: trackId, question_id: question.id, card_id: question.card_id, concept_id: question.concept_id || null, domain_id: question.domain_id, correct, difficulty: question.difficulty, question_type: question.question_type };
  progress.history.push(event);
  progress.next_task = correct ? 'Continue mixed review or raise the difficulty.' : `Review ${question.domain_name}, revisit the mapped concept, and retry a weakness drill.`;
  return {
    correct,
    selected_option_id: selectedOptionId,
    correct_option_id: question.correct_option_id,
    correct_explanation: question.explanations.correct,
    selected_explanation: selected?.explanation || 'No selected option was found.',
    distractor_explanations: question.explanations.distractors,
    option_reviews: question.options.map((candidate) => ({ option_id: candidate.id, label: candidate.label, is_correct: candidate.id === question.correct_option_id, selected: candidate.id === selectedOptionId, explanation: candidate.explanation })),
    mapping: {
      track_id: trackId,
      domain_id: question.domain_id,
      topic_id: question.topic_id,
      card_id: question.card_id,
      concept_id: question.concept_id || null,
      question_id: question.id,
      question_type: question.question_type,
      difficulty: question.difficulty,
      services: question.services,
      concepts: question.concepts,
      source_links: question.source_links,
      source_ids: question.source_ids || [],
    },
    readiness_score: progress.readiness_score,
    next_actions: correct ? ['Continue mixed review', 'Raise difficulty', 'Mark linked card known'] : ['Read the linked concept explanation', 'Compare the selected distractor with the correct service or principle', 'Retake a weakness drill'],
    progress_event: event,
    review_summary: {
      scenario: question.scenario,
      exam_angle: question.exam_angle,
      common_misconceptions: question.common_misconceptions,
      decision_rules: question.decision_rules,
      correct_label: correctOption?.label || null,
    },
  };
}

export function markCard(model, { trackId, cardId, status }) {
  const track = getTrack(model, trackId);
  const card = track.cards.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error(`Card ${cardId} does not belong to track ${trackId}`);
  const state = model.progress[trackId].cards[cardId] || { interval_days: 0, ease: 2.5, review_count: 0 };
  const interval = status === 'know' ? Math.max(1, Math.ceil((state.interval_days || 1) * state.ease)) : 1;
  const updated = { ...state, track_id: trackId, card_id: cardId, status, interval_days: interval, review_count: (state.review_count || 0) + 1, next_review_at: addDays(interval) };
  model.progress[trackId].cards[cardId] = updated;
  return updated;
}

export function landingPayload(model) {
  return {
    app: model.app,
    source_freshness_summary: 'Official source metadata seeded 2026-06-03; CLF-C02 now uses curated concept records and original scenario-based questions before any vector-database work.',
    tracks: Object.values(model.tracks).map((track) => ({
      track_id: track.id,
      code: track.code,
      name: track.name,
      readiness_score: model.progress[track.id].readiness_score,
      next_task: model.progress[track.id].next_task,
      streak_days: model.progress[track.id].streak_days,
      current_milestone: model.progress[track.id].current_milestone,
      weak_domains_count: model.progress[track.id].weak_areas.length,
      last_verified_date: track.last_verified_date,
    })),
  };
}

export function trackPayload(model, trackId) {
  const track = getTrack(model, trackId);
  const sourceStatusCounts = track.sources.reduce((acc, source) => {
    const key = source.freshness_status || source.refresh_status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    track: { id: track.id, code: track.code, name: track.name, accent: track.accent, last_verified_date: track.last_verified_date, official_facts: track.official_facts },
    progress: model.progress[trackId],
    domains: track.domains,
    services: unique([...track.cards.flatMap((card) => card.services), ...track.serviceResources.map((resource) => resource.name), ...track.questionBank.flatMap((question) => question.services)]),
    serviceResources: track.serviceResources,
    conceptRecords: track.conceptRecords,
    learningPath: track.outline.modules,
    cards: track.cards,
    questions: track.questions,
    videos: track.videos,
    milestones: track.milestones,
    weakAreas: model.progress[trackId].weak_areas,
    modes: ['practice', 'exam', 'console'],
    quizModes: ['quick', 'domain', 'full', 'weakness', 'mixed'],
    studyPlans: track.studyPlans,
    consoleGuides: track.consoleGuides,
    sourceReport: {
      track_id: trackId,
      sources: track.sources,
      last_verified_date: track.last_verified_date,
      freshness: sourceStatusCounts,
      stale_warning: Boolean(sourceStatusCounts.stale || sourceStatusCounts.needs_refresh || sourceStatusCounts.unverified || sourceStatusCounts.auth_gated),
      limitations: track.limitations,
    },
  };
}

export function sourcesPayload(model, trackId, filters = {}) {
  getTrack(model, trackId);
  const registry = model.sourceRegistry || createSourceRegistry(Object.fromEntries(Object.values(model.tracks).map((track) => [track.id, track.sources])));
  const sources = resolveSourceRegistry(registry, {
    trackId,
    ids: filters.ids || [],
    service: filters.service,
    concept: filters.concept,
  });
  return { track_id: trackId, filters, count: sources.length, sources };
}

export function resourcesPayload(model, trackId) {
  const track = getTrack(model, trackId);
  return { track_id: trackId, count: track.serviceResources.length, resources: track.serviceResources };
}

export function exportSnapshot(model) {
  return { exported_at: new Date().toISOString(), app: model.app, tracks: Object.keys(model.tracks), progress: model.progress };
}
