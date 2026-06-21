pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'TRACK_ID', defaultValue: 'clf-c02', description: 'Track to ingest into the vector database')
    string(name: 'UPLOAD_BATCH_DIR', defaultValue: 'var/uploads/latest', description: 'Batch directory created by the upload verification step')
    booleanParam(name: 'LIVE_EMBEDDINGS', defaultValue: false, description: 'Write embeddings live instead of a dry-run plan')
    booleanParam(name: 'APPLY_DB_WRITE', defaultValue: false, description: 'Allow the pipeline to write into the database')
  }

  environment {
    NODE_ENV = 'ci'
    VION_RAG_API_ENABLED = '1'
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Verify uploaded documents') {
      steps {
        sh '''#!/usr/bin/env bash
set -euo pipefail
node scripts/upload-ingestion.mjs verify --batch-dir "$UPLOAD_BATCH_DIR" --track "$TRACK_ID"
'''
      }
    }

    stage('Stage upload chunks') {
      steps {
        sh '''#!/usr/bin/env bash
set -euo pipefail
node scripts/upload-ingestion.mjs stage --batch-dir "$UPLOAD_BATCH_DIR" --track "$TRACK_ID"
'''
      }
    }

    stage('Plan embeddings') {
      steps {
        sh '''#!/usr/bin/env bash
set -euo pipefail
node scripts/rag.mjs embed --track "$TRACK_ID" --chunks "$UPLOAD_BATCH_DIR/tracks/$TRACK_ID-chunks.json"
'''
      }
    }

    stage('Populate vector DB') {
      when {
        expression { return params.APPLY_DB_WRITE && env.VION_RAG_DATABASE_URL?.trim() }
      }
      steps {
        sh '''#!/usr/bin/env bash
set -euo pipefail
extra_args=()
if [[ "${LIVE_EMBEDDINGS}" == "true" ]]; then
  extra_args+=(--live-embeddings)
fi
node scripts/rag-populate-db.mjs --apply --tracks "$TRACK_ID" --chunks-dir "$UPLOAD_BATCH_DIR/tracks" "${extra_args[@]}"
'''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'var/rag/*.json', allowEmptyArchive: true
    }
  }
}
