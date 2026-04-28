import { Database, Network, Sparkles } from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Multi-model chat',
    body: 'Ask Anthropic, OpenAI, OpenRouter and Grok the same question side-by-side. Compare answers, cite sources, and pick a winner.',
  },
  {
    icon: Network,
    title: 'Graph-aware',
    body: 'Neo4j AuraDB powers the dataset graph. Every response can be anchored to structured nodes and citations, not just text.',
  },
  {
    icon: Database,
    title: 'MongoDB-backed',
    body: 'Sessions, chats, preferences, and usage metrics persist across devices in MongoDB Atlas — not your browser cache.',
  },
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            'radial-gradient(60% 50% at 70% 20%, rgba(107, 92, 231, 0.25) 0%, rgba(107, 92, 231, 0) 60%), radial-gradient(40% 40% at 20% 80%, rgba(244, 162, 97, 0.18) 0%, rgba(244, 162, 97, 0) 60%)',
        }}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-16 pb-24 sm:px-6 lg:px-8 lg:pt-24">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 items-center gap-2 rounded-pill bg-bg-secondary/80 px-3 font-mono text-xs uppercase tracking-[0.14em] text-fg-muted ring-1 ring-inset ring-border/70">
            <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
            Production · Dobeu Tech Solutions
          </span>
        </div>

        <div className="max-w-3xl space-y-6">
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-fg-primary md:text-6xl">
            A knowledgeable friend for <span className="gradient-heading">statistical research</span>.
          </h1>
          <p className="text-lg leading-relaxed text-fg-body md:text-xl">
            StatMiner aggregates the best language models and authoritative statistical datasets into a single
            workspace. Ask a question, get multiple answers, and follow the graph to the source.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#workspace" className="cta inline-flex items-center gap-2">
              Open workspace
              <span aria-hidden>→</span>
            </a>
            <a
              href="https://github.com/dobeutech/statminer"
              target="_blank"
              rel="noreferrer"
              className="cta-secondary"
            >
              View on GitHub
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="surface p-5">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-tintIndigo text-brand-indigo">
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </div>
              <h3 className="mb-1 text-lg font-bold text-fg-primary">{title}</h3>
              <p className="text-sm text-fg-body">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default LandingHero;
