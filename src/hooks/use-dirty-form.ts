import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Tracks whether a form has unsaved changes and guards against accidental loss
 * via browser unload, modal close, or programmatic navigation.
 *
 * Usage:
 *   const { isDirty, markDirty, markClean, confirmDiscard } = useDirtyForm();
 *
 *   <Sheet open={open} onOpenChange={(o) => {
 *     if (!o && !confirmDiscard()) return;
 *     setOpen(o);
 *   }}>
 */
export function useDirtyForm(enabled: boolean = true) {
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => {
    isDirtyRef.current = false;
    setIsDirty(false);
  }, []);

  const confirmDiscard = useCallback((message?: string) => {
    if (!isDirtyRef.current) return true;
    const ok = window.confirm(
      message ?? 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?',
    );
    if (ok) {
      isDirtyRef.current = false;
      setIsDirty(false);
    }
    return ok;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);

  return { isDirty, markDirty, markClean, confirmDiscard };
}

/**
 * Snapshot-based dirty tracking for forms: pass the current form values and a
 * baseline (or `null` when the modal is closed). Returns a guarded close handler
 * that blocks with a confirm prompt when the values diverge from the baseline.
 *
 * Avoids having to instrument every onChange when the form is large.
 */
export function useFormGuard<T>(values: T, baseline: T | null, enabled: boolean = true) {
  const isDirty = useMemo(() => {
    if (!enabled || baseline === null) return false;
    try {
      return JSON.stringify(values) !== JSON.stringify(baseline);
    } catch {
      return false;
    }
  }, [values, baseline, enabled]);

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const guardClose = useCallback(
    (onClose: () => void, message?: string) => {
      if (
        !isDirtyRef.current ||
        window.confirm(
          message ?? 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?',
        )
      ) {
        onClose();
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);

  return { isDirty, guardClose };
}

