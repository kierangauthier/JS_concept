import { useState, useMemo } from 'react';
import { useApp, useFilterByCompany } from '@/contexts/AppContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { useTimeEntries, useCreateTimeEntry, useSubmitTimeEntries, useUpdateTimeEntry, useDeleteTimeEntry, useJobs } from '@/services/api/hooks';
import { TimeEntry, Job } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Clock, Plus, Send, ChevronLeft, ChevronRight, Pencil, Trash2, Check, X } from 'lucide-react';

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function TimeEntries() {
  const { currentUser } = useApp();
  const { data: apiEntries, isLoading } = useTimeEntries();
  const allEntries: TimeEntry[] = apiEntries ?? [];
  const entries = useFilterByCompany(allEntries);

  const { data: apiJobs } = useJobs();
  const jobs: Job[] = useFilterByCompany(apiJobs ?? []);

  const createEntry = useCreateTimeEntry();
  const submitEntries = useSubmitTimeEntries();
  const updateEntry = useUpdateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formJobId, setFormJobId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStart, setFormStart] = useState('08:00');
  const [formEnd, setFormEnd] = useState('17:00');
  const [formDescription, setFormDescription] = useState('');

  const formHours = useMemo(() => {
    if (!formStart || !formEnd) return 0;
    const [sh, sm] = formStart.split(':').map(Number);
    const [eh, em] = formEnd.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? Math.round(diff / 30) * 0.5 : 0;
  }, [formStart, formEnd]);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editDescription, setEditDescription] = useState('');

  function startEdit(te: TimeEntry) {
    setEditingId(te.id);
    setEditHours(String(te.hours));
    setEditDescription(te.description ?? '');
  }

  async function saveEdit() {
    if (!editingId) return;
    await updateEntry.mutateAsync({ id: editingId, data: { hours: parseFloat(editHours), description: editDescription } });
    setEditingId(null);
  }

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

  // My entries for this week
  const myEntries = useMemo(() => {
    return entries
      .filter(te => {
        const d = new Date(te.date);
        return d >= weekStart && d < weekEnd && te.userId === currentUser?.id;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, weekStart, weekEnd, currentUser]);

  const draftEntries = myEntries.filter(e => e.status === 'draft');
  const totalHours = myEntries.reduce((s, t) => s + t.hours, 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formJobId || !formDate || formHours <= 0) return;
    await createEntry.mutateAsync({
      data: {
        jobId: formJobId,
        date: formDate,
        hours: formHours,
        description: formDescription,
      },
    });
    setFormStart('08:00');
    setFormEnd('17:00');
    setFormDescription('');
    setShowForm(false);
  }

  async function handleSubmitDrafts() {
    if (draftEntries.length === 0) return;
    await submitEntries.mutateAsync(draftEntries.map(e => e.id));
  }

  const weekLabel = `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${new Date(weekEnd.getTime() - 86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Mes heures" subtitle="Chargement…" />
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Mes heures" subtitle={`${totalHours}h cette semaine`} />

      {/* Week nav + actions */}
      <div className="flex items-center justify-between">
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
        <div className="flex gap-2">
          {draftEntries.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={submitEntries.isPending}
              onClick={handleSubmitDrafts}
            >
              <Send className="h-3.5 w-3.5" />
              {submitEntries.isPending ? 'Envoi…' : `Soumettre (${draftEntries.length})`}
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-3.5 w-3.5" />
            Saisir
          </Button>
        </div>
      </div>

      {/* Quick entry form */}
      {showForm && (
        <form onSubmit={handleCreate} className="border rounded-lg p-4 bg-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="te-job">Chantier *</Label>
              <Select value={formJobId} onValueChange={setFormJobId}>
                <SelectTrigger id="te-job">
                  <SelectValue placeholder="Sélectionner un chantier" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.filter(j => ['planned', 'in_progress', 'paused'].includes(j.status)).map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      <span className="font-mono text-xs">{j.reference}</span> — {j.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="te-date">Date *</Label>
                <Input id="te-date" type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="te-start">Début</Label>
                <Input id="te-start" type="time" value={formStart} onChange={e => setFormStart(e.target.value)} step={1800} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="te-end">Fin</Label>
                <Input id="te-end" type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} step={1800} />
              </div>
            </div>
            {formHours > 0 && (
              <p className="text-xs text-muted-foreground">Durée calculée : <strong>{formHours}h</strong></p>
            )}
            {formStart && formEnd && formHours <= 0 && (
              <p className="text-xs text-destructive">L'heure de fin doit être après l'heure de début</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="te-desc">Description</Label>
            <textarea
              id="te-desc"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Décrivez le travail effectué"
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button type="submit" size="sm" disabled={createEntry.isPending || !formJobId || formHours <= 0}>
              {createEntry.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      )}

      {/* Entries list */}
      {myEntries.length === 0 ? (
        <EmptyState icon={Clock} title="Aucune heure" description="Pas de saisie pour cette semaine. Cliquez sur « Saisir » pour commencer." />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs text-muted-foreground uppercase">
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Chantier</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-right px-3 py-2">Heures</th>
                <th className="text-right px-3 py-2">Statut</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {myEntries.map(te => {
                const isEditing = editingId === te.id;
                const isDraft = te.status === 'draft';
                return (
                  <tr key={te.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {new Date(te.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{te.jobRef}</td>
                    <td className="px-3 py-2 text-xs max-w-[260px]">
                      {isEditing ? (
                        <textarea
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          rows={2}
                          className="w-full border rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                        />
                      ) : (
                        <span className="text-muted-foreground truncate block">{te.description}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-bold whitespace-nowrap">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          value={editHours}
                          onChange={e => setEditHours(e.target.value)}
                          className="w-16 text-right h-7 text-xs"
                        />
                      ) : `${te.hours}h`}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge type="time-entry" status={te.status} />
                        {te.status === 'rejected' && te.rejectionReason && (
                          <span className="text-[10px] text-destructive text-right max-w-[160px] leading-tight">{te.rejectionReason}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {isDraft && (
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6" disabled={updateEntry.isPending} onClick={saveEdit}>
                                <Check className="h-3.5 w-3.5 text-success" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(te)}>
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" disabled={deleteEntry.isPending} onClick={() => deleteEntry.mutate(te.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30">
                <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-right">Total semaine</td>
                <td className="px-3 py-2 text-right font-bold">{totalHours}h</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
