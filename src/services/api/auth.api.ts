import { http, authStore } from './http';
import { User } from '@/types';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const data = await http.post<LoginResponse>('/auth/login', { email, password });
    authStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data;
  },

  logout: async (): Promise<void> => {
    const tokens = authStore.getTokens();
    if (tokens?.refreshToken) {
      await http.post('/auth/logout', { refreshToken: tokens.refreshToken }).catch(() => {});
    }
    authStore.setTokens(null);
  },

  me: (): Promise<User> => http.get<User>('/me'),

  /** I6 — request a reset link. Always resolves, even for unknown addresses (anti-enumeration). */
  forgotPassword: (email: string): Promise<{ sent: boolean }> =>
    http.post<{ sent: boolean }>('/auth/forgot-password', { email }),

  /** I6 — redeem a reset token and set a new password. */
  resetPassword: (token: string, password: string): Promise<{ reset: boolean }> =>
    http.post<{ reset: boolean }>('/auth/reset-password', { token, password }),
};
