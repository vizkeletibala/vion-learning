# Vion Learning final WebTester retest — GO

Generated: 2026-06-04
Task: t_3e313643

## Verdict

GO for the retested Vion Learning user flows.

The previously blocking quiz defect is fixed: after answering questions, the quiz exposes Next question through questions 1–9, Finish quiz on question 10, and then shows a Quiz results summary with Score, Correctness, Readiness impact, and Progress impact. No console errors or network failures were observed in the completed browser runs.

## Test targets

- Deployed/local service: http://127.0.0.1:9140
- Fresh workspace service: http://127.0.0.1:9145
- Health checks passed on both services.
- Current built asset on both: assets/index-BGGqhgCV.js

Note: browser_navigate on the host still cannot launch Chromium because libatk-1.0.so.0 is missing, so browser dogfood execution used the Playwright Docker image mcr.microsoft.com/playwright:v1.56.1-noble with --network host.

## Evidence artifacts

Primary deployed-service run:
- Result JSON: /home/vion/src/git/vion-learning/qa/retest-2026-06-04-t_3e313643-9140/retest-results.json
- Quiz results verification JSON: /home/vion/src/git/vion-learning/qa/retest-2026-06-04-t_3e313643-9140/quiz-results-verification.json
- Screenshots: /home/vion/src/git/vion-learning/qa/retest-2026-06-04-t_3e313643-9140/screenshots
- Final quiz results screenshot: /home/vion/src/git/vion-learning/qa/retest-2026-06-04-t_3e313643-9140/screenshots/09-clf-quiz-final-results.png

Fresh workspace run:
- Result JSON: /home/vion/src/git/vion-learning/qa/retest-2026-06-04-t_3e313643-rerun/retest-results.json
- Quiz results verification JSON: /home/vion/src/git/vion-learning/qa/retest-2026-06-04-t_3e313643-rerun/quiz-results-verification.json
- Screenshots: /home/vion/src/git/vion-learning/qa/retest-2026-06-04-t_3e313643-rerun/screenshots

## Commands run

```bash
npm test && npm run lint && npm run build
PORT=9145 npm start
curl -fsS http://127.0.0.1:9145/health
curl -fsS http://127.0.0.1:9140/health
curl -fsS http://127.0.0.1:9140/ | grep -o 'assets/index-[^\"]*' | head -1
docker run --network host -v /home/vion/src/git/vion-learning:/work -w /work -e BASE_URL=http://127.0.0.1:9145 -e OUT_DIR=/work/qa/retest-2026-06-04-t_3e313643-rerun mcr.microsoft.com/playwright:v1.56.1-noble node /work/qa/retest-vion-learning.mjs
docker run --network host -v /home/vion/src/git/vion-learning:/work -w /work -e BASE_URL=http://127.0.0.1:9145 -e OUT_DIR=/work/qa/retest-2026-06-04-t_3e313643-rerun mcr.microsoft.com/playwright:v1.56.1-noble node /work/qa/verify-quiz-results.cjs
docker run --network host -v /home/vion/src/git/vion-learning:/work -w /work -e BASE_URL=http://127.0.0.1:9140 -e OUT_DIR=/work/qa/retest-2026-06-04-t_3e313643-9140 mcr.microsoft.com/playwright:v1.56.1-noble node /work/qa/retest-vion-learning.mjs
docker run --network host -v /home/vion/src/git/vion-learning:/work -w /work -e BASE_URL=http://127.0.0.1:9140 -e OUT_DIR=/work/qa/retest-2026-06-04-t_3e313643-9140 mcr.microsoft.com/playwright:v1.56.1-noble node /work/qa/verify-quiz-results.cjs
```

## Automated checks

### Unit/lint/build

- node --test tests/*.test.js: 15/15 pass
- node scripts/lint.mjs: pass
- vite build: pass

### Browser dogfood run on http://127.0.0.1:9140

- 30 checks passed
- 0 failed checks
- 0 issues recorded
- Console/network checks were clean after each navigation/significant interaction covered by the script.

Passed coverage:
- Health endpoint returns ok.
- Landing exposes both track selection actions.
- Keyboard can activate landing track selection.
- CLF-C02 overview Start quick 10 navigates to the visible quiz route.
- Quiz answer displays review feedback and CLF-C02 mapping.
- Quiz exposes next/results affordance after answering.
- Learn card I know this saves visible status.
- Learn card Review again saves visible status.
- Learn-card detail source link has external URL.
- Sources page renders external source links.
- AIF-C01 route renders AI track, not CLF-C02 heading/content.
- AWS Console Practice nav label is visible.
- AIF study-plan, console, and progress routes render expected content.
- Admin export returns snapshot JSON.
- Admin reset returns reset status.
- Mobile landing has no horizontal overflow at 390px width.

### Full quick-quiz next/finish/results verification

Passed on both http://127.0.0.1:9140 and http://127.0.0.1:9145.

Observed sequence:
- Questions 1–9: answer feedback appears and Next question is available.
- Question 10: answer feedback appears and Finish quiz is available.
- After Finish quiz: Quiz results page appears with Score, Correctness, Readiness impact, Progress impact, Retry quiz, and Restart quick 10.
- Console errors: none.
- Network failures: none.

## Issues remaining

None found in the retested scope.

## Caveats

- Host-level browser tools remain blocked by missing Chromium system dependency libatk-1.0.so.0. This is an environment/devops issue for the webtester host, not a Vion Learning app defect. Docker Playwright successfully exercised the real UI.
- The deployed service at 9140 and fresh workspace service at 9145 both serve the current built asset. Their health endpoint content counts differ because they use different runtime data snapshots, but the scoped interaction flows passed on both.
