# Agent Instructions

## graphify

This repo has a local Graphify knowledge graph in `graphify-out/`. Do not start broad codebase orientation by rereading raw files.

Graph-first order for new Hermes/agent sessions:
1. Read `graphify-out/GRAPH_REPORT.md` for broad architecture/context when it exists.
2. Use `graphify query "<question>"` for focused questions like “where is X wired?”, “what depends on Y?”, or “what is the trigger path?”. Use `graphify explain "<node>"` or `graphify path "<A>" "<B>"` when those fit better.
3. Fall back to raw file reads/searches only when the graph is stale, incomplete, missing the path, or you need exact lines for an edit.

Dirty `graphify-out/` files are expected after refreshes; do not treat them as a reason to skip graphify. After materially changing code, run:

```bash
scripts/graphify-refresh.sh
```

That command rebuilds `graphify-out/` and mirrors the current graph into the repo’s Obsidian folder.
