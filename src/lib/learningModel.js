import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSourceIndex, createSourceRegistry, loadGeneratedSourceRecords, resolveSourceIdsFromUrls, resolveSourceRegistry } from './sourceRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const AWS_TRACK_IDS = ['clf-c02', 'aif-c01'];
const TRACK_IDS = [...AWS_TRACK_IDS, 'german-b2-exam'];
const GERMAN_B2_TRACK_ID = 'german-b2-exam';
const GERMAN_B2_SOURCE_TYPES = ['pdf', 'txt', 'markdown'];
const GERMAN_B2_LESSON_TABS = ['vocab', 'grammar', 'reading', 'writing'];
export const LESSON_LIFECYCLE_STATES = ['draft', 'review', 'published'];
const TRACK_ACCENTS = { 'clf-c02': 'blue', 'aif-c01': 'purple', 'german-b2-exam': 'amber', shared: 'slate' };
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

function chunkArray(items = [], size = 3) {
  if (!Array.isArray(items) || size <= 0) return [];
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeTextBlock(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function terms(value) {
  return normalizeTextBlock(value).toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
}

function resourceSummary(resource) {
  return normalizeTextBlock([resource.simple_analogy, resource.plain_english_explanation, resource.real_world_use_case].filter(Boolean).join(' '));
}

const CLF_C02_LEARNING_RESOURCE_MAP = {
  '1.1': ['AWS Regions', 'Availability Zones (AZs)', 'Edge locations'],
  '1.2': ['AWS Regions', 'Availability Zones (AZs)', 'AWS Organizations'],
  '1.3': ['AWS Local Zones', 'AWS Wavelength'],
  '1.4': ['Amazon EC2', 'AWS Lambda', 'AWS Organizations'],
  '2.1': ['Amazon EC2', 'AWS Lambda', 'Amazon RDS'],
  '2.2': ['AWS Key Management Service (KMS)', 'AWS Secrets Manager', 'AWS Certificate Manager (ACM)', 'AWS Shield', 'AWS WAF', 'Amazon GuardDuty', 'Amazon Inspector', 'AWS CloudTrail', 'AWS Security Hub'],
  '2.3': ['IAM users', 'IAM groups', 'IAM roles', 'IAM policies', 'Multi-factor authentication (MFA)', 'AWS Organizations', 'AWS IAM Identity Center'],
  '2.4': ['AWS Shield', 'AWS WAF', 'Amazon GuardDuty', 'Amazon Inspector', 'AWS CloudTrail', 'AWS Security Hub', 'AWS Trusted Advisor'],
  '3.1': ['AWS Management Console', 'AWS CLI', 'SDKs', 'CloudFormation', 'AWS Elastic Beanstalk'],
  '3.2': ['AWS Regions', 'Availability Zones (AZs)', 'Edge locations', 'AWS Local Zones', 'AWS Wavelength'],
  '3.3': ['Amazon EC2', 'Auto Scaling', 'Elastic Load Balancing', 'AWS Lambda', 'Amazon ECS', 'Amazon EKS', 'AWS Fargate', 'AWS Lightsail', 'AWS Batch', 'AWS Elastic Beanstalk'],
  '3.4': ['Amazon RDS', 'Amazon Aurora', 'Amazon DynamoDB', 'Amazon ElastiCache', 'Amazon MemoryDB', 'Amazon Neptune'],
  '3.5': ['Amazon VPC', 'AWS subnets', 'route tables', 'security groups', 'network ACLs', 'Amazon Route 53', 'Amazon CloudFront', 'AWS Direct Connect', 'AWS VPN', 'Amazon API Gateway'],
  '3.6': ['Amazon S3', 'Amazon S3 Glacier', 'Amazon EBS', 'Amazon EFS', 'Amazon FSx', 'AWS Storage Gateway', 'AWS Snow Family'],
  '3.7': ['Amazon SageMaker', 'Amazon Comprehend', 'Amazon Kendra', 'Amazon Lex', 'Amazon Polly', 'Amazon Rekognition', 'Amazon Textract', 'Amazon Transcribe', 'Amazon Translate', 'Amazon Athena', 'AWS Glue', 'Amazon Kinesis', 'Amazon QuickSight', 'Amazon Redshift'],
  '3.8': ['Amazon EventBridge', 'Amazon SNS', 'Amazon SQS', 'AWS Step Functions', 'Amazon CloudWatch', 'AWS CloudTrail', 'AWS Config', 'AWS Systems Manager', 'AWS Organizations', 'AWS Trusted Advisor', 'AWS Well-Architected Tool'],
  '4.1': ['AWS Pricing Calculator', 'AWS Cost Explorer', 'AWS Budgets', 'AWS Organizations'],
  '4.2': ['AWS Cost Explorer', 'AWS Budgets', 'AWS Trusted Advisor', 'AWS Organizations'],
  '4.3': ['AWS Support', 'AWS Trusted Advisor', 'AWS Organizations'],
};

function matchResourcesForTask(track, taskId, seedTopics = []) {
  const resources = track.serviceResources || [];
  const wanted = CLF_C02_LEARNING_RESOURCE_MAP[taskId] || [];
  const wantedSet = new Set(wanted.map((name) => name.toLowerCase()));
  const topicTerms = seedTopics.flatMap((topic) => terms(topic));
  const exactMatches = resources.filter((resource) => wantedSet.has(resource.name.toLowerCase()));
  const fuzzyMatches = resources.filter((resource) => {
    const haystack = normalizeTextBlock([
      resource.name,
      resource.family,
      resource.simple_analogy,
      resource.plain_english_explanation,
      resource.real_world_use_case,
      ...(resource.exam_clue_phrases || []),
      ...(resource.common_misconceptions || []),
      resource.comparison,
    ].filter(Boolean).join(' ')).toLowerCase();
    return topicTerms.some((term) => term.length > 2 && haystack.includes(term));
  });
  return uniqueBy([...exactMatches, ...fuzzyMatches], (resource) => resource.id).slice(0, 6);
}

function buildLearningChunks(track) {
  const chunks = [];
  for (const module of track.outline.modules || []) {
    for (const task of module.tasks || []) {
      const taskId = task.task_statement_id || task.id || 'unknown';
      const topics = task.seed_topics || [];
      const matchedResources = matchResourcesForTask(track, taskId, topics);
      const topicGroups = chunkArray(topics, 2);
      const sourceLinks = unique([
        ...(matchedResources.flatMap((resource) => [resource.official_docs_url, ...(resource.source_links || [])])),
      ]).filter(Boolean);
      const sourceIds = unique(matchedResources.flatMap((resource) => resource.source_ids || []));
      const resourceBullets = matchedResources.slice(0, 4).map((resource) => `${resource.name}: ${resourceSummary(resource)}`);
      const fallbackSummary = `Study ${task.title.toLowerCase()} through ${topics.slice(0, 3).join(', ')}.`;

      if (!topicGroups.length) {
        chunks.push({
          id: `${taskId}-chunk-1`,
          module_id: module.module_id,
          module_title: module.title,
          domain_id: module.module_id.replace('clf-c02-domain-', ''),
          domain_name: module.title,
          task_statement_id: taskId,
          title: task.title,
          chunk_label: 'Chunk 1/1',
          summary: fallbackSummary,
          bullets: resourceBullets,
          source_links: sourceLinks,
          source_ids: sourceIds,
        });
        continue;
      }

      topicGroups.forEach((group, index) => {
        const matchedForGroup = matchedResources.filter((resource) => {
          const haystack = normalizeTextBlock([resource.name, resource.family, resource.plain_english_explanation, resource.simple_analogy, ...(resource.exam_clue_phrases || [])].filter(Boolean).join(' ')).toLowerCase();
          return group.some((topic) => terms(topic).some((term) => term.length > 2 && haystack.includes(term))) || group.some((topic) => haystack.includes(topic.toLowerCase()));
        });
        const selectedResources = uniqueBy([...matchedForGroup, ...matchedResources], (resource) => resource.id).slice(0, 3);
        chunks.push({
          id: `${taskId}-chunk-${index + 1}`,
          module_id: module.module_id,
          module_title: module.title,
          domain_id: module.module_id.replace('clf-c02-domain-', ''),
          domain_name: module.title,
          task_statement_id: taskId,
          title: `${task.title} · ${group.join(' / ')}`,
          chunk_label: `Chunk ${index + 1}/${topicGroups.length}`,
          summary: `Focus on ${group.join(', ')}. ${selectedResources[0] ? selectedResources[0].plain_english_explanation : fallbackSummary}`,
          bullets: [
            ...group.map((topic) => `Topic: ${topic}`),
            ...selectedResources.map((resource) => `${resource.name}: ${resource.simple_analogy} ${resource.real_world_use_case}`),
          ].slice(0, 6),
          source_links: unique([
            ...sourceLinks,
            ...selectedResources.flatMap((resource) => [resource.official_docs_url, ...(resource.source_links || [])]),
          ]).filter(Boolean),
          source_ids: unique([...sourceIds, ...selectedResources.flatMap((resource) => resource.source_ids || [])]),
        });
      });
    }
  }
  return chunks;
}

function normalizeTopicText(value) {
  return normalizeTextBlock(value).toLowerCase();
}

function buildTopicPageSections(track, { title, summary, families = [], keywords = [], chunkHints = [], focusServices = [] }) {
  const chunks = buildLearningChunks(track);
  const normalizedFamilies = new Set(families);
  const normalizedKeywords = keywords.map((keyword) => normalizeTopicText(keyword));
  const normalizedFocusServices = focusServices.map((service) => normalizeTopicText(service));
  const matchedResources = track.serviceResources.filter((resource) => {
    if (normalizedFamilies.has(resource.family)) return true;
    const haystack = normalizeTopicText([resource.name, resource.family, resource.plain_english_explanation, resource.simple_analogy, resource.real_world_use_case, ...(resource.exam_clue_phrases || []), ...(resource.concepts || [])].filter(Boolean).join(' '));
    return normalizedKeywords.some((keyword) => keyword && haystack.includes(keyword)) || normalizedFocusServices.some((service) => service && haystack.includes(service));
  });
  const matchedChunks = chunks.filter((chunk) => {
    const haystack = normalizeTopicText([chunk.title, chunk.summary, ...(chunk.bullets || []), chunk.domain_name, chunk.task_statement_id].filter(Boolean).join(' '));
    return chunkHints.some((hint) => haystack.includes(normalizeTopicText(hint))) || matchedResources.some((resource) => haystack.includes(normalizeTopicText(resource.name)));
  });

  const focusServiceNames = unique([
    ...focusServices,
    ...matchedResources.slice(0, 10).map((resource) => resource.name),
  ]).slice(0, 10);

  const sections = [];
  if (matchedResources.length) {
    sections.push({
      heading: 'Core services',
      items: matchedResources.slice(0, 8).map((resource) => ({
        title: resource.name,
        detail: `${resource.plain_english_explanation} ${resource.real_world_use_case}`,
        notes: unique([resource.simple_analogy, ...(resource.exam_clue_phrases || []).slice(0, 2)]).filter(Boolean),
        source_links: unique([resource.official_docs_url, ...(resource.source_links || [])]).filter(Boolean),
        source_ids: resource.source_ids || [],
      })),
    });
  }
  if (matchedChunks.length) {
    sections.push({
      heading: 'Study blocks',
      items: matchedChunks.slice(0, 6).map((chunk) => ({
        title: chunk.title,
        detail: chunk.summary,
        notes: chunk.bullets || [],
        source_links: chunk.source_links || [],
        source_ids: chunk.source_ids || [],
      })),
    });
  }
  if (!sections.length) {
    sections.push({
      heading: 'Study blocks',
      items: chunks.slice(0, 4).map((chunk) => ({
        title: chunk.title,
        detail: chunk.summary,
        notes: chunk.bullets || [],
        source_links: chunk.source_links || [],
        source_ids: chunk.source_ids || [],
      })),
    });
  }

  const sourceLinks = unique([
    ...matchedResources.flatMap((resource) => [resource.official_docs_url, ...(resource.source_links || [])]),
    ...matchedChunks.flatMap((chunk) => chunk.source_links || []),
  ]).filter(Boolean);
  const sourceIds = unique([
    ...matchedResources.flatMap((resource) => resource.source_ids || []),
    ...matchedChunks.flatMap((chunk) => chunk.source_ids || []),
  ]);
  const chunkIds = unique(matchedChunks.map((chunk) => chunk.id));

  return {
    slug: title === 'Cloud components' ? 'cloud-components' : title === 'Security and compliance' ? 'security' : slugify(title),
    title,
    summary,
    service_names: focusServiceNames,
    focus_services: focusServiceNames,
    chunk_ids: chunkIds,
    source_links: sourceLinks,
    source_ids: sourceIds,
    sections,
  };
}

function buildTopicPages(track) {
  if (track.id !== 'clf-c02') return [];
  return [
    buildTopicPageSections(track, {
      title: 'Cloud components',
      summary: 'A separated study page for compute, storage, networking, observability, and other cloud building blocks that show up in CLF-C02 scenarios.',
      families: ['Global infrastructure', 'Compute', 'Storage', 'Networking/CDN', 'Databases/analytics', 'Integration/app', 'Management/observability'],
      keywords: ['cloud', 'region', 'availability zone', 'compute', 'storage', 'networking', 'observability', 'database', 'integration'],
      chunkHints: ['cloud', 'ec2', 's3', 'vpc', 'cloudwatch', 'route 53', 'load balancer', 'rds', 'dynamodb'],
      focusServices: ['Amazon EC2', 'Amazon S3', 'Amazon VPC', 'Amazon CloudWatch', 'AWS CloudTrail', 'AWS Organizations'],
    }),
    buildTopicPageSections(track, {
      title: 'Security and compliance',
      summary: 'A separated study page for security, compliance, identity, protection, audit, and governance topics that CLF-C02 asks about when the question smells like risk.',
      families: ['IAM/security', 'Management/observability'],
      keywords: ['security', 'compliance', 'identity', 'audit', 'protection', 'encryption', 'governance', 'mfa', 'cloudtrail', 'waf', 'guardduty', 'kms'],
      chunkHints: ['security', 'iam', 'cloudtrail', 'guardduty', 'security hub', 'waf', 'kms', 'mfa', 'shared responsibility'],
      focusServices: ['AWS IAM', 'IAM users', 'IAM roles', 'IAM policies', 'AWS CloudTrail', 'AWS Security Hub', 'Amazon GuardDuty', 'AWS WAF', 'AWS Key Management Service (KMS)'],
    }),
  ];
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

function buildSharedTrack() {
  const generatedSources = loadGeneratedSourceRecords('shared');
  const fallbackSources = [
    {
      id: 'shared:aws-doc:shared-responsibility-model',
      track_id: 'shared',
      title: 'Shared Responsibility Model',
      source_type: 'aws_docs',
      url: 'https://aws.amazon.com/compliance/shared-responsibility-model/',
      publisher: 'AWS',
      aws_service: [],
      domains: [],
      concepts: ['shared responsibility', 'security of the cloud', 'security in the cloud'],
      summary: 'Cross-certification AWS source for understanding how AWS and customers divide cloud security responsibilities. Use as cited background only; certification-specific cards and questions remain in their own tracks.',
      extracted_facts: [
        { fact: 'AWS is responsible for security of the cloud, while customers are responsible for security in the cloud.', fact_type: 'responsibility_boundary', source_locator: 'Shared Responsibility Model overview', confidence: 'high' },
      ],
      exam_relevance: { exam_code: 'SHARED', relevance_level: 'supporting', why_it_matters: 'Background source that can inform multiple AWS certification tracks when cited explicitly.', question_use: ['study_plan', 'quiz_distractor_context'], separation_note: 'Shared retrieval source only; do not materialize CLF-C02 or AIF-C01 card/question content here.' },
      last_checked_at: '2026-06-03T00:00:00.000Z',
      retrieved_at: '2026-06-03T00:00:00.000Z',
      content_hash: null,
      license_or_usage_note: 'AWS public documentation; summarize and cite.',
      citation_text: 'AWS, Shared Responsibility Model, https://aws.amazon.com/compliance/shared-responsibility-model/',
      freshness_status: 'unverified',
      notes: ['Shared source seed used for cross-certification retrieval only.'],
      stale_after_days: 45,
    },
  ];
  const sources = generatedSources.length ? generatedSources : fallbackSources;
  return {
    id: 'shared',
    code: 'SHARED',
    name: 'Shared AWS source references',
    accent: TRACK_ACCENTS.shared,
    last_verified_date: '2026-06-03',
    official_facts: ['Shared sources provide cited background across certification tracks without carrying certification-specific cards or questions.'],
    domains: [],
    outline: { modules: [] },
    cards: [],
    questions: [],
    questionBank: [],
    conceptRecords: [],
    serviceResources: [],
    studyPlans: {},
    consoleGuides: [],
    sources,
    sourceIndex: createSourceIndex(sources),
    videos: [],
    milestones: [
      { track_id: 'shared', id: 'shared-m1', title: 'Review cited shared sources', complete: false },
    ],
    limitations: ['Shared retrieval is source-only. It must not invent cards, questions, or certification-specific claims without cited track evidence.'],
  };
}

const GERMAN_B2_LESSON1_SOURCE_ID = `${GERMAN_B2_TRACK_ID}:embedded:lesson-1:lesson-1-corpus.md`;
const GERMAN_B2_LESSON1_NOTES_SOURCE_ID = `${GERMAN_B2_TRACK_ID}:embedded:lesson-1:lesson-1.md`;
const GERMAN_B2_LESSON1_CHUNK_ID = `${GERMAN_B2_TRACK_ID}:embedded:lesson-1:chunk:lesson-1-corpus`;

function embeddedGermanB2Lesson1Sources() {
  return [
    {
      id: GERMAN_B2_LESSON1_SOURCE_ID,
      track_id: GERMAN_B2_TRACK_ID,
      title: 'German B2 lesson 1 corpus',
      source_type: 'markdown',
      url: '',
      source_file: 'data/sources/german-b2/lesson-1-corpus.md',
      publisher: 'User-provided notes',
      concepts: ['lesson 1', 'German B2', 'vocabulary', 'grammar', 'reading', 'writing'],
      summary: 'Embedded lesson-1 corpus with source-backed vocabulary, grammar, reading, and writing exercises.',
      citation_text: 'data/sources/german-b2/lesson-1-corpus.md',
      freshness_status: 'embedded_source',
      refresh_status: 'embedded_source',
      license_or_usage_note: 'Internal user-provided study material; preserve provenance and do not present as a verified public article.',
    },
    {
      id: GERMAN_B2_LESSON1_NOTES_SOURCE_ID,
      track_id: GERMAN_B2_TRACK_ID,
      title: 'German B2 lesson 1 source notes',
      source_type: 'markdown',
      url: '',
      source_file: 'data/sources/german-b2/lesson-1.md',
      publisher: 'User-provided notes',
      concepts: ['lesson 1', 'German B2', 'source notes'],
      summary: 'Embedded lesson-1 study notes used as supporting provenance for the learner-facing lesson.',
      citation_text: 'data/sources/german-b2/lesson-1.md',
      freshness_status: 'embedded_source',
      refresh_status: 'embedded_source',
      license_or_usage_note: 'Internal user-provided study material; preserve provenance and do not present as a verified public article.',
    },
  ];
}

function embeddedLesson1Source({ sourceId = GERMAN_B2_LESSON1_SOURCE_ID, sourceFile = 'data/sources/german-b2/lesson-1-corpus.md', lines = '' } = {}) {
  return {
    track_id: GERMAN_B2_TRACK_ID,
    source_id: sourceId,
    source_file: sourceFile,
    source_type: 'markdown',
    citation_text: `${sourceFile}${lines ? ` lines ${lines}` : ''}`,
    freshness_status: 'embedded_source',
    chunk_id: GERMAN_B2_LESSON1_CHUNK_ID,
  };
}

function embeddedLesson1Vocab(id, term, hungarian, extra = {}) {
  return {
    id: `embedded-lesson-1-vocab-${id}`,
    kind: 'vocab',
    term,
    hungarian,
    text: `${term} — ${hungarian}`,
    ...embeddedLesson1Source({ lines: extra.lines || '9-24' }),
    ...extra,
  };
}

function embeddedLesson1Grammar(id, text, extra = {}) {
  return {
    id: `embedded-lesson-1-grammar-${id}`,
    kind: 'grammar',
    text,
    ...embeddedLesson1Source({ lines: extra.lines || '26-60' }),
    ...extra,
  };
}

function embeddedLesson1Writing(id, text, extra = {}) {
  return {
    id: `embedded-lesson-1-writing-${id}`,
    kind: 'writing',
    text,
    ...embeddedLesson1Source({ lines: extra.lines || '75-100' }),
    retrieval: {
      track_id: GERMAN_B2_TRACK_ID,
      lesson_id: 'german-b2-exam:lesson:embedded-lesson-1',
      retrieval_mode: 'embedded_lesson_1_notes',
      vector_status: 'not_required_for_embedded_source',
      depends_on_vocab: extra.depends_on_vocab || ['gemeinsam', 'regelmäßig', 'erfolgreich', 'üben', 'lernen'],
      source_ids: [GERMAN_B2_LESSON1_SOURCE_ID],
      chunk_ids: [GERMAN_B2_LESSON1_CHUNK_ID],
    },
    ...extra,
  };
}

function buildEmbeddedGermanB2Lesson1() {
  const content = [
    embeddedLesson1Vocab('die-erfahrung', 'die Erfahrung', 'tapasztalat'),
    embeddedLesson1Vocab('gemeinsam', 'gemeinsam', 'közös, együtt'),
    embeddedLesson1Vocab('der-zug', 'der Zug', 'vonat'),
    embeddedLesson1Vocab('die-bahn', 'die Bahn', 'vasút, vonat, vasúttal', { note: 'In mit der Bahn = vonattal / vasúttal' }),
    embeddedLesson1Vocab('die-veranstaltung', 'die Veranstaltung', 'rendezvény, esemény'),
    embeddedLesson1Vocab('der-organisator', 'der Organisator', 'szervező'),
    embeddedLesson1Vocab('die-organisation', 'die Organisation', 'szervezés, szervezet', { note: 'More natural than Organisierung in standard German' }),
    embeddedLesson1Vocab('der-wettkampf', 'der Wettkampf', 'verseny'),
    embeddedLesson1Vocab('erfolgreich', 'erfolgreich', 'sikeres'),
    embeddedLesson1Vocab('der-fitnessraum', 'der Fitnessraum', 'fitneszterem, edzőterem', { note: 'Correct spelling: Fitnessraum' }),
    embeddedLesson1Vocab('die-weltmeisterschaft', 'die Weltmeisterschaft', 'világbajnokság'),
    embeddedLesson1Vocab('der-bruder', 'der Bruder', 'testvér / fiútestvér', { note: 'In the sentence, älterer Bruder is more natural than größerer Bruder' }),
    ...[
      ['lernen', 'tanulni / megtanulni', 'ich lerne', 'ich lernte', 'ich habe gelernt', false],
      ['sehen', 'látni / megnézni', 'ich sehe', 'ich sah', 'ich habe gesehen', true],
      ['haben', 'van / birtokol / rendelkezik', 'ich habe', 'ich hatte', 'ich habe gehabt', true],
      ['sein', 'lenni', 'ich bin', 'ich war', 'ich bin gewesen', true],
      ['werden', 'válni / lesz', 'ich werde', 'ich wurde', 'ich bin geworden', true],
      ['fahren', 'utazni / menni járművel', 'ich fahre', 'ich fuhr', 'ich bin gefahren', true],
      ['besuchen', 'meglátogatni / felkeresni', 'ich besuche', 'ich besuchte', 'ich habe besucht', false],
      ['teilnehmen', 'részt venni', 'ich nehme teil', 'ich nahm teil', 'ich habe teilgenommen', true],
      ['können', 'tud / képes valamire', 'ich kann', 'ich konnte', 'ich habe gekonnt', true],
      ['müssen', 'muszáj / kell', 'ich muss', 'ich musste', 'ich habe gemusst', true],
      ['spielen', 'játszani / sportolni', 'ich spiele', 'ich spielte', 'ich habe gespielt', false],
    ].map(([term, hungarian, present, past, perfect, irregular]) => embeddedLesson1Vocab(term, term, hungarian, {
      part_of_speech: 'verb',
      verb_forms: { present, past, perfect },
      irregular,
      lines: '28-42',
    })),
    embeddedLesson1Grammar('verb-forms', 'Review present, simple past, and perfect forms for lernen, sehen, haben, sein, werden, fahren, besuchen, teilnehmen, können, müssen, and spielen.', { lines: '28-42' }),
    embeddedLesson1Grammar('teilnehmen-dativ', 'teilnehmen an + Dativ', { lines: '44-48' }),
    embeddedLesson1Grammar('fahren-perfect', 'For movement, fahren often takes sein in the perfect tense.', { lines: '44-48' }),
    embeddedLesson1Grammar('werden-perfect', 'werden often has the perfect bin geworden when it means “to become.”', { lines: '44-48' }),
    embeddedLesson1Grammar('example-sentences', 'Use the source examples: ich bin nach Deutschland gefahren; ich war gestern im Kino und habe den neuen Film gesehen; wir haben den Weihnachtsmarkt besucht; ich habe 10 Jahre Fußball gespielt.', { lines: '50-60' }),
    {
      id: 'embedded-lesson-1-reading-context',
      kind: 'reading',
      exercise_type: 'source_backed_reading',
      title: 'Source-backed reading exercise from lesson 1 notes',
      text: 'Gemeinsam lernt man oft besser. Eine Erfahrung im Ausland kann dabei sehr hilfreich sein. Ich bin nach Deutschland gefahren, um dort Deutsch zu lernen und mehr über die Sprache und die Kultur zu sehen. Mit der Bahn kann man viele Orte besuchen. In einer Veranstaltung oder einem Wettkampf lernt man auch neue Menschen kennen. Wenn man erfolgreich sein will, muss man regelmäßig üben.',
      questions: [
        'Wohin ist die Person gefahren?',
        'Warum ist die Erfahrung wichtig?',
        'Womit kann man viele Orte besuchen?',
        'Was braucht man, um erfolgreich zu sein?',
      ],
      ...embeddedLesson1Source({ lines: '62-73' }),
      retrieval: {
        track_id: GERMAN_B2_TRACK_ID,
        lesson_id: 'german-b2-exam:lesson:embedded-lesson-1',
        retrieval_mode: 'embedded_lesson_1_notes',
        vector_status: 'not_required_for_embedded_source',
        article_source_status: 'no_researched_article_source_available',
        source_ids: [GERMAN_B2_LESSON1_SOURCE_ID],
        chunk_ids: [GERMAN_B2_LESSON1_CHUNK_ID],
      },
    },
    embeddedLesson1Writing('short-essay-language-learning', 'Short essay: Wie lernt man am besten eine Sprache? Verwende mindestens drei Wörter aus Lektion 1: gemeinsam, regelmäßig, erfolgreich, üben, lernen.', { prompt_type: 'short_essay', lines: '75-92' }),
    embeddedLesson1Writing('learning-experience', 'Schreibe 5–6 Sätze über deine eigene Lernerfahrung: Was lernst du? Wie lernst du? Welche Methode hilft dir am meisten? Lernst du lieber allein oder gemeinsam mit anderen?', { prompt_type: 'short_essay', lines: '94-100', depends_on_vocab: ['die Erfahrung', 'gemeinsam', 'lernen'] }),
  ];
  const reviewPacket = {
    schema_version: 'german-b2-note-review/v1',
    content_version: 1,
    review_status: 'review',
    chunk_ids: [GERMAN_B2_LESSON1_CHUNK_ID],
    validation: {
      issues: ['No separate researched German article source is available; reading is rendered as source-backed lesson-note exercise instead of fabricated article text.'],
      policy: {
        vocab_requires_hungarian: true,
        verb_forms_required: ['present', 'past', 'perfect'],
        irregular_verbs_marked: true,
        mixed_german_hungarian_allowed: true,
        edits_require_re_review: true,
        zip_unpacking_supported: false,
      },
    },
    content,
  };
  return {
    id: 'german-b2-exam:lesson:embedded-lesson-1',
    track_id: GERMAN_B2_TRACK_ID,
    sequence: 1,
    title: 'Lektion 1: Sprache lernen und Erfahrungen',
    status: 'review',
    source_type: 'markdown',
    source_ids: [GERMAN_B2_LESSON1_SOURCE_ID, GERMAN_B2_LESSON1_NOTES_SOURCE_ID],
    mutable: false,
    content_version: 1,
    review_packet: reviewPacket,
    review_history: [],
    provenance: lessonProvenance({ trackId: GERMAN_B2_TRACK_ID, sourceType: 'markdown', sourceIds: [GERMAN_B2_LESSON1_SOURCE_ID, GERMAN_B2_LESSON1_NOTES_SOURCE_ID], reviewPacket }),
    retrieval: {
      track_id: GERMAN_B2_TRACK_ID,
      lesson_id: 'german-b2-exam:lesson:embedded-lesson-1',
      selection_flow: 'embedded_lesson_1_notes -> lesson_1_payload_tabs -> UI sections',
      vector_status: 'not_required_for_embedded_source',
      db_vector_status: 'embedding_required_until_live_embeddings_exist',
      article_source_status: 'no_researched_article_source_available',
      anti_fabrication_policy: 'no external article or later-lesson vocabulary is generated without cited lesson-1 source chunks',
    },
    published_version: null,
    published_at: null,
    created_at: '2026-06-17T00:00:00.000Z',
    updated_at: '2026-06-17T00:00:00.000Z',
  };
}

function buildGermanB2Track() {
  const sources = uniqueBy([...embeddedGermanB2Lesson1Sources(), ...loadGeneratedSourceRecords(GERMAN_B2_TRACK_ID)], (source) => source.id);
  const embeddedLesson1 = buildEmbeddedGermanB2Lesson1();
  return {
    id: GERMAN_B2_TRACK_ID,
    code: 'GERMAN B2',
    name: 'German B2 Exam',
    accent: TRACK_ACCENTS[GERMAN_B2_TRACK_ID],
    purpose: 'personalized tutor from user notes',
    goal: 'Prep for the B2 German exam over ~1 year',
    source_types: GERMAN_B2_SOURCE_TYPES,
    lesson_lifecycle_states: LESSON_LIFECYCLE_STATES,
    last_verified_date: null,
    official_facts: [],
    domains: [],
    outline: { modules: [lessonModule(embeddedLesson1)] },
    lessons: [embeddedLesson1],
    cards: [],
    questions: [],
    questionBank: [],
    conceptRecords: [],
    serviceResources: [],
    studyPlans: {},
    consoleGuides: [],
    sources,
    sourceIndex: createSourceIndex(sources),
    videos: [],
    milestones: [
      { track_id: GERMAN_B2_TRACK_ID, id: `${GERMAN_B2_TRACK_ID}-m1`, title: 'Publish the first reviewed lesson from user notes', complete: false },
    ],
    limitations: ['German B2 lessons are created only from user-provided pdf, txt, or markdown notes. Do not invent future lessons or unpack ZIP bundles.'],
  };
}

function requiredLessonString(value, field, id) {
  const normalized = normalizeTextBlock(value);
  if (!normalized) throw new Error(`${id} missing ${field}`);
  return normalized;
}

function assertGermanB2LessonTarget(track) {
  if (track.id !== GERMAN_B2_TRACK_ID) throw new Error(`${track.id} does not accept personalized user-note lessons`);
}

function validateLessonSourceType(sourceType) {
  if (!GERMAN_B2_SOURCE_TYPES.includes(sourceType)) throw new Error(`unsupported source_type ${sourceType}`);
}

function validateLessonStatus(status) {
  if (!LESSON_LIFECYCLE_STATES.includes(status)) throw new Error(`unsupported lesson status ${status}`);
}

function lessonProvenance({ trackId, sourceType, sourceIds = [], reviewPacket = null }) {
  const contentSourceIds = Array.isArray(reviewPacket?.content)
    ? reviewPacket.content.map((item) => item.source_id).filter(Boolean)
    : [];
  return {
    track_id: trackId,
    source_type: sourceType,
    source_ids: unique([...sourceIds, ...contentSourceIds]),
    chunk_ids: unique(reviewPacket?.chunk_ids || []),
    citation_policy: {
      citation_required: true,
      preserve_user_upload_provenance: true,
      no_citation_no_answer: true,
    },
  };
}

function lessonModule(lesson) {
  return {
    module_id: lesson.id,
    title: lesson.title,
    status: lesson.status,
    source_type: lesson.source_type,
    source_ids: lesson.source_ids,
    content_version: lesson.content_version,
    tasks: [],
  };
}

function syncLessonModule(track, lesson) {
  const module = track.outline.modules.find((candidate) => candidate.module_id === lesson.id);
  if (!module) return;
  module.status = lesson.status;
  module.content_version = lesson.content_version;
  module.source_ids = lesson.source_ids;
}

function pushLessonHistory(lesson, event) {
  lesson.review_history = Array.isArray(lesson.review_history) ? lesson.review_history : [];
  lesson.review_history.push({ at: new Date().toISOString(), ...event });
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
  const awsTracks = Object.fromEntries(AWS_TRACK_IDS.map((id) => [id, buildTrack(id)]));
  const tracks = { ...awsTracks, [GERMAN_B2_TRACK_ID]: buildGermanB2Track() };
  const progress = Object.fromEntries(Object.values(tracks).map((track) => [track.id, initialProgress(track)]));
  const recordsByTrack = Object.fromEntries(Object.values(tracks).map((track) => [track.id, track.sources]));
  recordsByTrack.shared = buildSharedTrack().sources;
  const sourceRegistry = createSourceRegistry(recordsByTrack);
  return { app: { name: 'Vion Learning', version: '0.1.0' }, tracks, progress, logs: [], runtime: { quiz_serial: 0, track_serials: {} }, sourceRegistry };
}

export function getTrack(model, trackId) {
  const track = model.tracks[trackId];
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  return track;
}

export function appendLesson(model, { trackId, lesson }) {
  const track = getTrack(model, trackId);
  assertGermanB2LessonTarget(track);
  const id = requiredLessonString(lesson?.id, 'lesson.id', GERMAN_B2_TRACK_ID);
  const title = requiredLessonString(lesson?.title, 'lesson.title', id);
  const sourceType = requiredLessonString(lesson?.source_type, 'lesson.source_type', id);
  const status = lesson?.status || 'draft';
  validateLessonSourceType(sourceType);
  validateLessonStatus(status);
  if (status === 'published') throw new Error(`Lesson ${id} cannot be appended as published; submit for review and approve it before publish`);
  if (track.lessons.some((candidate) => candidate.id === id)) throw new Error(`Lesson ${id} already exists`);
  const now = new Date().toISOString();
  const contentVersion = Number(lesson?.content_version || lesson?.review_packet?.content_version || 1);
  const reviewPacket = lesson?.review_packet
    ? {
      mutable: true,
      ...lesson.review_packet,
      content_version: contentVersion,
      review_status: lesson.review_packet.review_status || (status === 'published' ? 'review' : status),
    }
    : null;
  const normalized = {
    id,
    track_id: track.id,
    sequence: track.lessons.length + 1,
    title,
    status,
    source_type: sourceType,
    source_ids: unique(lesson?.source_ids || []),
    mutable: true,
    content_version: contentVersion,
    review_packet: reviewPacket,
    review_history: Array.isArray(lesson?.review_history) ? [...lesson.review_history] : [],
    provenance: lessonProvenance({ trackId: track.id, sourceType, sourceIds: unique(lesson?.source_ids || []), reviewPacket }),
    published_version: lesson?.published_version || null,
    created_at: lesson?.created_at || now,
    updated_at: lesson?.updated_at || lesson?.created_at || now,
  };
  track.lessons.push(normalized);
  track.outline.modules.push(lessonModule(normalized));
  return normalized;
}

export function transitionLesson(model, { trackId, lessonId, status }) {
  const track = getTrack(model, trackId);
  assertGermanB2LessonTarget(track);
  validateLessonStatus(status);
  const lesson = track.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) throw new Error(`Lesson ${lessonId} does not belong to track ${trackId}`);
  const previousStatus = lesson.status;
  const now = new Date().toISOString();
  lesson.review_history = Array.isArray(lesson.review_history) ? lesson.review_history : [];
  if (status === 'published') {
    if (previousStatus !== 'review') throw new Error(`Lesson ${lessonId} must be in review before publish`);
    if (lesson.review_packet?.review_status !== 'approved') throw new Error(`Lesson ${lessonId} must be approved before publish`);
    lesson.published_version = Number(lesson.content_version || lesson.review_packet?.content_version || 1);
    lesson.published_at = now;
    lesson.provenance = lessonProvenance({ trackId: track.id, sourceType: lesson.source_type, sourceIds: lesson.source_ids, reviewPacket: lesson.review_packet });
    lesson.review_history.push({
      at: now,
      action: 'published',
      from_status: previousStatus,
      to_status: status,
      content_version: lesson.published_version,
      provenance: lesson.provenance,
    });
  } else if (previousStatus !== status) {
    lesson.review_history.push({
      at: now,
      action: 'status_transition',
      from_status: previousStatus,
      to_status: status,
      content_version: Number(lesson.content_version || 1),
    });
  }
  lesson.status = status;
  lesson.updated_at = now;
  const module = track.outline.modules.find((candidate) => candidate.module_id === lessonId);
  if (module) {
    module.status = status;
    module.content_version = lesson.content_version;
    module.review_status = lesson.review_packet?.review_status || status;
  }
  return lesson;
}

export function reviewLessonContent(model, { trackId, lessonId, reviewer = 'unknown', decision, notes = '' }) {
  const track = getTrack(model, trackId);
  assertGermanB2LessonTarget(track);
  const lesson = track.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) throw new Error(`Lesson ${lessonId} does not belong to track ${trackId}`);
  if (lesson.status !== 'review') throw new Error(`Lesson ${lessonId} must be in review before review decision`);
  if (!['approved', 'changes_requested'].includes(decision)) throw new Error(`unsupported review decision ${decision}`);
  const issues = lesson.review_packet?.validation?.issues || [];
  if (decision === 'approved' && issues.length) throw new Error(`Lesson ${lessonId} has validation issues and cannot be approved`);
  const now = new Date().toISOString();
  lesson.review_packet = {
    mutable: true,
    ...(lesson.review_packet || {}),
    review_status: decision === 'approved' ? 'approved' : 'needs_edit',
    reviewed_at: now,
    reviewed_by: reviewer,
    review_notes: notes,
  };
  lesson.review_history = Array.isArray(lesson.review_history) ? lesson.review_history : [];
  lesson.review_history.push({
    at: now,
    action: decision === 'approved' ? 'review_approved' : 'changes_requested',
    reviewer,
    decision,
    notes,
    content_version: Number(lesson.content_version || lesson.review_packet?.content_version || 1),
    from_status: lesson.status,
    to_status: decision === 'approved' ? 'review' : 'draft',
  });
  if (decision === 'changes_requested') lesson.status = 'draft';
  lesson.updated_at = now;
  const module = track.outline.modules.find((candidate) => candidate.module_id === lessonId);
  if (module) {
    module.status = lesson.status;
    module.review_status = lesson.review_packet.review_status;
  }
  return lesson.review_packet;
}

export function editLessonContent(model, { trackId, lessonId, review_packet: reviewPacket, editor = 'unknown' }) {
  const track = getTrack(model, trackId);
  assertGermanB2LessonTarget(track);
  const lesson = track.lessons.find((candidate) => candidate.id === lessonId);
  if (!lesson) throw new Error(`Lesson ${lessonId} does not belong to track ${trackId}`);
  const previousVersion = Number(lesson.content_version || lesson.review_packet?.content_version || 1);
  const nextVersion = previousVersion + 1;
  const now = new Date().toISOString();
  const nextPacket = {
    mutable: true,
    ...(reviewPacket || {}),
    content_version: nextVersion,
    review_status: reviewPacket?.validation?.issues?.length ? 'needs_edit' : 'review',
  };
  lesson.review_history = Array.isArray(lesson.review_history) ? lesson.review_history : [];
  lesson.review_history.push({
    at: now,
    action: 'edited',
    editor,
    from_version: previousVersion,
    to_version: nextVersion,
    from_status: lesson.status,
    to_status: 'review',
  });
  lesson.review_packet = nextPacket;
  lesson.content_version = nextVersion;
  lesson.provenance = lessonProvenance({ trackId: track.id, sourceType: lesson.source_type, sourceIds: lesson.source_ids, reviewPacket: nextPacket });
  lesson.status = 'review';
  lesson.updated_at = now;
  const module = track.outline.modules.find((candidate) => candidate.module_id === lessonId);
  if (module) {
    module.status = lesson.status;
    module.content_version = nextVersion;
    module.review_status = nextPacket.review_status;
  }
  return lesson;
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

function lessonTabsForPayload(lesson) {
  const content = Array.isArray(lesson.review_packet?.content) ? lesson.review_packet.content : [];
  return Object.fromEntries(GERMAN_B2_LESSON_TABS.map((tab) => [
    tab,
    content.filter((item) => item.kind === tab),
  ]));
}

function lessonsForPayload(track) {
  if (track.id !== GERMAN_B2_TRACK_ID) return [];
  return (track.lessons || []).map((lesson) => ({
    id: lesson.id,
    track_id: lesson.track_id,
    sequence: lesson.sequence,
    title: lesson.title,
    status: lesson.status,
    source_type: lesson.source_type,
    source_ids: lesson.source_ids || [],
    content_version: lesson.content_version,
    published_version: lesson.published_version || null,
    published_at: lesson.published_at || null,
    review_status: lesson.review_packet?.review_status || lesson.status,
    provenance: lesson.provenance || lessonProvenance({ trackId: track.id, sourceType: lesson.source_type, sourceIds: lesson.source_ids, reviewPacket: lesson.review_packet }),
    retrieval: lesson.retrieval || null,
    review_history: lesson.review_history || [],
    tabs: lessonTabsForPayload(lesson),
    validation: lesson.review_packet?.validation || null,
    updated_at: lesson.updated_at,
  }));
}

export function trackPayload(model, trackId) {
  const track = getTrack(model, trackId);
  const sourceStatusCounts = track.sources.reduce((acc, source) => {
    const key = source.freshness_status || source.refresh_status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    track: {
      id: track.id,
      code: track.code,
      name: track.name,
      accent: track.accent,
      purpose: track.purpose || null,
      goal: track.goal || null,
      source_types: track.source_types || [],
      lesson_lifecycle_states: track.lesson_lifecycle_states || [],
      last_verified_date: track.last_verified_date,
      official_facts: track.official_facts,
    },
    progress: model.progress[trackId],
    domains: track.domains,
    services: unique([...track.cards.flatMap((card) => card.services), ...track.serviceResources.map((resource) => resource.name), ...track.questionBank.flatMap((question) => question.services)]),
    serviceResources: track.serviceResources,
    conceptRecords: track.conceptRecords,
    learningPath: track.outline.modules,
    lessonTabs: track.id === GERMAN_B2_TRACK_ID ? GERMAN_B2_LESSON_TABS : [],
    lessons: lessonsForPayload(track),
    learningChunks: buildLearningChunks(track),
    topicPages: buildTopicPages(track),
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
