import { useLocation, Link } from 'react-router-dom';
import { useApp, getNavForRole } from '@/contexts/AppContext';
import {
  LayoutDashboard, Users, FileText, HardHat, CalendarDays, MapPin,
  ShoppingCart, Wrench, Receipt, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, FileText, HardHat, CalendarDays, MapPin,
  ShoppingCart, Wrench, Receipt, Settings,
};

export function AppSidebar() {
  const { currentUser } = useApp();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = getNavForRole(currentUser.role);

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
      style={{ backgroundColor: 'hsl(var(--sidebar-bg))', borderRight: '1px solid hsl(var(--sidebar-border))' }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center">
              <span className="text-xs font-black text-primary-foreground">CM</span>
            </div>
            <span className="text-sm font-bold" style={{ color: 'hsl(var(--sidebar-fg-active))' }}>
              ConceptManager
            </span>
          </div>
        )}
        {collapsed && (
          <div className="h-7 w-7 rounded bg-primary flex items-center justify-center mx-auto">
            <span className="text-xs font-black text-primary-foreground">CM</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'hover:bg-[hsl(var(--sidebar-accent))]'
              }`}
              style={{ color: isActive ? undefined : 'hsl(var(--sidebar-fg))' }}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-10 border-t hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
        style={{ borderColor: 'hsl(var(--sidebar-border))', color: 'hsl(var(--sidebar-fg))' }}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
