# Graphify ↔ Obsidian Dashboard Workflow Rules

## Goal

Make the Graphify visualization available from the private Obsidian dashboard without changing the markdown note editing flow, without introducing manual copy steps, and without letting stale temp output masquerade as source of truth.

## Canonical source-of-truth rules

1. **`scripts/graphify-refresh.sh` is the only refresh entrypoint.**
   - Do not manually copy `graph.html`, `graph.json`, or `GRAPH_REPORT.md` into the vault.
   - Do not add a second refresh script for dashboard-specific copies.

2. **The dashboard must serve the vault mirror artifact, not repo-local temp output.**
   - Dashboard-facing graph HTML source:
     - `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/graph.html`
   - Dashboard-facing graph JSON source:
     - `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/.obsidian/graph.json`
   - Dashboard-facing graph report source:
     - `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/Graph Report.md`
   - Repo-local `graphify-out/*` remains the build output, not the dashboard URL target.

3. **Use canonical filenames and fixed paths.**
   - The dashboard must point to stable filenames written by the refresh script.
   - Do not glob for the latest file.
   - Do not infer state from dated snapshot folders.
   - Do not route the dashboard to `*.tmp` files.

4. **The mirror is rewriteable and refreshable.**
   - `scripts/graphify-refresh.sh` may overwrite:
     - `Graph Index.md`
     - `Graph Report.md`
     - `graph.html`
     - `.obsidian/graph.json`
   - Anything the dashboard exposes for Graphify must tolerate those files being refreshed in place.

## Dashboard serving rules

5. **Do not disturb markdown note editing.**
   - Markdown editing stays on the existing `/note/<path>` flow.
   - Same-origin note save behavior must remain unchanged for `.md` files.
   - Non-markdown graph serving should use a separate GET-only route or equivalent dedicated surface.

6. **Do not rely on the current non-markdown `/note/...` behavior for the graph UI.**
   - Current dashboard behavior serves non-markdown files as `application/octet-stream`.
   - That is sufficient for downloading bytes, not a durable contract for embedding or rendering `graph.html` as a dashboard view.

7. **Prefer a dedicated static/mirror route for Graphify artifacts.**
   - Recommended pattern:
     - `/asset/<vault-relative-path>` or `/mirror/<vault-relative-path>`
   - Requirements:
     - vault-safe path resolution only
     - GET-only
     - MIME detection via file type
     - `text/html; charset=utf-8` for `graph.html`
     - appropriate JSON/image MIME types for sibling assets if needed
     - fallback to `application/octet-stream`

8. **Dashboard integration order:**
   1. Add a prominent dashboard link/tile to the mirrored graph HTML.
   2. If same-origin rendering feels clean, add a dedicated graph page or panel that wraps the mirrored HTML.
   3. Do not bury the graph behind a markdown link that the dashboard renderer does not actually turn into a usable dashboard affordance.

9. **If embedding is used, keep the graph in a dedicated surface.**
   - The Graphify HTML is a full-page visualization, not a tiny note widget.
   - Prefer one of:
     - a dedicated dashboard page with an iframe
     - a clear “Open graph” tile that launches the mirrored HTML in a new tab
   - Avoid crowding the normal note editor/preview surface.

## Refresh contract

10. **The refresh script already wires the mirror automatically.**
    - `scripts/graphify-refresh.sh` copies the current repo output into the Obsidian vault mirror.
    - No manual copy step is allowed after refresh.
    - The dashboard should only need a stable path to the mirrored artifact.

11. **A successful refresh means the mirror updated, not just that the command exited 0.**
    - After running the script, verify:
      - `graphify-out/graph.html` exists and is non-empty
      - `graphify-out/graph.json` exists and is non-empty
      - `graphify-out/GRAPH_REPORT.md` exists and is non-empty
      - vault mirror `graph.html` exists and is non-empty
      - vault mirror `.obsidian/graph.json` exists and is non-empty
      - vault mirror `Graph Report.md` exists and is non-empty

12. **The graph index note is informational, not the serving contract.**
    - `Graph Index.md` is useful for humans.
    - The dashboard route to the graph must not depend on markdown link rendering inside that note.
    - If `Graph Index.md` mentions the graph path, treat that as documentation, not the runtime integration path.

## Security and exposure rules

13. **No new public exposure.**
    - The dashboard remains bound to `127.0.0.1:9141`.
    - External access remains through the existing Tailscale Serve mapping on `8444`.
    - Do not rebind the dashboard to `0.0.0.0`.
    - Do not publish `graph.html` through a second public file server.

14. **One private origin is enough.**
    - The graph should be reachable from the same private dashboard domain/path family.
    - Do not create parallel temp URLs, ad hoc localhost ports, or public static hosting for convenience.

15. **Be honest about the trust boundary.**
    - If the mirrored `graph.html` is served same-origin and executed as HTML, its JavaScript runs on the same dashboard origin.
    - Keep that in mind before expanding embedded behavior.
    - Prefer the smallest safe UI surface that satisfies navigation and visibility needs.

## Verification checklist

After implementation, verify all of the following:

- Notes still load normally from the dashboard.
- Markdown notes still enter edit mode and save normally.
- The graph is reachable from the dashboard UI.
- The graph route resolves to the mirrored vault artifact, not `graphify-out/*` directly.
- Running `scripts/graphify-refresh.sh` updates the graph visible through the dashboard.
- No manual copy step is required.
- No new public exposure has been added.

## Non-goals

- Replacing the existing markdown note editing UX.
- Making `graphify-out/` itself a served dashboard root.
- Introducing a second graph refresh path.
- Publishing the graph outside the existing tailnet-only dashboard surface.
