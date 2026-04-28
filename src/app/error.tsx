'use client';

import { useEffect } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[statminer:error-boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-6 text-fg-body">
      <div className="surface w-full max-w-md space-y-4 p-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-status-error/15 text-status-error">
          <AlertOctagon className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-extrabold text-fg-primary">Something broke.</h1>
        <p className="text-sm text-fg-body">
          The workspace hit an unexpected error. You can try again, or come back in a moment.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-fg-muted">ref: {error.digest}</p>
        )}
        <button type="button" onClick={reset} className="cta inline-flex items-center gap-2">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    </div>
  );
}
