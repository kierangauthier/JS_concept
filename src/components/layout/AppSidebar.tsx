import { useLocation, Link } from 'react-router-dom';
import { useApp, getNavForRole, NavItem } from '@/contexts/AppContext';
import {
  LayoutDashboard, Users, FileText, HardHat, CalendarDays, MapPin,
  ShoppingCart, Wrench, Receipt, Settings, ChevronLeft, ChevronRight,
  UserCog, Package, ClipboardCheck, CalendarOff, BarChart3, Upload, Sparkles, Clock,
} from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, FileText, HardHat, CalendarDays, MapPin,
  ShoppingCart, Wrench, Receipt, Settings, UserCog, Package,
  ClipboardCheck, CalendarOff, BarChart3, Upload, Sparkles, Clock,
};

// Groups items by their `group` field, preserving order
function groupNavItems(items: NavItem[]): Array<{ group: string | null; items: NavItem[] }> {
  const sections: Array<{ group: string | null; items: NavItem[] }> = [];
  let current: { group: string | null; items: NavItem[] } = { group: null, items: [] };

  for (const item of items) {
    if (item.group !== undefined) {
      if (current.items.length > 0) sections.push(current);
      current = { group: item.group, items: [item] };
    } else {
      current.items.push(item);
    }
  }
  if (current.items.length > 0) sections.push(current);
  return sections;
}

export function AppSidebar() {
  const { currentUser } = useApp();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = getNavForRole(currentUser?.role ?? 'admin');
  const sections = groupNavItems(navItems);

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
      style={{ backgroundColor: 'hsl(var(--sidebar-bg))', borderRight: '1px solid hsl(var(--sidebar-border))' }}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-primary-foreground">CM</span>
            </div>
            <span className="text-sm font-bold truncate" style={{ color: 'hsl(var(--sidebar-fg-active))' }}>
              ConceptManager
            </span>
          </div>
        ) : (
          <div className="h-7 w-7 rounded bg-primary flex items-center justify-center mx-auto">
            <span className="text-xs font-black text-primary-foreground">CM</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <TooltipProvider delayDuration={200}>
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className={sIdx > 0 ? 'mt-1' : ''}>
              {/* Section label */}
              {section.group !== null && !collapsed && (
                section.group === '─' ? (
                  <div className="mx-1 my-2 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }} />
                ) : (
                  <div className="px-3 pt-3 pb-1">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: 'hsl(var(--sidebar-fg) / 0.45)' }}
                    >
                      {section.group}
                    </span>
                  </div>
                )
              )}
              {/* Items */}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = iconMap[item.icon] || LayoutDashboard;
                  const isActive = item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);
                  const linkEl = (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/15 text-primary'
                          : 'hover:bg-[hsl(var(--sidebar-accent))]'
                      }`}
                      style={{ color: isActive ? undefined : 'hsl(var(--sidebar-fg))' }}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </Link>
                  );
                  if (!collapsed) return linkEl;
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                      <TooltipContent side="right">{item.title}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </TooltipProvider>

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
