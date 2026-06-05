import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLearningModel, landingPayload, trackPayload, sourcesPayload, resourcesPayload, createQuiz, evaluateAnswer, markCard, exportSnapshot } from '../src/lib/learningModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
let model = loadLearningModel();

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function serveStatic(req, res) {
  const dist = path.join(ROOT, 'dist');
  const url = new URL(req.url, 'http://localhost');
  const requested = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
  const candidate = path.normalize(path.join(dist, requested));
  const filePath = candidate.startsWith(dist) && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(dist, 'index.html');
  if (!fs.existsSync(filePath)) return false;
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

export function createServer({ log = true } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, {
          status: 'ok',
          app: model.app,
          tracks: Object.fromEntries(Object.values(model.tracks).map((t) => [t.id, { card_count: t.cards.length, question_count: t.questions.length, last_verified_date: t.last_verified_date }])),
        });
      }
      if (req.method === 'GET' && url.pathname === '/api/landing') return json(res, 200, landingPayload(model));
      const trackMatch = url.pathname.match(/^\/api\/tracks\/([^/]+)(?:\/(.*))?$/);
      if (trackMatch) {
        const [, trackId, rest = ''] = trackMatch;
        if (req.method === 'GET' && rest === '') return json(res, 200, trackPayload(model, trackId));
        if (req.method === 'GET' && rest === 'sources') {
          const ids = url.searchParams.get('ids')?.split(',').map((value) => value.trim()).filter(Boolean) || [];
          return json(res, 200, sourcesPayload(model, trackId, { service: url.searchParams.get('service') || undefined, concept: url.searchParams.get('concept') || undefined, ids }));
        }
        if (req.method === 'GET' && rest === 'resources') return json(res, 200, resourcesPayload(model, trackId));
        const cardMatch = rest.match(/^cards\/([^/]+)$/);
        if (req.method === 'GET' && cardMatch) {
          const payload = trackPayload(model, trackId);
          const card = payload.cards.find((c) => c.id === cardMatch[1]);
          return card ? json(res, 200, card) : json(res, 404, { error: `Card ${cardMatch[1]} not found for ${trackId}` });
        }
        if (req.method === 'POST' && rest === 'quizzes') {
          const body = await readBody(req);
          return json(res, 200, createQuiz(model, { trackId, mode: body.mode, domainId: body.domainId, count: body.count }));
        }
        if (req.method === 'POST' && rest === 'answers') {
          const body = await readBody(req);
          return json(res, 200, evaluateAnswer(model, { trackId, questionId: body.questionId, selectedOptionId: body.selectedOptionId }));
        }
        if (req.method === 'POST' && rest === 'cards/mark') {
          const body = await readBody(req);
          return json(res, 200, markCard(model, { trackId, cardId: body.cardId, status: body.status }));
        }
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/reset') {
        model = loadLearningModel();
        return json(res, 200, { status: 'reset', tracks: Object.keys(model.tracks) });
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/export') return json(res, 200, exportSnapshot(model));
      if (req.method === 'GET' && serveStatic(req, res)) return;
      return json(res, 404, { error: 'not_found' });
    } catch (error) {
      if (log) console.error(JSON.stringify({ level: 'error', message: error.message, path: url.pathname }));
      return json(res, /Unknown track|does not belong/.test(error.message) ? 404 : 500, { error: error.message });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer();
  server.listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({ level: 'info', message: 'vion-learning listening', port }));
  });
}
