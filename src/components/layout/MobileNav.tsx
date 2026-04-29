import { Link, useLocation } from 'react-router-dom';
import { useApp, getNavForRole } from '@/contexts/AppContext';
import {
  LayoutDashboard, Users, FileText, HardHat, CalendarDays, MapPin,
  ShoppingCart, Wrench, Receipt, Settings, UserCog, Package, ClipboardCheck, CalendarOff, BarChart3,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, FileText, HardHat, CalendarDays, MapPin,
  ShoppingCart, Wrench, Receipt, Settings, UserCog, Package, ClipboardCheck, CalendarOff, BarChart3,
};

export function MobileNav() {
  const { currentUser } = useApp();
  const location = useLocation();

  if (!currentUser) return null;

  // Techniciens use the TerrainLayout with its own bottom nav
  if (currentUser.role === 'technicien') return null;

  const navItems = getNavForRole(currentUser.role).slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t z-40 flex items-center justify-around h-14 px-1">
      {navItems.map(item => {
        const Icon = iconMap[item.icon] || LayoutDashboard;
        const isActive = location.pathname === item.path;
        if (item.comingSoon) {
          return (
            <div
              key={item.path}
              aria-disabled="true"
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground opacity-60 cursor-not-allowed"
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </div>
          );
        }
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
