import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server/index.js';

async function withServer(fn) {
  const server = createServer({ log: false });
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

test('API exposes landing and track scoped payloads without mixed content', async () => {
  await withServer(async (base) => {
    const landing = await (await fetch(`${base}/api/landing`)).json();
    assert.equal(landing.tracks.length, 2);
    assert.equal(landing.tracks.every((track) => ['clf-c02', 'aif-c01'].includes(track.track_id)), true);

    const clf = await (await fetch(`${base}/api/tracks/clf-c02`)).json();
    assert.equal(clf.track.id, 'clf-c02');
    assert.equal(clf.cards.every((card) => card.track_id === 'clf-c02'), true);
    assert.equal(clf.questions.every((question) => question.track_id === 'clf-c02'), true);
    assert.ok(clf.consoleGuides[0].cost_warning);
    assert.ok(clf.sourceReport.stale_warning !== undefined);

    const cross = await fetch(`${base}/api/tracks/clf-c02/cards/aif-c01-domain-1-task-1.1-concept-check`);
    assert.equal(cross.status, 404);
  });
});

test('API creates quizzes and evaluates answers with review explanations', async () => {
  await withServer(async (base) => {
    const quizRes = await fetch(`${base}/api/tracks/clf-c02/quizzes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'quick' }),
    });
    assert.equal(quizRes.status, 200);
    const quiz = await quizRes.json();
    assert.equal(quiz.question_count, 10);
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
