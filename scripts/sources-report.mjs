import fs from 'node:fs';
import path from 'node:path';
import { SOURCE_REPORT_PATH, buildFreshnessReport, loadAllGeneratedSourceRecords } from '../src/lib/sourceRegistry.js';

const records = loadAllGeneratedSourceRecords();
const generatedAt = new Date().toISOString();
const report = buildFreshnessReport(records, generatedAt);
fs.mkdirSync(path.dirname(SOURCE_REPORT_PATH), { recursive: true });
fs.writeFileSync(SOURCE_REPORT_PATH, report);
console.log(JSON.stringify({ status: 'ok', path: SOURCE_REPORT_PATH, tracks: Object.fromEntries(Object.entries(records).map(([trackId, rows]) => [trackId, rows.length])) }, null, 2));
