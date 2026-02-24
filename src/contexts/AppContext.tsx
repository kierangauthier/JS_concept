import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Company, User, UserRole } from '@/types';
import { mockUsers } from '@/services/mockData';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  selectedCompany: Company;
  setSelectedCompany: (company: Company) => void;
  users: User[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[0]); // Admin by default
  const [selectedCompany, setSelectedCompany] = useState<Company>('GROUP');

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      selectedCompany,
      setSelectedCompany,
      users: mockUsers,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export function useFilterByCompany<T extends { company: Company }>(data: T[]): T[] {
  const { selectedCompany } = useApp();
  if (selectedCompany === 'GROUP') return data;
  return data.filter(item => item.company === selectedCompany);
}

// Navigation items per role
export interface NavItem {
  title: string;
  path: string;
  icon: string; // lucide icon name
  roles: UserRole[];
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/', icon: 'LayoutDashboard', roles: ['admin', 'conducteur', 'comptable'] },
  { title: 'Clients', path: '/clients', icon: 'Users', roles: ['admin', 'conducteur'] },
  { title: 'Devis', path: '/quotes', icon: 'FileText', roles: ['admin', 'conducteur'] },
  { title: 'Chantiers', path: '/jobs', icon: 'HardHat', roles: ['admin', 'conducteur', 'technicien'] },
  { title: 'Planning', path: '/planning', icon: 'CalendarDays', roles: ['admin', 'conducteur'] },
  { title: 'Terrain', path: '/terrain', icon: 'MapPin', roles: ['technicien'] },
  { title: 'Achats', path: '/purchases', icon: 'ShoppingCart', roles: ['admin', 'conducteur'] },
  { title: 'Atelier', path: '/workshop', icon: 'Wrench', roles: ['admin', 'conducteur'] },
  { title: 'Facturation', path: '/invoicing', icon: 'Receipt', roles: ['admin', 'comptable'] },
  { title: 'Admin', path: '/admin', icon: 'Settings', roles: ['admin'] },
];

export function getNavForRole(role: UserRole): NavItem[] {
  return navItems.filter(item => item.roles.includes(role));
}
