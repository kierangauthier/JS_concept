import { useApp } from '@/contexts/AppContext';
import { Link } from 'react-router-dom';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { Company } from '@/types';
import { Building2, User, ChevronDown, LogOut, Globe2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const companyLabels: Record<Company, string> = {
  ASP: 'ASP Signalisation',
  JS: 'JS Concept',
  GROUP: 'Vue consolidée Acreed',
};

export function Topbar() {
  const { currentUser, logout, selectedCompany, setSelectedCompany } = useApp();

  // Build the list of scopes the current user is allowed to switch to.
  // - Group admins (Acreed staff): GROUP + both tenants.
  // - Anyone else: their own company only — and we hide the switcher when
  //   there's a single option to avoid pretending it's interactive.
  const allowedScopes: Company[] = currentUser?.isGroupAdmin
    ? ['GROUP', 'ASP', 'JS']
    : currentUser ? [currentUser.company as Company] : [];
  const showScopeSwitcher = allowedScopes.length > 1;

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
        {/* Company Switcher — hidden when the user only has one allowed scope. */}
        {showScopeSwitcher ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                {selectedCompany === 'GROUP' ? <Globe2 className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{companyLabels[selectedCompany]}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Entité</DropdownMenuLabel>
              {allowedScopes.map(c => (
                <DropdownMenuItem
                  key={c}
                  onClick={() => setSelectedCompany(c)}
                  className={`gap-2 ${selectedCompany === c ? 'bg-muted' : ''}`}
                >
                  {c === 'GROUP' ? <Globe2 className="h-3.5 w-3.5 text-amber-600" /> : <Building2 className="h-3.5 w-3.5" />}
                  <span>{companyLabels[c]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : currentUser ? (
          <span className="inline-flex items-center gap-1.5 text-xs px-2 h-8 rounded border bg-muted/30 text-muted-foreground" title="Entité de rattachement">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{companyLabels[currentUser.company as Company]}</span>
          </span>
        ) : null}

        {/* User + Logout */}
        <div className="flex items-center gap-1.5">
          <Link
            to="/account"
            aria-label="Mon compte"
            className="flex items-center gap-1.5 rounded px-1 py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:bg-muted"
          >
            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
              <User aria-hidden="true" className="h-3 w-3 text-secondary-foreground" />
            </div>
            <span className="hidden lg:inline text-xs font-medium">{currentUser?.name}</span>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={logout}
            aria-label="Se déconnecter"
          >
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
