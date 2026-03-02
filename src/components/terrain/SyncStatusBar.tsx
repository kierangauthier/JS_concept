import { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/services/offline/networkStatus';
import { syncManager, SyncStatus, SyncState } from '@/services/offline/syncManager';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATE_CONFIG: Record<SyncState, {
  icon: React.ElementType;
  class: string;
  bg: string;
}> = {
  idle: { icon: Wifi, class: 'text-muted-foreground', bg: 'bg-muted/50' },
  syncing: { icon: Loader2, class: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  synced: { icon: CheckCircle2, class: 'text-success', bg: 'bg-success/5' },
  error: { icon: AlertCircle, class: 'text-destructive', bg: 'bg-destructive/5' },
  auth_required: { icon: LogIn, class: 'text-warning', bg: 'bg-warning/10' },
};

export function SyncStatusBar() {
  const isOnline = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: 'idle' });
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    const unsub = syncManager.subscribe((s) => {
      setSyncStatus(s);
      if (s.pendingCount !== undefined) setPendingCount(s.pendingCount);
      if (s.lastSyncAt) setLastSync(s.lastSyncAt);
    });

    // Initial counts
    syncManager.getPendingCount().then(setPendingCount);
    syncManager.getLastSync().then(setLastSync);

    return unsub;
  }, []);

  // Refresh pending count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      syncManager.getPendingCount().then(setPendingCount);
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const config = isOnline
    ? STATE_CONFIG[syncStatus.state]
    : { icon: WifiOff, class: 'text-warning', bg: 'bg-warning/10' };

  const Icon = config.icon;

  const handleSync = async () => {
    const result = await syncManager.syncAll();
    if (result.success > 0) {
      toast.success(`${result.success} action(s) synchronisee(s)`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} echec(s) de synchronisation`);
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return '';
    const diff = Math.round((Date.now() - ts) / 60000);
    if (diff < 1) return 'a l\'instant';
    if (diff < 60) return `il y a ${diff} min`;
    return `il y a ${Math.round(diff / 60)}h`;
  };

  // Don't render if no relevant state
  if (isOnline && pendingCount === 0 && syncStatus.state === 'idle') return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 text-xs ${config.bg}`}>
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${config.class} ${syncStatus.state === 'syncing' ? 'animate-spin' : ''}`} />

      <span className={`flex-1 ${config.class}`}>
        {!isOnline && (
          <>Hors ligne{pendingCount > 0 ? ` \u00b7 ${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente` : ''}</>
        )}
        {isOnline && syncStatus.state === 'syncing' && (
          <>Synchronisation... {syncStatus.progress}/{syncStatus.total}</>
        )}
        {isOnline && syncStatus.state === 'synced' && (
          <>En ligne \u00b7 Tout synchronise</>
        )}
        {isOnline && syncStatus.state === 'error' && (
          <>{pendingCount} echec{pendingCount > 1 ? 's' : ''}</>
        )}
        {isOnline && syncStatus.state === 'auth_required' && (
          <>Reconnexion requise</>
        )}
        {isOnline && syncStatus.state === 'idle' && pendingCount > 0 && (
          <>{pendingCount} action{pendingCount > 1 ? 's' : ''} en attente</>
        )}
      </span>

      {lastSync && isOnline && syncStatus.state !== 'syncing' && (
        <span className="text-muted-foreground text-[10px]">
          {formatLastSync(lastSync)}
        </span>
      )}

      {isOnline && pendingCount > 0 && syncStatus.state !== 'syncing' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-2 text-[10px]"
          onClick={handleSync}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Synchroniser
        </Button>
      )}

      {syncStatus.state === 'syncing' && (
        <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((syncStatus.progress ?? 0) / (syncStatus.total ?? 1)) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
