import { mockTimeEntries } from '@/services/mockData';
import { useFilterByCompany } from '@/contexts/AppContext';
import { Clock, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function TerrainHours() {
  const timeEntries = useFilterByCompany(mockTimeEntries);

  // Group by date
  const byDate = timeEntries.reduce<Record<string, typeof timeEntries>>((acc, te) => {
    const d = te.date;
    (acc[d] = acc[d] || []).push(te);
    return acc;
  }, {});

  const totalHours = timeEntries.reduce((s, t) => s + t.hours, 0);

  // Current week stats (fake)
  const weekStats = { total: totalHours, target: 35, days: 3 };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Mes heures</h1>
          <p className="text-xs text-muted-foreground">Semaine en cours</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => toast.info('Saisie rapide d\'heures')}>
          <Plus className="h-3.5 w-3.5" /> Saisir
        </Button>
      </div>

      {/* Week summary */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cette semaine</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{weekStats.days} jours</span>
          </div>
        </div>
        <div className="flex items-end gap-4 mb-3">
          <div className="text-3xl font-bold">{weekStats.total}h</div>
          <div className="text-sm text-muted-foreground mb-1">/ {weekStats.target}h</div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (weekStats.total / weekStats.target) * 100)}%` }} />
        </div>
      </div>

      {/* Entries by date */}
      {Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, entries]) => {
        const dayTotal = entries.reduce((s, t) => s + t.hours, 0);
        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </h3>
              <span className="text-xs font-bold">{dayTotal}h</span>
            </div>
            <div className="space-y-1.5">
              {entries.map(te => (
                <div key={te.id} className="bg-card border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium font-mono">{te.jobRef}</div>
                    <div className="text-xs text-muted-foreground truncate">{te.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{te.hours}h</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {timeEntries.length === 0 && (
        <div className="text-center py-12">
          <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune heure saisie</p>
        </div>
      )}
    </div>
  );
}
