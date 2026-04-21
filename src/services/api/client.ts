/**
 * Axios-compatible shim over the native fetch-based http client.
 * Some API modules use `api.get<T>(url, { params }).then(r => r.data)`.
 * This adapter wraps `http` to provide that interface while preserving
 * the generic type through the wrap.
 */
import { http } from './http';

function buildUrl(path: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return path;
  const qs = new URLSearchParams(params).toString();
  return `${path}?${qs}`;
}

async function wrap<T>(promise: Promise<T>): Promise<{ data: T }> {
  const data = await promise;
  return { data };
}

export const api = {
  get: <T = unknown>(path: string, opts?: { params?: Record<string, string> }) =>
    wrap<T>(http.get<T>(buildUrl(path, opts?.params))),

  post: <T = unknown>(path: string, body?: unknown) =>
    wrap<T>(http.post<T>(path, body)),

  patch: <T = unknown>(path: string, body?: unknown) =>
    wrap<T>(http.patch<T>(path, body)),

  delete: <T = unknown>(path: string) =>
    wrap<T>(http.delete<T>(path)),
};
