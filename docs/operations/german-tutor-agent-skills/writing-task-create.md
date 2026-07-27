# Writing Task Create

## Purpose

Create a German B2 writing prompt that forces the learner to use uploaded-note material. The published object must be a generated task with constraints, not a copied writing seed or bare topic line.

## Input seed

Accept section-scoped writing seeds such as:

- a prompt or topic under `## Writing`
- a starter sentence from the note
- lesson vocabulary that should be reused
- support words or phrases from the uploaded note

Hold the task for review when the notes do not provide enough vocabulary, starter text, or topic context to make a useful prompt.

## Output shape

```js
{
  kind: 'writing',
  prompt_type: 'short_answer' | 'short_essay' | 'formal_note' | 'long_essay_unavailable',
  prompt: String,
  expected_length: String,
  required_reuse: [String],
  starter: String | undefined,
  help_words: [String],
  checklist: [String],
  source_id: String,
  source_file: String,
  generated_from_note: true,
  validation_issues: [String]
}
```

## Must include

- a generated prompt with a clear task verb
- expected length or scope, such as `5-6 sentences` or `60-90 words`
- 3-8 support words or phrases from the notes when available
- required reuse vocabulary from the uploaded note
- a short checklist that lets the learner self-check the answer
- source id/source file/provenance fields

## Avoid

- vague prompts like “write something”
- publishing raw starter sentences as if they were complete tasks
- prompts that require sources the lesson does not contain
- asking for exam sections unrelated to the current note set
- long essays when the source packet only supports a short answer or formal note

## Webpage publishing rule

A writing item is publishable only when it provides a constrained practice task: prompt, length, required reuse, helper words, and checklist. If the upload provides only a seed sentence, label it as a starter and generate a short safe task around it; if even that is not possible, show an unavailable state.

## Quality checks

- Would the learner know exactly what to write?
- Can the prompt be answered using the lesson vocabulary?
- Is the task useful for B2 exam practice instead of busywork?
- Is there generated practice guidance beyond copied note text?
- Are all required reuse words present in the uploaded notes?
