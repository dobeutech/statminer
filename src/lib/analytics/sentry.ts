import * as Sentry from '@sentry/nextjs';

let initialized = false;

export function initSentry() {
  if (initialized) return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });

  initialized = true;
}

export { Sentry };
