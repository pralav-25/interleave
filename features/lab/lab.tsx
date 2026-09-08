'use client';
import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  lazy,
  Suspense,
} from 'react';
import Link from 'next/link';
const AssistantPanel = lazy(() =>
  import('@/features/assistant/panel').then((m) => ({
    default: m.AssistantPanel,
  })),
);
import { SaveDialog } from '@/features/workspace/save-dialog';
import {
  Workflow,
  Bot,
  Bookmark,
  Star,
  ArrowUpRight,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Share2,
  Download,
  ShieldCheck,
  CircleAlert,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  GitBranch,
  Check,
  LockKeyhole,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { experiments } from '@/lib/experiments';
import {
  decodeReplay,
  encodeReplay,
  enabledActors,
  explore,
  outcome,
  replay,
  traceMarkdown,
  type Actor,
  type Mode,
  type Value,
} from '@/lib/engine';
import { initialSession, sessionReducer } from '@/lib/session';
const REPO = 'https://github.com/pralav-25/interleave';
const format = (value: Value) =>
  typeof value === 'boolean'
    ? value
      ? 'true'
      : 'false'
    : value === null
      ? '—'
      : String(value);
export default function Lab() {
  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const [playing, setPlaying] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMounted, setAssistantMounted] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const experiment = experiments.find((e) => e.id === session.id)!;
  const program = useMemo(
    () => experiment.make(session.mode),
    [experiment, session.mode],
  );
  const run = useMemo(
    () => replay(program, session.trace.slice(0, session.cursor)),
    [program, session.trace, session.cursor],
  );
  const exploration = useMemo(() => explore(program), [program]);
  const assistantContext = useMemo(
    () => ({
      id: session.id,
      mode: session.mode,
      schedule: session.trace.slice(0, session.cursor),
    }),
    [session.id, session.mode, session.trace, session.cursor],
  );
  const available = enabledActors(program, run.frame);
  const status = outcome(program, run.frame);
  const failures = exploration.results.filter((r) => r.outcome !== 'pass');
  const passes = exploration.results.length - failures.length;
  const lastEvent = run.events.at(-1);
  useEffect(() => {
    function restore() {
      try {
        const saved = decodeReplay(window.location.hash, experiments);
        if (saved) {
          dispatch({
            type: 'load',
            session: {
              id: saved.id,
              mode: saved.mode,
              trace: saved.schedule,
              cursor: saved.schedule.length,
            },
          });
          setNotice(
            'Shared schedule loaded. Click any timeline step to rewind.',
          );
          setPlaying(false);
        }
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : 'Could not open replay.',
        );
      }
    }
    restore();
    window.addEventListener('hashchange', restore);
    return () => window.removeEventListener('hashchange', restore);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (session.cursor < session.trace.length)
        dispatch({ type: 'seek', cursor: session.cursor + 1 });
      if (session.cursor + 1 >= session.trace.length) setPlaying(false);
    }, 650);
    return () => clearTimeout(timer);
  }, [playing, session.cursor, session.trace.length]);
  useEffect(() => {
    function keydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        target.closest(
          'input,textarea,select,[contenteditable="true"],[role="tab"],[role="dialog"]',
        )
      )
        return;
      if (e.key === '1' || e.key === '2') {
        e.preventDefault();
        setPlaying(false);
        dispatch({ type: 'step', actor: e.key === '1' ? 0 : 1 });
      }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  function clearFeedback() {
    setNotice('');
    setFallbackUrl('');
    setPlaying(false);
  }
  function step(actor: Actor) {
    clearFeedback();
    dispatch({ type: 'step', actor });
  }
  function select(id: string) {
    clearFeedback();
    dispatch({ type: 'select', id });
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    );
  }
  function changeMode(mode: Mode) {
    clearFeedback();
    dispatch({ type: 'mode', mode });
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    );
  }
  function demonstrate() {
    clearFeedback();
    const choices = session.mode === 'buggy' ? failures : exploration.results;
    const target = [...choices].sort(
      (a, b) => a.schedule.length - b.schedule.length,
    )[0];
    if (!target) {
      setNotice('No failing schedule was found in this model.');
      return;
    }
    dispatch({
      type: 'load',
      session: { ...session, trace: target.schedule, cursor: 0 },
    });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setNotice('Schedule loaded. Use the forward button to step through it.');
    } else setPlaying(true);
  }
  function shareUrl() {
    const fragment = encodeReplay(
      session.id,
      session.mode,
      session.trace.slice(0, session.cursor),
    );
    return `${window.location.origin}${window.location.pathname}#${fragment}`;
  }
  async function share() {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Replay link copied. It restores this exact execution.');
      setFallbackUrl('');
    } catch {
      setNotice('Copy this replay link:');
      setFallbackUrl(url);
    }
  }
  function download() {
    const blob = new Blob(
      [traceMarkdown(experiment, session.mode, run, shareUrl())],
      { type: 'text/markdown;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `interleave-${session.id}-${session.mode}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Trace exported as Markdown.');
  }
  const failure = status === 'fail' || status === 'deadlock';
  return (
    <>
      <header className="app-header">
        <Link href="/" className="brand" aria-label="Interleave home">
          <Workflow size={28} strokeWidth={1.8} />
          interleave <small>v0.2</small>
        </Link>
        <div className="header-links">
          <Link href="/workspace" className="workspace-nav-link">
            <Bookmark size={15} />
            Workspace
          </Link>
          <a className="header-docs" href={`${REPO}#how-it-works`}>
            How it works
          </a>
          <a
            className="github-link"
            href={REPO}
            target="_blank"
            rel="noreferrer"
          >
            <Star size={17} />
            Star on GitHub <ArrowUpRight size={14} />
          </a>
        </div>
      </header>
      <SidebarProvider className="main-layout">
        <Sidebar
          collapsible="none"
          className="scenario-nav"
          aria-label="Experiments"
        >
          <p className="eyebrow nav-label">
            The experiments <span>06</span>
          </p>
          <SidebarContent className="scenario-list">
            {experiments.map((e, i) => (
              <button
                className={`scenario-button ${e.id === session.id ? 'selected' : ''}`}
                key={e.id}
                onClick={() => select(e.id)}
                aria-current={e.id === session.id ? 'true' : undefined}
              >
                <span className="number mono">0{i + 1}</span>
                <span>
                  <strong>{e.title}</strong>
                  <small>{e.subtitle}</small>
                </span>
              </button>
            ))}
          </SidebarContent>
          <div className="nav-bottom">
            <a className="text-link" href={`${REPO}/blob/main/CONTRIBUTING.md`}>
              <FlaskConical size={16} />
              Add an experiment <ArrowUpRight size={13} />
            </a>
            <p>
              A small lab for bugs that hide
              <br />
              between the lines.
            </p>
          </div>
        </Sidebar>
        <main className="workspace" id="main">
          <section className="intro">
            <div>
              <div className="eyebrow lab-tag">
                <span className="status-dot" />
                Concurrency, made visible
              </div>
              <h1>{experiment.headline}</h1>
              <p>{experiment.description}</p>
            </div>
            <span className="pill mono">{experiment.category}</span>
          </section>
          <div className="lab-controls">
            <Tabs
              value={session.mode}
              onValueChange={(v) => changeMode(v as Mode)}
            >
              <TabsList className="mode-tabs" aria-label="Implementation">
                <TabsTrigger value="buggy">
                  <GitBranch size={15} />
                  With the bug
                </TabsTrigger>
                <TabsTrigger value="fixed">
                  <ShieldCheck size={15} />
                  With the fix
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="control-buttons">
              <Button
                variant="outline"
                onClick={() => {
                  setPlaying(false);
                  setSaveOpen(true);
                }}
              >
                <Bookmark size={15} />
                Save
              </Button>
              <Button
                className="assistant-button"
                variant="outline"
                onClick={() => {
                  setPlaying(false);
                  setAssistantMounted(true);
                  setAssistantOpen(true);
                }}
              >
                <Bot size={16} />
                Ask assistant
              </Button>
              <Button
                variant="ghost"
                aria-label="Reset execution"
                onClick={() => {
                  clearFeedback();
                  dispatch({ type: 'reset' });
                }}
              >
                <RotateCcw size={16} />
              </Button>
              <Button variant="outline" onClick={share}>
                <Share2 size={15} />
                Share replay
              </Button>
              <Button onClick={demonstrate}>
                <Play size={14} />
                {session.mode === 'buggy'
                  ? 'Find a failure'
                  : 'Run a passing path'}
              </Button>
            </div>
          </div>
          <div className="lab-grid">
            <section className="scheduler" aria-label="Interactive scheduler">
              <div className="panel-heading">
                <strong className="text-link">
                  <Workflow size={16} />
                  You are the scheduler
                </strong>
                <span className="mono">1 = A · 2 = B</span>
              </div>
              <div className="threads">
                {([0, 1] as Actor[]).map((a) => {
                  const pc = run.frame.pc[a];
                  const done = pc === program.steps[a].length;
                  const blocked = !done && !available.includes(a);
                  return (
                    <section
                      className={`thread ${a === 1 ? 'actor-b' : ''}`}
                      key={a}
                      aria-label={program.actors[a]}
                    >
                      <div className="thread-head">
                        <strong>
                          <span className="actor-badge mono">
                            {a === 0 ? 'A' : 'B'}
                          </span>
                          {program.actors[a]}
                        </strong>
                        <small>
                          {done ? 'Complete' : blocked ? 'Blocked' : 'Ready'}
                        </small>
                      </div>
                      <div>
                        {program.steps[a].map((op, i) => (
                          <div
                            className={`code-line mono ${i === pc ? 'next' : ''} ${i < pc ? 'done' : ''}`}
                            key={`${i}-${op.code}`}
                            aria-current={i === pc ? 'step' : undefined}
                          >
                            <span className="line-number">
                              {i < pc ? <Check size={12} /> : i + 1}
                            </span>
                            <code>{op.code}</code>
                          </div>
                        ))}
                      </div>
                      <div className="thread-step">
                        <Button
                          className="actor-button"
                          disabled={!available.includes(a) || playing}
                          onClick={() => step(a)}
                        >
                          {done ? (
                            <Check size={14} />
                          ) : blocked ? (
                            <LockKeyhole size={14} />
                          ) : (
                            <ArrowRight size={14} />
                          )}{' '}
                          {done
                            ? 'Finished'
                            : blocked
                              ? 'Waiting for lock'
                              : `Step ${a === 0 ? 'A' : 'B'}`}
                        </Button>
                      </div>
                      <div className="locals mono">
                        {Object.keys(run.frame.locals[a]).length
                          ? Object.entries(run.frame.locals[a])
                              .map(([key, value]) => `${key}: ${format(value)}`)
                              .join(' · ')
                          : 'local: —'}
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="timeline">
                <div className="timeline-top">
                  <span className="eyebrow">Execution timeline</span>
                  <span className="mono">
                    step {session.cursor} / {session.trace.length}
                  </span>
                </div>
                <div className="trace">
                  <button
                    className="trace-start"
                    aria-label="Rewind to initial state"
                    onClick={() => {
                      setPlaying(false);
                      dispatch({ type: 'seek', cursor: 0 });
                    }}
                  >
                    0
                  </button>
                  {session.trace.length ? (
                    session.trace.map((a, i) => (
                      <button
                        key={i}
                        className={`${a === 1 ? 'b' : ''} ${i >= session.cursor ? 'dim' : ''} mono`}
                        aria-label={`View step ${i + 1}, worker ${a === 0 ? 'A' : 'B'}`}
                        aria-pressed={i + 1 === session.cursor}
                        onClick={() => {
                          setPlaying(false);
                          dispatch({ type: 'seek', cursor: i + 1 });
                        }}
                      >
                        {a === 0 ? 'A' : 'B'}
                        {i + 1}
                      </button>
                    ))
                  ) : (
                    <span className="trace-empty">
                      Choose a worker. Every click is one atomic step.
                    </span>
                  )}
                </div>
                {session.trace.length > 0 && (
                  <div className="playback">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={session.cursor === 0}
                      aria-label="Previous step"
                      onClick={() => {
                        setPlaying(false);
                        dispatch({ type: 'seek', cursor: session.cursor - 1 });
                      }}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={
                        session.cursor === session.trace.length && !playing
                      }
                      aria-label={playing ? 'Pause replay' : 'Play replay'}
                      onClick={() => setPlaying(!playing)}
                    >
                      {playing ? <Pause size={15} /> : <Play size={15} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={session.cursor === session.trace.length}
                      aria-label="Next step"
                      onClick={() => {
                        setPlaying(false);
                        dispatch({ type: 'seek', cursor: session.cursor + 1 });
                      }}
                    >
                      <ChevronRight size={16} />
                    </Button>
                    <span>Rewind, then step a worker to branch.</span>
                  </div>
                )}
              </div>
            </section>
            <aside className="inspector" aria-label="Execution state">
              <section className="state-panel">
                <div className="panel-heading">
                  <strong>Shared state</strong>
                  <CircleDot size={14} className="muted" />
                </div>
                <dl className="state-values">
                  {Object.entries(run.frame.shared).map(([key, value]) => (
                    <div className="state-item" key={key}>
                      <dt className="mono">{key}</dt>
                      <dd className="mono">{format(value)}</dd>
                    </div>
                  ))}
                  {Object.entries(run.frame.locks).map(([key, value]) => (
                    <div className="state-item" key={`lock-${key}`}>
                      <dt className="mono">🔒 {key}</dt>
                      <dd className="mono">
                        {value === null ? 'free' : value === 0 ? 'A' : 'B'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section
                className={`invariant ${failure ? 'bad' : ''}`}
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="check-title">
                  {failure ? (
                    <CircleAlert size={16} />
                  ) : status === 'pass' ? (
                    <ShieldCheck size={16} />
                  ) : (
                    <CircleDot size={16} />
                  )}{' '}
                  {status === 'deadlock'
                    ? 'Deadlock found'
                    : status === 'fail'
                      ? 'Invariant broken'
                      : status === 'pass'
                        ? 'Invariant holds'
                        : 'The invariant'}
                </div>
                <p className="mono">{program.expected}</p>
                <small>
                  {status === 'running'
                    ? 'Checked when execution finishes.'
                    : status === 'pass'
                      ? 'This schedule passes. Explore the others below.'
                      : status === 'deadlock'
                        ? 'Unfinished workers. No enabled operation.'
                        : 'This schedule is a counterexample.'}
                </small>
              </section>
            </aside>
          </div>
          <div className="event-strip" aria-live="polite" aria-atomic="true">
            <strong>
              {lastEvent
                ? `${String(session.cursor).padStart(2, '0')} · ${lastEvent.message}`
                : 'Start with Step A or Step B. Try to break the invariant.'}
            </strong>
            {status === 'deadlock' && (
              <span>
                Neither worker can acquire its next lock. Rewind to try a
                different order.
              </span>
            )}
          </div>
          {notice && (
            <output className="notice">
              {notice}
              {fallbackUrl && (
                <input
                  className="share-url mono"
                  readOnly
                  aria-label="Replay link"
                  value={fallbackUrl}
                  onFocus={(e) => e.target.select()}
                />
              )}
            </output>
          )}
          <div className="bottom-grid">
            <section className="explorer">
              <div className="section-head">
                <h2 className="text-link">
                  <GitBranch size={17} />
                  Every possible schedule
                </h2>
                <Button variant="ghost" onClick={download}>
                  <Download size={15} />
                  Export this trace
                </Button>
              </div>
              <p>
                {exploration.complete
                  ? 'Exhaustive for this finite model.'
                  : 'Search limit reached; results are partial.'}{' '}
                Select a square to inspect its execution.
              </p>
              <div className="stats">
                <div className="stat">
                  <strong className="mono">{exploration.results.length}</strong>
                  <small>terminal schedules</small>
                </div>
                <div className="stat">
                  <strong className="mono fail-color">{failures.length}</strong>
                  <small>fail or deadlock</small>
                </div>
                <div className="stat">
                  <strong className="mono pass-color">{passes}</strong>
                  <small>pass the invariant</small>
                </div>
              </div>
              <fieldset
                className="schedule-dots"
                aria-label="Terminal schedules"
              >
                {exploration.results.map((result, i) => (
                  <button
                    key={result.schedule.join('')}
                    className={`schedule-dot ${result.outcome !== 'pass' ? 'fail' : ''}`}
                    title={`Schedule ${i + 1}: ${result.schedule.map((a) => (a === 0 ? 'A' : 'B')).join('')} — ${result.outcome}`}
                    aria-label={`Schedule ${i + 1}, ${result.outcome}: ${result.schedule.map((a) => (a === 0 ? 'A' : 'B')).join(', ')}`}
                    onClick={() => {
                      clearFeedback();
                      dispatch({
                        type: 'load',
                        session: {
                          ...session,
                          trace: result.schedule,
                          cursor: result.schedule.length,
                        },
                      });
                    }}
                  />
                ))}
              </fieldset>
              <div className="legend">
                Green = pass · Coral = failure or deadlock. Counts are not
                probabilities.
              </div>
            </section>
            <section className="explanation">
              <h2>
                {session.mode === 'buggy'
                  ? 'Why it breaks'
                  : 'Why the fix works'}
              </h2>
              <p>
                {session.mode === 'buggy'
                  ? experiment.explanation
                  : experiment.fix}
              </p>
              <a href={experiment.source.url} target="_blank" rel="noreferrer">
                Read the reference <ArrowUpRight size={14} />
              </a>
            </section>
          </div>
          <details className="model-notes">
            <summary>Model assumptions & limits</summary>
            <p>{experiment.assumption}</p>
            <p>
              These are small educational models with two workers, finite
              operations, and sequentially consistent memory. They do not
              execute your code or prove a production system safe. Each
              displayed row is indivisible.
            </p>
          </details>
          <footer className="footer">
            <a
              href="https://github.com/pralav-25"
              target="_blank"
              rel="noreferrer"
            >
              Built by <span className="credit">Pralav Singh</span> ↗
            </a>
            <span>Public lab. Private workspace. AI runs on your device.</span>
            <a href={`${REPO}/blob/main/LICENSE`}>Open source · MIT</a>
          </footer>
        </main>
      </SidebarProvider>
      {assistantMounted && (
        <Suspense
          fallback={
            <output className="assistant-opening">Opening assistant…</output>
          }
        >
          {' '}
          <AssistantPanel
            open={assistantOpen}
            onOpenChange={setAssistantOpen}
            context={assistantContext}
          />
        </Suspense>
      )}
      {saveOpen && (
        <SaveDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          context={assistantContext}
          title={`${experiment.title} · step ${session.cursor}`}
        />
      )}
    </>
  );
}
