# German B2 note upload and webpage publishing guidelines

These guidelines define how uploaded German B2 notes are normalized before they are allowed onto the Vion Learning German B2 webpage. The uploaded note is source material, not learner-facing copy. Normalization must turn source-backed seeds into clean cards and exercises while preserving provenance.

## Core rule

Do not copy uploaded note text directly into the learning page as the final experience.

Uploaded notes may contain mixed Hungarian/German text, table headers, teacher shorthand, partial sentences, and section labels. The published page must show generated learning objects derived from the notes:

- vocabulary cards
- grammar mini-exercises
- reading passages or source-sentence exercises
- writing prompts with constraints
- validation/source status notes

Every generated object must remain traceable to the uploaded note. If a fact is not in the note or a cited source chunk, mark it as generated practice scaffolding and keep it conservative.

## Expected upload shape

An upload can be markdown, txt, or PDF-extracted text. Prefer this section structure when preparing notes for upload:

```markdown
# Lektion <number>: <title>

## Vocab
| German | Hungarian | Notes |
| --- | --- | --- |
| sich bewerben | jelentkezni | reflexive verb |

## Grammar
- Konjunktiv II with würde + infinitive
- Source example: Ich würde mich bewerben.

## Reading
Source text or source sentence:
Die Bewerberin erfüllt alle Voraussetzungen für die Stelle.

Comprehension seeds:
- What does the applicant fulfil?

## Writing
Prompt seed:
Sehr geehrte Damen und Herren, ich interessiere mich für Ihre Anzeige.

Required reuse words:
- sich bewerben
- Voraussetzung
```

Minimum acceptable upload content:

- a lesson title or batch identifier
- at least one section marker (`Vocab`, `Grammar`, `Reading`, or `Writing`)
- source text or source examples under each populated section
- Hungarian glosses for vocabulary where available
- provenance-friendly file name and source id from the upload pipeline

Reject or hold for cleanup when the upload is only screenshots with no OCR text, anonymous fragments with no lesson context, or copied table headers with no usable lesson content.

## Normalization workflow

1. Parse the upload into section-scoped source seeds.
2. Remove structural noise: table headers, divider rows, repeated titles, OCR junk, page numbers, and empty bullets.
3. Keep the original source id, source file, chunk id, and section path on every normalized item.
4. Convert seeds into generated learner-facing objects, not pasted source blocks.
5. Add validation issues instead of hiding missing data.
6. Publish only cards/exercises that are useful on the webpage; send incomplete objects to review.

## Learner-facing content contract

Each normalized object should include these common fields when the implementation supports them:

```js
{
  id: String,
  kind: 'vocab' | 'grammar' | 'reading' | 'writing',
  source_id: String,
  source_file: String,
  source_type: 'markdown' | 'txt' | 'pdf',
  chunk_id: String | undefined,
  section_path: [String],
  generated_from_note: true,
  review_status: 'needs_edit' | 'review' | 'approved',
  validation_issues: [String]
}
```

Use `generated_from_note: true` to make the distinction explicit: the page object was authored from uploaded notes, but it is not a raw note excerpt.

## Vocabulary guidelines

Published shape:

```js
{
  kind: 'vocab',
  term: 'sich bewerben',
  hungarian: 'jelentkezni',
  part_of_speech: 'verb',
  article: undefined,
  verb_forms: {
    present: 'bewirbt sich',
    past: 'bewarb sich',
    perfect: 'hat sich beworben'
  },
  irregular: true,
  front: 'sich bewerben',
  back: 'jelentkezni · to apply',
  learner_task: 'Write one B2 sentence using a reflexive form of sich bewerben.',
  source_note: 'Derived from uploaded Lesson <n> vocab row.'
}
```

Rules:

- Generate a card with front/back/reuse task; do not paste the table row as the card body.
- Require Hungarian glosses for all vocabulary cards. If the note embeds the gloss in `term` with `—`, parse it for display but keep a cleanup warning until `hungarian` is structured.
- Include noun article and plural when present in the notes.
- Include present, past, and perfect forms for verbs when known from source or approved curation; otherwise show a missing-form checklist instead of inventing confident forms.
- Mark irregular verbs clearly.
- Drop table header rows such as `German`, `Német`, `Hungarian`, `Magyar`, `Notes`, and markdown divider rows.

## Grammar guidelines

Published shape:

```js
{
  kind: 'grammar',
  title: 'Konjunktiv II with würde',
  rule: 'Use würde + infinitive for polite or hypothetical statements.',
  source_example: 'Ich würde mich bewerben.',
  generated_exercise: {
    prompt: 'Transform the sentence into a polite Konjunktiv II form.',
    item: 'Ich bewerbe mich.',
    expected_answer: 'Ich würde mich bewerben.'
  },
  notice: 'Watch the reflexive pronoun position.'
}
```

Rules:

- Generate one mini-exercise per grammar object; do not publish a raw grammar note as a paragraph.
- Keep one rule or transformation per card.
- Reuse source examples from the uploaded notes.
- If a sentence was misclassified as grammar but is actually reading or writing seed text, move it to the correct section or flag `source_cleanup_needed`.
- Keep Hungarian explanation short and only when it helps the learner act.

## Reading guidelines

Published shape:

```js
{
  kind: 'reading',
  mode: 'source_sentence' | 'generated_passage',
  passage: 'Die Bewerberin erfüllt alle Voraussetzungen für die Stelle.',
  generated_questions: [
    {
      type: 'comprehension',
      question: 'Welche Voraussetzungen erfüllt die Bewerberin?',
      expected_answer_hint: 'Sie erfüllt alle Voraussetzungen für die Stelle.'
    }
  ],
  required_vocab: ['sich bewerben'],
  citation_note: 'Based on uploaded Lesson <n> reading seed.'
}
```

Rules:

- Generate comprehension questions/cards from the source text; do not only copy the reading paragraph.
- If the upload provides only one source sentence, publish a source-sentence exercise, not a fake article.
- Only generate a longer B2 reading passage when the notes contain enough vocabulary/topic material to support it; label it as generated practice derived from the uploaded note.
- Never introduce external articles unless an external source is explicitly uploaded/cited.
- Questions must be answerable from the displayed passage or source sentence.

## Writing guidelines

Published shape:

```js
{
  kind: 'writing',
  prompt_type: 'short_answer' | 'short_essay' | 'formal_note',
  prompt: 'Write a short formal application note using the Lesson 1 phrase.',
  expected_length: '60-90 words',
  required_reuse: ['sich bewerben'],
  starter: 'Sehr geehrte Damen und Herren, ich interessiere mich für Ihre Anzeige.',
  help_words: ['Voraussetzung', 'Erfahrung', 'regelmäßig'],
  checklist: [
    'uses the formal opening from the note',
    'reuses sich bewerben or an inflected form',
    'includes one reason or qualification'
  ]
}
```

Rules:

- Generate a constrained prompt, word count, help-word bank, and checklist; do not publish the raw writing seed alone.
- Required reuse words must come from the uploaded note.
- Keep tasks B2-appropriate and short enough for the webpage.
- Lock or mark long-essay tasks unavailable when the note set is too thin.
- Do not ask for topics or exam parts that the current note set does not support.

## Review gates before publishing

A normalized lesson can be shown as `review` or `published` only when:

- every learner-facing object has a source id or source file
- vocabulary cards have Hungarian glosses or visible cleanup warnings
- grammar objects include generated exercises, not raw notes only
- reading objects include generated questions and do not fake missing article text
- writing objects include generated prompts, required reuse, and a length/scope constraint
- parser noise has been removed or flagged
- validation issues are visible in the admin/review surface

If these gates are not met, keep the lesson in `needs_edit` and show only safe source-backed seed states on the learning page.
