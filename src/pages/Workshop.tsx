import { useState, useMemo } from 'react';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { WorkshopItem, WorkshopStatus } from '@/services/mockDataExtended';
import { PageHeader } from '@/components/shared/PageHeader';
import { CompanyBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkshopItems, useCreateWorkshopItem, useNextStep, useJobs, useActivityLogs } from '@/services/api/hooks';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Columns3, List, ArrowRight, CheckCircle2, Cog, Truck, Eye, Paintbrush, Wrench } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { DataTable, Column } from '@/components/shared/DataTable';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { CompanySelect } from '@/components/shared/CompanySelect';

const workshopStages: { status: WorkshopStatus; label: string; icon: React.ElementType; color: string }[] = [
  { status: 'bat_pending', label: 'BAT en attente', icon: Eye, color: 'border-t-warning' },
  { status: 'bat_approved', label: 'BAT validé', icon: CheckCircle2, color: 'border-t-info' },
  { status: 'fabrication', label: 'Fabrication', icon: Cog, color: 'border-t-primary' },
  { status: 'ready', label: 'Prêt', icon: Paintbrush, color: 'border-t-success' },
  { status: 'pose_planned', label: 'Pose planifiée', icon: Truck, color: 'border-t-info' },
  { status: 'pose_done', label: 'Posé', icon: CheckCircle2, color: 'border-t-muted-foreground' },
];

const statusBadge: Record<WorkshopStatus, { label: string; className: string }> = {
  bat_pending: { label: 'BAT en attente', className: 'bg-warning/15 text-warning-foreground' },
  bat_approved: { label: 'BAT validé', className: 'bg-info/15 text-info' },
  fabrication: { label: 'Fabrication', className: 'bg-primary/15 text-primary-foreground' },
  ready: { label: 'Prêt', className: 'bg-success/15 text-success' },
  pose_planned: { label: 'Pose planifiée', className: 'bg-info/15 text-info' },
  pose_done: { label: 'Posé', className: 'bg-muted text-muted-foreground' },
};

const priorityBadge: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive',
  medium: 'bg-warning/15 text-warning-foreground',
  low: 'bg-muted text-muted-foreground',
};

export default function Workshop() {
  const { data: apiWorkshopItems, isLoading, isError } = useWorkshopItems();
  const allItems = useFilterByCompany(apiWorkshopItems ?? []);
  const [selected, setSelected] = useState<WorkshopItem | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const { selectedCompany } = useApp();
  const createMutation = useCreateWorkshopItem();
  const nextStepMutation = useNextStep();

  // Jobs for the create form
  const { data: apiJobs } = useJobs();
  const jobs = apiJobs ?? [];

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formJobId, setFormJobId] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formDueDate, setFormDueDate] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formCompany, setFormCompany] = useState<'ASP' | 'JS'>(selectedCompany === 'JS' ? 'JS' : 'ASP');

  function openCreateForm() {
    setFormTitle('');
    setFormDescription('');
    setFormJobId('');
    setFormPriority('medium');
    setFormDueDate('');
    setFormAssignedTo('');
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) { toast.error('Saisissez un titre'); return; }
    if (!formJobId) { toast.error('Sélectionnez un chantier'); return; }

    const scope = selectedCompany === 'GROUP' ? formCompany : undefined;
    await createMutation.mutateAsync({
      data: {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        jobId: formJobId,
        priority: formPriority,
        dueDate: formDueDate ? new Date(formDueDate).toISOString() : undefined,
        assignedTo: formAssignedTo.trim() || undefined,
      },
      companyScope: scope,
    });
    setFormOpen(false);
  }

  const byStatus = useMemo(() => {
    const map: Record<WorkshopStatus, WorkshopItem[]> = {
      bat_pending: [], bat_approved: [], fabrication: [], ready: [], pose_planned: [], pose_done: [],
    };
    allItems.forEach(i => map[i.status]?.push(i));
    return map;
  }, [allItems]);

  const columns: Column<WorkshopItem>[] = [
    { key: 'reference', header: 'Réf.', sortable: true, accessor: (i) => i.reference, render: (i) => (
      <div className="flex items-center gap-2">
        <span className="font-medium font-mono text-xs">{i.reference}</span>
        <CompanyBadge company={i.company} />
      </div>
    )},
    { key: 'title', header: 'Titre', render: (i) => <span className="truncate max-w-[200px] block">{i.title}</span> },
    { key: 'job', header: 'Chantier', render: (i) => <span className="text-xs font-mono text-muted-foreground">{i.jobRef}</span> },
    { key: 'status', header: 'Statut', render: (i) => {
      const b = statusBadge[i.status];
      return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${b.className}`}>{b.label}</span>;
    }},
    { key: 'priority', header: 'Priorité', render: (i) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${priorityBadge[i.priority]}`}>{i.priority}</span> },
    { key: 'due', header: 'Échéance', sortable: true, accessor: (i) => i.dueDate, render: (i) => <span className="text-xs text-muted-foreground">{i.dueDate ? new Date(i.dueDate).toLocaleDateString('fr-FR') : '—'}</span> },
    { key: 'assigned', header: 'Assigné', render: (i) => <span className="text-xs text-muted-foreground">{i.assignedTo ?? '—'}</span> },
  ];

  const { data: selectedActivities = [] } = useActivityLogs('workshop', selected?.id ?? null);

  const nextAction = (status: WorkshopStatus): { label: string; next: WorkshopStatus } | null => {
    const flow: [WorkshopStatus, string, WorkshopStatus][] = [
      ['bat_pending', 'Valider BAT', 'bat_approved'],
      ['bat_approved', 'Lancer fabrication', 'fabrication'],
      ['fabrication', 'Marquer prêt', 'ready'],
      ['ready', 'Planifier pose', 'pose_planned'],
      ['pose_planned', 'Marquer posé', 'pose_done'],
    ];
    const f = flow.find(([s]) => s === status);
    return f ? { label: f[1], next: f[2] } : null;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Atelier" subtitle="Chargement…" action={{ label: 'Nouvelle fabrication', onClick: () => {} }} />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Atelier"
        subtitle={`${allItems.length} fabrications`}
        action={{ label: 'Nouvelle fabrication', onClick: openCreateForm }}
      >
        <div className="flex items-center border rounded-md overflow-hidden">
          <button className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`} onClick={() => setViewMode('kanban')}>
            <Columns3 className="h-3.5 w-3.5" />
          </button>
          <button className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`} onClick={() => setViewMode('list')}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </PageHeader>

      {allItems.length === 0 ? (
        <EmptyState icon={Wrench} title="Aucune fabrication" description="Créez votre première fabrication pour suivre la production." />
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {workshopStages.map(stage => (
            <div key={stage.status} className={`bg-muted/30 rounded-lg border-t-2 ${stage.color} min-h-[200px]`}>
              <div className="px-2 py-2 flex items-center gap-1.5">
                <stage.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stage.label}</h3>
                <span className="text-[10px] text-muted-foreground ml-auto">{byStatus[stage.status]?.length || 0}</span>
              </div>
              <div className="px-1.5 pb-1.5 space-y-1.5">
                {(byStatus[stage.status] || []).map(item => (
                  <button key={item.id} onClick={() => setSelected(item)} className="w-full text-left bg-card rounded-md border p-2.5 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-muted-foreground">{item.reference}</span>
                      <span className={`text-[9px] font-medium uppercase px-1 py-0.5 rounded ${priorityBadge[item.priority]}`}>{item.priority}</span>
                    </div>
                    <h4 className="text-xs font-medium leading-tight line-clamp-2 mb-1">{item.title}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{item.assignedTo?.split(' ')[0] ?? '—'}</span>
                      <span className="text-[10px] text-muted-foreground">{item.dueDate ? new Date(item.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          data={allItems}
          columns={columns}
          searchPlaceholder="Rechercher…"
          searchAccessor={(i) => `${i.reference} ${i.title} ${i.jobRef} ${i.assignedTo ?? ''}`}
          onRowClick={(i) => setSelected(i)}
        />
      )}

      {/* Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <SheetTitle className="font-mono">{selected.reference}</SheetTitle>
                  <CompanyBadge company={selected.company} />
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[selected.status].className}`}>
                    {statusBadge[selected.status].label}
                  </span>
                </div>
                <p className="text-sm font-medium">{selected.title}</p>
              </SheetHeader>

              {/* Workflow progress */}
              <div className="flex items-center gap-1 mb-4 bg-muted/30 rounded-lg p-3 overflow-x-auto">
                {workshopStages.map((stage, idx) => {
                  const currentIdx = workshopStages.findIndex(s => s.status === selected.status);
                  const isActive = idx <= currentIdx;
                  return (
                    <div key={stage.status} className="flex items-center gap-1 flex-1 min-w-0">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <stage.icon className="h-2.5 w-2.5" />
                      </div>
                      {idx < workshopStages.length - 1 && <div className={`h-px flex-1 min-w-1 ${isActive ? 'bg-primary' : 'bg-border'}`} />}
                    </div>
                  );
                })}
              </div>

              {/* Next action */}
              {(() => {
                const na = nextAction(selected.status);
                return na ? (
                  <Button
                    size="sm"
                    className="w-full mb-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                    disabled={nextStepMutation.isPending}
                    onClick={() => {
                      nextStepMutation.mutate(selected.id, {
                        onSuccess: () => setSelected(null),
                      });
                    }}
                  >
                    <ArrowRight className="h-3 w-3" /> {nextStepMutation.isPending ? '…' : na.label}
                  </Button>
                ) : null;
              })()}

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><div className="text-xs text-muted-foreground uppercase">Chantier</div><div className="font-medium font-mono">{selected.jobRef}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Assigné</div><div className="font-medium">{selected.assignedTo ?? '—'}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Échéance</div><div className="font-medium">{selected.dueDate ? new Date(selected.dueDate).toLocaleDateString('fr-FR') : '—'}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Priorité</div><div className="font-medium capitalize">{selected.priority}</div></div>
              </div>

              <div className="text-sm mb-4">
                <div className="text-xs text-muted-foreground uppercase mb-1">Description</div>
                <p>{selected.description}</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Fil d'activité</h4>
                <ActivityFeed activities={selectedActivities} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Form Drawer */}
      <Sheet open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Nouvelle fabrication</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <CompanySelect value={formCompany} onChange={setFormCompany} />
            <div className="space-y-1.5">
              <Label htmlFor="w-title">Titre *</Label>
              <Input id="w-title" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Description de la fabrication" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-desc">Description</Label>
              <Input id="w-desc" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Détails supplémentaires" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-job">Chantier *</Label>
              <Select value={formJobId} onValueChange={setFormJobId}>
                <SelectTrigger id="w-job"><SelectValue placeholder="Sélectionnez un chantier" /></SelectTrigger>
                <SelectContent>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.reference} — {j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-priority">Priorité</Label>
              <Select value={formPriority} onValueChange={(v: 'low' | 'medium' | 'high') => setFormPriority(v)}>
                <SelectTrigger id="w-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-due">Échéance</Label>
              <Input id="w-due" type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="w-assigned">Assigné à</Label>
              <Input id="w-assigned" value={formAssignedTo} onChange={e => setFormAssignedTo(e.target.value)} placeholder="Nom de l'opérateur" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Création…' : 'Créer la fabrication'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
