# CLF-C02 AWS Resource Explanation Corpus

Created: 2026-06-03

Purpose: beginner-friendly mental models for Vion Learning's AWS Certified Cloud Practitioner track. This is educational explanation content, not an exam dump or memorization-only trivia bank.

Priority labels: P0 = core CLF-C02 mental model, P1 = important supporting service/concept, P2 = recognition-level practitioner context.

Total entries: 91

## AI/ML basics

### Amazon Bedrock (P1)
- Id: `clf-c02-resource-amazon-bedrock`
- Analogy: Bedrock is a managed doorway to foundation models.
- Plain-English explanation: Bedrock is a fully managed service for building generative AI applications with foundation models from AWS and third-party providers.
- Real-world use case: Build a chatbot or content generation workflow without managing model servers.
- Exam clue phrases: generative AI; foundation models; managed service
- Common misconceptions: Bedrock is not the broad platform for training every custom ML model; SageMaker is broader for ML lifecycle.
- Adjacent service comparison: Bedrock = foundation models/genAI apps; SageMaker = ML build/train/deploy; AI services = prebuilt APIs.
- Official docs: https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html

### Amazon SageMaker (P1)
- Id: `clf-c02-resource-amazon-sagemaker`
- Analogy: SageMaker is a workshop for building, training, and deploying ML models.
- Plain-English explanation: SageMaker is a managed ML platform for data prep, training, tuning, deployment, and MLOps. CLF learners mainly need high-level recognition.
- Real-world use case: Train and deploy a custom fraud detection model.
- Exam clue phrases: machine learning platform; build train deploy; notebooks; endpoints
- Common misconceptions: CLF-C02 does not require hands-on model engineering depth.
- Adjacent service comparison: SageMaker builds custom ML; Bedrock uses foundation models; Rekognition/Textract/Comprehend are prebuilt APIs.
- Official docs: https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html

### Amazon Comprehend (P2)
- Id: `clf-c02-resource-amazon-comprehend`
- Analogy: Comprehend is a text-understanding API.
- Plain-English explanation: Comprehend uses NLP to find sentiment, key phrases, entities, topics, and language in text.
- Real-world use case: Analyze customer reviews for sentiment and common issues.
- Exam clue phrases: NLP; sentiment; entities; key phrases
- Common misconceptions: It is not a general database search engine.
- Adjacent service comparison: Comprehend = text NLP; Textract = document text/forms; Transcribe = speech to text.
- Official docs: https://docs.aws.amazon.com/comprehend/latest/dg/what-is.html

### Amazon Rekognition (P2)
- Id: `clf-c02-resource-amazon-rekognition`
- Analogy: Rekognition is a computer-vision API for images and video.
- Plain-English explanation: Rekognition analyzes images/video for labels, objects, faces, text, moderation categories, and visual information.
- Real-world use case: Detect unsafe image uploads or tag media libraries.
- Exam clue phrases: image analysis; video; computer vision; content moderation
- Common misconceptions: It does not store your whole media catalog by itself.
- Adjacent service comparison: Rekognition = image/video; Textract = document extraction; Comprehend = text meaning.
- Official docs: https://docs.aws.amazon.com/rekognition/latest/dg/what-is.html

### Amazon Transcribe (P2)
- Id: `clf-c02-resource-amazon-transcribe`
- Analogy: Transcribe turns speech into written text.
- Plain-English explanation: Transcribe is automatic speech recognition for converting audio into text for calls, subtitles, and search.
- Real-world use case: Create searchable transcripts of support calls.
- Exam clue phrases: speech to text; audio transcription; subtitles
- Common misconceptions: It is not text-to-speech; Polly does that.
- Adjacent service comparison: Transcribe = speech to text; Polly = text to speech; Comprehend = understand text.
- Official docs: https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html

### Amazon Textract (P2)
- Id: `clf-c02-resource-amazon-textract`
- Analogy: Textract reads documents and forms, not just plain OCR text.
- Plain-English explanation: Textract extracts text, handwriting, forms, and tables from scanned documents and images for document automation.
- Real-world use case: Extract fields from invoices or scanned applications.
- Exam clue phrases: OCR; forms; tables; document extraction
- Common misconceptions: It is not general image recognition; it focuses on document structure.
- Adjacent service comparison: Textract = document extraction; Rekognition = image/video; Comprehend = NLP.
- Official docs: https://docs.aws.amazon.com/textract/latest/dg/what-is.html

## Billing/cost

### AWS pricing models (P0)
- Id: `clf-c02-resource-aws-pricing-models`
- Analogy: Pricing is choosing pay-as-you-go rides, committed passes, or spare-seat discounts.
- Plain-English explanation: AWS pricing includes On-Demand flexibility, Reserved Instances/Savings Plans commitments, Spot spare capacity, Free Tier, and volume/usage-based pricing patterns.
- Real-world use case: Use On-Demand for experiments, Savings Plans for steady compute, Spot for batch jobs.
- Exam clue phrases: On-Demand; Reserved Instances; Savings Plans; Spot
- Common misconceptions: The biggest discount is not always best; commitments require predictable usage and Spot can interrupt.
- Adjacent service comparison: Pricing model decides how you pay; Cost Explorer analyzes spend; Budgets alerts.
- Official docs: https://aws.amazon.com/pricing/

### AWS Savings Plans (P0)
- Id: `clf-c02-resource-aws-savings-plans`
- Analogy: Savings Plans are a commitment coupon for steady dollars-per-hour usage.
- Plain-English explanation: Savings Plans provide lower prices in exchange for a one- or three-year usage commitment, especially for compute usage.
- Real-world use case: Commit to baseline production compute spend.
- Exam clue phrases: commitment discount; one or three years; steady usage
- Common misconceptions: Savings Plans do not reserve capacity by themselves.
- Adjacent service comparison: Savings Plans = flexible compute discount; RIs = reservation/discount model; On-Demand = no commitment.
- Official docs: https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html

### Reserved Instances (P0)
- Id: `clf-c02-resource-reserved-instances`
- Analogy: Reserved Instances are booking a server class in advance for a discount.
- Plain-English explanation: Reserved Instances discount eligible instance usage in exchange for term commitment, and some options can provide capacity reservation benefits.
- Real-world use case: Reduce cost for a database server that runs continuously.
- Exam clue phrases: reservation; one or three years; steady workload
- Common misconceptions: RIs are less flexible than many Savings Plans and poor for unpredictable workloads.
- Adjacent service comparison: RIs = specific reservations/discounts; Savings Plans = flexible spend commitments; Spot = interruptible spare capacity.
- Official docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html

### AWS Cost Explorer (P0)
- Id: `clf-c02-resource-aws-cost-explorer`
- Analogy: Cost Explorer is a spending graph and filter tool.
- Plain-English explanation: Cost Explorer visualizes, filters, and analyzes AWS costs and usage over time to find trends and cost drivers.
- Real-world use case: Find which service or account caused a bill increase.
- Exam clue phrases: analyze costs; visualize spend; filter; trends
- Common misconceptions: It is not primarily an alerting tool; Budgets alerts.
- Adjacent service comparison: Cost Explorer analyzes; Budgets alerts; CUR provides raw detailed data.
- Official docs: https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html

### AWS Budgets (P0)
- Id: `clf-c02-resource-aws-budgets`
- Analogy: Budgets is a spending smoke alarm.
- Plain-English explanation: AWS Budgets sets custom cost, usage, reservation, and Savings Plans thresholds and sends alerts on actual or forecasted values.
- Real-world use case: Alert when dev account spend is forecast to exceed $500.
- Exam clue phrases: budget alert; forecast; threshold; notification
- Common misconceptions: Budgets alerts; it does not automatically prevent every spend unless paired with controls/actions.
- Adjacent service comparison: Budgets alerts; Cost Explorer investigates; Organizations/SCPs enforce guardrails.
- Official docs: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html

### AWS Cost and Usage Report (CUR) (P1)
- Id: `clf-c02-resource-aws-cost-and-usage-report-cur`
- Analogy: CUR is the detailed itemized AWS receipt.
- Plain-English explanation: CUR provides detailed billing and usage line items, commonly delivered to S3 for analysis with Athena, Redshift, or QuickSight.
- Real-world use case: Build chargeback/showback by account, tag, service, and usage type.
- Exam clue phrases: detailed billing; line items; S3 delivery; chargeback
- Common misconceptions: CUR is raw and more detailed than Cost Explorer; it requires analysis tooling.
- Adjacent service comparison: CUR = raw detailed data; Cost Explorer = interactive UI; Budgets = alerts.
- Official docs: https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html

### Consolidated billing (P0)
- Id: `clf-c02-resource-consolidated-billing`
- Analogy: Consolidated billing is one family bill for many AWS accounts.
- Plain-English explanation: With AWS Organizations, consolidated billing combines charges from member accounts under one management/payer account and may share eligible volume discounts.
- Real-world use case: Pay for dev, prod, and security accounts through one organization.
- Exam clue phrases: single bill; multiple accounts; Organizations; volume discounts
- Common misconceptions: It does not merge security boundaries; accounts remain separate.
- Adjacent service comparison: Consolidated billing aggregates payment; SCPs set guardrails; Cost Explorer analyzes linked-account spend.
- Official docs: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/consolidated-billing.html

### AWS Support plans (P0)
- Id: `clf-c02-resource-aws-support-plans`
- Analogy: Support plans are service-desk tiers with different response times and guidance.
- Plain-English explanation: AWS Support plans range from Basic to Developer, Business, Enterprise On-Ramp, and Enterprise, with increasing support response levels and entitlements.
- Real-world use case: Choose Business Support for production workloads needing 24/7 technical support access.
- Exam clue phrases: Basic; Developer; Business; Enterprise; response times
- Common misconceptions: Basic includes account/billing support and docs, not the same technical support response levels.
- Adjacent service comparison: Support plan = support entitlement; Trusted Advisor = recommendations; Health = service events.
- Official docs: https://aws.amazon.com/premiumsupport/plans/

### AWS Marketplace (P1)
- Id: `clf-c02-resource-aws-marketplace`
- Analogy: Marketplace is an app store for third-party software billed through AWS.
- Plain-English explanation: AWS Marketplace is a catalog for finding, buying, deploying, and managing third-party software, data, and services, often integrated with AWS billing.
- Real-world use case: Subscribe to a security appliance AMI or SaaS monitoring tool.
- Exam clue phrases: third-party software; digital catalog; AMI; SaaS
- Common misconceptions: Marketplace products are not all AWS-built services; review vendor/pricing/licensing.
- Adjacent service comparison: Marketplace = third-party offerings; Service Catalog = approved internal catalogs; AWS services = native services.
- Official docs: https://docs.aws.amazon.com/marketplace/latest/buyerguide/what-is-marketplace.html

## Compute

### Amazon EC2 (P0)
- Id: `clf-c02-resource-amazon-ec2`
- Analogy: EC2 is renting virtual computers on demand.
- Plain-English explanation: EC2 provides resizable virtual servers called instances. You choose instance type, OS image, networking, storage, and scaling pattern, with more control and responsibility than serverless services.
- Real-world use case: Run a custom web server or legacy application needing OS-level control.
- Exam clue phrases: virtual server; instance; compute capacity; control over OS
- Common misconceptions: EC2 is not automatically serverless; you manage OS/app/security choices.
- Adjacent service comparison: EC2 gives control; Lambda runs functions; ECS/EKS run containers; Beanstalk deploys apps.
- Official docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html

### Amazon Machine Images (AMIs) (P0)
- Id: `clf-c02-resource-amazon-machine-images-amis`
- Analogy: An AMI is a stamped recipe for launching servers.
- Plain-English explanation: An AMI contains the operating system and software configuration needed to launch EC2 instances consistently.
- Real-world use case: Create a hardened Linux image with monitoring agents preinstalled.
- Exam clue phrases: EC2 template; machine image; launch instance
- Common misconceptions: An AMI is not the running server; it is used to create one and is regional.
- Adjacent service comparison: AMI is server template; EBS snapshot is block-storage backup; instance type is hardware shape.
- Official docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html

### EC2 instance families (P0)
- Id: `clf-c02-resource-ec2-instance-families`
- Analogy: Instance families are vehicle classes for different jobs.
- Plain-English explanation: EC2 instance families are optimized for general purpose, compute, memory, storage, accelerated/GPU, and other workloads. Choosing the right family improves performance and cost.
- Real-world use case: Use compute optimized for CPU-heavy jobs and memory optimized for in-memory databases.
- Exam clue phrases: instance type; compute optimized; memory optimized; rightsizing
- Common misconceptions: Bigger is not always better; match workload bottleneck.
- Adjacent service comparison: Instance family chooses shape; Auto Scaling changes quantity; Savings Plans/RIs affect price.
- Official docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html

### Auto Scaling (P0)
- Id: `clf-c02-resource-auto-scaling`
- Analogy: Auto Scaling is a thermostat for capacity.
- Plain-English explanation: Auto Scaling adjusts capacity to maintain availability and match demand. EC2 Auto Scaling groups launch/terminate instances using desired, min, max, and scaling policies.
- Real-world use case: Add servers during traffic spikes and remove them overnight.
- Exam clue phrases: elasticity; scale out; scale in; desired capacity
- Common misconceptions: Auto Scaling is not a load balancer; it changes capacity.
- Adjacent service comparison: Auto Scaling changes number of resources; ELB distributes traffic; CloudWatch can trigger scaling.
- Official docs: https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html

### Elastic Load Balancing (ELB) (P0)
- Id: `clf-c02-resource-elastic-load-balancing-elb`
- Analogy: A load balancer is a receptionist sending visitors to healthy desks.
- Plain-English explanation: ELB distributes traffic across targets such as EC2 instances, containers, and IPs, improving availability and routing around unhealthy targets.
- Real-world use case: Put a load balancer in front of web servers in multiple AZs.
- Exam clue phrases: distribute traffic; healthy targets; high availability
- Common misconceptions: A load balancer does not create more servers; pair it with Auto Scaling.
- Adjacent service comparison: ALB routes HTTP; NLB handles high-performance TCP/UDP; CloudFront delivers at edge.
- Official docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/what-is-load-balancing.html

### Application Load Balancer (ALB) (P0)
- Id: `clf-c02-resource-application-load-balancer-alb`
- Analogy: ALB is a smart web receptionist that reads URL paths and host names.
- Plain-English explanation: ALB handles HTTP/HTTPS layer-7 routing, including host/path rules and target groups, often for web apps and microservices.
- Real-world use case: Route /api to API containers and /images to another target group.
- Exam clue phrases: HTTP; HTTPS; layer 7; path routing
- Common misconceptions: ALB is not the best answer for raw TCP/UDP performance; use NLB.
- Adjacent service comparison: ALB = application layer HTTP; NLB = network layer TCP/UDP.
- Official docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html

### Network Load Balancer (NLB) (P1)
- Id: `clf-c02-resource-network-load-balancer-nlb`
- Analogy: NLB directs traffic at road-intersection level without reading web pages.
- Plain-English explanation: NLB distributes TCP, UDP, and TLS traffic at high performance and low latency, with static IP and source-IP preservation patterns.
- Real-world use case: Expose a high-throughput TCP service.
- Exam clue phrases: TCP; UDP; layer 4; high performance
- Common misconceptions: NLB does not do rich HTTP path routing like ALB.
- Adjacent service comparison: NLB = transport layer; ALB = HTTP app layer; CloudFront = CDN edge.
- Official docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html

### AWS Lambda (P0)
- Id: `clf-c02-resource-aws-lambda`
- Analogy: Lambda hires a worker only when a task arrives.
- Plain-English explanation: Lambda runs code without provisioning servers. It is event-driven and billed by requests/execution time while AWS manages the underlying servers.
- Real-world use case: Process an uploaded S3 image or serve an API Gateway request.
- Exam clue phrases: serverless function; event-driven; pay per request
- Common misconceptions: Serverless still requires owning code, IAM, configuration, and cost controls.
- Adjacent service comparison: Lambda runs functions; ECS/EKS run containers; EC2 runs servers.
- Official docs: https://docs.aws.amazon.com/lambda/latest/dg/welcome.html

### Amazon ECS and AWS Fargate (P0)
- Id: `clf-c02-resource-amazon-ecs-and-aws-fargate`
- Analogy: ECS schedules containers; Fargate lets AWS manage the container servers.
- Plain-English explanation: ECS runs containerized applications as tasks/services. Fargate is serverless compute for containers so you avoid managing EC2 worker nodes.
- Real-world use case: Run a containerized API without Kubernetes or server administration.
- Exam clue phrases: containers; ECS; Fargate; serverless containers
- Common misconceptions: Fargate is a compute option, not a separate orchestrator.
- Adjacent service comparison: ECS is AWS-native containers; EKS is Kubernetes; Fargate removes server management.
- Official docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html

### Amazon EKS (P1)
- Id: `clf-c02-resource-amazon-eks`
- Analogy: EKS is AWS managing the Kubernetes control plane.
- Plain-English explanation: EKS runs Kubernetes on AWS for teams needing Kubernetes APIs and ecosystem while AWS manages control plane availability.
- Real-world use case: Run portable Kubernetes microservices on AWS.
- Exam clue phrases: Kubernetes; managed control plane; containers
- Common misconceptions: EKS is usually more complex than ECS for beginners.
- Adjacent service comparison: EKS = managed Kubernetes; ECS = AWS-native orchestrator; Fargate = serverless compute option.
- Official docs: https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html

### AWS Elastic Beanstalk (P0)
- Id: `clf-c02-resource-aws-elastic-beanstalk`
- Analogy: Beanstalk plants the infrastructure around uploaded app code.
- Plain-English explanation: Elastic Beanstalk deploys and manages web apps using underlying AWS resources like EC2, Auto Scaling, and load balancers while preserving access to those resources.
- Real-world use case: Deploy a simple Java, Node.js, Python, or .NET web app quickly.
- Exam clue phrases: managed platform; deploy application; uses EC2/ELB
- Common misconceptions: Beanstalk is not the same as Lambda serverless functions; it often creates EC2 resources.
- Adjacent service comparison: Beanstalk abstracts app deployment; CloudFormation provisions infrastructure; Lambda runs functions.
- Official docs: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html

## Databases/analytics

### Amazon RDS (P0)
- Id: `clf-c02-resource-amazon-rds`
- Analogy: RDS is AWS doing database server chores for familiar relational databases.
- Plain-English explanation: RDS is a managed relational database service for engines such as MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, and Db2. AWS handles provisioning, backup, patching options, and availability features.
- Real-world use case: Run a transactional e-commerce database without self-managing database servers.
- Exam clue phrases: managed relational database; SQL; Multi-AZ; backups
- Common misconceptions: AWS manages infrastructure chores but not your schema, data model, or query quality.
- Adjacent service comparison: RDS = managed relational engines; Aurora = AWS-optimized relational; DynamoDB = NoSQL.
- Official docs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html

### Amazon Aurora (P0)
- Id: `clf-c02-resource-amazon-aurora`
- Analogy: Aurora is an AWS-built high-performance relational engine compatible with MySQL/PostgreSQL.
- Plain-English explanation: Aurora is a managed cloud-optimized relational database with distributed storage and MySQL/PostgreSQL compatibility editions.
- Real-world use case: Modernize a MySQL/PostgreSQL workload needing higher availability/performance.
- Exam clue phrases: Aurora; MySQL compatible; PostgreSQL compatible; cloud optimized
- Common misconceptions: Aurora is related to RDS experience but not identical to standard community MySQL on RDS.
- Adjacent service comparison: Aurora = AWS-optimized relational; RDS = managed common engines; DynamoDB = NoSQL.
- Official docs: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html

### Amazon DynamoDB (P0)
- Id: `clf-c02-resource-amazon-dynamodb`
- Analogy: DynamoDB is a managed key-value/document table built for huge scale.
- Plain-English explanation: DynamoDB is a fully managed NoSQL database with fast performance at scale for key-based access patterns.
- Real-world use case: Store sessions, shopping carts, IoT state, or leaderboards.
- Exam clue phrases: NoSQL; key-value; serverless database; single-digit millisecond
- Common misconceptions: It is not a drop-in replacement for relational joins and ad hoc SQL.
- Adjacent service comparison: DynamoDB = NoSQL; RDS/Aurora = relational SQL; ElastiCache = in-memory cache.
- Official docs: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html

### Amazon ElastiCache (P1)
- Id: `clf-c02-resource-amazon-elasticache`
- Analogy: ElastiCache is a high-speed memory shelf for data needed again soon.
- Plain-English explanation: ElastiCache is managed in-memory caching compatible with Redis/Valkey and Memcached patterns, reducing latency and database load.
- Real-world use case: Cache product catalog reads or session data.
- Exam clue phrases: in-memory cache; Redis; Memcached; low latency
- Common misconceptions: A cache is usually not the durable system of record.
- Adjacent service comparison: ElastiCache = cache; RDS/DynamoDB = databases; MemoryDB = durable Redis-compatible database.
- Official docs: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html

### Amazon Redshift (P0)
- Id: `clf-c02-resource-amazon-redshift`
- Analogy: Redshift is a data warehouse for scanning lots of structured records.
- Plain-English explanation: Redshift is a managed analytics warehouse optimized for complex queries over large datasets, not small transaction updates.
- Real-world use case: Analyze years of sales data for business dashboards.
- Exam clue phrases: data warehouse; analytics; large-scale SQL; OLAP
- Common misconceptions: Not ideal for high-frequency transaction processing.
- Adjacent service comparison: Redshift = warehouse; Athena = query S3; RDS = transactional relational DB.
- Official docs: https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html

### Amazon Athena (P0)
- Id: `clf-c02-resource-amazon-athena`
- Analogy: Athena lets you ask SQL questions directly against files in S3.
- Plain-English explanation: Athena is a serverless interactive query service for analyzing S3 data with SQL. You pay per query/data scanned and manage no servers.
- Real-world use case: Query application logs stored in S3.
- Exam clue phrases: serverless query; SQL on S3; pay per query
- Common misconceptions: Athena does not store data; S3 stores it.
- Adjacent service comparison: Athena queries S3; Redshift is a warehouse; Glue catalogs/transforms data.
- Official docs: https://docs.aws.amazon.com/athena/latest/ug/what-is.html

### AWS Glue (P1)
- Id: `clf-c02-resource-aws-glue`
- Analogy: Glue is a data prep workshop plus catalog.
- Plain-English explanation: Glue is serverless data integration for ETL, data cataloging, and preparing analytics data. Glue Data Catalog metadata is used by Athena and others.
- Real-world use case: Catalog S3 data and transform CSV logs to Parquet.
- Exam clue phrases: ETL; data catalog; serverless data integration
- Common misconceptions: Glue is not the dashboarding tool.
- Adjacent service comparison: Glue catalogs/transforms; Athena queries; QuickSight visualizes.
- Official docs: https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html

### Amazon OpenSearch Service (P1)
- Id: `clf-c02-resource-amazon-opensearch-service`
- Analogy: OpenSearch is a fast searchable index for logs and text.
- Plain-English explanation: OpenSearch Service manages OpenSearch for search, log analytics, and observability-style indexing/querying.
- Real-world use case: Search application logs or power website search.
- Exam clue phrases: search; log analytics; indexing
- Common misconceptions: Not a relational transaction database replacement.
- Adjacent service comparison: OpenSearch = search/log index; CloudWatch Logs = log collection; Athena = SQL over S3.
- Official docs: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html

### Amazon QuickSight (P1)
- Id: `clf-c02-resource-amazon-quicksight`
- Analogy: QuickSight is a dashboard and BI studio.
- Plain-English explanation: QuickSight creates dashboards, visualizations, and embedded analytics from sources such as Athena, Redshift, RDS, and S3.
- Real-world use case: Build executive cost or sales dashboards.
- Exam clue phrases: business intelligence; dashboard; visualization; SPICE
- Common misconceptions: It does not store/prepare all source data by itself.
- Adjacent service comparison: QuickSight visualizes; Redshift/Athena query; Glue prepares/catalogs.
- Official docs: https://docs.aws.amazon.com/quicksight/latest/user/welcome.html

## Global infrastructure

### AWS Regions (P0)
- Id: `clf-c02-resource-aws-regions`
- Analogy: A Region is a separate city/metro area where AWS operates cloud facilities.
- Plain-English explanation: A Region is a physical geographic area such as us-east-1 or eu-west-1. You choose a Region to keep workloads near users, meet data residency needs, or isolate disaster-recovery copies. Most resources are regional unless a service is explicitly global.
- Real-world use case: Host EU customer data in an EU Region to reduce latency and support residency expectations.
- Exam clue phrases: geographic area; data residency; regional service
- Common misconceptions: A Region is not one building; it contains multiple AZs. Not all services exist in every Region.
- Adjacent service comparison: Region is broad location; AZ is isolated location inside it; edge location is for edge delivery/routing.
- Official docs: https://docs.aws.amazon.com/whitepapers/latest/aws-overview/global-infrastructure.html

### Availability Zones (AZs) (P0)
- Id: `clf-c02-resource-availability-zones-azs`
- Analogy: AZs are separate buildings/neighborhoods inside one city, connected by fast private roads.
- Plain-English explanation: An Availability Zone is one or more physically separate data centers inside a Region, with independent power/networking and low-latency links to other AZs. Multi-AZ designs survive data-center-level failures.
- Real-world use case: Run app servers across two AZs behind a load balancer.
- Exam clue phrases: high availability; fault isolation; multi-AZ
- Common misconceptions: Two servers in one AZ are not multi-AZ. AZ names can map differently between accounts.
- Adjacent service comparison: AZ gives resilience inside a Region; multi-Region is broader DR and more complex.
- Official docs: https://docs.aws.amazon.com/whitepapers/latest/aws-overview/global-infrastructure.html

### Edge locations (P0)
- Id: `clf-c02-resource-edge-locations`
- Analogy: Edge locations are neighborhood pickup lockers close to users.
- Plain-English explanation: Edge locations are AWS global edge sites used by CloudFront, Route 53, and related services to serve cached content or route traffic close to users.
- Real-world use case: Cache static assets close to global website visitors.
- Exam clue phrases: low latency; CloudFront; cache near users
- Common misconceptions: Edge locations are not Regions and usually do not host full application stacks.
- Adjacent service comparison: Regions/AZs host workloads; edge locations cache/route traffic.
- Official docs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html

### AWS Local Zones (P1)
- Id: `clf-c02-resource-aws-local-zones`
- Analogy: A Local Zone is a small AWS extension inside a metro area.
- Plain-English explanation: Local Zones place select compute, storage, and networking capabilities near large population centers when single-digit millisecond latency to that metro matters.
- Real-world use case: Low-latency gaming, media rendering, or interactive applications in a specific city.
- Exam clue phrases: metro area; single-digit millisecond latency; extension of Region
- Common misconceptions: Local Zones do not offer every AWS service and are not a replacement for normal Regions.
- Adjacent service comparison: Local Zones are metro edge; Outposts is in your facility; Wavelength is carrier 5G edge.
- Official docs: https://docs.aws.amazon.com/local-zones/latest/ug/what-is-aws-local-zones.html

### AWS Wavelength (P2)
- Id: `clf-c02-resource-aws-wavelength`
- Analogy: Wavelength is a small cloud workbench inside a mobile carrier network.
- Plain-English explanation: Wavelength embeds AWS compute/storage at 5G carrier edges for ultra-low-latency mobile applications that should avoid a round trip to a Region.
- Real-world use case: AR/VR, connected vehicles, and live mobile video analytics.
- Exam clue phrases: 5G; telecom edge; ultra-low latency
- Common misconceptions: Most web apps use Regions plus CloudFront instead of Wavelength.
- Adjacent service comparison: Wavelength is carrier edge; Local Zones are metro edge; CloudFront is CDN edge.
- Official docs: https://docs.aws.amazon.com/wavelength/latest/developerguide/what-is-wavelength.html

## IAM/security

### IAM users (P0)
- Id: `clf-c02-resource-iam-users`
- Analogy: An IAM user is a named employee badge inside one AWS account.
- Plain-English explanation: IAM users are long-term identities in an AWS account. They can sign in or use access keys, but least privilege and MFA are essential, and roles/federation are preferred for many modern patterns.
- Real-world use case: Create a break-glass admin user protected by MFA and rarely used.
- Exam clue phrases: identity; long-term credentials; least privilege
- Common misconceptions: Do not use the root user for daily work. Access keys are secrets.
- Adjacent service comparison: Users are identities; groups organize users; roles are assumed temporarily; policies define permissions.
- Official docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html

### IAM groups (P0)
- Id: `clf-c02-resource-iam-groups`
- Analogy: A group is a permissions mailing list for users.
- Plain-English explanation: IAM groups collect IAM users so permissions can be attached once for a team instead of repeatedly to individuals.
- Real-world use case: Give a ReadOnly group view-only access for auditors.
- Exam clue phrases: team access; attach policy to multiple users
- Common misconceptions: Groups cannot contain roles or nested groups and are not identities applications assume.
- Adjacent service comparison: Groups organize users; roles are temporary identities; policies are permission documents.
- Official docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_groups.html

### IAM roles (P0)
- Id: `clf-c02-resource-iam-roles`
- Analogy: A role is a temporary costume used to do a job.
- Plain-English explanation: IAM roles provide temporary credentials to AWS services, applications, federated users, or other accounts. They avoid hardcoded long-term keys.
- Real-world use case: Give an EC2 instance a role that can read one S3 bucket.
- Exam clue phrases: assume role; temporary credentials; service access; cross-account
- Common misconceptions: A role is not permanently assigned to one person; it is assumed when needed.
- Adjacent service comparison: Role = temporary assumed permissions; user = long-term identity; policy = permission rules.
- Official docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html

### IAM policies (P0)
- Id: `clf-c02-resource-iam-policies`
- Analogy: A policy is a rule sheet saying who can do which actions on which resources.
- Plain-English explanation: IAM policies are JSON permission documents with allow/deny statements, resources, actions, and optional conditions. Least privilege means granting only what is needed.
- Real-world use case: Allow a Lambda function to write to one DynamoDB table and nothing else.
- Exam clue phrases: JSON; allow/deny; least privilege; actions/resources
- Common misconceptions: Explicit deny overrides allows. A policy alone is not a login identity.
- Adjacent service comparison: Policies define permissions; IAM identities receive policies; SCPs set org-level maximums.
- Official docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html

### Multi-factor authentication (MFA) (P0)
- Id: `clf-c02-resource-multi-factor-authentication-mfa`
- Analogy: MFA is a second lock after the password key.
- Plain-English explanation: MFA requires an additional proof such as an authenticator app or hardware key. Cloud Practitioner emphasis: protect root and privileged identities.
- Real-world use case: Enable MFA for root and administrators.
- Exam clue phrases: second factor; root account protection; secure sign-in
- Common misconceptions: MFA does not replace least privilege; it only strengthens authentication.
- Adjacent service comparison: MFA verifies login; IAM policies control authorization after login.
- Official docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html

### AWS Key Management Service (KMS) (P0)
- Id: `clf-c02-resource-aws-key-management-service-kms`
- Analogy: KMS is a secure key cabinet used by AWS services.
- Plain-English explanation: KMS creates and controls cryptographic keys for encrypting data. Many AWS services integrate with it for managed encryption and auditable key use.
- Real-world use case: Encrypt EBS volumes, S3 objects, and RDS databases with customer managed keys.
- Exam clue phrases: encryption keys; customer managed key; key rotation
- Common misconceptions: KMS stores/manages keys, not application passwords or API tokens.
- Adjacent service comparison: KMS manages keys; Secrets Manager stores secret values; ACM manages TLS certificates.
- Official docs: https://docs.aws.amazon.com/kms/latest/developerguide/overview.html

### AWS Secrets Manager (P1)
- Id: `clf-c02-resource-aws-secrets-manager`
- Analogy: Secrets Manager is a password vault with optional rotation.
- Plain-English explanation: Secrets Manager stores, retrieves, and can rotate secrets such as database passwords and API keys so applications do not hardcode them.
- Real-world use case: Store and rotate an RDS application password.
- Exam clue phrases: store secrets; rotate credentials; database password
- Common misconceptions: It is not the same as KMS; it stores secret values and uses encryption underneath.
- Adjacent service comparison: Secrets Manager stores secrets; Parameter Store handles config/simple secrets; KMS handles keys.
- Official docs: https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html

### AWS Certificate Manager (ACM) (P1)
- Id: `clf-c02-resource-aws-certificate-manager-acm`
- Analogy: ACM is a certificate office for website ID cards.
- Plain-English explanation: ACM provisions, manages, and renews TLS/SSL certificates for AWS-integrated services such as ELB, CloudFront, and API Gateway.
- Real-world use case: Add HTTPS to an Application Load Balancer without manual renewal.
- Exam clue phrases: TLS certificate; HTTPS; certificate renewal
- Common misconceptions: ACM does not replace DNS or CDN services; it supplies certificates they use.
- Adjacent service comparison: ACM manages certificates; KMS manages encryption keys; IAM controls access.
- Official docs: https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html

### AWS Shield (P1)
- Id: `clf-c02-resource-aws-shield`
- Analogy: Shield is a DDoS guard at the edge.
- Plain-English explanation: AWS Shield protects against distributed denial-of-service attacks. Shield Standard is automatic; Shield Advanced adds stronger protections and response support.
- Real-world use case: Protect a public web app on CloudFront or Route 53 from DDoS.
- Exam clue phrases: DDoS; Shield Standard; Shield Advanced
- Common misconceptions: Shield is not a web request filter for SQL injection; use WAF for that.
- Adjacent service comparison: Shield handles DDoS; WAF filters web requests; GuardDuty detects suspicious activity.
- Official docs: https://docs.aws.amazon.com/waf/latest/developerguide/shield-chapter.html

### AWS WAF (P0)
- Id: `clf-c02-resource-aws-waf`
- Analogy: WAF is a bouncer checking HTTP requests before the app.
- Plain-English explanation: AWS WAF controls HTTP/S requests to CloudFront, ALB, API Gateway, and other integrations using rules and managed rule groups.
- Real-world use case: Block known malicious request patterns before they reach a website.
- Exam clue phrases: web application firewall; HTTP filtering; SQL injection; XSS
- Common misconceptions: WAF is not for every network protocol; it works at web layer.
- Adjacent service comparison: WAF filters web requests; Shield absorbs DDoS; security groups control resource traffic.
- Official docs: https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html

### Amazon GuardDuty (P0)
- Id: `clf-c02-resource-amazon-guardduty`
- Analogy: GuardDuty is a security camera watching logs for suspicious behavior.
- Plain-English explanation: GuardDuty analyzes signals such as CloudTrail, VPC flow logs, DNS logs, and other sources to detect threats and produce findings.
- Real-world use case: Detect unusual API calls or compromised credential behavior.
- Exam clue phrases: threat detection; findings; suspicious activity
- Common misconceptions: GuardDuty detects; it does not patch vulnerabilities or become a full SIEM alone.
- Adjacent service comparison: GuardDuty detects threats; Inspector finds vulnerabilities; Security Hub aggregates findings.
- Official docs: https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html

### Amazon Inspector (P1)
- Id: `clf-c02-resource-amazon-inspector`
- Analogy: Inspector is a vulnerability scanner for workloads.
- Plain-English explanation: Inspector scans supported EC2 instances, ECR container images, and Lambda functions for software vulnerabilities and exposure.
- Real-world use case: Find known CVEs in container images before deployment.
- Exam clue phrases: vulnerability management; CVE scanning; EC2/ECR/Lambda
- Common misconceptions: Inspector is not GuardDuty: vulnerabilities differ from suspicious activity.
- Adjacent service comparison: Inspector scans vulnerabilities; GuardDuty detects threats; Systems Manager helps patch.
- Official docs: https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html

### AWS CloudTrail (P0)
- Id: `clf-c02-resource-aws-cloudtrail`
- Analogy: CloudTrail is the audit trail showing who did what.
- Plain-English explanation: CloudTrail records AWS API calls and account activity for audit, governance, compliance, and security investigations.
- Real-world use case: Investigate who changed a security group or deleted a bucket policy.
- Exam clue phrases: API activity; audit; who did what; governance
- Common misconceptions: CloudTrail is not CloudWatch metrics/log monitoring.
- Adjacent service comparison: CloudTrail audits actions; Config tracks resource state; CloudWatch monitors telemetry.
- Official docs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html

### AWS Security Hub (P1)
- Id: `clf-c02-resource-aws-security-hub`
- Analogy: Security Hub is a central security findings scoreboard.
- Plain-English explanation: Security Hub aggregates and normalizes security findings from AWS services and partner tools and checks against security standards.
- Real-world use case: Centralize GuardDuty, Inspector, and Config findings across accounts.
- Exam clue phrases: central findings; security posture; standards checks
- Common misconceptions: It does not replace the underlying scanners; it collects and prioritizes them.
- Adjacent service comparison: Security Hub aggregates; GuardDuty detects; Inspector scans; Config evaluates.
- Official docs: https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html

## Integration/app

### Amazon SQS (P0)
- Id: `clf-c02-resource-amazon-sqs`
- Analogy: SQS is a waiting line for work messages.
- Plain-English explanation: SQS is a managed message queue that decouples components and buffers work when producers and consumers run at different speeds.
- Real-world use case: Queue order-processing jobs during traffic spikes.
- Exam clue phrases: queue; decouple; message buffering; polling
- Common misconceptions: SQS is not pub/sub fanout by itself; SNS commonly handles fanout.
- Adjacent service comparison: SQS = queue; SNS = topic broadcast; EventBridge = event router.
- Official docs: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html

### Amazon SNS (P0)
- Id: `clf-c02-resource-amazon-sns`
- Analogy: SNS is a megaphone broadcasting to subscribers.
- Plain-English explanation: SNS is a managed pub/sub service where publishers send to topics and subscribers such as email, SMS, HTTP, Lambda, or SQS receive messages.
- Real-world use case: Send one order event to email alerts, Lambda, and a queue.
- Exam clue phrases: pub/sub; topic; fanout; notification
- Common misconceptions: SNS is not primarily a work queue for one worker group; use SQS.
- Adjacent service comparison: SNS broadcasts; SQS queues; EventBridge routes structured events.
- Official docs: https://docs.aws.amazon.com/sns/latest/dg/welcome.html

### Amazon EventBridge (P0)
- Id: `clf-c02-resource-amazon-eventbridge`
- Analogy: EventBridge is an event router with rules.
- Plain-English explanation: EventBridge is a serverless event bus connecting AWS services, SaaS partners, and custom applications using event patterns and targets.
- Real-world use case: Route order-created events to workflows and notification targets.
- Exam clue phrases: event bus; event-driven; rules; SaaS events
- Common misconceptions: It is broader than a simple queue or notification topic.
- Adjacent service comparison: EventBridge routes events; SNS broadcasts; SQS buffers work; Step Functions orchestrates.
- Official docs: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html

### AWS Step Functions (P0)
- Id: `clf-c02-resource-aws-step-functions`
- Analogy: Step Functions is a flowchart runner for workflows.
- Plain-English explanation: Step Functions coordinates multi-step workflows with state machines, retries, branching, parallelism, and visual execution history.
- Real-world use case: Coordinate order validation, payment, inventory, and notification.
- Exam clue phrases: workflow orchestration; state machine; retry; branching
- Common misconceptions: It coordinates compute but is not the compute itself.
- Adjacent service comparison: Step Functions orchestrates; Lambda/ECS perform tasks; EventBridge routes events.
- Official docs: https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html

### Amazon API Gateway (P0)
- Id: `clf-c02-resource-amazon-api-gateway`
- Analogy: API Gateway is a managed front door for APIs.
- Plain-English explanation: API Gateway creates, publishes, secures, monitors, and manages APIs, often in front of Lambda or HTTP backends.
- Real-world use case: Expose a serverless REST API backed by Lambda.
- Exam clue phrases: managed API; REST; HTTP; WebSocket; throttling
- Common misconceptions: Business logic usually lives behind it, not inside it.
- Adjacent service comparison: API Gateway fronts APIs; ALB balances web traffic; CloudFront caches at edge.
- Official docs: https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html

## Management/observability

### Amazon CloudWatch (P0)
- Id: `clf-c02-resource-amazon-cloudwatch`
- Analogy: CloudWatch is the dashboard, alarm system, and log notebook.
- Plain-English explanation: CloudWatch collects metrics, logs, events, and alarms for AWS resources and applications to monitor health and trigger actions.
- Real-world use case: Alarm on high EC2 CPU and inspect Lambda logs.
- Exam clue phrases: metrics; logs; alarms; monitoring
- Common misconceptions: CloudWatch is not the audit record of API calls; CloudTrail is.
- Adjacent service comparison: CloudWatch monitors telemetry; CloudTrail audits API calls; Config tracks configuration.
- Official docs: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html

### AWS CloudFormation (P0)
- Id: `clf-c02-resource-aws-cloudformation`
- Analogy: CloudFormation is a blueprint that builds resources repeatably.
- Plain-English explanation: CloudFormation provisions infrastructure as code using templates and stacks, enabling repeatable create/update/delete operations.
- Real-world use case: Deploy a VPC, subnets, security groups, and EC2 from a template.
- Exam clue phrases: infrastructure as code; template; stack
- Common misconceptions: It is not just an app deployer; it is general IaC.
- Adjacent service comparison: CloudFormation defines infrastructure; Beanstalk deploys apps; CDK synthesizes CloudFormation.
- Official docs: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html

### AWS Systems Manager (P1)
- Id: `clf-c02-resource-aws-systems-manager`
- Analogy: Systems Manager is a remote operations toolbox.
- Plain-English explanation: Systems Manager helps view/control resources, run commands, patch servers, automate operations, and store parameters.
- Real-world use case: Patch EC2 fleets or run a command across instances.
- Exam clue phrases: operations management; Run Command; Patch Manager; Parameter Store
- Common misconceptions: It is a suite of capabilities, not one single dashboard.
- Adjacent service comparison: Systems Manager operates resources; CloudWatch monitors; Config evaluates state.
- Official docs: https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html

### AWS Config (P0)
- Id: `clf-c02-resource-aws-config`
- Analogy: Config is a configuration recorder and rule checker.
- Plain-English explanation: AWS Config records resource configuration changes and evaluates them against compliance rules.
- Real-world use case: Detect public S3 buckets or risky security groups.
- Exam clue phrases: resource inventory; configuration history; compliance rules
- Common misconceptions: Config is not CloudTrail; it focuses on resource state, not every API event.
- Adjacent service comparison: Config tracks state/compliance; CloudTrail audits actions; Security Hub aggregates findings.
- Official docs: https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html

### AWS Organizations (P0)
- Id: `clf-c02-resource-aws-organizations`
- Analogy: Organizations is a company org chart for multiple AWS accounts.
- Plain-English explanation: Organizations centrally manages multiple AWS accounts with consolidated billing, OUs, and service control policies.
- Real-world use case: Separate dev, test, prod, and security accounts under one payer.
- Exam clue phrases: multiple accounts; consolidated billing; OUs; SCPs
- Common misconceptions: SCPs set maximum permissions but do not grant access by themselves.
- Adjacent service comparison: Organizations manages accounts/billing/guardrails; IAM grants within accounts; Control Tower sets baselines.
- Official docs: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html

### AWS Control Tower (P1)
- Id: `clf-c02-resource-aws-control-tower`
- Analogy: Control Tower is a governed multi-account landing-zone setup.
- Plain-English explanation: Control Tower sets up and governs AWS multi-account environments using best-practice blueprints, guardrails, and account factory.
- Real-world use case: Launch new accounts with baseline logging and security controls.
- Exam clue phrases: landing zone; multi-account governance; guardrails
- Common misconceptions: It uses Organizations underneath and does not replace account/OUs/SCP understanding.
- Adjacent service comparison: Control Tower creates governed baseline; Organizations manages accounts; Config/Security Hub monitor.
- Official docs: https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html

### AWS Trusted Advisor (P0)
- Id: `clf-c02-resource-aws-trusted-advisor`
- Analogy: Trusted Advisor is a checklist consultant scanning for improvement opportunities.
- Plain-English explanation: Trusted Advisor gives recommendations for cost optimization, performance, security, fault tolerance, service quotas, and operational excellence, with check access varying by support plan.
- Real-world use case: Find idle resources, exposed ports, or quota warnings.
- Exam clue phrases: recommendations; cost optimization; security checks; support plan
- Common misconceptions: It recommends; it does not automatically fix everything. Full checks vary by support plan.
- Adjacent service comparison: Trusted Advisor recommends; Cost Explorer analyzes spend; Security Hub aggregates security findings.
- Official docs: https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html

### AWS Health Dashboard (P1)
- Id: `clf-c02-resource-aws-health-dashboard`
- Analogy: Health Dashboard shows AWS events that may affect you.
- Plain-English explanation: AWS Health provides service event visibility and account/resource-specific notifications for planned changes or incidents.
- Real-world use case: See whether a service issue affects resources in your account.
- Exam clue phrases: service health; account-specific events; planned changes
- Common misconceptions: Public status is broad; AWS Health can be personalized.
- Adjacent service comparison: Health shows AWS/service events; CloudWatch shows workload metrics; CloudTrail shows actions.
- Official docs: https://docs.aws.amazon.com/health/latest/ug/what-is-aws-health.html

## Migration

### AWS Database Migration Service (DMS) (P1)
- Id: `clf-c02-resource-aws-database-migration-service-dms`
- Analogy: DMS is a moving truck for databases with ongoing replication.
- Plain-English explanation: DMS helps migrate databases to AWS or between databases with minimal downtime for supported sources and targets; heterogeneous migrations may need schema conversion.
- Real-world use case: Move on-premises MySQL or Oracle to RDS/Aurora.
- Exam clue phrases: database migration; minimal downtime; replication
- Common misconceptions: DMS moves data; schema conversion can require SCT for different engines.
- Adjacent service comparison: DMS migrates databases; Application Migration Service migrates servers; Snowball moves bulk offline data.
- Official docs: https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html

### AWS Snowball / Snow Family (P1)
- Id: `clf-c02-resource-aws-snowball-snow-family`
- Analogy: Snowball is a rugged shipping container for data.
- Plain-English explanation: Snow Family devices move large data sets into/out of AWS and support edge/disconnected compute where network transfer is impractical.
- Real-world use case: Transfer hundreds of terabytes to S3 without saturating internet links.
- Exam clue phrases: physical device; large data transfer; offline migration
- Common misconceptions: Not for small routine transfers where normal upload is practical.
- Adjacent service comparison: Snowball = physical transfer; DataSync = online movement; Storage Gateway = hybrid storage.
- Official docs: https://docs.aws.amazon.com/snowball/latest/developer-guide/whatisedge.html

### AWS Migration Hub (P1)
- Id: `clf-c02-resource-aws-migration-hub`
- Analogy: Migration Hub is the project dashboard for migrations.
- Plain-English explanation: Migration Hub provides central visibility into application migration progress across AWS and partner migration tools.
- Real-world use case: Track migration waves for dozens of applications.
- Exam clue phrases: central migration tracking; progress; applications
- Common misconceptions: It tracks and organizes; it is not the data mover for every workload.
- Adjacent service comparison: Migration Hub tracks; DMS migrates databases; Application Migration Service rehosts servers.
- Official docs: https://docs.aws.amazon.com/migrationhub/latest/ug/whatishub.html

### AWS Application Migration Service (P1)
- Id: `clf-c02-resource-aws-application-migration-service`
- Analogy: Application Migration Service is a lift-and-shift copier for servers.
- Plain-English explanation: AWS Application Migration Service continuously replicates source servers and launches them as EC2 instances for rehost migrations.
- Real-world use case: Lift and shift on-premises application servers to EC2.
- Exam clue phrases: rehost; lift and shift; server migration; replication
- Common misconceptions: It is not database-specific; DMS handles database migrations.
- Adjacent service comparison: Application Migration Service migrates servers; DMS migrates databases; Migration Hub tracks.
- Official docs: https://docs.aws.amazon.com/mgn/latest/ug/what-is-application-migration-service.html

## Networking/CDN

### Amazon VPC (P0)
- Id: `clf-c02-resource-amazon-vpc`
- Analogy: A VPC is your private AWS neighborhood with streets, gates, and addresses.
- Plain-English explanation: VPC lets you define an isolated virtual network with IP ranges, subnets, route tables, gateways, and security controls.
- Real-world use case: Put web servers in public subnets and databases in private subnets.
- Exam clue phrases: virtual network; CIDR; subnets; routing
- Common misconceptions: A VPC is regional and does not automatically make resources public/private.
- Adjacent service comparison: VPC is container; subnet is slice; route table controls paths; SG/NACL filter.
- Official docs: https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html

### Subnets (P0)
- Id: `clf-c02-resource-subnets`
- Analogy: A subnet is a street/block inside the VPC neighborhood.
- Plain-English explanation: A subnet is an IP range in one AZ. Public/private behavior comes from routing, especially whether there is a route to an internet gateway.
- Real-world use case: Place load balancers in public subnets and app servers in private subnets.
- Exam clue phrases: public subnet; private subnet; AZ; IP range
- Common misconceptions: Public/private is about routes, not just the name.
- Adjacent service comparison: Subnet segments IPs; route table controls destination; NACL filters at subnet boundary.
- Official docs: https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html

### Route tables (P0)
- Id: `clf-c02-resource-route-tables`
- Analogy: Route tables are road signs for network packets.
- Plain-English explanation: Route tables contain rules that direct traffic from subnets/gateways to local VPC, internet gateway, NAT gateway, transit gateway, VPN, and other targets.
- Real-world use case: Route public subnet internet traffic to IGW and private subnet outbound traffic to NAT.
- Exam clue phrases: routing; 0.0.0.0/0; IGW; NAT gateway
- Common misconceptions: Security groups do not route traffic; they filter allowed traffic.
- Adjacent service comparison: Route tables choose paths; SG/NACL filter; gateways connect networks.
- Official docs: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html

### Internet Gateway (IGW) (P0)
- Id: `clf-c02-resource-internet-gateway-igw`
- Analogy: An IGW is the front gate connecting a VPC to the public internet.
- Plain-English explanation: An internet gateway enables communication between public VPC resources and the internet when routes, public addressing, and security rules allow it.
- Real-world use case: Allow a public Application Load Balancer to receive internet traffic.
- Exam clue phrases: internet access; public subnet; route to IGW
- Common misconceptions: Attaching an IGW alone does not expose every resource.
- Adjacent service comparison: IGW enables direct internet path; NAT Gateway enables outbound-only path from private subnets.
- Official docs: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html

### NAT Gateway (P0)
- Id: `clf-c02-resource-nat-gateway`
- Analogy: A NAT gateway is an outbound-only lobby for private servers.
- Plain-English explanation: NAT Gateway lets resources in private subnets initiate outbound IPv4 internet connections while preventing unsolicited inbound internet connections.
- Real-world use case: Private EC2 instances download patches without public inbound access.
- Exam clue phrases: private outbound internet; no inbound; managed NAT
- Common misconceptions: NAT is not a firewall and does not make private resources public.
- Adjacent service comparison: NAT Gateway = outbound from private; IGW = direct internet; VPC endpoint = private AWS service access.
- Official docs: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html

### Security groups vs NACLs (P0)
- Id: `clf-c02-resource-security-groups-vs-nacls`
- Analogy: Security groups are room door locks; NACLs are street checkpoints.
- Plain-English explanation: Security groups are stateful resource-level firewalls; network ACLs are stateless subnet-level ordered allow/deny rules.
- Real-world use case: Allow HTTPS to web instances with SGs and use NACLs as broad guardrails.
- Exam clue phrases: stateful SG; stateless NACL; instance vs subnet firewall
- Common misconceptions: NACLs require inbound and outbound rules because they are stateless; SGs allow return traffic.
- Adjacent service comparison: SG = resource-level stateful allow rules; NACL = subnet-level stateless allow/deny.
- Official docs: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html

### Amazon Route 53 (P0)
- Id: `clf-c02-resource-amazon-route-53`
- Analogy: Route 53 is AWS DNS: the internet phonebook plus routing rules.
- Plain-English explanation: Route 53 maps domain names to targets and supports routing policies, health checks, and domain registration.
- Real-world use case: Point example.com to CloudFront or fail over between endpoints.
- Exam clue phrases: DNS; domain registration; routing policy; health check
- Common misconceptions: Route 53 does not serve content; it tells clients where to go.
- Adjacent service comparison: Route 53 = DNS/routing; CloudFront = CDN; ELB = traffic distribution to targets.
- Official docs: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html

### Amazon CloudFront (P0)
- Id: `clf-c02-resource-amazon-cloudfront`
- Analogy: CloudFront is a global cache that puts content near users.
- Plain-English explanation: CloudFront is a CDN that caches and delivers content through edge locations and integrates with S3, ALB, API Gateway, and WAF.
- Real-world use case: Serve static assets globally with lower latency.
- Exam clue phrases: CDN; edge caching; global delivery; origin
- Common misconceptions: CloudFront is not the origin storage itself; it fetches from origins.
- Adjacent service comparison: CloudFront delivers/caches; S3 stores objects; Route 53 resolves names.
- Official docs: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html

### AWS Direct Connect (P1)
- Id: `clf-c02-resource-aws-direct-connect`
- Analogy: Direct Connect is a private leased road from your data center to AWS.
- Plain-English explanation: Direct Connect provides dedicated network connectivity from on-premises locations to AWS with more consistent performance than internet paths.
- Real-world use case: Connect a data center to AWS for steady hybrid workloads.
- Exam clue phrases: dedicated private connection; hybrid; consistent bandwidth
- Common misconceptions: Direct Connect is not encrypted by default like VPN; add encryption if required.
- Adjacent service comparison: Direct Connect = dedicated connection; Site-to-Site VPN = encrypted tunnel over internet.
- Official docs: https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html

### AWS VPN (P1)
- Id: `clf-c02-resource-aws-vpn`
- Analogy: VPN is an encrypted tunnel through the public internet.
- Plain-English explanation: AWS VPN includes Site-to-Site VPN for network-to-VPC connections and Client VPN for user remote access.
- Real-world use case: Connect an office network to a VPC quickly.
- Exam clue phrases: encrypted tunnel; site-to-site; hybrid; remote access
- Common misconceptions: VPN performance depends on internet path; Direct Connect may be more predictable.
- Adjacent service comparison: VPN = encrypted internet tunnel; Direct Connect = dedicated link; Transit Gateway = hub.
- Official docs: https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html

### AWS Transit Gateway (P1)
- Id: `clf-c02-resource-aws-transit-gateway`
- Analogy: Transit Gateway is a central bus station for many VPCs and networks.
- Plain-English explanation: Transit Gateway connects VPCs and on-premises networks with a hub-and-spoke model, simplifying large topologies.
- Real-world use case: Connect dozens of VPCs and hybrid links through one hub.
- Exam clue phrases: network hub; many VPCs; hub-and-spoke
- Common misconceptions: Detailed route-domain design is beyond CLF, but high-level purpose matters.
- Adjacent service comparison: Transit Gateway connects many networks; peering is pairwise; Direct Connect/VPN connect on-premises.
- Official docs: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html

## Storage

### Amazon S3 (P0)
- Id: `clf-c02-resource-amazon-s3`
- Analogy: S3 is an almost limitless object-storage warehouse.
- Plain-English explanation: S3 stores objects in buckets and is highly durable. It is used for backups, static sites, logs, data lakes, media, and application assets.
- Real-world use case: Store website images, analytics files, backups, and logs.
- Exam clue phrases: object storage; bucket; durability; static website
- Common misconceptions: S3 is not a block disk for EC2 boot volumes; use EBS.
- Adjacent service comparison: S3 = object storage; EBS = block volume; EFS = shared file system.
- Official docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html

### S3 storage classes (P0)
- Id: `clf-c02-resource-s3-storage-classes`
- Analogy: Storage classes are shelf types for hot, cool, or archived boxes.
- Plain-English explanation: S3 storage classes trade access frequency, retrieval time, availability/resilience model, and cost. Standard is for active data; IA and Glacier classes reduce cost for colder data.
- Real-world use case: Move old logs to cheaper archival classes.
- Exam clue phrases: frequent vs infrequent; archival; retrieval time
- Common misconceptions: The cheapest class can cost more if retrieved often or needed instantly.
- Adjacent service comparison: Lifecycle moves objects; Intelligent-Tiering changes tiers by access; Glacier classes archive.
- Official docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html

### S3 lifecycle policies (P0)
- Id: `clf-c02-resource-s3-lifecycle-policies`
- Analogy: Lifecycle is an automatic filing clerk moving or expiring objects by rule.
- Plain-English explanation: S3 lifecycle configuration transitions objects between classes or expires them based on age/prefix/tags for cost and retention management.
- Real-world use case: Move logs after 30 days and delete after 7 years.
- Exam clue phrases: automated transition; expire objects; cost optimization
- Common misconceptions: Lifecycle follows configured rules; it does not infer business value magically.
- Adjacent service comparison: Lifecycle applies rules; Intelligent-Tiering monitors access; Backup coordinates backups.
- Official docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html

### Amazon EBS (P0)
- Id: `clf-c02-resource-amazon-ebs`
- Analogy: EBS is a virtual hard drive attached to an EC2 computer.
- Plain-English explanation: EBS provides block storage volumes for EC2, suitable for operating systems, databases, and low-latency disk needs.
- Real-world use case: Attach a gp3 volume to an EC2 database server.
- Exam clue phrases: block storage; EC2 volume; snapshot; low latency
- Common misconceptions: EBS is AZ-scoped and not shared global object storage.
- Adjacent service comparison: EBS = EC2 disk; EFS = shared file system; S3 = object store.
- Official docs: https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html

### Amazon EFS (P0)
- Id: `clf-c02-resource-amazon-efs`
- Analogy: EFS is a shared network folder for multiple Linux servers.
- Plain-English explanation: EFS is a scalable managed NFS file system that multiple EC2 instances can mount concurrently across AZs.
- Real-world use case: Share uploaded user files across web servers.
- Exam clue phrases: shared file system; NFS; multiple instances; Linux
- Common misconceptions: EFS is not a Windows file server; FSx handles Windows file shares.
- Adjacent service comparison: EFS = Linux NFS; FSx = specialized file systems; EBS = single-instance block.
- Official docs: https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html

### Amazon FSx (P1)
- Id: `clf-c02-resource-amazon-fsx`
- Analogy: FSx is AWS running specialized file servers for you.
- Plain-English explanation: FSx provides managed file systems including Windows File Server, Lustre, NetApp ONTAP, and OpenZFS for protocol/performance-specific workloads.
- Real-world use case: Migrate Windows shared drives or run HPC with Lustre.
- Exam clue phrases: managed file system; Windows; Lustre; HPC
- Common misconceptions: FSx is not always the simplest shared-storage answer; EFS is simpler for Linux NFS.
- Adjacent service comparison: FSx = specialized managed file systems; EFS = elastic Linux NFS; S3 = object storage.
- Official docs: https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html

### S3 Glacier storage classes (P0)
- Id: `clf-c02-resource-s3-glacier-storage-classes`
- Analogy: Glacier is a deep vault: cheap to keep, slower to retrieve.
- Plain-English explanation: S3 Glacier storage classes are for long-term archive data that is rarely accessed; retrieval time and fees depend on class and option.
- Real-world use case: Archive compliance records or long-term backups.
- Exam clue phrases: archive; long-term retention; retrieval time; low storage cost
- Common misconceptions: Glacier is poor for frequently accessed application files.
- Adjacent service comparison: S3 Standard for active data; IA for less frequent; Glacier for archive.
- Official docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html

### AWS Storage Gateway (P1)
- Id: `clf-c02-resource-aws-storage-gateway`
- Analogy: Storage Gateway translates on-premises storage habits to AWS storage.
- Plain-English explanation: Storage Gateway connects on-premises environments to cloud storage through file, volume, or tape gateway patterns for hybrid storage.
- Real-world use case: Replace physical tapes with virtual tapes stored in AWS.
- Exam clue phrases: hybrid storage; on-premises; file/volume/tape gateway
- Common misconceptions: It is not a general VPN; it bridges storage use cases.
- Adjacent service comparison: Storage Gateway connects storage; Direct Connect/VPN connect networks; DataSync moves data.
- Official docs: https://docs.aws.amazon.com/storagegateway/latest/userguide/WhatIsStorageGateway.html

### AWS Backup (P1)
- Id: `clf-c02-resource-aws-backup`
- Analogy: AWS Backup is a central scheduler and policy book for backups.
- Plain-English explanation: AWS Backup centrally manages backup plans, retention, and recovery points across supported AWS services.
- Real-world use case: Apply daily backups to EBS, RDS, and EFS resources.
- Exam clue phrases: centralized backup; backup plan; retention
- Common misconceptions: It orchestrates backups; it does not replace understanding restore behavior per service.
- Adjacent service comparison: Backup manages policies; EBS snapshots are one mechanism; S3 versioning/lifecycle protect objects.
- Official docs: https://docs.aws.amazon.com/aws-backup/latest/devguide/whatisbackup.html
