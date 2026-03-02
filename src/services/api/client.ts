/**
 * Axios-compatible shim over the native fetch-based http client.
 * Some API modules use `api.get(url, { params }).then(r => r.data)`.
 * This adapter wraps `http` to provide that interface.
 */
import { http } from './http';

function buildUrl(path: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return path;
  const qs = new URLSearchParams(params).toString();
  return `${path}?${qs}`;
}

function wrap<T>(promise: Promise<T>) {
  return promise.then(data => ({ data }));
}

export const api = {
  get: <T>(path: string, opts?: { params?: Record<string, string> }) =>
    wrap(http.get<T>(buildUrl(path, opts?.params))),

  post: <T>(path: string, body?: unknown) =>
    wrap(http.post<T>(path, body)),

  patch: <T>(path: string, body?: unknown) =>
    wrap(http.patch<T>(path, body)),

  delete: <T>(path: string) =>
    wrap(http.delete<T>(path)),
};
