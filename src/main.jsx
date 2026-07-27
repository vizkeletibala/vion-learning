import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppNavigation } from './components/AppNavigation.jsx';
import { TRACKS, UPLOAD_TRACKS, getTrack, getTrackSections } from './components/navigation/navItems.js';
import { AuroraBackground } from './components/ui/aurora-background.jsx';
import { WavyBackground } from './components/ui/wavy-background.jsx';
import { germanB2UploadGuidance } from './lib/germanB2UploadGuidance.js';
import './styles.css';

const API = '';
const TAB_LABELS = {
  overview: 'overview',
  learn: 'learn',
  topics: 'topics',
  quiz: 'quiz',
  'study-plan': 'study-plan',
  console: 'AWS Console Practice',
  progress: 'progress',
  sources: 'sources',
  uploads: 'uploads',
};
const GERMAN_B2_TRACK_ID = 'german-b2-exam';
const GERMAN_B2_LESSON_TABS = ['vocab', 'grammar', 'reading', 'writing'];
const GERMAN_B2_TAB_LABELS = {
  vocab: 'Vocabulary',
  grammar: 'Grammar',
  reading: 'Reading',
  writing: 'Writing',
};

function useJson(url) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let alive = true;
    fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Request failed (${r.status})`);
      return r.json();
    }).then((data) => alive && setState({ loading: false, data, error: null })).catch((error) => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [url]);
  return state;
}

function Landing() {
  const { loading, data, error } = useJson(`${API}/api/landing`);
  if (loading) return <main className="page"><p>Loading Vion Learning…</p></main>;
  if (error) return <main className="page"><p>Unable to load landing data.</p></main>;
  return <main className="page">
    <header className="hero cinematic-surface">
      <div className="hero-copy">
        <p className="eyebrow">Internal / local trainer</p>
        <h1>Vion Learning</h1>
        <p className="hero-summary">{data.source_freshness_summary}</p>
      </div>
      <div className="hero-meta">
        <div className="score score--hero"><span>Local</span><small>private-first</small></div>
      </div>
    </header>
    <section className="track-grid">
      {data.tracks.map((track) => <article key={track.track_id} className={`track-card ${track.track_id}`}>
        <p className="eyebrow">{track.code}</p>
        <h2>{track.name}</h2>
        <div className="score"><span>{track.readiness_score}%</span><small>readiness</small></div>
        <dl>
          <dt>Next task</dt><dd>{track.next_task}</dd>
          <dt>Streak</dt><dd>{track.streak_days} days</dd>
          <dt>Milestone</dt><dd>{track.current_milestone}</dd>
          <dt>Weak domains</dt><dd>{track.weak_domains_count}</dd>
          <dt>Last verified</dt><dd>{track.last_verified_date}</dd>
        </dl>
        <div className="actions"><a className="button" href={`/tracks/${track.track_id}/overview`}>Continue {track.code}</a><a href={`/tracks/${track.track_id}/sources`}>View source report</a></div>
      </article>)}
    </section>
    <footer>Local/private trainer · original practice only · Dockerized app</footer>
  </main>;
}


const UPLOAD_PIPELINE_STEPS = {
  verify: [
    { progress: 18, label: 'Uploading document…' },
    { progress: 52, label: 'Verifying manifest…' },
    { progress: 84, label: 'Storing verification summary…' },
  ],
  ingest: [
    { progress: 18, label: 'Reading batch manifest…' },
    { progress: 46, label: 'Staging chunks…' },
    { progress: 82, label: 'Writing sources and chunks…' },
  ],
  live: [
    { progress: 18, label: 'Reading batch manifest…' },
    { progress: 42, label: 'Staging chunks…' },
    { progress: 68, label: 'Writing sources and chunks…' },
    { progress: 90, label: 'Generating live embeddings…' },
  ],
};

function uploadPipelineSteps(state) {
  if (state.action === 'verify') return UPLOAD_PIPELINE_STEPS.verify;
  return state.liveEmbeddings ? UPLOAD_PIPELINE_STEPS.live : UPLOAD_PIPELINE_STEPS.ingest;
}

function summarizeUploadPipeline(result, { action, liveEmbeddings, batchId, trackId }) {
  if (action === 'verify') {
    const fileCount = result?.manifest?.verification?.file_count ?? 0;
    const warningCount = result?.manifest?.verification?.warnings?.length ?? 0;
    return {
      title: 'Verification complete.',
      detail: `${fileCount} file(s) verified for ${trackId}.`,
      metrics: [
        ['Batch', batchId],
        ['Files', fileCount],
        ['Warnings', warningCount],
      ],
    };
  }
  const populate = result?.populate || {};
  const writeStats = populate.write_stats?.[0] || {};
  const writePlan = populate.write_plan || {};
  const writtenEmbeddingCount = writeStats.written_embedding_count ?? 0;
  const unchangedCount = writeStats.unchanged_count ?? 0;
  const chunkCount = writeStats.chunk_count ?? populate.chunk_count ?? 0;
  const sourceCount = writeStats.source_count ?? populate.source_count ?? 0;
  const detail = liveEmbeddings
    ? writtenEmbeddingCount > 0
      ? `Live embeddings updated for ${writtenEmbeddingCount} chunk(s).`
      : unchangedCount > 0
        ? `Live embedding check succeeded. ${unchangedCount} chunk(s) were already current, so no new embeddings were written.`
        : 'Live embedding write succeeded.'
    : `Staging and DB write completed for ${chunkCount} chunk(s).`;
  return {
    title: liveEmbeddings ? 'Embedding pipeline complete.' : 'DB write pipeline complete.',
    detail,
    metrics: [
      ['Batch', batchId],
      ['Track', trackId],
      ['Sources', sourceCount],
      ['Chunks', chunkCount],
      ['Embeddings planned', writePlan.embeddings ?? 0],
      ['Embeddings written', writtenEmbeddingCount],
      ['Unchanged', unchangedCount],
      ['Live embeddings', populate.live_embeddings ? 'yes' : 'no'],
    ],
  };
}

function UploadPage() {
  const params = new URLSearchParams(window.location.search);
  const requestedTrack = params.get('trackId');
  const initialTrack = UPLOAD_TRACKS.some((track) => track.id === requestedTrack) ? requestedTrack : UPLOAD_TRACKS[0].id;
  const [selectedTrackId, setSelectedTrackId] = useState(initialTrack);
  const selectedTrack = UPLOAD_TRACKS.find((track) => track.id === selectedTrackId) || UPLOAD_TRACKS[0];

  return <main className="page uploads-page">
    <header className="hero cinematic-surface uploads-hero">
      <div className="hero-copy">
        <p className="eyebrow">Global source intake</p>
        <h1>Uploads</h1>
        <p className="hero-summary">Verify source documents, stage chunks, and ingest them into the selected track without burying content intake under learner topics.</p>
      </div>
      <div className="hero-meta uploads-track-picker">
        <label>
          <span>Target track</span>
          <select value={selectedTrackId} onChange={(event) => setSelectedTrackId(event.target.value)}>
            {UPLOAD_TRACKS.map((track) => <option key={track.id} value={track.id}>{track.code} · {track.name}</option>)}
          </select>
        </label>
        {selectedTrack.mode === 'learning+uploads'
          ? <a className="button button-ghost" href={`/tracks/${selectedTrack.id}/sources`}>View {selectedTrack.code} sources</a>
          : <span className="muted">Upload-only lane for private staging and provenance.</span>}
      </div>
    </header>
    <UploadWorkbench trackId={selectedTrackId} />
  </main>;
}

function UploadWorkbench({ trackId }) {
  const [uploadForm, setUploadForm] = useState({ title: '', sourceUrl: '', notes: '', sourceType: 'uploaded_document', adminToken: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadBatchId, setUploadBatchId] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadPipeline, setUploadPipeline] = useState({ status: 'idle', action: null, progress: 0, phase: '', liveEmbeddings: false, summary: null });
  const selectedTrack = getTrack(trackId);
  const uploadGuidance = trackId === GERMAN_B2_TRACK_ID ? germanB2UploadGuidance : null;

  useEffect(() => {
    if (uploadPipeline.status !== 'running') return undefined;
    const steps = uploadPipelineSteps(uploadPipeline);
    if (steps.length < 2) return undefined;
    let stepIndex = 0;
    const timer = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      setUploadPipeline((state) => state.status !== 'running' ? state : {
        ...state,
        progress: Math.max(state.progress, steps[stepIndex].progress),
        phase: steps[stepIndex].label,
      });
      if (stepIndex >= steps.length - 1) window.clearInterval(timer);
    }, 900);
    return () => window.clearInterval(timer);
  }, [uploadPipeline.status, uploadPipeline.action, uploadPipeline.liveEmbeddings]);

  async function parseJsonResponse(res, action) {
    if (!res.ok) throw new Error(`${action} failed (${res.status})`);
    return res.json();
  }

  async function verifyUpload() {
    if (!uploadFile) {
      setUploadError('Pick a document first.');
      return;
    }
    setUploadBusy(true);
    setUploadError(null);
    setUploadResult(null);
    setUploadPipeline({ status: 'running', action: 'verify', progress: 18, phase: 'Uploading document…', liveEmbeddings: false, summary: null });
    try {
      const batchId = uploadBatchId || `upload-${Date.now()}`;
      const formData = new FormData();
      formData.append('trackId', trackId);
      formData.append('title', uploadForm.title);
      formData.append('sourceUrl', uploadForm.sourceUrl);
      formData.append('notes', uploadForm.notes);
      formData.append('sourceType', uploadForm.sourceType);
      formData.append('batchId', batchId);
      formData.append('file', uploadFile);
      const res = await fetch(`/api/admin/uploads/verify?batchId=${encodeURIComponent(batchId)}`, {
        method: 'POST',
        headers: uploadForm.adminToken ? { Authorization: `Bearer ${uploadForm.adminToken}` } : undefined,
        body: formData,
      });
      const verified = await parseJsonResponse(res, 'Verifying upload');
      setUploadBatchId(batchId);
      setUploadResult(verified);
      setUploadPipeline({
        status: 'succeeded',
        action: 'verify',
        progress: 100,
        phase: 'Verification complete.',
        liveEmbeddings: false,
        summary: summarizeUploadPipeline(verified, { action: 'verify', liveEmbeddings: false, batchId, trackId }),
      });
    } catch (error) {
      const message = error.message || 'Unable to verify upload.';
      setUploadError(message);
      setUploadPipeline({ status: 'failed', action: 'verify', progress: 100, phase: message, liveEmbeddings: false, summary: { title: 'Verification failed.', detail: message, metrics: [['Track', trackId]] } });
    } finally {
      setUploadBusy(false);
    }
  }

  async function ingestUpload(liveEmbeddings = false) {
    if (!uploadBatchId) {
      setUploadError('Verify the upload before ingesting.');
      return;
    }
    setUploadBusy(true);
    setUploadError(null);
    setUploadPipeline({
      status: 'running',
      action: 'ingest',
      progress: 18,
      phase: liveEmbeddings ? 'Reading batch manifest…' : 'Reading batch manifest…',
      liveEmbeddings,
      summary: null,
    });
    try {
      const res = await fetch('/api/admin/uploads/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(uploadForm.adminToken ? { Authorization: `Bearer ${uploadForm.adminToken}` } : {}) },
        body: JSON.stringify({ batchId: uploadBatchId, trackId, apply: true, liveEmbeddings }),
      });
      const ingested = await parseJsonResponse(res, 'Ingesting upload');
      setUploadResult(ingested);
      setUploadPipeline({
        status: 'succeeded',
        action: 'ingest',
        progress: 100,
        phase: liveEmbeddings ? 'Live embedding write succeeded.' : 'Stage + embed completed.',
        liveEmbeddings,
        summary: summarizeUploadPipeline(ingested, { action: 'ingest', liveEmbeddings, batchId: uploadBatchId, trackId }),
      });
    } catch (error) {
      const message = error.message || 'Unable to ingest upload.';
      setUploadError(message);
      setUploadPipeline({ status: 'failed', action: 'ingest', progress: 100, phase: message, liveEmbeddings, summary: { title: liveEmbeddings ? 'Embedding pipeline failed.' : 'DB write failed.', detail: message, metrics: [['Batch', uploadBatchId], ['Track', trackId]] } });
    } finally {
      setUploadBusy(false);
    }
  }

  function onUploadFileChange(event) {
    const [file] = event.target.files || [];
    setUploadFile(file || null);
    setUploadBatchId('');
    setUploadResult(null);
    setUploadError(null);
    setUploadPipeline({ status: 'idle', action: null, progress: 0, phase: '', liveEmbeddings: false, summary: null });
  }

  return <section className="upload-workbench grid two">
    <Panel title="Document intake and verification">
      <p className="muted upload-target-note">Target: <strong>{selectedTrack?.code || trackId}</strong>. Uploads is global, but verification and ingestion still write to track-scoped source artifacts.</p>
      <div className="form-grid upload-form">
        <label>
          <span>Title</span>
          <input value={uploadForm.title} onChange={(event) => setUploadForm((state) => ({ ...state, title: event.target.value }))} placeholder="Document title" />
        </label>
        <label>
          <span>Source URL</span>
          <input value={uploadForm.sourceUrl} onChange={(event) => setUploadForm((state) => ({ ...state, sourceUrl: event.target.value }))} placeholder="https://..." />
        </label>
        <label>
          <span>Source type</span>
          <input value={uploadForm.sourceType} onChange={(event) => setUploadForm((state) => ({ ...state, sourceType: event.target.value }))} placeholder="uploaded_document" />
        </label>
        <label>
          <span>Notes</span>
          <textarea value={uploadForm.notes} onChange={(event) => setUploadForm((state) => ({ ...state, notes: event.target.value }))} rows="4" placeholder="Optional capture notes, provenance, or OCR hints" />
        </label>
        <label>
          <span>Admin token</span>
          <input type="password" value={uploadForm.adminToken} onChange={(event) => setUploadForm((state) => ({ ...state, adminToken: event.target.value }))} placeholder="Optional private token" />
        </label>
        <label>
          <span>Document</span>
          <input type="file" onChange={onUploadFileChange} />
        </label>
      </div>
      <div className="actions">
        <button className="button button-primary" disabled={uploadBusy} onClick={verifyUpload}>{uploadBusy && uploadPipeline.action === 'verify' ? 'Verifying…' : 'Verify upload'}</button>
        <button className="button button-secondary" disabled={uploadBusy || !uploadBatchId} onClick={() => ingestUpload(false)}>{uploadBusy && uploadPipeline.action === 'ingest' && !uploadPipeline.liveEmbeddings ? 'Embedding…' : 'Stage + embed'}</button>
        <button className="button button-ghost" disabled={uploadBusy || !uploadBatchId} onClick={() => ingestUpload(true)}>{uploadBusy && uploadPipeline.action === 'ingest' && uploadPipeline.liveEmbeddings ? 'Writing live DB…' : 'Stage + live DB write'}</button>
      </div>
      {(uploadPipeline.status === 'running' || uploadPipeline.summary) && <div className={`upload-pipeline upload-pipeline--${uploadPipeline.status}`} aria-live="polite" role="status">
        <div className="upload-pipeline__header">
          <strong>{uploadPipeline.action === 'verify' ? 'Verification pipeline' : uploadPipeline.liveEmbeddings ? 'Embedding pipeline' : 'DB write pipeline'}</strong>
          <span>{uploadPipeline.progress}%</span>
        </div>
        <progress className="upload-pipeline__progress" max="100" value={uploadPipeline.progress} />
        <p className="upload-pipeline__phase">{uploadPipeline.phase}</p>
        {uploadPipeline.summary && <>
          <p className="upload-pipeline__detail">{uploadPipeline.summary.detail}</p>
          <dl className="upload-pipeline__summary">
            {uploadPipeline.summary.metrics.map(([label, value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{String(value)}</dd></React.Fragment>)}
          </dl>
        </>}
      </div>}
      {uploadError && <p className="warning" role="alert">{uploadError}</p>}
      <p className="muted">Verification stores the raw file, computes a hash, and stages it for text extraction or OCR before vector DB writes. No citation, no answer; no verified document, no ingest.</p>
    </Panel>
    {uploadGuidance && <Panel title={uploadGuidance.title}>
      <div className="upload-guidance">
        <p className="warning">{uploadGuidance.warning}</p>
        <ul>
          {uploadGuidance.outputRules.map((rule) => <li key={rule}>{rule}</li>)}
        </ul>
        <p className="muted">Accepted source types: {uploadGuidance.acceptedSourceTypes.join(', ')}.</p>
        <details>
          <summary>German B2 markdownTemplate</summary>
          <pre>{uploadGuidance.markdownTemplate}</pre>
        </details>
      </div>
    </Panel>}
    <Panel title="Batch manifest and pipeline result">
      {uploadBatchId ? <p><strong>Batch:</strong> {uploadBatchId}</p> : <p className="muted">Nothing verified yet. Start by uploading a file.</p>}
      {uploadResult ? <pre className="upload-result">{JSON.stringify(uploadResult, null, 2)}</pre> : <p className="muted">The manifest will show the verification summary, staged chunk artifact, and populate-db result.</p>}
    </Panel>
  </section>;
}

function writingVariant(item) {
  const text = String(item.text || '').toLowerCase();
  if (text.includes('long essay') || text.includes('lange') || text.includes('erörter')) return 'Long essay';
  if (text.includes('short essay') || text.includes('kurzer aufsatz')) return 'Short essay';
  return 'Short answer';
}

function germanB2LessonSequence(lesson, index = 0) {
  const sequence = Number(lesson?.sequence);
  return Number.isFinite(sequence) && sequence > 0 ? sequence : index + 1;
}

function germanB2LessonTabs(lesson) {
  const explicitTabs = lesson?.tabs && typeof lesson.tabs === 'object'
    ? Object.fromEntries(GERMAN_B2_LESSON_TABS.map((tab) => [tab, Array.isArray(lesson.tabs[tab]) ? lesson.tabs[tab] : []]))
    : null;
  if (explicitTabs) return explicitTabs;
  const content = Array.isArray(lesson?.review_packet?.content)
    ? lesson.review_packet.content
    : Array.isArray(lesson?.content)
      ? lesson.content
      : [];
  return Object.fromEntries(GERMAN_B2_LESSON_TABS.map((tab) => [tab, content.filter((item) => item?.kind === tab)]));
}

function normalizeGermanB2Lessons(data) {
  if (!Array.isArray(data?.lessons)) return [];
  return data.lessons
    .map((lesson, index) => ({
      ...lesson,
      sequence: germanB2LessonSequence(lesson, index),
      tabs: germanB2LessonTabs(lesson),
    }))
    .sort((left, right) => left.sequence - right.sequence || String(left.title || left.id || '').localeCompare(String(right.title || right.id || '')) || String(left.id || '').localeCompare(String(right.id || '')))
    .map((lesson, index) => ({
      ...lesson,
      displaySequence: index + 1,
      displayLabel: `Lektion ${index + 1}`,
    }));
}

function formatLessonDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatGermanB2Status(value) {
  return String(value || '').replaceAll('_', ' ');
}

function germanB2SourceProvenanceDetails(item) {
  return [
    item?.source_file,
    item?.citation_text,
    item?.source_id,
    item?.chunk_id,
    item?.freshness_status ? `freshness: ${formatGermanB2Status(item.freshness_status)}` : null,
  ].filter(Boolean);
}

function renderGermanB2SourceProvenance(item) {
  const details = germanB2SourceProvenanceDetails(item);
  if (!details.length) return null;
  return <p className="lesson-provenance"><strong>Source provenance:</strong> {details.join(' · ')}</p>;
}

function renderGermanB2GroupedSourceProvenance(items) {
  const details = [...new Set((items || []).flatMap((item) => germanB2SourceProvenanceDetails(item)))];
  if (!details.length) return null;
  return <p className="lesson-provenance"><strong>Source provenance:</strong> {details.join(' · ')}</p>;
}

function renderGermanB2Retrieval(retrieval) {
  if (!retrieval) return null;
  const details = [
    retrieval.selection_flow ? `flow: ${retrieval.selection_flow}` : null,
    retrieval.retrieval_mode ? `mode: ${formatGermanB2Status(retrieval.retrieval_mode)}` : null,
    retrieval.vector_status ? `vector: ${formatGermanB2Status(retrieval.vector_status)}` : null,
    retrieval.article_source_status ? `articles: ${formatGermanB2Status(retrieval.article_source_status)}` : null,
    retrieval.depends_on_vocab?.length ? `vocab: ${retrieval.depends_on_vocab.join(', ')}` : null,
  ].filter(Boolean);
  return details.length ? <p className="lesson-retrieval"><strong>Retrieval flow:</strong> {details.join(' · ')}</p> : null;
}

function GermanB2Lessons({ data }) {
  const lessons = useMemo(() => normalizeGermanB2Lessons(data), [data]);
  const [activeLessonId, setActiveLessonId] = useState(lessons[0]?.id || '');
  const [activeLessonTab, setActiveLessonTab] = useState(GERMAN_B2_LESSON_TABS[0]);
  const [flippedCards, setFlippedCards] = useState({});
  useEffect(() => {
    if (!lessons.length) setActiveLessonId('');
    else if (!lessons.some((lesson) => lesson.id === activeLessonId)) setActiveLessonId(lessons[0].id);
  }, [lessons, activeLessonId]);
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) || lessons[0];
  const tabItems = activeLesson?.tabs?.[activeLessonTab] || [];
  const activeLessonTitle = activeLesson?.displayLabel || activeLesson?.title || activeLesson?.id || 'Untitled lesson';
  const activeLessonSourceIds = activeLesson?.source_ids?.length ? activeLesson.source_ids : activeLesson?.provenance?.source_ids || [];
  const activeLessonMetadata = [
    activeLesson?.status ? `Status: ${activeLesson.status}` : null,
    activeLesson?.review_status ? `review: ${activeLesson.review_status}` : null,
    activeLesson?.source_type ? `source type: ${activeLesson.source_type}` : null,
    activeLesson?.content_version ? `version ${activeLesson.content_version}` : null,
    activeLessonSourceIds.length ? `sources: ${activeLessonSourceIds.length}` : null,
    formatLessonDate(activeLesson?.published_at) ? `published ${formatLessonDate(activeLesson.published_at)}` : null,
    formatLessonDate(activeLesson?.updated_at) ? `updated ${formatLessonDate(activeLesson.updated_at)}` : null,
  ].filter(Boolean);

  if (!lessons.length) return <section className="german-b2-lessons">
    <Panel title="German B2 lessons">
      <p className="muted">No reviewed or published lessons yet. Upload pdf, txt, or markdown notes to create lesson 1; this UI will not invent future lessons.</p>
      <div className="lesson-tabs" aria-label="German B2 lesson tabs">
        {GERMAN_B2_LESSON_TABS.map((tab) => <span className="lesson-tab-empty" key={tab}>{GERMAN_B2_TAB_LABELS[tab]}</span>)}
      </div>
    </Panel>
  </section>;

  return <section className="german-b2-lessons">
    <Panel title="German B2 source-backed lessons">
      <div className="lesson-picker" aria-label="Available German B2 lessons">
        {lessons.map((lesson) => <button className={`button ${lesson.id === activeLesson.id ? 'button-primary' : 'button-ghost'}`} key={lesson.id} onClick={() => setActiveLessonId(lesson.id)}>{lesson.displayLabel || `Lektion ${lesson.displaySequence || lesson.sequence}`}</button>)}
      </div>
      <h3 className="lesson-title">{activeLessonTitle}</h3>
      {activeLessonMetadata.length > 0 && <p className="muted">{activeLessonMetadata.join(' · ')}</p>}
      {renderGermanB2Retrieval(activeLesson?.retrieval)}
      {activeLesson?.validation?.issues?.length > 0 && <p className="warning">{activeLesson.validation.issues.join(' ')}</p>}
      {activeLesson?.provenance?.source_ids?.length > 0 && <p className="lesson-provenance"><strong>Source provenance:</strong> {activeLesson.provenance.source_ids.join(' · ')}{activeLesson.provenance.chunk_ids?.length ? ` · chunks: ${activeLesson.provenance.chunk_ids.join(', ')}` : ''}</p>}
      <nav className="lesson-tabs" aria-label="German B2 lesson tabs">
        {GERMAN_B2_LESSON_TABS.map((tab) => <button aria-current={activeLessonTab === tab ? 'page' : undefined} className={activeLessonTab === tab ? 'active' : ''} key={tab} onClick={() => setActiveLessonTab(tab)}>{GERMAN_B2_TAB_LABELS[tab]}</button>)}
      </nav>
      {!tabItems.length && <p className="muted">No {GERMAN_B2_TAB_LABELS[activeLessonTab].toLowerCase()} items exist in this lesson yet. Add notes for this tab instead of showing placeholders.</p>}
      {activeLessonTab === 'vocab' && <>
        <div className="german-vocab-grid">
        {tabItems.map((item, index) => {
          const cardKey = item.id || `${activeLesson.id}-vocab-${index}`;
          const flipped = Boolean(flippedCards[cardKey]);
          return <article className="vocab-card" key={cardKey}>
            <button className={`flip-card ${flipped ? 'is-flipped' : ''}`} onClick={() => setFlippedCards((state) => ({ ...state, [cardKey]: !state[cardKey] }))}>
              <span className="flip-card__side flip-card__front">{item.front || item.term || item.text}</span>
              <span className="flip-card__side flip-card__back">{item.back || item.hungarian || item.text || 'No Hungarian translation in source notes'}</span>
            </button>
            {item.learner_task && <p>{item.learner_task}</p>}
            {item.verb_forms && <p className="muted">{[item.verb_forms.present, item.verb_forms.past, item.verb_forms.perfect].filter(Boolean).join(' · ')}</p>}
          </article>;
        })}
      </div>
      {renderGermanB2GroupedSourceProvenance(tabItems)}
      </>}
      {activeLessonTab === 'grammar' && <div className="lesson-item-list">
        <p className="muted">Grammar exercises: {tabItems.length}/about 10 from this lesson's source notes.</p>
        {tabItems.map((item, index) => <article className="lesson-item" key={item.id || `${activeLesson.id}-grammar-${index}`}><p className="eyebrow">{item.generated_exercise?.type || item.exercise_type || `Exercise ${index + 1}`}</p><p>{item.generated_exercise?.prompt || item.text}</p>{item.source_example && <p className="muted"><strong>Source example:</strong> {item.source_example}</p>}{item.notice && <p className="muted"><strong>Notice:</strong> {item.notice}</p>}</article>)}
        {renderGermanB2GroupedSourceProvenance(tabItems)}
      </div>}
      {activeLessonTab === 'reading' && <div className="lesson-item-list">
        {tabItems.map((item, index) => <article className="lesson-item" key={item.id || `${activeLesson.id}-reading-${index}`}><p className="eyebrow">{item.exercise_type === 'source_backed_reading' ? 'source-backed reading exercise' : `Uploaded-note reading seed ${index + 1}`}</p><p>{item.passage || item.text}</p>{item.generated_questions?.length > 0 ? <ul>{item.generated_questions.map((question) => <li key={question.question || question}>{question.question || question}</li>)}</ul> : item.questions?.length > 0 && <ul>{item.questions.map((question) => <li key={question}>{question}</li>)}</ul>}{renderGermanB2Retrieval(item.retrieval)}{renderGermanB2SourceProvenance(item)}</article>)}
      </div>}
      {activeLessonTab === 'writing' && <div className="lesson-item-list writing-variants">
        <p className="muted">Supported variants: Short answer · Short essay · Long essay. Only source-backed prompts are shown below.</p>
        {tabItems.map((item, index) => <article className="lesson-item" key={item.id || `${activeLesson.id}-writing-${index}`}><p className="eyebrow">{item.prompt_type || writingVariant(item)}</p><p>{item.prompt || item.text}</p>{item.expected_length && <p className="muted"><strong>Expected length:</strong> {item.expected_length}</p>}{item.required_reuse?.length > 0 && <p className="muted"><strong>Required reuse:</strong> {item.required_reuse.join(', ')}</p>}{item.checklist?.length > 0 && <ul>{item.checklist.map((entry) => <li key={entry}>{entry}</li>)}</ul>}{renderGermanB2Retrieval(item.retrieval)}{renderGermanB2SourceProvenance(item)}</article>)}
      </div>}
    </Panel>
  </section>;
}

function TrackShell({ trackId, section }) {
  const { loading, data, error } = useJson(`${API}/api/tracks/${trackId}`);
  const [activeSection, setActiveSection] = useState(section);
  const [quiz, setQuiz] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [review, setReview] = useState(null);
  const [quizReviews, setQuizReviews] = useState([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [answerError, setAnswerError] = useState(null);
  const [cardAction, setCardAction] = useState({ loadingId: null, errorCardId: null, error: null });
  const [cardStates, setCardStates] = useState({});
  const cardsDue = useMemo(() => data?.cards?.slice(0, 9) || [], [data]);
  const focusServiceNames = useMemo(() => new Set([
    'Amazon EC2',
    'Amazon CloudWatch',
    'AWS CloudTrail',
    'IAM users',
    'IAM roles',
    'AWS Organizations',
    'AWS Security Hub',
    'AWS WAF',
    'Amazon GuardDuty',
    'Amazon S3',
    'Amazon VPC',
  ]), []);
  const learningChunks = useMemo(() => data?.learningChunks || [], [data]);
  const topicPages = useMemo(() => data?.topicPages || [], [data]);
  const availableSections = useMemo(() => getTrackSections(trackId), [trackId]);
  const isGermanB2Track = trackId === GERMAN_B2_TRACK_ID;
  useEffect(() => { setActiveSection(section); }, [section]);
  useEffect(() => { if (data?.progress?.cards) setCardStates(data.progress.cards); }, [data]);
  useEffect(() => {
    if (activeSection !== 'quiz' || quiz || quizLoading) return;
    startQuiz('quick', undefined, 'quiz');
  }, [activeSection, quiz, quizLoading]);

  if (loading) return <main className="page"><p>Loading {trackId.toUpperCase()}…</p></main>;
  if (error || data?.error) return <main className="page"><p>Track {trackId.toUpperCase()} is unavailable.</p><a href="/">Back to track choice</a></main>;

  async function parseJsonResponse(res, action) {
    if (!res.ok) throw new Error(`${action} failed (${res.status})`);
    return res.json();
  }

  async function startQuiz(mode, domainId, targetSection = activeSection) {
    setQuizLoading(true);
    setQuizError(null);
    setAnswerError(null);
    try {
      const res = await fetch(`/api/tracks/${trackId}/quizzes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode, domainId }) });
      const nextQuiz = await parseJsonResponse(res, 'Starting quiz');
      setQuiz(nextQuiz);
      setQuizIndex(0);
      setReview(null);
      setQuizReviews([]);
      setQuizFinished(false);
      if (targetSection !== 'quiz') {
        window.history.pushState(null, '', `/tracks/${trackId}/quiz`);
        setActiveSection('quiz');
      }
    } catch (error) {
      setQuizError(error.message || 'Unable to start quiz.');
    } finally {
      setQuizLoading(false);
    }
  }

  async function answer(question, option) {
    setAnswerLoading(true);
    setAnswerError(null);
    try {
      const res = await fetch(`/api/tracks/${trackId}/answers`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ questionId: question.id, selectedOptionId: option.id }) });
      const nextReview = await parseJsonResponse(res, 'Submitting answer');
      setReview(nextReview);
      setQuizReviews((reviews) => {
        const updated = [...reviews];
        updated[quizIndex] = nextReview;
        return updated;
      });
    } catch (error) {
      setAnswerError(error.message || 'Unable to submit answer.');
    } finally {
      setAnswerLoading(false);
    }
  }

  function nextQuestion() {
    setQuizIndex((index) => Math.min(index + 1, (quiz?.questions?.length || 1) - 1));
    setReview(null);
    setAnswerError(null);
  }

  function finishQuiz() {
    setQuizFinished(true);
    setAnswerError(null);
  }

  function retryQuiz() {
    setQuizIndex(0);
    setReview(null);
    setQuizReviews([]);
    setQuizFinished(false);
    setAnswerError(null);
  }

  async function markCard(card, status) {
    setCardAction({ loadingId: card.id, errorCardId: null, error: null });
    try {
      const res = await fetch(`/api/tracks/${trackId}/cards/mark`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cardId: card.id, status }) });
      const updated = await parseJsonResponse(res, 'Marking card');
      setCardStates((states) => ({ ...states, [card.id]: updated }));
    } catch (error) {
      setCardAction({ loadingId: null, errorCardId: card.id, error: error.message || 'Unable to mark card.' });
      return;
    }
    setCardAction({ loadingId: null, errorCardId: null, error: null });
  }

  return <main className={`page track ${trackId}`}>
    <header className="track-header">
      <a href="/">← Track choice</a>
      <div className="track-title"><p className="eyebrow">{data.track.code}</p><h1>{data.track.name}</h1><p>Last verified: {data.track.last_verified_date}</p></div>
      <div className="score"><span>{data.progress.readiness_score}%</span><small>readiness</small></div>
    </header>
    <nav className="tabs" aria-label="Track sections">{availableSections.map((tab) => <a aria-current={activeSection === tab.id ? 'page' : undefined} className={activeSection === tab.id ? 'active' : ''} key={tab.id} href={`/tracks/${trackId}/${tab.id}`}>{TAB_LABELS[tab.id]}</a>)}</nav>
    {quizError && <p className="warning" role="alert">{quizError}</p>}
    {activeSection === 'overview' && <section className="grid two">
      <Panel title="Daily action"><p>{data.progress.next_task}</p><button className="button button-primary" disabled={quizLoading} onClick={() => startQuiz('quick', undefined, 'overview')}>{quizLoading ? 'Starting…' : 'Start quick 10'}</button></Panel>
      <Panel title="Exam facts"><FactList facts={data.track.official_facts} /></Panel>
      <Panel title="Domains">{data.domains.map((d) => <Domain key={d.id} domain={d} />)}</Panel>
      <Panel title="Services and topics"><div className="tags">{data.services.map((s) => <span key={s}>{s}</span>)}</div></Panel>
      <Panel title="Weak areas">{data.weakAreas.map((w) => <p key={w.domain_id}>{w.name}: {w.reason}</p>)}</Panel>
      <Panel title="Milestones">{data.milestones.map((m) => <p key={m.id}>□ {m.title}</p>)}</Panel>
    </section>}
    {activeSection === 'learn' && isGermanB2Track && <GermanB2Lessons data={data} />}
    {activeSection === 'learn' && !isGermanB2Track && <>
      <section className="grid two">
        <Panel title="Learning roadmap">
          {data.learningPath.map((module) => <article key={module.module_id} className="learning-roadmap-block">
            <p className="eyebrow">Module {module.module_id.replace('clf-c02-domain-', '')}</p>
            <h3>{module.title}</h3>
            {module.tasks.map((task) => <details key={task.task_statement_id} className="learning-task" open={task.task_statement_id === '2.3'}>
              <summary>{task.task_statement_id} · {task.title}</summary>
              <ul>{task.seed_topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
            </details>)}
          </article>)}
        </Panel>
        <Panel title="Dedicated topic pages">
          <p>The old pile of cards has been split into focused study pages. Pick a topic and stop pretending one grid can teach everything.</p>
          <div className="topic-preview-grid">
            {topicPages.length ? topicPages.map((page) => <article className="topic-preview" key={page.slug}>
              <p className="eyebrow">{page.slug.replace('-', ' ')}</p>
              <h3>{page.title}</h3>
              <p>{page.summary}</p>
              <p><strong>Focus services:</strong> {page.focus_services.slice(0, 5).join(' · ')}</p>
              <a className="button button-ghost" href={`/tracks/${trackId}/topics/${page.slug}`}>Open page</a>
            </article>) : <p className="muted">No dedicated topic pages have been staged for this track yet.</p>}
          </div>
        </Panel>
      </section>
      <Panel title="Source-backed learning chunks">
        <div className="topic-chunk-list">
          {learningChunks.slice(0, 8).map((chunk) => <article className="topic-chunk-row" key={chunk.id}>
            <div>
              <p className="eyebrow">{chunk.domain_name} / {chunk.task_statement_id} · {chunk.chunk_label}</p>
              <h3>{chunk.title}</h3>
              <p>{chunk.summary}</p>
            </div>
            <ul>{chunk.bullets.slice(0, 3).map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
          </article>)}
        </div>
      </Panel>
      <Panel title="Review queue">
        <div className="review-queue">
          {cardsDue.map((card) => {
            const cardState = cardStates[card.id] || { status: card.status, next_review_at: card.spaced_repetition.due_at };
            const isBusy = cardAction.loadingId === card.id;
            return <article className="review-row" key={card.id}>
              <div>
                <p className="eyebrow">{card.track_id} / {card.domain_name}</p>
                <h3>{card.prompt}</h3>
                <p><strong>Short answer:</strong> {card.short_answer}</p>
                <p className="card-state-row"><strong>Card status:</strong> <span className={`status-pill status-${cardState.status}`}>{cardState.status}</span></p>
                <p><strong>Next review:</strong> {cardState.next_review_at || card.spaced_repetition.due_at}</p>
                {cardAction.error && cardAction.errorCardId === card.id && <p className="warning" role="alert">{cardAction.error}</p>}
              </div>
              <div className="review-row__actions">
                <button className="button button-primary" disabled={isBusy} onClick={() => markCard(card, 'know')}>{isBusy ? 'Saving…' : 'I know this'}</button>
                <button className="button button-secondary" disabled={isBusy} onClick={() => markCard(card, 'review')}>{isBusy ? 'Saving…' : 'Review again'}</button>
              </div>
            </article>;
          })}
        </div>
      </Panel>
    </>}
    {activeSection === 'quiz' && <section>
      <Panel title="Quiz engine">
        <div className="actions">
          <button className="button button-primary" disabled={quizLoading} onClick={() => startQuiz('quick')}>Quick 10</button>
          <button className="button button-secondary" disabled={quizLoading} onClick={() => startQuiz('domain', data.domains[0]?.id)}>Domain 15</button>
          <button className="button button-secondary" disabled={quizLoading} onClick={() => startQuiz('full')}>Full 65 timed</button>
          <button className="button button-secondary" disabled={quizLoading} onClick={() => startQuiz('weakness')}>Weakness drill</button>
          <button className="button button-secondary" disabled={quizLoading} onClick={() => startQuiz('mixed')}>Mixed review</button>
        </div>
        {quizLoading && <p>Loading quiz…</p>}
      </Panel>
      {answerError && <p className="warning" role="alert">{answerError}</p>}
      {quiz && <Quiz quiz={quiz} quizIndex={quizIndex} onAnswer={answer} review={review} reviews={quizReviews} finished={quizFinished} onNext={nextQuestion} onFinish={finishQuiz} onRetry={retryQuiz} answerLoading={answerLoading} />}
    </section>}
    {activeSection === 'topics' && <section className="topic-hub-grid">{topicPages.length ? topicPages.map((page) => <article className="topic-hub-card cinematic-surface" key={page.slug}><p className="eyebrow">Focused study page</p><h3>{page.title}</h3><p>{page.summary}</p><p><strong>Focus services:</strong> {page.focus_services.slice(0, 5).join(' · ')}</p><p><strong>Source links:</strong> {page.source_links.slice(0, 2).map((source) => <a key={source} href={source}>{new URL(source).hostname}</a>)}</p><a className="button" href={`/tracks/${trackId}/topics/${page.slug}`}>Open dedicated page</a></article>) : <p className="muted">No dedicated topic pages are available for this track yet.</p>}</section>}
    {activeSection === 'study-plan' && <section className="grid three">{Object.entries(data.studyPlans).map(([days, plan]) => <Panel key={days} title={`${days} day plan`}>{plan.slice(0, 5).map((p) => <p key={p.day}><strong>Day {p.day}:</strong> {p.title}</p>)}</Panel>)}</section>}
    {activeSection === 'console' && <section className="cards">{data.consoleGuides.map((guide) => <article className="learning-card cinematic-surface" key={guide.id}><h3>{guide.title}</h3><p>{guide.goal}</p><p className="warning">Cost warning: {guide.cost_warning}</p><ol>{guide.steps.map((s) => <li key={s}>{s}</li>)}</ol><p><strong>Cleanup:</strong> {guide.cleanup.join(' · ')}</p><p>{guide.exam_relevance}</p></article>)}</section>}
    {activeSection === 'progress' && <Panel title="Progress history"><p>Readiness: {data.progress.readiness_score}%</p><p>Streak: {data.progress.streak_days}</p><pre>{JSON.stringify(data.progress.history.slice(-5), null, 2)}</pre></Panel>}
    {activeSection === 'sources' && <Panel title="Source verification and refresh"><p>Last source verification: {data.sourceReport.last_verified_date || 'embedded lesson provenance'}</p>{data.sourceReport.stale_warning && <p className="warning">Limitations: {data.sourceReport.limitations.join(' ')}</p>}{data.sourceReport.sources.length ? data.sourceReport.sources.map((s) => <p key={s.id}><strong>{s.title}</strong> — {s.refresh_status || s.freshness_status || 'unknown'} — {s.url ? <a href={s.url}>{s.url}</a> : <span>{s.source_file || s.citation_text || s.id}</span>}{s.citation_text && <span> · {s.citation_text}</span>}</p>) : <p className="muted">No source records are registered for this track yet.</p>}<h3>Video metadata</h3>{data.videos.map((v) => <p key={v.id}>{v.title}: {v.metadata_status}</p>)}</Panel>}
    {activeSection === 'uploads' && <section className="legacy-upload-notice"><Panel title="Uploads moved"><p>Uploads now live in the global app navigation so source intake is not nested under a learner track. Continue with this track preselected.</p><a className="button button-primary" href={`/uploads?trackId=${trackId}`}>Open global Uploads</a></Panel></section>}
  </main>;
}

function TopicShell({ trackId, topicSlug }) {
  const { loading, data, error } = useJson(`${API}/api/tracks/${trackId}`);
  if (loading) return <main className="page"><p>Loading {trackId.toUpperCase()} topic…</p></main>;
  if (error || data?.error) return <main className="page"><p>Topic page unavailable.</p><a href={`/tracks/${trackId}/learn`}>Back to learning hub</a></main>;

  const topicPage = (data.topicPages || []).find((page) => page.slug === topicSlug);
  if (!topicPage) return <main className="page"><p>Unknown topic page: {topicSlug}</p><a href={`/tracks/${trackId}/topics`}>Back to topic hub</a></main>;

  return <main className={`page track topic-page ${trackId}`}>
    <header className="track-header topic-header">
      <a href={`/tracks/${trackId}/topics`}>← Topic hub</a>
      <div className="track-title">
        <p className="eyebrow">{data.track.code} · focused topic</p>
        <h1>{topicPage.title}</h1>
        <p>{topicPage.summary}</p>
      </div>
      <div className="score"><span>{topicPage.chunk_ids.length}</span><small>study blocks</small></div>
    </header>
    <section className="topic-meta-grid">
      <Panel title="Focus services">
        <div className="tags topic-tags">{topicPage.focus_services.map((service) => <span key={service}>{service}</span>)}</div>
        <p className="muted">This page is deliberately narrower than the old one-card-for-everything feed. It is a lane, not a landfill.</p>
      </Panel>
      <Panel title="Source links">
        <ul className="topic-link-list">{topicPage.source_links.slice(0, 8).map((link) => <li key={link}><a href={link}>{link}</a></li>)}</ul>
      </Panel>
    </section>
    <section className="topic-sections">
      {topicPage.sections.map((section) => <article className="topic-section cinematic-surface" key={section.heading}>
        <h2>{section.heading}</h2>
        <div className="topic-section-items">
          {section.items.map((item) => <article className="topic-item" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
            {item.notes?.length > 0 && <ul>{item.notes.slice(0, 5).map((note) => <li key={note}>{note}</li>)}</ul>}
            {item.source_links?.length > 0 && <p className="topic-item-sources">Sources: {item.source_links.slice(0, 2).map((link) => <a key={link} href={link}>{new URL(link).hostname}</a>)}</p>}
          </article>)}
        </div>
      </article>)}
    </section>
  </main>;
}

function Panel({ title, children }) { return <article className="panel cinematic-surface"><h2>{title}</h2>{children}</article>; }
function Domain({ domain }) { return <div className="domain"><strong>{domain.name}</strong><span>{domain.weight_percent}% · due cards {domain.due_card_count}</span></div>; }
function FactList({ facts }) { return <dl>{Object.entries(facts).map(([k, v]) => <React.Fragment key={k}><dt>{k.replaceAll('_',' ')}</dt><dd>{Array.isArray(v) ? v.join(', ') : String(v)}</dd></React.Fragment>)}</dl>; }
function Quiz({ quiz, quizIndex, onAnswer, review, reviews, finished, onNext, onFinish, onRetry, answerLoading }) {
  const question = quiz.questions[quizIndex];
  const isFinalQuestion = quizIndex >= quiz.questions.length - 1;
  const answeredCount = reviews.filter(Boolean).length;
  const correctCount = reviews.filter((item) => item?.correct).length;
  const firstReadiness = reviews.find(Boolean)?.readiness_score;
  const lastReadiness = [...reviews].reverse().find(Boolean)?.readiness_score;
  const readinessImpact = firstReadiness === undefined || lastReadiness === undefined ? 0 : lastReadiness - firstReadiness;
  if (finished) return <Panel title="Quiz results"><p><strong>Score:</strong> {correctCount}/{quiz.question_count} correct ({answeredCount} answered)</p><p><strong>Correctness:</strong> {correctCount} correct · {Math.max(0, answeredCount - correctCount)} review needed</p><p><strong>Readiness impact:</strong> {readinessImpact >= 0 ? '+' : ''}{readinessImpact} points, now {lastReadiness ?? 'unchanged'}%</p><p><strong>Progress impact:</strong> {reviews.map((item, index) => item ? `Q${index + 1} ${item.correct ? 'correct' : 'review'}` : null).filter(Boolean).join(' · ')}</p><div className="actions"><button className="button button-primary" onClick={onRetry}>Retry quiz</button><button className="button button-secondary" onClick={onRetry}>Restart quick 10</button></div></Panel>;
  return <Panel title={`${quiz.mode} quiz · ${quiz.question_count} questions ${quiz.timed_minutes ? `· ${quiz.timed_minutes} minutes` : ''}`}><p className="eyebrow">Question {quizIndex + 1} of {quiz.question_count}</p><p className="eyebrow">{question.question_type} · {question.difficulty} · {question.domain_name}</p><h3>{question.prompt}</h3>{question.scenario && <p>{question.scenario}</p>}<div className="quiz-options">{question.options.map((o) => <button className="button quiz-option" disabled={answerLoading || Boolean(review)} key={o.id} onClick={() => onAnswer(question, o)}>{answerLoading ? 'Checking…' : o.label}</button>)}</div>{review && <div className="review review-panel"><h3>{review.correct ? 'Correct' : 'Review needed'}</h3><p><strong>Why the correct answer works:</strong> {review.correct_explanation}</p><p><strong>Why your choice landed where it did:</strong> {review.selected_explanation}</p><p><strong>Exam angle:</strong> {review.review_summary.exam_angle}</p><p><strong>Mapping:</strong> {review.mapping.track_id} / domain {review.mapping.domain_id} / {review.mapping.question_type} / {review.mapping.difficulty}</p><ul>{review.option_reviews.map((optionReview) => <li key={optionReview.option_id}><strong>{optionReview.selected ? 'Your choice' : optionReview.is_correct ? 'Correct choice' : 'Distractor'}:</strong> {optionReview.label} — {optionReview.explanation}</li>)}</ul>{review.review_summary.common_misconceptions?.length > 0 && <p><strong>Common trap:</strong> {review.review_summary.common_misconceptions[0]}</p>}{review.review_summary.decision_rules?.length > 0 && <p><strong>Decision rule:</strong> {review.review_summary.decision_rules[0]}</p>}<p><strong>Next actions:</strong> {review.next_actions.join(', ')}</p><button className="button button-primary" onClick={isFinalQuestion ? onFinish : onNext}>{isFinalQuestion ? 'Finish quiz' : 'Next question'}</button></div>}</Panel>;
}

function AppContent() {
  const path = window.location.pathname;
  if (path === '/uploads') return <UploadPage />;
  const topicMatch = path.match(/^\/tracks\/([^/]+)\/topics\/([^/]+)/);
  if (topicMatch) return <TopicShell trackId={topicMatch[1]} topicSlug={topicMatch[2]} />;
  const match = path.match(/^\/tracks\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return <Landing />;
  return <TrackShell trackId={match[1]} section={match[2] || 'overview'} />;
}

function shouldShowLearningAurora(pathname) {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return normalizedPath === '/tracks/clf-c02/learn';
}

function App() {
  const pathname = window.location.pathname;
  const isTrackRoute = pathname.startsWith('/tracks/');
  const hasLearningAurora = shouldShowLearningAurora(pathname);
  const content = <>
    <AppNavigation pathname={pathname} />
    <AppContent />
  </>;

  if (hasLearningAurora) return <WavyBackground className="wavy-background--learning-page">{content}</WavyBackground>;
  if (isTrackRoute) return content;

  return (
    <AuroraBackground showRadialGradient>
      {content}
    </AuroraBackground>
  );
}

createRoot(document.getElementById('root')).render(<App />);
