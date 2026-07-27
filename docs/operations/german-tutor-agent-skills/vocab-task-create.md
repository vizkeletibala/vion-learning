# Vocab Task Create

## Purpose

Create a German B2 vocabulary card from uploaded notes for webpage publishing. The uploaded row or bullet is the source seed; the learner-facing result must be a generated study card, not copied note text.

## Input seed

Accept section-scoped vocab seeds from uploaded markdown/txt/PDF extraction, for example:

- markdown table rows under `## Vocab`
- bullets such as `sich bewerben — jelentkezni`
- source examples that clearly introduce a term

Discard parser noise before card creation: table headers, divider rows, repeated section titles, empty cells, page numbers, and OCR fragments.

## Output shape

```js
{
  kind: 'vocab',
  term: String,
  hungarian: String,
  part_of_speech: String | undefined,
  article: String | undefined,
  plural: String | undefined,
  verb_forms: { present?: String, past?: String, perfect?: String },
  irregular: Boolean | undefined,
  front: String,
  back: String,
  learner_task: String,
  source_id: String,
  source_file: String,
  generated_from_note: true,
  validation_issues: [String]
}
```

## Must include

- a generated front/back card layout
- at least one Hungarian meaning, structured as `hungarian` when possible
- article/plural for nouns when the note provides them
- present, past, and perfect forms for verbs when source or approved curation provides them
- missing-form warnings when verb forms are absent
- one short reuse task, cloze, or self-test prompt generated from the note
- source id/source file/provenance fields

## Avoid

- publishing the raw table row as the card body
- duplicate synonyms in the same card unless the distinction matters
- table headers or formatting noise in the item text (`German`, `Német`, `Hungarian`, `Magyar`, `Notes`, `Megjegyzés`)
- pretending an inflected form is a standalone verb unless it truly is
- inventing dictionary expansions that are not in the note or explicitly curated

## Webpage publishing rule

The webpage card should help the learner memorize and reuse the term. It may show a compact source note, but the primary visible content must be the generated card: term, Hungarian gloss, useful forms, and a reuse exercise.

## Quality checks

- Would a learner know what to memorize from the front side?
- Would the back side let them answer quickly in Hungarian?
- Is there a generated task or card interaction beyond copied source text?
- Is the item clean enough to survive extraction without becoming junk?
- Is every non-source addition conservative and clearly derived from the note?
