/**
 * V3r — Job queue abstraction.
 *
 * The product doesn't have Redis in its deployment yet, so we expose an
 * abstraction that works in-process by default (Promise-based, with retry
 * and back-off). When the ops team deploys Redis, swap the implementation
 * for a BullMQ-backed one — call sites (mail, pdf, ai, export) stay
 * unchanged because they only depend on the `JobQueue` interface.
 */

export interface JobContext<TPayload> {
  /** The payload provided at enqueue time. */
  readonly payload: TPayload;
  /** Current attempt number, starting at 1. */
  readonly attempt: number;
}

export type JobHandler<TPayload> = (ctx: JobContext<TPayload>) => Promise<void> | void;

export interface EnqueueOptions {
  /**
   * Max number of attempts before the job is declared failed. The handler
   * is called `attempts` times; a successful run stops the loop.
   * Default: 3.
   */
  attempts?: number;
  /**
   * Base delay in ms between retries. The implementation applies an
   * exponential backoff: delay × 2^(attempt-1). Default: 1000ms.
   */
  backoffBaseMs?: number;
  /**
   * Stable idempotency key. When set, subsequent enqueues with the same key
   * while an earlier job is still pending are deduplicated (no-op).
   */
  idempotencyKey?: string;
}

export interface JobQueue {
  /**
   * Register a handler. `name` is the logical queue (e.g. 'mail.send').
   * Handlers are singletons; calling register twice for the same name
   * throws to catch accidental double-wiring.
   */
  register<T>(name: string, handler: JobHandler<T>): void;

  /**
   * Enqueue a job. Returns the job id. The returned promise resolves as
   * soon as the job is accepted (fire-and-forget), NOT when it is done.
   */
  enqueue<T>(name: string, payload: T, opts?: EnqueueOptions): Promise<string>;

  /**
   * Wait for every currently-known job to finish or fail. Useful for
   * graceful shutdown (onModuleDestroy) and for tests.
   */
  drain(): Promise<void>;
}
