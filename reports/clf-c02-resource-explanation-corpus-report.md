# CLF-C02 Resource Explanation Corpus Report

Date: 2026-06-03
Task: t_fc44467e

## Deliverables

- `data/sources/clf-c02/resource_explanation_corpus.json`
- `data/sources/clf-c02/resource_explanation_corpus.md`

## Coverage

The corpus contains 91 beginner-friendly AWS resource/service explanation entries across 11 families:

- AI/ML basics
- Billing/cost
- Compute
- Databases/analytics
- Global infrastructure
- IAM/security
- Integration/app
- Management/observability
- Migration
- Networking/CDN
- Storage

Each entry includes:

- priority label (`P0`, `P1`, `P2`)
- simple analogy
- plain-English explanation
- real-world use case
- exam clue phrases
- common misconceptions
- adjacent service comparison
- official AWS documentation URL
- source URLs including the CLF-C02 exam guide

## Verification performed

- JSON syntax validated with `python3 -m json.tool`.
- Required service/concept coverage heuristic checked against the task list: 0 missing.
- 89 unique official documentation/product URLs checked with `curl -L` HEAD or ranged GET fallback: 89 OK, 0 failed.
- File sizes / line counts:
  - `resource_explanation_corpus.json`: 2445 lines, 128K
  - `resource_explanation_corpus.md`: 941 lines, 72K

## Notes

This corpus is educational explanation content, not exam-dump content. It is intended to supplement the existing official-source seed files under `data/sources/clf-c02/`.
