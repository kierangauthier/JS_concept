/**
 * A2 — Rate limiting configuration.
 *
 * By default the in-memory storage (per-instance, per-process) is used. If
 * `REDIS_URL` is set, requests are counted in Redis instead so rate limits
 * apply globally across all API replicas. This makes the limiter
 * effective in horizontally-scaled production (K8s, ECS, fly.io) without
 * forcing a new dependency on the pilot / dev environments.
 *
 * The Redis packages are loaded lazily via `require()` so the API still
 * boots when `ioredis` / `@nest-lab/throttler-storage-redis` aren't
 * installed (e.g. if a dev skipped `npm install`).
 */

export interface ThrottlerModuleOptions {
  throttlers: Array<{ ttl: number; limit: number }>;
  storage?: unknown;
}

const DEFAULT_THROTTLERS = [{ ttl: 60_000, limit: 100 }];

export function buildThrottlerConfig(): ThrottlerModuleOptions {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    return { throttlers: DEFAULT_THROTTLERS };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ThrottlerStorageRedisService } = require(
      '@nest-lab/throttler-storage-redis',
    );

    const client = new Redis(redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
    client.on('error', (err: Error) => {
      // Don't crash the API on Redis hiccups — fall back silently to local.
      console.error('[Throttler] Redis error:', err.message);
    });

    // eslint-disable-next-line no-console
    console.log(`[Throttler] Using Redis storage (${maskUrl(redisUrl)})`);
    return {
      throttlers: DEFAULT_THROTTLERS,
      storage: new ThrottlerStorageRedisService(client),
    };
  } catch (err: any) {
    console.warn(
      `[Throttler] REDIS_URL set but ioredis/@nest-lab/throttler-storage-redis unavailable — falling back to in-memory. (${err?.message ?? err})`,
    );
    return { throttlers: DEFAULT_THROTTLERS };
  }
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return url.replace(/:[^:@]*@/, ':***@');
  }
}
