import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server/index.js';

async function withServer(fn, options = {}) {
  const server = createServer({ log: false, ...options });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('health endpoint reports ok and source freshness', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.tracks['clf-c02'].last_verified_date);
    assert.ok(body.tracks['aif-c01'].last_verified_date);
  });
});

test('API exposes track-scoped source records and filtering without cross-track leakage', async () => {
  await withServer(async (base) => {
    const all = await (await fetch(`${base}/api/tracks/clf-c02/sources`)).json();
    assert.equal(all.track_id, 'clf-c02');
    assert.equal(all.count >= 15, true);
    assert.equal(all.sources.every((source) => source.track_id === 'clf-c02'), true);

    const filtered = await (await fetch(`${base}/api/tracks/clf-c02/sources?service=Amazon%20S3`)).json();
    assert.equal(filtered.sources.length >= 1, true);
    assert.equal(filtered.sources.every((source) => source.aws_service.includes('Amazon S3')), true);

    const aif = await (await fetch(`${base}/api/tracks/aif-c01/sources`)).json();
    assert.equal(aif.sources.some((source) => source.id.startsWith('clf-')), false);
  });
});

test('API exposes landing and track scoped payloads without mixed content', async () => {
  await withServer(async (base) => {
    const landing = await (await fetch(`${base}/api/landing`)).json();
    assert.equal(landing.tracks.length, 3);
    assert.equal(landing.tracks.every((track) => ['clf-c02', 'aif-c01', 'german-b2-exam'].includes(track.track_id)), true);
    assert.ok(landing.tracks.find((track) => track.track_id === 'german-b2-exam'));

    const clf = await (await fetch(`${base}/api/tracks/clf-c02`)).json();
    assert.equal(clf.track.id, 'clf-c02');
    assert.equal(clf.cards.every((card) => card.track_id === 'clf-c02'), true);
    assert.equal(clf.questions.every((question) => question.track_id === 'clf-c02'), true);
    assert.equal(clf.conceptRecords.length >= 10, true);
    assert.equal(clf.serviceResources.length >= 50, true);
    assert.ok(clf.consoleGuides[0].cost_warning);
    assert.ok(clf.sourceReport.stale_warning !== undefined);

    const cross = await fetch(`${base}/api/tracks/clf-c02/cards/aif-c01-domain-1-task-1.1-concept-check`);
    assert.equal(cross.status, 404);

    const german = await (await fetch(`${base}/api/tracks/german-b2-exam`)).json();
    assert.equal(german.track.id, 'german-b2-exam');
    assert.equal(german.track.purpose, 'personalized tutor from user notes');
    assert.equal(german.track.goal, 'Prep for the B2 German exam over ~1 year');
    assert.deepEqual(german.track.source_types, ['pdf', 'txt', 'markdown']);
    assert.deepEqual(german.track.lesson_lifecycle_states, ['draft', 'review', 'published']);
    assert.deepEqual(german.learningPath.map((module) => module.module_id), ['german-b2-exam:lesson:embedded-lesson-1']);
    assert.equal(german.lessons.length, 1, 'German B2 should expose only source-backed lesson 1 by default');
    assert.equal(german.lessons[0].tabs.vocab.some((item) => item.term === 'die Erfahrung'), true);
    assert.deepEqual(german.cards, []);
    assert.deepEqual(german.questions, []);
  });
});

test('API merges DB-backed German B2 uploaded note lessons into the track payload', async () => {
  await withServer(async (base) => {
    const german = await (await fetch(`${base}/api/tracks/german-b2-exam`)).json();
    assert.equal(german.lessons.length, 2);
    const lesson = german.lessons.find((candidate) => candidate.id === 'german-b2-exam:lesson:batch-123');
    assert.ok(lesson, 'DB-backed lesson should be merged alongside embedded lesson 1');
    assert.equal(german.lessons.some((candidate) => candidate.id === 'german-b2-exam:lesson:embedded-lesson-1'), true);
    assert.equal(lesson.title, 'Uploaded notes: lektion_1.md');
    assert.equal(lesson.status, 'review');
    assert.equal(lesson.review_status, 'review');
    assert.equal(lesson.content_version, 1);
    assert.deepEqual(Object.keys(lesson.tabs), ['vocab', 'grammar', 'reading', 'writing']);
    assert.equal(lesson.tabs.vocab[0].term, 'sich bewerben');
    assert.equal(lesson.tabs.vocab[0].hungarian, 'jelentkezni');
    assert.equal(lesson.tabs.grammar[0].text.includes('Konjunktiv II'), true);
    assert.equal(lesson.tabs.reading[0].text.includes('Voraussetzungen'), true);
    assert.equal(lesson.tabs.writing[0].text.includes('Sehr geehrte Damen und Herren'), true);
    assert.equal(lesson.source_ids.length > 0, true);
    assert.equal(lesson.provenance.chunk_ids.length > 0, true);
    assert.equal(german.learningPath.length, 2);
    assert.equal(german.learningPath.some((module) => module.module_id === lesson.id), true);
  }, {
    germanB2LessonStore: {
      async loadLessons(trackId) {
        assert.equal(trackId, 'german-b2-exam');
        return [{
          id: 'german-b2-exam:lesson:batch-123',
          track_id: 'german-b2-exam',
          title: 'Uploaded notes: lektion_1.md',
          source_type: 'markdown',
          source_ids: ['german-b2-exam:upload:batch-123:lektion_1.md'],
          status: 'review',
          content_version: 1,
          created_at: '2026-06-19T12:00:00.000Z',
          updated_at: '2026-06-19T12:05:00.000Z',
          review_packet: {
            schema_version: 'german-b2-note-review/v1',
            content_version: 1,
            review_status: 'review',
            chunk_ids: ['chunk-1'],
            validation: { issues: [] },
            content: [
              { id: 'v1', kind: 'vocab', term: 'sich bewerben', hungarian: 'jelentkezni', source_id: 'german-b2-exam:upload:batch-123:lektion_1.md' },
              { id: 'g1', kind: 'grammar', text: 'Konjunktiv II: Ich würde mich bewerben.', source_id: 'german-b2-exam:upload:batch-123:lektion_1.md' },
              { id: 'r1', kind: 'reading', text: 'Die Bewerberin erfüllt alle Voraussetzungen.', source_id: 'german-b2-exam:upload:batch-123:lektion_1.md' },
              { id: 'w1', kind: 'writing', text: 'Sehr geehrte Damen und Herren, ich interessiere mich für ...', source_id: 'german-b2-exam:upload:batch-123:lektion_1.md' },
            ],
          },
        }];
      },
    },
  });
});

test('API creates quizzes and evaluates answers with detailed review explanations', async () => {
  await withServer(async (base) => {
    const quizRes = await fetch(`${base}/api/tracks/clf-c02/quizzes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'quick' }),
    });
    assert.equal(quizRes.status, 200);
    const quiz = await quizRes.json();
    assert.equal(quiz.question_count, 10);
    assert.equal(new Set(quiz.questions.map((question) => question.question_type)).size >= 3, true);
    const first = quiz.questions[0];

    const evalRes = await fetch(`${base}/api/tracks/clf-c02/answers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionId: first.id, selectedOptionId: first.options[0].id }),
    });
    assert.equal(evalRes.status, 200);
    const review = await evalRes.json();
    assert.equal(review.mapping.track_id, 'clf-c02');
    assert.ok(review.selected_explanation);
    assert.ok(review.distractor_explanations.length >= 3);
    assert.equal(review.option_reviews.length, 4);
    assert.ok(review.review_summary.exam_angle);
  });
});

test('API exposes CLF-C02 service/resource explanations without leaking them into AIF-C01', async () => {
  await withServer(async (base) => {
    const clfRes = await fetch(`${base}/api/tracks/clf-c02/resources`);
    assert.equal(clfRes.status, 200);
    const clf = await clfRes.json();
    assert.equal(clf.track_id, 'clf-c02');
    assert.equal(clf.resources.length >= 50, true);
    assert.ok(clf.resources.find((resource) => /S3/.test(resource.name)));
    assert.equal(clf.resources.every((resource) => resource.track_id === 'clf-c02'), true);

    const aifRes = await fetch(`${base}/api/tracks/aif-c01/resources`);
    assert.equal(aifRes.status, 200);
    const aif = await aifRes.json();
    assert.equal(aif.track_id, 'aif-c01');
    assert.equal(aif.resources.length, 0);
  });
});
