import { useQuery, useMutation } from '@tanstack/react-query';
import { offlineDb, QueuedMutation } from './db';
import { useNetworkStatus } from './networkStatus';
import { toast } from 'sonner';

/**
 * Read data with offline cache fallback.
 * When online: fetches from API, caches in IndexedDB.
 * When offline: reads from IndexedDB cache.
 */
export function useOfflineQuery<T>(
  key: string,
  queryKey: any[],
  apiFn: () => Promise<T>,
  ttlMs = 86400000,
) {
  const isOnline = useNetworkStatus();

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (isOnline) {
        try {
          const data = await apiFn();
          await offlineDb.cache.put({
            key,
            data,
            cachedAt: Date.now(),
            expiresAt: Date.now() + ttlMs,
          });
          return data;
        } catch {
          // Fallback to cache on network error
          const cached = await offlineDb.cache.get(key);
          if (cached) return cached.data as T;
          throw new Error('Reseau indisponible, pas de cache');
        }
      }
      // Offline: read from cache
      const cached = await offlineDb.cache.get(key);
      if (cached) return cached.data as T;
      throw new Error('Aucune donnee en cache');
    },
    staleTime: isOnline ? 30_000 : Infinity,
    retry: isOnline ? 3 : 0,
  });
}

/**
 * Mutation that works offline by queuing to IndexedDB.
 * When online: executes immediately.
 * When offline: stores in queue, shows toast.
 */
export function useOfflineMutation<T, P>(
  type: QueuedMutation['type'],
  endpoint: string,
  apiFn: (p: P) => Promise<T>,
  opts?: { jobId?: string },
) {
  const isOnline = useNetworkStatus();

  return useMutation({
    mutationFn: async (payload: P) => {
      if (isOnline) {
        try {
          return await apiFn(payload);
        } catch (err: any) {
          // If network error while supposedly online, queue it
          if (err.message?.includes('fetch') || err.message?.includes('network')) {
            await queueMutation(type, endpoint, payload, opts?.jobId);
            toast.info('Sauvegarde hors-ligne');
            return null as any;
          }
          throw err;
        }
      }

      await queueMutation(type, endpoint, payload, opts?.jobId);
      toast.info('Sauvegarde hors-ligne');
      return null as any;
    },
  });
}

async function queueMutation(
  type: QueuedMutation['type'],
  endpoint: string,
  payload: any,
  jobId?: string,
) {
  await offlineDb.mutations.add({
    id: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    type,
    endpoint,
    method: 'POST',
    payload,
    jobId: jobId ?? '',
    createdAt: Date.now(),
    retries: 0,
    status: 'pending',
  });
}
