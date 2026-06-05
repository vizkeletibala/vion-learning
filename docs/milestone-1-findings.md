# Milestone 1 findings: content quality before any vector DB

Date: 2026-06-05

## What is making the current CLF-C02 quiz feel shallow

1. **The generated question model is effectively one template.**
   - `buildQuestion()` in `src/lib/learningModel.js` turns every card into the same shape:
     - one generic prompt wrapper
     - one generic correct-answer pattern
     - three generic anti-exam-dump distractors
   - Result: questions feel like metadata checks, not exam-prep decisions.

2. **Correct answers are trivial and repetitive.**
   - The current correct answer often collapses to the card/domain label instead of testing a real AWS decision.
   - Example from live output: multiple CLF-C02 questions have `"Cloud Concepts"` as the correct option.

3. **Distractors are weak and implausible.**
   - Wrong answers are mostly variations of:
     - memorizing exam questions
     - skipping conceptual understanding
     - being unrelated to the task statement
   - They do not resemble the service-comparison traps or responsibility-boundary mistakes seen in real foundational AWS study.

4. **Explanations repeat the same wording.**
   - Correct explanations are nearly identical across questions.
   - Distractor explanations are generic and rarely teach why a nearby AWS service or concept would be tempting but wrong.

5. **Quick 10 lacks variety controls.**
   - `createQuiz()` currently takes the question pool in source order and `repeatToCount()` just cycles through it.
   - There is no intentional balancing by question type, difficulty, domain, service family, or answer-position spread.

6. **There is already a mapping bug in generated content.**
   - `buildQuestion()` reads `card.task_statement_id`, but generated resource cards store `topic_id` instead.
   - Result: some explanations render `task statement undefined`, which is the sort of little lie machines tell when nobody is supervising them.

## Implementation direction

- Keep the app static/local/private-first.
- Add a richer **CLF-C02 concept record** schema for deeper study content.
- Add a curated **CLF-C02 question bank** with scenario-based, original questions and per-distractor teaching.
- Keep **AIF-C01 isolated** on its existing source set.
- Improve quiz assembly so Quick 10 deliberately mixes:
  - domain coverage
  - question types
  - difficulty
  - answer positions
- Add tests for:
  - track isolation
  - required mappings/explanations
  - distractor uniqueness
  - Quick 10 variety
  - answer-position bias guard
