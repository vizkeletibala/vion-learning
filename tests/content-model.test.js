import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LESSON_LIFECYCLE_STATES,
  appendLesson,
  editLessonContent,
  loadLearningModel,
  getTrack,
  trackPayload,
  sourcesPayload,
  createQuiz,
  evaluateAnswer,
  markCard,
  reviewLessonContent,
  transitionLesson,
} from '../src/lib/learningModel.js';

function correctOptionPosition(question) {
  return question.options.findIndex((option) => option.id === question.correct_option_id);
}

test('learning model keeps CLF-C02 and AIF-C01 content strictly track scoped', () => {
  const model = loadLearningModel();
  assert.deepEqual(Object.keys(model.tracks).sort(), ['aif-c01', 'clf-c02', 'german-b2-exam']);

  for (const trackId of ['clf-c02', 'aif-c01']) {
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

test('German B2 Exam is an isolated personalized tutor track with no fake future lessons', () => {
  const model = loadLearningModel();
  const german = getTrack(model, 'german-b2-exam');
  const clf = getTrack(model, 'clf-c02');
  const aif = getTrack(model, 'aif-c01');

  assert.equal(german.id, 'german-b2-exam');
  assert.equal(german.name, 'German B2 Exam');
  assert.equal(german.purpose, 'personalized tutor from user notes');
  assert.equal(german.goal, 'Prep for the B2 German exam over ~1 year');
  assert.deepEqual(german.source_types, ['pdf', 'txt', 'markdown']);
  assert.deepEqual(german.lesson_lifecycle_states, ['draft', 'review', 'published']);
  assert.deepEqual(LESSON_LIFECYCLE_STATES, ['draft', 'review', 'published']);
  assert.deepEqual(german.lessons.map((lesson) => lesson.id), ['german-b2-exam:lesson:embedded-lesson-1'], 'German B2 track should expose only source-backed embedded lesson 1 and no fake future catalog');
  assert.deepEqual(german.outline.modules.map((module) => module.module_id), ['german-b2-exam:lesson:embedded-lesson-1'], 'German B2 outline should contain only the source-backed lesson 1 module');
  assert.deepEqual(german.cards, []);
  assert.deepEqual(german.questions, []);
  assert.deepEqual(german.serviceResources, []);
  assert.equal(german.sources.every((source) => source.track_id === 'german-b2-exam'), true);
  assert.deepEqual(german.sources.map((source) => source.id).sort(), [
    'german-b2-exam:embedded:lesson-1:lesson-1-corpus.md',
    'german-b2-exam:embedded:lesson-1:lesson-1.md',
  ]);
  assert.equal(german.sources.every((source) => source.freshness_status === 'embedded_source'), true);

  assert.equal(clf.cards.some((card) => card.track_id === 'german-b2-exam'), false);
  assert.equal(aif.cards.some((card) => card.track_id === 'german-b2-exam'), false);
  assert.equal(german.sources.some((source) => source.track_id === 'clf-c02' || source.track_id === 'aif-c01'), false);
});

test('German B2 lessons can be appended gradually but publish is gated by explicit review approval', () => {
  const model = loadLearningModel();

  const first = appendLesson(model, {
    trackId: 'german-b2-exam',
    lesson: {
      id: 'lesson-1',
      title: 'Konjunktiv II notes from class',
      source_type: 'markdown',
      source_ids: ['german-b2-exam:upload:konjunktiv-notes'],
      review_packet: {
        schema_version: 'german-b2-note-review/v1',
        content_version: 1,
        review_status: 'review',
        content: [{ kind: 'grammar', text: 'Konjunktiv II: Ich würde mich bewerben.' }],
      },
    },
  });
  assert.equal(first.status, 'draft');
  assert.equal(first.sequence, 2);

  const reviewed = transitionLesson(model, {
    trackId: 'german-b2-exam',
    lessonId: 'lesson-1',
    status: 'review',
  });
  assert.equal(reviewed.status, 'review');

  assert.throws(
    () => transitionLesson(model, {
      trackId: 'german-b2-exam',
      lessonId: 'lesson-1',
      status: 'published',
    }),
    /must be approved before publish/
  );

  const approved = reviewLessonContent(model, {
    trackId: 'german-b2-exam',
    lessonId: 'lesson-1',
    reviewer: 'teacher',
    decision: 'approved',
  });
  assert.equal(approved.review_status, 'approved');

  const published = transitionLesson(model, {
    trackId: 'german-b2-exam',
    lessonId: 'lesson-1',
    status: 'published',
  });
  assert.equal(published.status, 'published');
  assert.equal(published.published_version, 1);
  assert.equal(published.provenance.source_ids.includes('german-b2-exam:upload:konjunktiv-notes'), true);

  const second = appendLesson(model, {
    trackId: 'german-b2-exam',
    lesson: {
      id: 'lesson-2',
      title: 'Schreiben Redemittel upload',
      source_type: 'pdf',
      source_ids: ['german-b2-exam:upload:schreiben-redemittel'],
      status: 'review',
      review_packet: {
        schema_version: 'german-b2-note-review/v1',
        content_version: 1,
        review_status: 'review',
        content: [{ kind: 'writing', text: 'Sehr geehrte Damen und Herren ...' }],
      },
    },
  });
  assert.equal(second.status, 'review');
  assert.equal(second.sequence, 3);

  const german = getTrack(model, 'german-b2-exam');
  assert.deepEqual(german.lessons.map((lesson) => lesson.id), ['german-b2-exam:lesson:embedded-lesson-1', 'lesson-1', 'lesson-2']);
  assert.deepEqual(german.outline.modules.map((module) => module.module_id), ['german-b2-exam:lesson:embedded-lesson-1', 'lesson-1', 'lesson-2']);
  assert.throws(
    () => appendLesson(model, { trackId: 'german-b2-exam', lesson: { id: 'direct-publish', title: 'Direct publish', source_type: 'txt', status: 'published' } }),
    /cannot be appended as published/
  );
  assert.throws(
    () => appendLesson(model, { trackId: 'german-b2-exam', lesson: { id: 'zip-notes', title: 'Zip notes', source_type: 'zip' } }),
    /unsupported source_type zip/
  );
  assert.throws(
    () => appendLesson(model, { trackId: 'clf-c02', lesson: { id: 'aws-lesson', title: 'AWS lesson', source_type: 'txt' } }),
    /does not accept personalized user-note lessons/
  );
});

test('German B2 track payload exposes gradually appended lesson content for stable tabs', () => {
  const model = loadLearningModel();
  appendLesson(model, {
    trackId: 'german-b2-exam',
    lesson: {
      id: 'lesson-1',
      title: 'Konjunktiv II from uploaded notes',
      source_type: 'markdown',
      source_ids: ['german-b2-exam:upload:konjunktiv-notes'],
      status: 'review',
      review_packet: {
        schema_version: 'german-b2-note-review/v1',
        content_version: 1,
        review_status: 'review',
        content: [
          { id: 'v1', kind: 'vocab', term: 'sich bewerben', hungarian: 'jelentkezni', text: 'sich bewerben | jelentkezni' },
          { id: 'g1', kind: 'grammar', text: 'Bilden Sie zehn Sätze mit Konjunktiv II.' },
          { id: 'r1', kind: 'reading', text: 'Newsletter: Warum Ehrenamt wichtig ist?' },
          { id: 'w1', kind: 'writing', text: 'Long essay: Erörtern Sie Vor- und Nachteile.' },
        ],
      },
    },
  });
  reviewLessonContent(model, { trackId: 'german-b2-exam', lessonId: 'lesson-1', reviewer: 'teacher', decision: 'approved' });
  transitionLesson(model, { trackId: 'german-b2-exam', lessonId: 'lesson-1', status: 'published' });

  const payload = trackPayload(model, 'german-b2-exam');

  assert.deepEqual(payload.lessonTabs, ['vocab', 'grammar', 'reading', 'writing']);
  assert.deepEqual(Object.keys(payload.lessons.find((lesson) => lesson.id === 'lesson-1').tabs), ['vocab', 'grammar', 'reading', 'writing']);
  const appendedLesson = payload.lessons.find((lesson) => lesson.id === 'lesson-1');
  assert.ok(appendedLesson, 'payload should include the appended lesson');
  assert.equal(appendedLesson.tabs.vocab[0].term, 'sich bewerben');
  assert.equal(appendedLesson.tabs.grammar[0].text, 'Bilden Sie zehn Sätze mit Konjunktiv II.');
  assert.equal(payload.learningPath.length, 2, 'lesson payload should include embedded lesson 1 plus the appended lesson without inventing lesson 2');
});

test('German B2 track payload exposes embedded lesson 1 as source-backed expanded learning content', () => {
  const payload = trackPayload(loadLearningModel(), 'german-b2-exam');

  assert.deepEqual(payload.lessonTabs, ['vocab', 'grammar', 'reading', 'writing']);
  assert.equal(payload.lessons.length, 1, 'embedded notes should produce exactly lesson 1 without fake future lessons');
  assert.deepEqual(payload.learningPath.map((module) => module.module_id), ['german-b2-exam:lesson:embedded-lesson-1']);
  const [lesson] = payload.lessons;
  assert.equal(lesson.track_id, 'german-b2-exam');
  assert.equal(lesson.sequence, 1);
  assert.equal(lesson.provenance.track_id, 'german-b2-exam');
  assert.equal(lesson.provenance.source_ids.every((sourceId) => sourceId.startsWith('german-b2-exam:embedded:lesson-1')), true);
  assert.equal(lesson.tabs.vocab.length >= 12, true, 'lesson 1 vocabulary should be expanded from embedded notes');
  assert.ok(lesson.tabs.vocab.find((item) => item.term === 'die Erfahrung' && item.hungarian === 'tapasztalat'));
  assert.ok(lesson.tabs.vocab.find((item) => item.term === 'lernen' && item.verb_forms?.perfect === 'ich habe gelernt'));
  assert.equal(lesson.tabs.vocab.some((item) => /Stelle|Bewerbungsgespräch/.test(item.term)), false, 'must not invent vocab outside lesson 1 sources');
  const prompt = lesson.tabs.writing.find((item) => item.kind === 'writing' && item.prompt_type === 'short_essay');
  assert.ok(prompt, 'short essay prompt should be explicit');
  assert.equal(prompt.retrieval.track_id, 'german-b2-exam');
  assert.equal(prompt.retrieval.depends_on_vocab.every((term) => ['gemeinsam', 'regelmäßig', 'erfolgreich', 'üben', 'lernen'].includes(term)), true);
  const reading = lesson.tabs.reading.find((item) => item.exercise_type === 'source_backed_reading');
  assert.ok(reading);
  assert.match(reading.text, /^Gemeinsam lernt man oft besser/);
  assert.deepEqual(reading.questions, [
    'Wohin ist die Person gefahren?',
    'Warum ist die Erfahrung wichtig?',
    'Womit kann man viele Orte besuchen?',
    'Was braucht man, um erfolgreich zu sein?',
  ]);
  assert.equal(reading.retrieval.article_source_status, 'no_researched_article_source_available');
  assert.equal(lesson.retrieval.selection_flow, 'embedded_lesson_1_notes -> lesson_1_payload_tabs -> UI sections');
  assert.equal(payload.sourceReport.sources.length, 2, 'sources page should expose embedded lesson provenance instead of only video metadata');
  assert.deepEqual(payload.sourceReport.freshness, { embedded_source: 2 });
  assert.equal(payload.sourceReport.sources.every((source) => source.track_id === 'german-b2-exam'), true);
  assert.equal(payload.sourceReport.sources.some((source) => source.title === 'German B2 lesson 1 corpus' && source.source_file === 'data/sources/german-b2/lesson-1-corpus.md'), true);

  const sourceLookup = sourcesPayload(loadLearningModel(), 'german-b2-exam');
  assert.equal(sourceLookup.count, 2, 'track-scoped source endpoint should return German B2 embedded lesson sources');
  assert.equal(sourceLookup.sources.every((source) => source.id.startsWith('german-b2-exam:embedded:lesson-1')), true);
});

test('editing German B2 lesson content creates a new mutable version that requires re-review', () => {
  const model = loadLearningModel();
  const created = appendLesson(model, {
    trackId: 'german-b2-exam',
    lesson: {
      id: 'lesson-editable',
      title: 'Editable Wortschatz notes',
      source_type: 'markdown',
      source_ids: ['german-b2-exam:upload:editable-notes'],
      status: 'review',
      review_packet: {
        schema_version: 'german-b2-note-review/v1',
        content_version: 1,
        review_status: 'approved',
        content: [{ id: 'vocab-1', kind: 'vocab', term: 'sich bewerben', hungarian: 'jelentkezni', source_id: 'german-b2-exam:upload:editable-notes' }],
      },
    },
  });
  transitionLesson(model, { trackId: 'german-b2-exam', lessonId: created.id, status: 'published' });

  const edited = editLessonContent(model, {
    trackId: 'german-b2-exam',
    lessonId: created.id,
    editor: 'teacher',
    review_packet: {
      schema_version: 'german-b2-note-review/v1',
      content: [{ id: 'vocab-1', kind: 'vocab', term: 'sich bewerben', hungarian: 'pályázni', source_id: 'german-b2-exam:upload:editable-notes' }],
      validation: { issues: [] },
    },
  });

  assert.equal(edited.status, 'review');
  assert.equal(edited.content_version, 2);
  assert.equal(edited.review_packet.content_version, 2);
  assert.equal(edited.review_packet.review_status, 'review');
  assert.equal(edited.published_version, 1);
  assert.equal(edited.review_history.length, 2);
  assert.equal(edited.review_history[1].from_version, 1);
  assert.equal(edited.review_history[1].to_version, 2);
  assert.equal(edited.review_history[1].editor, 'teacher');
  assert.equal(edited.review_history[1].action, 'edited');
  assert.equal(edited.provenance.source_ids.includes('german-b2-exam:upload:editable-notes'), true);
  assert.equal(getTrack(model, 'german-b2-exam').outline.modules.find((module) => module.module_id === created.id).status, 'review');
  assert.throws(
    () => transitionLesson(model, { trackId: 'german-b2-exam', lessonId: created.id, status: 'published' }),
    /must be approved before publish/
  );

  reviewLessonContent(model, { trackId: 'german-b2-exam', lessonId: created.id, reviewer: 'teacher', decision: 'approved' });
  const republished = transitionLesson(model, { trackId: 'german-b2-exam', lessonId: created.id, status: 'published' });
  assert.equal(republished.published_version, 2);
  assert.equal(republished.review_history.some((event) => event.action === 'published' && event.content_version === 2), true);
  assert.throws(
    () => editLessonContent(model, { trackId: 'clf-c02', lessonId: created.id, review_packet: {} }),
    /does not accept personalized user-note lessons/
  );
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

  for (const track of Object.values(model.tracks).filter((candidate) => candidate.questions.length > 0)) {
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
