# Graphify + Obsidian Integration Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Reduce repeated token spend in Vion projects by building a reusable Graphify knowledge graph per repo, teaching Hermes to consult the graph before rereading raw files, and exporting the graph into Obsidian so project notes and repo knowledge live in the same connected workspace.

**Architecture:**
Build one generated graph per repo/worktree state, keep it as a local cache artifact, and make it the first stop for new sessions. Use Graphify's existing project install / query flow for Hermes, plus its Obsidian export mode for note-vault integration. The repo keeps the graph outputs out of version control unless a snapshot is intentionally desired; Obsidian becomes the human-readable long-term layer, while Graphify remains the machine query layer.

**Tech Stack:** Graphify (`graphifyy`), Hermes project instructions, Obsidian vault export, Python/uv, shell scripts, Git hooks or scheduled refreshes.

---

## Scope

Target Vion repositories first:
- `vion-learning`
- `hermes-agent`
- any other repo that has a lot of repeated file rereads during agent sessions

The plan should work per-repo, but the conventions should be shared.

---

## Proposed conventions

### Local graph cache
- Generate graph artifacts into `graphify-out/` in each repo, or a similar ignored cache directory.
- Keep these artifacts local to the repo/worktree state.
- Do not commit the generated graph unless you explicitly want a dated snapshot.

### Obsidian mirror
- Export each repo into a dedicated vault subfolder under:
  - `/home/vion/Documents/Obsidian Vault/Vion/<repo-name>/`
- Let Graphify write its own notes plus `.obsidian/graph.json` into that subfolder.
- Keep existing user notes safe; Graphify's manifest-based overwrite protection is part of the design.

### Assistant behavior
- For new sessions, prefer:
  1. `graphify-out/GRAPH_REPORT.md`
  2. `graphify query "<question>"`
  3. raw files only if the graph is stale or incomplete
- The point is not to ban file reads. The point is to stop paying the same reread tax every session.

---

## Task 1: Standardize where graph outputs live

**Objective:** Pick a single cache location and a single Obsidian mirror layout for all Vion repos.

**Files:**
- Create: `docs/plans/2026-07-03-graphify-obsidian-integration.md`
- Optional later: repo-local `.gitignore` entries for `graphify-out/`

**Decisions to lock:**
- Is the graph cache repo-local (`./graphify-out/`) or shared (`~/.cache/graphify/<repo>`)?
- Is the Obsidian mirror per repo or one combined Vion vault folder with subfolders?
- Do we want per-branch snapshots or just the current working tree state?

**Verification:**
- The chosen path exists and is writeable.
- The chosen path is not accidentally overwriting user notes.

---

## Task 2: Install Graphify for Hermes use

**Objective:** Make Graphify available in the Hermes workflow for Vion repos.

**Files / commands:**
- Shell command: `uv tool install graphifyy`
- Shell command: `graphify install --project --platform hermes`

**Expected result:**
- Hermes gets project-scoped instructions to consult the graph first.
- The repo gets a local skill/instruction footprint instead of a one-off tribal ritual.

**Verification:**
- Running `graphify --help` works.
- Running `graphify install --project --platform hermes` writes the project-scoped skill/instruction files.

---

## Task 3: Create a repo-local refresh script

**Objective:** Add a single command that rebuilds the graph and exports Obsidian notes.

**Files:**
- Create: `scripts/graphify-refresh.sh`
- Optional create: `scripts/graphify-refresh.py` if a shell wrapper gets too messy

**Expected behavior:**
- Build the graph for the repo root.
- Write HTML / JSON / report artifacts into `graphify-out/`.
- Export Obsidian notes into the configured vault path.
- Be safe to rerun.

**Example command shape:**
```bash
graphify . --obsidian --obsidian-dir "/home/vion/Documents/Obsidian Vault/Vion/vion-learning"
```

**Verification:**
- The script exits 0 on a small repo sample.
- The output folder contains `graph.json`, `GRAPH_REPORT.md`, and `graph.html`.
- The Obsidian target gets markdown notes plus `.obsidian/graph.json`.

---

## Task 4: Add the project instruction layer that prevents reread loops

**Objective:** Teach future sessions to consult the graph instead of re-reading the same files from scratch.

**Files:**
- Create or update: `AGENTS.md` in each Vion repo that lacks one
- Optional create: `docs/operations/graphify-usage.md`

**Instruction content:**
- Read `graphify-out/GRAPH_REPORT.md` before opening broad swaths of code.
- Use `graphify query` for "where is X wired?" / "what depends on Y?" / "where is the trigger path?"
- Fall back to raw file reads only when the graph is stale or missing the path.

**Verification:**
- A fresh Hermes session on the repo follows the graph-first path.
- The instruction file is short, blunt, and hard to misunderstand.

---

## Task 5: Wire Obsidian as the human-readable knowledge layer

**Objective:** Make project notes discoverable in Obsidian without hand-copying them.

**Files / notes:**
- Export target: `/home/vion/Documents/Obsidian Vault/Vion/<repo-name>/`
- Optional note to create in Obsidian: `Vion/<repo-name>/Graph Index.md`

**Suggested note contents:**
- Link to the repo path
- Link to `graphify-out/graph.html`
- Link to `graphify-out/GRAPH_REPORT.md`
- Link to the latest plan / architecture notes
- Short note on what the graph is for and when to regenerate it

**Verification:**
- Obsidian opens the vault cleanly.
- The exported notes do not overwrite unrelated vault content.
- Wikilinks resolve inside the exported vault.

---

## Task 6: Add refresh triggers

**Objective:** Keep the graph useful by regenerating it when the repo changes materially.

**Options:**
- Git hook (`post-commit` or `post-merge`)
- Manual `scripts/graphify-refresh.sh`
- Scheduled refresh via Hermes cron for long-lived repos

**Recommendation:**
- Start manual + post-commit.
- Add a cron refresh only if stale graphs become a recurring problem.

**Verification:**
- The graph rebuilds after meaningful code changes.
- Rebuilds are fast enough to tolerate in the normal workflow.

---

## Task 7: Measure whether token usage actually drops

**Objective:** Prove the thing is worth the annoyance.

**Measurement plan:**
- Compare a few common new-session questions before and after graph-first usage.
- Track whether the assistant answers from `GRAPH_REPORT.md` / `graphify query` without raw rereads.
- Watch for repeated fallback to file reads; if that happens, the instruction layer is too weak or the graph is stale.

**Success criteria:**
- New sessions can answer repo-structure questions with fewer raw file reads.
- Repeated "where is X" questions stop chewing through context.
- Obsidian exports make project knowledge navigable by humans as well as agents.

---

## Risks / caveats

- Graphify has a first-build cost. It saves tokens on repeated sessions, not by magic.
- The graph must be regenerated when code changes materially, or the assistant will consult a fossil.
- Obsidian export is a mirror, not a live sync daemon. If you want live-ish behavior, add a refresh trigger.
- Generated notes can get noisy if every repo dumps the entire world into one vault folder. Keep the folder structure sane.

---

## Recommended rollout order

1. Pick the cache/vault paths.
2. Install Graphify for Hermes on one repo (`vion-learning` first).
3. Add the refresh script.
4. Add the graph-first repo instructions.
5. Export to Obsidian and verify the vault is usable.
6. Measure token reduction on a handful of real questions.
7. Roll the same pattern into the other Vion repos.

---

## Immediate next step for Vion

Start with `vion-learning` as the pilot repo, because it already has the most repetitive agent traffic.

If the pilot works, copy the same pattern into:
- `hermes-agent`
- any deployment / ops repo that gets revisited constantly

The first version should be boring and local. No grand platform nonsense. Just a graph cache, a vault export, and a rule that tells new sessions to stop rereading the same corpse twice.
