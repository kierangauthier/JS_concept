/**
 * V4.8 — Lightweight event bus for "AI consent required" events.
 *
 * The HTTP client surfaces a 403 with code `AI_CONSENT_REQUIRED` whenever a
 * user without prior opt-in triggers an AI endpoint. Instead of plumbing the
 * modal through every call site, we emit an event here; `AppLayout` listens
 * and opens the consent dialog. Framework-agnostic, zero dependency.
 */

export type AiConsentListener = () => void;

const listeners = new Set<AiConsentListener>();

export const aiConsentBus = {
  /** Emit: call this when an API response indicates consent is required. */
  request() {
    for (const l of listeners) {
      try {
        l();
      } catch {
        // A listener must never break the chain.
      }
    }
  },
  /** Subscribe. Returns the unsubscribe function. */
  subscribe(listener: AiConsentListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
