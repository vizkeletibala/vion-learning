import fs from 'node:fs';
import path from 'node:path';
import { loadLearningModel, exportSnapshot } from '../src/lib/learningModel.js';

const reset = process.argv.includes('--reset');
const dir = path.resolve('var');
fs.mkdirSync(dir, { recursive: true });
const dbPath = path.join(dir, 'vion-learning-snapshot.json');
if (reset && fs.existsSync(dbPath)) fs.rmSync(dbPath);
const model = loadLearningModel();
fs.writeFileSync(dbPath, JSON.stringify(exportSnapshot(model), null, 2));
console.log(JSON.stringify({ status: reset ? 'reset' : 'seeded', path: dbPath, tracks: Object.keys(model.tracks) }));
