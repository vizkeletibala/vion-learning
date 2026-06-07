# Vion Learning final readiness review — t_7c3cd307

Generated: 2026-06-05T19:28Z
Reviewer: Hermes reviewer profile
Workspace: `/home/vion/src/git/vion-learning`

## Verdict

NO-GO for final exam-readiness acceptance, but GO for deployment/app-flow mechanics.

The app is reachable privately through Tailscale, the deployed UI flows work, automated checks pass, both certification tracks are separated, and Docker/Tailscale deployment docs exist. However, one high-severity content taxonomy defect remains: many generated CLF-C02 service/resource cards and questions map resource families to the wrong CLF-C02 task statements. A medium-severity quality issue also remains: some generated reinforcement questions use generic meta distractors instead of learner-meaningful distractors.

I created remediation cards:

- `t_bb629bf3` — fix CLF-C02 resource weak-area taxonomy mappings
- `t_6a7a9589` — improve generated quiz distractor labels

## Acceptance criteria review

| Criterion | Result | Evidence |
|---|---:|---|
| Site reachable through Tailscale | PASS | `curl https://vion-kanban-ec2.tail276347.ts.net:8443/health` returned `status: ok`; Docker Playwright tailnet run passed. |
| Not publicly exposed | PASS | Docker publishes only `127.0.0.1:9140->3000`; `ss` shows listener on `127.0.0.1:9140`; curl to host primary IPv4 `172.31.30.76:9140` failed to connect. |
| Tailscale Serve private route | PASS | `tailscale serve status --json` shows `vion-kanban-ec2.tail276347.ts.net:8443 / -> http://127.0.0.1:9140`; no Funnel state observed in serve status. |
| Landing lets Andrew choose CLF-C02 or AIF-C01 | PASS | Browser automation passed: landing renders both track cards. API audit confirms tracks exactly `clf-c02` and `aif-c01`. |
| Separate study plans, cards, quizzes, source links, progress, readiness score per cert | PASS | Audit: CLF-C02 has 124 cards/147 questions/18 sources/readiness 18; AIF-C01 has 20 cards/20 questions/3 sources/readiness 18; all cards/questions track-scoped. |
| Initial useful seed cards exist for both certs | PASS | Counts above; CLF-C02 includes 91 service/resource explanations plus concept/curated question content; AIF-C01 has 20 seed cards/questions. |
| Quick quiz, domain quiz, full 65-question simulation structure exist | PASS | Audit generated quick=10, domain=15, full=65/timed 90 for both tracks; browser flow verified quick quiz. |
| Answer evaluation includes explanations, distractor analysis, weak-area/progress tracking | PASS with quality caveat | API audit confirms `correct_explanation`, `selected_explanation`, `option_reviews`, mapping, next actions, progress events. Some generated distractor labels are generic; see defect Q-1. |
| Official AWS sources are linked/stored with verification dates | PASS | `npm run sources:check` passes; source records include AWS URLs, hashes/status, `last_checked_at`/verification metadata. |
| Video resources supplementary and marked accordingly | PASS | Both tracks expose video metadata with `needs_authenticated_refresh` / `seed_metadata_only`; not used as authoritative quiz source. |
| Docker/Tailscale deployment docs exist | PASS | README documents Docker run/health, Tailscale Serve 8443, DNS fallback, stop/change, security caveats. |
| No brain dumps/unauthorized question material | PASS | Search hits are prohibitive safety language (`do not import brain dumps`, `exam-dump style wording`) rather than copied material. Practice content is original/source-linked by test and audit. |
| Content current, separated, safe for exam prep | PARTIAL / NO-GO | Current/source-linked and separated pass; exam-prep safety is blocked by CLF-C02 weak-area taxonomy mismatches. |
| Security: no admin surfaces leaked | PASS with known caveat | `/api/admin/export` and `/api/admin/reset` are unauthenticated, but loopback-only Docker + private Tailnet is the stated security boundary. They are not reachable on public host IPv4. |

## Defects

### T-1 — High — CLF-C02 resource weak-area mappings are wrong for many families

Evidence:

- Source: `src/lib/learningModel.js`, `RESOURCE_DOMAIN_MAP` around lines 176-188.
- Audit artifact: `/home/vion/src/git/vion-learning/dogfood-output/t_7c3cd307-final-audit.json`.
- Audit result: 53 family/task mismatches.
- Examples:
  - `AWS Regions`, `Availability Zones`, `Edge locations`: family `Global infrastructure`; expected CLF-C02 task `3.2`; actual `1.1`.
  - `Amazon S3`, `S3 storage classes`, `EBS`, `EFS`, `FSx`: family `Storage`; expected `3.6`; actual `3.3`.
  - Prior reviewed mapping table still maps `Databases/analytics` to compute (`3.3`) instead of database services (`3.4`), `Networking/CDN` to compute (`3.3`) instead of network services (`3.5`), and `AI/ML basics` to database services (`3.4`) instead of AI/ML/analytics (`3.7`).

Impact:

Weak-area drills, generated cards/questions, and progress mappings can teach learners to associate valid AWS services with unrelated CLF-C02 task statements. That undermines readiness scoring and weak-area remediation despite the corpus text itself being useful and source-linked.

Recommendation:

Fix `RESOURCE_DOMAIN_MAP` using the task statements in `data/sources/clf-c02/source_metadata.json`, then add an invariant test for representative resource families. Remediation card: `t_bb629bf3`.

### Q-1 — Medium — Some generated reinforcement questions use generic meta distractors

Evidence:

- Source: `src/lib/learningModel.js`, `buildQuestionFromCard` around lines 74-84.
- Audit artifact: `/home/vion/src/git/vion-learning/dogfood-output/t_7c3cd307-final-audit.json`.
- Examples include labels such as:
  - `Choose the broadest AWS marketing phrase instead of the service decision hidden in Cloud Concepts.`
  - `Treat a nearby AWS concept as interchangeable with ...`
  - `Ignore the task statement mapping and answer with a definition that does not resolve the scenario clue ...`

Impact:

The questions remain original/safe and the explanations work, but the generic options are lower-fidelity than real exam-prep practice. They may train test-taking meta behavior more than service-concept discrimination.

Recommendation:

Generate distractor labels from adjacent services/concepts/misconceptions while keeping explanations explicit. Remediation card: `t_6a7a9589`.

## Commands run and results

```text
git status --short --branch
# ## main...origin/main [ahead 1]
# ?? dogfood-output/

npm test
# PASS: 29/29 node:test tests

npm run lint
# PASS: lint: required files present

npm run sources:check
# PASS: sources:check ok (18 catalog entries)

npm run build
# PASS: vite build, dist/assets/index-DbHpFYoD.js and CSS emitted

docker ps --filter name=aws-cert-trainer --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
# PASS: aws-cert-trainer vion-learning:kanban Up/healthy, 127.0.0.1:9140->3000/tcp

ss -ltnp | grep ':9140'
# PASS: LISTEN 127.0.0.1:9140 only

curl http://127.0.0.1:9140/health
# PASS: status ok; CLF-C02 card_count=124 question_count=147; AIF-C01 card_count=20 question_count=20

tailscale status --self --peers=false
# PASS: 100.124.15.123 vion-kanban-ec2

tailscale serve status --json
# PASS: :8443 proxies to http://127.0.0.1:9140

curl https://vion-kanban-ec2.tail276347.ts.net:8443/health
# PASS: status ok; CLF-C02 card_count=124 question_count=147; AIF-C01 card_count=20 question_count=20

curl http://172.31.30.76:9140/health
# PASS for non-public exposure: connection failed

BASE_URL=http://127.0.0.1:9140 OUT_DIR=/work/dogfood-output/t_7c3cd307-final-9140 bash dogfood-output/t_99d2a08d/run_docker_retest_tailnet.sh
# PASS: landing, CLF overview, quiz answer/next/results, learn controls, routes, export, AIF separation, mobile overflow

BASE_URL=https://vion-kanban-ec2.tail276347.ts.net:8443 OUT_DIR=/work/dogfood-output/t_7c3cd307-final-tailnet bash dogfood-output/t_99d2a08d/run_docker_retest_tailnet.sh
# PASS: same browser flow against exact Tailnet URL

node qa/final-review-audit-t_7c3cd307.mjs > dogfood-output/t_7c3cd307-final-audit.json
# PASS for most acceptance checks; expected nonzero exit due remaining findings T-1 and Q-1. One naive "dump" string check was a false positive caused by prohibitive safety language.
```

## Artifacts

- Final readiness report: `/home/vion/src/git/vion-learning/dogfood-output/t_7c3cd307-final-readiness-report.md`
- Structured audit JSON: `/home/vion/src/git/vion-learning/dogfood-output/t_7c3cd307-final-audit.json`
- Audit script: `/home/vion/src/git/vion-learning/qa/final-review-audit-t_7c3cd307.mjs`
- Local deployed browser screenshots/results: `/home/vion/src/git/vion-learning/dogfood-output/t_7c3cd307-final-9140/`
- Tailnet browser screenshots/results: `/home/vion/src/git/vion-learning/dogfood-output/t_7c3cd307-final-tailnet/`

## Limitations

- Native `browser_navigate` was not used because prior workers documented missing Chromium dependency `libatk-1.0.so.0`; I used Docker Playwright as the browser witness.
- I verified Tailnet reachability from this host through the Tailscale URL. I did not run a second physical Tailnet-device check in this review pass.
- Source freshness dates reflect checked-in/generated metadata and successful local source schema validation; I did not re-fetch every AWS source during this final review.
- The app intentionally treats Tailnet/loopback as the security boundary; unauthenticated admin reset/export would need authentication before any broader exposure.

## Recommendation

Do not present this as fully exam-ready until T-1 is fixed and retested. After the taxonomy fix, rerun:

```bash
npm test
npm run lint
npm run sources:check
npm run build
BASE_URL=http://127.0.0.1:9140 OUT_DIR=/work/dogfood-output/<new-run>-9140 bash dogfood-output/t_99d2a08d/run_docker_retest_tailnet.sh
BASE_URL=https://vion-kanban-ec2.tail276347.ts.net:8443 OUT_DIR=/work/dogfood-output/<new-run>-tailnet bash dogfood-output/t_99d2a08d/run_docker_retest_tailnet.sh
node qa/final-review-audit-t_7c3cd307.mjs
```
