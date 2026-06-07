# WebTester Retest Report — t_99d2a08d

Generated: 2026-06-05T19:24:13Z
Verdict: GO

## Executive summary

Retest passed after the MagicDNS resolver fix. The fixed Vion Learning build is serving from both deployed targets:

- Local: `http://127.0.0.1:9140/`
- Tailnet: `https://vion-kanban-ec2.tail276347.ts.net:8443/`

No blocking defects remain in the requested scope. Quiz progression now works end-to-end on both targets: answer -> detailed feedback -> Next question -> final answer -> Quiz results with Score and Readiness impact. Prior passing flows did not regress.

## Environment and availability

- Docker container: `aws-cert-trainer` running image `vion-learning:kanban`, healthy, mapped `127.0.0.1:9140->3000/tcp`.
- Local health: PASS. `/health` reports CLF-C02 `card_count=124`, `question_count=147`; AIF-C01 `card_count=20`, `question_count=20`.
- Tailnet DNS: PASS. `getent hosts vion-kanban-ec2.tail276347.ts.net` resolves to `100.124.15.123`.
- Tailnet health: PASS. Normal `curl -kfsS https://vion-kanban-ec2.tail276347.ts.net:8443/health` returns the same fixed 124/147 CLF-C02 counts.
- Tailscale Serve: PASS. `https://vion-kanban-ec2.tail276347.ts.net:8443/ -> http://127.0.0.1:9140`.
- Served JS asset: PASS. `/assets/index-DbHpFYoD.js` contains fixed quiz strings:
  - `Why the correct answer works:`
  - `Why your choice landed where it did:`
  - `Next question`
  - `Quiz results`

## Automated test evidence

### Unit/API regression tests

Command: `npm test`

Result: PASS

- Tests: 29
- Passed: 29
- Failed: 0

### Local deployed Playwright retest

Target: `http://127.0.0.1:9140/`

Result: PASS

Evidence:

- JSON: `/home/vion/src/git/vion-learning/dogfood-output/t_99d2a08d/browser-retest-magicdns-9140.json`
- Screenshots: `/home/vion/src/git/vion-learning/dogfood-output/t_99d2a08d/screenshots-magicdns-9140/`
- Checks passed: 12
- Browser console/network entries after filtering: 0

Screenshots captured:

- `01-landing.png`
- `02-clf-overview.png`
- `03-quiz-question-1.png`
- `04-quiz-feedback-q1.png`
- `05-quiz-question-2.png`
- `06-quiz-results.png`
- `07-learn-before.png`
- `08-learn-after-know.png`
- `09-aif-overview.png`
- `10-mobile-quiz.png`

### Exact Tailnet URL Playwright retest

Target: `https://vion-kanban-ec2.tail276347.ts.net:8443/`

Result: PASS

Evidence:

- JSON: `/home/vion/src/git/vion-learning/dogfood-output/t_99d2a08d/browser-retest-magicdns-tailnet.json`
- Screenshots: `/home/vion/src/git/vion-learning/dogfood-output/t_99d2a08d/screenshots-magicdns-tailnet/`
- Checks passed: 12
- Browser console/network entries after filtering: 0

Screenshots captured:

- `01-landing.png`
- `02-clf-overview.png`
- `03-quiz-question-1.png`
- `04-quiz-feedback-q1.png`
- `05-quiz-question-2.png`
- `06-quiz-results.png`
- `07-learn-before.png`
- `08-learn-after-know.png`
- `09-aif-overview.png`
- `10-mobile-quiz.png`

## Scope coverage

Passed on both local deployed and exact Tailnet targets:

1. Landing renders with both track cards.
2. CLF-C02 track opens and shows Overview Start quick 10.
3. Overview Start quick 10 transitions into quiz route visibly.
4. Quiz answer shows detailed feedback:
   - `Why the correct answer works:`
   - `Why your choice landed where it did:`
5. `Next question` advances to question 2.
6. Remaining quiz answers progress to `Finish quiz`.
7. Final results page renders `Quiz results`, `Score:`, and `Readiness impact:`.
8. Learn card `I know this` and `Review again` controls update visible card status/review state.
9. Source route renders `Source verification and refresh`.
10. Study plan route renders `30 day plan`.
11. Console practice route renders `Cost warning:`.
12. Progress route renders `Progress history`.
13. Export endpoint returns a progress snapshot containing both `clf-c02` and `aif-c01`.
14. AIF-C01 opens separately from CLF-C02.
15. Mobile quiz viewport has no horizontal overflow.
16. Console/network cleanliness: no filtered browser console, page error, or request failure entries.

## Issues found

None in the requested retest scope.

## Tooling note

Native browser tool Chromium still cannot launch on this worker because the host is missing `libatk-1.0.so.0`:

`Chrome exited early ... error while loading shared libraries: libatk-1.0.so.0: cannot open shared object file`

I used the project’s Docker Playwright retest as the browser witness. It exercised the real deployed pages and captured screenshots/console/network evidence from Chromium inside `mcr.microsoft.com/playwright:v1.56.1-noble`.
