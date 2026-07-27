# Obsidian dashboard filesystem/editor redesign discovery

Date: 2026-07-09
Task: `t_4fbf79be`

## Executive answer

The filesystem/editor redesign should be a dashboard-only implementation in `/home/vion/.hermes/scripts/obsidian_dashboard.py`, backed by the real vault at `/home/vion/Documents/Obsidian Vault`. Editable note pages are already 1:1 writes to existing markdown-family vault files (`.md`, `.markdown`, `.mdown`), with vault-root path containment enforced server-side. The graph-node real-vs-ghost distinction is cross-repo if it must appear inside the Graphify visualization itself: current `graphify-out/graph.json` and generated `graph.html` contain code graph nodes, not Obsidian wikilink/file-existence metadata, so the vion-learning Graphify generator/styler would need changes for graph-native ghost/missing/virtual classification.

## Current dashboard ownership map

Primary file:

- `/home/vion/.hermes/scripts/obsidian_dashboard.py`

Important constants/types:

- `MD_EXTS` at line 17: editable markdown-family suffixes are `.md`, `.markdown`, `.mdown`.
- `GRAPH_ARTIFACT_REL` at line 24: dashboard graph target is `Vion/vion-learning/graph.html` inside the vault.
- `AppState` at lines 43-76: stores `vault` and markdown `index`, and owns path/note resolution.

Request/rendering functions:

- `build_index(vault)` lines 92-107: recursively indexes only markdown-family files. Keys are vault-relative path, file name, stem, and slugified stem.
- `link_target(name, index)` lines 114-125: resolves wikilinks to `/note/<vault-relative-path>` if an indexed markdown note is found, otherwise `/search?q=<slug>`.
- `render_markdown(md, index)` lines 142-206: small markdown renderer for headings, lists, code blocks, bold/italic, and wikilinks.
- `parse_home_content(md, index)` lines 209-280: parses `Home.md`, especially `## Start here` bullets matching `HOME_LINK_RE`, into `LandingLink` card data.
- `compute_home_stats(state)` lines 283-295: derives homepage note counts from the markdown index.
- `render_graph_page(state)` lines 351-396: renders `/graph` as an iframe wrapper around `/asset/Vion/vion-learning/graph.html` when the mirrored artifact exists.
- `render_homepage(state)` lines 399-467: generates the current home/dashboard stats and card grid. This is the only place where the visible card grid HTML is assembled.
- `render_note_page(note, ...)` lines 474-528: renders note preview and edit form. The form POSTs back to `/note/<encoded vault-relative path>`.
- `note_page_script()` lines 531-574: client-side edit/cancel/save button behavior only; it does not choose paths.
- `home_page_script()` lines 577-737: intro animation/reveal only.
- `Handler.do_GET()` lines 1327-1410: route dispatcher.
- `Handler.do_POST()` lines 1412-1503: note save flow.

Routes:

- `GET /health` lines 1331-1333: JSON health.
- `GET /search?q=...` lines 1335-1361: searches `STATE.index` keys/stems and links results to `/note/...`.
- `GET /graph` lines 1363-1366: dashboard graph wrapper.
- `GET /` and `/index.html` lines 1368-1371: homepage from `render_homepage(STATE)`.
- `GET /asset/<rel>` lines 1373-1380: vault-safe GET-only static asset route using `_send_file()` MIME detection.
- `GET /note/<rel>` lines 1382-1396: markdown notes render through `render_note_page`; non-markdown existing paths return raw bytes as `application/octet-stream`.
- `GET /raw/<rel>` lines 1398-1407: raw bytes/text for resolved notes.
- `POST /note/<rel>` lines 1412-1503: save existing markdown-family notes.

Answer to question 2: yes, the current home/dashboard card grid is generated entirely in `obsidian_dashboard.py`. `render_homepage()` owns the visible card grid (`start_links`, graph tile insertion, `cards`, `.nodes-grid`). Its inputs are `Home.md` parsed by `parse_home_content()`, graph artifact existence through `AppState.resolve_vault_path(GRAPH_ARTIFACT_REL)`, and counts from `compute_home_stats()`.

## Current request/data flow

1. Process startup:
   - `main()` lines 1506-1524 resolves the vault path from `--vault`, `OBSIDIAN_VAULT_PATH`, or `~/Documents/Obsidian Vault`.
   - It builds `STATE = AppState(vault=vault, index=build_index(vault))` at line 1518.
   - The server binds to `127.0.0.1:<port>` at line 1520.

2. Vault files to parsed index:
   - `build_index()` walks the vault with `vault.rglob("*")` and includes only files whose suffix is in `MD_EXTS`.
   - The index maps several lowercased lookup keys to real `Path` objects. It does not build a folder tree today.

3. Home/cards:
   - `GET /` calls `render_homepage(STATE)`.
   - `render_homepage()` resolves `Home.md`, reads it, and passes it to `parse_home_content()`.
   - `parse_home_content()` turns `## Start here` list items of the shape `- [[Target|Label]] — Description` into `LandingLink` records.
   - If `Vion/vion-learning/graph.html` exists, `render_homepage()` prepends a hardcoded `Graph view` card pointing to `/graph`.
   - `render_homepage()` emits the stats row, node-card grid, and safety block. The browser then runs `home_page_script()` only to reveal the already-rendered home content after the intro.

4. Card/search/wikilink to note editor:
   - Cards and wikilinks point to `/note/<rel>` when `link_target()` finds an indexed markdown note.
   - Search results are built from `STATE.index` and also point to `/note/<rel>`.
   - `GET /note/<rel>` calls `STATE.resolve_note(rel)`. If the result exists and has a markdown-family suffix, `render_note_page()` displays preview plus an edit form.

5. Save flow:
   - The note edit form posts `application/x-www-form-urlencoded` to `/note/<encoded-rel>` with `content=<draft>`.
   - `POST /note/<rel>` resolves the target again through `STATE.resolve_note()`.
   - It rejects missing/non-existing targets, non-markdown suffixes, missing/invalid/oversized body, unsupported content type, missing Origin/Referer, and cross-origin host mismatch.
   - It normalizes newlines, rechecks that `note.relative_to(VAULT.resolve())` succeeds, writes through a temp file in the same directory, and atomically replaces the original file with `os.replace()`.
   - It redirects back to `/note/<rel>?saved=1`.

## Recommended normalized tree model

The redesign should add a server-derived normalized tree rather than deriving folders client-side from current search/card data. Recommended shape:

```json
{
  "name": "Obsidian Vault",
  "path": "",
  "kind": "folder",
  "children": [
    {
      "name": "Home.md",
      "path": "Home.md",
      "kind": "file",
      "extension": ".md",
      "editable": true,
      "route": "/note/Home.md",
      "raw_route": "/raw/Home.md",
      "size_bytes": 1234,
      "mtime": "..."
    }
  ]
}
```

Rules:

- `path` is vault-relative POSIX form only; never expose absolute filesystem paths in JSON/UI except the existing private header if intentionally retained.
- `kind` is `folder` or `file`.
- For files, include `extension`, `editable`, `route`, `raw_route` or `asset_route`, `size_bytes`, and `mtime`.
- For folders, include `children`, `file_count`, and optionally `descendant_count`.
- Sort folders before files, then case-insensitive natural-ish name order.
- Skip hidden/system directories by default (`.obsidian`, `.trash`, generated temp files) unless there is an explicit allowlist entry; expose the mirrored graph artifact through the existing Graph tab rather than as a primary editable file.
- Derive editability from suffix plus real-file status, not from route string.
- Build the tree fresh per request or behind a small cache with invalidation; current `STATE.index` is startup-only and is not enough for newly created/renamed files.

Suggested internal Python model:

```python
@dataclass(frozen=True)
class FileNode:
    name: str
    rel: str
    kind: str  # "file"
    extension: str
    editable: bool
    view_href: str
    raw_href: str | None
    asset_href: str | None
    size_bytes: int
    mtime_ns: int

@dataclass(frozen=True)
class FolderNode:
    name: str
    rel: str
    kind: str  # "folder"
    children: list[FolderNode | FileNode]
```

## Editable file backing and extension policy

Current state:

- Editable notes are backed 1:1 by real existing vault files. `POST /note/<rel>` will not create a new file because it requires `STATE.resolve_note(rel)` and `note.exists()`.
- Edit form rendering is only for suffixes in `MD_EXTS`: `.md`, `.markdown`, `.mdown`.
- Non-markdown files can be read through `/asset/<rel>`, `/raw/<rel>`, or `/note/<rel>` raw fallback, but cannot be saved through `POST /note/<rel>`.

Recommended editor exposure for the next card:

- Safe editable extensions: keep exactly `.md`, `.markdown`, `.mdown` for the implementation card.
- Default product behavior should emphasize `.md`; show `.markdown` and `.mdown` only because the current backend already permits them.
- Do not expose `.html`, `.json`, images, PDFs, `.canvas`, or `.obsidian/*` as editable in this redesign. Use read-only asset/raw links where needed.
- If creation/rename/delete are added later, they must be separate explicit routes with the same vault-root containment checks and extension allowlist; do not overload the current save route.

## Server-side path validation and gaps

Already enforced:

- `AppState.resolve_vault_path(rel)` lines 47-56 strips leading/trailing slashes, resolves `(vault / rel)`, and rejects paths whose resolved target is not under `vault.resolve()`. This blocks `..` traversal and symlink escapes for callers that use it.
- `AppState.resolve_note(rel)` lines 58-76 uses `resolve_vault_path()` for direct paths before accepting directories, existing files, suffixless `.md` lookup, or markdown-index fallback.
- `/asset/<rel>` lines 1373-1380 uses `resolve_vault_path()` and requires an existing file.
- `/note/<rel>` and `/raw/<rel>` use `resolve_note()`.
- `POST /note/<rel>` lines 1420-1503 repeats note resolution, suffix allowlist, request size limit (`MAX_SAVE_BYTES`), content-type check, Origin/Referer same-host check, UTF-8 decode, containment recheck, and atomic write.

Gaps/risks to account for in implementation:

- `STATE.index` is built once at process startup. New, renamed, or deleted markdown files will not appear in search/wikilink/home stats until restart unless the redesign adds live refresh/rebuild logic.
- The existing `/note/<rel>` raw fallback for non-markdown files is still present. It is GET-only, but it is a confusing second static-file surface; prefer `/asset/<rel>` for non-markdown and do not build new UI around the fallback.
- `/asset/<rel>` can serve any real file under the vault, including hidden files, if directly requested. The Files tab should use an allowlist/filter for discoverability even if the low-level route remains generic.
- The save route requires Origin or Referer. This is good for browser form submissions, but CLI/manual same-origin tests must include one of those headers.
- There is no CSRF token beyond same-origin verification. That is acceptable for the current private local/tailnet surface if kept narrow, but avoid adding cross-origin scriptable write APIs.
- Save does not lock/merge concurrent edits. Last writer wins. The next implementation should not imply collaborative safety.
- `resolve_note()` permits ambiguous stem/slug lookup through `STATE.index`; for file-tree clicks and saves, prefer canonical vault-relative paths from the tree to avoid ambiguity.

## Graph artifact/generator findings

Inspected files:

- `/home/vion/src/git/vion-learning/scripts/graphify-refresh.sh`
- `/home/vion/src/git/vion-learning/scripts/style-obsidian-graph.mjs`
- `/home/vion/src/git/vion-learning/graphify-out/graph.json`
- `/home/vion/src/git/vion-learning/graphify-out/graph.html`
- `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/graph.html`
- `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/.obsidian/graph.json`

Current refresh/data contract:

- `scripts/graphify-refresh.sh` rebuilds repo-local artifacts in `graphify-out/` and mirrors them to `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/`.
- It copies:
  - `graphify-out/GRAPH_REPORT.md` -> `Graph Report.md`
  - `graphify-out/graph.html` -> `graph.html`
  - `graphify-out/graph.json` -> `.obsidian/graph.json`
- `style-obsidian-graph.mjs` styles the generated HTML in place. It rewrites CSS/body chrome and recolors `RAW_NODES`, `RAW_EDGES`, and `LEGEND`, but it does not add file-existence semantics.

Observed artifact structure:

- `graphify-out/graph.json` top-level keys: `directed`, `multigraph`, `graph`, `nodes`, `links`, `hyperedges`, `built_at_commit`.
- Current counts: 526 nodes, 999 links.
- Node fields include `id`, `label`, `file_type`, `source_file`, `source_location`, `_origin`, `community`, `norm_label`, `community_name`, and sometimes `metadata`.
- Link fields include `source`, `target`, `relation`, `confidence`, `source_file`, `source_location`, `weight`, `confidence_score`.
- `graph.html` embeds `const RAW_NODES`, `const RAW_EDGES`, and `const LEGEND` derived from those graph artifacts.

Graph-node distinction answer:

No, the existing artifacts alone are not enough to classify Obsidian graph nodes as real file-backed vs ghost/missing/virtual in a reliable dashboard-native way.

Reason:

- The current graph is a Graphify code/dependency graph for `vion-learning`, not an Obsidian wikilink graph.
- Nodes describe code symbols/files and community structure. They do not carry vault-relative note paths, Obsidian link targets, or a `exists_in_vault`/`node_kind`/`is_virtual` flag.
- Some Graphify nodes are real source-backed symbols; many are functions/variables rather than note files. Treating all `source_file` values as editable vault files would be wrong.
- The mirror `.obsidian/graph.json` is just the copied Graphify JSON, not Obsidian's internal graph cache.

Recommended classification scope:

- For the Files tab tree and editor: dashboard-only. The dashboard can classify real file-backed items directly by walking the vault filesystem.
- For the Graph tab visualization nodes: cross-repo/generator change. Add metadata during Graphify generation or in `style-obsidian-graph.mjs` from a sidecar map if the graph UI must visually distinguish real file-backed vs ghost/missing/virtual nodes.
- Avoid trying to infer ghost nodes in `obsidian_dashboard.py` from the current `graph.html`; that would be brittle scraping of a generated app.

## Recommended implementation scope for next worker

Touch:

1. `/home/vion/.hermes/scripts/obsidian_dashboard.py`
   - Add normalized file-tree builder/serializer.
   - Add a Files tab/page route, likely `GET /files`.
   - Add tree UI and route links to existing `/note`, `/raw`, and `/asset` surfaces.
   - Keep editor save path on `POST /note/<rel>` unless a very small helper extraction is needed.
   - Keep `/graph` embedding the existing mirrored artifact.

2. `/home/vion/src/git/vion-learning/docs/reports/2026-07-09-obsidian-dashboard-filesystem-redesign-discovery.md`
   - This report is the discovery handoff; update only if implementation uncovers a factual drift.

Optional only if graph-native real/ghost distinction is explicitly required by acceptance criteria:

3. `/home/vion/src/git/vion-learning/scripts/style-obsidian-graph.mjs`
   - Add visual treatment only after the generator provides or a sidecar computes reliable node-kind metadata.

4. `/home/vion/src/git/vion-learning/scripts/graphify-refresh.sh`
   - Only if the graph pipeline must produce/copy a new sidecar metadata artifact. Do not add a second refresh path.

Do not touch for this redesign unless separately scoped:

- `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/graph.html` directly. It is generated/mirrored output and will be overwritten.
- `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/.obsidian/graph.json` directly. It is mirrored output.
- `graphify-out/graph.html` or `graphify-out/graph.json` manually. Regenerate through `scripts/graphify-refresh.sh` if generator/styler changes are made.
- Broad vion-learning app code unrelated to graph refresh/styling.
- Dashboard exposure/binding/Tailscale config.

## Acceptance risks

- Hidden-file exposure: a naive tree could make `.obsidian` or generated internals too prominent. Filter discovery separately from low-level route authorization.
- Ambiguous note lookup: existing stem/slug index is useful for wikilinks/search but file-tree actions should use canonical relative paths.
- Startup-only index: a Files tab based on live filesystem may disagree with search/home stats unless index refresh is added or all views share a fresh snapshot.
- Same-origin graph execution: `graph.html` runs JavaScript on the private dashboard origin through `/asset`. Keep graph integration GET-only and avoid coupling it to write endpoints.
- Concurrent edits: current save is atomic but not conflict-aware.
- Scope creep: creation, rename, delete, drag/drop, and binary uploads should not be included unless explicitly added to the implementation card.

## Concrete next implementation path

1. In `obsidian_dashboard.py`, add helpers:
   - `is_editable_note(path: Path) -> bool`
   - `is_tree_visible(path: Path) -> bool`
   - `build_vault_tree(state: AppState) -> dict`
   - small URL helper for `/note`, `/raw`, `/asset` links.
2. Add `GET /files` route that renders the normalized tree as progressive-enhancement HTML first; keep it useful without complex client JavaScript.
3. Add a top-nav `Files` link next to Home/Graph/Search.
4. For file rows:
   - Markdown-family files link to `/note/<rel>` and show an `Editable` badge.
   - Safe read-only files link to `/asset/<rel>` or `/raw/<rel>` with `Read-only` badge.
   - Hidden/generated internals are omitted by default.
5. Leave `POST /note/<rel>` as the only write route.
6. Add focused verification:
   - `GET /files` returns 200.
   - A known markdown note from the tree opens in `/note/...`.
   - A known graph artifact remains reachable through `/graph` and `/asset/Vion/vion-learning/graph.html`.
   - Existing note save still rejects non-markdown and still requires same-origin headers.

## Final yes/no answers

1. Current request/data flow: vault markdown files are indexed at startup, home parses `Home.md` into cards, cards/search/wikilinks route to `/note`, editor posts back to `/note`, and save atomically replaces the existing markdown file.
2. Home/card grid entirely generated in `obsidian_dashboard.py`: yes. Owned by `render_homepage()`, with `parse_home_content()`, `compute_home_stats()`, `link_target()`, and `GET /` route support.
3. Normalized tree model: server-derived folder/file tree with vault-relative POSIX paths, explicit kind, editability, routes, size/mtime, sorted folders-first, hidden/generated filtering.
4. Editable notes backed 1:1 by real vault files: yes, existing files only. Safe editor extensions: `.md`, `.markdown`, `.mdown`; prefer `.md` in UI.
5. Path validation: enforced in `resolve_vault_path()`, `resolve_note()`, `/asset`, `/note`, `/raw`, and repeated in `POST /note`; gaps are startup-only index, generic asset/raw discoverability, no conflict detection, no CSRF token beyond same-origin checks, and ambiguous slug/stem lookup for non-canonical routes.
6. Graph real-vs-ghost/missing/virtual classification from existing data alone: no. Files-tab classification is dashboard-only, but Graph-tab node distinction is cross-repo/generator/styler work.
7. Exact files for implementation: primarily `/home/vion/.hermes/scripts/obsidian_dashboard.py`; optionally this report for factual drift; only touch `scripts/style-obsidian-graph.mjs` and `scripts/graphify-refresh.sh` if graph-native node classification becomes an explicit requirement; do not manually edit mirrored/generated graph artifacts.
