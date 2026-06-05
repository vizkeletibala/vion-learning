import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = '';
const TAB_LABELS = {
  overview: 'overview',
  learn: 'learn',
  quiz: 'quiz',
  'study-plan': 'study-plan',
  console: 'AWS Console Practice',
  progress: 'progress',
  sources: 'sources',
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
    <header className="hero">
      <div>
        <p className="eyebrow">Internal / local trainer</p>
        <h1>Vion Learning</h1>
        <p>{data.source_freshness_summary}</p>
      </div>
      <a className="ghost" href="/api/admin/export">Export progress</a>
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
  const cardsDue = useMemo(() => data?.cards?.slice(0, 6) || [], [data]);

  useEffect(() => { setActiveSection(section); }, [section]);
  useEffect(() => { if (data?.progress?.cards) setCardStates(data.progress.cards); }, [data]);

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
      <div><p className="eyebrow">{data.track.code}</p><h1>{data.track.name}</h1><p>Last verified: {data.track.last_verified_date}</p></div>
      <div className="score"><span>{data.progress.readiness_score}%</span><small>readiness</small></div>
    </header>
    <nav className="tabs">{['overview','learn','quiz','study-plan','console','progress','sources'].map((tab) => <a className={activeSection === tab ? 'active' : ''} key={tab} href={`/tracks/${trackId}/${tab}`}>{TAB_LABELS[tab]}</a>)}</nav>
    {quizError && <p className="warning" role="alert">{quizError}</p>}
    {activeSection === 'overview' && <section className="grid two">
      <Panel title="Daily action"><p>{data.progress.next_task}</p><button disabled={quizLoading} onClick={() => startQuiz('quick', undefined, 'overview')}>{quizLoading ? 'Starting…' : 'Start quick 10'}</button></Panel>
      <Panel title="Exam facts"><FactList facts={data.track.official_facts} /></Panel>
      <Panel title="Domains">{data.domains.map((d) => <Domain key={d.id} domain={d} />)}</Panel>
      <Panel title="Services and topics"><div className="tags">{data.services.map((s) => <span key={s}>{s}</span>)}</div></Panel>
      <Panel title="Weak areas">{data.weakAreas.map((w) => <p key={w.domain_id}>{w.name}: {w.reason}</p>)}</Panel>
      <Panel title="Milestones">{data.milestones.map((m) => <p key={m.id}>□ {m.title}</p>)}</Panel>
    </section>}
    {activeSection === 'learn' && <section className="cards">{cardsDue.map((card) => {
      const cardState = cardStates[card.id] || { status: card.status, next_review_at: card.spaced_repetition.due_at };
      const isBusy = cardAction.loadingId === card.id;
      return <article className="learning-card" key={card.id}><p className="eyebrow">{card.track_id} / {card.domain_name}</p><h3>{card.prompt}</h3><p><strong>Short answer:</strong> {card.short_answer}</p><details><summary>Detailed explanation</summary><p>{card.detailed_explanation}</p><p>Sources: {card.source_links.map((s) => <a key={s} href={s}>{new URL(s).hostname}</a>)}</p></details><p><strong>Card status:</strong> {cardState.status}</p><p><strong>Next review:</strong> {cardState.next_review_at || card.spaced_repetition.due_at}</p>{cardAction.error && cardAction.errorCardId === card.id && <p className="warning" role="alert">{cardAction.error}</p>}<button disabled={isBusy} onClick={() => markCard(card, 'know')}>{isBusy ? 'Saving…' : 'I know this'}</button><button disabled={isBusy} onClick={() => markCard(card, 'review')}>{isBusy ? 'Saving…' : 'Review again'}</button></article>;
    })}</section>}
    {activeSection === 'quiz' && <section><Panel title="Quiz engine"><div className="actions"><button disabled={quizLoading} onClick={() => startQuiz('quick')}>Quick 10</button><button disabled={quizLoading} onClick={() => startQuiz('domain', data.domains[0].id)}>Domain 15</button><button disabled={quizLoading} onClick={() => startQuiz('full')}>Full 65 timed</button><button disabled={quizLoading} onClick={() => startQuiz('weakness')}>Weakness drill</button><button disabled={quizLoading} onClick={() => startQuiz('mixed')}>Mixed review</button></div>{quizLoading && <p>Loading quiz…</p>}</Panel>{answerError && <p className="warning" role="alert">{answerError}</p>}{quiz && <Quiz quiz={quiz} quizIndex={quizIndex} onAnswer={answer} review={review} reviews={quizReviews} finished={quizFinished} onNext={nextQuestion} onFinish={finishQuiz} onRetry={retryQuiz} answerLoading={answerLoading} />}</section>}
    {activeSection === 'study-plan' && <section className="grid three">{Object.entries(data.studyPlans).map(([days, plan]) => <Panel key={days} title={`${days} day plan`}>{plan.slice(0, 5).map((p) => <p key={p.day}><strong>Day {p.day}:</strong> {p.title}</p>)}</Panel>)}</section>}
    {activeSection === 'console' && <section className="cards">{data.consoleGuides.map((guide) => <article className="learning-card" key={guide.id}><h3>{guide.title}</h3><p>{guide.goal}</p><p className="warning">Cost warning: {guide.cost_warning}</p><ol>{guide.steps.map((s) => <li key={s}>{s}</li>)}</ol><p><strong>Cleanup:</strong> {guide.cleanup.join(' · ')}</p><p>{guide.exam_relevance}</p></article>)}</section>}
    {activeSection === 'progress' && <Panel title="Progress history"><p>Readiness: {data.progress.readiness_score}%</p><p>Streak: {data.progress.streak_days}</p><pre>{JSON.stringify(data.progress.history.slice(-5), null, 2)}</pre></Panel>}
    {activeSection === 'sources' && <Panel title="Source verification and refresh"><p>Last source verification: {data.sourceReport.last_verified_date}</p>{data.sourceReport.stale_warning && <p className="warning">Limitations: {data.sourceReport.limitations.join(' ')}</p>}{data.sourceReport.sources.map((s) => <p key={s.id}><strong>{s.title}</strong> — {s.refresh_status} — <a href={s.url}>{s.url}</a></p>)}<h3>Video metadata</h3>{data.videos.map((v) => <p key={v.id}>{v.title}: {v.metadata_status}</p>)}</Panel>}
  </main>;
}

function Panel({ title, children }) { return <article className="panel"><h2>{title}</h2>{children}</article>; }
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
  if (finished) return <Panel title="Quiz results"><p><strong>Score:</strong> {correctCount}/{quiz.question_count} correct ({answeredCount} answered)</p><p><strong>Correctness:</strong> {correctCount} correct · {Math.max(0, answeredCount - correctCount)} review needed</p><p><strong>Readiness impact:</strong> {readinessImpact >= 0 ? '+' : ''}{readinessImpact} points, now {lastReadiness ?? 'unchanged'}%</p><p><strong>Progress impact:</strong> {reviews.map((item, index) => item ? `Q${index + 1} ${item.correct ? 'correct' : 'review'}` : null).filter(Boolean).join(' · ')}</p><div className="actions"><button onClick={onRetry}>Retry quiz</button><button onClick={onRetry}>Restart quick 10</button></div></Panel>;
  return <Panel title={`${quiz.mode} quiz · ${quiz.question_count} questions ${quiz.timed_minutes ? `· ${quiz.timed_minutes} minutes` : ''}`}><p className="eyebrow">Question {quizIndex + 1} of {quiz.question_count}</p><p className="eyebrow">{question.question_type} · {question.difficulty} · {question.domain_name}</p><h3>{question.prompt}</h3>{question.scenario && <p>{question.scenario}</p>}{question.options.map((o) => <button disabled={answerLoading || Boolean(review)} key={o.id} onClick={() => onAnswer(question, o)}>{answerLoading ? 'Checking…' : o.label}</button>)}{review && <div className="review"><h3>{review.correct ? 'Correct' : 'Review needed'}</h3><p><strong>Why the correct answer works:</strong> {review.correct_explanation}</p><p><strong>Why your choice landed where it did:</strong> {review.selected_explanation}</p><p><strong>Exam angle:</strong> {review.review_summary.exam_angle}</p><p><strong>Mapping:</strong> {review.mapping.track_id} / domain {review.mapping.domain_id} / {review.mapping.question_type} / {review.mapping.difficulty}</p><ul>{review.option_reviews.map((optionReview) => <li key={optionReview.option_id}><strong>{optionReview.selected ? 'Your choice' : optionReview.is_correct ? 'Correct choice' : 'Distractor'}:</strong> {optionReview.label} — {optionReview.explanation}</li>)}</ul>{review.review_summary.common_misconceptions?.length > 0 && <p><strong>Common trap:</strong> {review.review_summary.common_misconceptions[0]}</p>}{review.review_summary.decision_rules?.length > 0 && <p><strong>Decision rule:</strong> {review.review_summary.decision_rules[0]}</p>}<p><strong>Next actions:</strong> {review.next_actions.join(', ')}</p><button onClick={isFinalQuestion ? onFinish : onNext}>{isFinalQuestion ? 'Finish quiz' : 'Next question'}</button></div>}</Panel>;
}

function App() {
  const path = window.location.pathname;
  const match = path.match(/^\/tracks\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return <Landing />;
  return <TrackShell trackId={match[1]} section={match[2] || 'overview'} />;
}

createRoot(document.getElementById('root')).render(<App />);
