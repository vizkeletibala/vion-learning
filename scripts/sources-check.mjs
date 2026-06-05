import { loadSourceCatalog, validateSourceCatalog, loadAllGeneratedSourceRecords } from '../src/lib/sourceRegistry.js';

const catalog = loadSourceCatalog();
validateSourceCatalog(catalog);
const records = loadAllGeneratedSourceRecords();
const stale = [];
const needsRefresh = [];
const now = Date.now();
for (const trackRows of Object.values(records)) {
  for (const row of trackRows) {
    const checkedAt = row.last_checked_at ? Date.parse(row.last_checked_at) : NaN;
    const maxAgeMs = Number(row.stale_after_days || 45) * 24 * 60 * 60 * 1000;
    if (row.freshness_status === 'needs_refresh') needsRefresh.push(row.id);
    if (Number.isFinite(checkedAt) && now - checkedAt > maxAgeMs) stale.push(row.id);
  }
}
console.log(JSON.stringify({
  status: needsRefresh.length || stale.length ? 'warning' : 'ok',
  catalog_sources: catalog.sources.length,
  generated_tracks: Object.fromEntries(Object.entries(records).map(([trackId, rows]) => [trackId, rows.length])),
  stale,
  needs_refresh: needsRefresh,
  action: needsRefresh.length || stale.length ? 'Run npm run ingest:sources or npm run sources:report, then inspect docs/reports/source-provenance.md.' : 'Source records are present; inspect docs/reports/source-provenance.md for details.'
}, null, 2));
