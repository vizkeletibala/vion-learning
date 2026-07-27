# Obsidian Graph Dashboard Redesign — Handoff and Learning Record

**Date:** 2026-07-03
**Project:** `vion-learning`
**Surface:** Graphify-generated Obsidian dashboard (`graphify-out/graph.html` mirrored to `~/Documents/Obsidian Vault/Vion/vion-learning/graph.html`)
**Final verdict:** Accepted for shipment after fix cycle

---

## Why this file exists

This is the durable reference for the redesign, review, fix cycle, and acceptance of the Obsidian graph dashboard work. It exists so future sessions can recover:

- what changed
- what failed initially
- what was fixed
- how to verify the surface again
- what lessons should survive the session

---

## Durable source of truth

**Implementation source**
- `scripts/style-obsidian-graph.mjs`
- `scripts/graphify-refresh.sh`

**Generated repo artifact**
- `graphify-out/graph.html`

**Mirrored Obsidian artifact**
- `/home/vion/Documents/Obsidian Vault/Vion/vion-learning/graph.html`

---

## Work sequence

### 1. Design / acceptance framing
The redesign was treated as a post-vault dashboard surface only.

Constraints that were kept throughout:
- do not change the landing / hero behavior outside the dashboard surface
- preserve Graphify functionality rather than replacing it
- keep the visual language monochrome, Hermes-like, and minimal
- preserve search, graph interaction, node inspector, legend/filtering, stats, responsiveness, and Obsidian compatibility

### 2. Initial implementation
A redesign pass was applied to the generated dashboard pipeline rather than hand-editing the mirrored vault artifact.

### 3. Initial QA outcome
Most of the redesign passed, but two issues were found:

#### Blocking issue
Desktop layout expanded beyond the viewport and trapped lower sidebar content.

Observed evidence from QA:
- desktop viewport: `1440x900`
- `innerHeight: 900`
- `htmlScrollHeight: 2019`
- `shellRect.height: 2019`
- `sidebarRect.height: 1800`
- body scrolling disabled
- lower sidebar content inaccessible

#### Minor issue
The mirrored vault HTML title exposed the repo artifact path instead of using a clean user-facing title.

Observed bad title:
- `<title>graphify - /home/vion/src/git/vion-learning/graphify-out/graph.html</title>`

### 4. Fix cycle
A focused fix cycle corrected the two actual defects without reopening the whole redesign.

#### Fixes applied in `scripts/style-obsidian-graph.mjs`
- constrained desktop shell to viewport height
- prevented the workspace grid from growing to content height on desktop
- made the sidebar the internal scroll container on desktop
- preserved stacked/tablet/mobile page scrolling below the desktop breakpoint
- normalized title generation from path context into a clean label

### 5. Regeneration
The durable pipeline was rerun through:

```bash
scripts/graphify-refresh.sh
```

This regenerated:
- `graphify-out/graph.html`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`
- mirrored vault files under `~/Documents/Obsidian Vault/Vion/vion-learning/`

### 6. Final QA and review
A second QA pass confirmed the fixes and the reviewer issued final acceptance.

---

## Final accepted state

### Title
Both repo and mirrored artifacts now use:

```html
<title>Vion Learning · Vault Graph Interface</title>
```

### Desktop behavior
The desktop shell is viewport-bounded and the sidebar can scroll internally when content exceeds available height.

### Functional checks that remained good
- graph visible
- stats populated
- search works
- selected-node inspector works
- legend filtering works
- tablet/mobile stacked behavior preserved
- repo artifact and mirrored artifact remained in parity

---

## Verification evidence from the accepted fix cycle

### Desktop viewport evidence (`1440x900`)
- `innerHeight: 900`
- `htmlScrollHeight: 900`
- `bodyScrollHeight: 900`
- `bodyOverflow: hidden`
- `shellHeight: 900`
- `shellOverflow: hidden`
- `sidebarOverflowY: auto`

This confirmed the page no longer grows beyond the viewport on desktop.

### Constrained desktop evidence (`1440x700`)
- `bodyScrollHeight = 700`
- `.vault-shell` bottom = `700`
- sidebar `overflow-y = auto`
- sidebar `clientHeight = 479`
- sidebar `scrollHeight = 558`
- programmatic scroll moved `scrollTop` from `0` to `79`

This confirmed lower sidebar content remains reachable when vertical space is tighter.

### Artifact parity evidence
Both HTML artifacts matched SHA-256:

```text
49df8683821541976d4ad49483a3330cde87262063badb59d76cb33cc879cddd
```

---

## Lessons worth keeping

1. **Edit the durable pipeline, not the mirrored output.**
   If the fix does not survive `scripts/graphify-refresh.sh`, it is not a fix. It is graffiti.

2. **Desktop shells need explicit height discipline.**
   A split-pane UI with `body { overflow: hidden; }` must define where overflow is allowed, or it quietly turns content into a hostage.

3. **Generated titles are part of UX.**
   A path leaking into `<title>` is small, but it makes the whole surface feel like a machine room with the door left open.

4. **Mirror parity must be verified, not assumed.**
   The repo artifact and the Obsidian mirror should be compared directly after regeneration.

5. **QA should test awkward viewport heights, not just pretty desktop sizes.**
   `1440x700` exposed the internal-scroll truth better than `1440x900` alone.

---

## Re-verify / redeploy checklist

From the repo root:

```bash
scripts/graphify-refresh.sh
```

Then verify:

1. `graphify-out/graph.html` exists and is non-empty
2. `~/Documents/Obsidian Vault/Vion/vion-learning/graph.html` exists and is non-empty
3. both titles are `Vion Learning · Vault Graph Interface`
4. desktop shell does not exceed viewport height
5. sidebar content remains reachable
6. search / inspector / legend filtering still work

---

## Relationship to Kanban

The broader Graphify / Obsidian pilot already exists on the `vion-learning` Kanban board through these completed tasks:
- `t_e1e21204` — orchestrate: vion-learning Graphify/Obsidian pilot
- `t_31cb6402` — install graphify and lock cache/vault layout
- `t_930e86c9` — add graphify refresh script and graph-first instructions
- `t_834c2ac3` — define Obsidian graph index and note layout
- `t_7ee036f8` — verify graph-first workflow and token reduction

This redesign/fix-cycle record is the UI-specific handoff that sits alongside that pilot history.

---

## One-line summary

The Obsidian graph dashboard redesign is accepted, the viewport overflow defect is fixed in the durable generator, the title is clean, and future sessions should treat `scripts/style-obsidian-graph.mjs` plus `scripts/graphify-refresh.sh` as the canonical surface-control path.
