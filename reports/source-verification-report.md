# AWS Certification Source Verification Report

Last verified: 2026-06-03

Scope: official current seed/source corpora for AWS Certified Cloud Practitioner (CLF-C02) and AWS Certified AI Practitioner (AIF-C01). Corpora are intentionally separate under `data/sources/clf-c02/` and `data/sources/aif-c01/`.

## Source hierarchy and ethics

Primary facts come from AWS certification pages and AWS exam guide PDFs. Official training recommendations come from AWS Skill Builder links surfaced from the certification pages. Supplementary videos are marked optional and must not override official AWS facts. Exam dumps, leaked/real-question sites, unauthorized banks, and SEO-only exam pages were not used.

## CLF-C02 — AWS Certified Cloud Practitioner

Official facts captured:
- Exam code: CLF-C02
- Duration: 90 minutes
- Format/count: 65 questions, multiple choice or multiple response; exam guide states 50 scored and 15 unscored questions.
- Passing score: 700 on a 100–1,000 scaled score.
- Cost: 100 USD, with official pricing page as policy source.
- Domains: Cloud Concepts 24%; Security and Compliance 30%; Cloud Technology and Services 34%; Billing, Pricing, and Support 12%.
- Out-of-scope job tasks: coding, cloud architecture design, troubleshooting, implementation, load/performance testing.
- Official learning path: Skill Builder Cloud Practitioner exam prep plan and AWS Cloud Practitioner Essentials.

Main files:
- `data/sources/clf-c02/source_metadata.json`
- `data/sources/clf-c02/seed_outline.json`
- `data/sources/clf-c02/learning_cards.json`

## AIF-C01 — AWS Certified AI Practitioner

Official facts captured:
- Exam code: AIF-C01
- Duration: 90 minutes
- Format/count: 65 questions; guide includes multiple choice, multiple response, ordering, matching, and case study question types.
- Passing score: 700 on a 100–1,000 scaled score.
- Cost: 100 USD, with official pricing page as policy source.
- Domains: Fundamentals of AI and ML 20%; Fundamentals of Generative AI 24%; Applications of Foundation Models 28%; Guidelines for Responsible AI 14%; Security, Compliance, and Governance for AI Solutions 14%.
- Out-of-scope job tasks include coding/developing models, feature engineering implementation, hyperparameter tuning, building pipelines/infrastructure, mathematical/statistical model analysis, and implementing security/compliance/governance frameworks.
- Official learning path: Skill Builder AI Practitioner exam prep plan plus Cloud Practitioner Essentials and AWS Technical Essentials as foundation recommendations surfaced from the AI Practitioner page.

Main files:
- `data/sources/aif-c01/source_metadata.json`
- `data/sources/aif-c01/seed_outline.json`
- `data/sources/aif-c01/learning_cards.json`

## Supplementary videos

Supplementary video candidates are included inside each `source_metadata.json` under `supplementary_videos`. They include freeCodeCamp full-course videos verified via yt-dlp search output and curated Skill Builder / known-creator candidate links. They are marked optional, with conflict/outdated warnings. Later refresh should enrich publish dates, chapters/timestamps, and transcript availability.

## Uncertainties / refresh gaps

- YouTube publish dates and transcript availability were not fully verified in this run; use YouTube API or a more complete yt-dlp metadata pass before showing them in UI.
- AWS exam guides explicitly say service lists are non-exhaustive and subject to change; refresh source PDFs before final release and periodically thereafter.
- Skill Builder pages may change behind login; authenticated refresh is needed for exact module names, durations, and course ordering.
- CLF-C02 guide downloaded as Version 1.0; AIF-C01 guide downloaded as Version 1.4. Confirm no newer PDF versions exist at content-refresh time.
