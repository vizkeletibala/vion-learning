# Source registry policy and initial curated corpora for CLF-C02, AIF-C01, and SHARED

Task: `t_5f88ed66`
Date: 2026-06-11
Scope: policy and curation only. No implementation changes.

## Executive summary

This lane locks three separate source corpora for the Vion Learning RAG pipeline:

- `clf-c02`: Cloud Practitioner exam-facing sources and mappings
- `aif-c01`: AI Practitioner exam-facing sources and mappings
- `shared`: canonical AWS foundation sources reusable across both tracks, but never consumed directly for quiz generation without a track-local overlay

The trust hierarchy is:

1. official AWS Certification exam guides
2. official in-scope / out-of-scope lists and certification pages
3. official Skill Builder learning plans, exam-prep pages, and practice-resource landing pages
4. official AWS service docs and product pages
5. AWS Well-Architected docs
6. AWS whitepapers
7. official AWS blogs
8. supplementary YouTube only when useful

Policy decision: the registry should preserve source ownership by lane, not by raw URL. A URL may appear once in `shared` and again in `clf-c02` and/or `aif-c01`, but the exam-local records must keep their own ids, summaries, concepts, domains, and separation notes.

## Current repo state and immediate implications

Evidence inspected:

- `docs/design/source-ingestion-schema.md`
- `docs/reports/source-provenance.md`
- `docs/research/clf-c02-source-priority-map.md`
- `data/sources/source_catalog.json`
- `src/lib/sourceRegistry.js`
- `scripts/source-ingestion.mjs`

Observed state on 2026-06-11:

- The implementation now recognizes three track ids: `clf-c02`, `aif-c01`, and `shared`.
- The checked-in catalog still contains only CLF-C02 records.
- `docs/reports/source-provenance.md` reports 18 CLF-C02 sources and 0 AIF-C01 sources.
- `data/sources/shared/ingested_sources.json` does not exist yet.
- `node scripts/source-ingestion.mjs check` currently fails because the shared ingestion artifact is missing.

Implication: `shared` is no longer just a future idea; it is an implementation-supported lane with missing curation artifacts. The next implementation worker should add curated `shared` catalog rows and generate the missing shared ingestion envelope.

## Registry spec decisions

### 1. Ownership model

Use three lanes:

- `clf-c02`: sources that are already interpreted for Cloud Practitioner outcomes
- `aif-c01`: sources that are already interpreted for AI Practitioner outcomes
- `shared`: canonical AWS sources that teach reusable concepts such as IAM, KMS, shared responsibility, pricing foundations, and architecture foundations

Rules:

- `shared` is an intake and reuse lane, not an exam-answer lane.
- Shared records should default to `question_use: ["do_not_use_for_questions"]`.
- Any source used directly in CLF-C02 or AIF-C01 quiz/flashcard generation must have a track-local overlay record or derived record.
- Do not copy CLF-C02 domain/task mappings into AIF-C01, or vice versa.

### 2. Trust-tier policy

Use the following operational meaning for the hierarchy:

| Tier | Class | Registry expectation | Use in generation |
|---|---|---|---|
| 1 | Official exam guides | Always include | Primary scope authority |
| 2 | Official certification pages and explicit in-scope/out-of-scope lists | Include for every exam | Primary scope/boundary authority |
| 3 | Skill Builder exam-prep and learning-plan landing pages | Include landing pages; mark internals auth-gated unless legitimately fetched | Study-plan support, not primary fact source unless public and cited |
| 4 | AWS service docs and product pages | Include heavily | Primary factual authority for services/capabilities |
| 5 | Well-Architected docs | Include where they map to exam concepts | High-trust conceptual support |
| 6 | Whitepapers | Include selectively | Broad conceptual support |
| 7 | Official AWS blogs | Optional, targeted only | Supporting context; verify facts against tiers 1-6 |
| 8 | YouTube | Optional, sparse, supplemental only | Never primary factual authority |

### 3. Freshness/staleness policy

Default stale windows:

| Source class | Default `stale_after_days` | Notes |
|---|---:|---|
| Exam guides | 30-45 | High impact when changed; recheck often |
| Certification pages / exam-prep pages / Skill Builder landing pages | 21-30 | Links and prep recommendations drift frequently |
| AWS docs / product pages | 45-60 | Stable enough for longer windows |
| Well-Architected docs | 45-60 | Stable, but still versioned |
| Whitepapers | 60 | Broad foundational material changes slowly |
| Pricing / billing / support pages | 7-14 | Most volatile official content |
| Blogs | 30 | Useful but not stable primary authority |
| YouTube | 14-30 | Supplemental only; relevance drifts quickly |

Status rules:

- `fresh`: last checked within window and content/fetch is stable
- `stale`: last checked exceeds `stale_after_days`
- `needs_refresh`: fetch failed or content hash changed and needs human review
- `auth_gated`: landing page known, internal content not public
- `unverified`: candidate discovered but not yet manually validated
- `unavailable`: robots or other fetch restrictions prevent normal ingestion

### 4. Shared-lane usage policy

Shared records should usually have:

- `track_id: "shared"`
- `exam_relevance.exam_code: "SHARED"`
- `domains: []`
- `exam_relevance.relevance_level: "supporting"` or `"background"`
- `exam_relevance.question_use: ["do_not_use_for_questions"]`
- a `separation_note` that explicitly requires exam-local overlays before question use

This gives the pipeline a canonical URL registry without allowing silent cross-exam semantic leakage.

## URL verification performed

Verified with live HTTP requests on 2026-06-11. All of the following returned HTTP 200:

- `https://aws.amazon.com/certification/certified-cloud-practitioner/`
- `https://d1.awsstatic.com/training-and-certification/docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf`
- `https://skillbuilder.aws/exam-prep/cloud-practitioner`
- `https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html`
- `https://aws.amazon.com/about-aws/global-infrastructure/`
- `https://aws.amazon.com/cloud-adoption-framework/`
- `https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html`
- `https://docs.aws.amazon.com/lambda/latest/dg/welcome.html`
- `https://docs.aws.amazon.com/kms/latest/developerguide/overview.html`
- `https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html`
- `https://aws.amazon.com/certification/certified-ai-practitioner/`
- `https://d1.awsstatic.com/training-and-certification/docs-ai-practitioner/AWS-Certified-AI-Practitioner_Exam-Guide.pdf`
- `https://skillbuilder.aws/exam-prep/ai-practitioner`
- `https://aws.amazon.com/what-is/artificial-intelligence/`
- `https://aws.amazon.com/what-is/generative-ai/`
- `https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html`
- `https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html`
- `https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html`
- `https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html`
- `https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html`
- `https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models.html`
- `https://docs.aws.amazon.com/sagemaker/latest/dg/model-cards.html`
- `https://aws.amazon.com/machine-learning/responsible-ai/`
- `https://aws.amazon.com/bedrock/pricing/`
- `https://aws.amazon.com/what-is/prompt-engineering/`
- `https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-detect-data-bias.html`
- `https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-feature-importance.html`

## Initial curated candidate list

The list below is intentionally opinionated. It is not exhaustive; it is the recommended first corpus.

### SHARED candidates

These are reusable AWS foundations that should live in `shared` first, then be overlaid into CLF-C02 or AIF-C01 if needed.

| Priority | Tier | Candidate id slug | URL | Why it belongs in SHARED | Notes |
|---|---|---|---|---|---|
| P0 | 4 | `shared:aws-doc:shared-responsibility-model` | `https://aws.amazon.com/compliance/shared-responsibility-model/` | Cross-exam security boundary concept | Keep `do_not_use_for_questions` until track overlays exist |
| P0 | 4 | `shared:aws-doc:iam-introduction` | `https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html` | IAM foundations apply to both exams | Track overlays should decide whether content is security-core or AI-governance-supporting |
| P0 | 4 | `shared:aws-doc:kms-overview` | `https://docs.aws.amazon.com/kms/latest/developerguide/overview.html` | Shared encryption/key-management foundation | Do not inject directly into quiz generation |
| P0 | 5 | `shared:aws-doc:well-architected-framework` | `https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html` | Shared architecture vocabulary | CLF uses it directly; AIF may use only selected overlays |
| P1 | 4 | `shared:aws-doc:cloudwatch-what-is` | `https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html` | Monitoring/operations concept spans both tracks | AIF use should usually be limited to evaluation/monitoring overlays |
| P1 | 4 | `shared:aws-doc:cloudtrail-user-guide` | `https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html` | Audit trail concept spans both tracks | Useful for governance overlays |
| P1 | 4 | `shared:aws-doc:billing-cost-management` | `https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-what-is.html` | Shared billing vocabulary and cost controls | Volatile enough for shorter freshness window |
| P2 | 4 | `shared:aws-doc:pricing-main` | `https://aws.amazon.com/pricing/` | Shared pricing landing page | Use for concept framing, not exact prices |

### CLF-C02 candidates

| Priority | Tier | Candidate | URL | Why it matters | Notes |
|---|---|---|---|---|---|
| P0 | 1 | CLF-C02 exam guide | `https://d1.awsstatic.com/training-and-certification/docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf` | Primary exam-scope authority | Already represented in current catalog |
| P0 | 2 | AWS Certified Cloud Practitioner certification page | `https://aws.amazon.com/certification/certified-cloud-practitioner/` | Official scope, prep, and candidate framing | Already represented in current catalog |
| P0 | 3 | Skill Builder exam prep page | `https://skillbuilder.aws/exam-prep/cloud-practitioner` | Official prep-path landing page | Keep landing page public; internals are effectively auth-gated |
| P0 | 6 | AWS Overview whitepaper | `https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html` | Best broad-service/foundation whitepaper for first corpus | Strong Domain 1 support |
| P0 | 4 | AWS Global Infrastructure | `https://aws.amazon.com/about-aws/global-infrastructure/` | Domain 1.1 and 3.2 gap filler | Public page, easy to refresh |
| P0 | 4 | AWS Cloud Adoption Framework | `https://aws.amazon.com/cloud-adoption-framework/` | Domain 1.3 migration strategy source | Strong migration framing |
| P0 | 5 | Well-Architected Framework | `https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html` | Domain 1.2 design principles | Already represented in current catalog |
| P0 | 4 | Shared Responsibility Model | `https://aws.amazon.com/compliance/shared-responsibility-model/` | Domain 2.1 core source | Already represented in current catalog |
| P0 | 4 | IAM introduction | `https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html` | Domain 2.2/2.3 access management | Already represented in current catalog |
| P0 | 4 | Lambda overview | `https://docs.aws.amazon.com/lambda/latest/dg/welcome.html` | Major Domain 3 compute gap | Should be added before retrieval eval claims |
| P0 | 4 | KMS overview | `https://docs.aws.amazon.com/kms/latest/developerguide/overview.html` | Security/compliance encryption gap | Good fit for task 2.2 |
| P1 | 4 | Route 53 docs | `https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html` | Networking breadth gap | Useful for Domain 3.5 |
| P1 | 4 | CloudFront docs | `https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html` | Edge/global infrastructure breadth | Domain 3.2 / 3.5 support |
| P1 | 4 | DynamoDB intro | `https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html` | Database breadth gap | Domain 3.4 support |
| P1 | 4 | AWS Budgets | `https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html` | Billing/cost tooling gap | Use shorter stale window |

### AIF-C01 candidates

| Priority | Tier | Candidate | URL | Why it matters | Notes |
|---|---|---|---|---|---|
| P0 | 1 | AIF-C01 exam guide | `https://d1.awsstatic.com/training-and-certification/docs-ai-practitioner/AWS-Certified-AI-Practitioner_Exam-Guide.pdf` | Primary exam-scope authority | Required before any AIF curation claims |
| P0 | 2 | AWS Certified AI Practitioner certification page | `https://aws.amazon.com/certification/certified-ai-practitioner/` | Official candidate/scope/prep page | Required scope boundary source |
| P0 | 3 | Skill Builder exam prep page | `https://skillbuilder.aws/exam-prep/ai-practitioner` | Official prep-path landing page | Treat internals as auth-gated unless legitimately fetched |
| P0 | 4 | What is Artificial Intelligence? | `https://aws.amazon.com/what-is/artificial-intelligence/` | Plain-language AI fundamentals | Marketing-ish, but still official AWS and useful for domain 1 vocabulary |
| P0 | 4 | What is Generative AI? | `https://aws.amazon.com/what-is/generative-ai/` | Plain-language generative AI framing | Good domain 2 concept bridge |
| P0 | 4 | Amazon Bedrock overview | `https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html` | Domain 2.3 core AWS service source | High-value first-pass source |
| P0 | 4 | Bedrock Guardrails | `https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html` | Responsible AI / safety / controls | Supports domains 4 and 5 |
| P0 | 4 | Bedrock Knowledge Bases | `https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html` | RAG and retrieval design | Domain 3.1 core source |
| P0 | 4 | Bedrock evaluation | `https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html` | Model/app evaluation | Domain 3.4 core source |
| P0 | 4 | SageMaker JumpStart foundation models | `https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-foundation-models.html` | Foundation-model access/customization framing | Important Bedrock-vs-SageMaker distinction |
| P0 | 4 | Responsible AI on AWS | `https://aws.amazon.com/machine-learning/responsible-ai/` | Official AWS responsible-AI framing | Strong domains 4 and 5 support |
| P1 | 4 | Amazon Bedrock agents | `https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html` | Agent design and orchestration vocabulary | Good domain 2.3/3.1 support |
| P1 | 4 | What is prompt engineering? | `https://aws.amazon.com/what-is/prompt-engineering/` | Prompt design fundamentals | Support domain 3.2 |
| P1 | 4 | SageMaker Model Cards | `https://docs.aws.amazon.com/sagemaker/latest/dg/model-cards.html` | Transparency/explainability/governance support | Strong domain 4.2 support |
| P1 | 4 | SageMaker Clarify bias detection | `https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-detect-data-bias.html` | Bias/fairness concepts | Good support source, but not a first-pass primary source |
| P1 | 4 | SageMaker Clarify feature importance | `https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-feature-importance.html` | Explainability support | Use as supporting, not scope-defining, material |
| P1 | 4 | Bedrock pricing | `https://aws.amazon.com/bedrock/pricing/` | Cost/latency/pricing tradeoff support | Volatile; short stale window |

## Unsupported or weak-source policy

| Source type | Policy | Why |
|---|---|---|
| Skill Builder internal lesson text, transcripts, labs, answer keys | Unsupported unless fetched under an explicit legitimate workflow with clear usage boundaries | Usually auth-gated and easy to drift into proprietary-copy territory |
| Official AWS blogs | Weak compared with docs/whitepapers | Useful for examples and launch context, but not the primary authority for exam facts |
| AWS re:Post / Knowledge Center | Supporting only | Better for support-resource awareness than for first-order factual grounding |
| Official YouTube videos | Supplemental only | Harder to chunk and keep fresh; use only when a concept lacks better doc coverage |
| Third-party courses, prep sites, SEO articles | Exclude from first corpus | Lower trust and higher risk of exam-dump contamination |
| Exam dumps, leaked questions, answer keys, proprietary prep text | Prohibited | Violates both ethics and source-quality goals |

## Recommended next worker handoff

1. Add `shared` lane artifacts first so `sources:check` stops failing on a missing shared envelope.
2. Seed `shared` with the small P0 foundation set only; do not overfill it.
3. Add the P0 AIF-C01 records next; the repo currently has no AIF-C01 source corpus.
4. Expand CLF-C02 with the listed P0 gaps before claiming broad RAG coverage.
5. Keep blogs and YouTube out of the first pass unless a specific concept has no stronger official AWS source.

## Reviewer checklist

- SHARED records remain exam-neutral and default to `do_not_use_for_questions`.
- CLF-C02 and AIF-C01 maintain separate ids, mappings, and summaries even for the same URL.
- Tier 1-4 sources dominate the first corpus.
- Skill Builder internals are not copied into local artifacts without an explicit permitted workflow.
- No exam dumps, leaked questions, or third-party prep prose are ingested.
- Pricing and support pages get shorter freshness windows than docs and whitepapers.
