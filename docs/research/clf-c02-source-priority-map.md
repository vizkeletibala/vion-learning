# CLF-C02 official AWS source priority map and gap list

Task: `t_37948f58`
Date: 2026-06-07
Scope: CLF-C02 only. Do not mix with AIF-C01 records, domains, facts, or generated content.

## Source policy

Allowed for the first exam-focused corpus:

- Official AWS exam/certification pages and exam guide PDFs.
- Official AWS public documentation, FAQs, whitepapers, pricing/support pages, and public training landing pages.
- AWS Skill Builder public landing pages may be catalogued as official training references, but course internals/transcripts/module text must be treated as auth-gated unless fetched under an explicit licensed/authenticated workflow.

Disallowed / out of scope:

- Real exam dumps, leaked questions, answer keys, proprietary course text, copied Skill Builder internals, and SEO prep pages that are not AWS-owned.
- AIF-C01 sources or shared URLs interpreted with AIF-C01 domains. If a URL is useful to both exams later, create separate track-specific records.

Catalog convention to preserve:

- Edit `data/sources/source_catalog.json` first using `source-ingestion/v1` records.
- Stable ids should follow `<track_id>:<source_type>:<slug>`, e.g. `clf-c02:aws-doc:lambda-what-is`.
- Every record needs `track_id`, `domains`, `concepts`, `summary`, `extracted_facts`, `exam_relevance`, `license_or_usage_note`, `citation_text`, `freshness_status`, and `notes`.
- Re-run `npm run ingest:sources` only when live fetch/update is in scope; always run `npm run sources:check` after catalog or ingestion edits.

## Current checked-in source inventory

Evidence inspected:

- `data/sources/source_catalog.json`
- `data/sources/clf-c02/ingested_sources.json`
- `docs/research/clf-c02-deep-resource-map.md`
- `docs/reports/source-provenance.md`
- `docs/design/source-ingestion-schema.md`
- `scripts/source-ingestion.mjs`

Current catalog contains 18 CLF-C02 entries:

- source types: 1 `aws_exam_guide`, 1 `aws_certification_page`, 16 `aws_docs`
- provenance report: 18 CLF-C02 sources, 18 fresh, 0 auth-gated, 0 stale, 0 needs_refresh, 0 unverified
- AIF-C01 provenance report section has 0 sources; no cross-track ingestion is present in the current generated source report

Domain coverage counts from the catalog, counting a source once per mapped domain:

| Domain | Weight | Current mapped source count | Current source ids |
|---|---:|---:|---|
| 1. Cloud Concepts | 24% | 3 | `clf-c02:aws-exam-guide:clf-c02`; `clf-c02:aws-certification-page:certified-cloud-practitioner`; `clf-c02:aws-doc:well-architected-framework` |
| 2. Security and Compliance | 30% | 8 | `clf-c02:aws-exam-guide:clf-c02`; `clf-c02:aws-doc:shared-responsibility-model`; `clf-c02:aws-doc:iam-introduction`; `clf-c02:aws-doc:cloudtrail-user-guide`; `clf-c02:aws-doc:config-developer-guide`; `clf-c02:aws-doc:vpc-what-is`; `clf-c02:aws-doc:organizations-service-control-policies`; `clf-c02:aws-doc:trusted-advisor` |
| 3. Cloud Technology and Services | 34% | 9 | `clf-c02:aws-exam-guide:clf-c02`; `clf-c02:aws-doc:well-architected-framework`; `clf-c02:aws-doc:s3-welcome`; `clf-c02:aws-doc:ec2-what-is`; `clf-c02:aws-doc:rds-welcome`; `clf-c02:aws-doc:cloudwatch-what-is`; `clf-c02:aws-doc:cloudtrail-user-guide`; `clf-c02:aws-doc:config-developer-guide`; `clf-c02:aws-doc:vpc-what-is` |
| 4. Billing, Pricing, and Support | 12% | 8 | `clf-c02:aws-exam-guide:clf-c02`; `clf-c02:aws-certification-page:certified-cloud-practitioner`; `clf-c02:aws-doc:organizations-service-control-policies`; `clf-c02:aws-doc:pricing-calculator`; `clf-c02:aws-doc:cost-explorer`; `clf-c02:aws-doc:trusted-advisor`; `clf-c02:aws-doc:support-plans`; `clf-c02:aws-doc:billing-cost-management` |

Task statement coverage counts from the catalog:

| Task | Current source count | Notes |
|---|---:|---|
| 1.1 | 2 | Exam/certification overview only; needs cloud value/global infrastructure support. |
| 1.2 | 2 | Well-Architected exists; needs resilience/global infrastructure examples. |
| 1.3 | 1 | Exam guide only; migration and CAF are missing from catalog. |
| 1.4 | 1 | Exam guide only; economics pages exist mainly under Domain 4 and should be mapped back where relevant. |
| 2.1 | 2 | Shared responsibility exists. |
| 2.2 | 4 | IAM, Organizations/SCPs, VPC, exam guide exist; encryption/compliance sources missing. |
| 2.3 | 3 | IAM and Organizations/SCPs exist; IAM Identity Center/federation missing. |
| 2.4 | 4 | CloudTrail, Config, Trusted Advisor exist; threat/network protection sources missing. |
| 3.1 | 2 | Well-Architected exists; deployment/ops tools missing. |
| 3.2 | 5 | EC2/RDS/S3/VPC exist; global infra and networking depth missing. |
| 3.3 | 5 | Core EC2/RDS/S3/VPC exist; serverless/containers/storage/database breadth missing. |
| 3.4 | 4 | CloudWatch/CloudTrail/Config exist; Systems Manager and deployment/IaC sources missing. |
| 4.1 | 4 | Pricing Calculator, Cost Explorer, Billing exist; pricing model pages missing. |
| 4.2 | 6 | Good starting coverage; Budgets/CUR/Free Tier/Marketplace missing. |
| 4.3 | 4 | Support Plans and Trusted Advisor exist; re:Post/Knowledge Center/docs/whitepapers source missing. |

Service-family coverage counts from the current catalog heuristic:

| Service family | Current count | Current source ids |
|---|---:|---|
| Broad exam foundation | 2 | `clf-c02:aws-exam-guide:clf-c02`; `clf-c02:aws-certification-page:certified-cloud-practitioner` |
| Architecture / migration | 1 | `clf-c02:aws-doc:well-architected-framework` |
| Security / identity / governance | 5 | `clf-c02:aws-doc:iam-introduction`; `clf-c02:aws-doc:cloudtrail-user-guide`; `clf-c02:aws-doc:config-developer-guide`; `clf-c02:aws-doc:organizations-service-control-policies`; `clf-c02:aws-doc:trusted-advisor` |
| Compute | 1 | `clf-c02:aws-doc:ec2-what-is` |
| Storage | 1 | `clf-c02:aws-doc:s3-welcome` |
| Database | 1 | `clf-c02:aws-doc:rds-welcome` |
| Networking / content delivery | 1 | `clf-c02:aws-doc:vpc-what-is` |
| Monitoring / operations | 3 | `clf-c02:aws-doc:cloudwatch-what-is`; `clf-c02:aws-doc:cloudtrail-user-guide`; `clf-c02:aws-doc:config-developer-guide` |
| Billing / pricing / support | 5 | `clf-c02:aws-doc:pricing-calculator`; `clf-c02:aws-doc:cost-explorer`; `clf-c02:aws-doc:trusted-advisor`; `clf-c02:aws-doc:support-plans`; `clf-c02:aws-doc:billing-cost-management` |

## Priority map and gap list

Priority definitions:

- P0: first corpus blocker; add before RAG evals because this domain/task is under-covered or foundational.
- P1: first corpus breadth; add after P0 to reduce shallow retrieval and improve service-selection coverage.
- P2: supporting breadth; useful but should not delay the first exam-focused corpus.
- Existing: already in `source_catalog.json` and generated CLF-C02 ingestion artifacts.

### Domain 1: Cloud Concepts (24%)

| Task / family | Priority | Existing official source records | Required gaps / proposed source records |
|---|---|---|---|
| 1.1 Cloud benefits, value proposition, global reach, elasticity, agility | P0 | `clf-c02:aws-exam-guide:clf-c02`; `clf-c02:aws-certification-page:certified-cloud-practitioner` | Add `clf-c02:aws-whitepaper:overview-of-amazon-web-services` -> https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html. Add `clf-c02:aws-doc:global-infrastructure` -> https://aws.amazon.com/about-aws/global-infrastructure/. Both are public AWS material. |
| 1.2 Design principles / Well-Architected | Existing + P1 | `clf-c02:aws-doc:well-architected-framework` | Optional P1 add `clf-c02:aws-doc:well-architected-tool` -> https://aws.amazon.com/well-architected-tool/ for Tool vs framework distinction. Public AWS page. |
| 1.3 Migration benefits and strategies | P0 | Exam guide only | Add `clf-c02:aws-doc:cloud-adoption-framework` -> https://aws.amazon.com/cloud-adoption-framework/. Add `clf-c02:aws-doc:migration-hub` -> https://aws.amazon.com/migration-hub/ or docs page. Add `clf-c02:aws-doc:application-migration-service` -> https://docs.aws.amazon.com/mgn/latest/ug/what-is-application-migration-service.html. Add `clf-c02:aws-doc:dms-welcome` -> https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html. Add `clf-c02:aws-doc:snow-family` -> https://aws.amazon.com/snow/. Public AWS material. |
| 1.4 Cloud economics | P0 / P1 | Exam guide; billing/pricing records exist under Domain 4 but mostly not mapped to task 1.4 | Map economics-relevant existing records to 1.4 where appropriate, especially `pricing-calculator`, `cost-explorer`, and `billing-cost-management`. Add `clf-c02:aws-doc:free-tier` -> https://aws.amazon.com/free/. Public AWS page. |

Domain 1 unresolved gaps: no cataloged CAF/migration source; no explicit global infrastructure source; cloud economics is under-mapped outside the exam guide.

### Domain 2: Security and Compliance (30%)

| Task / family | Priority | Existing official source records | Required gaps / proposed source records |
|---|---|---|---|
| 2.1 Shared responsibility | Existing | `clf-c02:aws-doc:shared-responsibility-model`; exam guide | Current source is sufficient for first corpus. Optionally add service-specific responsibility notes later from public docs; do not overfit. |
| 2.2 Security, governance, compliance concepts | P0 / P1 | `clf-c02:aws-doc:iam-introduction`; `clf-c02:aws-doc:organizations-service-control-policies`; `clf-c02:aws-doc:vpc-what-is`; `clf-c02:aws-doc:config-developer-guide`; `clf-c02:aws-doc:cloudtrail-user-guide`; `clf-c02:aws-doc:trusted-advisor` | Add `clf-c02:aws-doc:kms-overview` -> https://docs.aws.amazon.com/kms/latest/developerguide/overview.html. Add `clf-c02:aws-doc:aws-artifact` -> https://aws.amazon.com/artifact/. Add `clf-c02:aws-doc:organizations-overview` -> https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html. Public AWS material. |
| 2.3 Access management capabilities | P0 | `clf-c02:aws-doc:iam-introduction`; `clf-c02:aws-doc:organizations-service-control-policies` | Add `clf-c02:aws-doc:iam-identity-center-what-is` -> https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html. Add `clf-c02:aws-doc:sts-what-is` -> https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp.html if temporary credentials/federation depth is needed. Public AWS docs. |
| 2.4 Security components and resources | P0 / P1 | `clf-c02:aws-doc:cloudtrail-user-guide`; `clf-c02:aws-doc:config-developer-guide`; `clf-c02:aws-doc:trusted-advisor`; `clf-c02:aws-doc:vpc-what-is` | Add threat and protection sources: `clf-c02:aws-doc:waf-what-is` -> https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html; `clf-c02:aws-doc:shield-overview` -> https://aws.amazon.com/shield/; `clf-c02:aws-doc:guardduty-what-is` -> https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html; `clf-c02:aws-doc:security-hub-what-is` -> https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html. P2: Inspector and Macie official docs. |

Domain 2 unresolved gaps: IAM Identity Center/federation; KMS/encryption; Artifact/compliance reports; WAF/Shield/GuardDuty/Security Hub. All proposed sources are official public AWS docs/pages.

### Domain 3: Cloud Technology and Services (34%)

The current catalog covers a small but important seed set: EC2, S3, RDS, VPC, CloudWatch, CloudTrail, Config, and Well-Architected. It does not yet cover enough service-selection breadth for a Cloud Practitioner RAG corpus.

| Family | Priority | Existing official source records | Required gaps / proposed source records |
|---|---|---|---|
| Deployment and operations tools | P0 / P1 | `clf-c02:aws-doc:cloudwatch-what-is`; `clf-c02:aws-doc:cloudtrail-user-guide`; `clf-c02:aws-doc:config-developer-guide` | Add `clf-c02:aws-doc:cloudformation-what-is` -> https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html. Add `clf-c02:aws-doc:systems-manager-what-is` -> https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html. Add public AWS CLI/console overview only if needed for task 3.1. |
| Global infrastructure and edge | P0 | none except exam guide | Add `clf-c02:aws-doc:global-infrastructure` -> https://aws.amazon.com/about-aws/global-infrastructure/. Add `clf-c02:aws-doc:cloudfront-what-is` -> https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html. Add `clf-c02:aws-doc:route-53-what-is` -> https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html. Public AWS material. |
| Compute | P0 / P1 | `clf-c02:aws-doc:ec2-what-is` | Add `clf-c02:aws-doc:lambda-welcome` -> https://docs.aws.amazon.com/lambda/latest/dg/welcome.html. Add `clf-c02:aws-doc:auto-scaling-what-is` -> https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html. Add `clf-c02:aws-doc:elastic-load-balancing-what-is` -> https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html. P1: ECS/Fargate, EKS, Elastic Beanstalk, Lightsail. |
| Database | P0 / P1 | `clf-c02:aws-doc:rds-welcome` | Add `clf-c02:aws-doc:dynamodb-welcome` -> https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html. Add `clf-c02:aws-doc:aurora-overview` -> https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html. P1: ElastiCache, Redshift. Public AWS docs. |
| Networking and content delivery | P0 / P1 | `clf-c02:aws-doc:vpc-what-is` | Add Route 53 and CloudFront as above. Add `clf-c02:aws-doc:direct-connect-what-is` -> https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html and `clf-c02:aws-doc:site-to-site-vpn-what-is` -> https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html if hybrid networking is included in first breadth pass. |
| Storage | P0 / P1 | `clf-c02:aws-doc:s3-welcome` | Add `clf-c02:aws-doc:ebs-what-is` -> https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html. Add `clf-c02:aws-doc:efs-what-is` -> https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html. Add `clf-c02:aws-doc:s3-glacier-storage-classes` -> https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html. P1: FSx, Backup, Storage Gateway. Public AWS docs. |
| AI/ML and analytics recognition | P2 for CLF first corpus | none | Do not import AIF-C01 framing. If CLF-C02 service-recognition coverage needs it, add official product/docs pages for SageMaker, Comprehend, Rekognition, Athena, Glue, Kinesis, QuickSight, and Redshift with CLF-C02 service-selection summaries only. |
| Messaging/eventing/integration | P1 / P2 | none | Add `sns`, `sqs`, and `eventbridge` docs only after P0 gaps. Public AWS docs. |

Domain 3 unresolved gaps: global infrastructure; Lambda/serverless; Auto Scaling/ELB; containers; DynamoDB/Aurora; Route 53/CloudFront; EBS/EFS/Glacier; CloudFormation/Systems Manager. This is the largest first-corpus gap because Domain 3 has the highest weight.

### Domain 4: Billing, Pricing, and Support (12%)

| Task / family | Priority | Existing official source records | Required gaps / proposed source records |
|---|---|---|---|
| 4.1 Pricing models | P0 / P1 | `clf-c02:aws-doc:pricing-calculator`; `clf-c02:aws-doc:cost-explorer`; `clf-c02:aws-doc:billing-cost-management` | Add `clf-c02:aws-doc:pricing-main` -> https://aws.amazon.com/pricing/. Add `clf-c02:aws-doc:free-tier` -> https://aws.amazon.com/free/. Add `clf-c02:aws-doc:savings-plans` -> https://aws.amazon.com/savingsplans/. Add EC2 pricing option docs for On-Demand/Reserved/Spot/Dedicated if question coverage requires distinctions. Public AWS material. |
| 4.2 Billing, budgets, cost tools | Existing + P1 | `clf-c02:aws-doc:billing-cost-management`; `clf-c02:aws-doc:cost-explorer`; `clf-c02:aws-doc:pricing-calculator`; `clf-c02:aws-doc:organizations-service-control-policies`; `clf-c02:aws-doc:trusted-advisor` | Add `clf-c02:aws-doc:budgets-managing-costs` -> https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html. Add `clf-c02:aws-doc:cur-what-is` -> https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html. Add AWS Marketplace public docs if needed. |
| 4.3 Technical resources and support | Existing + P1 | `clf-c02:aws-doc:support-plans`; `clf-c02:aws-doc:trusted-advisor`; certification page | Add `clf-c02:aws-doc:repost` -> https://repost.aws/ and `clf-c02:aws-doc:knowledge-center` -> https://repost.aws/knowledge-center/ as official AWS support resources. Mark as public web support resources, not primary quiz-fact sources unless facts are verified against AWS support pages. |

Domain 4 unresolved gaps: Free Tier; Savings Plans / Reserved / Spot / Dedicated pricing distinctions; Budgets; Cost and Usage Report; public self-service support resources.

## First-corpus add order

Recommended next source additions for a coder, in order:

1. `clf-c02:aws-whitepaper:overview-of-amazon-web-services` - https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html
2. `clf-c02:aws-doc:global-infrastructure` - https://aws.amazon.com/about-aws/global-infrastructure/
3. `clf-c02:aws-doc:cloud-adoption-framework` - https://aws.amazon.com/cloud-adoption-framework/
4. `clf-c02:aws-doc:lambda-welcome` - https://docs.aws.amazon.com/lambda/latest/dg/welcome.html
5. `clf-c02:aws-doc:dynamodb-welcome` - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html
6. `clf-c02:aws-doc:cloudfront-what-is` - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html
7. `clf-c02:aws-doc:route-53-what-is` - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html
8. `clf-c02:aws-doc:kms-overview` - https://docs.aws.amazon.com/kms/latest/developerguide/overview.html
9. `clf-c02:aws-doc:iam-identity-center-what-is` - https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html
10. `clf-c02:aws-doc:waf-what-is` - https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html
11. `clf-c02:aws-doc:guardduty-what-is` - https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html
12. `clf-c02:aws-doc:cloudformation-what-is` - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html
13. `clf-c02:aws-doc:systems-manager-what-is` - https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html
14. `clf-c02:aws-doc:ebs-what-is` - https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html
15. `clf-c02:aws-doc:efs-what-is` - https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html
16. `clf-c02:aws-doc:pricing-main` - https://aws.amazon.com/pricing/
17. `clf-c02:aws-doc:free-tier` - https://aws.amazon.com/free/
18. `clf-c02:aws-doc:budgets-managing-costs` - https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html
19. `clf-c02:aws-doc:cur-what-is` - https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html
20. `clf-c02:aws-doc:aws-artifact` - https://aws.amazon.com/artifact/

All 20 recommended next additions are official AWS-owned public documentation/pages/whitepapers. None require real exam content. None should be sourced from AIF-C01 artifacts.

## Auth-gated, unstable, or out-of-scope flags

| Item | Classification | Handling |
|---|---|---|
| AWS Skill Builder Cloud Practitioner exam prep / Essentials landing pages | Official AWS public landing pages; internals may be auth-gated | OK to catalog landing pages as `aws_skill_builder` with `freshness_status: auth_gated` if internal course text cannot be fetched publicly. Do not copy course text/transcripts. |
| AWS exam guide PDF | Official public AWS PDF | Existing catalog record is OK. Current ingestion hashes the binary and intentionally skips text extraction. Keep citation to PDF; do not copy large exam-guide prose. |
| AWS Overview whitepaper | Official public AWS whitepaper | Good P0 broad service source. Chunk section-aware and cite specific sections. |
| AWS re:Post / Knowledge Center | Official AWS public support resources | Use for support-resource recognition only; avoid using community Q&A answers as primary factual authority when docs/support plan pages can cite the same fact. |
| Service pricing pages | Official public AWS pages but change frequently | Mark with shorter stale window if needed. Prefer pricing model facts over exact prices. |
| Third-party courses/videos/articles | Out of scope for first corpus | Do not add now. If added later, mark supporting/candidate and verify every fact against official AWS sources. |
| Exam dumps / leaked questions / answer keys | Disallowed | Never ingest or cite. |

## Coder handoff

Concrete implementation path:

1. Add P0/P1 records to `data/sources/source_catalog.json`; do not create a parallel source schema.
2. Preserve every current CLF-C02 source id listed above; only append/adjust mappings.
3. For each new record, use CLF-C02-specific `domains`, `concepts`, `summary`, `extracted_facts`, `exam_relevance.exam_code: "CLF-C02"`, and a `separation_note` that forbids AIF-C01 reuse without a separate record.
4. For economics sources already present under Domain 4, consider adding Domain 1 task 1.4 mappings if the source explicitly supports cloud economics. This is a mapping fix, not a new source.
5. Run `npm run ingest:sources` only when live fetches are intended. If a public fetch fails, keep the record honest with `needs_refresh` or notes; do not synthesize replacement source content.
6. Run `npm run sources:check` after catalog/ingestion changes.
7. For RAG chunking, preserve `track_id`, `source_id`, domain/task mapping, section heading path, URL, citation text, content hash, and freshness status on every chunk.

## Reviewer checklist

- No AIF-C01 records or concepts appear in CLF-C02 source records.
- Every proposed source URL is AWS-owned/public, or explicitly marked auth-gated/unsupported.
- No real exam dumps, copied questions, answer keys, or proprietary training text appear in the catalog or generated artifacts.
- Domain 3 breadth improves before retrieval evals are declared useful.
- All generated chunks are citation-ready; no citation means no answer.
