#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const targetArg = process.argv[2];

if (!targetArg) {
  console.error('usage: node scripts/style-obsidian-graph.mjs <graph.html>');
  process.exit(2);
}

const targetPath = path.resolve(targetArg);
const html = fs.readFileSync(targetPath, 'utf8');

function humanizeLabel(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferGraphLabel(filePath) {
  const normalized = path.resolve(filePath);
  const parentName = path.basename(path.dirname(normalized));

  if (parentName === 'graphify-out') {
    return path.basename(path.dirname(path.dirname(normalized)));
  }

  if (path.basename(normalized) === 'graph.html') {
    return parentName;
  }

  return path.basename(normalized, path.extname(normalized));
}

const cleanTitle = `${humanizeLabel(inferGraphLabel(targetPath))} · Vault Graph Interface`;

const STYLE_BLOCK = `<style>
  :root {
    color-scheme: dark;
    --bg: #020202;
    --bg-soft: #070707;
    --bg-elevated: rgba(9, 9, 9, 0.94);
    --panel: rgba(13, 13, 13, 0.88);
    --panel-strong: rgba(17, 17, 17, 0.96);
    --module-fill: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.015));
    --module-grid: linear-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
    --line: rgba(255, 255, 255, 0.12);
    --line-strong: rgba(255, 255, 255, 0.24);
    --text: rgba(255, 255, 255, 0.94);
    --muted: rgba(255, 255, 255, 0.58);
    --muted-strong: rgba(255, 255, 255, 0.74);
    --chip: rgba(255, 255, 255, 0.06);
    --shadow: 0 32px 96px rgba(0, 0, 0, 0.52);
    --shadow-soft: 0 18px 42px rgba(0, 0, 0, 0.34);
    --radius-shell: 28px;
    --radius-panel: 22px;
    --radius-chip: 999px;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    height: 100%;
    min-height: 100%;
    background: var(--bg);
  }

  body {
    height: 100vh;
    min-height: 100vh;
    color: var(--text);
    overflow: hidden;
    background:
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.07), transparent 18%),
      radial-gradient(circle at 14% 10%, rgba(255, 255, 255, 0.04), transparent 20%),
      radial-gradient(circle at 50% 120%, rgba(255, 255, 255, 0.035), transparent 28%),
      linear-gradient(180deg, #040404 0%, #020202 100%);
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image: radial-gradient(rgba(255, 255, 255, 0.085) 0.7px, transparent 0.7px);
    background-size: 22px 22px;
    opacity: 0.17;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.16));
    animation: vaultDrift 32s linear infinite;
  }

  @keyframes vaultDrift {
    from { transform: translate3d(0, 0, 0); }
    50% { transform: translate3d(8px, -10px, 0); }
    to { transform: translate3d(0, 0, 0); }
  }

  a { color: inherit; }

  button, input { font: inherit; }

  .vault-shell {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    height: 100vh;
    min-height: 100vh;
    padding: 24px;
    gap: 18px;
    overflow: hidden;
  }

  @supports (height: 100dvh) {
    body,
    .vault-shell {
      height: 100dvh;
      min-height: 100dvh;
    }
  }

  .vault-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 18px 22px;
    border: 1px solid var(--line);
    border-radius: var(--radius-shell);
    background: linear-gradient(180deg, rgba(18, 18, 18, 0.96), rgba(8, 8, 8, 0.9));
    box-shadow: var(--shadow);
    backdrop-filter: blur(18px);
  }

  .vault-brand {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .vault-brand__mark {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    border: 1px solid var(--line-strong);
    display: grid;
    place-items: center;
    font-size: 13px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: white;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  .vault-brand__copy {
    min-width: 0;
  }

  .vault-brand__eyebrow,
  .panel-label,
  .section-label,
  #info-panel h3,
  #legend-wrap h3 {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 11px;
  }

  .vault-brand__title {
    margin-top: 5px;
    font-size: clamp(1.2rem, 2vw, 1.6rem);
    font-weight: 600;
    letter-spacing: -0.03em;
  }

  .vault-brand__summary {
    margin-top: 6px;
    color: var(--muted-strong);
    font-size: 13px;
    max-width: 60ch;
  }

  .vault-status {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }

  .vault-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: var(--radius-chip);
    border: 1px solid var(--line);
    background: var(--chip);
    color: var(--muted-strong);
    white-space: nowrap;
    font-size: 12px;
  }

  .vault-chip strong {
    color: var(--text);
    font-size: 12px;
    letter-spacing: 0.02em;
  }

  .vault-workspace {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 372px;
    gap: 18px;
    overflow: hidden;
    align-items: stretch;
  }

  .graph-frame,
  #sidebar {
    min-height: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-shell);
    background: linear-gradient(180deg, rgba(12, 12, 12, 0.95), rgba(5, 5, 5, 0.92));
    box-shadow: var(--shadow);
    overflow: hidden;
    backdrop-filter: blur(16px);
  }

  .graph-frame {
    position: relative;
    padding: 18px;
  }

  .graph-frame::before {
    content: '';
    position: absolute;
    inset: 18px;
    border-radius: calc(var(--radius-shell) - 8px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    pointer-events: none;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .graph-stage {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    border-radius: calc(var(--radius-shell) - 8px);
    overflow: hidden;
    background:
      radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.045), transparent 18%),
      radial-gradient(circle at 82% 14%, rgba(255, 255, 255, 0.03), transparent 20%),
      linear-gradient(180deg, rgba(10, 10, 10, 0.88), rgba(3, 3, 3, 0.96));
  }

  .graph-stage::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
    background-size: 30px 30px;
    mask-image: radial-gradient(circle at center, black, transparent 88%);
  }

  .graph-stage::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at center, transparent 42%, rgba(0, 0, 0, 0.28) 100%);
  }

  #graph {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  #graph canvas { filter: saturate(0) contrast(1.06) brightness(0.98); }

  #sidebar {
    width: auto;
    display: flex;
    flex-direction: column;
    padding: 16px;
    gap: 12px;
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    background:
      linear-gradient(180deg, rgba(13, 13, 13, 0.96), rgba(6, 6, 6, 0.92)),
      radial-gradient(circle at top right, rgba(255, 255, 255, 0.03), transparent 24%);
  }

  .sidebar-head {
    padding: 22px 22px 16px;
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), var(--shadow-soft);
  }

  .sidebar-title {
    margin-top: 6px;
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .sidebar-copy {
    margin-top: 8px;
    color: var(--muted-strong);
    font-size: 13px;
    line-height: 1.55;
  }

  #search-wrap,
  #info-panel,
  #legend-wrap,
  #stats {
    position: relative;
    padding: 18px 22px;
    border: 1px solid var(--line);
    border-radius: var(--radius-panel);
    background: var(--module-fill);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), var(--shadow-soft);
    overflow: hidden;
  }

  #legend-wrap::before,
  #stats::before,
  #info-panel::before,
  #search-wrap::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background-image: var(--module-grid);
    background-size: 24px 24px;
    opacity: 0.22;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.48), transparent 82%);
  }

  #search-wrap {
    display: grid;
    gap: 10px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018));
  }

  #search,
  #search-results,
  #info-content,
  #legend,
  #legend-controls,
  .stats-grid {
    position: relative;
    z-index: 1;
  }

  #search {
    width: 100%;
    padding: 13px 14px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.025);
    color: var(--text);
    font-size: 13px;
    outline: none;
    transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
  }

  #search::placeholder { color: rgba(255, 255, 255, 0.38); }

  #search:focus {
    border-color: rgba(255, 255, 255, 0.34);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);
  }

  #search-results {
    max-height: 180px;
    overflow-y: auto;
    padding: 6px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.66);
    display: none;
  }

  .search-item,
  .neighbor-link,
  .legend-item {
    transition: background 180ms ease, border-color 180ms ease, opacity 180ms ease, transform 180ms ease;
  }

  .search-item {
    padding: 10px 12px;
    cursor: pointer;
    border-radius: 12px;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .search-item:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(2px);
  }

  #info-panel {
    display: grid;
    gap: 12px;
    min-height: 190px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.012));
  }

  #info-content {
    font-size: 13px;
    color: var(--muted-strong);
    line-height: 1.65;
  }

  #info-content .field { margin-bottom: 8px; }
  #info-content .field b { color: var(--text); }
  #info-content .empty { color: rgba(255, 255, 255, 0.35); font-style: italic; }

  .neighbor-link {
    display: block;
    padding: 8px 10px;
    margin: 4px 0;
    border-radius: 12px;
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 1px solid var(--line);
    border-left-width: 3px;
    background: rgba(255, 255, 255, 0.02);
  }

  .neighbor-link:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.2);
  }

  #neighbors-list { max-height: 210px; overflow-y: auto; margin-top: 8px; }

  #legend-wrap {
    flex: 0 0 auto;
    overflow: visible;
    display: grid;
    align-content: start;
    gap: 12px;
    min-height: auto;
  }

  #legend-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
  }

  #legend-controls label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 12px;
    color: var(--muted-strong);
    user-select: none;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    cursor: pointer;
    border-radius: 14px;
    font-size: 12px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    background: rgba(255, 255, 255, 0.018);
  }

  .legend-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.09);
  }

  .legend-item.dimmed { opacity: 0.32; }

  .legend-dot {
    width: 11px;
    height: 11px;
    border-radius: 999px;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14);
  }

  .legend-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
  }

  .legend-count {
    color: rgba(255, 255, 255, 0.4);
    font-size: 11px;
  }

  .legend-cb, #select-all-cb {
    appearance: none;
    -webkit-appearance: none;
    width: 15px;
    height: 15px;
    border: 1.5px solid rgba(255, 255, 255, 0.22);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.02);
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
  }

  .legend-cb:checked, #select-all-cb:checked {
    background: rgba(255, 255, 255, 0.92);
    border-color: rgba(255, 255, 255, 0.92);
  }

  .legend-cb:checked::after, #select-all-cb:checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid #000;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  #select-all-cb:indeterminate {
    background: rgba(255, 255, 255, 0.92);
    border-color: rgba(255, 255, 255, 0.92);
  }

  #select-all-cb:indeterminate::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 6px;
    width: 7px;
    height: 2px;
    background: #000;
    border: none;
    transform: none;
  }

  #stats {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.6;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.026), rgba(255, 255, 255, 0.01));
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .stats-card {
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.028);
  }

  .stats-card strong {
    display: block;
    color: var(--text);
    font-size: 14px;
  }

  .stats-card span {
    display: block;
    margin-top: 4px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 10px;
  }

  #sidebar ::-webkit-scrollbar,
  body ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  #sidebar ::-webkit-scrollbar-thumb,
  body ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    border: 2px solid rgba(0, 0, 0, 0);
    background-clip: padding-box;
  }

  #sidebar ::-webkit-scrollbar-track,
  body ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
  }

  @media (max-width: 1100px) {
    body { overflow: auto; }
    .vault-shell {
      height: auto;
      min-height: auto;
      overflow: visible;
    }
    .vault-workspace { grid-template-columns: 1fr; }
    .graph-frame { min-height: 62vh; }
    #sidebar {
      height: auto;
      min-height: 50vh;
      overflow: visible;
    }
  }

  @media (max-width: 720px) {
    .vault-shell { padding: 14px; gap: 14px; }
    .vault-topbar,
    .graph-frame,
    #sidebar { border-radius: 22px; }
    .vault-topbar { padding: 16px; align-items: flex-start; flex-direction: column; }
    .vault-status { justify-content: flex-start; }
    .graph-frame { padding: 12px; min-height: 58vh; }
    .graph-frame::before { inset: 12px; }
    #sidebar { padding: 12px; }
    .stats-grid { grid-template-columns: 1fr; }
  }
</style>`;

const BODY_BLOCK = `<body>
<div class="vault-shell">
  <header class="vault-topbar">
    <div class="vault-brand">
      <div class="vault-brand__mark">VL</div>
      <div class="vault-brand__copy">
        <div class="vault-brand__eyebrow">Obsidian / private knowledge graph</div>
        <h1 class="vault-brand__title">Vault Graph Interface</h1>
        <p class="vault-brand__summary">Hermes-aligned monochrome control surface for code, notes, and dependency inspection. Quiet motion. Crisp keylines. Full graph power intact.</p>
      </div>
    </div>
    <div class="vault-status">
      <div class="vault-chip"><strong>Theme</strong> Monochrome</div>
      <div class="vault-chip"><strong>Mode</strong> Local vault</div>
      <div class="vault-chip"><strong>Focus</strong> Search · inspect · isolate</div>
      <div class="vault-chip"><strong>Node kind</strong> solid=file-backed · hollow=graph-only</div>
    </div>
  </header>

  <main class="vault-workspace">
    <section class="graph-frame" aria-label="Knowledge graph canvas">
      <div class="graph-stage">
        <div id="graph"></div>
      </div>
    </section>

    <aside id="sidebar" aria-label="Graph controls and node inspector">
      <div class="sidebar-head">
        <div class="panel-label">Vault console</div>
        <h2 class="sidebar-title">Node Inspector</h2>
        <p class="sidebar-copy">Search for files, functions, or communities. Select a node to inspect provenance and connected neighbors without drowning in the whole graph at once.</p>
      </div>
      <div id="search-wrap">
        <div class="section-label">Search</div>
        <input id="search" type="text" placeholder="Search files, symbols, or communities…" autocomplete="off">
        <div id="search-results"></div>
      </div>
      <div id="info-panel">
        <h3>Selected node</h3>
        <div id="info-content"><span class="empty">Select a node to inspect its provenance, degree, and adjacent links.</span></div>
      </div>
      <div id="legend-wrap">
        <h3>Communities</h3>
        <div id="legend-controls">
          <label><input type="checkbox" id="select-all-cb" checked onchange="toggleAllCommunities(!this.checked)">Show all</label>
        </div>
        <div id="legend"></div>
      </div>
      <div id="stats">
        <div class="stats-grid">
          <div class="stats-card"><strong id="stat-nodes">—</strong><span>Nodes</span></div>
          <div class="stats-card"><strong id="stat-edges">—</strong><span>Edges</span></div>
          <div class="stats-card"><strong id="stat-communities">—</strong><span>Communities</span></div>
        </div>
      </div>
    </aside>
  </main>
</div>
<script>`;

const MONO_SCRIPT = `const MONO_PALETTE = ['#ffffff', '#f3f3f3', '#ebebeb', '#e1e1e1', '#d7d7d7', '#cecece', '#c4c4c4', '#bababa'];

function monoTone(index) {
  return MONO_PALETTE[index % MONO_PALETTE.length];
}

RAW_NODES.forEach((node, index) => {
  const tone = monoTone(node.community ?? index);
  const isFileBacked = Boolean(node.source_file);
  node.graph_node_kind = isFileBacked ? 'file-backed' : 'graph-only';
  node.shape = isFileBacked ? (node.shape || 'dot') : 'circle';
  node.borderWidth = isFileBacked ? Math.max(node.borderWidth || 1, 1.5) : Math.max(node.borderWidth || 1, 3);
  node.title = String(node.label || node.id) + '<br>Node kind: ' + node.graph_node_kind + (node.source_file ? '<br>Source: ' + node.source_file : '<br>No source file in Graphify artifact');
  node.color = {
    background: isFileBacked ? tone : '#050505',
    border: isFileBacked ? tone : '#8a8a8a',
    highlight: { background: '#ffffff', border: '#ffffff' },
    hover: { background: isFileBacked ? '#ffffff' : '#111111', border: '#ffffff' },
  };
  node.font = {
    ...(node.font || {}),
    color: isFileBacked ? '#0a0a0a' : '#f2f2f2',
    strokeWidth: node.size >= 12 ? 0 : 2,
    strokeColor: '#000000',
  };
});

RAW_EDGES.forEach((edge) => {
  edge.color = {
    color: 'rgba(255, 255, 255, 0.18)',
    hover: 'rgba(255, 255, 255, 0.42)',
    highlight: 'rgba(255, 255, 255, 0.62)',
    inherit: false,
    opacity: 1,
  };
  edge.width = Math.max(edge.width || 1, 1.4);
});

LEGEND.forEach((community, index) => {
  community.color = monoTone(index);
});

// HTML-escape helper — prevents XSS when injecting graph data into innerHTML`;

const STATS_SCRIPT = `network.setOptions({ layout: { improvedLayout: false } });
network.fit({ animation: false });
network.once('stabilizationIterationsDone', () => {
  network.setOptions({ physics: { enabled: false } });
  network.fit({ animation: false });
});
setTimeout(() => network.fit({ animation: false }), 400);

document.getElementById('stat-nodes').textContent = RAW_NODES.length.toLocaleString();
document.getElementById('stat-edges').textContent = RAW_EDGES.length.toLocaleString();
document.getElementById('stat-communities').textContent = LEGEND.length.toLocaleString();`;

let next = html;

next = next.replace(/const MONO_PALETTE[\s\S]*?\/\/ HTML-escape helper — prevents XSS when injecting graph data into innerHTML/, '// HTML-escape helper — prevents XSS when injecting graph data into innerHTML');
next = next.replace(/<title>[\s\S]*?<\/title>/i, `<title>${cleanTitle}</title>`);
next = next.replace(/<style>[\s\S]*?<\/style>/, STYLE_BLOCK);
next = next.replace(/<body>[\s\S]*?<script>/, BODY_BLOCK);
next = next.replace(/const LEGEND = [\s\S]*?;\n\n\/\/ HTML-escape helper — prevents XSS when injecting graph data into innerHTML/, (match) => {
  const legendPrefix = match.replace(/\n\n\/\/ HTML-escape helper — prevents XSS when injecting graph data into innerHTML$/, '');
  return `${legendPrefix}\n\n${MONO_SCRIPT}`;
});
next = next.replace(/network\.once\('stabilizationIterationsDone', \(\) => \{\n\s*network\.setOptions\(\{ physics: \{ enabled: false \} \}\);\n\}\);/, STATS_SCRIPT);
next = next.replace(/#6366f1/g, '#d8d8d8');
next = next.replace(/#4f46e5/g, '#f2f2f2');

if (next === html) {
  if (html.includes('class="vault-shell"') && html.includes('const MONO_PALETTE')) {
    console.log(`already styled ${targetPath}`);
    process.exit(0);
  }
  console.error('graph styling patch made no changes; upstream graph.html structure may have shifted');
  process.exit(1);
}

fs.writeFileSync(targetPath, next);
console.log(`styled ${targetPath}`);
