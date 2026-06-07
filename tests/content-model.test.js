import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLearningModel, getTrack, createQuiz, evaluateAnswer, markCard } from '../src/lib/learningModel.js';

function correctOptionPosition(question) {
  return question.options.findIndex((option) => option.id === question.correct_option_id);
}

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
    assert.equal(track.sources.every((source) => source.track_id === trackId), true);
  }

  const clfCardIds = new Set(model.tracks['clf-c02'].cards.map((card) => card.id));
  assert.equal(model.tracks['aif-c01'].cards.some((card) => clfCardIds.has(card.id)), false);
  assert.equal(model.tracks['aif-c01'].questionBank.length, 0, 'AIF-C01 should not inherit the CLF-C02 curated question bank');
  assert.equal(model.tracks['aif-c01'].conceptRecords.length, 0, 'AIF-C01 should not inherit CLF-C02 concept records');
});

test('CLF-C02 exposes richer concept records and curated exam-style questions with mappings and explanations', () => {
  const model = loadLearningModel();
  const clf = getTrack(model, 'clf-c02');

  assert.equal(clf.conceptRecords.length >= 10, true, 'expected a substantive CLF-C02 concept set');
  assert.equal(clf.questionBank.length >= 18, true, 'expected a substantive CLF-C02 curated question bank');

  for (const concept of clf.conceptRecords) {
    assert.equal(concept.track_id, 'clf-c02');
    assert.ok(concept.domain.id);
    assert.ok(concept.services.length > 0);
    assert.ok(concept.concepts.length > 0);
    assert.ok(concept.scenario.length > 30);
    assert.ok(concept.exam_angle.length > 20);
    assert.ok(concept.common_misconceptions.length > 0);
    assert.ok(concept.decision_rules.length > 0);
    assert.ok(concept.source_urls.length > 0);
    assert.ok(concept.source_ids.length > 0, `${concept.id} should resolve checked-in source ids`);
    assert.equal(concept.source_ids.every((sourceId) => sourceId.startsWith('clf-c02:')), true);
  }

  for (const question of clf.questionBank) {
    assert.equal(question.track_id, 'clf-c02');
    assert.ok(question.domain_id);
    assert.ok(question.topic_id);
    assert.ok(question.question_type);
    assert.ok(question.difficulty);
    assert.ok(question.services.length > 0);
    assert.ok(question.concepts.length > 0);
    assert.ok(question.scenario.length > 20);
    assert.ok(question.exam_angle.length > 15);
    assert.ok(question.source_links.length > 0);
    assert.ok(question.source_ids.length > 0);
    assert.equal(question.options.length, 4);
    assert.equal(question.options.filter((option) => option.id === question.correct_option_id).length, 1, 'question should have exactly one correct option id');
    assert.equal(new Set(question.options.map((option) => option.label)).size, 4, 'distractors should not be duplicate labels');
    assert.equal(question.options.every((option) => option.explanation && option.explanation.length > 20), true, 'every option should teach something');
    assert.equal(question.explanations.distractors.length, 3);
  }
});

test('quiz engine creates varied Quick 10 quizzes and stable track-scoped domain/full modes', () => {
  const model = loadLearningModel();
  const quick = createQuiz(model, { trackId: 'clf-c02', mode: 'quick' });
  assert.equal(quick.track_id, 'clf-c02');
  assert.equal(quick.question_count, 10);
  assert.equal(quick.questions.every((question) => question.track_id === 'clf-c02'), true);
  assert.equal(new Set(quick.questions.map((question) => question.question_type)).size >= 3, true, 'Quick 10 should mix question types where possible');
  assert.equal(new Set(quick.questions.map((question) => question.difficulty)).size >= 2, true, 'Quick 10 should mix difficulty levels where possible');
  assert.equal(new Set(quick.questions.map((question) => question.domain_id)).size >= 2, true, 'Quick 10 should span multiple domains where possible');

  const full = createQuiz(model, { trackId: 'aif-c01', mode: 'full' });
  assert.equal(full.question_count, 65);
  assert.equal(full.timed_minutes, 90);
  assert.equal(full.questions.every((question) => question.track_id === 'aif-c01'), true);

  const domain = createQuiz(model, { trackId: 'clf-c02', mode: 'domain', domainId: '1', count: 15 });
  assert.equal(domain.questions.length, 15);
  assert.equal(domain.questions.every((question) => question.domain_id === '1'), true);
  assert.equal(new Set(domain.questions.map((question) => question.id)).size >= 10, true, 'domain quizzes should use the deeper pool instead of repeating a tiny curated subset');
});

test('quick quizzes avoid obvious correct-answer position bias across repeated runs', () => {
  const model = loadLearningModel();
  const positions = [0, 0, 0, 0];

  for (let run = 0; run < 24; run += 1) {
    const quiz = createQuiz(model, { trackId: 'clf-c02', mode: 'quick' });
    for (const question of quiz.questions) {
      positions[correctOptionPosition(question)] += 1;
    }
  }

  const max = Math.max(...positions);
  const min = Math.min(...positions);
  assert.equal(min > 0, true, `each answer position should appear at least once: ${positions.join(', ')}`);
  assert.equal(max - min <= 12, true, `answer positions should stay reasonably balanced: ${positions.join(', ')}`);
});

test('answer evaluation returns detailed review data and spaced repetition still works', () => {
  const model = loadLearningModel();
  const quiz = createQuiz(model, { trackId: 'clf-c02', mode: 'quick' });
  const question = quiz.questions[0];
  const before = model.progress['clf-c02'].readiness_score;
  const result = evaluateAnswer(model, {
    trackId: 'clf-c02',
    questionId: question.id,
    selectedOptionId: question.correct_option_id,
  });

  assert.equal(result.correct, true);
  assert.ok(result.correct_explanation.length > 20);
  assert.ok(result.selected_explanation.length > 20);
  assert.ok(result.option_reviews.length === 4);
  assert.ok(result.review_summary.exam_angle.length > 10);
  assert.ok(result.mapping.question_type);
  assert.ok(result.mapping.difficulty);
  assert.ok(result.mapping.services.length > 0);
  assert.ok(result.mapping.concepts.length > 0);
  assert.ok(result.mapping.source_ids.length > 0);
  assert.equal(model.progress['clf-c02'].history.length, 1);
  assert.ok(model.progress['clf-c02'].readiness_score >= before);

  const cardResult = markCard(model, { trackId: 'clf-c02', cardId: question.card_id, status: 'know' });
  assert.equal(cardResult.track_id, 'clf-c02');
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

test('CLF-C02 still loads deep AWS resource explanations without leaking them into AIF-C01', () => {
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
});

test('CLF-C02 resource families map to the correct exam task statements', () => {
  const model = loadLearningModel();
  const clf = getTrack(model, 'clf-c02');
  const expectedByFamily = new Map([
    ['AI/ML basics', { domain_id: '3', topic_id: '3.7' }],
    ['Billing/cost', { domain_id: '4', topic_id: '4.1' }],
    ['Compute', { domain_id: '3', topic_id: '3.3' }],
    ['Databases/analytics', { domain_id: '3', topic_id: '3.4' }],
    ['Global infrastructure', { domain_id: '3', topic_id: '3.2' }],
    ['IAM/security', { domain_id: '2', topic_id: '2.3' }],
    ['Integration/app', { domain_id: '3', topic_id: '3.8' }],
    ['Management/observability', { domain_id: '3', topic_id: '3.8' }],
    ['Migration', { domain_id: '1', topic_id: '1.3' }],
    ['Networking/CDN', { domain_id: '3', topic_id: '3.5' }],
    ['Storage', { domain_id: '3', topic_id: '3.6' }],
  ]);

  for (const resource of clf.serviceResources) {
    const expected = expectedByFamily.get(resource.family);
    assert.ok(expected, `unexpected CLF-C02 resource family ${resource.family} for ${resource.name}`);
    assert.deepEqual(
      resource.weak_area_mappings.map(({ domain_id, topic_id }) => ({ domain_id, topic_id })),
      [expected],
      `${resource.name} (${resource.family}) should map to CLF-C02 task statement ${expected.topic_id}`
    );
  }

  for (const card of clf.cards.filter((candidate) => candidate.origin === 'resource_explanation_corpus')) {
    const expected = expectedByFamily.get(card.services[1]);
    assert.deepEqual(
      { domain_id: card.domain_id, topic_id: card.topic_id, task_statement_id: card.task_statement_id },
      { ...expected, task_statement_id: expected.topic_id },
      `${card.id} should inherit the resource family task statement mapping`
    );
  }
});

test('generated reinforcement question distractors use learner-meaningful labels instead of generic meta instructions', () => {
  const model = loadLearningModel();
  const genericFragments = [
    'Choose the broadest AWS marketing phrase',
    'Treat a nearby AWS concept as interchangeable',
    'Ignore the task statement mapping',
  ];

  for (const track of Object.values(model.tracks)) {
    const generatedQuestions = track.questions.filter((question) => !track.questionBank.some((curated) => curated.id === question.id));
    assert.ok(generatedQuestions.length > 0, `${track.id} should include generated reinforcement questions`);

    for (const question of generatedQuestions) {
      const distractors = question.options.filter((option) => option.id !== question.correct_option_id);
      assert.equal(distractors.length, 3, `${question.id} should have exactly three distractors`);
      assert.equal(new Set(distractors.map((option) => option.label)).size, 3, `${question.id} should not duplicate distractor labels`);
      for (const distractor of distractors) {
        assert.equal(
          genericFragments.some((fragment) => distractor.label.includes(fragment)),
          false,
          `${question.id} has generic distractor label: ${distractor.label}`
        );
        assert.equal(distractor.label.length > 20, true, `${question.id} distractor should be descriptive`);
      }
    }
  }
});
