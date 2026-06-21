# Source-backed learning UX spec

Task: `t_ea9ad211`
Date: 2026-06-11
Inputs: `docs/research/source-registry-policy-clf-aif-shared.md`, `docs/design/source-ingestion-schema.md`, existing Vion Learning UX patterns.

Goal: define how RAG-backed/source-backed learning content appears in Vion Learning while preserving strict CLF-C02/AIF-C01 separation. The UI should help learners trust an answer because they can see where it came from, when it was verified, and whether the cited material is safe to use for the selected certification.

Non-negotiable invariant: CLF-C02 and AIF-C01 remain visually and structurally separate after track selection. A shared AWS foundation corpus may feed both tracks only through track-owned projections: every displayed citation, retrieval result, card, question, chapter, warning, and verification state must carry the active `track_id` and exam framing.

This spec extends:
- `docs/design/vion-learning-ux-spec.md`
- `docs/design/source-ingestion-schema.md`
- `docs/research/source-registry-policy-clf-aif-shared.md`
- `src/lib/ragPrototype.js`

Registry policy dependency: the research lane locked three source buckets (`clf-c02`, `aif-c01`, `shared`) and the freshness vocabulary (`fresh`, `needs_refresh`, `stale`, `unverified`, `auth_gated`). This UX spec treats `shared` as a curation/build-time bucket only. Learner-facing UI must always show the active track projection, not a raw shared record.

---

## 1. UX principles

1. Source-backed, not source-noisy.
   - Show compact evidence inline.
   - Put detailed retrieval/source metadata behind expandable panels.
   - Do not make every learning screen look like a database report.

2. Track first, source second.
   - The active track code appears before source context: `CLF-C02 / Security and Compliance / Source verified`.
   - Shared AWS material is displayed as track-owned evidence, not as global content.

3. Official sources outrank supplementary sources.
   - AWS certification pages, exam guides, and AWS docs get official-source styling.
   - Third-party videos/articles are supplemental and must never be presented as the authority for exam facts.

4. Staleness follows the content.
   - If a source is stale/conflicted/unverified, every dependent card, question, chapter, and explanation shows a badge or warning.
   - Freshness is not hidden only on the source report page.

5. No citation means no generated answer.
   - RAG answer panels must support the existing policy in `ragPrototype.js`: `citation_required: true` and `no_citation_no_answer: true`.
   - If retrieval returns no valid track-matching citation, the UI shows `Source verification needed` instead of a confident explanation.

---

## 2. Track separation model with shared AWS foundation corpus

### Allowed architecture

A shared AWS foundation corpus may exist as ingestion/retrieval infrastructure, but UI-facing records must be track-scoped:

```text
Shared AWS foundation source URL/content
  -> CLF-C02 source projection with CLF-C02 domains, facts, question_use, freshness
  -> AIF-C01 source projection with AIF-C01 domains, facts, question_use, freshness
```

Display rule: the UI never renders a raw shared source directly inside a track. It renders the active track's source projection, chunk, evidence item, or dependent content.

### Required track cues

Use at least two cues on every source-backed surface:

| Cue | CLF-C02 | AIF-C01 |
| --- | --- | --- |
| Route | `/tracks/clf-c02/...` | `/tracks/aif-c01/...` |
| Header badge | `CLF-C02` | `AIF-C01` |
| Accent | blue/slate | purple/indigo |
| Copy | `Cloud Practitioner framing` | `AI Practitioner framing` |
| Empty/warning text | names CLF-C02 | names AIF-C01 |

Never rely on color alone. Badges must include text.

### Shared URL display

When the same AWS URL supports both tracks, show it as a track-specific citation:

- Good: `AWS Shared Responsibility Model — used here for CLF-C02 Security and Compliance`.
- Good: `AWS Shared Responsibility Model — used here for AIF-C01 responsible-AI governance boundaries`.
- Bad: `Shared foundation source for both exams` inside a track learning screen.

Optional developer-only metadata may note `shared_foundation_source_id`, but learner-facing copy must focus on the selected exam.

### Registry-to-UI projection rules

| Registry corpus | Can appear directly in learner UI? | UI treatment |
| --- | --- | --- |
| `clf-c02` | Yes, only inside CLF-C02 routes | Render as CLF-C02 citation/evidence with Cloud Practitioner domain/topic framing. |
| `aif-c01` | Yes, only inside AIF-C01 routes | Render as AIF-C01 citation/evidence with AI Practitioner domain/topic framing. |
| `shared` | No | Must first be projected into a track-owned source ref that records why the shared AWS source supports that specific exam context. |

Projection requirements for shared AWS foundation sources:
- carry both `sourceId` for the track projection and optional `sharedFoundationSourceId` for reviewer/debug traceability;
- copy the source freshness status from the underlying source, then allow the track projection to become stricter if exam-specific mapping has not been reviewed;
- include a track-specific `usageNote`, e.g. `Used for CLF-C02 shared-responsibility concept boundaries`, not a generic shared-corpus label;
- never make `shared` the sole authority for exam guide scope, domain weights, task statements, quiz correctness, or readiness eligibility.

---

## 3. Source status language and badges

Use one status vocabulary across landing, track header, chapter pages, card review, quiz review, retrieval panels, and source reports.

| Raw status | Badge label | Tone | Meaning | Primary action |
| --- | --- | --- | --- | --- |
| `fresh` | `Verified` | positive/neutral | Recently checked and safe for normal use. | `Open source` |
| `needs_refresh` | `Review soon` | caution | Freshness threshold approaching or content should be rechecked. | `Review source` |
| `stale` | `Stale` | warning | Beyond threshold; dependent content should not be treated as current. | `Refresh source` |
| `unverified` | `Source verification needed` | warning | Candidate/manual source has not been checked. | `Verify source` |
| `auth_gated` | `Auth-gated` | caution | Requires legitimate access to fully verify. | `Open access notes` |
| `unavailable` | `Unavailable` | error | Source could not be fetched/opened. | `Use alternate source` |
| `conflict` or conflict flag | `Conflict` | error | Lower-priority source disagrees with official/current source. | `Resolve conflict` |
| missing/unknown | `Evidence incomplete` | warning | Retrieval/source metadata is incomplete. | `Report evidence gap` |

### Badge anatomy

`FreshnessBadge` should display:
- text label;
- icon or shape;
- last checked date when known;
- short tooltip/popover copy;
- optional source type, e.g. `AWS docs`, `Exam guide`, `Third-party video`.

Examples:
- `Verified · checked Jun 5, 2026`
- `Source verification needed · not checked yet`
- `Stale · last checked Mar 12, 2026`
- `Conflict · official exam guide changed`

### Badge placement

Always show a status badge on:
- landing track cards;
- track header;
- chapter hero/source summary;
- learning cards front or back;
- quiz explanations/review cards;
- RAG answer/evidence panels;
- source report rows;
- console guides;
- generated study-plan tasks that depend on source facts.

Use compact badges inline; use larger warnings only when the status affects learner trust or allowed actions.

---

## 4. Source citation panels

### `SourceCitationPanel`

Purpose: show the user the authoritative source trail for a fact, explanation, card, question, or chapter.

Props/data:

```ts
type SourceCitationPanelProps = {
  trackId: 'clf-c02' | 'aif-c01';
  title: string;
  sourceRefs: SourceReference[];
  mode: 'compact' | 'expanded';
  dependentObject?: { type: 'chapter' | 'card' | 'question' | 'answer' | 'guide'; id: string };
};

type SourceReference = {
  sourceId: string;
  trackId: 'clf-c02' | 'aif-c01';
  sharedFoundationSourceId?: string;
  title: string;
  url: string;
  publisher: string;
  sourceType: string;
  citationText: string;
  sectionPath?: string[];
  sourceLocator?: string;
  retrievedAt?: string;
  lastCheckedAt?: string | null;
  freshnessStatus: 'fresh' | 'needs_refresh' | 'stale' | 'unverified' | 'auth_gated' | 'unavailable' | 'conflict' | 'unknown';
  contentHash?: string | null;
  relevanceLevel?: 'core' | 'supporting' | 'background' | 'candidate';
  usageNote?: string;
};
```

Compact layout:
- Header: `Sources` + worst freshness badge across refs.
- One-line citation chips: source title, source type, status.
- `Show evidence` expands the full panel.

Expanded layout:
- Citation list sorted by source priority:
  1. current exam guide/certification page;
  2. AWS official docs;
  3. AWS Skill Builder/AWS training;
  4. whitepapers/workshops/blogs;
  5. third-party supplementary material.
- Each citation row shows title, publisher, source type, status, last checked, source locator/section path, and open link.
- Usage note is visible for auth-gated or third-party sources.
- Dependent object mapping: `This explanation uses source ids: ...`.

Interactions:
- `Open source` opens the URL in a new tab.
- `Copy citation` copies `citationText`.
- `Report stale/suspect` flags the dependency for source review.
- `View retrieval evidence` opens `RetrievalEvidencePanel` when chunks are available.

Guardrails:
- If any `sourceRef.trackId !== active trackId`, render a blocking error state, not a hidden row.
- If `sourceRefs` is empty for source-backed content, render `Source verification needed` and hide answer-generation confidence copy.

---

## 5. Retrieval evidence panels

### `RetrievalEvidencePanel`

Purpose: explain what the RAG system retrieved without overwhelming the learner.

Use on:
- generated chapter summaries;
- AI tutor/explanation responses;
- quiz-review explanations that were generated or enriched from retrieval;
- source report detail pages;
- reviewer/debug views.

Default user-facing state:

```text
Evidence used
3 source snippets from CLF-C02 official/AWS sources. Worst status: Verified.
[Show evidence]
```

Expanded state per evidence item:
- track badge;
- rank/confidence score if available;
- source title and type;
- section path, e.g. `clf-c02 / source / AWS Well-Architected Framework / Operational excellence / chunk-2`;
- short snippet, max 280 characters;
- freshness badge;
- content hash prefix, e.g. `sha256:6d19940e...` in reviewer/debug mode only;
- `Open source` link.

### Evidence levels

Use three display levels:

1. Learner compact: source count + official/supplementary mix + worst freshness.
2. Learner expanded: citations + short snippets + section paths.
3. Reviewer/debug: chunk ids, content hashes, embedding model, retrieval scores, freshness propagation, generation timestamp.

### No-evidence state

If retrieval has no track-matching citations:

Title: `Source verification needed`

Body:
`Vion Learning could not find a verified {TRACK_CODE} source for this explanation. Review the source report or use official AWS documentation before relying on this answer.`

Actions:
- `Open {TRACK_CODE} source report`
- `Flag evidence gap`
- `Search official AWS sources` if implemented

Do not show a fabricated answer summary in this state.

---

## 6. Chapter pages

Chapter pages are the main source-backed study surface. They should feel like a guided lesson with transparent evidence.

Route:
- `/tracks/:trackId/chapters/:chapterId`
- optional domain route: `/tracks/:trackId/domains/:domainId/chapters/:chapterId`

### `ChapterPage` layout

1. Track + chapter hero
   - track badge/code;
   - domain and topic;
   - chapter title;
   - readiness/due-card context if relevant;
   - overall source badge, e.g. `Verified · 6 sources`.

2. `ChapterSourceSummaryCard`
   - source count by priority: `1 exam guide`, `4 AWS docs`, `1 supplementary`;
   - worst freshness status;
   - last checked date range;
   - conflicts/unverified count;
   - link to source report filtered to this chapter.

3. Learning sections
   - short original explanations;
   - inline source markers after factual claims: `[AWS docs]`, `[Exam guide]`;
   - callouts for exam-specific framing.

4. `RetrievalEvidencePanel`
   - collapsed by default after each generated summary or at end of section.

5. Practice launcher
   - cards/questions generated from this chapter;
   - disabled or warning state if source freshness is unacceptable.

6. Maintenance footer
   - `Last generated`, `Last source check`, `Source status`, `Report stale content`.

### Chapter source states

- All fresh/verified: normal learning flow.
- Some review-soon/stale: learning allowed, but show warning and steer to source report.
- Conflict: show a top warning and mark dependent claims/questions as needing review.
- No official source: chapter can be shown as background only; disable exam-fact quiz generation until official source mapping exists.

---

## 7. Learning card review UI

### Updated card anatomy

Add source-backed blocks to the existing `LearningCardViewer`:

Front:
- track badge;
- domain/topic;
- prompt;
- compact `FreshnessBadge` for the card's worst dependent source;
- optional `Source-backed` marker.

Back:
- answer/explanation;
- `Why this matters for {TRACK_CODE}`;
- `SourceCitationPanel(mode='compact')`;
- `RetrievalEvidencePanel` if generated from RAG chunks;
- spaced repetition controls;
- flag controls.

### Card source warning behavior

If any required source is `stale`, `unverified`, `unavailable`, or `conflict`:

- show a warning banner above the answer;
- allow spaced repetition review, but add copy: `Review this as a memory aid; source freshness needs attention.`;
- include `Mark source stale/suspect` and `Open source report` actions;
- do not let the card be promoted to an `exam-ready` evidence state until resolved.

If source refs are missing:

- show `Source verification needed`;
- allow learner notes and flagging;
- hide citation confidence language like `officially verified`.

### Source-backed card queues

Add/update queue tabs:
- `Due now`
- `New`
- `Weakness review`
- `Stale-source cards`
- `Verification needed`
- `Bookmarked`

`Stale-source cards` includes cards with source statuses `stale`, `needs_refresh`, `unavailable`, or `conflict`.
`Verification needed` includes cards with missing or `unverified` source refs.

---

## 8. Quiz question and review UI

### During quiz attempt

Do not reveal source evidence that gives away the answer. Show only:
- track code;
- domain/topic;
- freshness badge if needed;
- optional warning: `This question depends on a source marked review soon.`

If a question depends on `conflict`, `unavailable`, or missing sources:
- exclude it from full simulations by default;
- allow it only in a reviewer/debug or `needs verification` practice mode;
- label it clearly.

### Quiz review

Add to `QuestionReviewCard`:
- `SourceCitationPanel(mode='compact')`;
- `RetrievalEvidencePanel` for generated explanations;
- `QuestionMappingPanel` with track id, domain, topic, source ids, chunk ids when available, linked card ids;
- `FreshnessBadge` for every dependent source group;
- warning copy for stale/conflicted/unverified source evidence.

Review copy example:

```text
CLF-C02 source-backed explanation
Verified · checked Jun 5, 2026
This explanation is based on AWS Billing and Cost Management and AWS Pricing Calculator docs.
```

Conflict copy example:

```text
Source conflict
This question references a supplementary source that may conflict with the current official exam guide. Do not count this item toward exam readiness until reviewed.
```

### Readiness scoring rule

Questions with `stale`, `unverified`, `unavailable`, `conflict`, or missing source refs should not improve exam-readiness confidence. They may still count as practice activity.

---

## 9. Source report and verification workflow UI

Route:
- `/tracks/:trackId/sources`
- `/tracks/:trackId/sources/report`
- `/tracks/:trackId/sources/:sourceId`

### `SourceReportPage` sections

1. Track source summary
   - `Fresh`, `Needs review`, `Stale`, `Verification needed`, `Conflicts` counts.
   - official/supplementary breakdown.
   - last verification date and generated-at date.

2. Source filters
   - status;
   - source type;
   - official vs supplementary;
   - domain/topic;
   - dependent content type: chapters, cards, questions, guides.

3. Source table columns
   - source title;
   - type/publisher;
   - status badge;
   - retrieved date;
   - last checked date;
   - domain/topic mapping;
   - dependent content count;
   - action.

4. `SourceVerificationNeededPanel`
   - sources/chunks/content with missing citations;
   - unverified candidates;
   - auth-gated sources needing legitimate access;
   - failed fetches/unavailable URLs;
   - conflict queue.

5. `SourceDependencyPanel`
   - for a selected source, list dependent chapters/cards/questions/guides;
   - show whether each dependency is active in readiness scoring;
   - allow reviewer to open the exact dependent object.

### Source detail page

Show:
- source metadata from ingestion schema;
- track projection details: domains, concepts, exam relevance, question use;
- extracted facts;
- retrieved/last checked/content hash;
- citation text;
- usage/copyright note;
- dependent content;
- retrieval chunks/evidence generated from this source;
- reviewer actions.

Reviewer actions may be non-functional placeholders at first, but the UI should reserve space for:
- `Mark verified`;
- `Mark stale`;
- `Flag conflict`;
- `Add note`;
- `Regenerate dependent content`;
- `Exclude from readiness`.

---

## 10. Source verification needed warnings

### `SourceVerificationNeededWarning`

Use when the app cannot prove a content item has current, track-matching evidence.

Placements:
- top of generated answers with no valid citations;
- card back when source refs are empty/unverified;
- quiz review when source refs are missing/unverified;
- chapter page when official-source coverage is missing;
- source report summary.

Copy variants:

No citation:
`Source verification needed: this {TRACK_CODE} explanation has no track-matching citation. Use official AWS documentation before relying on it.`

Unverified candidate:
`Source verification needed: this content uses a candidate source that has not been checked for {TRACK_CODE}.`

Auth-gated:
`Auth-gated source: verification requires legitimate access. Treat as supplemental until reviewed.`

Conflict:
`Source conflict: dependent content should be reviewed before it contributes to readiness.`

Actions:
- `Open source report`
- `Flag for review`
- `Hide from readiness` where reviewer/admin controls exist

---

## 11. Practical component map

### Cross-cutting source/evidence components

- `TrackBadge`
- `TrackScopedWarning`
- `FreshnessBadge`
- `FreshnessBadgeLegend`
- `SourceCitationPanel`
- `SourceCitationRow`
- `SourcePriorityLabel`
- `SourceVerificationNeededWarning`
- `RetrievalEvidencePanel`
- `RetrievalEvidenceItem`
- `EvidenceCompletenessMeter`
- `SourceDependencyPanel`
- `SourceDependencyList`
- `SourceFlagMenu`
- `CitationCopyButton`
- `OpenSourceLink`

### Chapter components

- `ChapterPage`
- `ChapterHero`
- `ChapterSourceSummaryCard`
- `ChapterSection`
- `InlineSourceMarker`
- `ExamFramingCallout`
- `ChapterPracticeLauncher`
- `ChapterMaintenanceFooter`

### Learning card components

- `LearningCardSourceHeader`
- `CardSourceStatusBanner`
- `CardSourceLinks` (upgrade to use `SourceCitationPanel`)
- `CardRetrievalEvidence`
- `StaleSourceQueueTab`
- `VerificationNeededQueueTab`

### Quiz/review components

- `QuestionSourceStatusPill`
- `QuizReviewSourcePanel`
- `QuestionMappingPanel`
- `DistractorEvidenceList`
- `ReadinessEligibilityBadge`

### Source report components

- `SourceReportSummary`
- `SourceReportFilters`
- `SourceTable`
- `SourceStatusBadge` (or alias to `FreshnessBadge`)
- `SourceVerificationNeededPanel`
- `SourceConflictPanel`
- `SourceDetailPage`
- `SourceExtractedFactsList`
- `SourceUsageNote`
- `SourceReviewerActions`

### Containers/routes

- `TrackSourceReportPage({ trackId })`
- `TrackSourceDetailPage({ trackId, sourceId })`
- `ChapterPage({ trackId, chapterId })`
- `LearnPage({ trackId, sourceStatusFilter? })`
- `QuizReviewPage({ trackId, attemptId })`

---

## 12. Minimum data contract additions

These types can be implemented directly or mapped from existing snake_case API responses.

```ts
type TrackId = 'clf-c02' | 'aif-c01';

type FreshnessStatus =
  | 'fresh'
  | 'needs_refresh'
  | 'stale'
  | 'unverified'
  | 'auth_gated'
  | 'unavailable'
  | 'conflict'
  | 'unknown';

type EvidenceCompleteness = 'complete' | 'partial' | 'missing' | 'conflicted';

type SourceBackedObject = {
  id: string;
  trackId: TrackId;
  sourceRefs: SourceReference[];
  evidenceCompleteness: EvidenceCompleteness;
  worstFreshnessStatus: FreshnessStatus;
  readinessEligible: boolean;
};

type SourceReference = {
  sourceId: string;
  trackId: TrackId;
  sharedFoundationSourceId?: string;
  title: string;
  url: string;
  publisher: string;
  sourceType: string;
  citationText: string;
  freshnessStatus: FreshnessStatus;
  lastCheckedAt?: string | null;
  retrievedAt?: string;
  sectionPath?: string[];
  usageNote?: string;
};

type RetrievalEvidence = {
  chunkId: string;
  trackId: TrackId;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  citationText: string;
  url: string;
  sectionPath: string[];
  snippet: string;
  freshnessStatus: FreshnessStatus;
  score?: number;
  contentHash?: string;
  embeddingModel?: string;
  generatedAt?: string;
};

type ChapterSummary = SourceBackedObject & {
  title: string;
  domainId: string;
  topicIds: string[];
  sourceCounts: {
    official: number;
    supplementary: number;
    stale: number;
    verificationNeeded: number;
    conflicts: number;
  };
};
```

### Mapping from existing source fields

| Existing field | UI field |
| --- | --- |
| `track_id` | `trackId` |
| `freshness_status` / `refresh_status` | `freshnessStatus` |
| `last_checked_at` | `lastCheckedAt` |
| `retrieved_at` | `retrievedAt` |
| `citation_text` | `citationText` |
| `source_type` | `sourceType` |
| `content_hash` | `contentHash` |
| RAG `section_path` | evidence `sectionPath` |
| RAG `chunk_id` / `id` | evidence `chunkId` |

---

## 13. Visual direction

Use a calm internal-tool style consistent with the existing app.

Status color rules:
- `Verified`: green or neutral success, not celebratory.
- `Review soon` / `Auth-gated`: amber.
- `Stale` / `Source verification needed`: orange.
- `Conflict` / `Unavailable`: red.
- `Unknown`: gray.

Track color rules:
- CLF-C02: blue/slate accent.
- AIF-C01: purple/indigo accent.
- Track accents should wrap the page/shell and badges; status colors should remain consistent across tracks.

Density rules:
- One compact source line is enough during active studying.
- Detailed chunk/hash metadata belongs in expanders or reviewer/debug mode.
- Warnings must be visible without scrolling when they affect trust/readiness.

Accessibility:
- Badges include text labels, not color-only signals.
- Evidence expand/collapse controls are keyboard reachable.
- Warning panels use `role="alert"` only for blocking/high-severity source problems, not every stale badge.
- Links use source titles, not raw URLs, except in source detail/report tables.

---

## 14. Acceptance criteria for coder lane

### Track separation

- After selecting a track, every source-backed route is under `/tracks/:trackId/...`.
- Every citation/evidence object rendered in a track page has `trackId === route trackId`.
- A cross-track citation mismatch renders a blocking track-scope error and is covered by a test.
- The same AWS URL may appear in both tracks only as separate track-owned source refs/projections.
- No source-backed component fetches or displays a mixed global source list inside a track shell.

### Freshness/status UI

- Implement one reusable `FreshnessBadge`/`SourceStatusBadge` mapping for `fresh`, `needs_refresh`, `stale`, `unverified`, `auth_gated`, `unavailable`, `conflict`, and unknown.
- Landing track cards, track headers, learning cards, quiz review cards, chapter pages, source report rows, and evidence panels all show source status when data is available.
- Stale/conflict/unverified states include clear text with last checked date when known.
- Missing citations show `Source verification needed`, not a generic error.

### Citation/evidence UX

- Implement `SourceCitationPanel` in compact and expanded states.
- Implement `RetrievalEvidencePanel` with learner compact/expanded display; reviewer/debug metadata can be behind a prop or feature flag.
- Evidence items show source title, type, section path, snippet, URL, status, and track id.
- RAG answer UI refuses to render a confident answer when no valid track-matching citation exists.

### Chapter/source report surfaces

- Add or reserve `ChapterPage` structure with `ChapterSourceSummaryCard`, inline source markers, evidence expanders, and practice launcher.
- Source report supports filters by status, type, domain/topic, and dependent content type, even if initial implementation filters client-side.
- Source detail page or expandable source rows show extracted facts, exam relevance, usage note, freshness dates, citation text, and dependent content.

### Learning/quiz readiness behavior

- Learning cards show source status and source citations on the back/reveal state.
- Add stale/verification-needed card queues or filters.
- Quiz attempt screens do not reveal answer-giving source snippets before submission.
- Quiz review shows citations/evidence after answer/submission.
- Questions with missing/stale/conflicted/unverified source refs do not increase exam-readiness confidence.

### Tests/checks

- Add tests for freshness badge mapping.
- Add tests for cross-track source/evidence rejection.
- Add tests for no-citation/no-answer UI state.
- Add tests or fixture checks for readiness exclusion when source status is not verified/fresh enough.
- Existing commands should still pass: `npm test`, `npm run lint`, `npm run build`.

---

## 15. Acceptance criteria for reviewer lane

Reviewer should verify:

1. Separation
   - Navigate CLF-C02 and AIF-C01 pages and confirm source-backed content never mixes track ids.
   - Inspect shared AWS URL examples and confirm each track shows its own exam framing.

2. Trust and citations
   - Every generated/source-backed answer, card explanation, quiz review explanation, and chapter summary has citations or a source-verification-needed warning.
   - Citation rows open real URLs and show publisher/type/status.
   - Retrieval evidence snippets are short and do not copy excessive source text.

3. Freshness propagation
   - Mark or fixture a source as stale/unverified/conflict and confirm every dependent UI surface shows the status.
   - Confirm stale/conflicted content does not improve readiness confidence.

4. Official vs supplementary hierarchy
   - Official AWS/exam guide sources appear before third-party material.
   - Third-party sources are labeled supplemental and cannot be the sole authority for exam facts.

5. Failure states
   - Missing citation, unavailable source, auth-gated source, and cross-track citation mismatch each have a clear UI state.
   - The user is never shown a confident generated answer when evidence is missing or track-mismatched.

6. Accessibility
   - Badge meaning is available as text.
   - Evidence panels can be opened with keyboard.
   - Warnings have readable copy and appropriate contrast.

---

## 16. Recommended implementation order

1. Add source status vocabulary and `FreshnessBadge`.
2. Add source citation/evidence data normalization helpers.
3. Upgrade learning-card and quiz-review source displays.
4. Add no-citation/source-verification-needed state for generated answers.
5. Add source report filtering and dependency panels.
6. Add chapter page skeleton with source summary/evidence panels.
7. Add readiness exclusion rules for stale/unverified/conflicted evidence.
8. Add reviewer/debug evidence details.

This order gives learners visible trust cues early while keeping deeper RAG/chapter work incremental.
