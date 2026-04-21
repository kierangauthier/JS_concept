import { useEffect } from 'react';

/**
 * Matcher for a keyboard shortcut.
 *
 * @example { key: 'ArrowLeft', ctrl: true } → Ctrl+Left
 * @example { key: 'n' } → N (without modifiers; ignores input fields)
 * @example { key: 'Home' } → Home
 */
export interface Hotkey {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  /** If true, the shortcut fires even when focus is inside an input/textarea. Defaults to false. */
  allowInInput?: boolean;
  handler: (e: KeyboardEvent) => void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

/**
 * Binds a set of keyboard shortcuts for the lifetime of the component.
 * Matching is case-insensitive on the letter key; modifiers must match exactly.
 */
export function useHotkeys(hotkeys: Hotkey[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      for (const hk of hotkeys) {
        if (!hk.allowInInput && isTypingTarget(e.target)) continue;
        const keyMatches = e.key.toLowerCase() === hk.key.toLowerCase();
        if (!keyMatches) continue;
        if (!!hk.ctrl !== (e.ctrlKey || e.metaKey && hk.meta !== false)) {
          // Treat Ctrl+… and Cmd+… as equivalent unless the caller opts out.
          if (!(hk.ctrl && (e.ctrlKey || e.metaKey))) continue;
        }
        if (!!hk.shift !== e.shiftKey) continue;
        if (!!hk.alt !== e.altKey) continue;
        hk.handler(e);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hotkeys, enabled]);
}
