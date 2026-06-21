# Normalized source ingestion schema

This design defines the local-first source ingestion artifact for Vion Learning AWS certification content. It is intentionally boring: checked-in JSON files, deterministic ids, explicit timestamps, and no database assumptions.

For the upload pipeline, there is also a personalized tutor track: `german-b2-exam`. It is valid for private German B2 document staging and provenance-bearing chunk artifacts, but it stays isolated from the AWS learner tracks `clf-c02` and `aif-c01`.

## Artifact shape

Store ingested sources as static JSON arrays under the corpus lane that owns them:

- `data/sources/clf-c02/ingested_sources.json`
- `data/sources/aif-c01/ingested_sources.json`
- `data/sources/shared/ingested_sources.json`

Each file contains records with exactly one `track_id`. Do not create a mixed-track source file.

Upload-phase note:

- phase-1 upload support is limited to `pdf`, `txt`, and `markdown`
- ZIP bundle upload/unpacking is explicitly deferred and out of scope
- this is not broad document-readiness; unsupported containers or rich office formats should remain unstaged until a dedicated extractor, provenance mapping, and safety review exist
- user uploads may bypass external source verification only; hashes, provenance, and local staging checks still apply

### German B2 note-review packet

When `stageUploadBatch({ trackId: "german-b2-exam" })` stages uploaded notes, the chunk artifact also carries `german_b2_review_packet` with schema version `german-b2-note-review/v1`. This is the review/edit contract for user notes before they become lessons:

```json
{
  "schema_version": "german-b2-note-review/v1",
  "track_id": "german-b2-exam",
  "batch_id": "german-b2-exam-smoke-...",
  "review_status": "review",
  "mutable": true,
  "content_version": 1,
  "allowed_source_types": ["pdf", "txt", "markdown"],
  "content": [],
  "validation": {
    "policy": {
      "vocab_requires_hungarian": true,
      "verb_forms_required": ["present", "past", "perfect"],
      "irregular_verbs_marked": true,
      "mixed_german_hungarian_allowed": true,
      "edits_require_re_review": true,
      "zip_unpacking_supported": false
    },
    "issues": []
  }
}
```

Normalization recognizes `Wortschatz`/`Vokabeln`, `Grammatik`, `Lesen`, and `Schreiben` headings in markdown or plain text. Vocab rows use `German | Hungarian | present: ... | past: ... | perfect: ... | irregular: true|false`. German/Hungarian mixed prose is preserved in grammar/reading/writing entries. Missing Hungarian vocab translations or incomplete verb metadata move the packet to `review_status: "needs_edit"` with validation issues; valid packets are `review`. Edits remain mutable and must bump `content_version` and return the lesson to `review` before republishing.

Ownership policy:

- `clf-c02` records are Cloud Practitioner-ready sources and mappings.
- `aif-c01` records are AI Practitioner-ready sources and mappings.
- `shared` records are canonical AWS foundation sources that may support both exams, but they are not quiz-ready by themselves. If a shared URL is used in CLF-C02 or AIF-C01 study artifacts, create a track-local overlay or derived record with track-specific domains, concepts, summaries, and `separation_note` rather than pointing exam generation directly at the shared record.
- Do not collapse CLF-C02 and AIF-C01 into a single shared interpretation even when the URL is identical. Shared is a reusable intake lane, not a license to mix exam semantics.

Recommended envelope if metadata is needed around the array:

```json
{
  "track_id": "clf-c02",
  "schema_version": "source-ingestion/v1",
  "generated_at": "2026-06-05T00:00:00Z",
  "sources": []
}
```

The schema file in `docs/design/source-ingestion-schema.v1.json` validates the envelope form.

## Separation rules

1. `track_id` is required on every source and must be `clf-c02`, `aif-c01`, or `shared`.
2. Folder and record track must match: `data/sources/clf-c02/*` may only contain `track_id: "clf-c02"`; `data/sources/aif-c01/*` may only contain `track_id: "aif-c01"`; `data/sources/shared/*` may only contain `track_id: "shared"`.
3. `exam_relevance.exam_code` must match the track:
   - `clf-c02` -> `CLF-C02`
   - `aif-c01` -> `AIF-C01`
   - `shared` -> `SHARED`
4. Do not import CLF-C02 domains, concepts, summaries, or facts into AIF-C01 records even when the URL is the same AWS documentation page.
5. Shared records must stay exam-neutral: use `domains: []` unless a future shared taxonomy is added, and prefer `question_use: ["do_not_use_for_questions"]` until a track-local overlay exists.
6. Do not dedupe across tracks by URL. Local JSON can repeat URLs when the interpretation differs by exam.

## Source record fields

| Field | Type | Required | Meaning |
|---|---:|---:|---|
| `id` | string | yes | Stable deterministic id. Use `<track_id>:<source_type>:<slug-or-hash>`, e.g. `clf-c02:aws-doc:shared-responsibility-model`. |
| `track_id` | string enum | yes | Certification owner: `clf-c02` or `aif-c01`. |
| `title` | string | yes | Human-readable title as published, normalized only enough for display. |
| `source_type` | string enum | yes | `aws_exam_guide`, `aws_certification_page`, `aws_docs`, `aws_skill_builder`, `aws_blog`, `aws_whitepaper`, `aws_faq`, `aws_workshop`, `aws_youtube`, `third_party_video`, `third_party_article`, or `other`. |
| `url` | string | yes | Canonical public URL when available. Auth-gated resources still need the most specific stable URL known. |
| `publisher` | string | yes | Publisher or owner, e.g. `AWS`, `AWS Skill Builder`, `AWS Training and Certification`, `freeCodeCamp`. |
| `aws_service` | array of strings | yes | Canonical AWS services directly covered, e.g. `["AWS Identity and Access Management", "AWS Organizations"]`; empty array for broad exam pages. |
| `domains` | array of objects | yes | Track-specific exam domains/task statements touched by the source. |
| `concepts` | array of strings | yes | Track-local concepts taught by this source. Use concise tags, not prose. |
| `summary` | string | yes | Original short summary of what the source contributes to this track. Do not copy source text. |
| `extracted_facts` | array of objects | yes | Small verified facts extracted from the source, each with citation-friendly context. |
| `exam_relevance` | object | yes | Why this source matters for this specific certification. |
| `last_checked_at` | ISO 8601 string or null | yes | When a human or script last checked the source for freshness. Null only for not-yet-checked candidates. |
| `retrieved_at` | ISO 8601 string | yes | When the local record content was retrieved/generated. |
| `content_hash` | string or null | yes | SHA-256 of normalized fetched content when available, formatted `sha256:<hex>`. Null for auth-gated/manual-only records. |
| `license_or_usage_note` | string | yes | Usage boundary. Examples: `AWS public docs; summarize and cite, do not copy wholesale.` |
| `citation_text` | string | yes | Ready-to-display citation string with publisher, title, and URL. |
| `freshness_status` | string enum | yes | `fresh`, `stale`, `needs_refresh`, `unverified`, or `auth_gated`. |
| `stale_after_days` | number | yes | Staleness window used by `sources:check` and ingestion policy. Use shorter windows for volatile pricing/blog/training pages and longer windows for stable docs/whitepapers. |
| `notes` | array of strings | yes | Curator notes, caveats, TODOs, and known gaps. Empty array is allowed. |

## Nested field details

### `domains[]`

Use objects so the app can map a source to either a whole exam domain or a specific task statement without a separate lookup table.

```json
{
  "domain_id": "2",
  "domain_name": "Security and Compliance",
  "task_statement_ids": ["2.1", "2.3"],
  "weight_percent": 30
}
```

Rules:

- `domain_id`, `domain_name`, and `task_statement_ids` are track-local.
- `weight_percent` is copied from the current exam guide for convenience. It is not an independent source of truth.
- Use `task_statement_ids: []` only when the source applies broadly to the whole domain.

### `extracted_facts[]`

Keep facts small, original, and traceable:

```json
{
  "fact": "In the shared responsibility model, AWS is responsible for security of the cloud and the customer is responsible for security in the cloud.",
  "fact_type": "exam_fact",
  "source_locator": "Shared Responsibility Model page, overview section",
  "confidence": "high"
}
```

Allowed `fact_type` values:

- `exam_fact` for explicit exam-guide facts such as duration, passing score, domains, or task statements.
- `service_capability` for what an AWS service does.
- `responsibility_boundary` for shared-responsibility or governance distinctions.
- `pricing_or_support` for billing, support, or cost facts.
- `limitation` for constraints or caveats.
- `teaching_hint` for source-derived hints useful in explanations without being a formal fact.

### `exam_relevance`

```json
{
  "exam_code": "CLF-C02",
  "relevance_level": "core",
  "why_it_matters": "Directly supports the Security and Compliance domain and common shared-responsibility questions.",
  "question_use": ["concept_card", "quiz_distractor_context"],
  "separation_note": "CLF-C02 cloud governance framing; do not reuse as AIF-C01 AI governance content without a separate AIF-C01 record."
}
```

Allowed `relevance_level` values:

- `core`: directly mapped to exam guide domains/task statements.
- `supporting`: useful supporting explanation but not a primary exam-guide source.
- `background`: helps understanding but should not drive quiz facts alone.
- `candidate`: discovered but not yet validated.

For `shared` records, prefer:

- `exam_code: "SHARED"`
- `relevance_level: "supporting"` or `"background"`
- `question_use: ["do_not_use_for_questions"]`
- `separation_note` that explicitly requires CLF-C02 or AIF-C01 overlays before quiz or flashcard generation.

Allowed `question_use` values:

- `learning_card`
- `concept_card`
- `quiz_fact`
- `quiz_distractor_context`
- `study_plan`
- `console_guide`
- `do_not_use_for_questions`

## Freshness and hash policy

- `retrieved_at` is when this JSON record was written or regenerated.
- `last_checked_at` is when the source was actually checked. It can be older than `retrieved_at` if the record was reorganized without refreshing the source.
- `content_hash` should be computed from normalized fetched text: strip volatile navigation, collapse whitespace, and hash UTF-8 bytes.
- Use `freshness_status: "auth_gated"` when the source cannot be fully verified without login, even if the public landing page is reachable.
- Use `freshness_status: "unverified"` for candidate videos/search results that have not been manually checked.
- Use `freshness_status: "needs_refresh"` when a fetch fails or when the normalized content hash changes unexpectedly and a human should review the source before trusting generated material.
- Use `freshness_status: "stale"` when the source is older than `stale_after_days` even if the fetch still works.

Recommended default `stale_after_days` windows for AWS certification curation:

| Source class | Default stale window | Why |
|---|---:|---|
| Exam guide PDFs / official in-scope-out-of-scope pages | 30-45 days | Exam blueprints change rarely, but when they do the impact is high. |
| Certification landing pages / exam-prep pages / Skill Builder landing pages | 21-30 days | Prep links and recommended pathways change more often than docs. |
| AWS service docs / Well-Architected docs / whitepapers hosted under docs.aws.amazon.com | 45-60 days | Fairly stable, but still versioned and occasionally reorganized. |
| Pricing / support / billing pages | 7-14 days | These are operationally volatile; exact pricing language and support entitlements move often. |
| AWS blogs | 30 days | Valuable context, but not a stable primary authority. |
| YouTube / videos | 14-30 days | Pages remain available, but transcripts, relevance, and product naming drift quickly. |

## Maintenance workflow

1. Edit `data/sources/source_catalog.json` first. Treat it as the reviewable source configuration: every record needs a stable id, source type, public/auth-gated URL, publisher, track-specific domains/concepts, original summary, extracted facts, and an explicit usage/citation note.
2. Keep each source lane-owned. A shared AWS documentation URL may appear in `shared` plus one or both exam tracks, but the CLF-C02 and AIF-C01 records must have different ids, exam codes, domains, concepts, and separation notes.
3. Re-run `npm run ingest:sources` when public source fetches are in scope. The script writes per-track envelopes under `data/sources/<track_id>/ingested_sources.json`, optional generated indexes, and `docs/reports/source-provenance.md`.
4. If a fetch fails, preserve the failure. Do not paste replacement text from memory or another site; leave `freshness_status` as `needs_refresh` or `auth_gated`, preserve prior hashes where possible, and add notes for the next maintainer.
5. Re-run `npm run sources:check` after any catalog or ingestion artifact edit. This is the schema/config gate for duplicate ids, track mismatches, ISO timestamps, hash format, freshness enum values, and source-envelope isolation.
6. Re-run `npm run sources:report` when checked-in source envelopes changed but no live fetch is needed.
7. Before handoff, run `npm test`, `npm run lint`, and `npm run build` so ingestion changes are verified against runtime source-id lookups and track isolation.

## Ethical sourcing rules

- The app may summarize and cite public AWS material, but source prose must not be copied wholesale into local learning cards, quizzes, or explanations.
- Never import real exam questions, brain dumps, leaked answer keys, or proprietary course text/transcripts.
- Third-party resources are candidate teaching aids only unless their facts are verified against official/public AWS sources.
- Auth-gated sources require legitimate access and an explicit usage boundary; otherwise keep them as `auth_gated` or `unverified` metadata.
- Quiz items must remain original scenario/decision questions derived from allowed source facts, not paraphrases of exams or proprietary prep material.

## Example CLF-C02 record

```json
{
  "id": "clf-c02:aws-doc:shared-responsibility-model",
  "track_id": "clf-c02",
  "title": "Shared Responsibility Model",
  "source_type": "aws_docs",
  "url": "https://aws.amazon.com/compliance/shared-responsibility-model/",
  "publisher": "AWS",
  "aws_service": [],
  "domains": [
    {
      "domain_id": "2",
      "domain_name": "Security and Compliance",
      "task_statement_ids": ["2.1"],
      "weight_percent": 30
    }
  ],
  "concepts": ["shared responsibility model", "security of the cloud", "security in the cloud"],
  "summary": "Explains how AWS and customers divide security responsibilities, which is a core CLF-C02 Security and Compliance topic.",
  "extracted_facts": [
    {
      "fact": "AWS is responsible for security of the cloud, while customers are responsible for security in the cloud.",
      "fact_type": "responsibility_boundary",
      "source_locator": "Shared Responsibility Model overview",
      "confidence": "high"
    }
  ],
  "exam_relevance": {
    "exam_code": "CLF-C02",
    "relevance_level": "core",
    "why_it_matters": "Maps directly to CLF-C02 task statement 2.1 about understanding the AWS shared responsibility model.",
    "question_use": ["learning_card", "concept_card", "quiz_fact", "quiz_distractor_context"],
    "separation_note": "Use only for CLF-C02 cloud security responsibility content unless a separate AIF-C01 record maps it to AI governance topics."
  },
  "last_checked_at": "2026-06-03T00:00:00Z",
  "retrieved_at": "2026-06-05T00:00:00Z",
  "content_hash": null,
  "license_or_usage_note": "AWS public documentation; summarize, cite, and link rather than copying source text wholesale.",
  "citation_text": "AWS, Shared Responsibility Model, https://aws.amazon.com/compliance/shared-responsibility-model/",
  "freshness_status": "fresh",
  "notes": []
}
```

## Example AIF-C01 record for the same URL

If the same source is relevant to AIF-C01, create a separate record with AIF-specific mapping and interpretation:

```json
{
  "id": "aif-c01:aws-doc:shared-responsibility-model-ai-governance",
  "track_id": "aif-c01",
  "title": "Shared Responsibility Model",
  "source_type": "aws_docs",
  "url": "https://aws.amazon.com/compliance/shared-responsibility-model/",
  "publisher": "AWS",
  "aws_service": [],
  "domains": [
    {
      "domain_id": "4",
      "domain_name": "Responsible AI",
      "task_statement_ids": [],
      "weight_percent": 14
    }
  ],
  "concepts": ["responsible AI", "governance boundary", "customer responsibility"],
  "summary": "Supports AIF-C01 responsible-AI governance framing by clarifying which controls remain customer responsibilities when using AWS services.",
  "extracted_facts": [
    {
      "fact": "Customers retain responsibility for how they configure and use AWS services, even when AWS operates the underlying cloud infrastructure.",
      "fact_type": "responsibility_boundary",
      "source_locator": "Shared Responsibility Model overview",
      "confidence": "medium"
    }
  ],
  "exam_relevance": {
    "exam_code": "AIF-C01",
    "relevance_level": "supporting",
    "why_it_matters": "Helps explain governance boundaries for AI workloads, but is not itself an AI service source.",
    "question_use": ["learning_card", "study_plan"],
    "separation_note": "Do not reuse CLF-C02 Security and Compliance domain mappings or cloud-practitioner quiz facts."
  },
  "last_checked_at": "2026-06-03T00:00:00Z",
  "retrieved_at": "2026-06-05T00:00:00Z",
  "content_hash": null,
  "license_or_usage_note": "AWS public documentation; summarize, cite, and link rather than copying source text wholesale.",
  "citation_text": "AWS, Shared Responsibility Model, https://aws.amazon.com/compliance/shared-responsibility-model/",
  "freshness_status": "fresh",
  "notes": ["AIF-C01 mapping should be validated against the current AI Practitioner exam guide before quiz use."]
}
```
