/**
 * Central HTTP client.
 * - Injects Authorization (Bearer) and X-Company-Id headers on every request.
 * - On 401: attempts one silent refresh → retries the original request.
 * - If refresh fails: triggers logout via the auth store.
 * - On 403 with code `AI_CONSENT_REQUIRED`: broadcasts via aiConsentBus so the
 *   UI can open the opt-in modal without the call site having to know.
 */
import { aiConsentBus } from '@/lib/ai-consent-bus';

const BASE_URL = '/api';

// ─── Auth store (framework-agnostic singleton) ──────────────────────────────

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

let _tokens: AuthTokens | null = null;
let _companyScope: string = 'GROUP';
let _onLogout: (() => void) | null = null;
let _refreshPromise: Promise<boolean> | null = null;
let _sessionExpiredNotified = false;

export const authStore = {
  getTokens: () => _tokens,
  setTokens: (t: AuthTokens | null) => {
    _tokens = t;
    if (t) {
      try { localStorage.setItem('cm_tokens', JSON.stringify(t)); } catch {}
    } else {
      try { localStorage.removeItem('cm_tokens'); } catch {}
    }
  },
  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem('cm_tokens');
      if (raw) _tokens = JSON.parse(raw);
    } catch {}
  },
  setCompanyScope: (scope: string) => { _companyScope = scope; },
  getCompanyScope: () => _companyScope,
  onLogout: (fn: () => void) => { _onLogout = fn; },
  resetSessionExpiredFlag: () => { _sessionExpiredNotified = false; },
};

// ─── Core request function ──────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  companyOverride?: string,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (_tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${_tokens.accessToken}`);
  }
  headers.set('X-Company-Id', companyOverride ?? _companyScope);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Try one refresh
    const refreshed = await silentRefresh();
    if (!refreshed) {
      // Notify the user exactly once per logout cycle so they understand why
      // they are being redirected (prevents silent logout + lost form drafts).
      if (!_sessionExpiredNotified) {
        _sessionExpiredNotified = true;
        try {
          const { toast } = await import('sonner');
          toast.error('Session expirée — veuillez vous reconnecter');
        } catch {
          // Ignore — sonner unavailable (e.g. test env).
        }
      }
      _onLogout?.();
      throw new ApiError(401, 'Session expirée');
    }

    // Retry with new token
    headers.set('Authorization', `Bearer ${_tokens!.accessToken}`);
    const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({}));
      const msg = Array.isArray(err.message) ? err.message[0] : (err.message ?? 'Erreur');
      throw new ApiError(retryRes.status, msg, err.code, err);
    }
    return retryRes.json() as Promise<T>;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err.message) ? err.message[0] : (err.message ?? 'Erreur serveur');
    if (res.status === 403 && err.code === 'AI_CONSENT_REQUIRED') {
      aiConsentBus.request();
    }
    throw new ApiError(res.status, msg, err.code, err);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// Prevents concurrent refresh loops
async function silentRefresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      if (!_tokens?.refreshToken) return false;
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: _tokens.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      authStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ─── Error class ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  /** Machine-readable server code (e.g. 'AI_CONSENT_REQUIRED'), when present. */
  public readonly code?: string;
  /** Raw server payload, for rare edge cases that need more than status + message. */
  public readonly payload?: unknown;

  constructor(public status: number, message: string, code?: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.payload = payload;
  }
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

export interface RequestOptions {
  /** Override X-Company-Id for this single request (e.g. when mutating a resource whose company differs from the active scope). */
  companyId?: string;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }, opts?.companyId),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, opts?.companyId),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'DELETE' }, opts?.companyId),

  /**
   * Execute a callback with a temporary company scope override.
   * Restores the previous scope when done (even on error).
   * Use this when creating resources while the user is on GROUP scope.
   */
  withCompanyScope: async <T>(scope: string, fn: () => Promise<T>): Promise<T> => {
    const prev = _companyScope;
    _companyScope = scope;
    try {
      return await fn();
    } finally {
      _companyScope = prev;
    }
  },
};

// Load tokens on module init
authStore.loadFromStorage();
