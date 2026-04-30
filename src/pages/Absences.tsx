import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { useApp } from '@/contexts/AppContext';
import {
  useAbsences, useAbsenceTypes, useCreateAbsence, useApproveAbsence,
  useRejectAbsence, useDeleteAbsence, useCreateAbsenceType,
} from '@/services/api/hooks';
import { Absence } from '@/services/api/absences.api';
import { toISODateLocal } from '@/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  CalendarOff, Plus, Check, X, Trash2, Calendar, List, Loader2,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR');
}

function diffDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

export default function Absences() {
  const { currentUser } = useApp();
  const isManager = currentUser && ['admin', 'conducteur'].includes(currentUser.role);
  const [tab, setTab] = useState<string>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);

  const { data: absences, isLoading } = useAbsences(statusFilter === 'all' ? undefined : statusFilter);
  const { data: types } = useAbsenceTypes();
  const createMut = useCreateAbsence();
  const approveMut = useApproveAbsence();
  const rejectMut = useRejectAbsence();
  const deleteMut = useDeleteAbsence();
  const createTypeMut = useCreateAbsenceType();

  // Create form state
  const [formType, setFormType] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formReason, setFormReason] = useState('');

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // For the calendar grid
  const calendarData = useMemo(() => {
    if (!absences) return { days: [], weeks: [] as Date[][] };
    const [year, month] = calMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    // Build weeks grid
    const weeks: Date[][] = [];
    let current = new Date(firstDay);
    // Go back to Monday
    const dayOfWeek = current.getDay();
    current.setDate(current.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    while (current <= lastDay || weeks.length === 0 || weeks[weeks.length - 1].length < 7) {
      if (!weeks.length || weeks[weeks.length - 1].length === 7) {
        if (current > lastDay && weeks.length > 0) break;
        weeks.push([]);
      }
      weeks[weeks.length - 1].push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return { weeks };
  }, [calMonth, absences]);

  function getAbsencesForDate(date: Date): Absence[] {
    if (!absences) return [];
    const dateStr = toISODateLocal(date);
    return absences.filter(a => {
      if (a.status === 'rejected') return false;
      return dateStr >= a.startDate && dateStr <= a.endDate;
    });
  }

  function handleCreate() {
    if (!formType || !formStart || !formEnd) return;
    createMut.mutate(
      { typeId: formType, startDate: formStart, endDate: formEnd, reason: formReason },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setFormType('');
          setFormStart('');
          setFormEnd('');
          setFormReason('');
        },
      },
    );
  }

  // Pending count for managers
  const pendingCount = absences?.filter(a => a.status === 'pending').length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Absences & Congés" subtitle="Gestion des demandes d'absence">
          <CompanySelect />
        </PageHeader>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Absences & Congés" subtitle="Gestion des demandes d'absence">
        <CompanySelect />
      </PageHeader>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {isManager && pendingCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              {pendingCount} en attente
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvées</SelectItem>
              <SelectItem value="rejected">Refusées</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Demande
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list" className="gap-1">
            <List className="h-3.5 w-3.5" /> Liste
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1">
            <Calendar className="h-3.5 w-3.5" /> Calendrier
          </TabsTrigger>
        </TabsList>

        {/* ─── List view ─── */}
        <TabsContent value="list" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collaborateur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Du</TableHead>
                  <TableHead>Au</TableHead>
                  <TableHead>Jours</TableHead>
                  <TableHead>Statut</TableHead>
                  {isManager && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!absences || absences.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={isManager ? 7 : 6} className="text-center text-muted-foreground py-8">
                      <CalendarOff className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Aucune absence trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  absences.map(absence => (
                    <TableRow
                      key={absence.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedAbsence(absence)}
                    >
                      <TableCell className="font-medium">{absence.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{absence.typeLabel}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(absence.startDate)}</TableCell>
                      <TableCell>{formatDate(absence.endDate)}</TableCell>
                      <TableCell>{diffDays(absence.startDate, absence.endDate)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[absence.status] ?? 'outline'}>
                          {STATUS_LABELS[absence.status] ?? absence.status}
                        </Badge>
                      </TableCell>
                      {isManager && (
                        <TableCell className="text-right">
                          {absence.status === 'pending' && (
                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600"
                                onClick={() => approveMut.mutate(absence.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600"
                                onClick={() => rejectMut.mutate(absence.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── Calendar view ─── */}
        <TabsContent value="calendar" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const [y, m] = calMonth.split('-').map(Number);
                const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
                setCalMonth(prev);
              }}
            >
              &lt;
            </Button>
            <span className="font-medium">
              {new Date(calMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const [y, m] = calMonth.split('-').map(Number);
                const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
                setCalMonth(next);
              }}
            >
              &gt;
            </Button>
          </div>

          <div className="rounded-md border overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/50">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                <div key={d} className="text-center text-xs font-medium py-2 border-b">{d}</div>
              ))}
            </div>
            {calendarData.weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((day, di) => {
                  const [, monthNum] = calMonth.split('-').map(Number);
                  const isCurrentMonth = day.getMonth() + 1 === monthNum;
                  const dayAbsences = getAbsencesForDate(day);
                  return (
                    <div
                      key={di}
                      className={`min-h-[60px] border-b border-r p-1 ${
                        isCurrentMonth ? '' : 'bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <div className="text-xs font-medium mb-0.5">{day.getDate()}</div>
                      {dayAbsences.slice(0, 2).map(a => (
                        <div
                          key={a.id}
                          className={`text-[10px] truncate rounded px-1 mb-0.5 ${
                            a.status === 'approved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                          title={`${a.userName} — ${a.typeLabel}`}
                        >
                          {a.userName.split(' ')[0]}
                        </div>
                      ))}
                      {dayAbsences.length > 2 && (
                        <div className="text-[10px] text-muted-foreground">+{dayAbsences.length - 2}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Create dialog ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle demande d'absence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type d'absence *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {types?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date début *</Label>
                <Input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} />
              </div>
              <div>
                <Label>Date fin *</Label>
                <Input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
              </div>
            </div>
            {formStart && formEnd && formEnd >= formStart && (
              <p className="text-sm text-muted-foreground">
                {diffDays(formStart, formEnd)} jour(s)
              </p>
            )}
            <div>
              <Label>Motif</Label>
              <Textarea
                value={formReason}
                onChange={e => setFormReason(e.target.value)}
                placeholder="Motif optionnel…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || !formType || !formStart || !formEnd}>
              {createMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail sheet ─── */}
      <Sheet open={!!selectedAbsence} onOpenChange={open => { if (!open) setSelectedAbsence(null); }}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedAbsence && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <CalendarOff className="h-5 w-5" />
                  Absence — {selectedAbsence.userName}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <p className="font-medium">{selectedAbsence.typeLabel}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Statut</Label>
                    <p>
                      <Badge variant={STATUS_VARIANT[selectedAbsence.status] ?? 'outline'}>
                        {STATUS_LABELS[selectedAbsence.status] ?? selectedAbsence.status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Du</Label>
                    <p className="font-medium">{formatDate(selectedAbsence.startDate)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Au</Label>
                    <p className="font-medium">{formatDate(selectedAbsence.endDate)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Durée</Label>
                    <p className="font-medium">{diffDays(selectedAbsence.startDate, selectedAbsence.endDate)} jour(s)</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Entité</Label>
                    <p className="font-medium">{selectedAbsence.company || '—'}</p>
                  </div>
                </div>
                {selectedAbsence.reason && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Motif</Label>
                    <p className="text-sm">{selectedAbsence.reason}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  {isManager && selectedAbsence.status === 'pending' && (
                    <>
                      <Button
                        className="flex-1"
                        onClick={() => { approveMut.mutate(selectedAbsence.id); setSelectedAbsence(null); }}
                      >
                        <Check className="mr-1 h-4 w-4" /> Approuver
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => { rejectMut.mutate(selectedAbsence.id); setSelectedAbsence(null); }}
                      >
                        <X className="mr-1 h-4 w-4" /> Refuser
                      </Button>
                    </>
                  )}
                  {selectedAbsence.status === 'pending' && (
                    currentUser?.id === selectedAbsence.userId || isManager
                  ) && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => { deleteMut.mutate(selectedAbsence.id); setSelectedAbsence(null); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
