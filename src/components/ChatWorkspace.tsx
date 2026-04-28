'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, Sparkles, AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import clsx from 'clsx';

type ProviderId = 'anthropic' | 'openai' | 'openrouter' | 'grok';

interface ProviderMeta {
  id: ProviderId;
  name: string;
  model: string;
  tagline: string;
}

const PROVIDERS: ProviderMeta[] = [
  { id: 'anthropic', name: 'Claude', model: 'claude-3-5-sonnet-latest', tagline: 'Anthropic · reasoning & long context' },
  { id: 'openai', name: 'GPT-4o', model: 'gpt-4o', tagline: 'OpenAI · general-purpose' },
  { id: 'openrouter', name: 'OpenRouter', model: 'anthropic/claude-3.5-sonnet', tagline: 'Unified access, fallback' },
  { id: 'grok', name: 'Grok', model: 'grok-4', tagline: 'xAI · alternative perspective' },
];

interface TurnAnswer {
  providerId: ProviderId;
  content: string;
  done: boolean;
  error?: string;
  latencyMs?: number;
}

interface Turn {
  id: string;
  userMessage: string;
  answers: Record<string, TurnAnswer>;
  createdAt: number;
}

export default function ChatWorkspace() {
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<Set<ProviderId>>(new Set(['anthropic']));
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/providers')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setAvailability(data.available ?? {}))
      .catch(() => setAvailability({}));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const toggleProvider = useCallback((id: ProviderId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const canSend = useMemo(() => {
    return input.trim().length > 0 && selected.size > 0 && !isSending;
  }, [input, selected, isSending]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const message = input.trim();
    const providers = Array.from(selected);
    const turnId = `t-${Date.now()}`;
    const startedAt = Date.now();

    const initialAnswers: Record<string, TurnAnswer> = {};
    providers.forEach((p) => {
      initialAnswers[p] = { providerId: p, content: '', done: false };
    });

    setTurns((prev) => [
      ...prev,
      { id: turnId, userMessage: message, answers: initialAnswers, createdAt: startedAt },
    ]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, providers }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const raw = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf('\n\n');
          if (!raw.startsWith('data:')) continue;
          const payload = raw.replace(/^data:\s*/, '');
          if (payload === '[DONE]') continue;
          try {
            const event = JSON.parse(payload) as {
              providerId: ProviderId;
              type: 'chunk' | 'complete' | 'error';
              chunk?: string;
              error?: string;
              latencyMs?: number;
            };
            setTurns((prev) =>
              prev.map((t) => {
                if (t.id !== turnId) return t;
                const existing = t.answers[event.providerId] ?? {
                  providerId: event.providerId,
                  content: '',
                  done: false,
                };
                if (event.type === 'chunk' && event.chunk) {
                  return {
                    ...t,
                    answers: {
                      ...t.answers,
                      [event.providerId]: {
                        ...existing,
                        content: existing.content + event.chunk,
                      },
                    },
                  };
                }
                if (event.type === 'complete') {
                  return {
                    ...t,
                    answers: {
                      ...t.answers,
                      [event.providerId]: {
                        ...existing,
                        done: true,
                        latencyMs: event.latencyMs,
                      },
                    },
                  };
                }
                if (event.type === 'error') {
                  return {
                    ...t,
                    answers: {
                      ...t.answers,
                      [event.providerId]: {
                        ...existing,
                        done: true,
                        error: event.error,
                      },
                    },
                  };
                }
                return t;
              })
            );
          } catch {
            // ignore malformed frame
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? {
                ...t,
                answers: Object.fromEntries(
                  Object.entries(t.answers).map(([k, v]) => [
                    k,
                    { ...v, done: true, error: v.done ? v.error : message },
                  ])
                ),
              }
            : t
        )
      );
    } finally {
      setIsSending(false);
    }
  }, [canSend, input, selected]);

  return (
    <div className="grid grid-cols-1 gap-6 py-10 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <p className="label font-mono text-[11px] uppercase tracking-[0.14em] text-fg-muted">
          Models
        </p>
        {PROVIDERS.map((p) => {
          const isOn = selected.has(p.id);
          const isAvailable = availability[p.id] !== false;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleProvider(p.id)}
              disabled={!isAvailable}
              className={clsx(
                'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition',
                isOn
                  ? 'border-brand-indigo bg-bg-tintIndigo/70 shadow-ring-indigo'
                  : 'border-border/70 bg-bg-secondary hover:border-brand-indigo/50',
                !isAvailable && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={clsx(
                  'mt-1 h-2.5 w-2.5 rounded-full',
                  isOn ? 'bg-brand-indigo' : 'bg-fg-muted/60'
                )}
                aria-hidden
              />
              <span className="flex-1">
                <span className="block text-sm font-bold text-fg-primary">{p.name}</span>
                <span className="block text-xs text-fg-muted">{p.tagline}</span>
                <span className="mt-1 block font-mono text-[11px] text-fg-muted">{p.model}</span>
                {!isAvailable && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-pill bg-status-warning/15 px-2 py-0.5 text-[10px] text-status-warning">
                    <AlertCircle className="h-3 w-3" />
                    No API key
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </aside>

      <section className="flex min-h-[60vh] flex-col">
        <div className="surface flex-1 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-amber" aria-hidden />
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-fg-muted">
                Conversation
              </h2>
            </div>
            <span className="font-mono text-xs text-fg-muted">
              {turns.length} turn{turns.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex h-[55vh] flex-col gap-6 overflow-y-auto px-5 py-5">
            {turns.length === 0 && <EmptyState />}
            {turns.map((turn) => (
              <TurnView key={turn.id} turn={turn} providers={PROVIDERS} />
            ))}
            <div ref={endRef} />
          </div>
        </div>

        <div className="mt-4 flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            placeholder="Ask a statistical question. Shift+Enter for newline."
            className="input min-h-[52px] resize-none"
            disabled={isSending}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="cta inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Send</span>
          </button>
        </div>
        {selected.size === 0 && (
          <p className="mt-2 text-xs text-status-warning">Select at least one model to send a message.</p>
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-fg-muted">
      <Sparkles className="h-8 w-8 text-brand-amber" aria-hidden />
      <p className="text-lg font-bold text-fg-primary">Ready when you are.</p>
      <p className="max-w-md text-sm">
        Ask a statistical or research question. Each selected model answers in parallel, streamed token-by-token.
      </p>
    </div>
  );
}

function TurnView({ turn, providers }: { turn: Turn; providers: ProviderMeta[] }) {
  return (
    <article className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-brand-indigo/15 font-mono text-[11px] font-bold uppercase text-brand-indigo">
          You
        </span>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-fg-primary">
          {turn.userMessage}
        </p>
      </div>
      <div
        className={clsx(
          'grid gap-3',
          Object.keys(turn.answers).length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'
        )}
      >
        {Object.values(turn.answers).map((answer) => {
          const meta = providers.find((p) => p.id === answer.providerId);
          return (
            <AnswerCard key={answer.providerId} answer={answer} meta={meta} />
          );
        })}
      </div>
    </article>
  );
}

function AnswerCard({
  answer,
  meta,
}: {
  answer: TurnAnswer;
  meta: ProviderMeta | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const isStreaming = !answer.done;

  const copy = () => {
    navigator.clipboard?.writeText(answer.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="surface flex flex-col gap-2 p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-pill bg-bg-tintIndigo px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-link">
            {meta?.name ?? answer.providerId}
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-fg-muted">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          )}
          {answer.latencyMs && answer.done && !answer.error && (
            <span className="font-mono text-[10px] text-fg-muted">
              {(answer.latencyMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>
        {answer.content && (
          <button
            type="button"
            onClick={copy}
            className="text-fg-muted transition hover:text-fg-primary"
            aria-label="Copy response"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        )}
      </header>
      {answer.error ? (
        <div className="flex items-start gap-2 rounded-md bg-status-error/10 p-3 text-sm text-status-error">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{answer.error}</span>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-fg-body">
          {answer.content || (isStreaming ? '' : '—')}
        </p>
      )}
    </div>
  );
}
