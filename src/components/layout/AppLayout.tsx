import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export function AppLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
