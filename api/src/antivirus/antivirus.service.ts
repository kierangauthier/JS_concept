import {
  Global,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Antivirus scanning for user uploads.
 *
 * Deployment:
 *   1. Run a ClamAV daemon reachable from the API.
 *   2. Set `CLAMAV_HOST` (and optionally `CLAMAV_PORT`).
 *   3. `npm install` (clamscan is already declared).
 *
 * Policy:
 *   - `ANTIVIRUS_FAIL_CLOSED=true`  → no scanner or scanner error → reject the upload.
 *   - `ANTIVIRUS_FAIL_CLOSED=false` → pass unscanned uploads through (dev only).
 *   - Default: true in production, false otherwise.
 */
@Global()
@Injectable()
export class AntivirusService implements OnModuleInit {
  private readonly logger = new Logger(AntivirusService.name);
  private scanner: any = null;
  private enabled = false;

  private readonly failClosed =
    (
      process.env.ANTIVIRUS_FAIL_CLOSED ??
      (process.env.NODE_ENV === 'production' ? 'true' : 'false')
    ) === 'true';

  async onModuleInit() {
    const host = process.env.CLAMAV_HOST?.trim();
    if (!host) {
      const msg = '[Antivirus] CLAMAV_HOST not set';
      if (this.failClosed) {
        this.logger.error(msg + ' — fail-closed: uploads will be rejected');
      } else {
        this.logger.warn(msg + ' — fail-open: uploads pass through unscanned');
      }
      return;
    }
    const port = parseInt(process.env.CLAMAV_PORT || '3310', 10);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const NodeClam = require('clamscan');
      this.scanner = await new NodeClam().init({
        debug_mode: false,
        clamdscan: {
          host,
          port,
          timeout: 30_000,
          local_fallback: false,
        },
      });
      this.enabled = true;
      this.logger.log(`[Antivirus] ClamAV scanner ready at ${host}:${port}`);
    } catch (err: any) {
      const msg = `[Antivirus] Failed to initialise ClamAV (${err?.message ?? err})`;
      if (this.failClosed) {
        this.logger.error(msg + ' — fail-closed: uploads will be rejected');
      } else {
        this.logger.warn(msg + ' — fail-open: uploads pass through unscanned');
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Scans a file buffer. Resolves `{ clean: true }` when safe.
   *  - Infection → 400.
   *  - Scanner unavailable or errors → 503 when fail-closed, pass-through otherwise.
   */
  async scanBuffer(
    buffer: Buffer,
    originalName = 'upload',
  ): Promise<{ clean: true }> {
    if (!this.enabled || !this.scanner) {
      if (this.failClosed) {
        throw new ServiceUnavailableException(
          'Analyse antivirus indisponible — upload refusé',
        );
      }
      return { clean: true };
    }

    try {
      const { isInfected, viruses } = await this.scanner.scanBuffer(
        buffer,
        3,
        1024 * 1024,
      );
      if (isInfected) {
        this.logger.warn(
          `[Antivirus] Rejected ${originalName}: ${viruses?.join(', ') ?? 'unknown threat'}`,
        );
        const err: any = new Error(
          `Fichier rejeté — menace détectée (${viruses?.join(', ') ?? 'virus'})`,
        );
        err.status = 400;
        throw err;
      }
      return { clean: true };
    } catch (err: any) {
      if (err?.status === 400) throw err;
      this.logger.error(`[Antivirus] Scanner error: ${err?.message ?? err}`);
      if (this.failClosed) {
        throw new ServiceUnavailableException(
          'Analyse antivirus en erreur — upload refusé',
        );
      }
      return { clean: true };
    }
  }
}
