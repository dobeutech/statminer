import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { LandingHero } from '@/components/LandingHero';

const ChatWorkspace = dynamic(() => import('@/components/ChatWorkspace'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] items-center justify-center text-fg-muted">
      <div className="flex items-center gap-2">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="ml-3 font-mono text-sm">Loading workspace…</span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg-primary text-fg-body">
      <LandingHero />
      <section id="workspace" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <Suspense>
          <ChatWorkspace />
        </Suspense>
      </section>
      <footer className="border-t border-border/60 bg-bg-secondary/50">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 px-4 py-8 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p className="text-sm text-fg-muted">
            Built by{' '}
            <a
              href="https://dobeu.tech"
              target="_blank"
              rel="noreferrer"
              className="text-fg-link underline-offset-4 hover:underline"
            >
              Dobeu Tech Solutions
            </a>
            . StatMiner is an open, multi-model data aggregator.
          </p>
          <p className="font-mono text-xs text-fg-muted">v0.1.0 · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  );
}
