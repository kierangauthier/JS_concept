import Dexie, { type Table } from 'dexie';

export interface CachedData {
  key: string;
  data: any;
  cachedAt: number;
  expiresAt: number;
}

export interface QueuedMutation {
  id: string;
  idempotencyKey: string;
  type: 'timeEntry' | 'photo' | 'signature' | 'note';
  endpoint: string;
  method: 'POST' | 'PATCH';
  payload: any;
  blobKey?: string;
  jobId: string;
  createdAt: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'done';
  errorMessage?: string;
}

export interface StoredBlob {
  id: string;
  blob: Blob;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

class OfflineDB extends Dexie {
  cache!: Table<CachedData>;
  mutations!: Table<QueuedMutation>;
  blobs!: Table<StoredBlob>;
  meta!: Table<{ key: string; value: number }>;

  constructor() {
    super('conceptmanager-offline');
    this.version(1).stores({
      cache: 'key, cachedAt',
      mutations: 'id, type, status, createdAt, jobId',
      blobs: 'id',
      meta: 'key',
    });
  }
}

export const offlineDb = new OfflineDB();
