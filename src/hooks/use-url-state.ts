import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Bind a single state value to a URL query-string param.
 *
 * - Survives navigation, refresh, and sharing (unlike useState).
 * - Falls back to `defaultValue` when the param is absent or equals the default.
 * - Default values are stripped from the URL to keep it clean.
 *
 * @example
 *   const [tab, setTab] = useUrlState('tab', 'list');
 *   const [page, setPage] = useUrlState('page', '1');
 */
export function useUrlState(
  key: string,
  defaultValue: string,
): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      setParams(
        prev => {
          const updated = new URLSearchParams(prev);
          if (next === defaultValue || next === '') {
            updated.delete(key);
          } else {
            updated.set(key, next);
          }
          return updated;
        },
        { replace: true },
      );
    },
    [key, defaultValue, setParams],
  );

  return [value, setValue];
}

/** Numeric convenience wrapper. */
export function useUrlNumber(
  key: string,
  defaultValue: number,
): [number, (value: number) => void] {
  const [raw, setRaw] = useUrlState(key, String(defaultValue));
  const num = Number.parseInt(raw, 10);
  return [
    Number.isFinite(num) ? num : defaultValue,
    useCallback((v: number) => setRaw(String(v)), [setRaw]),
  ];
}
