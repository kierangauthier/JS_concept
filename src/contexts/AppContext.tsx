import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Company, User, UserRole } from '@/types';
import { authApi } from '@/services/api/auth.api';
import { authStore, ApiError } from '@/services/api/http';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { toast } from 'sonner';

// ─── QueryClient singleton ────────────────────────────────────────────────────

// Global handler for query failures so users always see a red toast when a list
// endpoint dies. Mutations still rely on per-hook onError, which already
// surfaces a contextual message. 401 is silenced (http.ts handles the
// session-expired toast itself) and so is the AI consent 403.
const queryCache = new QueryCache({
  onError: (error) => {
    const apiError = error as ApiError;
    if (apiError?.status === 401) return;
    if (apiError?.status === 403 && apiError?.code === 'AI_CONSENT_REQUIRED') return;
    const message = apiError?.message || 'Erreur lors du chargement des données';
    toast.error(message, { duration: 5000 });
  },
});

const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Context types ────────────────────────────────────────────────────────────

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  selectedCompany: Company;
  setSelectedCompany: (company: Company) => void;
  // Auth
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

/**
 * Decides whether a given scope is reachable for a given user. The 'GROUP'
 * scope is reserved to group-admins (Acreed staff). A regular admin of a
 * single tenant stays locked to that tenant — no cross-tenant view by default.
 */
function isValidScopeForUser(scope: string, user: { isGroupAdmin?: boolean; company: string }): boolean {
  if (scope === 'GROUP') return Boolean(user.isGroupAdmin);
  if (scope === 'JS' || scope === 'ASP') {
    return Boolean(user.isGroupAdmin) || user.company === scope;
  }
  return false;
}

function defaultScopeForUser(user: { isGroupAdmin?: boolean; company: string }): Company {
  return user.isGroupAdmin ? 'GROUP' : (user.company as Company);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Bootstrap initial scope from localStorage. Validation happens *after* the
  // user is loaded (we don't know yet what's allowed). Default to GROUP so the
  // very first fetch — `/api/me` itself — doesn't break under a stale value.
  const [selectedCompany, setSelectedCompany] = useState<Company>(() => {
    const saved = typeof localStorage !== 'undefined'
      ? localStorage.getItem('selectedCompany')
      : null;
    const initial = (saved as Company) ?? 'GROUP';
    authStore.setCompanyScope(initial);
    return initial;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Keep authStore in sync with selectedCompany
  useEffect(() => {
    authStore.setCompanyScope(selectedCompany);
    if (!currentUser) return;
    // If the active scope isn't allowed for the current user (e.g. stale
    // 'GROUP' from a previous session, or a tenant the user is not part of),
    // reset to their default. The bootstrap effect already does this, but
    // this guards against later state changes too.
    if (!isValidScopeForUser(selectedCompany, currentUser)) {
      setSelectedCompany(defaultScopeForUser(currentUser));
    }
  }, [selectedCompany, currentUser]);

  // Register logout handler so HTTP layer can trigger it on fatal 401
  useEffect(() => {
    authStore.onLogout(() => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      queryClient.clear();
    });
  }, []);

  // On mount: try to restore session via httpOnly cookie.
  useEffect(() => {
    const tryRestore = async () => {
      try {
        const user = await authApi.me();
        setCurrentUser(user);
        setIsAuthenticated(true);

        // Pick a valid scope: keep the localStorage value if it's still
        // allowed, otherwise default to the user's natural scope.
        const stored = localStorage.getItem('selectedCompany');
        const scope: Company = stored && isValidScopeForUser(stored, user)
          ? (stored as Company)
          : defaultScopeForUser(user);
        authStore.setCompanyScope(scope);
        localStorage.setItem('selectedCompany', scope);
        setSelectedCompany(scope);
      } catch {
        // 401 = no valid session, user must log in
        authStore.setTokens(null);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    tryRestore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setCurrentUser(data.user);
    setIsAuthenticated(true);
    authStore.resetSessionExpiredFlag();
    // Default scope at login: GROUP for group admins (Acreed), the user's
    // own company otherwise. Update authStore + localStorage SYNCHRONOUSLY
    // before setSelectedCompany so the first fetches after login read the
    // right scope (avoids the GROUP/JS race that PR #30 fixed).
    const initialScope = defaultScopeForUser(data.user);
    authStore.setCompanyScope(initialScope);
    localStorage.setItem('selectedCompany', initialScope);
    setSelectedCompany(initialScope);
    queryClient.clear(); // fresh queries after login
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('selectedCompany');
    authStore.setCompanyScope('GROUP');
    setSelectedCompany('GROUP');
    queryClient.clear();
  }, []);

  const handleSetSelectedCompany = useCallback((company: Company) => {
    if (!currentUser) return;
    if (!isValidScopeForUser(company, currentUser)) {
      // Silent drop for the legacy ASP/JS path the validation always rejected;
      // explicit error for the GROUP attempt so the user knows why nothing
      // happened.
      if (company === 'GROUP') {
        toast.error("Vous n'avez pas accès à la vue consolidée.");
      }
      return;
    }
    // CRITICAL: update authStore SYNCHRONOUSLY before triggering the state change.
    // http.ts reads `_companyScope` synchronously when it builds each request, but
    // the previous useEffect-based sync ran after the re-render — so the first
    // fetches under the new queryKey (e.g. ['invoices', 'JS']) went out with
    // X-Company-Id still set to the previous scope, returning data for the wrong
    // tenant and caching it under the new key.
    authStore.setCompanyScope(company);
    localStorage.setItem('selectedCompany', company);
    // Drop every cached entry from the previous scope so the UI never shows
    // stale items from another tenant during the brief refetch window.
    queryClient.removeQueries();
    setSelectedCompany(company);
  }, [currentUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={{
        currentUser,
        setCurrentUser,
        selectedCompany,
        setSelectedCompany: handleSetSelectedCompany,
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}>
        {children}
      </AppContext.Provider>
    </QueryClientProvider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

/**
 * Filters data by selectedCompany.
 * When API data is used, the server already scopes by company — but this hook
 * still applies for GROUP view where we receive mixed data.
 */
export function useFilterByCompany<T extends { company: Company }>(data: T[]): T[] {
  const { selectedCompany } = useApp();
  if (selectedCompany === 'GROUP') return data;
  return data.filter(item => item.company === selectedCompany);
}

// ─── Navigation ────────────────────────────────────────────────────────────────

export interface NavItem {
  title: string;
  path: string;
  icon: string;
  roles: UserRole[];
  group?: string; // section label displayed above the first item of each group
  comingSoon?: boolean; // displays a "Bientôt" badge and disables navigation
}

export const navItems: NavItem[] = [
  // ─── Pilotage ─────────────────────────────────────────────────────────────
  { title: 'Dashboard',          path: '/',               icon: 'LayoutDashboard', roles: ['admin', 'conducteur', 'comptable'],                  group: 'Pilotage' },
  { title: 'Rapports',           path: '/reports',        icon: 'BarChart3',       roles: ['admin', 'conducteur'] },

  // ─── Commercial ──────────────────────────────────────────────────────────
  { title: 'Clients',            path: '/clients',        icon: 'Users',           roles: ['admin', 'conducteur'],                               group: 'Commercial' },
  { title: 'Devis',              path: '/quotes',         icon: 'FileText',        roles: ['admin', 'conducteur'] },
  { title: 'Catalogue',          path: '/catalog',        icon: 'Package',         roles: ['admin', 'conducteur'] },

  // ─── Production ──────────────────────────────────────────────────────────
  { title: 'Chantiers',          path: '/jobs',           icon: 'HardHat',         roles: ['admin', 'conducteur', 'technicien', 'collaborateur'], group: 'Production' },
  { title: 'Planning',           path: '/planning',       icon: 'CalendarDays',    roles: ['admin', 'conducteur'] },
  { title: 'Équipes',            path: '/hr',             icon: 'UserCog',         roles: ['admin', 'conducteur'] },
  { title: 'Atelier',            path: '/workshop',       icon: 'Wrench',          roles: ['admin', 'conducteur'] },
  { title: 'Achats',             path: '/purchases',      icon: 'ShoppingCart',    roles: ['admin', 'conducteur', 'comptable'] },
  { title: 'Fournisseurs',       path: '/suppliers',      icon: 'Truck',           roles: ['admin', 'conducteur'] },

  // ─── Temps & RH ──────────────────────────────────────────────────────────
  { title: 'Saisie heures',      path: '/time-entries',   icon: 'Clock',           roles: ['admin', 'conducteur', 'collaborateur'],              group: 'Temps & RH' },
  { title: 'Validation',         path: '/time-validation',icon: 'ClipboardCheck',  roles: ['admin', 'conducteur'] },
  { title: 'Absences',           path: '/absences',       icon: 'CalendarOff',     roles: ['admin', 'conducteur', 'technicien', 'collaborateur'] },

  // ─── Facturation ─────────────────────────────────────────────────────────
  { title: 'Factures',           path: '/invoicing',      icon: 'Receipt',         roles: ['admin', 'comptable'],                                group: 'Facturation' },

  // ─── Terrain (technicien uniquement) ─────────────────────────────────────
  { title: 'Terrain',            path: '/terrain',        icon: 'MapPin',          roles: ['technicien'],                                        group: 'Mon espace' },

  // ─── Administration ──────────────────────────────────────────────────────
  { title: 'Import',             path: '/admin/import',   icon: 'Upload',          roles: ['admin'],                                             group: 'Administration' },
  { title: 'Infos légales',      path: '/admin/legal',    icon: 'ScrollText',      roles: ['admin'] },
  { title: 'Paramètres',         path: '/admin',          icon: 'Settings',        roles: ['admin'] },

  // ─── Assistant IA (bas de sidebar) ───────────────────────────────────────
  { title: 'Assistant IA conversationnel', path: '/assistant', icon: 'Sparkles', roles: ['admin', 'conducteur', 'comptable', 'collaborateur'], group: '─', comingSoon: true },
];

export function getNavForRole(role: UserRole): NavItem[] {
  return navItems.filter(item => item.roles.includes(role));
}
