import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Company, User, UserRole } from '@/types';
import { mockUsers } from '@/services/mockData';
import { authApi } from '@/services/api/auth.api';
import { authStore } from '@/services/api/http';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── QueryClient singleton ────────────────────────────────────────────────────

const queryClient = new QueryClient({
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
  users: User[];
  // Auth
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company>('GROUP');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Keep authStore in sync with selectedCompany
  useEffect(() => {
    authStore.setCompanyScope(selectedCompany);
    if (!currentUser) return;
    // Non-admin/conducteur cannot use GROUP — enforce at UI level too
    if (selectedCompany === 'GROUP' && !['admin', 'conducteur'].includes(currentUser.role)) {
      setSelectedCompany(currentUser.company as Company);
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

  // On mount: try to restore session from localStorage
  useEffect(() => {
    const tryRestore = async () => {
      const tokens = authStore.getTokens();
      if (!tokens?.accessToken) {
        setIsLoading(false);
        return;
      }
      try {
        const user = await authApi.me();
        setCurrentUser(user);
        setIsAuthenticated(true);
        // If user's company doesn't allow GROUP, reset scope
        if (!['admin', 'conducteur'].includes(user.role)) {
          setSelectedCompany(user.company as Company);
        }
      } catch {
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
    // Set initial company scope based on role
    if (['admin', 'conducteur'].includes(data.user.role)) {
      setSelectedCompany('GROUP');
    } else {
      setSelectedCompany(data.user.company as Company);
    }
    queryClient.clear(); // fresh queries after login
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedCompany('GROUP');
    queryClient.clear();
  }, []);

  const handleSetSelectedCompany = useCallback((company: Company) => {
    if (!currentUser) return;
    // Prevent non-admin/conducteur from selecting GROUP or other company
    if (company === 'GROUP' && !['admin', 'conducteur'].includes(currentUser.role)) {
      return;
    }
    if (company !== 'GROUP' && company !== currentUser.company && !['admin', 'conducteur'].includes(currentUser.role)) {
      return;
    }
    setSelectedCompany(company);
  }, [currentUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={{
        currentUser,
        setCurrentUser,
        selectedCompany,
        setSelectedCompany: handleSetSelectedCompany,
        users: mockUsers,
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
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/', icon: 'LayoutDashboard', roles: ['admin', 'conducteur', 'comptable'] },
  { title: 'Clients', path: '/clients', icon: 'Users', roles: ['admin', 'conducteur'] },
  { title: 'Devis', path: '/quotes', icon: 'FileText', roles: ['admin', 'conducteur'] },
  { title: 'Chantiers', path: '/jobs', icon: 'HardHat', roles: ['admin', 'conducteur', 'technicien'] },
  { title: 'Planning', path: '/planning', icon: 'CalendarDays', roles: ['admin', 'conducteur'] },
  { title: 'Techniciens', path: '/hr', icon: 'UserCog', roles: ['admin', 'conducteur'] },
  { title: 'Terrain', path: '/terrain', icon: 'MapPin', roles: ['technicien'] },
  { title: 'Achats', path: '/purchases', icon: 'ShoppingCart', roles: ['admin', 'conducteur', 'comptable'] },
  { title: 'Catalogue', path: '/catalog', icon: 'Package', roles: ['admin', 'conducteur'] },
  { title: 'Atelier', path: '/workshop', icon: 'Wrench', roles: ['admin', 'conducteur'] },
  { title: 'Validation heures', path: '/time-validation', icon: 'ClipboardCheck', roles: ['admin', 'conducteur'] },
  { title: 'Absences', path: '/absences', icon: 'CalendarOff', roles: ['admin', 'conducteur', 'technicien'] },
  { title: 'Facturation', path: '/invoicing', icon: 'Receipt', roles: ['admin', 'comptable'] },
  { title: 'Rapports', path: '/reports', icon: 'BarChart3', roles: ['admin', 'conducteur'] },
  { title: 'Import données', path: '/admin/import', icon: 'Upload', roles: ['admin'] },
  { title: 'Admin', path: '/admin', icon: 'Settings', roles: ['admin'] },
];

export function getNavForRole(role: UserRole): NavItem[] {
  return navItems.filter(item => item.roles.includes(role));
}
