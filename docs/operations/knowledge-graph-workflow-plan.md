# Vion Learning Knowledge Workflow Plan

> **For Hermes:** Use `karpathy-llm-wiki` for durable synthesis and `Understand-Anything` for source exploration and graph/visual generation.

**Goal:** Turn uploaded documents, articles, and YouTube videos into a workflow that produces both graph-based exploration artifacts and a curated, searchable knowledge base for Vion Learning.

**Architecture:**
Use a three-layer model: raw source snapshots and extracted chunks for evidence, Understand-Anything for graph/visual exploration, and karpathy-llm-wiki for the compiled canonical knowledge layer. Keep `docs/` focused on process and policy, keep wiki-style notes focused on durable knowledge, and keep generated visuals as derived artifacts that are refreshable from source.

**Tech Stack:** Markdown, Git, source manifests, RAG embeddings, graph exports, YouTube transcript ingestion, Obsidian-compatible wikilinks.

---

## Operating Principles

1. **One artifact, one job.**
   - Raw sources: immutable evidence.
   - Graphs/visuals: exploration and explanation.
   - Wiki pages: canonical synthesized knowledge.
   - Repo docs: operational workflow and policy.

2. **Every derived artifact must be traceable.**
   - Track `source_id`, `content_hash`, chunk IDs, timestamps/page numbers, and source URLs.
   - Graph edges and wiki claims should point back to evidence.

3. **Promote only the useful stuff.**
   - Not every extracted node deserves a wiki page.
   - Only durable entities, concepts, comparisons, and decisions get canonized.

4. **Design for refreshability.**
   - Graphs and embeddings should be regenerateable when sources drift.
   - Do not rely on generated outputs as the only copy of knowledge.

---

## Skill Roles

### karpathy-llm-wiki
Use it to:
- build linked concept pages
- capture source-backed summaries
- maintain comparisons and decision notes
- keep the compounding knowledge base readable and navigable
- answer conceptual questions from the compiled wiki first

### Understand-Anything
Use it to:
- ingest uploaded docs and YouTube videos
- extract entities, sections, relations, and chapter structure
- produce interactive graphs and visual summaries
- help the designer agent see what matters before curation

### vion-rag-operator
Use it to:
- route queries to raw chunks, wiki pages, or graph artifacts
- keep provenance intact
- refresh stale chunks, embeddings, and graph exports
- promote reusable findings into the wiki layer

### designer agent
Use it to:
- review graph outputs and decide what deserves canonization
- create visual summaries, topic maps, and explorable source views
- turn complicated source structures into human-friendly navigation

---

## Storage Layout

Recommended logical split:

```text
knowledge/
  sources/
    raw/
    normalized/
  chunks/
  embeddings/
  graphs/
  wiki/
  manifests/
  exports/
  docs/
```

Recommended content split:
- `sources/raw/`: original PDFs, transcripts, articles, snapshots
- `sources/normalized/`: cleaned text and structured extraction
- `chunks/`: retrieval-ready sections with offsets/timestamps
- `graphs/`: Understand-Anything outputs and diagrams
- `wiki/`: Karpathy-style interlinked markdown knowledge pages
- `manifests/`: source IDs, hashes, versions, provenance metadata
- `exports/`: published or shareable visuals
- `docs/`: workflow rules, operator guides, and policies

---

## Metadata Convention

Every source bundle should carry:

- `source_id`
- `source_type` (`pdf`, `doc`, `youtube`, `web`, `note`)
- `source_url`
- `title`
- `published_at`
- `ingested_at`
- `content_hash`
- `version`
- `language`
- `page_num` or `timestamp_start` / `timestamp_end`
- `chunk_id`
- `graph_id`
- `wiki_page_ids`
- `embedding_model`
- `embedding_version`

If source content changes, the hash must change, and all derived artifacts should be treated as stale until refreshed.

---

## Query Routing Plan

Route requests by intent:

### 1. Evidence / exact wording
Use raw chunks and provenance first.
- “What did the source say?”
- “Where is that mentioned?”
- “Show me the timestamp/page.”

### 2. Durable explanation / study material
Use the wiki first.
- “Explain this concept.”
- “Compare X and Y.”
- “What do we teach here?”

### 3. Structure / relationships / visuals
Use Understand-Anything outputs first.
- “Show me the graph.”
- “Map the concepts.”
- “Turn this video into a chapter map.”

### 4. Fresh or uncertain topics
Use RAG and then promote the useful synthesis.
- retrieve evidence
- synthesize answer
- decide whether to create or update wiki pages

---

## Phase Plan

### Phase 1: Define canonical homes
- Decide where raw sources live.
- Decide where graph exports live.
- Decide where wiki pages live.
- Decide which docs explain the workflow.

### Phase 2: Pilot one source type
- Pick a small corpus: one PDF pack or one YouTube series.
- Generate a graph with Understand-Anything.
- Curate 5–10 wiki pages from the result.
- Confirm the visual output helps, not distracts.

### Phase 3: Add promotion rules
- Define what becomes a wiki page.
- Define what stays as a graph-only artifact.
- Define how comparisons, entities, and decisions are named.

### Phase 4: Wire operator routing
- Teach vion-rag-operator to query wiki, graph, and evidence in order.
- Add freshness checks and provenance checks.
- Make graph generation a derived step, not a source of truth.

### Phase 5: Maintain and prune
- Detect stale pages and stale graph exports.
- Merge duplicates.
- Rebuild derived outputs when source hashes change.
- Keep docs small and operational.

---

## Rules for the Designer Agent

- Use Understand-Anything to inspect source structure before writing anything.
- Promote only durable ideas into the wiki.
- Prefer visual summaries for onboarding and source exploration.
- Keep one visual index page that links to graphs, topic maps, and important source bundles.
- Do not let autogenerated visuals become a second canonical knowledge store.

---

## Rules for vion-rag-operator

- Prefer wiki for synthesized answers.
- Fall back to source chunks when evidence is needed.
- Use graph artifacts to explain relationships and surface hidden structure.
- Track content hash drift and regenerate affected outputs.
- Expose provenance by default in query results.

---

## Rules for Victor

- Accept uploads, links, and mixed source bundles.
- Verify the source before promotion.
- Preserve provenance, hashes, timestamps, and page/segment references.
- Normalize text into chunks, transcripts, and OCR-backed structure.
- Extract entities, relations, and graph seeds without pretending they are canonical truth.
- Hand curated candidates to the wiki pipeline; do not auto-canonize everything.

---

## Deliverables

1. Source manifest schema
2. Graph export convention
3. Wiki page naming convention
4. Query routing policy
5. Review gate for promoting extracted knowledge into the wiki
6. Visual index page for graphs and diagrams
7. Staleness / drift detection checklist

---

## Success Criteria

The workflow is good if:
- uploaded documents and videos can be explored visually
- key concepts are promoted into a durable linked knowledge base
- queries return evidence with provenance
- graph outputs are useful but not canonical
- stale or duplicate knowledge gets pruned instead of accumulating like sediment

---

## Immediate Next Step

Start with one pilot corpus and build the full loop:
**source → extraction → graph → wiki promotion → operator query path**

That will show whether the workflow compounds knowledge or merely produces prettier clutter.
