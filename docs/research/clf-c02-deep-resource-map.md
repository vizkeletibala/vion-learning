# CLF-C02 Deep Exam Domain and AWS Resource Map

Verification date: 2026-06-03
Task: `t_2ec8cf2b`
Scope: AWS Certified Cloud Practitioner CLF-C02, official AWS sources first.
Ethics rule: this handoff intentionally contains original explanations only. It does not use, quote, imitate, or link to brain dumps, leaked exam questions, or unauthorized question banks.

## 1. Official source baseline

Use these as the authoritative source hierarchy for coder/content work:

1. AWS Certified Cloud Practitioner certification page
   - https://aws.amazon.com/certification/certified-cloud-practitioner/
   - Verified reachable: 2026-06-03
2. CLF-C02 Exam Guide PDF
   - https://d1.awsstatic.com/training-and-certification/docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf
   - Verified reachable: 2026-06-03
3. AWS Skill Builder Cloud Practitioner exam prep / Cloud Practitioner Essentials
   - https://skillbuilder.aws/exam-prep/cloud-practitioner
   - https://explore.skillbuilder.aws/learn/course/external/view/elearning/134/aws-cloud-practitioner-essentials
   - Verified as official AWS training references from current repo metadata; some course internals may require authenticated refresh.
4. AWS Cloud Adoption Framework
   - https://aws.amazon.com/cloud-adoption-framework/
   - Verified reachable: 2026-06-03
5. AWS Well-Architected Framework
   - https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html
   - Verified reachable: 2026-06-03
6. AWS shared responsibility model
   - https://aws.amazon.com/compliance/shared-responsibility-model/
   - Verified reachable: 2026-06-03
7. AWS pricing, Free Tier, cost management, and support
   - https://aws.amazon.com/pricing/
   - https://aws.amazon.com/free/
   - https://docs.aws.amazon.com/cost-management/latest/userguide/what-is-costmanagement.html
   - https://aws.amazon.com/premiumsupport/plans/
   - Verified reachable: 2026-06-03
8. AWS overview and service docs
   - https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html
   - Verified reachable: 2026-06-03

## 2. Exam domains, task statements, and concrete resource families

CLF-C02 official exam facts already captured in `data/sources/clf-c02/source_metadata.json`:

- Duration: 90 minutes
- Questions: 65 total; 50 scored and 15 unscored
- Format: multiple choice and multiple response
- Passing score: 700 on 100-1000 scale
- Cost: 100 USD
- Out-of-scope job tasks: coding, cloud architecture design, troubleshooting, implementation, load/performance testing

### Domain 1: Cloud Concepts (24%)

| Task | What learners must know | Concrete resource/service families |
|---|---|---|
| 1.1 Define benefits of the AWS Cloud | Value proposition, economies of scale, agility, elasticity, high availability, global reach | AWS global infrastructure, managed services, autoscaling, pay-as-you-go pricing |
| 1.2 Identify design principles of the AWS Cloud | Well-Architected pillars and design habits | AWS Well-Architected Framework/Tool, CloudWatch, CloudTrail, Auto Scaling, multi-AZ services |
| 1.3 Understand benefits and strategies for migration | CAF perspectives, migration motivations, 7 Rs, hybrid/transfer options | AWS CAF, Migration Hub, Application Migration Service, DMS, Snow Family, Storage Gateway |
| 1.4 Understand cloud economics | CapEx to OpEx, variable expense, right sizing, licenses, managed-service value | Pricing Calculator, Cost Explorer, Budgets, Savings Plans, Reserved Instances, Spot, CUR |

### Domain 2: Security and Compliance (30%)

| Task | What learners must know | Concrete resource/service families |
|---|---|---|
| 2.1 Shared responsibility model | AWS vs customer responsibility changes by service abstraction | EC2, RDS, Lambda, S3, IAM, KMS, managed services |
| 2.2 Security, governance, compliance concepts | Encryption, least privilege, root user protection, compliance reports | IAM, MFA, KMS, Artifact, Organizations, Control Tower, Config, CloudTrail |
| 2.3 Access management capabilities | Identities, roles, policies, federation, SCPs, Identity Center | IAM, IAM Identity Center, Organizations, STS, Cognito |
| 2.4 Security components/resources | Network controls, DDoS/web protection, threat detection, posture tools | Security groups, NACLs, WAF, Shield, GuardDuty, Inspector, Macie, Security Hub, Trusted Advisor |

### Domain 3: Cloud Technology and Services (34%)

| Task | What learners must know | Concrete resource/service families |
|---|---|---|
| 3.1 Deploying and operating | Console/CLI/SDK, IaC, managed vs self-managed, hybrid | Console, CLI, SDKs, CloudFormation, Elastic Beanstalk, Systems Manager, Outposts |
| 3.2 Global infrastructure | Regions, AZs, edge locations, regional/global services, HA/DR | Regions, AZs, Local Zones, Wavelength, CloudFront, Route 53, Global Accelerator |
| 3.3 Compute | Choose between VM, serverless, containers, simple VPS, batch | EC2, Auto Scaling, ELB, Lambda, ECS, EKS, Fargate, Lightsail, Batch, Beanstalk |
| 3.4 Database | Relational vs key-value/document/cache/graph/in-memory | RDS, Aurora, DynamoDB, ElastiCache, MemoryDB, Neptune, DMS |
| 3.5 Networking | Isolation, routing, DNS, CDN, hybrid connectivity, APIs | VPC, subnets, route tables, security groups, NACLs, Route 53, CloudFront, Direct Connect, VPN, API Gateway |
| 3.6 Storage | Object/block/file/archive/hybrid/transfer | S3, S3 Glacier classes, EBS, EFS, FSx, Storage Gateway, Snow Family, Backup |
| 3.7 AI/ML and analytics | Recognize managed AI/ML and analytics service use cases | SageMaker, Comprehend, Kendra, Lex, Polly, Rekognition, Textract, Transcribe, Translate, Athena, Glue, Kinesis, QuickSight, Redshift |
| 3.8 Other in-scope categories | Eventing, messaging, monitoring, audit, governance, developer/business apps | EventBridge, SNS, SQS, Step Functions, CloudWatch, CloudTrail, Config, Systems Manager, Organizations, Trusted Advisor, Well-Architected Tool |

### Domain 4: Billing, Pricing, and Support (12%)

| Task | What learners must know | Concrete resource/service families |
|---|---|---|
| 4.1 Pricing models | Pay-as-you-go vs commitments vs spare capacity vs dedicated hardware | On-Demand, Reserved Instances, Savings Plans, Spot Instances, Dedicated Hosts/Instances, Free Tier |
| 4.2 Billing/budget/cost tools | Estimate, monitor, alert, analyze, allocate, report, consolidate bills | Pricing Calculator, Billing console, Cost Explorer, Budgets, Cost and Usage Report, Organizations consolidated billing, Marketplace |
| 4.3 Technical resources and support | Support plan differences, self-service help, proactive guidance | Basic/Developer/Business/Enterprise Support, Trusted Advisor, re:Post, Knowledge Center, docs, whitepapers, AWS Partners |

## 3. Service/resource handoff matrix

Legend for each item:
- What it is: plain-English definition for beginner content.
- Use when: strongest Cloud Practitioner-level use case.
- Not: common wrong answer boundary.
- Confusion: beginner confusion to address in lessons/distractors.
- Pricing: exam-relevant cost angle.
- Security/SRM: shared-responsibility/security angle.
- Gotcha: original exam-style trap to teach, not copied question wording.
- Sources: official URL(s), verified date 2026-06-03 unless marked family-level.

### Cloud concepts, architecture, and migration

#### AWS Global Infrastructure: Regions, Availability Zones, edge locations
- What it is: AWS’s worldwide infrastructure; Regions are geographic areas, AZs are isolated locations inside a Region, and edge locations support low-latency content/DNS/security services.
- Use when: choosing where workloads/data live, designing availability, reducing latency.
- Not: a single global data center or a guarantee that all services exist everywhere.
- Confusion: learners mix Regions with AZs, or assume edge locations are general-purpose compute Regions.
- Pricing: Region choice can change service price and data-transfer cost.
- Security/SRM: customer chooses Regions for data residency; AWS secures physical facilities.
- Gotcha: high availability usually means multiple AZs in a Region; global low-latency content delivery points to CloudFront/edge.
- Sources: https://aws.amazon.com/about-aws/global-infrastructure/ ; https://docs.aws.amazon.com/whitepapers/latest/aws-overview/global-infrastructure.html

#### AWS Well-Architected Framework and AWS Well-Architected Tool
- What it is: design framework and assessment tool organized around operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability.
- Use when: evaluating architecture principles, risks, and improvement plans.
- Not: a deployment service or a managed monitoring agent.
- Confusion: students often forget sustainability is now a pillar.
- Pricing: framework is guidance; Tool is used to assess workloads and may connect to improvement activities that involve services.
- Security/SRM: security pillar reinforces identity, detection, infrastructure protection, data protection, incident response.
- Gotcha: Well-Architected asks how to design/operate; Trusted Advisor checks account-level best practices.
- Sources: https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html ; https://aws.amazon.com/well-architected-tool/

#### AWS Cloud Adoption Framework (AWS CAF)
- What it is: guidance for business/people/governance/platform/security/operations perspectives during cloud adoption.
- Use when: organizing migration and transformation responsibilities beyond technology alone.
- Not: a migration execution tool or data-transfer appliance.
- Confusion: CAF perspectives are organizational lenses; migration strategies are workload-level choices.
- Pricing: supports business cases and cost governance but does not itself price workloads.
- Security/SRM: security and governance perspectives help define controls, roles, and compliance.
- Gotcha: if scenario asks about organizational readiness, CAF is more fitting than CloudFormation or DMS.
- Sources: https://aws.amazon.com/cloud-adoption-framework/

#### AWS Migration Hub
- What it is: central place to discover, plan, and track migrations across AWS and partner tools.
- Use when: coordinating migration status across many servers/apps.
- Not: the service that physically transfers petabytes by truck.
- Confusion: Migration Hub tracks/orchestrates visibility; Application Migration Service replicates servers.
- Pricing: Migration Hub itself is generally used for tracking; connected migration services may have costs.
- Security/SRM: customer controls discovered inventory data and IAM access to migration views.
- Gotcha: central migration tracking points to Migration Hub, not CloudWatch.
- Sources: https://aws.amazon.com/migration-hub/ ; https://docs.aws.amazon.com/migrationhub/latest/ug/whatishub.html

#### AWS Application Migration Service
- What it is: lift-and-shift service for replicating source servers into AWS.
- Use when: migrating existing servers with minimal changes.
- Not: a database schema conversion tool.
- Confusion: Application Migration Service is for server/workload replication; DMS is for databases.
- Pricing: replication/staging resources and target resources can incur costs.
- Security/SRM: customer manages source credentials, IAM, replication settings, and post-cutover hardening.
- Gotcha: “rehost” scenarios map here more than to Elastic Beanstalk.
- Sources: https://aws.amazon.com/application-migration-service/ ; https://docs.aws.amazon.com/mgn/latest/ug/what-is-application-migration-service.html

#### AWS Database Migration Service (DMS) and Schema Conversion Tool
- What it is: managed database migration/replication; SCT helps convert schemas between database engines.
- Use when: moving or continuously replicating databases to AWS, including heterogeneous migrations with conversion.
- Not: a general file-transfer or server-migration tool.
- Confusion: DMS moves/replicates data; SCT helps convert schema/code objects.
- Pricing: replication instances, storage, data transfer, and target databases can cost money.
- Security/SRM: customer manages endpoints, credentials/secrets, network access, encryption, and validation.
- Gotcha: ongoing replication for databases points to DMS, not Snowball.
- Sources: https://aws.amazon.com/dms/ ; https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html

#### AWS Snow Family
- What it is: physical devices/services for offline edge processing and large-scale data transfer.
- Use when: network transfer is too slow, expensive, or unavailable.
- Not: an online CDN, object storage class, or backup schedule.
- Confusion: Snowball/Snowcone/Snowmobile are devices/approaches; S3 is the destination/storage service.
- Pricing: device/job fees, shipping, extra days, and data transfer considerations.
- Security/SRM: devices include encryption/tamper controls; customer still owns data handling, access, and import/export choices.
- Gotcha: petabyte-scale transfer with limited bandwidth points to Snow Family rather than Direct Connect alone.
- Sources: https://aws.amazon.com/snow/ ; https://docs.aws.amazon.com/snowball/latest/developer-guide/whatisedge.html

### Security, identity, and compliance

#### AWS Identity and Access Management (IAM)
- What it is: service for identities, policies, roles, and permissions in AWS accounts.
- Use when: granting least-privilege access to AWS resources.
- Not: a directory UI for workforce single sign-on by itself; that is IAM Identity Center.
- Confusion: roles are assumed and temporary; users are long-term identities; policies define permissions.
- Pricing: IAM has no separate charge; resources accessed still cost.
- Security/SRM: customer is responsible for identity design, least privilege, MFA, key rotation, and policy review.
- Gotcha: applications on EC2 should usually use roles, not embedded access keys.
- Sources: https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html ; https://aws.amazon.com/iam/

#### AWS IAM Identity Center
- What it is: AWS workforce identity/federated access service for managing access to multiple AWS accounts and apps.
- Use when: centralizing workforce SSO across Organizations/accounts.
- Not: Cognito user sign-up/sign-in for customer-facing apps.
- Confusion: Identity Center is for workforce access; Cognito is for application users.
- Pricing: no separate charge for IAM Identity Center; connected identity providers/apps may vary.
- Security/SRM: customer configures permission sets, assignments, identity source, MFA/federation practices.
- Gotcha: multi-account workforce access points to Identity Center plus Organizations.
- Sources: https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html ; https://aws.amazon.com/iam/identity-center/

#### AWS Organizations and Service Control Policies (SCPs)
- What it is: account-management service for grouping AWS accounts and applying governance controls like SCPs.
- Use when: managing multi-account environments, consolidated billing, and guardrails.
- Not: an IAM policy replacement for granting permissions inside an account.
- Confusion: SCPs set maximum available permissions; they do not grant access by themselves.
- Pricing: Organizations has no extra charge; member account resources cost as usual.
- Security/SRM: customer designs account structure, SCP guardrails, delegated admin, and billing access.
- Gotcha: if a user has IAM allow but an SCP denies, access is still blocked.
- Sources: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html ; https://aws.amazon.com/organizations/

#### AWS Key Management Service (KMS)
- What it is: managed service for creating and controlling cryptographic keys used by AWS services and applications.
- Use when: encrypting data with customer-managed keys and auditing key use.
- Not: a password vault for application secrets; use Secrets Manager for that.
- Confusion: KMS manages keys; S3/EBS/RDS use KMS keys for encryption.
- Pricing: customer-managed keys and API requests can cost money.
- Security/SRM: customer controls key policies, grants, rotation choices, and access; AWS operates the service.
- Gotcha: “manage encryption keys” points to KMS, while “store database credentials” points to Secrets Manager.
- Sources: https://aws.amazon.com/kms/ ; https://docs.aws.amazon.com/kms/latest/developerguide/overview.html

#### AWS Secrets Manager
- What it is: managed service for storing, rotating, and retrieving secrets such as database credentials and API keys.
- Use when: applications need secure secret storage with rotation workflows.
- Not: a general encryption-key management system; KMS underpins encryption but Secrets Manager stores secrets.
- Confusion: Parameter Store can store config; Secrets Manager focuses on secrets and rotation.
- Pricing: charges for secrets and API calls.
- Security/SRM: customer controls secret values, rotation, IAM access, and application usage.
- Gotcha: automatic credential rotation is a strong signal for Secrets Manager.
- Sources: https://aws.amazon.com/secrets-manager/ ; https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html

#### AWS Artifact
- What it is: self-service portal for AWS compliance reports and select agreements.
- Use when: downloading SOC/PCI/ISO compliance reports or reviewing agreements.
- Not: a threat detection or audit-log collection service.
- Confusion: Artifact provides compliance documents; CloudTrail records account activity.
- Pricing: available at no additional cost.
- Security/SRM: customer uses reports as evidence but still must meet their own compliance obligations.
- Gotcha: “obtain AWS compliance report” points to Artifact.
- Sources: https://aws.amazon.com/artifact/ ; https://docs.aws.amazon.com/artifact/latest/ug/what-is-aws-artifact.html

#### Amazon GuardDuty
- What it is: threat detection service using logs/signals to identify suspicious activity.
- Use when: detecting compromised credentials, unusual API calls, malicious IPs, or malware findings.
- Not: a firewall that blocks all web requests by rules.
- Confusion: GuardDuty detects; WAF filters web requests; Security Hub aggregates posture/findings.
- Pricing: typically based on analyzed events/logs and feature usage.
- Security/SRM: customer enables service, triages findings, and remediates; AWS operates detection infrastructure.
- Gotcha: “intelligent threat detection” is GuardDuty, not Inspector.
- Sources: https://aws.amazon.com/guardduty/ ; https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html

#### AWS Security Hub
- What it is: central service for security posture management and aggregating findings from AWS/security tools.
- Use when: collecting, prioritizing, and checking security findings/compliance standards across accounts.
- Not: the scanner that directly finds software vulnerabilities; that is Inspector for workloads.
- Confusion: Security Hub aggregates; GuardDuty detects threats; Inspector scans vulnerabilities.
- Pricing: charged by security checks and finding ingestion/events.
- Security/SRM: customer enables standards, integrates accounts, reviews/remediates findings.
- Gotcha: “single pane of glass for security findings” points to Security Hub.
- Sources: https://aws.amazon.com/security-hub/ ; https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html

#### Amazon Inspector
- What it is: automated vulnerability management for EC2, ECR container images, and Lambda workloads.
- Use when: scanning workloads for software vulnerabilities and unintended network exposure.
- Not: a general threat-detection service for account behavior.
- Confusion: Inspector scans vulnerabilities; GuardDuty detects suspicious activity.
- Pricing: based on scanned resources such as instances/images/functions.
- Security/SRM: customer remediates vulnerabilities and manages patching/configuration within their responsibility.
- Gotcha: “find CVEs in EC2/container images/Lambda” points to Inspector.
- Sources: https://aws.amazon.com/inspector/ ; https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html

#### Amazon Macie
- What it is: data security service that discovers sensitive data such as PII in S3.
- Use when: identifying and monitoring sensitive data exposure in S3 buckets.
- Not: a general S3 storage class or encryption key manager.
- Confusion: Macie discovers sensitive data; KMS manages keys; S3 Block Public Access prevents public exposure settings.
- Pricing: charged for bucket inventory/evaluation and sensitive-data discovery jobs.
- Security/SRM: customer classifies data, remediates public/sensitive exposure, and tunes findings.
- Gotcha: “discover PII in S3” is Macie.
- Sources: https://aws.amazon.com/macie/ ; https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html

#### AWS WAF, AWS Shield, and AWS Firewall Manager
- What it is: WAF filters HTTP/S requests; Shield provides DDoS protection; Firewall Manager centrally manages firewall/security policies.
- Use when: protecting web apps/APIs and centrally managing web/network protections across accounts.
- Not: a replacement for IAM or host patching.
- Confusion: WAF handles layer 7 web rules; Shield handles DDoS; security groups/NACLs control VPC traffic.
- Pricing: WAF rules/requests and Shield Advanced/Firewall Manager have charges; Shield Standard is automatic at no extra cost.
- Security/SRM: customer writes rules/policies and responds to events; AWS provides managed protection services.
- Gotcha: SQL injection/XSS web request filtering points to WAF, not security groups.
- Sources: https://aws.amazon.com/waf/ ; https://aws.amazon.com/shield/ ; https://aws.amazon.com/firewall-manager/

#### Security groups and network ACLs
- What it is: VPC network controls; security groups are stateful instance/ENI-level firewalls, NACLs are stateless subnet-level controls.
- Use when: controlling inbound/outbound traffic in a VPC.
- Not: web application firewalls for HTTP-specific attacks.
- Confusion: security groups are allow rules and stateful; NACLs need inbound and outbound rules and are stateless.
- Pricing: no separate charge for basic SG/NACL use; resources/data transfer still cost.
- Security/SRM: customer configures rules and reviews exposure.
- Gotcha: if return traffic is not explicitly allowed in a NACL, stateless behavior can block it.
- Sources: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html ; https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html

### Compute and containers

#### Amazon EC2
- What it is: resizable virtual servers in AWS.
- Use when: learners need full control over OS, runtime, instance size, and networking.
- Not: serverless compute or a managed database.
- Confusion: EC2 gives control but more customer responsibility than Lambda/RDS.
- Pricing: On-Demand, Reserved Instances, Savings Plans, Spot, Dedicated Hosts, data transfer, EBS, and licensing affect cost.
- Security/SRM: customer patches guest OS/apps, configures security groups, IAM roles, AMIs, and data protection; AWS secures physical infrastructure/hypervisor.
- Gotcha: “need OS-level control” points to EC2; “run code without managing servers” points to Lambda.
- Sources: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html ; https://aws.amazon.com/ec2/

#### AWS Lambda
- What it is: serverless function compute that runs code in response to events.
- Use when: event-driven workloads need no server management and scale automatically.
- Not: a long-running VM or persistent database.
- Confusion: Lambda abstracts servers, but customers still own code, dependencies, IAM, data, and function configuration.
- Pricing: requests and execution duration; free tier exists with limits.
- Security/SRM: customer manages code security, IAM execution role, environment variables/secrets, and event permissions.
- Gotcha: short event-driven code with automatic scaling points to Lambda, not EC2.
- Sources: https://aws.amazon.com/lambda/ ; https://docs.aws.amazon.com/lambda/latest/dg/welcome.html

#### Amazon EC2 Auto Scaling and Elastic Load Balancing
- What it is: Auto Scaling adjusts EC2 capacity; ELB distributes traffic across targets.
- Use when: workloads need elasticity, high availability, and traffic distribution.
- Not: a CDN or DNS service.
- Confusion: Auto Scaling changes instance count; ELB routes traffic to healthy targets.
- Pricing: Auto Scaling has no extra charge; ELB and EC2 resources cost money.
- Security/SRM: customer configures scaling policies, health checks, target groups, TLS/listeners, and SGs.
- Gotcha: “add/remove EC2 instances based on demand” is Auto Scaling; “spread HTTP traffic across instances” is ALB/ELB.
- Sources: https://aws.amazon.com/ec2/autoscaling/ ; https://aws.amazon.com/elasticloadbalancing/

#### Amazon ECS, Amazon EKS, AWS Fargate, Amazon ECR
- What it is: ECS and EKS orchestrate containers; Fargate runs containers without managing servers; ECR stores container images.
- Use when: deploying containerized applications.
- Not: a general VM service or object storage service.
- Confusion: ECS is AWS-native orchestration; EKS is managed Kubernetes; Fargate is serverless compute mode; ECR is registry.
- Pricing: clusters/control planes, running tasks/pods, Fargate vCPU/memory, EC2 nodes, and image storage/transfer can cost.
- Security/SRM: customer owns images, IAM/task roles, network policy/SGs, secrets, patching images; AWS manages service control planes per service model.
- Gotcha: “Kubernetes” is EKS; “no server management for containers” suggests Fargate.
- Sources: https://aws.amazon.com/ecs/ ; https://aws.amazon.com/eks/ ; https://aws.amazon.com/fargate/ ; https://aws.amazon.com/ecr/

#### AWS Elastic Beanstalk
- What it is: platform service for deploying and managing web apps while AWS provisions underlying resources.
- Use when: developers want quick app deployment without manually assembling EC2/ELB/Auto Scaling.
- Not: a no-code website builder or container registry.
- Confusion: Beanstalk is managed deployment orchestration; you still pay for created resources.
- Pricing: no additional Beanstalk charge; underlying EC2/ELB/RDS/etc. cost.
- Security/SRM: customer owns app code, platform configuration, environment variables, IAM, and patch choices.
- Gotcha: “upload code and AWS handles provisioning common app stack” points to Beanstalk.
- Sources: https://aws.amazon.com/elasticbeanstalk/ ; https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html

#### Amazon Lightsail
- What it is: simplified VPS, storage, database, and networking bundles for simpler workloads.
- Use when: beginner/simple websites, dev/test, or predictable small app hosting.
- Not: the main highly configurable EC2 platform for enterprise architectures.
- Confusion: Lightsail bundles simplicity; EC2 provides deeper configuration and scaling options.
- Pricing: predictable monthly bundles plus possible data/extra resource charges.
- Security/SRM: customer still patches OS/apps and manages credentials/firewall.
- Gotcha: simple WordPress/VPS scenario for beginners may indicate Lightsail.
- Sources: https://aws.amazon.com/lightsail/ ; https://docs.aws.amazon.com/lightsail/latest/userguide/what-is-amazon-lightsail.html

#### AWS Batch
- What it is: managed batch processing service that provisions compute to run jobs.
- Use when: running large-scale batch jobs, scientific jobs, or queued compute workloads.
- Not: a real-time request/response web app platform.
- Confusion: Batch schedules jobs; Lambda runs short event functions; Step Functions orchestrates workflows.
- Pricing: no extra Batch charge for orchestration; pay for underlying compute/storage.
- Security/SRM: customer manages job definitions, images/code, IAM roles, data access.
- Gotcha: queued batch workloads point to Batch, not Auto Scaling alone.
- Sources: https://aws.amazon.com/batch/ ; https://docs.aws.amazon.com/batch/latest/userguide/what-is-batch.html

#### AWS Outposts, Local Zones, and Wavelength
- What it is: infrastructure options that extend AWS closer to on-premises sites, metros, or 5G networks.
- Use when: low latency, local data processing, residency, or hybrid requirements exist.
- Not: ordinary AWS Regions or CDN edge caches.
- Confusion: Outposts is AWS infrastructure on-premises; Local Zones are metro extensions; Wavelength targets 5G edge.
- Pricing: dedicated infrastructure/capacity and service usage vary by option.
- Security/SRM: customer handles local facility/network requirements and workload configuration; AWS manages AWS-operated infrastructure components.
- Gotcha: “AWS services in your data center” points to Outposts, not Direct Connect.
- Sources: https://aws.amazon.com/outposts/ ; https://aws.amazon.com/about-aws/global-infrastructure/localzones/ ; https://aws.amazon.com/wavelength/

### Storage

#### Amazon S3
- What it is: durable object storage for buckets/objects.
- Use when: storing static assets, backups, data lakes, logs, and object data.
- Not: a block volume mounted as a boot disk or a POSIX file system by default.
- Confusion: S3 is object storage; EBS is block; EFS/FSx are file systems.
- Pricing: storage GB-month, requests, retrievals, lifecycle tier, replication, and data transfer.
- Security/SRM: customer controls bucket policies/IAM, encryption, public access, lifecycle, object ownership, and data classification.
- Gotcha: public website/static objects can use S3, but a boot volume for EC2 is EBS.
- Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html ; https://aws.amazon.com/s3/

#### S3 storage classes and S3 Glacier classes
- What it is: S3 storage tiers for different access patterns, durability, retrieval-time, and cost needs.
- Use when: optimizing object storage cost for frequent, infrequent, archive, or deep archive access.
- Not: a separate tape-backup service outside S3.
- Confusion: Glacier Flexible Retrieval/Deep Archive are archive classes; Standard-IA/One Zone-IA are infrequent-access classes.
- Pricing: lower storage price often means retrieval fees, minimum storage duration, and retrieval latency.
- Security/SRM: same S3 access/encryption responsibilities apply.
- Gotcha: immediate frequent access is S3 Standard; lowest-cost long-term archive often points to Deep Archive.
- Sources: https://aws.amazon.com/s3/storage-classes/ ; https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html

#### Amazon EBS
- What it is: persistent block storage volumes for EC2.
- Use when: EC2 instances need boot volumes or block devices/databases/file systems.
- Not: shared network file storage for many instances by default, or object storage.
- Confusion: stopping EC2 does not necessarily delete EBS; instance store is ephemeral.
- Pricing: volume type/GB-month, provisioned IOPS/throughput, snapshots.
- Security/SRM: customer manages encryption, snapshots, attachment, filesystem, and backups.
- Gotcha: “low-latency block storage attached to EC2” is EBS.
- Sources: https://aws.amazon.com/ebs/ ; https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html

#### Amazon EFS
- What it is: elastic managed NFS file system for Linux workloads.
- Use when: multiple EC2 instances/Lambda functions need shared file storage.
- Not: block storage for a single boot disk or Windows-native SMB file service.
- Confusion: EFS is file storage; EBS is block; S3 is object.
- Pricing: storage used, storage class, throughput mode, data transfer depending on architecture.
- Security/SRM: customer controls mount targets, SGs, access points, POSIX permissions, encryption.
- Gotcha: “shared Linux file system across instances” points to EFS.
- Sources: https://aws.amazon.com/efs/ ; https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html

#### Amazon FSx
- What it is: managed file systems for Windows File Server, Lustre, NetApp ONTAP, and OpenZFS.
- Use when: workloads require specific managed file-system compatibility/performance.
- Not: general object storage.
- Confusion: FSx for Windows supports SMB/Windows workloads; EFS is NFS/Linux-oriented.
- Pricing: file-system type, storage, throughput, backups.
- Security/SRM: customer manages access integration, network paths, file permissions, backups/config.
- Gotcha: “Windows shared file storage” points to FSx for Windows, not EFS.
- Sources: https://aws.amazon.com/fsx/ ; https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html

#### AWS Storage Gateway
- What it is: hybrid cloud storage service connecting on-premises apps to AWS storage.
- Use when: on-premises environments need file, volume, or tape gateway integration with AWS.
- Not: an offline shipping device like Snowball.
- Confusion: Storage Gateway is online hybrid integration; Snow Family is physical transfer/edge device.
- Pricing: gateway usage, storage, requests, retrieval, and data transfer depending on mode.
- Security/SRM: customer manages appliance deployment, network, credentials, local cache, and data policies.
- Gotcha: “on-prem app needs cloud-backed file/tape/volume interface” points to Storage Gateway.
- Sources: https://aws.amazon.com/storagegateway/ ; https://docs.aws.amazon.com/storagegateway/latest/userguide/WhatIsStorageGateway.html

#### AWS Backup and AWS Elastic Disaster Recovery
- What it is: AWS Backup centralizes backup policies; Elastic Disaster Recovery provides block-level replication and recovery for servers.
- Use when: centrally protecting AWS resources or preparing rapid server recovery.
- Not: an archive storage class or a high-availability load balancer.
- Confusion: backup/restore is not the same as multi-AZ HA or DR replication.
- Pricing: backup storage, restores, warm resources/staging and replication costs vary.
- Security/SRM: customer defines backup plans, vault access, retention, recovery testing, and compliance controls.
- Gotcha: centralized backup policy across resources points to AWS Backup.
- Sources: https://aws.amazon.com/backup/ ; https://aws.amazon.com/disaster-recovery/

### Databases and caching

#### Amazon RDS
- What it is: managed relational database service for engines such as MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, and Db2.
- Use when: applications need relational SQL databases with managed backups/patching options.
- Not: serverless key-value NoSQL or an object store.
- Confusion: RDS manages database infrastructure; customer still designs schema, users, data, and configuration.
- Pricing: DB instance class, storage, I/O, backups, Multi-AZ, licenses, data transfer.
- Security/SRM: AWS manages much of the infrastructure; customer manages data, access, network, encryption choices, and database-level permissions.
- Gotcha: standard relational database requirement often points to RDS; high AWS-native MySQL/Postgres performance may point to Aurora.
- Sources: https://aws.amazon.com/rds/ ; https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html

#### Amazon Aurora
- What it is: AWS-managed relational database compatible with MySQL and PostgreSQL, designed for cloud performance/availability.
- Use when: needing managed relational compatibility with higher scalability/availability features.
- Not: a NoSQL document/key-value service.
- Confusion: Aurora is part of RDS family but has its own distributed storage architecture/features.
- Pricing: instances or capacity mode, storage/I/O, backup, data transfer; Serverless has capacity-based pricing.
- Security/SRM: customer controls data/schema/IAM/network/encryption; AWS manages service infrastructure.
- Gotcha: “MySQL/PostgreSQL-compatible with cloud-native performance” points to Aurora.
- Sources: https://aws.amazon.com/rds/aurora/ ; https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html

#### Amazon DynamoDB
- What it is: serverless NoSQL key-value/document database.
- Use when: applications need low-latency scalable NoSQL access without managing servers.
- Not: relational SQL with joins/foreign keys.
- Confusion: DynamoDB tables require access-pattern thinking; not just “RDS but serverless.”
- Pricing: on-demand or provisioned read/write capacity, storage, streams, backups, global tables.
- Security/SRM: customer controls IAM, table policies, encryption, item data, backups, and access patterns.
- Gotcha: “single-digit millisecond key-value at any scale” points to DynamoDB.
- Sources: https://aws.amazon.com/dynamodb/ ; https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html

#### Amazon ElastiCache and Amazon MemoryDB for Redis
- What it is: ElastiCache provides managed in-memory caches; MemoryDB is durable Redis-compatible in-memory database.
- Use when: reducing database load/latency with cache, or needing Redis-compatible durable in-memory database.
- Not: primary relational database replacement for SQL transactions.
- Confusion: ElastiCache is commonly cache-focused; MemoryDB emphasizes durability as primary database.
- Pricing: node/serverless usage, storage/data transfer/backups depending service.
- Security/SRM: customer manages access, subnet/security groups, encryption, auth tokens/users, cache invalidation/data model.
- Gotcha: “cache session/query results” is ElastiCache; “durable Redis database” is MemoryDB.
- Sources: https://aws.amazon.com/elasticache/ ; https://aws.amazon.com/memorydb/

#### Amazon Neptune
- What it is: managed graph database.
- Use when: data is highly connected, such as relationships, fraud graphs, knowledge graphs, recommendations.
- Not: general relational table storage or object storage.
- Confusion: graph databases answer relationship traversal questions, not just any analytics query.
- Pricing: instances, storage, I/O, backup, data transfer.
- Security/SRM: customer controls graph data, IAM/network/database access, encryption, backups.
- Gotcha: “find relationships between connected entities” points to Neptune.
- Sources: https://aws.amazon.com/neptune/ ; https://docs.aws.amazon.com/neptune/latest/userguide/intro.html

### Networking and content delivery

#### Amazon VPC, subnets, route tables, gateways, endpoints
- What it is: logically isolated virtual networking for AWS resources.
- Use when: controlling IP ranges, subnets, routing, internet/private connectivity, and network segmentation.
- Not: a physical data center or a DNS service by itself.
- Confusion: public subnet needs route to internet gateway; private subnet does not automatically mean encrypted/secure.
- Pricing: VPC itself has no charge, but NAT gateways, endpoints, VPN, traffic, and IPs can cost.
- Security/SRM: customer designs CIDRs, routing, SGs/NACLs, endpoints, flow logs, and segmentation.
- Gotcha: “isolate resources in a virtual network” points to VPC.
- Sources: https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html ; https://aws.amazon.com/vpc/

#### Amazon Route 53
- What it is: scalable DNS and domain registration/health-check service.
- Use when: routing users to applications by domain name, DNS failover, domain registration.
- Not: a CDN or load balancer.
- Confusion: Route 53 resolves names; CloudFront caches content; ELB balances targets.
- Pricing: hosted zones, DNS queries, health checks, domain registration.
- Security/SRM: customer controls DNS records, domain ownership, routing policies, and access permissions.
- Gotcha: “DNS service” or “register domain” points to Route 53.
- Sources: https://aws.amazon.com/route53/ ; https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html

#### Amazon CloudFront
- What it is: CDN that caches and delivers content from edge locations.
- Use when: reducing latency and offloading origins for static/dynamic content and APIs.
- Not: primary object storage or DNS registrar.
- Confusion: S3 stores objects; CloudFront distributes/caches them.
- Pricing: data transfer out, HTTP requests, invalidations beyond free allowance, features.
- Security/SRM: customer configures origins, cache behaviors, TLS, WAF integration, signed URLs/cookies as needed.
- Gotcha: global low-latency delivery for static website assets points to CloudFront.
- Sources: https://aws.amazon.com/cloudfront/ ; https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html

#### AWS Direct Connect and AWS VPN
- What it is: Direct Connect is dedicated private network connectivity; AWS VPN is encrypted VPN connectivity over internet or client connections.
- Use when: hybrid connectivity is required between on-premises and AWS.
- Not: internet gateway for public web users.
- Confusion: Direct Connect is not encrypted by default; VPN provides encrypted tunnels.
- Pricing: port-hours/data transfer for Direct Connect; VPN connection-hours/data transfer for VPN.
- Security/SRM: customer manages routing, encryption choices, customer gateways/devices, and network controls.
- Gotcha: predictable dedicated bandwidth points to Direct Connect; encrypted tunnel over internet points to VPN.
- Sources: https://aws.amazon.com/directconnect/ ; https://aws.amazon.com/vpn/

#### Amazon API Gateway
- What it is: managed service to create, publish, secure, monitor, and throttle APIs.
- Use when: fronting Lambda or HTTP backends with managed API controls.
- Not: a container orchestrator or CDN-only service.
- Confusion: API Gateway manages API endpoints; Lambda runs code; CloudFront caches/distributes.
- Pricing: API calls, data transfer, caching depending API type.
- Security/SRM: customer configures auth, throttling, WAF, resource policies, stages, logging.
- Gotcha: “managed REST/WebSocket/API front door with throttling” points to API Gateway.
- Sources: https://aws.amazon.com/api-gateway/ ; https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html

#### AWS Global Accelerator
- What it is: networking service that improves global application availability/performance using static anycast IPs and AWS global network.
- Use when: global users need improved routing to regional endpoints.
- Not: content cache/CDN; CloudFront caches content.
- Confusion: CloudFront is CDN; Global Accelerator routes TCP/UDP traffic to optimal endpoints.
- Pricing: accelerator-hours and data transfer premium.
- Security/SRM: customer configures endpoints/listeners and access controls on target resources.
- Gotcha: static anycast IPs and non-cache global acceleration point to Global Accelerator.
- Sources: https://aws.amazon.com/global-accelerator/ ; https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html

### Application integration, messaging, monitoring, and operations

#### Amazon SQS
- What it is: managed message queue service.
- Use when: decoupling components with asynchronous queue-based communication.
- Not: pub/sub fanout notification by itself; use SNS for pub/sub.
- Confusion: SQS is pull-based queue; SNS pushes notifications to subscribers.
- Pricing: requests and data transfer; payload/storage duration factors.
- Security/SRM: customer manages queue policies, encryption, DLQs, visibility timeout, consumer permissions.
- Gotcha: “buffer work between producer and worker” points to SQS.
- Sources: https://aws.amazon.com/sqs/ ; https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html

#### Amazon SNS
- What it is: pub/sub messaging and notification service.
- Use when: publishing one message to multiple subscribers/endpoints.
- Not: a durable worker queue by itself.
- Confusion: SNS fans out; SQS queues; they are often used together.
- Pricing: publish/delivery requests and notification type.
- Security/SRM: customer manages topic policies, subscriptions, encryption, and endpoint permissions.
- Gotcha: “fan out one event to many subscribers” points to SNS.
- Sources: https://aws.amazon.com/sns/ ; https://docs.aws.amazon.com/sns/latest/dg/welcome.html

#### Amazon EventBridge
- What it is: event bus service for routing events from AWS services, SaaS, and custom apps.
- Use when: building event-driven architectures and routing events by rules.
- Not: a FIFO work queue or workflow state machine.
- Confusion: EventBridge routes events; Step Functions orchestrates workflows; SQS queues work.
- Pricing: events published/matched, pipes/scheduler features.
- Security/SRM: customer controls event buses, rules, target permissions, schemas, and cross-account policies.
- Gotcha: “react to SaaS/AWS/app events with rules” points to EventBridge.
- Sources: https://aws.amazon.com/eventbridge/ ; https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html

#### AWS Step Functions
- What it is: serverless workflow orchestration service using state machines.
- Use when: coordinating multiple steps, retries, branching, human/long-running workflows.
- Not: a queue or single compute service.
- Confusion: Step Functions orchestrates Lambda/ECS/API calls; it does not replace each worker service.
- Pricing: state transitions or duration/request depending workflow type.
- Security/SRM: customer defines state machine logic, IAM roles, input/output data handling, logging.
- Gotcha: “multi-step workflow with retries/branches” points to Step Functions.
- Sources: https://aws.amazon.com/step-functions/ ; https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html

#### Amazon CloudWatch
- What it is: monitoring/observability service for metrics, logs, alarms, dashboards, and events.
- Use when: collecting operational metrics/logs and triggering alarms.
- Not: an audit log of API calls; that is CloudTrail.
- Confusion: CloudWatch monitors resource/app telemetry; CloudTrail records account activity/API calls.
- Pricing: metrics, logs ingestion/storage, alarms, dashboards, synthetics, etc.
- Security/SRM: customer configures log retention, alarms, dashboards, agents, and access.
- Gotcha: CPU alarm or application log metric points to CloudWatch.
- Sources: https://aws.amazon.com/cloudwatch/ ; https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html

#### AWS CloudTrail
- What it is: service that records AWS account activity and API calls.
- Use when: auditing who did what, when, from where, in AWS accounts.
- Not: a performance metrics dashboard.
- Confusion: CloudTrail is API audit; CloudWatch is monitoring metrics/logs/alarms.
- Pricing: management events basics plus trails/data events/Lake features can incur charges.
- Security/SRM: customer enables organization trails/data events, protects log buckets, reviews events.
- Gotcha: “track user/API activity for audit” points to CloudTrail.
- Sources: https://aws.amazon.com/cloudtrail/ ; https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html

#### AWS Config
- What it is: resource configuration recording and compliance evaluation service.
- Use when: tracking resource configuration history and evaluating against rules.
- Not: a deployment template engine.
- Confusion: Config records/evaluates state; CloudFormation defines/provisions state.
- Pricing: configuration items, rule evaluations, conformance packs.
- Security/SRM: customer chooses rules, remediation, retention, aggregator setup.
- Gotcha: “what changed in resource configuration?” points to Config.
- Sources: https://aws.amazon.com/config/ ; https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html

#### AWS Systems Manager
- What it is: operational management service for instances/resources, including Session Manager, Patch Manager, Parameter Store, Automation, Inventory.
- Use when: managing fleet operations, patching, command execution, parameters, and operational automation.
- Not: a CI/CD pipeline service.
- Confusion: Systems Manager operates resources; CloudFormation provisions resources.
- Pricing: many features have no extra charge, advanced tiers/operations can cost.
- Security/SRM: customer manages IAM roles, documents, patch baselines, parameters/secrets separation, access.
- Gotcha: “connect to EC2 without opening SSH” points to Session Manager.
- Sources: https://aws.amazon.com/systems-manager/ ; https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html

#### AWS CloudFormation
- What it is: infrastructure-as-code service for modeling/provisioning AWS resources with templates.
- Use when: repeatably creating/updating stacks of resources.
- Not: an app code deployment platform by itself.
- Confusion: CloudFormation provisions infrastructure; Beanstalk deploys app environments; CDK can synthesize CloudFormation.
- Pricing: no extra charge for CloudFormation; provisioned resources cost.
- Security/SRM: customer controls templates, IAM capabilities, change sets, stack policies, secrets handling.
- Gotcha: “create same infrastructure repeatedly from template” points to CloudFormation.
- Sources: https://aws.amazon.com/cloudformation/ ; https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html

#### AWS Trusted Advisor
- What it is: best-practice recommendation service across cost, performance, security, fault tolerance, service limits, operational excellence.
- Use when: finding account-level optimization/security/reliability recommendations.
- Not: architecture review framework itself or a compliance report portal.
- Confusion: Trusted Advisor checks active account resources; Well-Architected is broader workload-review framework.
- Pricing: some checks are available broadly; full checks depend on support plan.
- Security/SRM: customer reviews and acts on recommendations.
- Gotcha: “identify underutilized resources/security group risk/service quotas” points to Trusted Advisor.
- Sources: https://aws.amazon.com/premiumsupport/technology/trusted-advisor/ ; https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html

### Analytics and AI/ML recognition services

#### Amazon Athena, AWS Glue, Amazon EMR
- What it is: Athena queries data in S3 with SQL; Glue catalogs/ETL; EMR runs managed big data frameworks like Spark/Hadoop.
- Use when: analytics over data lakes, ETL/cataloging, or big data processing.
- Not: operational relational databases for app transactions.
- Confusion: Athena is serverless query; Glue catalogs/transforms; EMR is cluster/serverless big-data processing.
- Pricing: Athena query data scanned, Glue jobs/catalog, EMR compute/storage.
- Security/SRM: customer controls data lake permissions, encryption, IAM, catalog access, and query outputs.
- Gotcha: “ad hoc SQL directly on S3 data” points to Athena.
- Sources: https://aws.amazon.com/athena/ ; https://aws.amazon.com/glue/ ; https://aws.amazon.com/emr/

#### Amazon Kinesis and Amazon MSK
- What it is: Kinesis provides managed real-time data streaming services; MSK provides managed Apache Kafka.
- Use when: ingesting/processing streaming data or Kafka workloads.
- Not: a batch ETL scheduler.
- Confusion: Kinesis Data Streams vs Firehose vs Kafka/MSK are different streaming patterns.
- Pricing: shards/on-demand throughput, delivery/processing, MSK brokers/storage.
- Security/SRM: customer manages stream access, partitioning, retention, encryption, consumer behavior.
- Gotcha: “real-time clickstream/event stream” points to Kinesis or MSK, not SQS alone.
- Sources: https://aws.amazon.com/kinesis/ ; https://aws.amazon.com/msk/

#### Amazon Redshift and Amazon QuickSight
- What it is: Redshift is cloud data warehouse; QuickSight is BI/dashboard service.
- Use when: analytical warehouse queries and business dashboards/visualizations.
- Not: OLTP app database or log alarm service.
- Confusion: Redshift stores/analyzes warehouse data; QuickSight visualizes BI data.
- Pricing: Redshift compute/storage/serverless usage; QuickSight users/sessions/capacity.
- Security/SRM: customer manages data access, encryption, network, dataset permissions, sharing.
- Gotcha: “petabyte-scale data warehouse” is Redshift; “business dashboards” is QuickSight.
- Sources: https://aws.amazon.com/redshift/ ; https://aws.amazon.com/quicksight/

#### Amazon SageMaker
- What it is: managed service for building, training, and deploying ML models.
- Use when: ML lifecycle needs notebooks, training, hosting, feature/model tooling.
- Not: a prebuilt speech/image/text API by itself.
- Confusion: SageMaker is ML platform; Rekognition/Comprehend/etc. are pre-trained AI services.
- Pricing: notebooks, training, hosting, processing, storage.
- Security/SRM: customer controls data, model code, IAM, notebooks, endpoints, encryption, monitoring.
- Gotcha: “build/train/deploy custom ML model” points to SageMaker.
- Sources: https://aws.amazon.com/sagemaker/ ; https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html

#### Amazon Comprehend, Kendra, Lex, Polly, Rekognition, Textract, Transcribe, Translate
- What it is: managed AI services: NLP insight, enterprise search, chatbots, text-to-speech, image/video analysis, document text extraction, speech-to-text, translation.
- Use when: adding prebuilt AI capabilities without building custom models.
- Not: a custom ML training platform; use SageMaker for custom ML lifecycle.
- Confusion: match modality/use case: Polly speaks text; Transcribe converts speech to text; Translate changes language; Textract extracts from documents; Rekognition analyzes images/video.
- Pricing: generally usage-based by text units, audio/video duration, pages, requests, or resources.
- Security/SRM: customer manages input data, privacy, IAM, encryption, and downstream use of AI outputs.
- Gotcha: “extract text/forms from scanned documents” is Textract, not Transcribe.
- Sources: https://aws.amazon.com/comprehend/ ; https://aws.amazon.com/kendra/ ; https://aws.amazon.com/lex/ ; https://aws.amazon.com/polly/ ; https://aws.amazon.com/rekognition/ ; https://aws.amazon.com/textract/ ; https://aws.amazon.com/transcribe/ ; https://aws.amazon.com/translate/

### Developer/business/frontend/IoT/support categories from the exam guide service list

#### AWS CodeBuild, CodeDeploy, CodePipeline, CodeArtifact, AWS X-Ray, AWS AppConfig, CloudShell/Cloud9/CLI
- What it is: developer tools for building/testing, deploying, release pipelines, artifact packages, tracing, config rollout, browser shell/IDE, and command-line operations.
- Use when: recognizing DevOps/developer workflow services at a high level.
- Not: the main focus of CLF-C02 implementation detail.
- Confusion: CodePipeline orchestrates pipeline stages; CodeBuild builds/tests; CodeDeploy deploys; X-Ray traces applications.
- Pricing: build minutes, pipeline/deployment usage, artifact storage/requests, traces; CLI itself is free but resources cost.
- Security/SRM: customer manages IAM roles, source access, secrets, artifacts, deployment permissions.
- Gotcha: “trace request path through a distributed app” points to X-Ray.
- Sources: https://aws.amazon.com/codebuild/ ; https://aws.amazon.com/codedeploy/ ; https://aws.amazon.com/codepipeline/ ; https://aws.amazon.com/xray/ ; https://aws.amazon.com/cloudshell/

#### AWS Amplify, AWS AppSync, AWS Device Farm
- What it is: frontend/mobile category services: full-stack web/mobile hosting/backend tooling, managed GraphQL APIs, and app testing on devices.
- Use when: recognizing web/mobile app build/test support.
- Not: core EC2/container infrastructure.
- Confusion: AppSync is GraphQL API; API Gateway is general API front door; Amplify is app development/hosting workflow.
- Pricing: hosting/build/API/device test usage varies by service.
- Security/SRM: customer secures app auth, APIs, data, build secrets, and test artifacts.
- Gotcha: “managed GraphQL API” points to AppSync.
- Sources: https://aws.amazon.com/amplify/ ; https://aws.amazon.com/appsync/ ; https://aws.amazon.com/device-farm/

#### Amazon Connect, Amazon SES
- What it is: Connect is cloud contact center; SES is email sending/receiving service.
- Use when: business communication/customer engagement scenarios appear.
- Not: general compute or database services.
- Confusion: SES sends email; SNS sends notifications; Connect handles contact center workflows.
- Pricing: per-minute/contact center usage for Connect, per-message/data for SES.
- Security/SRM: customer manages customer data, IAM, domains/email reputation, compliance, recordings.
- Gotcha: “cloud contact center” is Connect; “send transactional email” is SES.
- Sources: https://aws.amazon.com/connect/ ; https://aws.amazon.com/ses/

#### AWS IoT Core and AWS IoT Greengrass
- What it is: IoT Core connects/manages IoT devices/messages; Greengrass extends AWS capabilities to edge devices.
- Use when: device connectivity/edge IoT processing scenarios appear.
- Not: general EC2 edge infrastructure.
- Confusion: IoT Core is cloud device messaging/management; Greengrass runs local edge components.
- Pricing: connections/messages/rules/device features vary.
- Security/SRM: customer manages device identities/certificates, policies, firmware/application security, data.
- Gotcha: “securely connect IoT devices to AWS” points to IoT Core.
- Sources: https://aws.amazon.com/iot-core/ ; https://aws.amazon.com/greengrass/

#### AWS Support, re:Post, Knowledge Center, Professional Services, Partner Network
- What it is: support/help ecosystem: support plans, community Q&A, official troubleshooting articles, consulting services, and AWS partners.
- Use when: matching help resource to learner/customer need.
- Not: a monitoring or deployment service.
- Confusion: Basic support gives account/billing and docs/forums; technical support response times vary by paid plan.
- Pricing: support plans have different pricing/benefits; self-service docs/re:Post are free.
- Security/SRM: customer should avoid sharing secrets in support/community posts and manage support IAM access.
- Gotcha: “third-party certified partner to help implement” points to APN; “technical case with response SLA” points to paid Support plan.
- Sources: https://aws.amazon.com/premiumsupport/plans/ ; https://repost.aws/ ; https://aws.amazon.com/premiumsupport/knowledge-center/ ; https://aws.amazon.com/partners/

### Billing, pricing, and cost management resources

#### AWS Pricing Calculator
- What it is: estimation tool for projected AWS costs before deployment.
- Use when: planning/estimating architecture cost.
- Not: actual historical bill analysis.
- Confusion: Calculator estimates future; Cost Explorer analyzes past/current costs.
- Pricing: tool is free; estimates are not guarantees.
- Security/SRM: customer inputs assumptions and validates architecture/service usage.
- Gotcha: “estimate monthly cost before migration” points to Pricing Calculator.
- Sources: https://calculator.aws/ ; https://aws.amazon.com/aws-cost-management/aws-pricing-calculator/

#### AWS Cost Explorer
- What it is: tool to visualize/analyze historical and forecasted AWS costs and usage.
- Use when: identifying spend trends, service costs, or usage patterns.
- Not: budget alerting or raw line-item export.
- Confusion: Budgets alerts; CUR provides detailed raw report; Cost Explorer visualizes/analyzes.
- Pricing: some API usage may incur cost; console functionality commonly used for analysis.
- Security/SRM: customer controls billing permissions and cost allocation tags.
- Gotcha: “show monthly spend trend by service” points to Cost Explorer.
- Sources: https://aws.amazon.com/aws-cost-management/aws-cost-explorer/ ; https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html

#### AWS Budgets
- What it is: budget and alert service for cost, usage, RI/Savings Plans utilization/coverage.
- Use when: sending alerts as spend/usage approaches thresholds.
- Not: a cost estimate tool or detailed raw billing report.
- Confusion: Budgets alerts; Cost Explorer analyzes; Pricing Calculator estimates.
- Pricing: free budget quota then paid budgets/action usage may apply.
- Security/SRM: customer sets thresholds, recipients, IAM permissions, optional actions.
- Gotcha: “notify me before costs exceed $X” points to Budgets.
- Sources: https://aws.amazon.com/aws-cost-management/aws-budgets/ ; https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html

#### AWS Cost and Usage Report (CUR)
- What it is: most detailed report of AWS cost and usage data delivered to S3 for analysis.
- Use when: needing granular line-item billing data for allocation/BI/custom analysis.
- Not: a dashboard-only tool for beginners.
- Confusion: CUR is raw/detailed report; Cost Explorer is interactive analysis UI/API.
- Pricing: report delivery to S3 and analytics queries/storage can cost.
- Security/SRM: customer secures report bucket, access, Athena/QuickSight integration, account data.
- Gotcha: “most detailed billing data” points to CUR.
- Sources: https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html ; https://aws.amazon.com/aws-cost-management/aws-cost-and-usage-reporting/

#### AWS Billing console / Billing and Cost Management dashboard
- What it is: console area for bills, payments, cost management, preferences, credits, and account billing settings.
- Use when: viewing current bills, invoices, payment methods, tax/credits, and billing preferences.
- Not: a service-level monitoring dashboard.
- Confusion: billing console shows charges; CloudWatch monitors resources.
- Pricing: no extra charge for console; permissions are sensitive.
- Security/SRM: customer manages billing access, MFA/root account protection, alternate contacts, payment settings.
- Gotcha: “download invoice/pay bill” points to Billing console.
- Sources: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-what-is.html ; https://aws.amazon.com/aws-cost-management/

#### AWS Marketplace
- What it is: catalog for third-party software, data, and professional services that can be purchased for AWS use.
- Use when: buying/subscribing to third-party AMIs/SaaS/data/tools through AWS.
- Not: the AWS Free Tier or AWS Support.
- Confusion: Marketplace charges can appear on AWS bill but are third-party products.
- Pricing: subscriptions, usage, contract terms vary by seller/product.
- Security/SRM: customer evaluates vendor, licensing, data sharing, IAM/deployment risks.
- Gotcha: “third-party software billed through AWS” points to Marketplace.
- Sources: https://aws.amazon.com/marketplace/ ; https://docs.aws.amazon.com/marketplace/latest/buyerguide/what-is-marketplace.html

#### Savings Plans, Reserved Instances, Spot Instances, Dedicated Hosts/Instances, Free Tier
- What it is: AWS purchasing/pricing constructs: commitments, reservations, spare capacity, dedicated physical servers/instances, and limited free usage.
- Use when: optimizing cost for steady, interruptible, compliance/license, or beginner-trial workloads.
- Not: separate compute services.
- Confusion: Savings Plans are flexible spend commitments; RIs reserve instance attributes/capacity benefits; Spot can be interrupted.
- Pricing: discounts require tradeoffs: commitment term/payment option, interruption tolerance, tenancy/dedication, usage limits.
- Security/SRM: customer must understand compliance/license needs for dedicated options and monitor usage to avoid surprises.
- Gotcha: “fault-tolerant interruptible jobs” points to Spot; “steady predictable usage” points to RIs/Savings Plans.
- Sources: https://aws.amazon.com/savingsplans/ ; https://aws.amazon.com/ec2/pricing/reserved-instances/ ; https://aws.amazon.com/ec2/spot/ ; https://aws.amazon.com/ec2/dedicated-hosts/ ; https://aws.amazon.com/free/

## 4. Current repo content gaps versus the deeper map

Observed files:
- `data/sources/clf-c02/source_metadata.json`
- `data/sources/clf-c02/seed_outline.json`
- `data/sources/clf-c02/learning_cards.json`
- `src/lib/learningModel.js`
- `reports/source-verification-report.md`

Gaps to address before converting this research into app data:

1. Service depth is too shallow.
   - Current cards are mostly one prompt per task statement and short expected-answer bullet lists.
   - They do not include `what it is`, `when to use`, `what it is NOT`, beginner confusion, pricing angle, security/shared-responsibility angle, or gotchas per service.

2. Source links are mostly exam-guide-only.
   - Most CLF-C02 cards link only to the exam guide PDF.
   - Need add service-specific official AWS docs/product URLs per service/resource family.

3. Practice questions are mechanically generated and not instructionally useful.
   - `src/lib/learningModel.js` builds every generated question with the correct option as option `a`.
   - Distractors are generic anti-brain-dump statements, not plausible conceptual distractors.
   - This is safe ethically, but poor for learning and easy to game.

4. Coverage misses or compresses many services from the exam guide service list.
   - Examples needing explicit cards: Data Exchange, EMR, MSK, OpenSearch Service, Billing Conductor, Compute Optimizer, Control Tower, Health Dashboard, License Manager, Resource Groups/Tag Editor, Service Catalog, AppConfig, Code* tools, AppStream, WorkSpaces, Amplify/AppSync/Device Farm, IoT Core/Greengrass, Audit Manager, ACM, Cognito, Detective, Directory Service, Firewall Manager, Inspector, KMS, Macie, Network Firewall, RAM, Secrets Manager, Backup, Elastic Disaster Recovery.
   - Some may be “recognition-level” rather than deep-service lessons, but should not be absent if the exam guide lists them.

5. No prioritization by exam value.
   - The app currently treats all generated cards similarly, but Domain 3 and Domain 2 dominate the exam weight.
   - Need high-value service families first: IAM/shared responsibility, compute/storage/network/database, monitoring/audit, cost tools.

6. No explicit shared-responsibility comparison by abstraction level.
   - Current one cross-domain card mentions EC2/Lambda/RDS, but lessons should show responsibility shifts across EC2, containers, Lambda, RDS/Aurora, S3, and managed AI services.

7. No cost-risk warnings tied to console guides.
   - Console guides warn generally about cost, but service cards should flag common beginner charges: NAT Gateway hourly/data, EBS unattached volumes/snapshots, public IPv4, load balancers, RDS running instances, CloudWatch logs retention, data transfer out, KMS requests/keys, WAF rules/requests.

8. No structured schema ready for importing this service matrix.
   - Recommend adding a `resource_cards` or enriched `learning_cards` schema with fields matching this handoff.

## 5. Prioritized content backlog

### Must-have (release-blocking for useful CLF-C02 depth)

1. Build enriched resource cards for the core service families:
   - IAM, IAM Identity Center, Organizations/SCPs, shared responsibility model, KMS, Artifact, GuardDuty, Security Hub, Inspector, WAF/Shield, security groups/NACLs.
   - EC2, Lambda, Auto Scaling/ELB, ECS/EKS/Fargate, Beanstalk, Lightsail, Batch.
   - S3/storage classes, EBS, EFS, FSx, Storage Gateway, Snow Family.
   - VPC/subnets/routes/gateways/endpoints, Route 53, CloudFront, Direct Connect/VPN, API Gateway.
   - RDS/Aurora, DynamoDB, ElastiCache/MemoryDB, Neptune.
   - CloudWatch, CloudTrail, Config, Systems Manager, CloudFormation, Trusted Advisor.
   - Pricing Calculator, Cost Explorer, Budgets, CUR, Billing console, Organizations consolidated billing, Support plans.

2. Add official source URLs per card.
   - Include both product page and docs page where possible.
   - Store `last_verified_date` per source.

3. Replace generated generic quizzes with original conceptual questions.
   - Randomize correct option.
   - Make distractors correspond to common beginner confusions in this handoff.
   - Keep all wording original and avoid exam-dump phrasing.

4. Add service-family comparison cards.
   - Storage: S3 vs EBS vs EFS vs FSx.
   - Compute: EC2 vs Lambda vs ECS/EKS/Fargate vs Beanstalk/Lightsail.
   - Database: RDS/Aurora vs DynamoDB vs ElastiCache/MemoryDB vs Neptune.
   - Networking/security: security group vs NACL vs WAF vs Shield.
   - Operations: CloudWatch vs CloudTrail vs Config vs Trusted Advisor.
   - Costs: Calculator vs Cost Explorer vs Budgets vs CUR.

5. Add explicit pricing and shared-responsibility fields to app data.
   - These are high-frequency CLF-C02 learning objectives and should be first-class fields, not hidden in prose.

### Should-have (important for completeness and polish)

1. Add recognition-level cards for lower-frequency in-scope services:
   - Data Exchange, EMR, MSK, OpenSearch, Connect, SES, AppConfig, CodeBuild/CodeDeploy/CodePipeline/CodeArtifact, X-Ray, WorkSpaces/AppStream, Amplify/AppSync/Device Farm, IoT Core/Greengrass, Audit Manager, ACM, Cognito, Detective, Directory Service, Network Firewall, RAM, Service Catalog, Control Tower, Compute Optimizer, Health Dashboard, License Manager, Resource Groups/Tag Editor, Transfer Family.

2. Add “exam-style gotcha” metadata.
   - Use original scenario patterns such as “estimate vs analyze vs alert,” “audit API calls vs monitor CPU,” and “object vs block vs file.”

3. Add content freshness workflow.
   - Re-check exam guide PDF version and certification page before release.
   - Re-check Skill Builder course metadata with authenticated access if available.

4. Add cost-safety callouts for console labs.
   - Examples: delete load balancers/RDS/EC2, watch NAT Gateway and public IPv4 charges, set Budgets, avoid paid WAF/GuardDuty/Inspector scans unless intentionally enabled.

5. Add source-verification report expansion.
   - Extend `reports/source-verification-report.md` with this service map file and any source status checks.

### Nice-to-have (after core curriculum is useful)

1. Add micro-scenarios by persona.
   - Non-technical stakeholder, junior cloud admin, finance user, security analyst, developer.

2. Add Skill Builder alignment notes.
   - Map official AWS Cloud Practitioner Essentials modules to app sections if authenticated module data is available.

3. Add diagrams.
   - Global infrastructure, VPC basics, shared responsibility by abstraction, storage/database comparison.

4. Add optional supplemental video references.
   - Keep official AWS first; mark YouTube/freeCodeCamp/creator content as optional and stale-check separately.

5. Add localization/accessibility improvements.
   - Plain-language definitions, glossary, audio-friendly summaries, flashcard short answers.

## 6. Suggested import schema for coder

```json
{
  "id": "clf-c02-iam",
  "track_id": "clf-c02",
  "domain_ids": ["2", "3"],
  "task_statement_ids": ["2.3", "2.1"],
  "service_family": "Security, Identity, and Compliance",
  "name": "AWS Identity and Access Management (IAM)",
  "importance": "must-have",
  "depth": "core",
  "what_it_is": "...",
  "use_when": ["..."],
  "what_it_is_not": ["..."],
  "common_confusions": ["..."],
  "pricing_angle": "...",
  "security_shared_responsibility_angle": "...",
  "exam_style_gotchas": ["..."],
  "comparison_neighbors": ["IAM Identity Center", "Amazon Cognito", "AWS Organizations"],
  "official_sources": [
    {"title": "IAM User Guide", "url": "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html", "verified_date": "2026-06-03"}
  ],
  "ethics_status": "original_explanation_no_exam_dump"
}
```

## 7. Source refresh notes

- I verified reachability for the core official baseline URLs via HTTP on 2026-06-03 from this workspace.
- Several individual service source URLs in the matrix are official AWS product/docs URLs and should be programmatically HTTP-checked before automated import.
- AWS exam guides state service lists are non-exhaustive and subject to change; schedule periodic refresh.
- Skill Builder internals can sit behind login; use public certification/exam-guide facts as the stable baseline.
