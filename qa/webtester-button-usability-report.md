# Vion Learning WebTester QA Report — buttons and usability

Target: http://127.0.0.1:9140
Secondary target: https://vion-kanban-ec2.tail276347.ts.net:8443
Date: 2026-06-03T17:11:22Z
Tester: webtester / VionCloudAgent
Scope: exploratory QA focused on non-working buttons, navigation, track selection, cards, quizzes, progress/readiness, sources, export/admin exposure, and usability defects.

## Executive summary

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 2 |
| Total | 6 |

Overall assessment: the backend and quiz APIs are alive, but the frontend ships several fake or confusing controls; the worst offenders are the Learn-page `Know` / `Review` buttons, which render as clickable buttons with no event handler at all. The buttons are not broken because the machine is haunted. They are broken because the code politely does nothing.

## Environment and evidence limits

Browser automation could not launch Chromium in this worker profile:

```text
Auto-launch failed: Chrome exited early (exit code: 127) without writing DevToolsActivePort
/home/vion/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome: error while loading shared libraries: libatk-1.0.so.0: cannot open shared object file: No such file or directory
```

Because of that missing host library, I could not capture screenshots or live browser console output. I compensated with HTTP/API probing, Node tests, source inspection, route checks, and static button inventory. This is weaker than a real browser pass, but still enough to isolate the major button wiring failures.

## Commands / tools used

- `browser_navigate(url="http://127.0.0.1:9140")` — failed due missing Chromium system dependency `libatk-1.0.so.0`.
- `ss -ltnp | grep ':9140'` — confirmed service listening on `127.0.0.1:9140`.
- `curl http://127.0.0.1:9140/health` — confirmed app health and track counts.
- `curl http://127.0.0.1:9140/api/landing` — confirmed landing payload.
- `node --test tests/*.test.js` — 8/8 tests passed.
- Node HTTP probe over static routes and API POST flows.
- Static source inspection of `src/main.jsx`, `src/styles.css`, `server/index.js`, and `src/lib/learningModel.js`.
- Secondary Tailnet probe: `curl https://vion-kanban-ec2.tail276347.ts.net:8443/` failed DNS resolution from this host.

Key command output:

```text
LISTEN 0 4096 127.0.0.1:9140 0.0.0.0:*

/health:
status=ok
tracks.clf-c02.card_count=23 question_count=23 last_verified_date=2026-06-03
tracks.aif-c01.card_count=20 question_count=20 last_verified_date=2026-06-03

node --test tests/*.test.js:
# pass 8
# fail 0

Static route status:
200 /
200 /tracks/clf-c02/overview
200 /tracks/clf-c02/learn
200 /tracks/clf-c02/quiz
200 /tracks/clf-c02/study-plan
200 /tracks/clf-c02/console
200 /tracks/clf-c02/progress
200 /tracks/clf-c02/sources
200 /tracks/aif-c01/overview
200 /tracks/aif-c01/learn
200 /tracks/aif-c01/quiz
200 /tracks/aif-c01/study-plan
200 /tracks/aif-c01/console
200 /tracks/aif-c01/progress
200 /tracks/aif-c01/sources

API flow clf-c02:
quick quiz status=200 questions=10
answer status=200 correct=true readiness=20
mark card status=200 status=know

API flow aif-c01:
quick quiz status=200 questions=10
answer status=200 correct=true readiness=20
mark card status=200 status=know

Tailnet HTTPS probe:
curl: (6) Could not resolve host: vion-kanban-ec2.tail276347.ts.net
```

## Button / link inventory from `src/main.jsx`

Working or likely working controls:

- Landing: `Export progress` -> `<a href="/api/admin/export">`; API returns 200 JSON.
- Landing track cards: `Continue {track.code}` -> `/tracks/{track_id}/overview`; static routes return 200.
- Landing track cards: `View source report` -> `/tracks/{track_id}/sources`; static routes return 200.
- Track header: `← Track choice` -> `/`; static route returns 200.
- Track tabs: `overview`, `learn`, `quiz`, `study-plan`, `console`, `progress`, `sources` -> static routes return 200.
- Quiz page buttons: `Quick 10`, `Domain 15`, `Full 65 timed`, `Weakness drill`, `Mixed review` -> call `startQuiz(...)`; corresponding API tested successfully.
- Quiz answer option buttons -> call `/api/tracks/{track}/answers`; API tested successfully.

Broken or misleading controls:

- Overview: `Start quick 10` calls `startQuiz('quick')`, but quiz UI only renders when `section === 'quiz'`. On the Overview page the request can succeed while the user sees no quiz or confirmation.
- Learn cards: `Know` and `Review` are raw `<button>` elements with no `onClick`, no form behavior, no disabled state, no tooltip, and no visible feedback. These are dead buttons.
- Backend has `/api/tracks/{trackId}/cards/mark`, and it works, but the Learn-page card buttons never call it.
- Admin reset exists as `POST /api/admin/reset`, but no exposed UI control was found. That may be intentional, but if reset/export/admin flows are expected in QA, reset is undiscoverable.

## Issues

### Issue 1: Learn card `Know` and `Review` buttons do nothing

Severity: High
Category: Functional
URL: `/tracks/clf-c02/learn`, `/tracks/aif-c01/learn`
Source evidence: `src/main.jsx:82`

Description:
Each learning card renders two buttons:

```jsx
<button>Know</button><button>Review</button>
```

Neither button has an `onClick` handler. They are not disabled, not links, not form submit buttons, and not wired to the existing `markCard` API. This exactly matches Andrew's report that buttons are not working.

Steps to reproduce:
1. Open `http://127.0.0.1:9140/tracks/clf-c02/learn`.
2. On any learning card, click `Know`.
3. Click `Review`.

Expected:
- `Know` should POST to `/api/tracks/clf-c02/cards/mark` with `{ cardId, status: 'know' }`.
- `Review` should POST to the same endpoint with `{ cardId, status: 'review' }` or equivalent.
- UI should update the card state, next review date, and progress/readiness feedback.

Actual:
- No source-level event handler exists.
- Existing backend endpoint works, but is unused by these buttons.
- User receives no feedback.

Recommended fix:
- Add local card state in `TrackShell` or per-card component.
- Add `async mark(card, status)` calling `POST /api/tracks/${trackId}/cards/mark`.
- Wire `Know` and `Review` buttons to that function.
- Replace the raw buttons with stateful controls: loading, success, error, current status, next review date.
- Acceptance check: clicking both buttons triggers the expected POST and visible state change without reload.

### Issue 2: Overview `Start quick 10` creates invisible state; no quiz appears

Severity: Medium
Category: UX / Functional
URL: `/tracks/clf-c02/overview`, `/tracks/aif-c01/overview`
Source evidence: `src/main.jsx:75`, `src/main.jsx:83`

Description:
The Overview page has a `Start quick 10` button wired to `startQuiz('quick')`. However, the quiz component only renders inside the Quiz section:

```jsx
{section === 'quiz' && ... {quiz && <Quiz ... />} }
```

So on Overview, the button can successfully fetch a quiz, set React state, and then show nothing. This is a classic UI trap: the code technically runs, the user experiences dead air.

Steps to reproduce:
1. Open `/tracks/clf-c02/overview`.
2. Click `Start quick 10`.

Expected:
- Either navigate to `/tracks/clf-c02/quiz` and display the quick quiz, or render the quiz inline in the Overview panel.
- Show loading/error feedback while the request runs.

Actual:
- Source logic sets `quiz`, but no quiz UI is rendered on Overview.
- User sees no visible result.

Recommended fix:
- Best: make Overview button navigate to `/tracks/${trackId}/quiz?mode=quick` and auto-start quiz on that page.
- Acceptable: render `<Quiz>` under the Daily Action panel when started from overview.
- Add loading/error state to `startQuiz`.
- Acceptance check: from Overview, one click results in visible question/options or visible error.

### Issue 3: `startQuiz` and `answer` have no error handling or loading state

Severity: Medium
Category: UX / Console risk
URL: Quiz and Overview flows
Source evidence: `src/main.jsx:57-65`, `src/main.jsx:83`, `src/main.jsx:94`

Description:
`startQuiz` and `answer` assume every fetch succeeds and every response body is valid JSON. If the API returns a 500, invalid JSON, network failure, or the server restarts mid-request, the UI has no catch path. A rejected promise from a click handler commonly becomes an unhandled promise rejection in the browser console.

Steps to reproduce conceptually:
1. Stop or break API endpoint while the page is open.
2. Click a quiz button or answer option.

Expected:
- Button enters loading state.
- Failure shows a visible error message.
- Console remains clean of unhandled promise rejections.

Actual:
- No `try/catch`, no `res.ok` check, no error state.

Recommended fix:
- Add `quizLoading`, `quizError`, `answerLoading`, `answerError` state.
- Wrap fetches in `try/catch`.
- Check `res.ok` before `res.json()`.
- Disable duplicate-click buttons while request is in flight.
- Acceptance check: forced 500 shows user-facing error and no unhandled rejection.

### Issue 4: SPA fallback returns HTTP 200 for invalid track routes

Severity: Medium
Category: Routing / UX
URL: `/tracks/bogus/overview`
Source evidence: `server/index.js:24-35`, `src/main.jsx:55`

Description:
The static server returns `index.html` with HTTP 200 for unknown frontend routes, including `/tracks/bogus/overview`. The React app may then show `Track BOGUS is unavailable`, but HTTP status remains 200.

Steps to reproduce:
1. Request `http://127.0.0.1:9140/tracks/bogus/overview`.
2. Observe HTTP status.

Expected:
- Invalid track pages should ultimately expose a proper 404 route/status if this app is indexed, monitored, or externally exposed.

Actual:
- HTTP status is 200 because the SPA fallback serves `index.html`.

Recommended fix:
- For local/private trainer this may be acceptable.
- If externally exposed, add server-side route awareness for known track IDs or a client 404 page with monitoring semantics.
- Acceptance check: invalid track routes produce a clear 404 UX; if server-side 404 is required, status is 404.

### Issue 5: Tailnet URL did not resolve from this host

Severity: Low
Category: Environment / Access
URL: `https://vion-kanban-ec2.tail276347.ts.net:8443`

Description:
The secondary user-facing verification URL could not be tested because DNS resolution failed from this worker host.

Evidence:

```text
curl: (6) Could not resolve host: vion-kanban-ec2.tail276347.ts.net
```

Expected:
- Tailnet DNS name resolves on hosts enrolled in the tailnet, or the task provides an alternate reachable URL.

Actual:
- DNS failure blocked external verification.

Recommended fix:
- Verify this worker host is on the expected Tailscale network and has MagicDNS enabled.
- Or provide a reachable private URL/IP for WebTester.

### Issue 6: Admin reset exists but is not exposed or documented in the UI

Severity: Low
Category: UX / Admin discoverability
URL: Global/admin flows
Source evidence: `server/index.js:73-77`, `src/main.jsx:28`

Description:
The UI exposes `Export progress`, but no reset/admin control is visible in the React source. The backend has `POST /api/admin/reset` and `GET /api/admin/export`.

Expected:
- If reset is intentionally admin-only, document that it is intentionally API-only.
- If reset is intended for local trainer users, expose it behind a clearly destructive confirmation.

Actual:
- Export is visible; reset is invisible.

Recommended fix:
- Decide whether reset belongs in UI.
- If exposed, add a confirmation dialog and clear destructive labeling. Do not make this a cute little button. Destructive controls need adult supervision.

## Fix recommendations for coder

Priority order:

1. Wire Learn card `Know` / `Review` buttons to `/api/tracks/{trackId}/cards/mark`.
   - Add `markCard` frontend helper.
   - Pass `card.id` and status.
   - Update visible card status and `Next review` from API response.
   - Add loading/error states.

2. Fix Overview `Start quick 10` behavior.
   - Either navigate to quiz page and auto-start quick mode, or render quiz inline.
   - Do not leave state changes invisible.

3. Add error/loading handling for quiz and answer fetches.
   - Catch request errors.
   - Check `res.ok`.
   - Disable double-click during pending requests.
   - Show visible recovery text.

4. Add a minimal e2e/regression test when browser dependencies are available.
   - Landing -> Continue CLF-C02 -> Learn -> click Know -> visible state changes.
   - Overview -> Start quick 10 -> visible quiz appears or navigation occurs.
   - Quiz -> Quick 10 -> answer option -> review appears.

## Fix recommendations for designer / UX

- Make every clickable control produce immediate feedback: loading, success, disabled, error, or navigation.
- Do not style an inert control like a primary action. Dead buttons are lies with border-radius.
- On Learning cards, show current card state: New / Known / Needs review / Next due.
- On Overview, make `Start quick 10` clearly transition the user into a quiz flow.
- Add focus states beyond browser defaults if visual polish matters; keyboard users need to see where they are.
- Consider renaming `console` tab to `AWS Console Practice` or similar; bare `console` may be confused with developer console.

## Acceptance checks after fixes

Use these checks before declaring the corpse revived:

1. Browser automation launches cleanly in the WebTester profile; no missing Chromium libraries.
2. Landing page has no console errors.
3. For each track:
   - `Continue` opens overview.
   - `View source report` opens sources.
   - All tabs navigate and render expected content.
   - Overview `Start quick 10` shows a quiz or navigates to one.
   - Learn `Know` posts to `cards/mark`, updates status, and changes next review date.
   - Learn `Review` posts to `cards/mark`, updates status, and changes next review date.
   - Quiz mode buttons create visible quizzes.
   - Answer buttons show review feedback and readiness update.
   - Export returns valid JSON.
4. Forced API error on quiz/answer/card mark displays user-facing error and does not create unhandled console exceptions.
5. Tailnet URL resolves and serves the same app when external verification is required.

## Not tested / blockers

- Live browser click testing, screenshots, visual layout review, z-index/overlay diagnosis, keyboard navigation, and browser console capture were blocked by missing Chromium runtime dependency `libatk-1.0.so.0` in the WebTester environment.
- Tailnet external verification blocked by DNS resolution failure.
- No app code was modified, per task instruction.
