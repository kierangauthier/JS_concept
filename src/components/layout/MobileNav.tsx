import { Link, useLocation } from 'react-router-dom';
import { useApp, getNavForRole } from '@/contexts/AppContext';
import {
  LayoutDashboard, Users, FileText, HardHat, CalendarDays, MapPin,
  ShoppingCart, Wrench, Receipt, Settings,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, FileText, HardHat, CalendarDays, MapPin,
  ShoppingCart, Wrench, Receipt, Settings,
};

export function MobileNav() {
  const { currentUser } = useApp();
  const location = useLocation();
  const navItems = getNavForRole(currentUser.role).slice(0, 5); // Show max 5 on mobile

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t z-40 flex items-center justify-around h-14 px-1">
      {navItems.map(item => {
        const Icon = iconMap[item.icon] || LayoutDashboard;
        const isActive = location.pathname === item.path;
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
