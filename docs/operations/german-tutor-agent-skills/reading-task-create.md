# Reading Task Create

## Purpose

Create a short German B2 reading exercise grounded in uploaded notes for webpage publishing. The source text is evidence; the published object must include generated reading practice such as questions, answer hints, or a source-sentence task.

## Input seed

Accept section-scoped reading seeds such as:

- a source paragraph under `## Reading`
- a source sentence that can support a micro-exercise
- comprehension-question seeds from the uploaded note
- a cited uploaded chunk that contains article-like text

If the upload only contains one sentence, do not expand it into a fake article. Publish a source-sentence exercise or hold the article exercise as unavailable.

## Output shape

```js
{
  kind: 'reading',
  mode: 'source_sentence' | 'generated_passage',
  passage: String,
  generated_questions: [
    {
      type: 'comprehension' | 'vocab_in_context' | 'true_false',
      question: String,
      expected_answer_hint: String
    }
  ],
  required_vocab: [String],
  citation_note: String,
  source_id: String,
  source_file: String,
  generated_from_note: true,
  validation_issues: [String]
}
```

## Must include

- lesson vocabulary reused naturally when enough source material exists
- a readable B2-level passage or clearly labeled source sentence
- 2-4 generated comprehension questions when the passage is long enough
- at least one generated question for a source-sentence exercise
- answer hints that are supported by the displayed text
- source id/source file/provenance fields

## Avoid

- external articles unless explicitly uploaded or cited
- pretending a single seed sentence is a full article
- overly long passages
- questions that only ask for copying words with no comprehension
- generated facts that are not supported by the note

## Webpage publishing rule

The reading tab should show practice, not a pasted reading note. A publishable reading object pairs source-backed text with generated questions and answer hints. When the source is too thin, publish a locked/unavailable state instead of hallucinating article content.

## Quality checks

- Does the reading reuse the lesson vocabulary naturally?
- Are the questions answerable from the passage?
- Is the tone simple enough for exam prep without becoming childish?
- Is there a generated exercise/card beyond copied note text?
- Is the difference between source text and generated practice clear?
