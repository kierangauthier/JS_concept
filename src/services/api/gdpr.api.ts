import { http } from "./http";

export interface ConsentEvent {
  id: string;
  purpose: string;
  granted: boolean;
  ip: string | null;
  userAgent: string | null;
  at: string;
}

export const gdprApi = {
  /** V2.9 — grant/revoke AI consent for the current user. */
  setAiConsent: (userId: string, consent: boolean) =>
    http.patch<{ consent: boolean; grantedAt: string | null }>(
      `/users/${userId}/ai-consent`,
      { consent },
    ),

  /** V5.5 — audit-friendly consent history for the current user. */
  getConsentHistory: (userId: string) =>
    http.get<ConsentEvent[]>(`/users/${userId}/consent-history`),

  /**
   * V5.4 — download GDPR export (JSON). The endpoint streams a file so we
   * avoid the typed wrapper here and handle the blob manually.
   */
  downloadExport: async (userId: string): Promise<Blob> => {
    const tokens = (() => {
      try {
        const raw = localStorage.getItem("cm_tokens");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    const res = await fetch(`/api/users/${userId}/gdpr-export`, {
      headers: {
        Authorization: tokens?.accessToken ? `Bearer ${tokens.accessToken}` : "",
      },
    });
    if (!res.ok) {
      throw new Error(`Export failed (${res.status})`);
    }
    return res.blob();
  },

  /** V5.4 — trigger GDPR anonymization (admin only, not self). */
  eraseUser: (userId: string) =>
    http.delete<{ success: boolean; erasedAt: string }>(
      `/users/${userId}/gdpr-erase`,
    ),
};
