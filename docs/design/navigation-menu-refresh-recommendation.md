# Vion Learning Navigation Menu Refresh Recommendation

Goal: replace the current flat pill-tab track navigation with a shadcn-style `NavigationMenu` that keeps every current destination, makes the hierarchy clearer, and promotes Uploads to a global top-level entry on the main page.

Current state reviewed:
- Main page `/` renders the Vion Learning hero, track cards, source freshness, export progress, and track-entry links.
- Track shell `/tracks/:trackId/:section` currently uses one flat `.tabs` list: Overview, Learn, Topics, Quiz, Study Plan, AWS Console Practice, Progress, Sources, Uploads.
- Topic detail pages live under `/tracks/:trackId/topics/:topicSlug`.
- Uploads currently renders as a track tab, but the task requirement is to move it to the main page as a top-level entry, not nest it under a topic or track topic group.

## Recommended IA

Use one persistent app-level navigation bar above the landing and track shells:

1. Home
   - Destination: `/`
   - Purpose: track choice, source freshness summary, resume cards.

2. Tracks
   - NavigationMenu dropdown with one column per certification track.
   - CLF-C02 links:
     - Overview: `/tracks/clf-c02/overview`
     - Learn: `/tracks/clf-c02/learn`
     - Topics: `/tracks/clf-c02/topics`
     - Quiz: `/tracks/clf-c02/quiz`
     - Study Plan: `/tracks/clf-c02/study-plan`
     - Console Practice: `/tracks/clf-c02/console`
     - Progress: `/tracks/clf-c02/progress`
     - Sources: `/tracks/clf-c02/sources`
   - AIF-C01 links use the same destinations with `/tracks/aif-c01/...`.
   - Rationale: track selection remains explicit and preserves the existing invariant that certification content stays track-scoped after selection.

3. Practice
   - NavigationMenu dropdown for high-frequency study actions.
   - Current track-aware entries when the user is inside a track:
     - Learn
     - Topics
     - Quiz
     - Study Plan
     - Console Practice
   - From the landing page, show the same actions grouped under each track or require track selection first.
   - Rationale: these are the user's daily learning modes, so they should not be buried behind admin/source/reporting items.

4. Progress & Sources
   - NavigationMenu dropdown for evidence and status views.
   - Current track-aware entries:
     - Progress
     - Sources
   - Optional secondary links inside cards/dropdown descriptions:
     - Source report / verification status
     - Readiness history
   - Rationale: Progress and Sources are status/evidence surfaces, not learning modes.

5. Uploads
   - Top-level entry on the main app nav.
   - Recommended destination: `/uploads` if implementation can make the upload workflow track-selecting inside the page; otherwise `/tracks/:trackId/uploads` may remain as a backward-compatible route but should be reached from the global Uploads item after choosing target track in the upload form.
   - Label: `Uploads`
   - Description: `Verify and ingest source documents`
   - Rationale: Uploads is admin/content-intake infrastructure. It should not sit under Topics and should not be perceived as a learner-facing study tab.

6. Export progress
   - Keep the existing `/api/admin/export` link, but render it as a right-aligned utility action rather than as part of the main NavigationMenu hierarchy.
   - Rationale: it is an action/download, not navigation.

## Recommended track-shell placement

Inside a track route, keep the track header but replace the flat `.tabs` pill row with a compact contextual subnav or breadcrumb strip:

- Breadcrumb: `Home / CLF-C02 / Learn`
- Track switcher: visible but explicit, preferably in the Tracks menu or header chip.
- Active section marker: highlight the matching NavigationMenu item and, if needed, a small local section pill group for same-page anchors only.

Track shell primary sections should remain:
- Overview
- Learn
- Topics
- Quiz
- Study Plan
- Console Practice
- Progress
- Sources

Remove Uploads from this visible track tab set. If backward compatibility keeps `/tracks/:trackId/uploads`, treat it as a route reachable from global Uploads, not part of the learner track nav.

## Desktop NavigationMenu structure

Suggested visual structure:

- Left: Vion Learning wordmark / Home.
- Center: `Tracks`, `Practice`, `Progress & Sources`, `Uploads`.
- Right: current track chip, readiness score chip, `Export progress` ghost button.

Dropdown card design:
- Tracks menu: two feature cards, one for CLF-C02 and one for AIF-C01, each with short description, readiness score, and nested section links.
- Practice menu: 2-column grid of daily actions. Use short descriptions:
  - Learn — roadmap, source-backed chunks, review queue.
  - Topics — dedicated focused study pages.
  - Quiz — quick/domain drills.
  - Study Plan — 7/14/30-day plan.
  - Console Practice — guided AWS console labs with cleanup warnings.
- Progress & Sources menu: smaller 2-item grid for Progress and Sources.
- Uploads: top-level direct link, not a dropdown unless implementation later adds upload history, staged manifests, and ingestion logs.

## Mobile responsive behavior

Preserve mobile access by using the shadcn `Sheet`/drawer pattern or an accessible disclosure menu below the 720px breakpoint where the current CSS already changes header layout.

Mobile recommendations:
- Collapse NavigationMenu into a `Menu` button in the header.
- Drawer order should be:
  1. Home
  2. Uploads
  3. Current track quick links, if in a track
  4. CLF-C02 sections
  5. AIF-C01 sections
  6. Export progress
- Use accordion groups for CLF-C02 and AIF-C01 to avoid a long undifferentiated list.
- Keep all links as real anchors so current routing continues to work without a router dependency.
- Preserve active state with `aria-current="page"` and visible styling for the current section.
- Do not hide Uploads behind track accordions; it must appear near the top as a global entry.

## Component and style notes for implementation

Recommended component paths:
- `src/components/AppNavigation.jsx` — app-level nav composition and active-route derivation.
- `src/components/navigation/navItems.js` — shared data model for tracks and sections.
- `src/components/ui/navigation-menu.jsx` — shadcn NavigationMenu primitive if the repo adds shadcn/Radix.
- `src/components/ui/sheet.jsx` or `src/components/ui/mobile-drawer.jsx` — mobile drawer if adopting shadcn Sheet.

Suggested data shape:

```js
export const TRACKS = [
  { id: 'clf-c02', code: 'CLF-C02', name: 'AWS Certified Cloud Practitioner' },
  { id: 'aif-c01', code: 'AIF-C01', name: 'AWS Certified AI Practitioner' },
];

export const TRACK_SECTIONS = [
  { id: 'overview', label: 'Overview', group: 'track' },
  { id: 'learn', label: 'Learn', group: 'practice' },
  { id: 'topics', label: 'Topics', group: 'practice' },
  { id: 'quiz', label: 'Quiz', group: 'practice' },
  { id: 'study-plan', label: 'Study Plan', group: 'practice' },
  { id: 'console', label: 'Console Practice', group: 'practice' },
  { id: 'progress', label: 'Progress', group: 'status' },
  { id: 'sources', label: 'Sources', group: 'status' },
];
```

Style guidance:
- Keep the existing dark aurora/glass visual language: translucent panels, rounded surfaces, blue/purple track accents.
- Prefer new classes such as `.app-nav`, `.app-nav__menu`, `.app-nav__viewport`, `.mobile-nav` in `src/styles.css` until the repo adopts Tailwind utilities broadly.
- If shadcn is introduced, keep generated primitive styles small and map them to existing CSS variables (`--bg-panel`, `--border`, `--text`, `--muted`, `--primary`) rather than introducing a separate theme system.
- The repo currently uses plain JSX and Vite, not TypeScript. If the implementation task requires TypeScript, add it deliberately; otherwise keep component structure sane with `.jsx` files to avoid unnecessary toolchain churn.

## Routing note for Uploads

Best implementation path:
1. Add a global `/uploads` route in `App()`.
2. Render an upload page that asks for target track, defaulting to the current track if navigated from a track route.
3. Keep existing track-scoped API calls by submitting `trackId` from the form.
4. Optionally redirect old `/tracks/:trackId/uploads` to `/uploads?trackId=:trackId` or render the same upload component with the track preselected.

This satisfies the requirement to move Uploads to the main page/top-level nav while preserving the existing upload workflow and track-scoped ingestion behavior.
