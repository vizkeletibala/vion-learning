# Vion Learning WebTester UX Fix Guidance

Source report: `qa/webtester-button-usability-report.md`
Date: 2026-06-03
Role: designer guidance for the small interaction repair pass. This is not a redesign brief.

## UX objective

Make the existing trainer feel honest and predictable: every visible control must either navigate, submit, show loading, show success, show an error, or be visibly disabled with a reason. Do not add decorative complexity while repairing these flows.

## Priority fixes

### 1. Learning card actions must be real controls

Affected routes:
- `/tracks/clf-c02/learn`
- `/tracks/aif-c01/learn`

Current problem: `Know` and `Review` look clickable but do nothing.

Recommended labels and behavior:
- Primary action: `I know this`
  - POST card status `know`.
  - Show immediate pending state: `Saving…`.
  - On success, show a visible card status badge: `Known`.
  - Update `Next review` using the API response.
- Secondary action: `Review again`
  - POST card status `review`.
  - Show immediate pending state: `Saving…`.
  - On success, show badge: `Needs review`.
  - Update `Next review` using the API response.

Microcopy:
- Default helper text: `Choose how well you know this card. Your choice updates the next review date.`
- Success text for known: `Saved as known. Next review: {date}.`
- Success text for review: `Saved for review. Next review: {date}.`
- Error text: `Could not save this card. Try again.`

Usability requirements:
- Disable both card action buttons while that card is saving.
- Do not disable every card on the page while one card saves.
- Show current card state near the action buttons, not only in hidden progress data.
- The state text must include the track code or remain inside a visibly track-scoped page so users cannot confuse CLF-C02 and AIF-C01 progress.

### 2. Overview `Start quick 10` must visibly start a quiz

Affected routes:
- `/tracks/clf-c02/overview`
- `/tracks/aif-c01/overview`

Current problem: click fetches a quiz but leaves the user on Overview with no visible quiz.

Preferred implementation:
- Change the Overview button to a clear link/action: `Start quick 10-question quiz`.
- On click, navigate to `/tracks/{trackId}/quiz?mode=quick` and auto-start the quick quiz there.

Acceptable implementation if query routing is not added yet:
- Render the quiz inline inside the Daily Action panel immediately after the request succeeds.

Loading/error copy:
- Button pending text: `Starting quiz…`
- Error: `Could not start the quick quiz. Try again or open the Quiz tab.`

Acceptance requirement:
- One click from Overview produces either a visible first question/options or visible error. Silent state changes are not acceptable.

### 3. Quiz buttons and answer options need request feedback

Affected routes:
- `/tracks/{trackId}/quiz`

Current problem: quiz and answer fetches assume success and provide no protection against duplicate clicks.

Required states:
- Quiz mode buttons:
  - idle labels unchanged: `Quick 10`, `Domain 15`, `Full 65 timed`, `Weakness drill`, `Mixed review`.
  - pending label can be generic near the controls: `Loading quiz…`.
  - disable mode buttons while a quiz request is pending.
  - show error: `Could not load quiz. Try another mode or refresh.`
- Answer options:
  - present as large answer buttons or cards.
  - disable all answer options while answer submission is pending.
  - show pending text: `Checking answer…`.
  - show error: `Could not submit answer. Try again.`

Review feedback:
- Keep the existing `Correct` / `Review needed` distinction.
- Add an obvious next step after feedback: `Continue with another question` if multiple questions are supported, or `Start another quiz` if only the first question is currently shown.

### 4. Navigation copy should be clearer

Small copy edits recommended:
- Rename tab label `console` to `AWS Console Practice` in the visible UI. The route may remain `/console`.
- Consider title-casing visible tabs: `Overview`, `Learn`, `Quiz`, `Study Plan`, `AWS Console Practice`, `Progress`, `Sources`.
- Keep `← Track choice`; it is clear enough.

### 5. Admin reset should stay non-primary

The QA report found `POST /api/admin/reset` but no UI. That is acceptable for now if reset is intentional API-only.

Guidance:
- Do not add a reset button to the landing hero during this repair pass.
- If reset is exposed later, place it in an admin/settings area with destructive confirmation text: `Reset all local progress? This cannot be undone.`

## Cross-flow acceptance criteria

A clean, usable repair passes when:

1. Every visible button or link has a working action, disabled reason, loading state, or error state.
2. Learn page card actions call the card-mark API and visibly update status plus next review date.
3. Overview quick quiz starts a visible quiz flow or shows a visible error in one click.
4. Quiz mode buttons and answer options are disabled during their own pending request and recover after success or failure.
5. Forced API failure for quiz start, answer submit, and card mark creates user-facing error text without unhandled promise rejection.
6. Visible labels do not imply mixed-track behavior; CLF-C02 and AIF-C01 remain separated after track choice.
7. Keyboard users can tab to every action and see a focus indicator.
8. The final WebTester pass can verify both tracks with the same checklist.

## Hand-off note for implementation

Coder should prioritize the existing app structure and minimal fixes over new architecture. The most important UX correction is removing fake affordances: dead buttons must become working stateful controls or must stop looking clickable.
