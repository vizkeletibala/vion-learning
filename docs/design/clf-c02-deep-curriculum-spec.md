# CLF-C02 Deep Curriculum Structure and Resource Taxonomy

Goal: make the CLF-C02 track teach AWS Certified Cloud Practitioner concepts deeply enough for a true beginner to progress from zero AWS knowledge to CLF-C02 readiness, while preserving the hard CLF-C02/AIF-C01 separation model already defined in `docs/design/vion-learning-ux-spec.md`.

Inputs accounted for:
- Current app/data model: `src/lib/learningModel.js`, `server/index.js`, `src/main.jsx`, `data/sources/clf-c02/*`, `data/sources/aif-c01/*`.
- Existing UX separation spec: `docs/design/vion-learning-ux-spec.md`.
- Official-source CLF-C02 research handoff: `docs/research/clf-c02-deep-resource-map.md`.
- Beginner service/resource corpus: `data/sources/clf-c02/resource_explanation_corpus.json` and `.md`.

Non-goals:
- Do not introduce copied exam questions, brain dumps, or unauthorized question material.
- Do not merge CLF-C02 and AIF-C01 content after track selection.
- Do not refactor the entire app before proving value with a small CLF-C02 slice.

---

## 1. Current-state observations

The current implementation is intentionally compact and source-linked, but it is too shallow for deep CLF-C02 learning:

1. `src/lib/learningModel.js` builds each track from three seed files: `source_metadata.json`, `seed_outline.json`, and `learning_cards.json`.
2. Current CLF-C02 cards are mostly one prompt per official task statement, with `expected_answer_points` rendered into a short answer and generated explanation.
3. Quiz questions are generated mechanically from cards. The correct option is always `a`; distractors are generic anti-brain-dump warnings rather than plausible beginner misconceptions.
4. The existing track-scoped route model is good and should stay: `/` shows both tracks; `/tracks/clf-c02/*` and `/tracks/aif-c01/*` must remain fully separated.
5. The new research artifacts materially change the CLF-C02 content plan:
   - The deep resource map identifies domain/task/resource-family gaps, source gaps, and a prioritized content backlog.
   - The resource explanation corpus provides 91 beginner-friendly entries across 11 AWS families, including priority labels, analogies, explanations, use cases, clue phrases, misconceptions, adjacent-service comparisons, and official AWS source URLs.

Design implication: keep the app shell and track isolation, but enrich CLF-C02 data and rendering around service/resource-level curriculum objects instead of only task-statement seed cards.

---

## 2. Recommended curriculum taxonomy

Use this hierarchy for CLF-C02 curriculum and content authoring:

```text
Track: clf-c02
  Domain
    Objective / task statement
      AWS service or resource family
        Concept
          Learning card
          Original quiz question
          Comparison card
          Scenario drill
          Console/sandbox lab
          Glossary term
          Source reference
```

### 2.1 Domain layer

Use the official CLF-C02 domains from `data/sources/clf-c02/source_metadata.json`:

1. Cloud Concepts — 24%
2. Security and Compliance — 30%
3. Cloud Technology and Services — 34%
4. Billing, Pricing, and Support — 12%

Coder-ready acceptance criteria:
- The CLF-C02 domain model preserves official `domain_id`, `name`, `weight_percent`, and `task_statements`.
- Domain weights are displayed in CLF-C02 views and used for prioritization/readiness scoring.
- Domain 2 and Domain 3 content is treated as higher priority because together they represent 64% of the exam.
- No AIF-C01 domain/objective appears in the CLF-C02 domain tree.

### 2.2 Objective / task statement layer

Each domain contains official task statements already present in `source_metadata.json` and `seed_outline.json`.

Recommended normalized shape:

```ts
type Objective = {
  id: string;                  // e.g. "3.3"
  track_id: 'clf-c02';
  domain_id: string;           // e.g. "3"
  statement: string;           // official task statement
  topic_labels: string[];      // source metadata topics
  resource_family_ids: string[];
  concept_ids: string[];
  source_ref_ids: string[];
  last_verified_date: string;
};
```

Coder-ready acceptance criteria:
- Every CLF-C02 objective maps to at least one resource family or concept.
- Objectives can list concepts that are not AWS services, such as `shared-responsibility-model`, `well-architected-framework`, `economies-of-scale`, and `support-plans`.
- Objective pages can render all linked service/resource families without reading from AIF-C01 data.

### 2.3 AWS service/resource family layer

Use `data/sources/clf-c02/resource_explanation_corpus.json` as the first CLF-C02 resource-family source. It contains 91 entries across these families:

- Global infrastructure
- IAM/security
- Compute
- Storage
- Networking/CDN
- Databases/analytics
- Integration/app
- Management/observability
- Billing/cost
- Migration
- AI/ML basics

Recommended normalized shape:

```ts
type ResourceFamily = {
  id: string;                       // stable slug, e.g. "clf-c02-resource-amazon-s3"
  track_id: 'clf-c02';
  name: string;                     // "Amazon S3"
  family: string;                   // "Storage"
  priority: 'P0' | 'P1' | 'P2';
  depth: 'core' | 'supporting' | 'recognition';
  domain_ids: string[];
  objective_ids: string[];
  concept_ids: string[];
  comparison_group_ids: string[];
  source_ref_ids: string[];
  last_verified_date: string;
};
```

Priority mapping:
- `P0` -> `core`: must be taught with service page, cards, questions, comparisons, and source links.
- `P1` -> `supporting`: should have service page, at least one card/question, comparisons where useful.
- `P2` -> `recognition`: should be recognizable with a concise page/card and source link; do not over-teach.

Coder-ready acceptance criteria:
- Import/render the 91-entry corpus without dropping fields needed for beginner mental models.
- Preserve `priority`, `family`, `official_docs_url`, and all `source_urls`.
- Use `cert` from corpus entries only if it equals `clf-c02`; reject or ignore mismatched entries.
- Resource pages show priority/depth so learners know whether to deeply understand or simply recognize a service.

### 2.4 Concept layer

Concepts are teachable units under services/resource families. Examples:

- Global infrastructure: Region, Availability Zone, edge location, Local Zone, Wavelength, regional vs global service.
- IAM/security: root user, IAM user/group/role/policy, MFA, least privilege, SCP, KMS key, shared responsibility boundary.
- Compute: instance, AMI, instance family, scaling policy, load balancer, function, container, managed platform.
- Storage: object, block volume, file system, storage class, lifecycle policy, archive retrieval.
- Networking: VPC, subnet, route table, internet gateway, NAT gateway, VPC endpoint, security group, NACL, CDN cache.
- Cost: estimate, analyze, alert, allocate, reserve/commit, free tier, support plan.

Recommended normalized shape:

```ts
type Concept = {
  id: string;
  track_id: 'clf-c02';
  name: string;
  plain_definition: string;
  analogy?: string;
  why_it_matters: string;
  beginner_misconceptions: string[];
  exam_clue_phrases: string[];
  source_ref_ids: string[];
  resource_family_ids: string[];
  objective_ids: string[];
};
```

Coder-ready acceptance criteria:
- Concepts can be linked to multiple objectives/domains when appropriate.
- Concept text is original and beginner-friendly.
- Concepts support a glossary view and can be reused by service pages, cards, comparisons, and quiz explanations.

### 2.5 Learning cards, questions, comparisons, scenario drills, and labs

Use separate content types rather than stretching one generic card shape to do everything.

```ts
type LearningCard = {
  id: string;
  track_id: 'clf-c02';
  domain_ids: string[];
  objective_ids: string[];
  resource_family_ids: string[];
  concept_ids: string[];
  card_type: 'definition' | 'mental-model' | 'gotcha' | 'pricing' | 'security' | 'comparison' | 'scenario' | 'lab-prep';
  prompt: string;
  short_answer: string;
  detailed_explanation: string;
  why_it_matters_for_exam: string;
  beginner_misconceptions: string[];
  source_ref_ids: string[];
  last_verified_date: string;
  status?: 'new' | 'learning' | 'review' | 'known';
};

type PracticeQuestion = {
  id: string;
  track_id: 'clf-c02';
  domain_ids: string[];
  objective_ids: string[];
  resource_family_ids: string[];
  concept_ids: string[];
  question_type: 'multiple-choice' | 'multiple-response';
  stem: string;
  options: { id: string; label: string; explanation: string; misconception_tag?: string }[];
  correct_option_ids: string[];
  source_ref_ids: string[];
  authoring_note: 'original-no-exam-dump';
  difficulty: 'foundation' | 'intermediate' | 'readiness';
};

type ComparisonCard = {
  id: string;
  track_id: 'clf-c02';
  title: string;                    // "S3 vs EBS vs EFS vs FSx"
  resource_family_ids: string[];
  compare_on: string[];             // e.g. access pattern, durability, pricing, use case
  rows: { resource_family_id: string; cells: Record<string, string> }[];
  exam_clue_summary: string;
  source_ref_ids: string[];
};

type ScenarioDrill = {
  id: string;
  track_id: 'clf-c02';
  title: string;
  persona: 'beginner-admin' | 'finance' | 'security' | 'developer' | 'business-stakeholder';
  scenario: string;
  learner_task: string;
  expected_reasoning_points: string[];
  linked_question_ids: string[];
  linked_card_ids: string[];
  source_ref_ids: string[];
};

type ConsoleLab = {
  id: string;
  track_id: 'clf-c02';
  title: string;
  cost_risk: 'free-tier-likely' | 'low' | 'cost-risk' | 'avoid-without-sandbox';
  prerequisites: string[];
  steps: string[];
  observe: string[];
  cleanup_required: boolean;
  cleanup_steps: string[];
  source_ref_ids: string[];
};
```

Coder-ready acceptance criteria:
- Quiz questions no longer depend on generated `correct_option_id: 'a'` behavior.
- Answer options can be shuffled while preserving correctness and explanations.
- Every wrong option explanation identifies a real misconception from the corpus/research handoff.
- Comparison cards exist for the core comparison groups listed in section 4.
- Console labs include explicit cost warnings and cleanup gates before completion.

---

## 3. Recommended app/data model changes

### 3.1 File layout

Keep current seed files, but add CLF-C02-specific enriched data files rather than rewriting all tracks at once:

```text
data/sources/clf-c02/
  source_metadata.json                      existing
  seed_outline.json                         existing
  learning_cards.json                       existing shallow seed
  resource_explanation_corpus.json          existing research artifact
  resource_families.json                    new normalized app-ready import
  concepts.json                             new
  enriched_learning_cards.json              new
  practice_questions.json                   new original questions
  comparison_cards.json                     new
  scenario_drills.json                      new
  console_labs.json                         new or future expansion
  source_refs.json                          new normalized source table
```

Do not create equivalent AIF-C01 enriched files until that track has its own research and acceptance criteria.

Coder-ready acceptance criteria:
- `loadLearningModel()` still loads both tracks.
- CLF-C02 loading path uses enriched files when present; AIF-C01 continues to use existing seed behavior.
- Missing enriched CLF-C02 files fail gracefully during incremental rollout: use existing seed cards for absent content types but do not mix AIF-C01 fallback data.
- Every new CLF-C02 enriched record includes `track_id: 'clf-c02'`.

### 3.2 Source citations and freshness

Normalize sources so that cards/questions/comparisons can refer to source ids instead of duplicating URLs.

```ts
type SourceRef = {
  id: string;
  track_id: 'clf-c02';
  title: string;
  url: string;
  source_type: 'exam-guide' | 'aws-docs' | 'aws-product-page' | 'whitepaper' | 'skill-builder' | 'support-docs';
  retrieved_date: string;
  last_verified_date: string;
  status: 'verified' | 'review-soon' | 'stale' | 'conflict' | 'unavailable';
  notes?: string;
};
```

Coder-ready acceptance criteria:
- Service pages, cards, quiz reviews, comparisons, labs, and source report can render official-source links with last verified date.
- Source freshness badges surface anywhere dependent content appears.
- Source URLs from `resource_explanation_corpus.json` are preserved and normalized.
- Official AWS sources remain first-class; optional supplemental sources must be clearly marked if added later.

### 3.3 Service explanations

Service/resource pages should render the full beginner corpus fields:

- simple analogy
- plain-English explanation
- real-world use case
- exam clue phrases
- common misconceptions
- adjacent-service comparison
- official docs URL/source links
- priority/depth

Additional fields from the deep resource map should be added when authoring `resource_families.json`:

- what it is
- when to use it
- what it is NOT
- pricing/billing angle
- security/shared-responsibility angle
- exam-style gotchas
- source verification date

Coder-ready acceptance criteria:
- The first CLF-C02 service page can be built directly from one entry in `resource_explanation_corpus.json` plus normalized source refs.
- Service pages expose linked cards/questions/comparisons/labs for that service.
- Service pages never render AIF-C01 concept sections.

### 3.4 Mental models and diagrams

Represent diagrams as optional data rather than requiring an image pipeline for the first slice.

```ts
type MentalModel = {
  id: string;
  track_id: 'clf-c02';
  title: string;
  model_type: 'text-diagram' | 'mermaid' | 'svg' | 'image';
  body: string;
  linked_resource_family_ids: string[];
  linked_concept_ids: string[];
  source_ref_ids: string[];
};
```

Initial recommended diagrams/mental models:
- Region -> AZ -> subnet -> resource placement.
- Shared responsibility shifts: EC2 vs RDS/Aurora vs Lambda vs S3 vs managed AI services.
- Storage comparison: S3 object vs EBS block vs EFS file vs FSx managed file system.
- Networking basics: VPC, subnets, route tables, internet gateway, NAT gateway, security group, NACL.
- Cost tools flow: estimate with Pricing Calculator, analyze with Cost Explorer/CUR, alert with Budgets, optimize with Trusted Advisor/Compute Optimizer.

Coder-ready acceptance criteria:
- Mental models are track-scoped content records.
- The first implementation may render `model_type: 'text-diagram'` in plain HTML without adding diagram libraries.
- Linked source refs and last verified dates are visible.

### 3.5 Progress and remediation

Weak-area remediation should operate at four levels:

1. Domain weakness: low score in a weighted domain.
2. Objective weakness: missed questions linked to a task statement.
3. Service/resource weakness: repeated misses around a service, e.g. S3 vs EBS.
4. Concept weakness: misconception tags from wrong options, e.g. `object-vs-block-storage`, `monitoring-vs-auditing`, `estimate-vs-alert-costs`.

Coder-ready acceptance criteria:
- `evaluateAnswer()` records `domain_ids`, `objective_ids`, `resource_family_ids`, `concept_ids`, and `misconception_tags` from the answered question.
- Weakness drills can filter by domain, resource family, or misconception tag.
- Next actions can link to a service page, comparison card, or card queue rather than only a generic domain review.

---

## 4. Core CLF-C02 comparison cards to author first

Comparison cards are the fastest way to turn beginner service facts into exam-ready reasoning. Start with these groups from the research backlog:

1. Storage: S3 vs EBS vs EFS vs FSx vs S3 Glacier classes.
2. Compute: EC2 vs Lambda vs ECS/EKS/Fargate vs Elastic Beanstalk vs Lightsail.
3. Databases/caching: RDS/Aurora vs DynamoDB vs ElastiCache/MemoryDB vs Neptune.
4. Networking/security: security group vs NACL vs WAF vs Shield.
5. Observability/audit/governance: CloudWatch vs CloudTrail vs Config vs Trusted Advisor.
6. Cost tools: Pricing Calculator vs Cost Explorer vs Budgets vs CUR vs consolidated billing.
7. Identity/governance: IAM users/groups/roles/policies vs IAM Identity Center vs Organizations/SCPs vs Cognito.
8. Migration: DMS vs Application Migration Service vs Migration Hub vs Snow Family.

Coder-ready acceptance criteria:
- Each comparison has columns for use case, what it is not, beginner confusion, pricing angle, security/shared-responsibility angle, clue phrases, and official sources.
- Comparison cards are linked from each participating service page and from quiz review remediation.
- Comparison text remains original and does not imitate official sample questions.

---

## 5. Beginner learning progression

Design a progression that assumes the learner has zero AWS knowledge.

### Stage 0: Orientation and safety

Goal: understand what CLF-C02 is, how Vion Learning works, and how not to create surprise AWS charges.

Content:
- What Cloud Practitioner measures and does not measure.
- What cloud computing means: variable cost, elasticity, global infrastructure, managed services.
- Source ethics: original practice only, no dumps.
- Console/sandbox safety: budgets, cleanup, avoid paid services without intent.

Acceptance criteria:
- New CLF-C02 learners see an orientation card before service drills.
- Orientation links to official exam facts and source verification date.
- Cost-safety warnings appear before any console guide.

### Stage 1: Cloud mental model foundations

Goal: explain AWS as global regions, managed services, security boundary, and pay-as-you-go economics.

Recommended topics:
- Regions, AZs, edge locations.
- High availability, elasticity, scalability, agility.
- Well-Architected Framework.
- Cloud Adoption Framework and migration basics.
- Shared responsibility model at a high level.
- Cloud economics: capex/opex, variable costs, rightsizing, managed services.

Acceptance criteria:
- Learner can explain Region vs AZ vs edge location.
- Learner can distinguish AWS responsibility vs customer responsibility at a high level.
- Learner can identify basic cloud economic benefits and tradeoffs.

### Stage 2: Core service families

Goal: build recognition and use-case reasoning for the major CLF-C02 services.

Recommended order:
1. IAM/security and shared responsibility.
2. Compute: EC2, Lambda, containers, Beanstalk, scaling/load balancing.
3. Storage: S3, EBS, EFS, FSx, Glacier classes, lifecycle, backup.
4. Networking/CDN: VPC basics, subnets/routes/gateways, SG/NACL, Route 53, CloudFront, Direct Connect/VPN.
5. Databases/analytics: RDS/Aurora, DynamoDB, ElastiCache, Redshift/Athena/Glue/QuickSight.
6. Operations: CloudWatch, CloudTrail, Config, Systems Manager, CloudFormation, Trusted Advisor.
7. Billing/support: Pricing Calculator, Cost Explorer, Budgets, CUR, Organizations consolidated billing, Support plans.
8. Migration and recognition-level services.

Acceptance criteria:
- P0 services from the 91-entry corpus have service pages and cards before P1/P2 expansion.
- Learner can choose a likely service for common beginner scenarios using original explanations.
- Each service page includes misconception and adjacent-service comparison sections.

### Stage 3: Comparison and scenario reasoning

Goal: move from memorizing service definitions to choosing between services in scenario language.

Recommended drills:
- Object vs block vs file storage.
- Server-based vs serverless vs container compute.
- Monitor metrics vs audit API calls vs record configuration changes.
- Estimate costs vs analyze historical spend vs alert on thresholds.
- Identity for workforce vs app users vs account governance.
- Public web protection vs network-layer security controls.

Acceptance criteria:
- Weakness drills can be generated from missed comparison questions.
- Each scenario drill links back to at least one comparison card and source-backed service page.
- Wrong answer explanations teach the misconception, not just the correct answer.

### Stage 4: Exam readiness

Goal: validate broad coverage without relying on unauthorized exam material.

Recommended activities:
- Quick 10 daily mixed practice.
- Domain drills weighted by official domain percentages.
- Full 65-question timed simulation using original questions only.
- Review remediation by weak domain/objective/service/concept.
- Final source freshness check for official exam facts.

Acceptance criteria:
- Full simulation uses 65 original questions and 90-minute timing.
- Simulation review shows domain/objective/resource breakdown.
- Readiness checklist requires recent full simulation, no critical weak P0 areas, and current source verification.

---

## 6. Keeping AIF-C01 separated while expanding CLF-C02

The current invariant from `docs/design/vion-learning-ux-spec.md` remains mandatory:

CLF-C02 and AIF-C01 may appear together only on the landing page. After a user selects a track, every route, dashboard, card, quiz, study plan, progress view, console guide, source report, and stored progress record must be track-scoped and must not render mixed certification content.

Implementation rules:

1. Data rule: every content record must include `track_id`.
2. Loader rule: CLF-C02 enriched loaders only read from `data/sources/clf-c02/*`.
3. Route rule: every content API remains under `/api/tracks/:trackId/*`.
4. Validation rule: if route `trackId` and record `track_id` differ, return an error instead of silently filtering.
5. UI rule: track shell components receive `trackId` and never fetch global card/question pools.
6. Progress rule: readiness, card states, quiz history, weak areas, and remediation remain keyed by track.
7. Search/glossary rule: if cross-track search is ever added, search results must visibly group by track and navigate into track-scoped routes; no mixed detail page.
8. Shared component rule: components may be reused across tracks, but content queries and props must be track-scoped.

Coder-ready acceptance criteria:
- Existing CLF-C02/AIF-C01 landing behavior remains unchanged except for richer CLF-C02 summary counts.
- Expanding CLF-C02 does not require adding placeholder AIF-C01 records.
- Tests cover at least one negative case where a CLF-C02 route rejects an AIF-C01 card/question id.
- Source reports show CLF-C02 source refs only under `/tracks/clf-c02/sources` and AIF-C01 source refs only under `/tracks/aif-c01/sources`.

---

## 7. UX/content presentation recommendations

### 7.1 Service/resource pages

Route examples:
- `/tracks/clf-c02/services`
- `/tracks/clf-c02/services/:resourceFamilyId`

Page anatomy:
- Header: service/resource name, family, priority, linked domains/objectives, source freshness.
- Beginner mental model: analogy + plain-English explanation.
- Use cases: when to use it.
- What it is not: boundaries and anti-patterns.
- Common misconceptions.
- Pricing/billing angle.
- Security/shared-responsibility angle.
- Exam clue phrases.
- Adjacent services/comparisons.
- Linked cards/questions/scenario drills/labs.
- Official-source links with verified date.

Acceptance criteria:
- P0 service pages render all available corpus fields.
- Source links are visible above the fold or in a dedicated source panel.
- Page has CTA buttons: `Review cards`, `Take service drill`, `Open comparison`, `View source`.

### 7.2 Comparison cards

Route examples:
- `/tracks/clf-c02/comparisons`
- `/tracks/clf-c02/comparisons/storage-object-block-file`

Presentation:
- Matrix/table for services.
- Short decision summary: “Use X when…, use Y when…”
- Misconception callouts.
- Original scenario mini-drill.
- Source links per row.

Acceptance criteria:
- Comparison cards are linked from service pages and quiz remediation.
- The storage, compute, monitoring/audit, and cost-tools comparisons are included in the first authoring backlog.

### 7.3 Scenario drills

Presentation:
- Plain-English scenario.
- “What is the best fit and why?” learner prompt.
- Revealable reasoning checklist.
- Follow-up multiple-choice/multiple-response question.
- Remediation links for missed misconceptions.

Acceptance criteria:
- Scenario drills are original and do not copy sample exam material.
- Scenario drill review shows linked domain/objective/service/concept ids.

### 7.4 Weak-area remediation

Presentation:
- Weak area cards grouped by domain, service, and misconception.
- Recommended next action: card, comparison, service page, or drill.
- Explain why the app thinks this is weak.

Acceptance criteria:
- A wrong answer can generate a remediation link to a comparison card, not only to a domain.
- Weak areas update from answer history and include service/concept ids where available.

### 7.5 Glossary

Route examples:
- `/tracks/clf-c02/glossary`
- `/tracks/clf-c02/glossary/:conceptId`

Presentation:
- Term, plain definition, analogy, related services, common misconception, source refs.
- Filters by domain/family/priority.

Acceptance criteria:
- Glossary is generated from CLF-C02 concepts/resource families only.
- Glossary terms link back to service pages and learning cards.

### 7.6 Official-source links and freshness

Presentation:
- Inline source links on service pages/cards/questions/review.
- Source report page with status and last verified date.
- Stale badges when verification is old or unknown.

Acceptance criteria:
- No enriched CLF-C02 page renders without at least one official AWS source ref unless explicitly marked `needs_source`.
- Source refs include `last_verified_date` and source type.

---

## 8. Smallest implementation slice that meaningfully improves content

Do not refactor the whole app first. Build a narrow CLF-C02 slice that proves the richer model.

### Slice goal

Add CLF-C02 service/resource pages and remediation-ready enriched cards for a small set of high-value P0 services, using the existing route shell and API pattern.

### Recommended first content set

Use 12–15 P0 entries from the 91-entry corpus:

- Global infrastructure: AWS Regions, Availability Zones, edge locations.
- IAM/security: IAM, shared responsibility model, Organizations/SCPs, KMS.
- Compute: EC2, Lambda, Auto Scaling/ELB.
- Storage: S3, EBS, EFS.
- Networking/CDN: VPC basics, security groups vs NACLs, CloudFront.
- Billing/cost: Pricing Calculator, Cost Explorer, Budgets.

If this is too large, start with 8 entries: Regions, AZs, IAM, shared responsibility, EC2, Lambda, S3, VPC.

### Minimal app changes

1. Add `resource_families` to the CLF-C02 track payload by reading `resource_explanation_corpus.json` directly or via a normalized `resource_families.json`.
2. Add route/API support:
   - `GET /api/tracks/:trackId/services`
   - `GET /api/tracks/:trackId/services/:serviceId`
3. Add UI section under CLF-C02 track nav:
   - `Services` tab or service panel within `Learn`.
4. Render service detail cards using existing CSS patterns.
5. Add at least one comparison card: S3 vs EBS vs EFS.
6. Replace generated quiz behavior only for this slice with a small hand-authored original question file, while leaving old generated questions as fallback elsewhere.

### Minimal tests

Add/extend Node tests to verify:
- CLF-C02 service endpoint returns CLF-C02-only resources.
- AIF-C01 service endpoint either returns an empty list or a track-specific “not implemented” payload, not CLF-C02 resources.
- Service detail endpoint rejects cross-track ids.
- Practice question correct answers are not position-fixed to `a` for enriched slice questions.
- Source refs exist for every first-slice service page.

### Acceptance criteria for first slice

Functional:
- `/tracks/clf-c02/learn` or `/tracks/clf-c02/services` exposes a service list for the first slice.
- Selecting a service opens a detail view with analogy, plain explanation, use case, misconceptions, adjacent comparison, and official source links.
- The first comparison card renders S3 vs EBS vs EFS with use cases, misconceptions, pricing angle, and source links.
- At least 10 original enriched practice questions exist for the first slice, with shuffled/non-fixed correct options and misconception-based distractors.

Separation:
- AIF-C01 pages do not show CLF-C02 service pages, cards, comparisons, or source refs.
- API responses for track routes include only records matching the requested `trackId`.

Quality:
- All new content is original and source-linked.
- All new records include `track_id`, source ids/URLs, and `last_verified_date`.
- The app still builds and tests pass.

---

## 9. Coder-ready task breakdown

### Task 1: Add CLF-C02 resource service loader

Objective: expose normalized CLF-C02 resource entries without touching AIF-C01 behavior.

Files:
- Modify: `src/lib/learningModel.js`
- Read: `data/sources/clf-c02/resource_explanation_corpus.json`

Requirements:
- Add loader logic for `trackId === 'clf-c02'` that reads `resource_explanation_corpus.json`.
- Normalize entries into `track.resourceFamilies` with `track_id: 'clf-c02'`.
- Map corpus fields: `id`, `family`, `name`, `priority`, `simple_analogy`, `plain_english_explanation`, `real_world_use_case`, `exam_clue_phrases`, `common_misconceptions`, `adjacent_services_comparison`, `official_docs_url`, `source_urls`.
- Reject entries where `cert !== 'clf-c02'`.

Verification:
- `/health` or a model test reports CLF-C02 resource count > 0 and AIF-C01 resource count = 0 unless AIF-C01 gets its own future corpus.

### Task 2: Add services API payloads

Objective: provide track-scoped service list/detail payloads.

Files:
- Modify: `src/lib/learningModel.js`
- Modify: `server/index.js`
- Test: `tests/*.test.js`

Endpoints:
- `GET /api/tracks/:trackId/services`
- `GET /api/tracks/:trackId/services/:serviceId`

Requirements:
- Return CLF-C02 service entries only when `trackId` is `clf-c02`.
- Return empty list or explicit `not_implemented_for_track` for AIF-C01; do not leak CLF-C02 entries.
- Service detail lookup must validate `record.track_id === trackId`.

Verification:
- Node tests assert cross-track rejection.

### Task 3: Add service UI tab/detail rendering

Objective: let learners browse beginner service explanations.

Files:
- Modify: `src/main.jsx`
- Modify: `src/styles.css`

Requirements:
- Add `services` to the CLF-C02 track nav without breaking existing tabs.
- Render service list grouped by family and priority.
- Render service detail cards or expandable rows with corpus fields and source links.
- Keep existing AIF-C01 UI functional; if the Services tab appears for AIF-C01, show a track-scoped empty state.

Verification:
- Manual check: `/tracks/clf-c02/services` shows only CLF-C02 resource entries.
- Manual check: `/tracks/aif-c01/services` does not show CLF-C02 resource entries.

### Task 4: Add first comparison card

Objective: teach one high-value comparison deeply.

Files:
- Create: `data/sources/clf-c02/comparison_cards.json`
- Modify: `src/lib/learningModel.js`
- Modify: `src/main.jsx`

First comparison:
- S3 vs EBS vs EFS.

Fields:
- use case
- what it is not
- beginner confusion
- pricing angle
- shared responsibility/security angle
- exam clue summary
- source refs/URLs

Verification:
- Comparison card appears from the S3/EBS/EFS service detail sections.

### Task 5: Add enriched original questions for first slice

Objective: stop relying only on generic generated questions for the first CLF-C02 services.

Files:
- Create: `data/sources/clf-c02/practice_questions.json`
- Modify: `src/lib/learningModel.js`
- Test: `tests/*.test.js`

Requirements:
- Author at least 10 original questions across first-slice services.
- Include `correct_option_ids` rather than a single hard-coded `correct_option_id`.
- Include explanations for each option.
- Use misconception tags from service pages/comparison cards.
- Shuffle or vary correct positions; tests should prove not all correct answers are `a`.

Verification:
- Quick quiz can include enriched questions.
- Answer review shows service/concept mapping and misconception-based remediation links.

### Task 6: Add source/freshness rendering for enriched content

Objective: make official sources visible and auditable.

Files:
- Modify: `src/lib/learningModel.js`
- Modify: `src/main.jsx`
- Optional create: `data/sources/clf-c02/source_refs.json`

Requirements:
- Each first-slice service and comparison displays official AWS links and last verified date.
- Source report includes enriched CLF-C02 service sources or links to them.
- Missing source refs produce a visible `needs_source` state during development, not silent omission.

Verification:
- Each first-slice service page has at least one official AWS source link.

---

## 10. Definition of done for the deeper CLF-C02 curriculum design

A future implementation satisfies this design when:

- CLF-C02 has a hierarchy from domain -> objective -> service/resource family -> concept -> cards/questions/labs.
- P0 CLF-C02 services have beginner-friendly service pages using the 91-entry corpus fields.
- Core comparison cards exist for storage, compute, operations, cost, identity, and networking/security.
- Questions are original, source-linked, and use real misconceptions as distractors.
- Weak-area remediation can point to service pages, comparison cards, concepts, and cards.
- Official sources and last verified dates are visible on enriched content.
- AIF-C01 remains separated and does not inherit CLF-C02 content unless explicitly authored for AIF-C01 later.
- The first implementation slice improves CLF-C02 depth without requiring a full app rewrite.
