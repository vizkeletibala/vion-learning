# Vion Learning UX/UI Design Spec

Goal: design a practical daily-use interface for an internal AWS certification trainer with strict certification separation after track selection.

Non-negotiable invariant: CLF-C02 and AIF-C01 may appear together only on the landing page. After a user selects a track, every route, dashboard, card, quiz, study plan, progress view, console guide, source report, and stored progress record must be track-scoped and must not render mixed certification content.

Recommended route model:
- `/` — combined landing only.
- `/tracks/clf-c02/*` — AWS Certified Cloud Practitioner track only.
- `/tracks/aif-c01/*` — AWS Certified AI Practitioner track only.
- Never use generic routes like `/quiz`, `/cards`, `/progress`, or `/study-plan` unless they immediately redirect to a selected track route.

Recommended data model rule: every exam fact, card, quiz question, study task, console guide, progress row, readiness metric, source, and verification status must include `track_id` with one of `clf-c02` or `aif-c01`. UI components should require `track_id` as a prop except the landing page track cards.

---

## 1. Information architecture

### Landing: `/`

Purpose: choose a certification track and resume daily work.

Layout:
- Header: Vion Learning, environment label such as `Internal`, source freshness summary, last sync/verification date.
- Two large track choice panels:
  - CLF-C02: AWS Certified Cloud Practitioner
  - AIF-C01: AWS Certified AI Practitioner
- Each panel shows only that track's:
  - readiness score
  - next recommended task
  - streak
  - current milestone
  - weak domains count
  - last verification date
  - primary button: `Continue CLF-C02` or `Continue AIF-C01`
  - secondary button: `View source report`
- Global footer: `Local/private trainer`, app version, data export/reset links if implemented.

Do:
- Visually distinguish tracks with a restrained accent color and icon.
- Use identical panel structure so neither track feels secondary.
- Show explicit last verified date per track.

Do not:
- Show mixed quiz questions, cross-track cards, or combined progress here.
- Show a global readiness average.

### Track shell: `/tracks/:trackId/*`

Purpose: provide a persistent track-specific environment.

Persistent elements:
- Track header with certification name, code, readiness score, last verified date.
- Track-scoped navigation:
  - Overview
  - Learn
  - Quiz
  - Study Plan
  - Console Guides
  - Progress
  - Sources
- Breadcrumb always starts with selected track, e.g. `CLF-C02 / Quiz / Domain Quiz`.
- Track switcher may exist but must be an explicit action that navigates back to `/` or confirms switching to the other track. It must not blend content.

Visual separation:
- CLF-C02 accent suggestion: blue/slate.
- AIF-C01 accent suggestion: purple/indigo.
- Use the track code in the header and critical cards.
- Empty/error states must include the current track code.

---

## 2. Page designs

## 2.1 Per-track overview

Route: `/tracks/:trackId/overview`

Primary user question: “What should I do next for this certification?”

Sections:
1. Daily action strip
   - Next task: e.g. review due cards, take weakness drill, finish guide cleanup check.
   - Estimated time.
   - Continue button.
2. Readiness summary
   - Overall readiness score.
   - Confidence label: Needs work / Building / Nearly ready / Exam ready.
   - Delta since last week.
   - Last full simulation date.
3. Exam facts
   - Exam code, duration, question count if known, passing score if known, delivery mode, source link.
   - Mark stale fields clearly if source verification is old.
4. Domain weights
   - Domain list with percentage, progress, accuracy, due card count.
   - Each domain links to a domain drill and domain card list.
5. Services and topics
   - Compact tag grid grouped by domain.
   - Each service/topic links to cards, source references, and quiz history.
6. Modes
   - Practice mode: short quizzes and learning cards.
   - Exam mode: full timed simulation.
   - Console mode: guided AWS Console tasks with warnings and cleanup.
7. Weak areas
   - Top 3–5 domains/topics ranked by low accuracy, low confidence, or stale review.
8. Milestones
   - 7/14/30 day plan progress.
   - Checkpoints completed.
   - Readiness checklist status.

Coder notes:
- Render this page from a `TrackOverviewView(trackId)` container.
- Fetch all widgets through track-scoped queries.
- If data is missing, show a track-specific empty state, not fallback content from the other certification.

## 2.2 Learning card UI

Route examples:
- `/tracks/:trackId/learn`
- `/tracks/:trackId/learn/cards/:cardId`

Primary user question: “What should I remember, and when should I see it again?”

Card anatomy:
- Header: track code, domain, topic/service, source freshness badge.
- Front:
  - concise prompt/question
  - optional scenario/context
  - tags: domain, topic, service, exam objective
- Reveal action: `Show answer`.
- Back:
  - answer/explanation
  - why it matters for the exam
  - links to source snippets
  - related quiz questions
- Spaced repetition controls:
  - Again
  - Hard
  - Good
  - Easy
  - Skip for now
- Secondary controls:
  - Flag confusing
  - Mark source stale/suspect
  - Add note
  - Open domain review

Queue states:
- Due now
- New cards
- Weakness review
- Bookmarked
- Stale-source cards

Design details:
- Keyboard shortcuts: 1 Again, 2 Hard, 3 Good, 4 Easy, Space reveal.
- Always show remaining cards and estimated time.
- Do not show cards from another track in related cards.

## 2.3 Quiz UI

Routes:
- `/tracks/:trackId/quiz`
- `/tracks/:trackId/quiz/quick`
- `/tracks/:trackId/quiz/domain/:domainId`
- `/tracks/:trackId/quiz/full-simulation`
- `/tracks/:trackId/quiz/weakness-drill`
- `/tracks/:trackId/quiz/mixed-review`
- `/tracks/:trackId/quiz/attempts/:attemptId/review`

Quiz mode chooser:
- Quick quiz: 5–10 questions, low friction daily practice.
- Domain quiz: one domain, configurable question count.
- Full timed simulation: exam-length, timer, review only after submission.
- Weakness drill: generated from low accuracy and low confidence areas.
- Mixed review: due cards + previously missed questions + stale topics.

Question screen:
- Header: track code, mode, progress count, timer when relevant.
- Body: scenario/question stem.
- Answer options: clear radio cards or multi-select when applicable.
- Controls: previous, next, flag, submit.
- Context drawer: hidden by default; may show domain/topic only if it does not give away the answer.

Full simulation constraints:
- Timer visible but not visually loud.
- Confirmation before final submit.
- No immediate correctness feedback.
- Review available after submit.

Quick/domain/weakness drill constraints:
- Optional immediate feedback setting.
- Encourage explanation review after each wrong answer.

## 2.4 Quiz review explanations

Route: `/tracks/:trackId/quiz/attempts/:attemptId/review`

Review summary:
- score and pass/readiness estimate
- domain breakdown
- time spent
- flagged questions
- weak topics generated from the attempt
- next recommended actions

Per-question review card:
- question stem
- user's answer
- correct answer
- result badge
- correct answer explanation
- why the selected wrong answer is wrong
- distractor explanations for every option
- domain/topic/card mapping
- source references with retrieved/verified date
- actions:
  - create/review linked learning card
  - add to weakness drill
  - flag bad question
  - open source

Distractor explanation requirement:
- Do not only say “wrong”. Explain the misconception each distractor represents.
- If a distractor is plausible in another AWS context but wrong here, say why.

Mapping requirement:
- Each reviewed question must show:
  - `track_id`
  - domain
  - topic/service
  - source ids
  - linked card ids where available

## 2.5 Study plans

Routes:
- `/tracks/:trackId/study-plan`
- `/tracks/:trackId/study-plan/7-day`
- `/tracks/:trackId/study-plan/14-day`
- `/tracks/:trackId/study-plan/30-day`

Plan chooser:
- 7 day: intensive review / final prep.
- 14 day: balanced focused plan.
- 30 day: steady daily learning.

Daily plan page:
- Day number/date.
- Estimated time.
- Task checklist grouped by:
  - readings
  - videos, optional and clearly marked supplementary
  - learning cards
  - quick/domain quizzes
  - console tasks
  - checkpoint/reflection
- Daily target metrics:
  - due cards completed
  - quiz accuracy
  - weak topics reduced
  - source freshness checked if relevant

Checkpoints:
- Start checkpoint: baseline quiz and domain confidence.
- Midpoint checkpoint: domain performance and plan adjustment.
- Final checkpoint: full simulation, readiness checklist, cleanup reminders.

Readiness checklist:
- all high-weight domains above target accuracy
- no critical weak areas unreviewed
- recent full simulation complete
- console guide cleanup tasks understood
- source verification is current enough for exam facts
- user confidence captured per domain

UX rule:
- Plans are templates plus generated daily tasks. Changing plan length must preserve completed task history within the same track only.

## 2.6 AWS Console guides

Routes:
- `/tracks/:trackId/console-guides`
- `/tracks/:trackId/console-guides/:guideId`

Guide list:
- title
- domain/topic/service
- estimated time
- cost risk: Free tier likely / Low cost / Cost risk / Avoid without sandbox
- cleanup required badge
- last verified date
- completion status

Guide detail structure:
1. Purpose: what concept this demonstrates for the selected certification.
2. Prerequisites: account/sandbox assumptions, permissions, region.
3. Cost warning: estimated cost risk and stop conditions.
4. Step-by-step instructions.
5. Check your understanding prompts.
6. Cleanup section:
   - explicit resources to delete
   - verification that resources are gone
   - billing/cost explorer check if appropriate
7. Source references.
8. Completion controls:
   - mark complete
   - mark cleanup complete
   - flag unsafe/stale

Hard UX requirement:
- If `cleanup_required=true`, do not allow a guide to be marked fully complete until cleanup is acknowledged.

## 2.7 Source verification and staleness UI

Routes:
- `/tracks/:trackId/sources`
- `/tracks/:trackId/sources/report`

Track source report:
- overall status: Fresh / Needs review / Stale / Has conflicts.
- last verification date.
- next scheduled verification if implemented.
- source table:
  - title
  - URL
  - source type: AWS certification page, exam guide, AWS docs, Skill Builder, whitepaper, supplementary video/article
  - retrieved date
  - last verified date
  - status
  - linked domains/topics/cards/questions
- conflict/outdated warnings:
  - old fact
  - changed exam guide
  - unavailable page
  - supplementary source conflicts with official source

Staleness badges:
- `Verified` — checked recently.
- `Review soon` — approaching freshness threshold.
- `Stale` — beyond threshold.
- `Conflict` — disagrees with higher-priority source.

UI rule:
- Stale or conflict source badges must surface anywhere dependent content appears: overview facts, cards, quiz review, study tasks, console guides.

---

## 3. Component map

Track and shell:
- `AppLanding`
- `TrackChoiceCard`
- `TrackShell`
- `TrackHeader`
- `TrackNav`
- `TrackBreadcrumbs`
- `TrackScopedEmptyState`
- `TrackSwitchGuard`

Overview:
- `DailyActionStrip`
- `ReadinessScoreCard`
- `ExamFactsCard`
- `DomainWeightsPanel`
- `ServiceTopicGrid`
- `ModeLauncherGrid`
- `WeakAreasList`
- `MilestoneTimeline`
- `VerificationStatusBadge`

Learning cards:
- `LearningQueueTabs`
- `LearningCardViewer`
- `CardFront`
- `CardBack`
- `SpacedRepetitionControls`
- `CardSourceLinks`
- `CardFlagMenu`
- `KeyboardShortcutHints`

Quiz:
- `QuizModeChooser`
- `QuizSetupForm`
- `QuizAttemptShell`
- `QuestionStem`
- `AnswerOptionList`
- `QuizTimer`
- `QuestionNavigator`
- `FlagQuestionButton`
- `SubmitQuizDialog`

Quiz review:
- `QuizResultSummary`
- `DomainResultBreakdown`
- `QuestionReviewCard`
- `CorrectAnswerExplanation`
- `WrongAnswerExplanation`
- `DistractorExplanationList`
- `QuestionMappingPanel`
- `ReviewNextActions`

Study plans:
- `StudyPlanChooser`
- `StudyPlanTimeline`
- `DailyTaskChecklist`
- `ReadingTaskItem`
- `VideoTaskItem`
- `ConsoleTaskItem`
- `CheckpointCard`
- `ReadinessChecklist`
- `PlanAdjustmentPanel`

Console guides:
- `ConsoleGuideList`
- `ConsoleGuideCard`
- `CostWarningBanner`
- `GuideStepList`
- `CleanupChecklist`
- `GuideCompletionControls`
- `UnsafeOrStaleGuideFlag`

Sources:
- `SourceReportSummary`
- `SourceTable`
- `SourceStatusBadge`
- `SourceConflictPanel`
- `SourceDependencyList`
- `SourceRefreshAction`

Cross-cutting:
- `TrackBadge`
- `DomainBadge`
- `TopicTag`
- `ProgressBar`
- `LastVerifiedText`
- `ConfidenceSelector`
- `InlineSourceReference`
- `ErrorBoundaryWithTrackContext`

---

## 4. Suggested view/container boundaries

The coder should keep business/data logic in route containers and keep components presentational where possible.

Containers:
- `LandingPage()` fetches both track summaries only.
- `TrackOverviewPage({ trackId })`
- `LearnPage({ trackId })`
- `CardPage({ trackId, cardId })`
- `QuizHomePage({ trackId })`
- `QuizAttemptPage({ trackId, attemptId })`
- `QuizReviewPage({ trackId, attemptId })`
- `StudyPlanPage({ trackId })`
- `ConsoleGuidesPage({ trackId })`
- `ConsoleGuideDetailPage({ trackId, guideId })`
- `SourceReportPage({ trackId })`

Guard behavior:
- Every `:trackId` route validates track id.
- Every fetched object must match route `trackId`; mismatch is an error, not a silent filter.
- Attempt/card/guide IDs should be resolved through `(trackId, id)` pairs to prevent cross-track leakage.

---

## 5. Minimum data contracts for UI

```ts
type TrackId = 'clf-c02' | 'aif-c01';

type TrackSummary = {
  trackId: TrackId;
  code: string;
  name: string;
  readinessScore: number;
  nextTask: { label: string; href: string; estimatedMinutes?: number } | null;
  streakDays: number;
  milestoneLabel: string;
  weakAreaCount: number;
  lastVerifiedAt: string | null;
};

type SourceRef = {
  id: string;
  trackId: TrackId;
  title: string;
  url: string;
  sourceType: 'aws-certification-page' | 'exam-guide' | 'aws-docs' | 'skill-builder' | 'whitepaper' | 'supplementary-video' | 'supplementary-article';
  retrievedAt: string;
  lastVerifiedAt: string | null;
  status: 'verified' | 'review-soon' | 'stale' | 'conflict' | 'unavailable';
};

type LearningCard = {
  id: string;
  trackId: TrackId;
  domainId: string;
  topicIds: string[];
  prompt: string;
  answer: string;
  sourceRefs: SourceRef[];
  dueAt: string | null;
  confidence: 'again' | 'hard' | 'good' | 'easy' | null;
};

type QuizQuestion = {
  id: string;
  trackId: TrackId;
  domainId: string;
  topicIds: string[];
  stem: string;
  options: Array<{ id: string; text: string }>;
  correctOptionIds: string[];
  correctExplanation: string;
  distractorExplanations: Record<string, string>;
  sourceRefs: SourceRef[];
  linkedCardIds: string[];
};
```

---

## 6. Acceptance checks for coder/reviewer

- Landing page is the only page that renders both CLF-C02 and AIF-C01 together.
- All other routes include a track id in the URL and page header.
- Track-scoped navigation never points to generic mixed pages.
- Components that render learning/quiz/source/progress content require `trackId` or receive already validated track-specific objects.
- Fetch/query functions reject cross-track object mismatches.
- Quiz review includes correct answer, wrong answer explanation, distractor explanations, and domain/topic/card/source mapping.
- Study plans include 7, 14, and 30 day variants with daily tasks, checkpoints, and readiness checklist.
- Console guides include cost warnings and cleanup sections; cleanup-required guides require cleanup acknowledgement before completion.
- Source report shows retrieved date, last verified date, staleness/conflict status, and dependent content.
- Empty states, errors, and breadcrumbs always name the current track.

---

## 7. Practical visual direction

Tone: utility-first, calm, durable. This should feel like a serious internal learning tool, not a marketing site.

Layout:
- Dense but readable cards.
- Strong page titles and breadcrumbs.
- Clear daily next action above dashboards.
- Tables for source reports; cards for learning tasks; simple forms for quiz setup.

Colors:
- Neutral base with one accent per track.
- Reserve red/orange for stale sources, cleanup/cost warnings, and failed readiness checks.
- Do not use decorative gradients that reduce readability.

Accessibility:
- Keyboard-operable card review and quizzes.
- Do not rely on color alone for track identity or status.
- Timers and warnings must have text labels.
- Quiz option hit targets should be large enough for repeated daily use.

Copy style:
- Use direct verbs: Continue, Review due cards, Start weakness drill, Mark cleanup complete.
- Show exam code near decisions to reinforce separation.
- When sources are stale, say exactly what is stale and when it was last checked.
