#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadLearningModel } from '../src/lib/learningModel.js';
import { buildRagChunks, createOpenAiEmbeddingClient, createPgRagWriter, embedRagChunks, evaluateRagRetrieval, ragDbConfig, searchRagChunks } from '../src/lib/ragPrototype.js';

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function usage() {
  console.log('Usage: node scripts/rag.mjs <ingest|embed|search|eval|migrate> [--track clf-c02] [--query text] [--dry-run] [--force-refresh]');
  console.log('  ingest  Build section-aware, citation-carrying local RAG chunks. Writes var/rag/<track>-chunks.json unless --dry-run.');
  console.log('  embed   Plan text-embedding-3-small refreshes by default; --force-refresh refreshes even unchanged hashes; --live writes to pgvector with OPENAI_API_KEY and DB credentials.');
  console.log('  search  Run local cited prototype retrieval over generated chunks; no citation means no answer.');
  console.log('  eval    Run a small authorized synthetic retrieval eval shape over local chunks.');
  console.log('  migrate Print migration paths by default; --apply runs psql against VION_RAG_DATABASE_URL/DATABASE_URL.');
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function chunksPath(trackId) {
  return path.join('var', 'rag', `${trackId}-chunks.json`);
}

function migrationPath(direction = 'up') {
  return path.join('db', 'migrations', `001_vion_rag_pgvector.${direction}.sql`);
}

async function createLiveDbWriter(db) {
  const connectionString = process.env[db.connectionEnv] || process.env.VION_RAG_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('VION_RAG_DATABASE_URL or DATABASE_URL is required for --live RAG embedding writes');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  return { client, writer: createPgRagWriter(client) };
}

function applyMigration(direction) {
  const connectionString = process.env.VION_RAG_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('VION_RAG_DATABASE_URL or DATABASE_URL is required for --apply migrations');
  const filePath = migrationPath(direction);
  const result = spawnSync('psql', [connectionString, '-v', 'ON_ERROR_STOP=1', '-f', filePath], { encoding: 'utf8' });
  if (result.error) throw new Error(`psql migration failed to start: ${result.error.message}. Install the PostgreSQL client or run psql from the rag-db container.`);
  if (result.status !== 0) throw new Error(`psql migration failed (${result.status}): ${result.stderr || result.stdout}`);
  return { filePath, stdout: result.stdout };
}

function readOrBuildChunks(model, trackId, args) {
  const filePath = args.chunks || chunksPath(trackId);
  if (args.chunks) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing staged chunk artifact: ${filePath}`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8')).chunks;
  }
  if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8')).chunks;
  return buildRagChunks(model, { trackId }).chunks;
}

async function main() {
  const [command = 'help', ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (command === 'help' || args.help) {
    usage();
    return;
  }
  const trackId = args.track || 'clf-c02';
  const model = loadLearningModel();
  const db = ragDbConfig();

  if (command === 'ingest') {
    const result = buildRagChunks(model, { trackId });
    const outputPath = args.output || chunksPath(trackId);
    if (!args['dry-run']) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    }
    printJson({ command: 'rag:ingest', track_id: trackId, chunk_count: result.chunk_count, output_path: args['dry-run'] ? null : outputPath, dry_run: Boolean(args['dry-run']), db, policy: result.policy });
    return;
  }

  if (command === 'embed') {
    const chunks = readOrBuildChunks(model, trackId, args);
    if (args.live) {
      let liveDb;
      try {
        liveDb = await createLiveDbWriter(db);
        const result = await embedRagChunks(chunks, {
          mode: 'live',
          dbWriter: liveDb.writer,
          embeddingClient: createOpenAiEmbeddingClient(),
          forceRefresh: Boolean(args['force-refresh']),
        });
        printJson({ command: 'rag:embed', track_id: trackId, db, ...result, items: result.items.slice(0, Number(args.limit || 20)) });
      } finally {
        await liveDb?.client?.end?.();
      }
      return;
    }
    const result = await embedRagChunks(chunks, { mode: 'dry-run', forceRefresh: Boolean(args['force-refresh']) });
    printJson({ command: 'rag:embed', track_id: trackId, db, ...result, items: result.items.slice(0, Number(args.limit || 20)) });
    return;
  }

  if (command === 'migrate') {
    const direction = args.down ? 'down' : 'up';
    if (args.apply) {
      const result = applyMigration(direction);
      printJson({ command: 'rag:migrate', applied: true, direction, db, file_path: result.filePath });
    } else {
      printJson({ command: 'rag:migrate', applied: false, direction, db, up: migrationPath('up'), down: migrationPath('down'), requires_credentials_for_apply: true });
    }
    return;
  }

  if (command === 'search') {
    const chunks = readOrBuildChunks(model, trackId, args);
    const result = searchRagChunks(chunks, { trackId, query: args.query || args._.join(' ') || 'Amazon S3 storage', limit: Number(args.limit || 5) });
    printJson({ command: 'rag:search', db, ...result });
    return;
  }

  if (command === 'eval') {
    const chunks = readOrBuildChunks(model, trackId, args);
    const cases = [
      {
        id: 'clf-c02-s3-durability-storage-classes',
        track_id: 'clf-c02',
        query: 'S3 durability and storage classes for object storage',
        expected_concepts: ['durability', 'storage classes', 'S3'],
        expected_source_ids: [],
        expected_outcome: 'cited_result',
      },
      {
        id: 'clf-c02-iam-least-privilege-roles-users',
        track_id: 'clf-c02',
        query: 'IAM least privilege roles users policies',
        expected_concepts: ['least privilege', 'IAM roles', 'IAM users'],
        expected_source_ids: [],
        expected_outcome: 'cited_result',
      },
      {
        id: 'clf-c02-shared-responsibility-model',
        track_id: 'clf-c02',
        query: 'shared responsibility model customer AWS security in the cloud',
        expected_concepts: ['shared responsibility', 'customer responsibilities', 'AWS responsibilities'],
        expected_source_ids: [],
        expected_outcome: 'cited_result',
      },
      {
        id: 'clf-c02-vpc-basics-network-isolation',
        track_id: 'clf-c02',
        query: 'VPC basics network isolation subnets route tables security groups NACLs',
        expected_concepts: ['network isolation', 'subnets', 'security groups', 'VPC'],
        expected_source_ids: [],
        expected_outcome: 'cited_result',
      },
      {
        id: 'clf-c02-pricing-support-billing-tools',
        track_id: 'clf-c02',
        query: 'pricing support billing tools Cost Explorer Budgets Pricing Calculator',
        expected_concepts: ['Cost Explorer', 'AWS Budgets', 'Pricing Calculator', 'support'],
        expected_source_ids: [],
        expected_outcome: 'cited_result',
      },
      {
        id: 'clf-c02-cloudwatch-vs-cloudtrail',
        track_id: 'clf-c02',
        query: 'CloudWatch metrics logs alarms versus CloudTrail API activity audit',
        expected_concepts: ['CloudWatch', 'CloudTrail', 'metrics', 'API activity'],
        expected_source_ids: [],
        expected_outcome: 'cited_result',
      },
      {
        id: 'clf-c02-well-architected-basics',
        track_id: 'clf-c02',
        query: 'Well-Architected Framework pillars operational excellence security reliability cost optimization sustainability',
        expected_concepts: ['well-architected framework', 'six pillars', 'cost optimization'],
        expected_source_ids: [],
        expected_outcome: 'cited_result',
      },
      {
        id: 'clf-c02-no-citation-refusal',
        track_id: 'clf-c02',
        query: 'quantum banana syllabus proprietary exam dump answer key',
        expected_concepts: [],
        expected_source_ids: [],
        expected_outcome: 'refusal',
        min_score: 999,
      },
    ].filter((testCase) => testCase.track_id === trackId);
    printJson({ command: 'rag:eval', track_id: trackId, db, ...evaluateRagRetrieval(chunks, { cases }) });
    return;
  }

  usage();
  process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
