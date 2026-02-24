import { useState } from 'react';
import { mockInterventions, interventionTypeLabels, interventionStatusLabels, interventionStatusColors, interventionTypeColors, mockOfflineQueue, Intervention } from '@/services/terrainData';
import { MapPin, Clock, ChevronRight, WifiOff, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TerrainToday() {
  const [isOffline] = useState(true); // simulated
  const today = mockInterventions.filter(i => i.status !== 'done').slice(0, 5);
  const done = mockInterventions.filter(i => i.status === 'done');
  const queueCount = mockOfflineQueue.length;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}` : `${m}min`;
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Aujourd'hui</h1>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Offline badge */}
          {isOffline && (
            <div className="flex items-center gap-1.5 bg-warning/15 text-warning-foreground rounded-full px-2.5 py-1">
              <WifiOff className="h-3 w-3" />
              <span className="text-[10px] font-semibold">Hors ligne</span>
            </div>
          )}
        </div>
      </div>

      {/* Upload queue banner */}
      {queueCount > 0 && (
        <Link to="/terrain/queue" className="flex items-center gap-3 bg-info/10 border border-info/20 rounded-lg px-3 py-2.5">
          <div className="h-8 w-8 rounded-full bg-info/20 flex items-center justify-center">
            <Upload className="h-4 w-4 text-info" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{queueCount} élément{queueCount > 1 ? 's' : ''} en attente de sync</div>
            <div className="text-[10px] text-muted-foreground">Sera envoyé dès que la connexion revient</div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      )}

      {/* Quick summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{today.length}</div>
          <div className="text-[10px] text-muted-foreground uppercase font-medium">À faire</div>
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{done.length}</div>
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Fait</div>
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">
            {formatDuration(today.reduce((s, i) => s + i.estimatedDuration, 0))}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Restant</div>
        </div>
      </div>

      {/* Active / next intervention */}
      {today.filter(i => i.status === 'in_progress' || i.status === 'in_route').length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">En cours</h2>
          {today.filter(i => i.status === 'in_progress' || i.status === 'in_route').map(intervention => (
            <InterventionCard key={intervention.id} intervention={intervention} formatTime={formatTime} formatDuration={formatDuration} highlight />
          ))}
        </div>
      )}

      {/* Upcoming */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">À venir</h2>
        <div className="space-y-2">
          {today.filter(i => i.status === 'pending').map(intervention => (
            <InterventionCard key={intervention.id} intervention={intervention} formatTime={formatTime} formatDuration={formatDuration} />
          ))}
        </div>
      </div>

      {/* Done */}
      {done.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Terminé</h2>
          <div className="space-y-2">
            {done.map(intervention => (
              <InterventionCard key={intervention.id} intervention={intervention} formatTime={formatTime} formatDuration={formatDuration} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InterventionCard({ intervention, formatTime, formatDuration, highlight }: {
  intervention: Intervention;
  formatTime: (iso: string) => string;
  formatDuration: (min: number) => string;
  highlight?: boolean;
}) {
  const checkedCount = intervention.checklist.filter(c => c.checked).length;
  const totalChecklist = intervention.checklist.length;

  return (
    <Link
      to={`/terrain/intervention/${intervention.id}`}
      className={`block bg-card border rounded-xl p-4 active:scale-[0.98] transition-transform ${
        highlight ? 'border-primary/40 shadow-sm ring-1 ring-primary/10' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${interventionTypeColors[intervention.type]}`}>
            {interventionTypeLabels[intervention.type]}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${interventionStatusColors[intervention.status]}`}>
            {interventionStatusLabels[intervention.status]}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
      </div>

      <h3 className="text-sm font-semibold leading-tight mb-1.5">{intervention.title}</h3>

      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
        <MapPin className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{intervention.address}, {intervention.city}</span>
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(intervention.scheduledAt)}</span>
          </div>
          <span>~{formatDuration(intervention.estimatedDuration)}</span>
        </div>
        {/* Checklist mini progress */}
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${checkedCount === totalChecklist ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${(checkedCount / totalChecklist) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">{checkedCount}/{totalChecklist}</span>
        </div>
      </div>
    </Link>
  );
}
