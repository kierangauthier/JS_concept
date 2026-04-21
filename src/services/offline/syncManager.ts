import { offlineDb, QueuedMutation } from './db';
import { jobsApi } from '../api/jobs.api';
import { http } from '../api/http';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'auth_required';

export interface SyncStatus {
  state: SyncState;
  progress?: number;
  total?: number;
  pendingCount?: number;
  lastSyncAt?: number;
}

class SyncManager {
  private syncing = false;
  private listeners = new Set<(s: SyncStatus) => void>();

  subscribe(fn: (s: SyncStatus) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(status: SyncStatus) {
    this.listeners.forEach((fn) => fn(status));
  }

  async getPendingCount(): Promise<number> {
    return offlineDb.mutations
      .where('status')
      .anyOf('pending', 'failed')
      .count();
  }

  /** Count of mutations that exhausted their retries (status = 'failed'). */
  async getFailedCount(): Promise<number> {
    return offlineDb.mutations.where('status').equals('failed').count();
  }

  async getLastSync(): Promise<number | null> {
    const meta = await offlineDb.meta.get('lastSync');
    return meta?.value ?? null;
  }

  async syncAll(): Promise<{ success: number; failed: number; total: number }> {
    if (this.syncing) return { success: 0, failed: 0, total: 0 };
    this.syncing = true;

    // 1. Try auth refresh
    try {
      await silentRefreshForSync();
    } catch {
      this.syncing = false;
      this.notify({ state: 'auth_required' });
      return { success: 0, failed: 0, total: 0 };
    }

    // 2. Process FIFO — only `pending` mutations. `failed` ones (≥ 3 retries)
    //    are kept as a dead-letter queue so the user can inspect them and
    //    retry manually from /terrain/queue instead of being hammered every
    //    background sync.
    const pending = await offlineDb.mutations
      .where('status')
      .equals('pending')
      .sortBy('createdAt');

    const total = pending.length;
    if (total === 0) {
      this.syncing = false;
      this.notify({ state: 'synced', pendingCount: 0, lastSyncAt: Date.now() });
      await offlineDb.meta.put({ key: 'lastSync', value: Date.now() });
      return { success: 0, failed: 0, total: 0 };
    }

    let success = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i++) {
      this.notify({ state: 'syncing', progress: i + 1, total });
      const m = pending[i];

      try {
        await offlineDb.mutations.update(m.id, { status: 'syncing' });
        await this.syncOne(m);
        await offlineDb.mutations.update(m.id, { status: 'done' });
        // Clean up blob if exists
        if (m.blobKey) {
          await offlineDb.blobs.delete(m.blobKey).catch(() => {});
        }
        success++;
      } catch (err: any) {
        const retries = m.retries + 1;
        const becameFailed = retries >= 3;
        await offlineDb.mutations.update(m.id, {
          status: becameFailed ? 'failed' : 'pending',
          retries,
          errorMessage: err.message,
        });
        if (becameFailed) {
          // Surface the dead-letter event once so the user knows to inspect
          // the queue — otherwise the mutation would stop being retried
          // silently and the saved work could be forgotten.
          try {
            const { toast } = await import('sonner');
            toast.error(
              `Synchronisation impossible (${m.type}) — voir la file d'attente`,
              { duration: 8000 },
            );
          } catch { /* sonner unavailable */ }
        }
        failed++;
      }
    }

    // 3. Cleanup done > 24h
    const cutoff = Date.now() - 86400000;
    await offlineDb.mutations
      .where('status')
      .equals('done')
      .filter((m) => m.createdAt < cutoff)
      .delete();

    // 4. Refresh cache
    try {
      await this.refreshCache();
    } catch {}

    this.syncing = false;
    const pendingCount = await this.getPendingCount();
    this.notify({
      state: failed > 0 ? 'error' : 'synced',
      pendingCount,
      lastSyncAt: Date.now(),
    });
    await offlineDb.meta.put({ key: 'lastSync', value: Date.now() });

    return { success, failed, total };
  }

  async retryOne(id: string): Promise<boolean> {
    const m = await offlineDb.mutations.get(id);
    if (!m || m.status === 'syncing') return false;

    try {
      await silentRefreshForSync();
    } catch {
      this.notify({ state: 'auth_required' });
      return false;
    }

    try {
      await offlineDb.mutations.update(id, { status: 'syncing' });
      await this.syncOne(m);
      await offlineDb.mutations.update(id, { status: 'done' });
      if (m.blobKey) await offlineDb.blobs.delete(m.blobKey).catch(() => {});
      return true;
    } catch (err: any) {
      const retries = m.retries + 1;
      await offlineDb.mutations.update(id, {
        status: retries >= 3 ? 'failed' : 'pending',
        retries,
        errorMessage: err.message,
      });
      return false;
    }
  }

  async deleteOne(id: string): Promise<void> {
    const m = await offlineDb.mutations.get(id);
    if (m?.blobKey) await offlineDb.blobs.delete(m.blobKey).catch(() => {});
    await offlineDb.mutations.delete(id);
  }

  /** Re-queue every failed mutation for another round of attempts. */
  async retryAllFailed(): Promise<number> {
    const failed = await offlineDb.mutations.where('status').equals('failed').toArray();
    if (failed.length === 0) return 0;
    await offlineDb.mutations
      .where('status')
      .equals('failed')
      .modify({ status: 'pending', retries: 0, errorMessage: undefined });
    return failed.length;
  }

  private async syncOne(m: QueuedMutation) {
    const headers: Record<string, string> = {
      'X-Idempotency-Key': m.idempotencyKey,
    };

    switch (m.type) {
      case 'photo':
        return this.syncPhoto(m);
      case 'signature':
        return this.syncSignature(m);
      default:
        return http.post(m.endpoint, m.payload);
    }
  }

  private async syncPhoto(m: QueuedMutation) {
    const stored = m.blobKey ? await offlineDb.blobs.get(m.blobKey) : null;
    if (!stored) throw new Error('Photo introuvable en stockage local');

    const { uploadUrl, storageKey } = await jobsApi.presignPhoto(m.payload.jobId, {
      filename: stored.filename,
      contentType: stored.contentType,
    });
    await fetch(uploadUrl, { method: 'PUT', body: stored.blob });
    await jobsApi.createPhoto(m.payload.jobId, {
      storageKey,
      filename: stored.filename,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
    });
  }

  private async syncSignature(m: QueuedMutation) {
    const stored = m.blobKey ? await offlineDb.blobs.get(m.blobKey) : null;
    if (!stored) throw new Error('Signature introuvable');

    // Upload signature via the existing signature endpoint
    const tokens = JSON.parse(localStorage.getItem('cm_tokens') ?? '{}');
    const companyScope = localStorage.getItem('cm_company') ?? '';
    const res = await fetch(`/api/signatures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
        ...(companyScope ? { 'X-Company-Id': companyScope } : {}),
      },
      body: JSON.stringify({
        jobId: m.payload.jobId,
        interventionDate: m.payload.interventionDate,
        signatoryName: m.payload.signatoryName,
      }),
    });
    if (!res.ok) throw new Error('Erreur creation signature');

    const { presignedUrl } = await res.json();
    if (presignedUrl) {
      await fetch(presignedUrl, { method: 'PUT', body: stored.blob });
    }
  }

  private async refreshCache() {
    // Invalidate stale cache entries
    const now = Date.now();
    await offlineDb.cache.filter((c) => c.expiresAt < now).delete();
  }
}

async function silentRefreshForSync(): Promise<void> {
  const raw = localStorage.getItem('cm_tokens');
  if (!raw) throw new Error('No tokens');
  const tokens = JSON.parse(raw);
  if (!tokens.refreshToken) throw new Error('No refresh token');

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  localStorage.setItem(
    'cm_tokens',
    JSON.stringify({ accessToken: data.accessToken, refreshToken: data.refreshToken }),
  );
}

export const syncManager = new SyncManager();
