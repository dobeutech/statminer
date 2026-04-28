export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary">
      <div className="flex items-center gap-2 text-fg-muted">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="ml-3 font-mono text-sm uppercase tracking-[0.14em]">Loading</span>
      </div>
    </div>
  );
}
