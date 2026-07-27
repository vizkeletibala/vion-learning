# Graphify Obsidian Dashboard Visualization Implementation Plan

> **For Hermes:** Use `subagent-driven-development` or equivalent fresh-worker execution for implementation and keep verification independent.

**Goal:** Surface the existing Graphify HTML visualization from the Obsidian dashboard at `https://vion-kanban-ec2.tail276347.ts.net:8444/` while leaving markdown note editing unchanged and keeping `scripts/graphify-refresh.sh` as the sole refresh source of truth.

**Architecture:** The running dashboard already serves the Obsidian vault from `127.0.0.1:9141` and is exposed externally through Tailscale Serve on `8444`. The Graphify refresh pipeline already mirrors the canonical dashboard-facing artifact to `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/graph.html`. The missing piece is a proper GET-only serving path with correct MIME handling plus a visible dashboard affordance that opens or embeds the mirrored graph.

**Tech Stack:** Python `http.server`, vault-safe path resolution, HTML/iframe UI, Tailscale Serve, bash refresh script, Obsidian vault mirror artifacts.

---

## Live findings captured before planning

1. **Dashboard server path**
   - Running process:
     - `python3 /home/vion/.hermes/scripts/obsidian_dashboard.py --vault /home/vion/Documents/Obsidian Vault --port 9141`
   - Listener is local-only:
     - `127.0.0.1:9141`
   - External reachability already exists on tailnet-only `8444`.

2. **Current non-markdown serving behavior**
   - `/note/<path>` renders markdown notes in the dashboard UI.
   - For non-markdown files, `/note/<path>` currently returns raw bytes with `application/octet-stream`.
   - Verified live:
     - `/note/Vion/vion-learning/graph.html` returns `200`, but `Content-Type: application/octet-stream`
   - That is why the graph is not yet a clean dashboard surface.

3. **Current refresh contract already mirrors the right artifact**
   - `scripts/graphify-refresh.sh` copies:
     - repo `graphify-out/graph.html` → vault `Vion/vion-learning/graph.html`
     - repo `graphify-out/graph.json` → vault `Vion/vion-learning/.obsidian/graph.json`
     - repo `graphify-out/GRAPH_REPORT.md` → vault `Vion/vion-learning/Graph Report.md`
   - No manual copy step is needed today.

4. **Important markdown-renderer limitation**
   - `Graph Index.md` contains `[graph.html](graph.html)`.
   - The dashboard markdown renderer does not convert normal markdown links into functional HTML anchors in the way we need for this feature.
   - So the graph should not depend on note-body markdown link rendering as the dashboard integration path.

---

## Scope rules

### In scope
- Inspect and modify the dashboard server code at `/home/vion/.hermes/scripts/obsidian_dashboard.py`.
- Add a GET-only serving route for mirrored non-markdown assets with MIME-aware responses.
- Add a clear dashboard entrypoint for the Graphify visualization.
- Keep the graph source pointed at the mirrored vault artifact written by `scripts/graphify-refresh.sh`.
- Verify that refresh updates what the dashboard serves.

### Out of scope
- Rewriting the note editor.
- Serving `graphify-out/` directly as the dashboard root.
- Adding public hosting outside the current tailnet-only dashboard path.
- Introducing a second Graphify refresh pipeline.

---

## Recommended implementation shape

### Decision
Use a **dedicated GET-only asset route** plus a **dashboard graph entry tile**, and optionally a **dedicated graph page** with an iframe.

### Why
- It preserves the existing `/note/<path>` markdown editing contract.
- It avoids overloading note rendering with a full-screen graph app.
- It lets the dashboard serve `graph.html` with `text/html` instead of `application/octet-stream`.
- It keeps the dashboard pointed at the mirrored vault artifact that the refresh script already updates.

### Preferred UI order
1. Add a visible home-page tile/link for the Graphify view.
2. If same-origin rendering feels clean, add a dedicated graph page using an iframe.
3. If iframe UX is awkward, keep the tile opening the mirrored graph in a new tab.

---

## Exact files likely to change

### Dashboard implementation
- Modify: `/home/vion/.hermes/scripts/obsidian_dashboard.py`

### Repo docs
- Create/maintain: `docs/operations/graphify-obsidian-workflow-rules.md`
- Create/maintain: `docs/plans/2026-07-06-graphify-obsidian-dashboard-visualization-plan.md`

### No code changes expected in refresh pipeline unless drift is found
- Keep as source of truth: `scripts/graphify-refresh.sh`

---

## Implementation tasks

### Task 1: Add a vault-safe static asset route

**Objective:** Serve mirrored non-markdown assets from the vault with correct MIME types while leaving markdown note routes untouched.

**Files:**
- Modify: `/home/vion/.hermes/scripts/obsidian_dashboard.py`

**Steps:**
1. Add a helper for vault-safe file resolution that works for both markdown and non-markdown paths.
2. Add a new GET route such as `/asset/<vault-relative-path>` or `/mirror/<vault-relative-path>`.
3. Use Python MIME detection for known file types.
4. Return:
   - `text/html; charset=utf-8` for `.html`
   - `application/json; charset=utf-8` for `.json` when applicable
   - sensible MIME types for images or other future static artifacts
   - `application/octet-stream` only as a fallback
5. Keep `/note/<path>` behavior unchanged for markdown files.
6. Keep `/raw/<path>` behavior intact unless there is a compelling reason to align it later.

**Definition of done:**
- `GET /asset/Vion/vion-learning/graph.html` returns `200` with `Content-Type: text/html; charset=utf-8`.
- Existing markdown `/note/...` pages still render and edit normally.

---

### Task 2: Add a dashboard-visible graph entrypoint

**Objective:** Make the graph discoverable from the dashboard without altering the markdown note editing flow.

**Files:**
- Modify: `/home/vion/.hermes/scripts/obsidian_dashboard.py`
- Optionally modify: `/home/vion/Documents/Obsidian Vault/Home.md` only if the implementation chooses to expose additional human-facing navigation copy there

**Steps:**
1. Add a prominent dashboard tile, button, or nav affordance labeled clearly, for example:
   - `Graph View`
   - `Knowledge Graph`
2. Point it to one of:
   - `/asset/Vion/vion-learning/graph.html` in a new tab, or
   - a dedicated dashboard route like `/graph/vion-learning`
3. If using a dedicated route, render a page shell with:
   - a short explanation
   - an iframe pointing at `/asset/Vion/vion-learning/graph.html`
   - a fallback “Open in new tab” link
4. Keep the home-page style consistent with the current dashboard surface.

**Definition of done:**
- A user arriving at `/` can discover and open the graph without hunting through raw vault paths.
- Standard note navigation still works normally.

---

### Task 3: Keep refresh wiring automatic

**Objective:** Ensure the dashboard always points at the artifact that `scripts/graphify-refresh.sh` rewrites.

**Files:**
- Verify only: `scripts/graphify-refresh.sh`
- Modify only if drift is discovered: `/home/vion/.hermes/scripts/obsidian_dashboard.py`

**Steps:**
1. Hardcode or centrally define the vault-relative dashboard graph target as:
   - `Vion/vion-learning/graph.html`
2. Do not point the dashboard at repo-local `graphify-out/graph.html`.
3. Do not add any copy or sync step outside `scripts/graphify-refresh.sh`.
4. If needed, add a small comment in the dashboard code that this route intentionally serves the Graphify mirror written by the refresh script.

**Definition of done:**
- Re-running `scripts/graphify-refresh.sh` changes the file the dashboard serves without any manual follow-up.

---

### Task 4: Verify note editing was not broken

**Objective:** Prove the graph feature did not break the existing markdown workflow.

**Files:**
- Verify only: running dashboard behavior

**Steps:**
1. Load an existing markdown note from the dashboard.
2. Enter edit mode.
3. Save a harmless test change if safe in the chosen note, or verify the form/path behavior in a controlled way.
4. Confirm same-origin markdown save still works exactly as before.
5. Confirm non-markdown graph routes remain GET-only.

**Definition of done:**
- Notes still load, preview, enter edit mode, and save normally.
- Graph access did not become a write path.

---

### Task 5: Verify refresh-to-visibility flow end to end

**Objective:** Prove the visible graph is the mirrored artifact updated by the canonical refresh script.

**Files:**
- Verify: `scripts/graphify-refresh.sh`
- Verify: `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/graph.html`
- Verify: dashboard route added in Tasks 1–2

**Steps:**
1. Run:
   - `./scripts/graphify-refresh.sh`
2. Verify the mirrored files exist and are non-empty.
3. Verify the dashboard graph route still resolves successfully.
4. Confirm the served graph corresponds to the refreshed mirror artifact, not stale temp output.
5. Confirm no manual copy step occurred.

**Definition of done:**
- Refresh updates the visible graph through the dashboard path automatically.

---

## Verification commands

Run these after implementation.

### Service/path checks
```bash
ps -fp "$(pgrep -f 'obsidian_dashboard.py --vault /home/vion/Documents/Obsidian Vault --port 9141' | head -n1)" -o pid,cmd
ss -ltnp | grep ':9141\b'
```

### New graph route checks
```bash
python3 - <<'PY'
from urllib.request import urlopen
for path in [
    'http://127.0.0.1:9141/',
    'http://127.0.0.1:9141/asset/Vion/vion-learning/graph.html',
]:
    with urlopen(path, timeout=5) as r:
        print(path, r.status, r.headers.get('Content-Type'))
PY
```

### Markdown note behavior checks
```bash
python3 - <<'PY'
from urllib.request import urlopen
with urlopen('http://127.0.0.1:9141/note/Vion/vion-learning/Graph%20Index.md', timeout=5) as r:
    print(r.status, r.headers.get('Content-Type'))
PY
```

### Refresh flow checks
```bash
./scripts/graphify-refresh.sh

test -s graphify-out/graph.html
test -s graphify-out/graph.json
test -s graphify-out/GRAPH_REPORT.md
test -s "$HOME/Documents/Obsidian Vault/Vion/vion-learning/graph.html"
test -s "$HOME/Documents/Obsidian Vault/Vion/vion-learning/.obsidian/graph.json"
test -s "$HOME/Documents/Obsidian Vault/Vion/vion-learning/Graph Report.md"
```

### Mirror source checks
```bash
cmp -s graphify-out/graph.html "$HOME/Documents/Obsidian Vault/Vion/vion-learning/graph.html"
cmp -s graphify-out/graph.json "$HOME/Documents/Obsidian Vault/Vion/vion-learning/.obsidian/graph.json"
cmp -s graphify-out/GRAPH_REPORT.md "$HOME/Documents/Obsidian Vault/Vion/vion-learning/Graph Report.md"
```

---

## Risks and notes

1. **Same-origin trust boundary**
   - Serving `graph.html` as real HTML from the same dashboard origin means its JavaScript executes on that origin.
   - Keep the implementation narrow and avoid unnecessary write-capable coupling.

2. **Do not mistake `/note/...` raw file fallback for a stable app surface**
   - It works for bytes.
   - It is not the right durable contract for embedding a dashboard visualization.

3. **Do not let temp paths into the integration**
   - The refresh flow writes canonical final filenames.
   - The dashboard should never target `.tmp` or dated snapshots.

4. **No exposure drift**
   - Leave the dashboard bound to localhost.
   - Leave external access on existing tailnet-only `8444`.

---

## Success criteria

Implementation is complete only when all of the following are true:

- Notes still load and edit normally.
- The graph is reachable from the dashboard UI.
- The graph is served from the mirrored vault artifact.
- Running `scripts/graphify-refresh.sh` updates the visible graph automatically.
- No manual copy step is required.
- No public exposure was added.
