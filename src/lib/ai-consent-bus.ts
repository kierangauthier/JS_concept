/**
 * V4.8 — Lightweight event bus for "AI consent required" events.
 *
 * The HTTP client surfaces a 403 with code `AI_CONSENT_REQUIRED` whenever a
 * user without prior opt-in triggers an AI endpoint. Instead of plumbing the
 * modal through every call site, we emit an event here; `AppLayout` listens
 * and opens the consent dialog. Framework-agnostic, zero dependency.
 */

export type AiConsentListener = () => void;

const requestListeners = new Set<AiConsentListener>();
const grantedListeners = new Set<AiConsentListener>();

export const aiConsentBus = {
  /** Emit: call this when an API response indicates consent is required. */
  request() {
    for (const l of requestListeners) {
      try { l(); } catch { /* a listener must never break the chain */ }
    }
  },
  /** Subscribe to the 'request consent' event. Returns the unsubscribe fn. */
  subscribe(listener: AiConsentListener): () => void {
    requestListeners.add(listener);
    return () => requestListeners.delete(listener);
  },

  /** Emit: call this after a successful consent. */
  granted() {
    for (const l of grantedListeners) {
      try { l(); } catch { /* … */ }
    }
  },
  /** Subscribe to 'consent granted' so widgets can refetch their data. */
  subscribeGranted(listener: AiConsentListener): () => void {
    grantedListeners.add(listener);
    return () => grantedListeners.delete(listener);
  },
};
