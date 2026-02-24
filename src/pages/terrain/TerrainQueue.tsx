import { mockOfflineQueue } from '@/services/terrainData';
import { ArrowLeft, Upload, Image, Clock, CheckSquare, PenTool, RefreshCw, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const typeIcons: Record<string, React.ElementType> = {
  photo: Image,
  hours: Clock,
  checklist: CheckSquare,
  signature: PenTool,
};

const typeLabels: Record<string, string> = {
  photo: 'Photo',
  hours: 'Heures',
  checklist: 'Checklist',
  signature: 'Signature',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  queued: { label: 'En file', color: 'bg-muted text-muted-foreground' },
  syncing: { label: 'Sync…', color: 'bg-info/15 text-info' },
  failed: { label: 'Échoué', color: 'bg-destructive/15 text-destructive' },
};

export default function TerrainQueue() {
  const navigate = useNavigate();
  const queue = mockOfflineQueue;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-card border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">File d'attente</h1>
          <p className="text-xs text-muted-foreground">{queue.length} élément{queue.length > 1 ? 's' : ''} en attente</p>
        </div>
      </div>

      {/* Offline banner */}
      <div className="flex items-center gap-3 bg-warning/10 border border-warning/20 rounded-xl p-3">
        <WifiOff className="h-5 w-5 text-warning flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-medium">Mode hors ligne (simulé)</div>
          <div className="text-xs text-muted-foreground">Les données seront synchronisées automatiquement dès que la connexion sera rétablie.</div>
        </div>
      </div>

      {/* Retry all */}
      <Button variant="outline" className="w-full gap-1.5" onClick={() => toast.info('Tentative de synchronisation…')}>
        <RefreshCw className="h-4 w-4" /> Forcer la synchronisation
      </Button>

      {/* Queue items */}
      <div className="space-y-2">
        {queue.map(item => {
          const Icon = typeIcons[item.type] || Upload;
          const status = statusLabels[item.status];
          return (
            <div key={item.id} className="bg-card border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium uppercase text-muted-foreground">{typeLabels[item.type]}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                </div>
                <div className="text-sm font-medium truncate">{item.label}</div>
                <div className="text-[10px] text-muted-foreground">
                  {item.interventionRef} · {new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  {item.size && ` · ${item.size}`}
                </div>
              </div>
              {item.status === 'syncing' && (
                <RefreshCw className="h-4 w-4 text-info animate-spin flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
