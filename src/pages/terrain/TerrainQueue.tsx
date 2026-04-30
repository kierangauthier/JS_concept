import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Image, Clock, PenTool, RefreshCw, WifiOff, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { offlineDb, QueuedMutation } from '@/services/offline/db';
import { syncManager } from '@/services/offline/syncManager';
import { useNetworkStatus } from '@/services/offline/networkStatus';
import { plural } from '@/lib/format';

const typeIcons: Record<string, React.ElementType> = {
  photo: Image,
  timeEntry: Clock,
  signature: PenTool,
  note: Upload,
};

const typeLabels: Record<string, string> = {
  photo: 'Photo',
  timeEntry: 'Heures',
  signature: 'Signature',
  note: 'Note',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'En file', color: 'bg-muted text-muted-foreground' },
  syncing: { label: 'Sync\u2026', color: 'bg-info/15 text-info' },
  failed: { label: 'Echec', color: 'bg-destructive/15 text-destructive' },
  done: { label: 'OK', color: 'bg-success/15 text-success' },
};

export default function TerrainQueue() {
  const navigate = useNavigate();
  const isOnline = useNetworkStatus();
  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  async function loadQueue() {
    const items = await offlineDb.mutations
      .orderBy('createdAt')
      .reverse()
      .limit(50)
      .toArray();
    setQueue(items);
  }

  async function handleSync() {
    setSyncing(true);
    const result = await syncManager.syncAll();
    setSyncing(false);
    await loadQueue();
    if (result.success > 0) toast.success(`${result.success} element(s) synchronise(s)`);
    if (result.failed > 0) toast.error(`${result.failed} echec(s)`);
    if (result.total === 0) toast.info('Rien a synchroniser');
  }

  async function handleRetryOne(id: string) {
    const ok = await syncManager.retryOne(id);
    await loadQueue();
    if (ok) toast.success('Synchronise');
    else toast.error('Echec');
  }

  async function handleDeleteOne(id: string) {
    await syncManager.deleteOne(id);
    await loadQueue();
    toast.info('Supprime de la file');
  }

  async function handleRetryAllFailed() {
    const count = await syncManager.retryAllFailed();
    if (count === 0) {
      toast.info('Aucun element en echec a reessayer');
      return;
    }
    toast.success(`${plural(count, 'element remis en attente', 'elements remis en attente')}`);
    setSyncing(true);
    const result = await syncManager.syncAll();
    setSyncing(false);
    await loadQueue();
    if (result.success > 0) toast.success(`${result.success} synchronise(s)`);
    if (result.failed > 0) toast.error(`${result.failed} echec(s) persistant(s)`);
  }

  const pendingCount = queue.filter(q => ['pending', 'failed'].includes(q.status)).length;
  const failedCount = queue.filter(q => q.status === 'failed').length;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Retour" className="h-11 w-11 rounded-full bg-card border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">File d'attente</h1>
          <p className="text-xs text-muted-foreground">
            {plural(pendingCount, 'element en attente', 'elements en attente')}
          </p>
        </div>
      </div>

      {/* Status banner */}
      {!isOnline && (
        <div className="flex items-center gap-3 bg-warning/10 border border-warning/20 rounded-xl p-3">
          <WifiOff className="h-5 w-5 text-warning flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium">Mode hors ligne</div>
            <div className="text-xs text-muted-foreground">
              Les donnees seront synchronisees automatiquement des que la connexion sera retablie.
            </div>
          </div>
        </div>
      )}

      {/* Dead-letter banner when some mutations have been abandoned. */}
      {failedCount > 0 && isOnline && (
        <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{plural(failedCount, 'element en echec', 'elements en echec')}</div>
            <div className="text-xs text-muted-foreground mb-2">
              Ces actions ne seront plus resynchronisees automatiquement. Verifiez qu'elles sont toujours valides, puis reessayez.
            </div>
            <Button size="sm" variant="destructive" className="h-11" onClick={handleRetryAllFailed} disabled={syncing}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reessayer tout
            </Button>
          </div>
        </div>
      )}

      {/* Sync button */}
      <Button
        variant="outline"
        className="w-full gap-1.5 h-12"
        onClick={handleSync}
        disabled={syncing || pendingCount === 0}
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Synchronisation...' : 'Forcer la synchronisation'}
      </Button>

      {/* Queue items */}
      {queue.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Aucun element en file d'attente
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map(item => {
            const Icon = typeIcons[item.type] || Upload;
            const status = statusConfig[item.status] ?? statusConfig.pending;
            return (
              <div key={item.id} className="bg-card border rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {typeLabels[item.type] ?? item.type}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="text-sm font-medium truncate">
                    {item.endpoint}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {item.retries > 0 && ` \u00b7 ${item.retries} tentative(s)`}
                    {item.errorMessage && ` \u00b7 ${item.errorMessage}`}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.status === 'syncing' && (
                    <RefreshCw className="h-4 w-4 text-info animate-spin" />
                  )}
                  {(item.status === 'failed' || item.status === 'pending') && isOnline && (
                    <button
                      onClick={() => handleRetryOne(item.id)}
                      className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                      title="Reessayer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {item.status !== 'syncing' && (
                    <button
                      onClick={() => handleDeleteOne(item.id)}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
