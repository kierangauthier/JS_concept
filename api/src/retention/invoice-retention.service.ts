import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// One day in ms. The retention job is cheap, so running it daily is fine and
// avoids pulling an extra dependency (@nestjs/schedule) just for a single cron.
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * I8 — French 10-year invoice retention (Code de commerce L.123-22).
 *
 * Every month we:
 *   1. flag invoices emitted more than 9 years ago as `archivalPending` so
 *      ops can export them to cold storage BEFORE the 10-year mark;
 *   2. report any invoice older than 10y that is still alive in the DB —
 *      these should have been archived & soft-deleted by now;
 *   3. never delete anything automatically — the actual purge is a manual
 *      decision that requires legal sign-off.
 *
 * Triggered by `@nestjs/schedule`. Can also be invoked manually via
 * `enforceRetention()` for testing or ad-hoc runs.
 */
@Injectable()
export class InvoiceRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceRetentionService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Run once at startup (after the DB is ready), then every 24h.
    // A first run on boot catches invoices that entered the window while
    // the service was down, without waiting for the next scheduled pass.
    setTimeout(() => this.enforceRetention().catch((e) => this.logger.error(e)), 60_000);
    this.timer = setInterval(
      () => this.enforceRetention().catch((e) => this.logger.error(e)),
      RUN_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async enforceRetention(): Promise<{
    flagged: number;
    overdue: number;
  }> {
    const now = new Date();
    const nineYears = this.yearsAgo(now, 9);
    const tenYears = this.yearsAgo(now, 10);

    // Phase 1: flag invoices that entered their final retention year.
    const flaggedResult = await this.prisma.invoice.updateMany({
      where: {
        issuedAt: { lte: nineYears },
        archivalPending: false,
        archivedAt: null,
      },
      data: { archivalPending: true },
    });

    // Phase 2: surface invoices that are past the 10y mark and still active.
    // We do NOT delete — purging is a manual operation requiring compliance
    // sign-off — but we log loudly so ops notices.
    const overdue = await this.prisma.invoice.count({
      where: {
        issuedAt: { lte: tenYears },
        archivedAt: null,
        deletedAt: null,
      },
    });

    if (overdue > 0) {
      this.logger.warn(
        `[Retention] ${overdue} invoice(s) are past the 10-year window and have not yet been archived. Manual action required.`,
      );
    }

    this.logger.log(
      `[Retention] flagged=${flaggedResult.count}, overdue=${overdue}, runAt=${now.toISOString()}`,
    );

    return { flagged: flaggedResult.count, overdue };
  }

  private yearsAgo(from: Date, years: number): Date {
    const d = new Date(from);
    d.setFullYear(d.getFullYear() - years);
    return d;
  }
}
