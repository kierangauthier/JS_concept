import { useMemo } from 'react';
import { MapPin, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOfflineQuery } from '@/services/offline/hooks';
import { teamPlanningApi } from '@/services/api/team-planning.api';
import { Skeleton } from '@/components/ui/skeleton';

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export default function TerrainToday() {
  const weekStart = useMemo(() => getWeekStart(new Date()), []);
  const { data, isLoading } = useOfflineQuery(
    `planning:${weekStart}`,
    ['my-planning', weekStart],
    () => teamPlanningApi.getMyPlanning(weekStart),
  );

  const todayStr = new Date().toISOString().slice(0, 10);

  const todaySlots = useMemo(() => {
    if (!data?.slots) return [];
    return data.slots
      .filter(s => s.date.slice(0, 10) === todayStr)
      .sort((a, b) => a.startHour - b.startHour);
  }, [data, todayStr]);

  const totalHours = todaySlots.reduce((sum, s) => sum + (s.endHour - s.startHour), 0);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48 mt-1" /></div>
        <div className="grid grid-cols-2 gap-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Aujourd'hui</h1>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Quick summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{todaySlots.length}</div>
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Interventions</div>
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{totalHours}h</div>
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Planifiées</div>
        </div>
      </div>

      {/* Slots */}
      {todaySlots.length > 0 && (
        <div className="space-y-2">
          {todaySlots.map(slot => (
            <SlotCard key={slot.id} slot={slot} />
          ))}
        </div>
      )}

      {todaySlots.length === 0 && (
        <div className="text-center py-12">
          <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune intervention prévue aujourd'hui</p>
        </div>
      )}
    </div>
  );
}

function SlotCard({ slot }: {
  slot: { id: string; date: string; startHour: number; endHour: number; jobRef: string; jobTitle: string; jobAddress: string; teamName: string };
}) {
  return (
    <Link
      to={`/terrain/intervention/${slot.id}`}
      className="block bg-card border rounded-xl p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/15 text-primary-foreground">
            {slot.startHour}h-{slot.endHour}h
          </span>
          <span className="text-xs font-mono text-muted-foreground">{slot.jobRef}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
      </div>

      <h3 className="text-sm font-semibold leading-tight mb-1.5">{slot.jobTitle}</h3>

      {slot.jobAddress && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{slot.jobAddress}</span>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
        <Clock className="h-3 w-3" />
        <span>Équipe : {slot.teamName}</span>
      </div>
    </Link>
  );
}
