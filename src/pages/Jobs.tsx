import { useState, useMemo } from 'react';
import { useFilterByCompany } from '@/contexts/AppContext';
import { mockJobs, mockPurchases, mockTimeEntries } from '@/services/mockData';
import { mockActivities, mockAttachments } from '@/services/mockDataExtended';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { FileUploader } from '@/components/shared/FileUploader';
import { Job } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { List, CalendarDays, FileDown, Users, Camera, Clock, ShoppingCart, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function Jobs() {
  const jobs = useFilterByCompany(mockJobs);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  const jobPurchases = selectedJob ? mockPurchases.filter(p => p.jobId === selectedJob.id) : [];
  const jobTimeEntries = selectedJob ? mockTimeEntries.filter(t => t.jobId === selectedJob.id) : [];
  const jobActivities = selectedJob ? mockActivities.filter(a => a.entityId === selectedJob.id && a.entityType === 'job') : [];
  const jobFiles = selectedJob ? mockAttachments.filter(a => a.entityId === selectedJob.id) : [];

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

  // Timeline grouping
  const statusOrder: Job['status'][] = ['in_progress', 'planned', 'paused', 'completed', 'invoiced'];
  const statusLabels: Record<string, string> = {
    in_progress: 'En cours', planned: 'Planifié', paused: 'En pause', completed: 'Terminé', invoiced: 'Facturé'
  };
  const timelineGroups = useMemo(() => {
    return statusOrder.map(s => ({ status: s, label: statusLabels[s], jobs: jobs.filter(j => j.status === s) })).filter(g => g.jobs.length > 0);
  }, [jobs]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chantiers"
        subtitle={`${jobs.length} chantiers`}
        action={{ label: 'Nouveau chantier', onClick: () => toast.info('Formulaire nouveau chantier') }}
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

      {viewMode === 'table' ? (
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

              {/* Progress + Action */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Avancement</span>
                    <span className="font-bold">{selectedJob.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${selectedJob.progress}%` }} />
                  </div>
                </div>
                <Button size="sm" className="text-xs gap-1" variant="outline" onClick={() => toast.success('Génération OS (PDF) - placeholder')}>
                  <FileDown className="h-3 w-3" /> Générer OS
                </Button>
              </div>

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
                    <p className="text-xs text-muted-foreground mt-1">Diagramme de Gantt — prochaine itération</p>
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
    </div>
  );
}
