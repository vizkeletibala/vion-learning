# Grammar Task Create

## Purpose

Create one small German B2 grammar exercise block from uploaded notes for webpage publishing. The note provides the source rule/example; the published object must be a generated mini-exercise or card, not a copied grammar paragraph.

## Input seed

Accept section-scoped grammar seeds such as:

- a named rule under `## Grammar`
- a transformation pattern from the note
- one or two source examples that demonstrate the rule

Move or flag misclassified content. Reading sentences, writing starters, table headers, and section labels must not become grammar cards just because the parser placed them in the grammar bucket.

## Output shape

```js
{
  kind: 'grammar',
  title: String,
  rule: String,
  source_example: String,
  generated_exercise: {
    prompt: String,
    item: String,
    expected_answer: String | undefined,
    answer_hint: String | undefined
  },
  notice: String,
  hungarian_explanation: String | undefined,
  source_id: String,
  source_file: String,
  generated_from_note: true,
  validation_issues: [String]
}
```

## Must include

- one grammar point or transformation only
- one or two source-backed German examples
- a generated exercise prompt, cloze, transformation, or noticing task
- a short note about what the learner should notice
- source id/source file/provenance fields
- cleanup warning when the source seed is incomplete or misclassified

## Avoid

- long grammar essays
- multiple unrelated rules in one card
- publishing raw notes without an exercise
- invented textbook examples that do not reuse uploaded-note material
- counting section headings or table labels as grammar content

## Webpage publishing rule

A grammar item is publishable only when it gives the learner an action: transform, fill in, choose, notice, or explain a short pattern. If the upload contains only a rule label, keep it in `needs_edit` until an example or exercise can be generated safely.

## Quality checks

- Is the rule B2-relevant?
- Is the wording short enough to read on the learning page?
- Does the item make sense without extra lore?
- Is there a generated learner task beyond copied note text?
- Does every example come from or clearly reuse the uploaded note?
