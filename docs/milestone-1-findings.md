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
  
## Questions and answer options that need to be clearer

The following examples were hard to parse because the prompt, the intent, and the answer choices were mashed together. They need to read like proper exam-style questions instead of half-broken notes.

### Confusing example 1

**Question:**
For CLF-C02 Cloud Concepts, which answer best reflects the AWS Cloud design principles?

**Why it was confusing:**
The wording jumped straight to a topic label instead of a specific decision or scenario.

**Clearer version:**
A team is comparing AWS Cloud design principles for a new application. Which answer best describes how AWS Well-Architected guidance applies to Cloud Concepts?

**Better answer choices:**
- Operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability
- One service feature such as security alone
- Memorizing exam questions instead of understanding service tradeoffs
- Cloud Concepts terminology from another domain

### Confusing example 2

**Question:**
Which answer best matches the prompt about AWS Well-Architected Framework and Cloud Concepts?

**Why it was confusing:**
The original note mixed the rationale, the domain, and the wrong-answer explanation into one line.

**Clearer version:**
A student is reviewing CLF-C02 Task 1.2 and needs the best description of AWS Cloud design principles. Which option is most accurate?

**Better answer choices:**
- AWS Well-Architected Framework principles are the correct lens for evaluating Cloud Concepts
- A single feature like operational excellence is enough on its own
- Any unrelated AWS service name will work
- The question is asking about exam memorization strategy

## Question I liked, found well orchestrated and clear

### Example 1

**Question:**
A company runs production workloads on AWS and wants faster support response and more operational guidance than Basic support provides. Which answer is the BEST fit?

**Why it works:**
The scenario is realistic, the need is specific, and the distractors are believable without being nonsense.

**Answer choices:**
- Enable S3 Versioning
- Create a new VPC
- Use Spot Instances only
- Choose a higher-tier AWS Support plan such as Business or Enterprise based on the required coverage

### Example 2

**Question:**
Which practice is MOST aligned with AWS security guidance for the account root user?

**Why it works:**
It asks for one clear best practice and the wrong answers are obviously unsafe without being cartoonish.

**Answer choices:**
- Disable all IAM users so the root user is the only identity
- Enable MFA on the root user and avoid using it for routine daily tasks
- Share the root credentials with the admin team to avoid lockout
- Use the root user for applications running on EC2