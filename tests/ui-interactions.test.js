import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const mainSource = fs.readFileSync(path.resolve('src/main.jsx'), 'utf8');

test('learn card Know and Review controls are wired to card mark API with visible state', () => {
  assert.match(mainSource, /async function markCard\(/, 'TrackShell should define a markCard helper');
  assert.match(mainSource, /\/api\/tracks\/\$\{trackId\}\/cards\/mark/, 'markCard should call the track-scoped cards/mark API');
  assert.match(mainSource, /onClick=\{\(\) => markCard\(card, 'know'\)\}/, 'I know this button should call markCard with know status');
  assert.match(mainSource, /onClick=\{\(\) => markCard\(card, 'review'\)\}/, 'Review again button should call markCard with review status');
  assert.match(mainSource, />I know this<|: 'I know this'/, 'Learn card button should use the clear I know this label');
  assert.match(mainSource, />Review again<|: 'Review again'/, 'Learn card button should use the clear Review again label');
  assert.match(mainSource, /Card status:/, 'Learn cards should show the current card status after marking');
  assert.match(mainSource, /Next review:/, 'Learn cards should show the next review date returned by the API');
});

test('console navigation uses the AWS Console Practice user-facing label', () => {
  assert.match(mainSource, /AWS Console Practice/, 'Visible console tab label should read AWS Console Practice');
});

test('overview quick-start visibly transitions to the quiz flow instead of storing hidden state', () => {
  assert.match(mainSource, /window\.history\.pushState\(null, '', `\/tracks\/\$\{trackId\}\/quiz`\)/, 'overview quick start should move the URL to the quiz tab');
  assert.match(mainSource, /setActiveSection\('quiz'\)/, 'overview quick start should render the quiz section after a successful quiz start');
});

test('quiz and card interactions expose loading and user-facing error states', () => {
  for (const stateName of ['quizLoading', 'quizError', 'answerLoading', 'answerError', 'cardAction']) {
    assert.match(mainSource, new RegExp(stateName), `expected ${stateName} interaction state`);
  }
  assert.match(mainSource, /if \(!res\.ok\) throw new Error/, 'fetch handlers should reject non-2xx responses before parsing JSON');
  assert.match(mainSource, /role="alert"/, 'interaction failures should be rendered as visible alerts');
  assert.match(mainSource, /disabled=\{quizLoading/, 'quiz start buttons should be disabled while a quiz request is in flight');
  assert.match(mainSource, /disabled=\{answerLoading/, 'quiz answer option buttons should be disabled while an answer request is in flight');
});

test('quiz review flow exposes next-question and final-results controls with score and progress impact', () => {
  assert.match(mainSource, /quizIndex|currentQuestionIndex/, 'Quiz should track the current question instead of always rendering the first one');
  assert.match(mainSource, /setQuizIndex\(0\)|setCurrentQuestionIndex\(0\)/, 'Starting a quiz should reset the current question index');
  assert.match(mainSource, /Next question/, 'Answered non-final questions should show a clear Next question button');
  assert.match(mainSource, /Finish quiz/, 'Answered final questions should show a clear Finish quiz button');
  assert.match(mainSource, /Quiz results/, 'Finishing should reveal a quiz results summary');
  assert.match(mainSource, /Score:/, 'Results should include a score summary');
  assert.match(mainSource, /Readiness impact:/, 'Results should include readiness/progress impact');
  assert.match(mainSource, /Restart quick 10|Retry quiz/, 'Results should include a restart or retry affordance');
});
