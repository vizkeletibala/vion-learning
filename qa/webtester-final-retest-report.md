# Vion Learning final WebTester retest — 2026-06-03

Verdict: NO-GO

Scope tested:
- Landing track selection
- CLF-C02 vs AIF-C01 route/content separation
- Study/learn card actions and visible progress state
- Quiz start and answer flows, plus required next/results affordance
- Source links
- Export/reset admin APIs
- Study plan, AWS Console Practice, progress routes
- Keyboard activation of landing track selection
- Mobile landing overflow smoke
- Console/network errors after each browser navigation and significant interaction

Test targets:
- Current workspace server: http://127.0.0.1:9144 (started from /home/vion/src/git/vion-learning with `PORT=9144 npm start`) — primary retest target.
- Existing deployed local container: http://127.0.0.1:9140 — found stale; it serves `assets/index-CXuoAp7K.js` and still lacks the repaired labels/handlers in the current bundle. The current workspace build serves `dist/assets/index-B4pL3O4M.js`.

Automation used:
- Unit/lint/build: `npm test && npm run lint && npm run build`
- Browser retest: Docker Playwright (`mcr.microsoft.com/playwright:v1.56.1-noble`) against http://127.0.0.1:9144
- Browser-tool note: native browser tool still cannot launch on this host because Playwright Chromium is missing `libatk-1.0.so.0`; Docker Playwright was used as the real browser fallback.

Summary:
- 14/14 Node tests pass; lint pass; Vite build pass.
- 29 browser checks passed.
- 1 browser check failed.
- Console/network checks were clean on all completed routes/interactions.

Evidence artifacts:
- Browser JSON result: /home/vion/src/git/vion-learning/qa/retest-2026-06-03-current/retest-results.json
- Screenshots directory: /home/vion/src/git/vion-learning/qa/retest-2026-06-03-current/screenshots
- Retest script: /home/vion/src/git/vion-learning/qa/retest-vion-learning.mjs

## Passing checks

- Health endpoint returns ok and exposes both tracks.
- Landing page exposes both `Continue CLF-C02` and `Continue AIF-C01` actions.
- Keyboard tab + Enter can activate landing track selection into CLF-C02 overview.
- Overview `Start quick 10` now transitions visibly to `/tracks/clf-c02/quiz` on the current workspace server.
- Quiz answer submission returns review feedback, selected explanation, mapping, and next actions.
- Learn card `I know this` and `Review again` save and update visible card status.
- Learn card details expose external source links.
- Sources page renders source links.
- AIF-C01 overview renders AI Practitioner content without CLF-C02 heading bleed.
- `AWS Console Practice` nav label is visible.
- AIF study-plan, console, and progress routes render expected content.
- Admin export returns snapshot JSON.
- Admin reset returns reset status.
- Mobile landing has no horizontal overflow at 390px width.

## Remaining defects

### High / Functional: Quiz flow stops after first answered question; no Next/Finish/Results control

URL: http://127.0.0.1:9144/tracks/clf-c02/quiz

Steps to reproduce:
1. Open http://127.0.0.1:9144/tracks/clf-c02/overview
2. Click `Start quick 10`.
3. Answer the first quiz question.

Expected:
- User can advance through the remaining questions.
- After the final question, user sees a score/results summary.

Actual:
- Review feedback appears for the first question.
- There is no `Next`, `Finish`, `Results`, score, or equivalent control.
- The quiz is stuck on the first question even though the UI advertises `quick quiz · 10 questions`.

Console/network errors:
- None observed for this interaction.

Screenshot:
- /home/vion/src/git/vion-learning/qa/retest-2026-06-03-current/screenshots/04-clf-answer-review.png

Likely owner: coder

Acceptance:
- After each answer, show a clear `Next question` action until the final question.
- On final question, show `Finish`/results with score and review summary.
- Keep answer/loading/disabled/error states.
- No console errors during start, answer, next, finish/results.

## Deployment freshness note

The existing `aws-cert-trainer` container on http://127.0.0.1:9140 appears stale relative to the current workspace fixes:
- `/` on 9140 serves `assets/index-CXuoAp7K.js`.
- That bundle grep showed `Start quick 10` but did not include `I know this`, `Review again`, or `pushState`.
- A browser retest against 9140 timed out after clicking `Start quick 10`, consistent with the old hidden-state bug.

Recommendation: rebuild/redeploy the local container after fixing the remaining quiz next/results gap, then rerun the final browser retest against the served deployment URL (9140 or the intended stable port).
