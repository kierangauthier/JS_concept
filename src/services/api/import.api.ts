import { authStore } from './http';

// ─── Types ──────────────────────────────────────────

export type ImportType = 'clients' | 'suppliers' | 'jobs' | 'invoices';

export interface ImportError {
  line: number;
  message: string;
}

export interface SoftMatch {
  line: number;
  csvRow: Record<string, string>;
  matchedEntity: { id: string; name: string; city?: string; email?: string };
  score: number;
  suggestedAction: 'merge' | 'skip';
}

export interface PreviewResult {
  fileKey: string;
  checksum: string;
  valid: Record<string, string>[];
  errors: ImportError[];
  duplicates: SoftMatch[];
  total: number;
}

export interface DuplicateAction {
  line: number;
  action: 'merge' | 'skip' | 'create';
  mergePolicy?: 'safe' | 'overwrite';
}

export interface ExecuteResult {
  imported: number;
  merged: number;
  skipped: number;
  errors: string[];
}

// ─── API ────────────────────────────────────────────

function getAuthHeaders(): Record<string, string> {
  const tokens = authStore.getTokens();
  const headers: Record<string, string> = {};
  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }
  headers['X-Company-Id'] = authStore.getCompanyScope();
  return headers;
}

export const importApi = {
  downloadTemplate: async (type: ImportType): Promise<void> => {
    const res = await fetch(`/api/import/templates/${type}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erreur téléchargement template');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  preview: async (file: File, type: ImportType): Promise<PreviewResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const res = await fetch('/api/import/preview', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? 'Erreur analyse CSV');
    }
    return res.json();
  },

  execute: async (
    type: ImportType,
    fileKey: string,
    checksum: string,
    duplicateActions: DuplicateAction[],
  ): Promise<ExecuteResult> => {
    const res = await fetch('/api/import/execute', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, fileKey, checksum, duplicateActions }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? "Erreur d'import");
    }
    return res.json();
  },
};
