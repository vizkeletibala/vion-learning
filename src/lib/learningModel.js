import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const TRACK_IDS = ['clf-c02', 'aif-c01'];
const TRACK_ACCENTS = { 'clf-c02': 'blue', 'aif-c01': 'purple' };

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

function serviceTags(topics = []) {
  const known = ['AWS', 'Amazon', 'IAM', 'EC2', 'Lambda', 'RDS', 'S3', 'Bedrock', 'SageMaker', 'CloudWatch', 'Organizations', 'WAF', 'Shield', 'GuardDuty', 'Q'];
  const found = new Set();
  for (const topic of topics) {
    for (const word of known) {
      if (String(topic).toLowerCase().includes(word.toLowerCase())) found.add(word.startsWith('AWS') || word.startsWith('Amazon') ? word : `AWS ${word}`);
    }
  }
  if (!found.size) found.add('AWS foundational services');
  return [...found].slice(0, 4);
}

function option(id, label, explanation) {
  return { id, label, explanation };
}

function buildQuestion(trackId, card, index) {
  const points = card.expected_answer_points || [];
  const correct = points[0] || card.domain_name;
  const wrongs = [
    `It is mainly about memorizing real exam questions for ${card.domain_name}`,
    `It removes the need to understand ${card.domain_name} concepts`,
    `It is unrelated to the official ${trackId.toUpperCase()} task statement`,
  ];
  const options = [
    option('a', correct, `${correct} is part of the official task area and is reinforced by this original seed card.`),
    option('b', wrongs[0], 'This app uses original practice only; memorizing copied exam questions is explicitly out of scope.'),
    option('c', wrongs[1], `The exam guide expects conceptual understanding, not skipping ${card.domain_name}.`),
    option('d', wrongs[2], `The card maps directly to task statement ${card.task_statement_id} for ${trackId.toUpperCase()}.`),
  ];
  return {
    id: `${card.id}-q${index + 1}`,
    track_id: trackId,
    card_id: card.id,
    domain_id: String(card.domain_id),
    domain_name: card.domain_name,
    topic_id: card.task_statement_id,
    prompt: `For ${trackId.toUpperCase()} ${card.domain_name}, which answer best addresses: ${card.prompt.replace(/^Explain:\s*/i, '')}`,
    options,
    correct_option_id: 'a',
    explanations: {
      correct: `${correct} is the strongest answer because it comes from the source-linked task statement for ${card.domain_name}. Review the detailed card explanation for context before moving on.`,
      distractors: options.filter((o) => o.id !== 'a').map((o) => ({ option_id: o.id, explanation: o.explanation })),
    },
    source_links: card.source_links,
  };
}

function buildCards(trackId, rawCards, verifiedDate) {
  return rawCards.map((raw, index) => {
    const points = raw.expected_answer_points || [];
    return {
      id: raw.id,
      track_id: trackId,
      domain_id: String(raw.domain_id),
      domain_name: raw.domain_name,
      topic_id: raw.task_statement_id,
      prompt: raw.prompt,
      short_answer: points.slice(0, 3).join('; ') || raw.domain_name,
      detailed_explanation: `Original ${trackId.toUpperCase()} learning card for ${raw.domain_name}. A strong answer should connect ${points.slice(0, 5).join(', ')} to the official task statement without using copied exam items.`,
      services: serviceTags(points),
      difficulty: index % 3 === 0 ? 'foundation' : index % 3 === 1 ? 'intermediate' : 'review',
      source_links: raw.source_links,
      last_verified: verifiedDate,
      tags: [trackId, `domain-${raw.domain_id}`, raw.task_statement_id, ...points.slice(0, 3).map((p) => String(p).toLowerCase().replace(/[^a-z0-9]+/g, '-'))].filter(Boolean),
      status: 'new',
      origin: 'original_seed',
      spaced_repetition: { interval_days: 0, ease: 2.5, due_at: addDays(0), review_count: 0 },
    };
  });
}

const RESOURCE_DOMAIN_MAP = {
  'AI/ML basics': { domain_id: '3', topic_id: '3.4', domain_name: 'Cloud Technology and Services' },
  'Billing/cost': { domain_id: '4', topic_id: '4.1', domain_name: 'Billing, Pricing, and Support' },
  Compute: { domain_id: '3', topic_id: '3.3', domain_name: 'Cloud Technology and Services' },
  'Databases/analytics': { domain_id: '3', topic_id: '3.3', domain_name: 'Cloud Technology and Services' },
  'Global infrastructure': { domain_id: '1', topic_id: '1.1', domain_name: 'Cloud Concepts' },
  'IAM/security': { domain_id: '2', topic_id: '2.3', domain_name: 'Security and Compliance' },
  'Integration/app': { domain_id: '3', topic_id: '3.3', domain_name: 'Cloud Technology and Services' },
  'Management/observability': { domain_id: '3', topic_id: '3.2', domain_name: 'Cloud Technology and Services' },
  Migration: { domain_id: '1', topic_id: '1.3', domain_name: 'Cloud Concepts' },
  'Networking/CDN': { domain_id: '3', topic_id: '3.3', domain_name: 'Cloud Technology and Services' },
  Storage: { domain_id: '3', topic_id: '3.3', domain_name: 'Cloud Technology and Services' },
};

function resourceDomain(entry, domains) {
  const mapped = RESOURCE_DOMAIN_MAP[entry.family] || RESOURCE_DOMAIN_MAP.Compute;
  const domain = domains.find((candidate) => String(candidate.id) === mapped.domain_id);
  return { ...mapped, domain_name: domain?.name || mapped.domain_name };
}

function buildServiceResources(trackId, corpus, domains, verifiedDate) {
  if (trackId !== 'clf-c02' || !corpus?.entries) return [];
  return corpus.entries.map((entry) => {
    const mapping = resourceDomain(entry, domains);
    const sourceLinks = [...new Set([...(entry.source_urls || []), entry.official_docs_url].filter(Boolean))];
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
      source_citations: sourceLinks.map((url, index) => ({ id: `${entry.id}-source-${index + 1}`, url, type: url.includes('Exam-Guide') ? 'exam_guide' : 'official_docs', last_verified_date: verifiedDate })),
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
      resource_id: resource.id,
      prompt: `Explain ${resource.name} for a beginner and name when AWS would suggest it in CLF-C02 scenarios.`,
      short_answer: `${resource.simple_analogy} ${resource.real_world_use_case}`,
      detailed_explanation: `${resource.plain_english_explanation} For CLF-C02, listen for clues such as ${clueText}. Avoid this misconception: ${resource.misconceptions[0] || 'Do not treat adjacent AWS services as interchangeable.'} Comparison: ${resource.comparison}`,
      services: [resource.name, resource.family],
      difficulty: resource.priority === 'P0' ? 'foundation' : resource.priority === 'P1' ? 'intermediate' : 'review',
      source_links: resource.source_citations.map((source) => source.url),
      last_verified: resource.last_verified,
      tags: [trackId, `domain-${mapping.domain_id}`, mapping.topic_id, resource.family.toLowerCase().replace(/[^a-z0-9]+/g, '-'), resource.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
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
    cost_warning: 'Use free-tier/sandbox resources only; stop immediately if a paid resource is required.',
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
    last_verified_date: metadata.last_verified_date,
    refresh_status: 'verified',
    stale_warning: false,
  });
  add(`${metadata.exam_code} exam guide`, findPdf(metadata) || `data/sources/${trackId}/source_metadata.json`);
  add(`${metadata.certification} AWS certification page`, 'https://aws.amazon.com/certification/', 'official_page');
  add('AWS Skill Builder exam prep', 'https://skillbuilder.aws/', 'course');
  if (trackId === 'clf-c02') add('CLF-C02 beginner AWS resource explanation corpus', 'data/sources/clf-c02/resource_explanation_corpus.json', 'local_corpus');
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
  const domains = metadata.domains.map((d) => ({ ...d, track_id: trackId, progress: 0, accuracy: 0, due_card_count: 0 }));
  const serviceResources = buildServiceResources(trackId, resourceCorpus, domains, metadata.last_verified_date);
  const cards = [...buildCards(trackId, rawCards, metadata.last_verified_date), ...buildResourceCards(trackId, serviceResources)];
  domains.forEach((domain) => { domain.due_card_count = cards.filter((c) => String(c.domain_id) === String(domain.id)).length; });
  const questions = cards.map((card, index) => buildQuestion(trackId, card, index));
  const consoleGuides = buildConsoleGuides(trackId, domains);
  consoleGuides.forEach((guide, i) => { guide.related_quiz_question_ids = questions.filter((q) => q.domain_id === guide.domain_id).slice(0, 3).map((q) => q.id); });
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
    serviceResources,
    studyPlans: buildStudyPlans(trackId, domains),
    consoleGuides,
    sources: sourceRows(trackId, metadata),
    videos: buildVideos(trackId, metadata.last_verified_date),
    milestones: [
      { track_id: trackId, id: `${trackId}-m1`, title: 'Finish first quick quiz', complete: false },
      { track_id: trackId, id: `${trackId}-m2`, title: 'Review every domain once', complete: false },
      { track_id: trackId, id: `${trackId}-m3`, title: 'Pass a full timed simulation', complete: false },
    ],
    limitations: ['Seed content and CLF-C02 resource explanations are source-linked and original, but supplementary video publish dates and Skill Builder internals need richer refresh before external release.'],
  };
}

function initialProgress(track) {
  return {
    track_id: track.id,
    readiness_score: 18,
    streak_days: 0,
    current_milestone: track.milestones[0].title,
    next_task: 'Start with a quick 10 quiz, then review due cards.',
    weak_areas: track.domains.slice(0, 3).map((d) => ({ domain_id: d.id, name: d.name, accuracy: 0, reason: 'No quiz attempts yet' })),
    history: [],
    cards: Object.fromEntries(track.cards.map((card) => [card.id, { ...card.spaced_repetition, status: 'new' }])),
  };
}

export function loadLearningModel() {
  const tracks = Object.fromEntries(TRACK_IDS.map((id) => [id, buildTrack(id)]));
  const progress = Object.fromEntries(Object.values(tracks).map((track) => [track.id, initialProgress(track)]));
  return { app: { name: 'Vion Learning', version: '0.1.0' }, tracks, progress, logs: [] };
}

export function getTrack(model, trackId) {
  const track = model.tracks[trackId];
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  return track;
}

function repeatToCount(items, count) {
  if (!items.length) return [];
  return Array.from({ length: count }, (_, i) => ({ ...items[i % items.length], instance_id: `${items[i % items.length].id}-${Math.floor(i / items.length) + 1}` }));
}

export function createQuiz(model, { trackId, mode = 'quick', domainId, count } = {}) {
  const track = getTrack(model, trackId);
  let pool = [...track.questions];
  if (mode === 'domain') pool = pool.filter((q) => q.domain_id === String(domainId ?? track.domains[0].id));
  if (mode === 'weakness') pool = pool.filter((q) => model.progress[trackId].weak_areas.some((w) => w.domain_id === q.domain_id));
  const desired = mode === 'full' ? 65 : mode === 'domain' ? Math.max(15, Math.min(25, count ?? 15)) : mode === 'quick' ? 10 : Math.min(count ?? 10, 25);
  const questions = repeatToCount(pool, desired);
  return {
    id: `${trackId}-${mode}-${Date.now()}`,
    track_id: trackId,
    mode,
    question_count: desired,
    timed_minutes: mode === 'full' ? 90 : null,
    structure: mode === 'full' ? '65-question timed simulation based on original source-linked practice items' : `${mode} practice`,
    questions,
  };
}

export function evaluateAnswer(model, { trackId, questionId, selectedOptionId }) {
  const track = getTrack(model, trackId);
  const question = track.questions.find((q) => q.id === questionId || questionId?.startsWith(`${q.id}-`));
  if (!question) throw new Error(`Question ${questionId} does not belong to track ${trackId}`);
  const selected = question.options.find((o) => o.id === selectedOptionId);
  const correct = selectedOptionId === question.correct_option_id;
  const progress = model.progress[trackId];
  progress.readiness_score = Math.max(0, Math.min(100, progress.readiness_score + (correct ? 2 : -1)));
  progress.streak_days = correct ? progress.streak_days + 1 : progress.streak_days;
  const event = { at: new Date().toISOString(), track_id: trackId, question_id: question.id, card_id: question.card_id, domain_id: question.domain_id, correct };
  progress.history.push(event);
  progress.next_task = correct ? 'Mark the linked card as known or continue a mixed review.' : `Review ${question.domain_name} and drill the linked card.`;
  return {
    correct,
    selected_option_id: selectedOptionId,
    correct_option_id: question.correct_option_id,
    correct_explanation: question.explanations.correct,
    selected_explanation: selected?.explanation || 'No selected option was found.',
    distractor_explanations: question.explanations.distractors,
    mapping: { track_id: trackId, domain_id: question.domain_id, topic_id: question.topic_id, card_id: question.card_id, question_id: question.id, source_links: question.source_links },
    readiness_score: progress.readiness_score,
    next_actions: correct ? ['Continue mixed review', 'Mark linked card known', 'Try a domain drill'] : ['Read the detailed card explanation', 'Retake a weakness drill', 'Review source links'],
    progress_event: event,
  };
}

export function markCard(model, { trackId, cardId, status }) {
  const track = getTrack(model, trackId);
  const card = track.cards.find((c) => c.id === cardId);
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
    source_freshness_summary: 'Official source metadata seeded 2026-06-03; stale warnings appear per track when refresh gaps are known.',
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
  return {
    track: { id: track.id, code: track.code, name: track.name, accent: track.accent, last_verified_date: track.last_verified_date, official_facts: track.official_facts },
    progress: model.progress[trackId],
    domains: track.domains,
    services: [...new Set([...track.cards.flatMap((c) => c.services), ...track.serviceResources.map((r) => r.name)])],
    serviceResources: track.serviceResources,
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
    sourceReport: { track_id: trackId, sources: track.sources, last_verified_date: track.last_verified_date, stale_warning: track.limitations.length > 0, limitations: track.limitations },
  };
}

export function resourcesPayload(model, trackId) {
  const track = getTrack(model, trackId);
  return { track_id: trackId, count: track.serviceResources.length, resources: track.serviceResources };
}

export function exportSnapshot(model) {
  return { exported_at: new Date().toISOString(), app: model.app, tracks: Object.keys(model.tracks), progress: model.progress };
}
