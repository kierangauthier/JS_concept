import { useState, useMemo } from 'react';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { CompanyBadge } from '@/components/shared/StatusBadge';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, X, Plus, Lock, Unlock, Send, Users, UserPlus, Trash2 } from 'lucide-react';
import {
  useJobs, usePlanningSlots, useCreateSlot, useDeleteSlot,
  useTeams, useCreateTeam, useAddTeamMember, useRemoveTeamMember,
  useTeamPlanning, useCreateTeamSlot, useDeleteTeamSlot,
  useLockWeek, useUnlockWeek, useSendPlanning,
  useUsers,
} from '@/services/api/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PlanningSlot } from '@/services/api/planning.api';
import { TeamPlanningSlotData } from '@/services/api/team-planning.api';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const JOB_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
];

function getWeekDays(weekOffset: number): Date[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function Planning() {
  const { selectedCompany, currentUser } = useApp();
  const { data: apiJobs, isLoading } = useJobs();
  const allJobs = useFilterByCompany(apiJobs ?? []);
  const activeJobs = allJobs.filter(j => ['planned', 'in_progress', 'paused'].includes(j.status));

  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'teams' | 'techs'>('teams');
  const [teamDrawerOpen, setTeamDrawerOpen] = useState(false);
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const weekStart = toDateStr(weekDays[0]);
  const weekRange = `${weekDays[0].toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} — ${weekDays[4].toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const isToday = (d: Date) => isSameDay(d, new Date());
  const isAdmin = currentUser?.role === 'admin';

  const [assignCompany, setAssignCompany] = useState<'ASP' | 'JS'>('ASP');

  const jobColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    activeJobs.forEach((j, i) => { map[j.id] = JOB_COLORS[i % JOB_COLORS.length]; });
    return map;
  }, [activeJobs]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Planning" subtitle="Chargement..." />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Planning" subtitle={weekRange}>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'teams' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setViewMode('teams')}
            >
              Équipes
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'techs' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
              onClick={() => setViewMode('techs')}
            >
              Techniciens
            </button>
          </div>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(o => o - 1)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setWeekOffset(0)}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(o => o + 1)}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </PageHeader>

      {selectedCompany === 'GROUP' && (
        <div className="max-w-xs">
          <CompanySelect value={assignCompany} onChange={setAssignCompany} />
        </div>
      )}

      {viewMode === 'teams' ? (
        <TeamPlanningView
          weekStart={weekStart}
          weekDays={weekDays}
          isToday={isToday}
          activeJobs={activeJobs}
          jobColorMap={jobColorMap}
          assignCompany={assignCompany}
          selectedCompany={selectedCompany}
          isAdmin={isAdmin}
          onOpenTeamDrawer={() => setTeamDrawerOpen(true)}
        />
      ) : (
        <TechPlanningView
          weekDays={weekDays}
          isToday={isToday}
          activeJobs={activeJobs}
          jobColorMap={jobColorMap}
          assignCompany={assignCompany}
          selectedCompany={selectedCompany}
        />
      )}

      {activeJobs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium uppercase">Chantiers :</span>
          {activeJobs.map(j => (
            <span key={j.id} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${jobColorMap[j.id]}`}>
              {j.reference} — {j.title}
            </span>
          ))}
        </div>
      )}

      <TeamManagementDrawer open={teamDrawerOpen} onClose={() => setTeamDrawerOpen(false)} />
    </div>
  );
}

// ─── Team Planning View (hourly grid) ──────────────────────────────────────

function TeamPlanningView({
  weekStart, weekDays, isToday, activeJobs, jobColorMap,
  assignCompany, selectedCompany, isAdmin, onOpenTeamDrawer,
}: {
  weekStart: string;
  weekDays: Date[];
  isToday: (d: Date) => boolean;
  activeJobs: any[];
  jobColorMap: Record<string, string>;
  assignCompany: 'ASP' | 'JS';
  selectedCompany: string;
  isAdmin: boolean;
  onOpenTeamDrawer: () => void;
}) {
  const { data: weekData } = useTeamPlanning(weekStart);
  const createSlot = useCreateTeamSlot();
  const deleteSlot = useDeleteTeamSlot();
  const lockMutation = useLockWeek();
  const unlockMutation = useUnlockWeek();
  const sendMutation = useSendPlanning();

  const status = weekData?.status ?? 'draft';
  const isLocked = status === 'locked';
  const teams = weekData?.teams ?? [];
  const slots = weekData?.slots ?? [];

  async function handleAssign(teamId: string, date: Date, startHour: number, endHour: number, jobId: string) {
    const scope = selectedCompany === 'GROUP' ? assignCompany : undefined;
    await createSlot.mutateAsync({
      data: { teamId, date: toDateStr(date), startHour, endHour, jobId },
      companyScope: scope,
    });
  }

  function getDayHours(teamId: string, dateStr: string): number {
    return slots
      .filter(s => s.teamId === teamId && s.date === dateStr)
      .reduce((sum, s) => sum + (s.endHour - s.startHour), 0);
  }

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLocked ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium dark:bg-green-900/30 dark:text-green-300">
              <Lock className="h-3 w-3" /> Verrouillé v{weekData?.version}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
              Brouillon
            </span>
          )}
          {weekData?.lastDispatch && (
            <span className="text-[10px] text-muted-foreground">
              Dernier envoi : {new Date(weekData.lastDispatch.sentAt).toLocaleString('fr-FR')}
              {' '}({weekData.lastDispatch.status})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onOpenTeamDrawer}>
            <Users className="h-3 w-3 mr-1" /> Gérer les équipes
          </Button>
          {!isLocked && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="h-7 text-xs">
                  <Lock className="h-3 w-3 mr-1" /> Verrouiller
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Verrouiller la semaine ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le planning deviendra non modifiable. Vous pourrez ensuite l'envoyer par email aux techniciens.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => lockMutation.mutate(weekStart)}>Verrouiller</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isLocked && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="h-7 text-xs" variant="default">
                    <Send className="h-3 w-3 mr-1" /> Envoyer par email
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Envoyer le planning ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Un email sera envoyé à chaque technicien concerné avec le planning de la semaine.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => sendMutation.mutate(weekStart)}>Envoyer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" className="h-7 text-xs" variant="outline">
                      <Unlock className="h-3 w-3 mr-1" /> Déverrouiller
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Déverrouiller la semaine ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le planning redeviendra modifiable. La version sera incrémentée.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => unlockMutation.mutate(weekStart)}>Déverrouiller</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>
      </div>

      {/* Grid */}
      {teams.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Aucune équipe trouvée. <button className="underline" onClick={onOpenTeamDrawer}>Créer une équipe</button>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map(team => {
            const teamSlots = slots.filter(s => s.teamId === team.id);
            return (
              <div key={team.id} className="border rounded-lg overflow-hidden">
                {/* Team header */}
                <div className="bg-muted/50 px-3 py-2 flex items-center gap-3 border-b">
                  <span className="text-sm font-semibold">{team.name}</span>
                  <div className="flex gap-1">
                    {team.members.map((m: any) => (
                      <span key={m.userId} className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">
                        {m.userName.split(' ')[0]}{m.roleInTeam === 'chef' && ' *'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Day columns */}
                <div className="grid grid-cols-5 min-w-[800px]">
                  {weekDays.map((day, di) => {
                    const dateStr = toDateStr(day);
                    const daySlots = teamSlots
                      .filter(s => s.date === dateStr)
                      .sort((a, b) => a.startHour - b.startHour);
                    const totalHours = getDayHours(team.id, dateStr);

                    return (
                      <div key={di} className={`${di > 0 ? 'border-l' : ''} ${isToday(day) ? 'bg-primary/5' : ''}`}>
                        <div className={`text-center px-2 py-1.5 border-b ${isToday(day) ? 'bg-primary/10' : 'bg-muted/30'}`}>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase">{DAY_LABELS[di]}</div>
                          <div className={`text-xs font-bold ${isToday(day) ? 'text-primary' : ''}`}>
                            {day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </div>
                          {totalHours > 0 && (
                            <div className={`text-[9px] mt-0.5 ${totalHours > 10 ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                              {totalHours}h
                            </div>
                          )}
                        </div>

                        {/* Hourly timeline */}
                        <div className="relative" style={{ height: `${HOURS.length * 20 + 28}px` }}>
                          {HOURS.map((h, hi) => (
                            <div
                              key={h}
                              className="absolute w-full border-b border-dashed border-muted-foreground/10 flex items-center"
                              style={{ top: `${hi * 20}px`, height: '20px' }}
                            >
                              <span className="text-[8px] text-muted-foreground/50 pl-0.5 select-none">{h}h</span>
                            </div>
                          ))}

                          {daySlots.map(slot => {
                            const top = (slot.startHour - 7) * 20;
                            const height = (slot.endHour - slot.startHour) * 20;
                            return (
                              <div
                                key={slot.id}
                                className={`absolute left-5 right-1 rounded px-1 flex items-center gap-0.5 group cursor-default overflow-hidden ${jobColorMap[slot.jobId] || 'bg-muted text-muted-foreground'}`}
                                style={{ top: `${top}px`, height: `${height}px` }}
                                title={`${slot.startHour}h-${slot.endHour}h: ${slot.jobRef} — ${slot.jobTitle}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] font-bold font-mono truncate">{slot.jobRef}</div>
                                  {height >= 40 && (
                                    <div className="text-[8px] truncate opacity-80">{slot.startHour}h-{slot.endHour}h</div>
                                  )}
                                </div>
                                {!isLocked && (
                                  <button
                                    onClick={() => deleteSlot.mutate(slot.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    title="Retirer"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {!isLocked && (
                            <div className="absolute bottom-0 left-0 right-0 p-1">
                              <HourlySlotPopover
                                jobs={activeJobs}
                                jobColorMap={jobColorMap}
                                existingSlots={daySlots}
                                onSelect={(sh, eh, jobId) => handleAssign(team.id, day, sh, eh, jobId)}
                                disabled={createSlot.isPending}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Hourly Slot Popover ──────────────────────────────────────────────────

function HourlySlotPopover({
  jobs, jobColorMap, existingSlots, onSelect, disabled,
}: {
  jobs: { id: string; reference: string; title: string }[];
  jobColorMap: Record<string, string>;
  existingSlots: TeamPlanningSlotData[];
  onSelect: (startHour: number, endHour: number, jobId: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [startHour, setStartHour] = useState(7);
  const [endHour, setEndHour] = useState(12);

  if (jobs.length === 0) return null;

  function suggestNextFreeSlot() {
    if (existingSlots.length === 0) return { start: 7, end: 12 };
    const sorted = [...existingSlots].sort((a, b) => a.startHour - b.startHour);
    const lastEnd = sorted[sorted.length - 1].endHour;
    if (lastEnd < 18) return { start: lastEnd, end: Math.min(lastEnd + 5, 18) };
    return { start: 7, end: 12 };
  }

  function handleOpen(isOpen: boolean) {
    if (isOpen) {
      const suggested = suggestNextFreeSlot();
      setStartHour(suggested.start);
      setEndHour(suggested.end);
    }
    setOpen(isOpen);
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full rounded border-2 border-dashed border-transparent hover:border-muted-foreground/30 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors py-1"
          disabled={disabled}
        >
          <Plus className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ajouter un créneau</div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <Label className="text-[10px]">Début</Label>
            <Select value={String(startHour)} onValueChange={v => { setStartHour(Number(v)); if (Number(v) >= endHour) setEndHour(Number(v) + 1); }}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOURS.map(h => <SelectItem key={h} value={String(h)}>{h}h</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-[10px]">Fin</Label>
            <Select value={String(endHour)} onValueChange={v => setEndHour(Number(v))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOURS.filter(h => h > startHour).map(h => <SelectItem key={h} value={String(h)}>{h}h</SelectItem>)}
                <SelectItem value="18">18h</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs font-medium text-muted-foreground pt-4">{endHour - startHour}h</div>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {jobs.map(j => (
            <button
              key={j.id}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-muted transition-colors"
              onClick={() => { onSelect(startHour, endHour, j.id); setOpen(false); }}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${jobColorMap[j.id]}`}>{j.reference}</span>
                <span className="text-xs truncate">{j.title}</span>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Legacy Tech Planning View ──────────────────────────────────────────────

function TechPlanningView({
  weekDays, isToday, activeJobs, jobColorMap, assignCompany, selectedCompany,
}: {
  weekDays: Date[];
  isToday: (d: Date) => boolean;
  activeJobs: any[];
  jobColorMap: Record<string, string>;
  assignCompany: 'ASP' | 'JS';
  selectedCompany: string;
}) {
  const { data: allUsers = [] } = useUsers();
  const technicians = useFilterByCompany(allUsers.filter(u => u.role === 'technicien'));

  const startDate = toDateStr(weekDays[0]);
  const endDate = toDateStr(weekDays[4]);
  const { data: slots = [] } = usePlanningSlots(startDate, endDate);
  const createSlot = useCreateSlot();
  const deleteSlot = useDeleteSlot();

  const slotLookup = useMemo(() => {
    const map: Record<string, PlanningSlot> = {};
    slots.forEach(s => { map[`${s.userId}_${s.date.slice(0, 10)}`] = s; });
    return map;
  }, [slots]);

  async function handleAssign(userId: string, date: Date, jobId: string) {
    const scope = selectedCompany === 'GROUP' ? assignCompany : undefined;
    await createSlot.mutateAsync({ data: { userId, jobId, date: toDateStr(date) }, companyScope: scope });
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <div className="grid grid-cols-[180px_repeat(5,1fr)] bg-muted/50 border-b min-w-[700px]">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Technicien</div>
        {weekDays.map((day, i) => (
          <div key={i} className={`px-2 py-2 text-center border-l ${isToday(day) ? 'bg-primary/10' : ''}`}>
            <div className="text-[10px] font-medium text-muted-foreground uppercase">{DAY_LABELS[i]}</div>
            <div className={`text-xs font-bold ${isToday(day) ? 'text-primary' : ''}`}>
              {day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
      {technicians.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun technicien trouvé.</div>
      ) : technicians.map(tech => (
        <div key={tech.id} className="grid grid-cols-[180px_repeat(5,1fr)] border-b last:border-b-0 min-w-[700px]">
          <div className="px-3 py-3 border-r flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-secondary-foreground">
                {tech.name.split(' ').map((n: string) => n[0]).join('')}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{tech.name}</div>
              <CompanyBadge company={tech.company} />
            </div>
          </div>
          {weekDays.map((day, i) => {
            const key = `${tech.id}_${toDateStr(day)}`;
            const slot = slotLookup[key];
            return (
              <div key={i} className={`border-l min-h-[56px] p-1 ${isToday(day) ? 'bg-primary/5' : ''}`}>
                {slot ? (
                  <div className={`rounded px-2 py-1 h-full flex items-center gap-1 group ${jobColorMap[slot.jobId] || 'bg-muted'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold font-mono truncate">{slot.jobRef}</div>
                      <div className="text-[9px] truncate opacity-80">{slot.jobTitle}</div>
                    </div>
                    <button onClick={() => deleteSlot.mutate(slot.id)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <SlotPopover
                    jobs={activeJobs}
                    jobColorMap={jobColorMap}
                    onSelect={(jobId) => handleAssign(tech.id, day, jobId)}
                    disabled={createSlot.isPending}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Simple slot popover (legacy tech view) ────────────────────────────────

function SlotPopover({
  jobs, jobColorMap, onSelect, disabled,
}: {
  jobs: { id: string; reference: string; title: string }[];
  jobColorMap: Record<string, string>;
  onSelect: (jobId: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (jobs.length === 0) return <div className="h-full" />;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full h-full min-h-[40px] rounded border-2 border-dashed border-transparent hover:border-muted-foreground/30 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
          disabled={disabled}
        >
          <Plus className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="text-xs font-semibold text-muted-foreground uppercase mb-2 px-1">Assigner</div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {jobs.map(j => (
            <button
              key={j.id}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-muted transition-colors"
              onClick={() => { onSelect(j.id); setOpen(false); }}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${jobColorMap[j.id]}`}>{j.reference}</span>
                <span className="text-xs truncate">{j.title}</span>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Team management drawer ─────────────────────────────────────────────────

function TeamManagementDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { selectedCompany } = useApp();
  const { data: teams = [] } = useTeams();
  const { data: allUsers = [] } = useUsers();
  const createTeam = useCreateTeam();
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();

  const [newTeamName, setNewTeamName] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignCompany, setAssignCompany] = useState<'ASP' | 'JS'>('ASP');

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return;
    const scope = selectedCompany === 'GROUP' ? assignCompany : undefined;
    await createTeam.mutateAsync({ data: { name: newTeamName.trim() }, companyScope: scope });
    setNewTeamName('');
  }

  async function handleAddMember(teamId: string) {
    if (!selectedUserId) return;
    const team = teams.find(t => t.id === teamId);
    await addMember.mutateAsync({ teamId, data: { userId: selectedUserId }, companyId: team?.company });
    setSelectedUserId('');
    setAddingTo(null);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Gestion des équipes</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {selectedCompany === 'GROUP' && (
            <CompanySelect value={assignCompany} onChange={setAssignCompany} />
          )}
          <div className="flex gap-2">
            <Input
              placeholder="Nom de l'équipe"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
            />
            <Button size="sm" onClick={handleCreateTeam} disabled={createTeam.isPending}>Créer</Button>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {teams.map(team => (
            <div key={team.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm">{team.name}</div>
                <CompanyBadge company={team.company as any} />
              </div>
              <div className="space-y-1">
                {team.members.map(m => (
                  <div key={m.userId} className="flex items-center justify-between py-1 px-2 bg-muted/30 rounded">
                    <span className="text-xs">{m.userName}</span>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember.mutate({ teamId: team.id, userId: m.userId, companyId: team.company })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              {addingTo === team.id ? (
                <div className="mt-2 flex gap-2">
                  {(() => {
                    const available = allUsers
                      .filter(u => u.company === team.company && u.role === 'technicien')
                      .filter(u => !team.members.some(m => m.userId === u.id));
                    return (
                      <>
                        <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={available.length === 0}>
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder={available.length === 0 ? 'Aucun technicien disponible' : 'Technicien...'} />
                          </SelectTrigger>
                          <SelectContent>
                            {available.length === 0 ? (
                              <div className="px-3 py-4 text-xs text-muted-foreground text-center">Aucun technicien disponible pour cette équipe.</div>
                            ) : available.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8 text-xs" onClick={() => handleAddMember(team.id)} disabled={addMember.isPending || !selectedUserId || available.length === 0}>OK</Button>
                      </>
                    );
                  })()}
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddingTo(null)}><X className="h-3 w-3" /></Button>
                </div>
              ) : (
                <button
                  className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setAddingTo(team.id); setSelectedUserId(''); }}
                >
                  <UserPlus className="h-3 w-3" /> Ajouter un membre
                </button>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
