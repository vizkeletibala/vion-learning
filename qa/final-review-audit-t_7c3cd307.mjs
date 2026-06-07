import { loadLearningModel, createQuiz, evaluateAnswer, landingPayload, trackPayload, resourcesPayload } from '../src/lib/learningModel.js';

const model = loadLearningModel();
const out = { generatedAt: new Date().toISOString(), checks: [], findings: [] };
function check(name, ok, detail = {}) {
  out.checks.push({ name, ok, ...detail });
}
function finding(severity, category, title, detail = {}) {
  out.findings.push({ severity, category, title, ...detail });
}

const landing = landingPayload(model);
check('landing exposes exactly CLF-C02 and AIF-C01 choices', landing.tracks.map(t => t.track_id).sort().join(',') === 'aif-c01,clf-c02', { tracks: landing.tracks.map(t => t.track_id) });

for (const id of ['clf-c02', 'aif-c01']) {
  const track = trackPayload(model, id);
  check(`${id} has separate study plans 7/14/30`, ['7','14','30'].every(k => Array.isArray(track.studyPlans[k]) && track.studyPlans[k].length === Number(k)), { lengths: Object.fromEntries(Object.entries(track.studyPlans).map(([k,v]) => [k, v.length])) });
  check(`${id} has cards, questions, source report, progress, readiness`, track.cards.length > 0 && track.questions.length > 0 && track.sourceReport.sources.length > 0 && typeof track.progress.readiness_score === 'number', { cards: track.cards.length, questions: track.questions.length, sources: track.sourceReport.sources.length, readiness: track.progress.readiness_score });
  check(`${id} cards/questions are track-scoped`, track.cards.every(c => c.track_id === id) && track.questions.every(q => q.track_id === id), { offTrackCards: track.cards.filter(c => c.track_id !== id).slice(0,3), offTrackQuestions: track.questions.filter(q => q.track_id !== id).slice(0,3) });
  check(`${id} source records include verification dates/status`, track.sourceReport.sources.every(s => s.last_verified_date || s.last_checked_at || s.checked_at) && track.sourceReport.sources.every(s => s.freshness_status || s.refresh_status || s.metadata_status), { sample: track.sourceReport.sources.slice(0, 2) });
  check(`${id} video resources are supplementary/metadata-only`, track.videos.length > 0 && track.videos.every(v => /needs_|seed_metadata|metadata/i.test(v.metadata_status || '') && /Skill Builder|YouTube|training|AWS/i.test(`${v.provider} ${v.url}`)), { videos: track.videos });
  for (const [mode, body] of [['quick', {mode:'quick'}], ['domain', {mode:'domain', domainId: track.domains[0].id}], ['full', {mode:'full'}]]) {
    const quiz = createQuiz(model, { trackId: id, ...body });
    check(`${id} ${mode} quiz structure`, quiz.track_id === id && quiz.questions.length === quiz.question_count && (mode !== 'quick' || quiz.question_count === 10) && (mode !== 'full' || quiz.question_count === 65), { question_count: quiz.question_count, structure: quiz.structure, timed_minutes: quiz.timed_minutes, firstQuestion: quiz.questions[0]?.id });
    const q = quiz.questions[0];
    const selected = q.options[0].id;
    const review = evaluateAnswer(model, { trackId: id, questionId: q.instance_id || q.id, selectedOptionId: selected });
    check(`${id} ${mode} answer evaluation has explanations, distractor analysis, mapping, weak-area/progress signal`, Boolean(review.correct_explanation && review.selected_explanation && review.option_reviews?.length >= 4 && review.mapping?.track_id === id && review.next_actions?.length && review.progress_event?.domain_id), { reviewKeys: Object.keys(review), mapping: review.mapping, next_actions: review.next_actions });
  }
}

const clf = trackPayload(model, 'clf-c02');
const aif = trackPayload(model, 'aif-c01');
check('CLF-C02 has useful deep seed corpus and AIF-C01 remains separate', clf.cards.length >= 100 && clf.questions.length >= 100 && resourcesPayload(model, 'clf-c02').count >= 90 && resourcesPayload(model, 'aif-c01').count === 0 && !JSON.stringify(aif).includes('clf-c02'), { clfCards: clf.cards.length, clfQuestions: clf.questions.length, clfResources: resourcesPayload(model,'clf-c02').count, aifCards: aif.cards.length, aifQuestions: aif.questions.length, aifResources: resourcesPayload(model,'aif-c01').count });

const allText = JSON.stringify(model).toLowerCase();
const badPatterns = [
  /\bbraindump\b/,
  /\bbrain dump\b/,
  /\bactual exam questions?\b/,
  /\breal exam questions?\b/,
  /\bleaked exam questions?\b/,
];
const matched = badPatterns
  .map((pattern) => pattern.source)
  .filter((pattern, index) => badPatterns[index].test(allText));
check('no obvious brain-dump/unauthorized-material claims in app corpus', matched.length === 0, { matched });
if (matched.length) finding('high', 'content_safety', 'Suspicious unauthorized-material wording appears in corpus', { matched });

const expectedTopicByFamily = {
  'AI/ML basics': '3.7',
  'Databases/analytics': '3.4',
  'Global infrastructure': '3.2',
  'Management/observability': '3.8',
  'Networking/CDN': '3.5',
  Storage: '3.6',
  Compute: '3.3',
  'IAM/security': '2.3',
  'Billing/cost': '4.1',
  Migration: '1.3',
  'Integration/app': '3.8',
};
const familyMismatches = [];
for (const r of clf.serviceResources) {
  const expected = expectedTopicByFamily[r.family];
  const actual = r.weak_area_mappings?.[0]?.topic_id;
  if (expected && actual !== expected) familyMismatches.push({ name: r.name, family: r.family, expected, actual });
}
check('CLF-C02 resource weak-area family mappings align to exam task statements', familyMismatches.length === 0, { mismatchCount: familyMismatches.length, examples: familyMismatches.slice(0, 12) });
if (familyMismatches.length) finding('high', 'content_taxonomy', 'CLF-C02 resource weak-area mappings still point several families at the wrong task statement', { examples: familyMismatches.slice(0, 12), impact: 'Weak-area labels and generated card/question mappings can teach Storage/Networking/Database/AI/global-infrastructure concepts under unrelated task statements.' });

const shallow = clf.questions.filter(q => q.question_type === 'knowledge_check' && q.prompt.startsWith('For CLF-C02') && q.options.some(o => /Ignore the task statement|broadest AWS marketing phrase|nearby AWS concept/i.test(o.label))).slice(0, 5).map(q => ({ id: q.id, prompt: q.prompt, optionLabels: q.options.map(o => o.label) }));
check('generated resource reinforcement questions use meaningful distractor labels', shallow.length === 0, { examples: shallow });
if (shallow.length) finding('medium', 'question_quality', 'Some generated reinforcement questions still contain generic distractor labels', { examples: shallow, impact: 'Safe/original, but lower-fidelity for exam readiness than curated scenario questions.' });

console.log(JSON.stringify(out, null, 2));
if (out.checks.some(c => !c.ok)) process.exitCode = 1;
