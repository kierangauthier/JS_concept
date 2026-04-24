import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

type ProbeStatus = 'ok' | 'degraded' | 'down';

interface Probe {
  status: ProbeStatus;
  /** Latency in ms for the probe itself (if measurable). */
  latencyMs?: number;
  /** Sanitised error message, only set when status !== 'ok'. */
  detail?: string;
}

interface HealthPayload {
  status: ProbeStatus;
  timestamp: string;
  uptimeSec: number;
  version: string;
  checks: {
    database: Probe;
  };
}

/**
 * V3.7 — Health endpoint used by ops / probes / the Dashboard.
 *
 * `/api/health`  → lightweight liveness (always returns 200 if the process is up).
 * `/api/ready`   → readiness probe; actively checks the database and returns
 *                  503 when a critical dependency is unreachable.
 *
 * We deliberately avoid probing Anthropic / MinIO / SMTP here — they are
 * optional and a transient outage on one of them shouldn't flap the readiness
 * of the whole app. Extend as needed.
 */
@Controller('api')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
    };
  }

  @Public()
  @Get('ready')
  async ready(): Promise<HealthPayload> {
    const database = await this.probeDatabase();
    const overall: ProbeStatus = database.status === 'ok' ? 'ok' : 'down';
    return {
      status: overall,
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      version: process.env.APP_VERSION ?? 'dev',
      checks: { database },
    };
  }

  private async probeDatabase(): Promise<Probe> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err: any) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        // Never echo raw DB errors — they often contain host / credentials.
        detail: err?.code ?? 'unreachable',
      };
    }
  }
}
