/**
 * V3r — Sentry integration — optional and lazy.
 *
 * We don't declare `@sentry/node` as a hard dependency (keeping the
 * install light for deployments that don't need it). If `SENTRY_DSN` is set
 * AND the package is installed at runtime, we initialise it; otherwise the
 * function is a no-op and logs a friendly hint.
 *
 * To enable in production:
 *   npm install @sentry/node
 *   export SENTRY_DSN=https://...@sentry.io/123
 *
 * Call `initSentry()` from `bootstrap()` before app.listen().
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SentryModule = any;

export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    // Dynamic require so the build doesn't fail when the package is absent.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry: SentryModule = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.APP_VERSION,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
      sendDefaultPii: false,
    });
    // eslint-disable-next-line no-console
    console.log('[Sentry] initialised');
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Sentry] SENTRY_DSN is set but @sentry/node is not installed — install it to enable error reporting. (${e?.message ?? e})`,
    );
  }
}
