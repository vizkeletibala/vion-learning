#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  SOURCE_CATALOG_PATH,
  SOURCE_REPORT_PATH,
  TRACK_IDS,
  buildFreshnessReport,
  ingestSourceCatalog,
  loadAllIngestedSourceRecords,
  loadSourceCatalog,
  readIngestedEnvelope,
  summarizeSourceInventory,
  validateIngestedEnvelope,
  validateSourceCatalog,
} from '../src/lib/sourceRegistry.js';

const command = process.argv[2] || 'help';

function printUsage() {
  console.log('Usage: node scripts/source-ingestion.mjs <ingest|check|report>');
  console.log('  ingest  Fetch configured public sources and write data/sources/<track>/ingested_sources.json plus docs/reports/source-provenance.md');
  console.log('  check   Validate local source catalog and generated ingestion artifacts');
  console.log('  report  Rebuild docs/reports/source-provenance.md from local ingestion artifacts');
}

async function main() {
  if (command === 'ingest') {
    const result = await ingestSourceCatalog();
    console.log(`ingest:sources wrote ${SOURCE_REPORT_PATH}`);
    console.log(JSON.stringify(result.summary, null, 2));
    return;
  }

  if (command === 'check') {
    const catalog = loadSourceCatalog(SOURCE_CATALOG_PATH);
    validateSourceCatalog(catalog);
    const missing = [];
    for (const trackId of TRACK_IDS) {
      const envelope = readIngestedEnvelope(trackId);
      if (!envelope.generated_at && envelope.sources.length === 0) {
        missing.push(`data/sources/${trackId}/ingested_sources.json`);
        continue;
      }
      validateIngestedEnvelope(envelope, trackId);
    }
    if (missing.length) {
      throw new Error(`Run npm run ingest:sources before check; missing generated artifacts: ${missing.join(', ')}`);
    }
    console.log(`sources:check ok (${catalog.sources.length} catalog entries)`);
    return;
  }

  if (command === 'report') {
    const recordsByTrack = loadAllIngestedSourceRecords();
    const generatedAt = new Date().toISOString();
    const report = buildFreshnessReport(recordsByTrack, generatedAt);
    fs.mkdirSync(path.dirname(SOURCE_REPORT_PATH), { recursive: true });
    fs.writeFileSync(SOURCE_REPORT_PATH, report);
    console.log(`sources:report wrote ${SOURCE_REPORT_PATH}`);
    console.log(JSON.stringify(summarizeSourceInventory(recordsByTrack), null, 2));
    return;
  }

  printUsage();
  process.exit(command === 'help' ? 0 : 1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
