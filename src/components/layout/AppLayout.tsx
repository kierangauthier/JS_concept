import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppSidebar } from './AppSidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { LegalFooter } from './LegalFooter';
import { AiConsentModal } from '@/components/ai/AiConsentModal';
import { aiConsentBus } from '@/lib/ai-consent-bus';

export function AppLayout() {
  const [consentOpen, setConsentOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    return aiConsentBus.subscribe(() => setConsentOpen(true));
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
        <LegalFooter />
      </div>
      <MobileNav />
      <AiConsentModal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onGranted={() => {
          // Invalidate every AI-related query + the consent history so the
          // proactive widget refetches now that the consent flag is true,
          // and broadcast on the bus for non-react-query consumers
          // (AiProactiveAlerts manages its own local state).
          queryClient.invalidateQueries({ queryKey: ['ai'] });
          queryClient.invalidateQueries({ queryKey: ['consent-history'] });
          aiConsentBus.granted();
        }}
      />
    </div>
  );
}
