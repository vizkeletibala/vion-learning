import { ingestSourceCatalog } from '../src/lib/sourceRegistry.js';

const result = await ingestSourceCatalog();
console.log(JSON.stringify({ status: 'ok', generated_at: result.generated_at, summary: result.summary }, null, 2));
