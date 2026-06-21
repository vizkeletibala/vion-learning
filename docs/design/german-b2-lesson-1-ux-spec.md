# German B2 Lesson 1 source-backed learning page UX spec

Task: `t_74fb3453`
Track scope: `german-b2-exam` only
Lesson scope: Lesson 1 only
Primary implementation surfaces: `src/main.jsx`, `src/styles.css`
Source-data surfaces: `src/lib/learningModel.js`, DB-backed lesson payloads from `server/index.js`, uploaded review packets under `var/uploads/.../tracks/german-b2-exam-chunks.json`

## 0. Non-negotiable scope

This page must be an expanded learner surface for the first German B2 lesson derived from embedded user lesson notes and review-packet data. It must not show fake Lesson 2 placeholders, generic future curriculum scaffolding, or generated filler that is not traceable to Lesson 1 source records.

The current app already isolates German B2 with:

- `GERMAN_B2_TRACK_ID = 'german-b2-exam'` in `src/main.jsx`
- `TrackShell` routing that renders `<GermanB2Lessons data={data} />` only when `trackId === GERMAN_B2_TRACK_ID`
- `trackPayload()` exposing `lessonTabs` and `lessons` only for `german-b2-exam`
- `lessonsForPayload()` returning `tabs`, `provenance`, `validation`, and source IDs per lesson

Keep this isolation. Do not add German B2 Lesson 1 UX to CLF-C02, AIF-C01, shared sources, or the global uploads page.

## 1. Existing payload reality

The current live Lesson 1 uploaded artifact contains only one small note source:

- Artifact: `var/uploads/german-b2-live-pipeline/tracks/german-b2-exam-chunks.json`
- Raw note: `var/uploads/german-b2-live-pipeline/raw/lektion-live.txt`
- Source file: `lektion-live.txt`
- Citation: `Live lesson pipeline note`
- Source status: `unverified`
- Chunk id: `german-b2-exam:upload:german-b2-live-pipeline:lektion-live.txt:chunk-1`

Embedded Lesson 1 source facts available today:

- Vocabulary: `sich bewerben — jelentkezni`
- Grammar: `Konjunktiv II: Ich würde mich bewerben.`
- Reading seed sentence: `Die Bewerberin erfüllt alle Voraussetzungen für die Stelle.`
- Writing seed sentence: `Sehr geehrte Damen und Herren, ich interessiere mich für Ihre Anzeige.`

Validation issues currently matter for UX:

- vocab item is missing `hungarian` as a structured field, even though the translation is embedded in `term`
- vocab item is missing required verb forms: present, past, perfect
- source freshness is `unverified`

The expanded UI should make these gaps visible instead of silently pretending the lesson is complete.

## 2. Page information architecture

Route: existing `/tracks/german-b2-exam/learn`.

Component hierarchy recommendation inside `GermanB2Lessons`:

```text
GermanB2Lessons
  GermanLessonShell
    LessonHeader / LessonTrustBar
    LessonSourceStrip
    LessonRoadmap
    LessonTabNav
    Tab panel: Vocabulary | Grammar | Reading | Writing
    LessonPracticeFooter
```

Use a layered source-backed learning layout:

1. Lesson header and trust bar
2. Source/provenance strip
3. Lesson 1 roadmap/outline
4. Active tab content
5. Small practice footer that routes the learner to reuse Lesson 1 content

Do not turn Lesson 1 into one long scroll of mixed vocab, prose, questions, and prompts. The tab panels should stay focused, but the top of the page should tell the learner what evidence exists and what is incomplete.

## 3. Top-level Lesson 1 layout

### 3.1 Lesson header

Recommended copy and data mapping:

```text
German B2 · Lesson 1
<lesson.title>
Personalized source-backed lesson from uploaded notes.
```

Show compact badges:

- `Track: german-b2-exam`
- `Status: draft|review|published` from `lesson.status`
- `Review: needs_edit|approved|...` from `lesson.review_status`
- `Version <content_version>`
- `Source verification needed` when freshness is `unverified` or validation has issues

Do not use `data.track.last_verified_date` as the only trust signal because the German B2 track can have `null`; the lesson source and validation data are more precise.

### 3.2 Lesson trust bar

Add a compact horizontal summary below the header:

```text
Source-backed coverage
Vocabulary: 1 item · Grammar: 3 notes · Reading: 0 article texts, 1 seed sentence · Writing: 1 seed prompt
Evidence: 1 source · 1 chunk · 4 validation issues
```

Behavior:

- Counts come from `activeLesson.tabs` and `activeLesson.validation.issues`.
- If `provenance.source_ids` is empty, show `No source ids attached — source review required`.
- If `provenance.chunk_ids` is empty, show `No retrieval chunks attached — article/reading expansion unavailable`.
- If validation issues exist, include a warning badge and link/expand to issue list.

### 3.3 Source/provenance strip

Add a source strip above the tabs, not hidden on the separate Sources page.

Fields to display from existing payload:

- `activeLesson.provenance.source_ids`
- `activeLesson.provenance.chunk_ids`
- `activeLesson.source_type`
- `activeLesson.validation.issues`
- per-item `source_id`, `source_file`, `source_type` when available

Recommended display:

```text
Evidence used
Live lesson pipeline note · txt · unverified
source id: german-b2-exam:upload:german-b2-live-pipeline:lektion-live.txt
chunk: ...:chunk-1
[Show validation details]
```

If no resolved source title exists, use `source_file` or source id. Never show a confident generated explanation without source id or chunk id.

## 4. Tab and section behavior

Keep current tabs: Vocabulary, Grammar, Reading, Writing. Add a visible tab-level source badge/count to each tab:

```text
Vocabulary (1)
Grammar (3)
Reading (0 article / 1 seed)
Writing (1)
```

Tab empty state copy must name Lesson 1 and source retrieval:

- `No Lesson 1 reading articles were retrieved from the current source packet. Showing only the source sentence seed is allowed; do not generate article text without cited chunks.`
- `No Lesson 1 writing prompts were extracted. Upload or approve Lesson 1 notes before practicing this tab.`

Keyboard/ARIA:

- Use `role="tablist"` on tab nav, `role="tab"` on tab buttons, `aria-selected`, and `aria-controls`.
- Use `role="tabpanel"` around the active panel.
- Preserve `aria-current` only if the team prefers link-like nav; for actual tabs, switch to tab semantics.

## 5. Vocabulary expansion card UX

### 5.1 Source rule

Vocabulary expansion cards can only use embedded Lesson 1 notes. For today, the only term is:

```text
sich bewerben — jelentkezni
```

Do not add extra B2 vocabulary such as Arbeit, Stelle, Bewerbungsgespräch, etc. unless those terms are in Lesson 1 review-packet content.

### 5.2 Card anatomy

Replace the current simple flip card with an expanded source-backed card:

```text
[front]
sich bewerben
verb · reflexive
Translation: jelentkezni
Source: lektion-live.txt · item 1

[back / expanded details]
Meaning in this lesson: applying / submitting an application
Lesson sentence: Ich würde mich bewerben.
Required forms
- Present: missing in source notes
- Past: missing in source notes
- Perfect: missing in source notes
Reuse challenge: Write one B2 sentence using "sich bewerben".
Evidence: source id + validation status
```

Important: the `Meaning in this lesson` line may explain the embedded translation, but it should be visually marked as derived from the source term, not as an imported dictionary expansion. Required forms must be `missing in source notes` until the review packet actually provides them.

### 5.3 Interactions

- Default state: compact card showing term, translation, source chip.
- Expand/collapse: shows usage, missing-form checklist, and one reuse mini-drill.
- Flip behavior can remain, but source/provenance must be visible on both front and back.
- If `item.hungarian` is blank but `item.term` contains `—`, parse/display the right side as `translation parsed from source term` and keep validation warning visible.
- Add a `Use in writing prompt` affordance that scrolls to Writing tab with this vocab preselected, but do not save state globally unless implementation wants to.

### 5.4 Empty/validation states

- No vocab items: `Lesson 1 has no vocabulary items in the reviewed notes yet.`
- Missing translation: `Translation not structured; source term contains "— jelentkezni" but review data needs cleanup.`
- Missing verb forms: show checklist with disabled/muted rows, not blank table cells.

## 6. Grammar panel UX

The grammar tab should distinguish actual grammar concepts from notes that were classified as grammar only because the parser lacked richer reading/writing kinds.

Recommended sections:

1. `Grammar focus`
   - Show `Konjunktiv II: Ich würde mich bewerben.`
   - Add a short explanation only if source-backed or explicitly marked as generated from this sentence.
2. `Lesson examples`
   - Show source sentences that parser assigned to grammar but which are actually reading/writing seeds.
3. `Source cleanup needed`
   - If item text is a section label (`Olvasás / Reading`, `Írás / Writing`) or a non-grammar sentence, show a parser-review warning.

Do not count section headings as real grammar exercises.

## 7. Short-essay prompt UX that forces Lesson 1 vocabulary reuse

### 7.1 Prompt source rule

Writing prompts must be built from Lesson 1 vocabulary and writing seed text only. Today the only available writing seed is:

```text
Sehr geehrte Damen und Herren, ich interessiere mich für Ihre Anzeige.
```

The only required vocab term available today is:

```text
sich bewerben
```

### 7.2 Writing tab structure

Recommended sections:

```text
Writing practice · Lesson 1
  Short answer
  Short essay
  Long essay unavailable until source notes provide enough material
```

Short essay card:

```text
Prompt: Write a short formal application-style note using the Lesson 1 phrase.
Required reuse: "sich bewerben" or an inflected/reflexive form.
Starter: "Sehr geehrte Damen und Herren, ich interessiere mich für Ihre Anzeige."
Checklist:
□ Uses the formal greeting/opening from Lesson 1
□ Reuses "sich bewerben"
□ Includes one reason or qualification
□ 60-90 words
Source: lektion-live.txt · writing item 6 · vocab item 1
```

The UI should visibly reject/flag drafts that do not include the required Lesson 1 vocabulary. Client-side checking can start simple:

- Accept if lowercased draft contains `bewerb`, `bewerben`, `bewerbe`, `beworben`, or `würde mich bewerben`.
- Show warning: `This draft does not reuse Lesson 1 vocabulary yet.`
- Do not auto-grade grammar correctness in this design task.

### 7.3 Empty/insufficient states

- If no writing items: `No Lesson 1 writing source exists yet; upload/approve writing notes before showing prompts.`
- If no vocab items: `Short essay practice is locked because there is no Lesson 1 vocabulary to force reuse.`
- If only one sentence exists, label it `starter sentence`, not a full essay model.

## 8. Article-based reading exercise UX

### 8.1 Source rule

Reading exercises require article-like text or a source chunk explicitly usable as reading content. Today's source only has one sentence:

```text
Die Bewerberin erfüllt alle Voraussetzungen für die Stelle.
```

This is not enough to invent an article. The reading tab should therefore show a `seed sentence` state plus a locked article exercise state.

### 8.2 Reading tab structure

```text
Reading practice · Lesson 1
  Source sentence
  Article exercise unavailable / needs retrieval
  Comprehension questions (only for available source text)
```

Current-state design:

```text
Source sentence
"Die Bewerberin erfüllt alle Voraussetzungen für die Stelle."
Source: lektion-live.txt · item 4 · unverified

Article exercise
Needs more Lesson 1 source text. No article was retrieved, so no generated article is shown.

Comprehension check from available sentence
1. Wer erfüllt die Voraussetzungen?
2. Was erfüllt die Bewerberin?
```

The two sentence-level questions above are allowed because they are direct transformations of the available source sentence. They should be labeled `sentence check`, not `article comprehension`.

When real article content exists later, each article card should include:

- Article title from source or `Lesson 1 reading text` fallback
- Source/citation chip
- Expandable original excerpt
- 3-5 comprehension questions stored in `item.questions` or generated only with citation metadata
- A `No citation, no question` guard: hide generated questions if source refs are missing

## 9. Loading, empty, and missing retrieval states

### Loading states

Current `TrackShell` only says `Loading GERMAN-B2-EXAM…`. For Lesson 1, add a skeleton inside `GermanB2Lessons` if data can be loaded asynchronously later:

- Header skeleton
- Source strip skeleton
- Four tab placeholders
- Text: `Loading Lesson 1 source-backed notes…`

### No lessons

Keep the current no-lessons behavior, but make it track-specific:

```text
No German B2 Lesson 1 source notes are available yet.
Upload pdf, txt, or markdown notes for german-b2-exam. This page will not invent lesson content.
```

### Lesson exists, tab empty

Show a tab-local empty state and preserve the rest of the lesson page:

```text
No Lesson 1 <tab> items were found in the reviewed source packet.
Source ids: <ids if any>
Next step: add <tab> notes to Lesson 1 and re-run review.
```

### Missing retrieval chunks

If `activeLesson.provenance.chunk_ids` is empty:

```text
Retrieval evidence missing. Vocabulary and prompts can use structured review items, but article-style reading and generated explanations are disabled until chunks are attached.
```

### Validation issues

Render `activeLesson.validation.issues` in a collapsible `Source cleanup needed` block. Do not bury them on the Sources page.

## 10. Desktop and mobile layout

### Desktop, >= 960px

Use a two-column page after the header:

```text
left/main: active tab panel (2fr)
right/aside: source strip, validation issues, lesson checklist (minmax(280px, 0.8fr))
```

Vocabulary cards can use 2-3 columns depending on width. Reading/writing cards should remain single-column for readability.

### Tablet, 700-959px

- Header and trust bar remain stacked.
- Tab nav scrolls horizontally.
- Source/provenance strip becomes a full-width block above active tab content.
- Vocabulary cards use 2 columns.

### Mobile, < 700px

- One column only.
- Sticky or horizontally scrollable tab nav.
- Source chips wrap; long source ids truncate with middle ellipsis and full id in `title`.
- Expanded vocab details should not require hover; use button/details.
- Writing checklist stays above the textarea so the required vocab rule is visible while drafting.

## 11. Component-level implementation recommendations

Create small helpers in `src/main.jsx` first; split files later only if the component grows.

Recommended additions:

- `lessonSourceSummary(lesson)`
- `lessonCoverage(lesson)`
- `lessonValidationIssues(lesson)`
- `parseGermanTerm(term)` for `sich bewerben — jelentkezni`
- `itemSourceLabel(item, lesson)`
- `GermanLessonHeader`
- `GermanLessonSourceStrip`
- `GermanLessonRoadmap`
- `GermanLessonTabs`
- `GermanVocabCard`
- `GermanReadingPanel`
- `GermanWritingPanel`
- `GermanEmptyState`

Keep existing `normalizeGermanB2Lessons`, `germanB2LessonTabs`, and `writingVariant` unless deeper payload changes are required.

Payload additions that would help but are not mandatory for first implementation:

- `lesson.source_refs`: resolved source records for source ids, not only ids
- `lesson.chunk_refs`: resolved chunk metadata/title/status for chunk ids
- `tabs.reading_seed_sentences`: for reading-like source sentences that are not full articles
- `tabs.parser_warnings`: section labels and misclassified items

## 12. Style tokens and class additions

Add styles in `src/styles.css` near existing German B2 lesson styles.

Recommended classes:

- `.german-lesson-shell`
- `.german-lesson-header`
- `.german-lesson-trustbar`
- `.german-lesson-metric`
- `.german-lesson-layout`
- `.german-lesson-main`
- `.german-lesson-aside`
- `.lesson-source-strip`
- `.lesson-source-chip`
- `.lesson-validation-panel`
- `.lesson-validation-panel--warning`
- `.lesson-tab-badge`
- `.german-vocab-card`
- `.german-vocab-card__term`
- `.german-vocab-card__translation`
- `.german-vocab-card__forms`
- `.lesson-source-footnote`
- `.lesson-reading-seed`
- `.lesson-locked-state`
- `.lesson-writing-prompt`
- `.lesson-writing-checklist`
- `.lesson-writing-draft`

Existing tokens are enough for first pass:

- `--bg-panel`
- `--border`
- `--border-strong`
- `--text`
- `--muted`
- `--muted-strong`
- `--primary`
- `--cyan`
- `--rose`
- `--shadow-soft`

Optional new semantic tokens:

```css
--german-source: #f6c453;
--german-warning: #ffb86b;
--german-success: #7ee787;
```

## 13. Acceptance checklist for the implementation coworker

The implementation is done only when:

- `/tracks/german-b2-exam/learn` renders an expanded Lesson 1 page when a Lesson 1 payload exists.
- The page shows roadmap/header, source/provenance strip, tab nav, and active tab panel.
- Vocab card for `sich bewerben — jelentkezni` shows provenance and missing structured fields instead of hiding validation gaps.
- Writing short-essay UX forces reuse of `sich bewerben` and warns if the draft misses Lesson 1 vocabulary.
- Reading tab does not invent an article from the single available sentence; it shows a source sentence state and locked article state.
- Empty/missing retrieval/loading states are visible and track-specific.
- Source/provenance is visible on the lesson page, not only on `/sources`.
- No content or UI changes appear for CLF-C02/AIF-C01 beyond shared component styles.
- Build/test pass.

## 14. Concrete files/classes to touch

Primary implementation:

- `src/main.jsx`
  - expand `GermanB2Lessons`
  - add German Lesson 1 helper/components listed in section 11
  - keep `TrackShell` track isolation unchanged
- `src/styles.css`
  - add class selectors listed in section 12
  - add responsive layout rules for `.german-lesson-layout`, `.lesson-tabs`, vocab grid, writing panel

Optional payload work if implementer wants richer provenance labels:

- `src/lib/learningModel.js`
  - enrich `lessonsForPayload()` with resolved source/chunk refs for `german-b2-exam`
- `server/index.js`
  - no route change expected; preserve DB lesson merge via `trackPayloadWithDbLessons()`

Tests to update/add:

- `tests/ui-interactions.test.js`
  - assert German B2 lesson tab behavior, empty states, and forced vocabulary warning if current test harness renders UI
- `tests/http-api.test.js`
  - assert `/api/tracks/german-b2-exam` returns lesson provenance/validation needed by the page when DB-backed lesson data is available

## 15. Notes for avoiding accidental filler

Allowed microcopy can describe UI state and direct transformations of the source. Not allowed: adding new German vocabulary, full reading articles, full model essays, or additional lessons without source records.

If retrieval returns no article chunks, the correct user experience is a clear locked/empty state, not a generated article. If validation says source review is needed, show that on the page so the learner understands why some practice is unavailable.
