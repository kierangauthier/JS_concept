import { useState, useMemo } from 'react';
import { useFormGuard } from '@/hooks/use-dirty-form';
import { useUrlState } from '@/hooks/use-url-state';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { FileUploader } from '@/components/shared/FileUploader';
import { Job } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { List, CalendarDays, FileDown, Users, Camera, Clock, ShoppingCart, FileText, Info, Pencil, HardHat } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useJobs, useJobDetail, useQuotes, useCreateJob, useUpdateJob, useUpdateJobStatus, useActivityLogs, useAttachments, useJobMargin, usePurchases } from '@/services/api/hooks';
import { CreateJobPayload } from '@/services/api/jobs.api';

const STATUS_ACTIONS: Partial<Record<Job['status'], { label: string; next: Job['status']; variant?: 'default' | 'destructive' | 'outline' }[]>> = {
  planned: [{ label: 'Démarrer', next: 'in_progress' }],
  in_progress: [
    { label: 'Mettre en pause', next: 'paused', variant: 'outline' },
    { label: 'Terminer', next: 'completed' },
  ],
  paused: [{ label: 'Reprendre', next: 'in_progress' }],
  completed: [{ label: 'Facturer', next: 'invoiced' }],
};

export default function Jobs() {
  const { data: apiJobs, isLoading, isError } = useJobs();
  const allJobs: Job[] = apiJobs ?? [];
  const jobs = useFilterByCompany(allJobs);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewModeRaw, setViewModeRaw] = useUrlState('view', 'table');
  const viewMode = (viewModeRaw === 'timeline' ? 'timeline' : 'table') as 'table' | 'timeline';
  const setViewMode = (v: 'table' | 'timeline') => setViewModeRaw(v);

  const { selectedCompany } = useApp();

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formQuoteId, setFormQuoteId] = useState('');
  const [formHourlyRate, setFormHourlyRate] = useState('');
  const [formEstimatedHours, setFormEstimatedHours] = useState('');
  const [formCompany, setFormCompany] = useState<'ASP' | 'JS'>('ASP');
  const [formBaseline, setFormBaseline] = useState<unknown>(null);

  const formValuesForGuard = useMemo(
    () => ({
      title: formTitle, address: formAddress,
      startDate: formStartDate, endDate: formEndDate,
      quoteId: formQuoteId, hourlyRate: formHourlyRate,
      estimatedHours: formEstimatedHours,
    }),
    [formTitle, formAddress, formStartDate, formEndDate, formQuoteId, formHourlyRate, formEstimatedHours],
  );
  const { guardClose: guardCloseForm } = useFormGuard(
    formValuesForGuard,
    formOpen ? (formBaseline as typeof formValuesForGuard | null) : null,
    formOpen,
  );
  const closeForm = () => {
    setFormOpen(false);
    setEditingJob(null);
    setFormBaseline(null);
  };

  // API hooks
  const { data: jobDetail } = useJobDetail(selectedJob?.id ?? null);
  const { data: apiQuotes } = useQuotes();
  const acceptedQuotes = (apiQuotes ?? []).filter(q => q.status === 'accepted');

  const createMutation = useCreateJob();
  const updateMutation = useUpdateJob();
  const statusMutation = useUpdateJobStatus();

  const { data: apiPurchases } = usePurchases();
  const jobPurchases = (apiPurchases ?? []).filter(p => p.jobId === selectedJob?.id);
  const jobTimeEntries = jobDetail?.timeEntries ?? [];
  const { data: jobActivities = [] } = useActivityLogs('job', selectedJob?.id ?? null);
  const { data: jobFiles = [] } = useAttachments('job', selectedJob?.id ?? null);
  const { data: jobMargin } = useJobMargin(selectedJob?.id ?? null);

  const columns: Column<Job>[] = [
    { key: 'reference', header: 'Réf.', sortable: true, accessor: (j) => j.reference, render: (j) => (
      <div className="flex items-center gap-2">
        <span className="font-medium font-mono text-xs">{j.reference}</span>
        <CompanyBadge company={j.company} />
      </div>
    )},
    { key: 'title', header: 'Titre', render: (j) => <span className="truncate max-w-[200px] block">{j.title}</span> },
    { key: 'client', header: 'Client', sortable: true, accessor: (j) => j.clientName, render: (j) => <span className="text-muted-foreground">{j.clientName}</span> },
    { key: 'progress', header: 'Avancement', render: (j) => (
      <div className="flex items-center gap-2 w-24">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${j.progress}%` }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground w-8">{j.progress}%</span>
      </div>
    )},
    { key: 'status', header: 'Statut', render: (j) => <StatusBadge type="job" status={j.status} /> },
    { key: 'startDate', header: 'Début', sortable: true, accessor: (j) => j.startDate, render: (j) => <span className="text-xs text-muted-foreground">{new Date(j.startDate).toLocaleDateString('fr-FR')}</span> },
    { key: 'assignedTo', header: 'Équipe', render: (j) => <span className="text-xs text-muted-foreground">{j.assignedTo.join(', ')}</span> },
  ];

  const statusOrder: Job['status'][] = ['in_progress', 'planned', 'paused', 'completed', 'invoiced'];
  const statusLabels: Record<string, string> = {
    in_progress: 'En cours', planned: 'Planifié', paused: 'En pause', completed: 'Terminé', invoiced: 'Facturé'
  };
  const timelineGroups = useMemo(() => {
    return statusOrder.map(s => ({ status: s, label: statusLabels[s], jobs: jobs.filter(j => j.status === s) })).filter(g => g.jobs.length > 0);
  }, [jobs]);

  function openCreateForm() {
    setEditingJob(null);
    setFormTitle('');
    setFormAddress('');
    const startDate = new Date().toISOString().slice(0, 10);
    setFormStartDate(startDate);
    setFormEndDate('');
    setFormQuoteId('');
    setFormHourlyRate('');
    setFormEstimatedHours('');
    setFormBaseline({
      title: '', address: '', startDate, endDate: '', quoteId: '',
      hourlyRate: '', estimatedHours: '',
    });
    setFormOpen(true);
  }

  function openEditForm(j: Job) {
    setEditingJob(j);
    const title = j.title;
    const address = j.address;
    const startDate = j.startDate ? j.startDate.slice(0, 10) : '';
    const endDate = j.endDate ? j.endDate.slice(0, 10) : '';
    const quoteId = j.quoteId ?? '';
    const hourlyRate = jobMargin?.hourlyRate ? String(jobMargin.hourlyRate) : '';
    const estimatedHours = jobMargin?.estimatedHours ? String(jobMargin.estimatedHours) : '';
    setFormTitle(title);
    setFormAddress(address);
    setFormStartDate(startDate);
    setFormEndDate(endDate);
    setFormQuoteId(quoteId);
    setFormHourlyRate(hourlyRate);
    setFormEstimatedHours(estimatedHours);
    setFormBaseline({ title, address, startDate, endDate, quoteId, hourlyRate, estimatedHours });
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) { toast.error('Saisissez un titre'); return; }
    if (!formAddress.trim()) { toast.error('Saisissez une adresse'); return; }
    if (!formStartDate) { toast.error('Saisissez une date de début'); return; }

    const payload: CreateJobPayload = {
      title: formTitle.trim(),
      address: formAddress.trim(),
      startDate: new Date(formStartDate).toISOString(),
      endDate: formEndDate ? new Date(formEndDate).toISOString() : undefined,
      quoteId: formQuoteId && formQuoteId !== '__none__' ? formQuoteId : undefined,
      hourlyRate: formHourlyRate ? parseFloat(formHourlyRate) : undefined,
      estimatedHours: formEstimatedHours ? parseFloat(formEstimatedHours) : undefined,
    };

    if (editingJob) {
      await updateMutation.mutateAsync({ id: editingJob.id, data: payload });
    } else {
      const scope = selectedCompany === 'GROUP' ? formCompany : undefined;
      await createMutation.mutateAsync({ data: payload, companyScope: scope });
    }
    closeForm();
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Chantiers" subtitle="Chargement…" action={{ label: 'Nouveau chantier', onClick: () => {} }} />
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chantiers"
        subtitle={`${jobs.length} chantiers`}
        action={{ label: 'Nouveau chantier', onClick: openCreateForm }}
      >
        <div className="flex items-center border rounded-md overflow-hidden">
          <button className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`} onClick={() => setViewMode('table')}>
            <List className="h-3.5 w-3.5" />
          </button>
          <button className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'timeline' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`} onClick={() => setViewMode('timeline')}>
            <CalendarDays className="h-3.5 w-3.5" />
          </button>
        </div>
      </PageHeader>

      {jobs.length === 0 ? (
        <EmptyState icon={HardHat} title="Aucun chantier" description="Cr\u00e9ez votre premier chantier ou convertissez un devis accept\u00e9." />
      ) : viewMode === 'table' ? (
        <DataTable
          data={jobs}
          columns={columns}
          searchPlaceholder="Rechercher un chantier…"
          searchAccessor={(j) => `${j.reference} ${j.title} ${j.clientName} ${j.assignedTo.join(' ')}`}
          onRowClick={(j) => setSelectedJob(j)}
        />
      ) : (
        <div className="space-y-6">
          {timelineGroups.map(group => (
            <div key={group.status}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{group.jobs.length}</span>
              </div>
              <div className="space-y-2">
                {group.jobs.map(job => (
                  <button key={job.id} onClick={() => setSelectedJob(job)} className="w-full text-left bg-card border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium">{job.reference}</span>
                        <CompanyBadge company={job.company} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(job.startDate).toLocaleDateString('fr-FR')}</span>
                        {job.endDate && <span className="text-xs text-muted-foreground">→ {new Date(job.endDate).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>
                    <h4 className="text-sm font-medium mb-1">{job.title}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{job.clientName} · {job.assignedTo.join(', ')}</span>
                      <div className="flex items-center gap-2 w-20">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${job.progress}%` }} />
                        </div>
                        <span className="text-xs font-medium">{job.progress}%</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job Detail Drawer */}
      <Sheet open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedJob && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <SheetTitle className="font-mono">{selectedJob.reference}</SheetTitle>
                  <CompanyBadge company={selectedJob.company} />
                  <StatusBadge type="job" status={selectedJob.status} />
                </div>
                <p className="text-sm font-medium">{selectedJob.title}</p>
                <p className="text-xs text-muted-foreground">{selectedJob.clientName} · {selectedJob.address}</p>
              </SheetHeader>

              {/* Progress + Actions */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Avancement</span>
                      <span className="font-bold">{selectedJob.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${selectedJob.progress}%` }} />
                    </div>
                  </div>
                  <Button size="sm" className="text-xs gap-1" variant="outline" onClick={() => toast.info('Bientôt disponible')}>
                    <FileDown className="h-3 w-3" /> Générer OS
                  </Button>
                </div>

                {/* Status transition buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    onClick={() => openEditForm(selectedJob)}
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </Button>
                  {STATUS_ACTIONS[selectedJob.status]?.map(action => (
                    <Button
                      key={action.next}
                      size="sm"
                      variant={action.variant ?? 'default'}
                      className="text-xs"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: selectedJob.id, status: action.next })}
                    >
                      {statusMutation.isPending ? '…' : action.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Margin card */}
              {jobMargin && (
                <div className={`rounded-lg border p-3 mb-4 ${jobMargin.marginPercent >= 25 ? 'bg-success/5 border-success/30' : jobMargin.marginPercent >= 15 ? 'bg-warning/5 border-warning/30' : 'bg-destructive/5 border-destructive/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marge chantier</span>
                    <span className={`text-lg font-bold ${jobMargin.marginPercent >= 25 ? 'text-success' : jobMargin.marginPercent >= 15 ? 'text-warning' : 'text-destructive'}`}>
                      {jobMargin.marginPercent}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Devisé</div>
                      <div className="font-medium">{jobMargin.revenueHT.toLocaleString('fr-FR')} €</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Coût heures</div>
                      <div className="font-medium">{jobMargin.costHours.toLocaleString('fr-FR')} € ({jobMargin.totalHours}h)</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Coût achats</div>
                      <div className="font-medium">{jobMargin.costPurchases.toLocaleString('fr-FR')} €</div>
                    </div>
                  </div>
                </div>
              )}

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="w-full grid grid-cols-7 h-9">
                  <TabsTrigger value="info" className="text-[10px] px-1"><Info className="h-3 w-3" /></TabsTrigger>
                  <TabsTrigger value="planning" className="text-[10px] px-1"><CalendarDays className="h-3 w-3" /></TabsTrigger>
                  <TabsTrigger value="team" className="text-[10px] px-1"><Users className="h-3 w-3" /></TabsTrigger>
                  <TabsTrigger value="photos" className="text-[10px] px-1"><Camera className="h-3 w-3" /></TabsTrigger>
                  <TabsTrigger value="hours" className="text-[10px] px-1"><Clock className="h-3 w-3" /></TabsTrigger>
                  <TabsTrigger value="purchases" className="text-[10px] px-1"><ShoppingCart className="h-3 w-3" /></TabsTrigger>
                  <TabsTrigger value="docs" className="text-[10px] px-1"><FileText className="h-3 w-3" /></TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-3 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-xs text-muted-foreground uppercase">Client</div><div className="font-medium">{selectedJob.clientName}</div></div>
                    <div><div className="text-xs text-muted-foreground uppercase">Adresse</div><div className="font-medium">{selectedJob.address}</div></div>
                    <div><div className="text-xs text-muted-foreground uppercase">Début</div><div className="font-medium">{new Date(selectedJob.startDate).toLocaleDateString('fr-FR')}</div></div>
                    <div><div className="text-xs text-muted-foreground uppercase">Fin</div><div className="font-medium">{selectedJob.endDate ? new Date(selectedJob.endDate).toLocaleDateString('fr-FR') : '–'}</div></div>
                    <div><div className="text-xs text-muted-foreground uppercase">Devis lié</div><div className="font-medium font-mono">{selectedJob.quoteId || '–'}</div></div>
                    <div><div className="text-xs text-muted-foreground uppercase">Entité</div><div className="font-medium">{selectedJob.company === 'ASP' ? 'ASP Signalisation' : 'JS Concept'}</div></div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Fil d'activité</h4>
                    <ActivityFeed activities={jobActivities} />
                  </div>
                </TabsContent>

                <TabsContent value="planning" className="mt-3">
                  <div className="bg-muted/30 rounded-lg p-6 text-center">
                    <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Planning détaillé du chantier</p>
                    <p className="text-xs text-muted-foreground mt-1">Bientôt disponible</p>
                  </div>
                </TabsContent>

                <TabsContent value="team" className="mt-3">
                  <div className="space-y-2">
                    {selectedJob.assignedTo.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                          <span className="text-xs font-bold text-secondary-foreground">{name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium">{name}</div>
                          <div className="text-xs text-muted-foreground">Affecté au chantier</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="photos" className="mt-3">
                  <FileUploader files={jobFiles.filter(f => f.type === 'image')} />
                </TabsContent>

                <TabsContent value="hours" className="mt-3">
                  {jobTimeEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune heure saisie</p>
                  ) : (
                    <div className="space-y-2">
                      {jobTimeEntries.map(te => (
                        <div key={te.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="text-xs text-muted-foreground w-16">{new Date(te.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{te.userName}</div>
                            <div className="text-xs text-muted-foreground truncate">{te.description}</div>
                          </div>
                          <span className="text-sm font-bold">{te.hours}h</span>
                        </div>
                      ))}
                      <div className="text-right text-sm font-bold border-t pt-2">
                        Total : {jobTimeEntries.reduce((s, t) => s + t.hours, 0)}h
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="purchases" className="mt-3">
                  {jobPurchases.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune commande liée</p>
                  ) : (
                    <div className="space-y-2">
                      {jobPurchases.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium font-mono">{p.reference}</div>
                            <div className="text-xs text-muted-foreground">{p.supplierName}</div>
                          </div>
                          <span className="text-sm font-medium">{p.amount.toLocaleString('fr-FR')} €</span>
                          <StatusBadge type="purchase" status={p.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="docs" className="mt-3">
                  <FileUploader files={jobFiles} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / Edit Form Drawer */}
      <Sheet open={formOpen} onOpenChange={(open) => { if (!open) guardCloseForm(closeForm); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{editingJob ? `Modifier ${editingJob.reference}` : 'Nouveau chantier'}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {!editingJob && <CompanySelect value={formCompany} onChange={setFormCompany} />}
            <div className="space-y-1.5">
              <Label htmlFor="j-title">Titre *</Label>
              <Input id="j-title" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Titre du chantier" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="j-address">Adresse *</Label>
              <Input id="j-address" value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Adresse du chantier" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="j-start">Date début *</Label>
                <Input id="j-start" type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="j-end">Date fin</Label>
                <Input id="j-end" type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="j-rate">Taux horaire (€/h)</Label>
                <Input id="j-rate" type="number" step="0.01" min="0" value={formHourlyRate} onChange={e => setFormHourlyRate(e.target.value)} placeholder="45" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="j-hours">Heures estimées</Label>
                <Input id="j-hours" type="number" step="0.5" min="0" value={formEstimatedHours} onChange={e => setFormEstimatedHours(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="j-quote">Devis lié (optionnel)</Label>
              <Select value={formQuoteId} onValueChange={setFormQuoteId}>
                <SelectTrigger id="j-quote">
                  <SelectValue placeholder="Aucun devis lié" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {acceptedQuotes.map(q => (
                    <SelectItem key={q.id} value={q.id}>{q.reference} — {q.subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Enregistrement…' : editingJob ? 'Mettre à jour' : 'Créer le chantier'}
              </Button>
              <Button type="button" variant="outline" onClick={() => guardCloseForm(closeForm)}>
                Annuler
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
