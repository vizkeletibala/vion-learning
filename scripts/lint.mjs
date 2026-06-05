import fs from 'node:fs';
import path from 'node:path';

const required = ['package.json', 'src/lib/learningModel.js', 'server/index.js', 'Dockerfile', 'README.md'];
const missing = required.filter((file) => !fs.existsSync(path.resolve(file)));
if (missing.length) {
  console.error(`Missing required files: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('lint: required files present');
