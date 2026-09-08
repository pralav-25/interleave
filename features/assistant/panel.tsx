'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import {
  Bot,
  ArrowUp,
  Square,
  Download,
  ShieldCheck,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  createBrowserAssistant,
  type AssistantProvider,
} from './browser-provider';
import {
  contextKey,
  verifiedContext,
  MAX_QUESTION_CHARS,
  type ChatMessage,
  type TraceContext,
} from './context';
type Phase = 'idle' | 'loading' | 'ready' | 'error';
export function AssistantPanel({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: TraceContext;
}) {
  const provider = useRef<AssistantProvider | null>(null);
  const request = useRef(0);
  const modelRequest = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [loadText, setLoadText] = useState('');
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversation, setConversation] = useState<{
    key: string;
    messages: ChatMessage[];
  }>({ key: '', messages: [] });
  const key = contextKey(context);
  const facts = useMemo(() => verifiedContext(context), [context]);
  const messages = conversation.key === key ? conversation.messages : [];
  useEffect(
    () => () => {
      request.current++;
      modelRequest.current++;
      provider.current?.dispose();
    },
    [],
  );
  async function enable() {
    const attempt = ++modelRequest.current;
    setError('');
    setPhase('loading');
    setProgress(0);
    setLoadText('Preparing the local model…');
    provider.current ??= createBrowserAssistant();
    try {
      await provider.current.load((report) => {
        if (modelRequest.current === attempt) {
          setProgress(Math.round(report.progress * 100));
          setLoadText(report.text);
        }
      });
      if (modelRequest.current === attempt) setPhase('ready');
    } catch (e) {
      if (modelRequest.current === attempt) {
        setError(e instanceof Error ? e.message : 'The model could not load.');
        setPhase('error');
      }
    }
  }
  function stop() {
    provider.current?.stop();
    // Keep send disabled until the worker acknowledges interruption.
    // The provider suppresses any later tokens from the stopped answer.
    setConversation((current) => ({
      ...current,
      messages: current.messages.filter((m) => m.content.length > 0),
    }));
  }
  function cancelLoad() {
    modelRequest.current++;
    provider.current?.dispose();
    setPhase('idle');
    setError('');
  }
  async function ask(text: string) {
    const content = text.trim();
    if (!content || busy || phase !== 'ready') return;
    const token = ++request.current;
    const captured = { ...context, schedule: [...context.schedule] };
    const history = [...messages];
    const next = [
      ...history,
      { role: 'user' as const, content },
      { role: 'assistant' as const, content: '' },
    ];
    setConversation({ key, messages: next });
    setQuestion('');
    setError('');
    setBusy(true);
    try {
      await provider.current!.stream(captured, history, content, (answer) => {
        if (request.current === token)
          setConversation({
            key,
            messages: [
              ...next.slice(0, -1),
              { role: 'assistant', content: answer },
            ],
          });
      });
    } catch (e) {
      if (request.current === token) {
        setError(
          e instanceof Error ? e.message : 'Generation failed. Try again.',
        );
        setPhase('error');
        setConversation((current) => ({
          ...current,
          messages: current.messages.filter((m) => m.content.length > 0),
        }));
      }
    } finally {
      if (request.current === token) setBusy(false);
    }
  }
  async function removeModel() {
    stop();
    request.current++;
    setBusy(false);
    const operation = ++modelRequest.current;
    setPhase('loading');
    setLoadText('Removing cached model files…');
    try {
      await provider.current?.clearCache();
      if (operation !== modelRequest.current) return;
      setPhase('idle');
      setError('');
      setConversation({ key: '', messages: [] });
    } catch {
      if (operation !== modelRequest.current) return;
      setPhase('error');
      setError(
        'Some cached files could not be removed. You can also clear this site’s storage in browser settings.',
      );
    }
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          stop();
          if (phase === 'loading') cancelLoad();
        }
        onOpenChange(value);
      }}
    >
      <SheetContent className="assistant-sheet" side="right">
        <SheetHeader className="assistant-head">
          <SheetTitle className="text-link">
            <Bot size={21} />
            Trace assistant <span className="ai-local">Local AI</span>
          </SheetTitle>
          <SheetDescription>
            Understand this execution, one question at a time.
          </SheetDescription>
        </SheetHeader>
        <div className="assistant-scroll">
          <section className="verified-card">
            <div className="text-link">
              <ShieldCheck size={16} />
              <strong>Verified by the engine</strong>
            </div>
            <p>
              {facts.experiment} ·{' '}
              {facts.mode === 'buggy' ? 'with the bug' : 'with the fix'} · step{' '}
              {facts.step}
            </p>
            <div className="fact-grid">
              <span>
                Status <b>{facts.status}</b>
              </span>
              <span>
                Failing schedules{' '}
                <b>
                  {facts.exploration.failing} / {facts.exploration.total}
                </b>
              </span>
            </div>
            <code>{facts.invariant}</code>
          </section>
          {phase !== 'ready' && (
            <section className="model-setup">
              <Bot size={27} />
              <h3>Ask privately. Learn in context.</h3>
              <p>
                Qwen 2.5 runs on your device. First use downloads roughly 1 GB
                and needs WebGPU with about 2 GB of available GPU memory.
                Questions and answers are not sent to an AI server.
              </p>
              {phase === 'loading' ? (
                <>
                  <Progress
                    value={progress}
                    aria-label="AI model loading progress"
                  />
                  <p className="load-detail" role="log">
                    {loadText}
                  </p>
                  <Button variant="outline" onClick={cancelLoad}>
                    Cancel loading
                  </Button>
                </>
              ) : (
                <Button onClick={() => void enable()}>
                  <Download size={16} />
                  {phase === 'error'
                    ? 'Retry model download'
                    : 'Enable local AI'}
                </Button>
              )}
              <a
                href="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct"
                target="_blank"
                rel="noreferrer"
                className="model-source"
              >
                Model details ↗
              </a>
            </section>
          )}
          {phase === 'ready' && messages.length === 0 && (
            <div className="assistant-starters">
              <h3>What would help?</h3>
              {[
                'Explain what happened in this trace.',
                'Give me a hint without revealing the solution.',
                'Why does the fix work, and what does it not guarantee?',
              ].map((prompt) => (
                <button key={prompt} onClick={() => void ask(prompt)}>
                  {prompt}
                  <ArrowUp size={14} />
                </button>
              ))}
            </div>
          )}
          <div className="chat-messages" aria-label="Conversation">
            {messages.map((m, i) => (
              <article key={`${key}-${i}`} className={`chat-message ${m.role}`}>
                <span className="message-label">
                  {m.role === 'user' ? 'You' : 'AI explanation'}
                </span>
                {m.content ? (
                  <Markdown
                    components={{
                      a: ({ children }) => <span>{children}</span>,
                      img: () => null,
                    }}
                  >
                    {m.content}
                  </Markdown>
                ) : (
                  <p className="muted">Thinking about this trace…</p>
                )}
              </article>
            ))}
          </div>
          {error && (
            <p className="product-error" role="alert">
              {error}
            </p>
          )}
          {phase === 'ready' && (
            <a
              className="verified-reference"
              href={facts.source.url}
              target="_blank"
              rel="noreferrer"
            >
              {facts.source.label} ↗
            </a>
          )}
        </div>
        <div className="assistant-compose">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
          >
            <label htmlFor="assistant-question" className="sr-only">
              Ask about this trace
            </label>
            <Textarea
              id="assistant-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={MAX_QUESTION_CHARS}
              disabled={phase !== 'ready' || busy}
              placeholder="Ask about this trace…"
              rows={3}
            />
            <div className="compose-actions">
              <span>
                {busy
                  ? 'Generating on your device…'
                  : `${question.length} / ${MAX_QUESTION_CHARS}`}
              </span>
              {busy ? (
                <Button type="button" variant="outline" onClick={stop}>
                  <Square size={14} />
                  Stop
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={phase !== 'ready' || !question.trim()}
                  aria-label="Send question"
                >
                  <ArrowUp size={17} />
                </Button>
              )}
            </div>
          </form>
          <p className="ai-disclaimer">
            AI explanations can be wrong. Check the verified state and
            reference. Chats are temporary; copy useful insights into saved
            notes.
          </p>
          {phase === 'ready' && (
            <div className="model-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  stop();
                  setConversation({ key: '', messages: [] });
                }}
              >
                <RefreshCw size={13} />
                New conversation
              </Button>
              <Button variant="ghost" onClick={() => void removeModel()}>
                <Trash2 size={13} />
                Remove model
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
