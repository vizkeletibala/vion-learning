import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLearningModel, getTrack, createQuiz, evaluateAnswer, markCard } from '../src/lib/learningModel.js';

test('learning model keeps CLF-C02 and AIF-C01 content strictly track scoped', () => {
  const model = loadLearningModel();
  assert.deepEqual(Object.keys(model.tracks).sort(), ['aif-c01', 'clf-c02']);

  for (const trackId of Object.keys(model.tracks)) {
    const track = getTrack(model, trackId);
    assert.equal(track.id, trackId);
    assert.ok(track.cards.length > 0);
    assert.ok(track.domains.length > 0);
    assert.ok(track.sources.length > 0);
    assert.ok(track.studyPlans['7'].length > 0);
    assert.ok(track.studyPlans['14'].length > 0);
    assert.ok(track.studyPlans['30'].length > 0);
    assert.ok(track.consoleGuides.length > 0);
    assert.ok(track.videos.length > 0);
    assert.equal(track.cards.every((card) => card.track_id === trackId), true);
    assert.equal(track.questions.every((question) => question.track_id === trackId), true);
    assert.equal(track.domains.every((domain) => domain.track_id === trackId), true);
  }

  const clfCardIds = new Set(model.tracks['clf-c02'].cards.map((card) => card.id));
  assert.equal(model.tracks['aif-c01'].cards.some((card) => clfCardIds.has(card.id)), false);
});

test('quiz engine creates requested modes with explanations and track mapping', () => {
  const model = loadLearningModel();
  const quick = createQuiz(model, { trackId: 'clf-c02', mode: 'quick' });
  assert.equal(quick.track_id, 'clf-c02');
  assert.equal(quick.question_count, 10);
  assert.equal(quick.questions.every((q) => q.track_id === 'clf-c02'), true);
  assert.equal(quick.questions.every((q) => q.explanations.correct && q.explanations.distractors.length >= 3), true);

  const full = createQuiz(model, { trackId: 'aif-c01', mode: 'full' });
  assert.equal(full.question_count, 65);
  assert.equal(full.timed_minutes, 90);
  assert.equal(full.questions.every((q) => q.track_id === 'aif-c01'), true);

  const domain = createQuiz(model, { trackId: 'clf-c02', mode: 'domain', domainId: '1', count: 15 });
  assert.equal(domain.questions.length, 15);
  assert.equal(domain.questions.every((q) => q.domain_id === '1'), true);
});

test('answer evaluation updates readiness, next actions, progress history, and spaced repetition', () => {
  const model = loadLearningModel();
  const quiz = createQuiz(model, { trackId: 'aif-c01', mode: 'quick' });
  const question = quiz.questions[0];
  const before = model.progress['aif-c01'].readiness_score;
  const result = evaluateAnswer(model, {
    trackId: 'aif-c01',
    questionId: question.id,
    selectedOptionId: question.correct_option_id,
  });
  assert.equal(result.correct, true);
  assert.ok(result.correct_explanation.length > 20);
  assert.ok(result.next_actions.length > 0);
  assert.equal(result.mapping.track_id, 'aif-c01');
  assert.equal(model.progress['aif-c01'].history.length, 1);
  assert.ok(model.progress['aif-c01'].readiness_score >= before);

  const cardResult = markCard(model, { trackId: 'aif-c01', cardId: question.card_id, status: 'know' });
  assert.equal(cardResult.track_id, 'aif-c01');
  assert.ok(cardResult.next_review_at);
  assert.equal(cardResult.interval_days >= 1, true);
});

test('cross-track reads and answer updates are rejected', () => {
  const model = loadLearningModel();
  assert.throws(() => getTrack(model, 'missing-track'), /Unknown track/);
  const clfQuestion = model.tracks['clf-c02'].questions[0];
  assert.throws(
    () => evaluateAnswer(model, { trackId: 'aif-c01', questionId: clfQuestion.id, selectedOptionId: clfQuestion.correct_option_id }),
    /does not belong to track aif-c01/
  );
});

test('CLF-C02 loads deep AWS resource explanations with citations and exam learning metadata', () => {
  const model = loadLearningModel();
  const clf = getTrack(model, 'clf-c02');
  const aif = getTrack(model, 'aif-c01');

  assert.ok(Array.isArray(clf.serviceResources), 'CLF-C02 should expose service/resource explanation records');
  assert.equal(clf.serviceResources.length >= 50, true, 'CLF-C02 should include a substantial service/resource corpus');
  assert.equal(aif.serviceResources.length, 0, 'AIF-C01 must not inherit CLF-C02 resource explanations');

  const s3 = clf.serviceResources.find((resource) => /S3/.test(resource.name));
  assert.ok(s3, 'expected an Amazon S3 explanation entry');
  assert.equal(s3.track_id, 'clf-c02');
  assert.ok(s3.family);
  assert.ok(s3.priority);
  assert.ok(s3.simple_analogy.length > 20);
  assert.ok(s3.plain_english_explanation.length > 80);
  assert.ok(s3.real_world_use_case.length > 20);
  assert.ok(s3.comparison.length > 20);
  assert.ok(s3.misconceptions.length > 0);
  assert.ok(s3.exam_clues.length > 0);
  assert.ok(s3.weak_area_mappings.length > 0);
  assert.ok(s3.source_citations.length >= 2);
  assert.ok(s3.last_verified);

  const deepCards = clf.cards.filter((card) => card.origin === 'resource_explanation_corpus');
  assert.equal(deepCards.length >= 50, true, 'CLF-C02 should generate deeper study cards from the corpus');
  assert.equal(deepCards.every((card) => card.resource_id && card.exam_clues.length && card.misconceptions.length), true);
  assert.equal(deepCards.every((card) => card.source_links.length >= 2), true);
});
