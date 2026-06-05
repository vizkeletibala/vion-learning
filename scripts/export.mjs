import fs from 'node:fs';
import path from 'node:path';
import { loadLearningModel, exportSnapshot } from '../src/lib/learningModel.js';

const outDir = path.resolve('backups');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `vion-learning-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(out, JSON.stringify(exportSnapshot(loadLearningModel()), null, 2));
console.log(JSON.stringify({ status: 'exported', path: out }));
