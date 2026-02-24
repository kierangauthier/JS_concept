import { useApp } from '@/contexts/AppContext';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { Company, UserRole } from '@/types';
import { mockUsers } from '@/services/mockData';
import { Building2, User, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const companyLabels: Record<Company, string> = {
  ASP: 'ASP Signalisation',
  JS: 'JS Concept',
  GROUP: 'Groupe (toutes)',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin / Gérant',
  conducteur: 'Conducteur de travaux',
  technicien: 'Technicien terrain',
  comptable: 'Comptable',
};

export function Topbar() {
  const { currentUser, setCurrentUser, selectedCompany, setSelectedCompany } = useApp();

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 bg-card border-b gap-4 sticky top-0 z-30">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
          <span className="text-xs font-black text-primary-foreground">CM</span>
        </div>
      </div>

      <GlobalSearch />

      <div className="flex items-center gap-2">
        {/* Company Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{companyLabels[selectedCompany]}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs">Entité</DropdownMenuLabel>
            {(['GROUP', 'ASP', 'JS'] as Company[]).map(c => (
              <DropdownMenuItem key={c} onClick={() => setSelectedCompany(c)} className={selectedCompany === c ? 'bg-muted' : ''}>
                {companyLabels[c]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User/Role Switcher (demo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
                <User className="h-3 w-3 text-secondary-foreground" />
              </div>
              <span className="hidden lg:inline">{currentUser.name}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Changer de profil (démo)</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {mockUsers.map(u => (
              <DropdownMenuItem key={u.id} onClick={() => setCurrentUser(u)} className={currentUser.id === u.id ? 'bg-muted' : ''}>
                <div>
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{roleLabels[u.role]} · {u.company}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
