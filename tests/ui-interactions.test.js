import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const mainSource = fs.readFileSync(path.resolve('src/main.jsx'), 'utf8');
const appNavigationSource = fs.readFileSync(path.resolve('src/components/AppNavigation.jsx'), 'utf8');
const navItemsSource = fs.readFileSync(path.resolve('src/components/navigation/navItems.js'), 'utf8');
const stylesSource = fs.readFileSync(path.resolve('src/styles.css'), 'utf8');

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

test('German B2 lessons render source-backed stable lesson tabs without AWS track coupling', () => {
  assert.match(mainSource, /const GERMAN_B2_LESSON_TABS = \['vocab', 'grammar', 'reading', 'writing'\]/, 'German B2 should use exactly the stable lesson tabs');
  assert.match(mainSource, /function GermanB2Lessons\(\{ data \}\)/, 'German B2 should have an isolated lesson renderer');
  assert.match(mainSource, /activeLessonTab|setActiveLessonTab/, 'German B2 lesson tabs should use explicit tab state');
  assert.match(mainSource, /useMemo\(\(\) => normalizeGermanB2Lessons\(data\), \[data\]\)/, 'German B2 UI should normalize API lesson state before rendering');
  assert.match(mainSource, /function normalizeGermanB2Lessons\(data\)/, 'German B2 should sort and normalize DB-backed lessons in the UI');
  assert.match(mainSource, /Array\.isArray\(lesson\?\.review_packet\?\.content\)|Array\.isArray\(lesson\.review_packet\?\.content\)/, 'German B2 should derive tab items from review-packet content when DB payloads omit pre-grouped tabs');
  assert.match(mainSource, /published .*updated |sources: \$\{activeLessonSourceIds\.length\}|formatLessonDate/, 'German B2 should render metadata without showing raw undefined fields');
  assert.match(mainSource, /flip-card|setFlippedCards/, 'Vocab tab should support flip-card behavior');
  assert.match(mainSource, /Short answer|Short essay|Long essay/, 'Writing tab should expose the required writing variants');
  assert.doesNotMatch(mainSource, /lesson-2[^\n]*(placeholder|fake|future)/i, 'UI must not invent fake future lessons');
  assert.match(mainSource, /Source provenance|renderGermanB2SourceProvenance/, 'German B2 lesson sections should render source provenance for cited content');
  assert.match(mainSource, /function renderGermanB2GroupedSourceProvenance\(items\)/, 'German B2 should support grouped provenance blocks for dense lesson tabs');
  const vocabSection = mainSource.match(/activeLessonTab === 'vocab'[\s\S]*?renderGermanB2GroupedSourceProvenance\(tabItems\)[\s\S]*?<\/>\}/)?.[0] || '';
  const grammarSection = mainSource.match(/activeLessonTab === 'grammar'[\s\S]*?renderGermanB2GroupedSourceProvenance\(tabItems\)[\s\S]*?<\/div>\}/)?.[0] || '';
  assert.match(vocabSection, /renderGermanB2GroupedSourceProvenance\(tabItems\)/, 'Vocab tab should render one grouped provenance block beneath the words');
  assert.match(grammarSection, /renderGermanB2GroupedSourceProvenance\(tabItems\)/, 'Grammar tab should render one grouped provenance block beneath the exercises');
  assert.doesNotMatch(vocabSection, /renderGermanB2SourceProvenance\(item\)/, 'Vocab cards should not repeat provenance after every word');
  assert.doesNotMatch(grammarSection, /renderGermanB2SourceProvenance\(item\)/, 'Grammar exercises should not repeat provenance after every exercise');
  assert.match(mainSource, /Retrieval flow|renderGermanB2Retrieval/, 'German B2 lesson UI should surface retrieval-backed selection status');
  assert.match(mainSource, /no_researched_article_source_available|source-backed reading exercise/, 'German B2 reading UI should avoid fabricated researched-article labels when no article source exists');
  assert.match(mainSource, /source_file \|\| s\.citation_text \|\| s\.id/, 'Sources page should render internal lesson source provenance when there is no external URL');
  assert.match(mainSource, /embedded lesson provenance/, 'Sources page should label embedded lesson provenance instead of relying only on public verification dates');
  assert.match(stylesSource, /\.lesson-provenance/, 'German B2 provenance UI should have isolated styles');
  assert.match(stylesSource, /\.lesson-retrieval/, 'German B2 retrieval UI should have isolated styles');
});

test('German B2 navigation hides AWS-specific and empty-content sections', () => {
  assert.match(navItemsSource, /TRACK_SECTION_OVERRIDES\s*=\s*\{[\s\S]*'german-b2-exam': \['overview', 'learn', 'progress', 'sources'\]/, 'German B2 should expose only the sections that currently have content');
  assert.match(mainSource, /const availableSections = useMemo\(\(\) => getTrackSections\(trackId\), \[trackId\]\)/, 'TrackShell should derive visible tabs from track-aware section rules');
  assert.match(mainSource, /availableSections\.map\(\(tab\) => <a[\s\S]*TAB_LABELS\[tab\.id\]/, 'Track tabs should render only the allowed section links');
  assert.match(appNavigationSource, /const currentPracticeSections = useMemo\(\(\) => getPracticeSections\(defaultPracticeTrack\), \[defaultPracticeTrack\]\)/, 'Primary navigation should derive practice links from the current track');
  assert.match(appNavigationSource, /const currentStatusSections = useMemo\(\(\) => getStatusSections\(defaultPracticeTrack\), \[defaultPracticeTrack\]\)/, 'Primary navigation should derive status links from the current track');
  assert.match(appNavigationSource, /const currentTrackSections = useMemo\(\(\) => trackId \? getTrackSections\(trackId\) : \[\], \[trackId\]\)/, 'Mobile current-track quick links should also respect track-specific section rules');
});

test('AWS Cloud Practitioner learn page restores the scoped wavy background without enabling it on every track route', () => {
  assert.match(mainSource, /function shouldShowLearningAurora\(pathname\)/, 'App should centralize the route gate for the learning-page background');
  assert.match(mainSource, /const normalizedPath = pathname\.length > 1 \? pathname\.replace\(/, 'Learning background gate should normalize trailing slashes');
  assert.match(mainSource, /normalizedPath === '\/tracks\/clf-c02\/learn'/, 'CLF-C02 Learn should opt into the scoped wavy background');
  assert.match(mainSource, /if \(hasLearningAurora\) return <WavyBackground className="wavy-background--learning-page">\{content\}<\/WavyBackground>;/, 'CLF-C02 Learn should render the dedicated WavyBackground wrapper');
  assert.match(mainSource, /if \(isTrackRoute\) return content;/, 'Other track pages should still bypass global background wrappers to avoid adjacent layout changes');
  assert.match(stylesSource, /\.wavy-background--learning-page \.track-header,/, 'Learning page should apply route-scoped surface styling over the wavy background');
  assert.match(stylesSource, /\.wavy-background__line/, 'The scoped learning background should render visible wavy line layers');
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

test('upload ingestion exposes progress and a visible embedding outcome summary', () => {
  assert.match(mainSource, /uploadPipeline|setUploadPipeline/, 'Uploads UI should track explicit pipeline progress state');
  assert.match(mainSource, /<progress className="upload-pipeline__progress" max="100" value=\{uploadPipeline\.progress\}/, 'Uploads UI should render a visible progress bar while verification or ingest runs');
  assert.match(mainSource, /Generating live embeddings|Writing sources and chunks/, 'Uploads UI should explain the current ingest phase');
  assert.match(mainSource, /written_embedding_count|unchanged_count/, 'Uploads UI should surface whether embeddings were written or already current');
  assert.match(stylesSource, /\.upload-pipeline__progress/, 'Uploads UI should style the progress bar');
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
  assert.match(mainSource, /Why the correct answer works:/, 'Review should explain why the right answer is correct');
  assert.match(mainSource, /Why your choice landed where it did:/, 'Review should explain the selected answer outcome');
  assert.match(mainSource, /option_reviews\.map/, 'Review should render per-option explanations for distractors and the correct answer');
  assert.match(mainSource, /Common trap:/, 'Review should surface a visible misconception/trap note');
  assert.match(mainSource, /Decision rule:/, 'Review should surface a visible decision rule');
});
