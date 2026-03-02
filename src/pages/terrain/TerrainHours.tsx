import { useState, useMemo } from 'react';
import { useTimeEntries, useJobs } from '@/services/api/hooks';
import { useFilterByCompany } from '@/contexts/AppContext';
import { useOfflineMutation } from '@/services/offline/hooks';
import { timeEntriesApi, CreateTimeEntryPayload } from '@/services/api/time-entries.api';
import { Clock, Plus, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function TerrainHours() {
  const { data: apiTimeEntries, isLoading } = useTimeEntries();
  const timeEntries = useFilterByCompany(apiTimeEntries ?? []);
  const { data: apiJobs } = useJobs();
  const activeJobs = (apiJobs ?? []).filter(j => ['planned', 'in_progress'].includes(j.status));
  const createTimeEntry = useOfflineMutation<any, CreateTimeEntryPayload>(
    'timeEntry',
    '/time-entries',
    (data) => timeEntriesApi.create(data),
  );

  // Quick entry form state
  const [formOpen, setFormOpen] = useState(false);
  const [formJobId, setFormJobId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStart, setFormStart] = useState('07:30');
  const [formEnd, setFormEnd] = useState('16:00');
  const [formDesc, setFormDesc] = useState('');

  const calculatedHours = useMemo(() => {
    if (!formStart || !formEnd) return 0;
    const [sh, sm] = formStart.split(':').map(Number);
    const [eh, em] = formEnd.split(':').map(Number);
    const diff = (eh * 60 + em - sh * 60 - sm) / 60;
    return Math.max(0, Math.round(diff * 4) / 4);
  }, [formStart, formEnd]);

  async function handleQuickEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!formJobId) { toast.error('Sélectionnez un chantier'); return; }
    if (calculatedHours <= 0) { toast.error('Heures invalides'); return; }
    await createTimeEntry.mutateAsync({
      jobId: formJobId,
      date: new Date(formDate).toISOString(),
      hours: calculatedHours,
      description: formDesc || `${formStart} - ${formEnd}`,
    });
    setFormOpen(false);
    setFormDesc('');
  }

  // Filter to current week
  const weekEntries = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return timeEntries.filter(te => {
      const d = new Date(te.date);
      return d >= weekStart && d < weekEnd;
    });
  }, [timeEntries]);

  // Group by date
  const byDate = weekEntries.reduce<Record<string, typeof weekEntries>>((acc, te) => {
    const d = te.date.slice(0, 10);
    (acc[d] = acc[d] || []).push(te);
    return acc;
  }, {});

  const totalHours = weekEntries.reduce((s, t) => s + t.hours, 0);
  const daysWorked = Object.keys(byDate).length;

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48 mt-1" /></div>
        <Skeleton className="h-24 w-full" />
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Mes heures</h1>
          <p className="text-xs text-muted-foreground">Semaine en cours</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setFormOpen(!formOpen)}>
          <Plus className="h-3.5 w-3.5" /> Saisir
        </Button>
      </div>

      {/* Quick entry form */}
      {formOpen && (
        <form onSubmit={handleQuickEntry} className="bg-card border rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saisie rapide</div>
          <div className="space-y-1.5">
            <Label htmlFor="te-job">Chantier *</Label>
            <Select value={formJobId} onValueChange={setFormJobId}>
              <SelectTrigger id="te-job">
                <SelectValue placeholder="Sélectionner un chantier" />
              </SelectTrigger>
              <SelectContent>
                {activeJobs.map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.reference} — {j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="te-date">Date</Label>
            <Input id="te-date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="te-start">Début</Label>
              <Input id="te-start" type="time" value={formStart} onChange={e => setFormStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="te-end">Fin</Label>
              <Input id="te-end" type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
            </div>
          </div>
          {calculatedHours > 0 && (
            <div className="text-center py-2 bg-muted/50 rounded-lg">
              <span className="text-2xl font-bold">{calculatedHours}h</span>
              <span className="text-xs text-muted-foreground ml-1">calculées</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="te-desc">Description (optionnel)</Label>
            <Input id="te-desc" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Travaux réalisés…" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1 text-xs" disabled={createTimeEntry.isPending}>
              {createTimeEntry.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setFormOpen(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {/* Week summary */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cette semaine</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{daysWorked} jour{daysWorked > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex items-end gap-4 mb-3">
          <div className="text-3xl font-bold">{totalHours}h</div>
          <div className="text-sm text-muted-foreground mb-1">/ 35h</div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (totalHours / 35) * 100)}%` }} />
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

      {weekEntries.length === 0 && (
        <div className="text-center py-12">
          <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucune heure saisie cette semaine</p>
        </div>
      )}
    </div>
  );
}
