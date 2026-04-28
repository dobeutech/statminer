import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-primary p-6 text-fg-body">
      <div className="surface w-full max-w-md space-y-4 p-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-indigo/15 text-brand-indigo">
          <Compass className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-extrabold text-fg-primary">No such page.</h1>
        <p className="text-sm text-fg-body">
          The URL you followed doesn&apos;t exist yet, or it moved. Head back to the workspace.
        </p>
        <Link href="/" className="cta inline-flex items-center gap-2">
          Back to StatMiner
        </Link>
      </div>
    </main>
  );
}
