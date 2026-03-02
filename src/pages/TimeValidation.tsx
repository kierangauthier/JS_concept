import { useState, useMemo } from 'react';
import { useFilterByCompany } from '@/contexts/AppContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { useTimeEntries, useApproveBatchTimeEntries, useApproveTimeEntry, useRejectTimeEntry } from '@/services/api/hooks';
import { TimeEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function TimeValidation() {
  const { data: apiEntries, isLoading } = useTimeEntries();
  const allEntries: TimeEntry[] = apiEntries ?? [];
  const entries = useFilterByCompany(allEntries);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const approveBatch = useApproveBatchTimeEntries();
  const approveSingle = useApproveTimeEntry();
  const rejectSingle = useRejectTimeEntry();

  const weekStart = useMemo(() => {
    const d = getWeekStart(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  // Filter entries for the selected week with status "submitted"
  const submittedEntries = useMemo(() => {
    return entries.filter(te => {
      const d = new Date(te.date);
      return d >= weekStart && d < weekEnd && te.status === 'submitted';
    });
  }, [entries, weekStart, weekEnd]);

  // Group by user
  const byUser = useMemo(() => {
    const map: Record<string, { userName: string; entries: TimeEntry[] }> = {};
    submittedEntries.forEach(te => {
      const key = te.userName || te.userId;
      if (!map[key]) map[key] = { userName: te.userName || te.userId, entries: [] };
      map[key].entries.push(te);
    });
    return Object.values(map).sort((a, b) => a.userName.localeCompare(b.userName));
  }, [submittedEntries]);

  const totalSubmittedHours = submittedEntries.reduce((s, t) => s + t.hours, 0);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === submittedEntries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(submittedEntries.map(e => e.id)));
    }
  }

  async function handleApproveBatch() {
    if (selected.size === 0) return;
    await approveBatch.mutateAsync([...selected]);
    setSelected(new Set());
  }

  const weekLabel = `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${new Date(weekEnd.getTime() - 86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Validation des heures" subtitle="Chargement…" />
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Validation des heures" subtitle={`${submittedEntries.length} entrée(s) à valider`} />

      {/* Week nav */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset(o => o + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {weekOffset !== 0 && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setWeekOffset(0)}>Aujourd'hui</Button>
        )}
      </div>

      {/* Summary + batch actions */}
      {submittedEntries.length > 0 && (
        <div className="flex items-center justify-between bg-card border rounded-lg p-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={selected.size === submittedEntries.length && submittedEntries.length > 0}
                onChange={selectAll}
              />
              Tout sélectionner
            </label>
            <span className="text-sm text-muted-foreground">{selected.size} sélectionnée(s) · {totalSubmittedHours}h au total</span>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
            disabled={selected.size === 0 || approveBatch.isPending}
            onClick={handleApproveBatch}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {approveBatch.isPending ? 'Validation…' : `Valider (${selected.size})`}
          </Button>
        </div>
      )}

      {/* Entries grouped by user */}
      {byUser.length === 0 ? (
        <EmptyState icon={Clock} title="Rien à valider" description="Aucune heure soumise pour cette semaine." />
      ) : (
        byUser.map(group => {
          const groupTotal = group.entries.reduce((s, t) => s + t.hours, 0);
          return (
            <div key={group.userName}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{group.userName}</h3>
                <span className="text-xs font-bold text-muted-foreground">{groupTotal}h</span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-xs text-muted-foreground uppercase">
                      <th className="w-8 px-3 py-2"></th>
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-3 py-2">Chantier</th>
                      <th className="text-left px-3 py-2">Description</th>
                      <th className="text-right px-3 py-2">Heures</th>
                      <th className="text-right px-3 py-2 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.entries.map(te => (
                      <tr key={te.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selected.has(te.id)}
                            onChange={() => toggleSelect(te.id)}
                          />
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {new Date(te.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{te.jobRef}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-[200px]">{te.description}</td>
                        <td className="px-3 py-2 text-right font-bold">{te.hours}h</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-success hover:text-success"
                              onClick={() => approveSingle.mutate(te.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => rejectSingle.mutate(te.id)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
