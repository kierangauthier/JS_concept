import { Outlet } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import { CalendarCheck, HardHat, Camera, Clock, User, WifiOff } from 'lucide-react';
import { useState } from 'react';

const terrainTabs = [
  { path: '/terrain', label: "Aujourd'hui", icon: CalendarCheck },
  { path: '/terrain/jobs', label: 'Chantiers', icon: HardHat },
  { path: '/terrain/photos', label: 'Photos', icon: Camera },
  { path: '/terrain/hours', label: 'Heures', icon: Clock },
  { path: '/terrain/profile', label: 'Profil', icon: User },
];

export function TerrainLayout() {
  const location = useLocation();
  const [isOffline] = useState(true); // simulated

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Topbar - minimal for mobile */}
      <header className="h-12 flex items-center justify-between px-4 bg-card border-b sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <span className="text-[9px] font-black text-primary-foreground">CM</span>
          </div>
          <span className="text-sm font-bold">Terrain</span>
        </div>
        {isOffline && (
          <div className="flex items-center gap-1.5 bg-warning/15 text-warning-foreground rounded-full px-2 py-0.5">
            <WifiOff className="h-3 w-3" />
            <span className="text-[10px] font-semibold">Hors ligne</span>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-40 flex items-center justify-around h-16 px-1 safe-area-pb">
        {terrainTabs.map(tab => {
          // Match exact for /terrain, prefix for sub-pages
          const isActive = tab.path === '/terrain'
            ? location.pathname === '/terrain'
            : location.pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-0 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <tab.icon className={`h-5 w-5 ${isActive ? '' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
