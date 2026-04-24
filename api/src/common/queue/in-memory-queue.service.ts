import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { EnqueueOptions, JobContext, JobHandler, JobQueue } from './queue.types';

interface Tracked {
  name: string;
  id: string;
  attempt: number;
  attempts: number;
  backoffBaseMs: number;
  idempotencyKey?: string;
  promise: Promise<void>;
}

/**
 * In-process queue. Good for a single-node deployment with a handful of
 * background tasks. For multi-node or persistence guarantees, swap for a
 * BullMQ implementation — the interface is identical.
 */
@Injectable()
export class InMemoryQueueService implements JobQueue, OnModuleDestroy {
  private readonly logger = new Logger(InMemoryQueueService.name);
  private readonly handlers = new Map<string, JobHandler<unknown>>();
  private readonly active = new Map<string, Tracked>();
  private readonly pendingKeys = new Set<string>();

  register<T>(name: string, handler: JobHandler<T>): void {
    if (this.handlers.has(name)) {
      throw new Error(`[Queue] A handler is already registered for "${name}"`);
    }
    this.handlers.set(name, handler as JobHandler<unknown>);
  }

  async enqueue<T>(name: string, payload: T, opts: EnqueueOptions = {}): Promise<string> {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`[Queue] No handler registered for "${name}"`);
    }
    if (opts.idempotencyKey && this.pendingKeys.has(opts.idempotencyKey)) {
      this.logger.debug(`[Queue] skipped duplicate (${name}, key=${opts.idempotencyKey})`);
      // Return an id so callers can still reference the pending job.
      for (const t of this.active.values()) {
        if (t.idempotencyKey === opts.idempotencyKey) return t.id;
      }
    }

    const id = randomUUID();
    const attempts = Math.max(1, opts.attempts ?? 3);
    const backoffBaseMs = Math.max(10, opts.backoffBaseMs ?? 1000);

    const tracked: Tracked = {
      name,
      id,
      attempt: 0,
      attempts,
      backoffBaseMs,
      idempotencyKey: opts.idempotencyKey,
      promise: Promise.resolve(),
    };

    tracked.promise = this.run(tracked, handler, payload);
    this.active.set(id, tracked);
    if (tracked.idempotencyKey) this.pendingKeys.add(tracked.idempotencyKey);
    return id;
  }

  async drain(): Promise<void> {
    const promises = Array.from(this.active.values()).map((t) => t.promise);
    await Promise.allSettled(promises);
  }

  async onModuleDestroy(): Promise<void> {
    await this.drain();
  }

  private async run<T>(
    tracked: Tracked,
    handler: JobHandler<T>,
    payload: T,
  ): Promise<void> {
    try {
      for (let attempt = 1; attempt <= tracked.attempts; attempt++) {
        tracked.attempt = attempt;
        try {
          const ctx: JobContext<T> = { payload, attempt };
          await handler(ctx);
          return; // success — done
        } catch (err: any) {
          if (attempt >= tracked.attempts) {
            this.logger.error(
              `[Queue] Job ${tracked.name}#${tracked.id} failed after ${tracked.attempts} attempts: ${err?.message ?? err}`,
            );
            throw err;
          }
          const delay = tracked.backoffBaseMs * 2 ** (attempt - 1);
          this.logger.warn(
            `[Queue] Job ${tracked.name}#${tracked.id} attempt ${attempt} failed (${err?.message ?? err}). Retrying in ${delay}ms`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    } catch {
      // Swallowed — already logged, and jobs are fire-and-forget by design.
    } finally {
      this.active.delete(tracked.id);
      if (tracked.idempotencyKey) this.pendingKeys.delete(tracked.idempotencyKey);
    }
  }
}
