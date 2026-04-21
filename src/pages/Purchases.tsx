import { useState } from 'react';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { useUrlState } from '@/hooks/use-url-state';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { FileUploader } from '@/components/shared/FileUploader';
import { Purchase, PurchaseStatus } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowRight, Package, CheckCircle2, ShoppingCart } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePurchases, usePurchaseDetail, useCreatePurchase, useMarkOrdered, useMarkReceived, useClients, useJobs, useActivityLogs, useAttachments } from '@/services/api/hooks';

const workflowSteps: { status: PurchaseStatus; label: string; icon: React.ElementType }[] = [
  { status: 'draft', label: 'Demande', icon: Package },
  { status: 'ordered', label: 'Commandé', icon: ArrowRight },
  { status: 'received', label: 'Reçu', icon: CheckCircle2 },
];

export default function Purchases() {
  const { data: apiPurchases, isLoading, isError } = usePurchases();
  const allPurchases: Purchase[] = apiPurchases ?? [];
  const purchases = useFilterByCompany(allPurchases);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const VALID_PURCHASE_STATUSES: (PurchaseStatus | 'all')[] = ['all', 'draft', 'ordered', 'received', 'partial'];
  const [statusFilterRaw, setStatusFilterRaw] = useUrlState('status', 'all');
  const statusFilter = (VALID_PURCHASE_STATUSES.includes(statusFilterRaw as any)
    ? statusFilterRaw
    : 'all') as PurchaseStatus | 'all';
  const setStatusFilter = (s: PurchaseStatus | 'all') => setStatusFilterRaw(s);

  const { selectedCompany } = useApp();
  const createMutation = useCreatePurchase();
  const markOrderedMutation = useMarkOrdered();
  const markReceivedMutation = useMarkReceived();

  // Data for form selects
  const { data: apiClients } = useClients();
  const { data: apiJobs } = useJobs();
  const suppliers = useFilterByCompany(apiClients ?? []);
  const jobsList = useFilterByCompany(apiJobs ?? []);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formJobId, setFormJobId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formOrderedAt, setFormOrderedAt] = useState(new Date().toISOString().slice(0, 10));
  const [formCompany, setFormCompany] = useState<'ASP' | 'JS'>('ASP');

  function openCreateForm() {
    setFormSupplierId('');
    setFormJobId('');
    setFormAmount('');
    setFormOrderedAt(new Date().toISOString().slice(0, 10));
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formSupplierId.trim()) { toast.error('Saisissez un fournisseur'); return; }
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) { toast.error('Saisissez un montant valide'); return; }

    const scope = selectedCompany === 'GROUP' ? formCompany : undefined;
    await createMutation.mutateAsync({
      data: {
        supplierId: formSupplierId.trim(),
        jobId: formJobId.trim() || undefined,
        amount,
        orderedAt: new Date(formOrderedAt).toISOString(),
      },
      companyScope: scope,
    });
    setFormOpen(false);
  }

  const filtered = statusFilter === 'all' ? purchases : purchases.filter(p => p.status === statusFilter);

  const { data: purchaseActivities = [] } = useActivityLogs('purchase', selectedPurchase?.id ?? null);
  const { data: purchaseFiles = [] } = useAttachments('purchase', selectedPurchase?.id ?? null);
  const { data: purchaseDetail } = usePurchaseDetail(selectedPurchase?.id ?? null);
  const purchaseLines: any[] = purchaseDetail?.lines ?? [];

  const statusCounts = {
    all: purchases.length,
    draft: purchases.filter(p => p.status === 'draft').length,
    ordered: purchases.filter(p => p.status === 'ordered').length,
    partial: purchases.filter(p => p.status === 'partial').length,
    received: purchases.filter(p => p.status === 'received').length,
  };

  const columns: Column<Purchase>[] = [
    { key: 'reference', header: 'Réf.', sortable: true, accessor: (p) => p.reference, render: (p) => (
      <div className="flex items-center gap-2">
        <span className="font-medium font-mono text-xs">{p.reference}</span>
        <CompanyBadge company={p.company} />
      </div>
    )},
    { key: 'supplier', header: 'Fournisseur', sortable: true, accessor: (p) => p.supplierName, render: (p) => <span>{p.supplierName}</span> },
    { key: 'job', header: 'Chantier', render: (p) => <span className="text-xs font-mono text-muted-foreground">{p.jobRef || '–'}</span> },
    { key: 'amount', header: 'Montant', sortable: true, accessor: (p) => p.amount, render: (p) => <span className="font-medium">{p.amount.toLocaleString('fr-FR')} €</span> },
    { key: 'status', header: 'Statut', render: (p) => <StatusBadge type="purchase" status={p.status} /> },
    { key: 'date', header: 'Date', sortable: true, accessor: (p) => p.orderedAt, render: (p) => <span className="text-xs text-muted-foreground">{new Date(p.orderedAt).toLocaleDateString('fr-FR')}</span> },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Achats" subtitle="Chargement…" action={{ label: 'Nouvelle demande', onClick: () => {} }} />
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Achats" subtitle={`${purchases.length} commandes`} action={{ label: 'Nouvelle demande', onClick: openCreateForm }} />
      {/* Workflow status filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all' as const, label: 'Toutes' },
          { key: 'draft' as const, label: 'Demandes' },
          { key: 'ordered' as const, label: 'Commandées' },
          { key: 'partial' as const, label: 'Partielles' },
          { key: 'received' as const, label: 'Reçues' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === f.key ? 'bg-secondary text-secondary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label} ({statusCounts[f.key]})
          </button>
        ))}
      </div>

      {purchases.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Aucune commande" description="Cr\u00e9ez votre premi\u00e8re demande d'achat." />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          searchPlaceholder="Rechercher une commande…"
          searchAccessor={(p) => `${p.reference} ${p.supplierName} ${p.jobRef || ''}`}
          onRowClick={(p) => setSelectedPurchase(p)}
        />
      )}

      {/* Purchase Detail Drawer */}
      <Sheet open={!!selectedPurchase} onOpenChange={(open) => !open && setSelectedPurchase(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedPurchase && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <SheetTitle className="font-mono">{selectedPurchase.reference}</SheetTitle>
                  <CompanyBadge company={selectedPurchase.company} />
                  <StatusBadge type="purchase" status={selectedPurchase.status} />
                </div>
                <p className="text-sm text-muted-foreground">{selectedPurchase.supplierName}</p>
              </SheetHeader>

              {/* Workflow stepper */}
              <div className="flex items-center gap-1 mb-4 bg-muted/30 rounded-lg p-3">
                {workflowSteps.map((step, idx) => {
                  const stepIdx = workflowSteps.findIndex(s => s.status === selectedPurchase.status);
                  const currentIdx = step.status === 'received' && selectedPurchase.status === 'partial' ? 1 : stepIdx;
                  const isActive = idx <= currentIdx;
                  return (
                    <div key={step.status} className="flex items-center gap-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          <step.icon className="h-3 w-3" />
                        </div>
                        <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                      </div>
                      {idx < workflowSteps.length - 1 && <div className={`h-px flex-1 ${isActive ? 'bg-primary' : 'bg-border'}`} />}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mb-4">
                {selectedPurchase.status === 'draft' && (
                  <Button
                    size="sm"
                    className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={markOrderedMutation.isPending}
                    onClick={() => {
                      markOrderedMutation.mutate(selectedPurchase.id, {
                        onSuccess: () => setSelectedPurchase(null),
                      });
                    }}
                  >
                    {markOrderedMutation.isPending ? '…' : 'Passer commande'}
                  </Button>
                )}
                {(selectedPurchase.status === 'ordered' || selectedPurchase.status === 'partial') && (
                  <Button
                    size="sm"
                    className="text-xs bg-success hover:bg-success/90 text-success-foreground"
                    disabled={markReceivedMutation.isPending}
                    onClick={() => {
                      markReceivedMutation.mutate(selectedPurchase.id, {
                        onSuccess: () => setSelectedPurchase(null),
                      });
                    }}
                  >
                    {markReceivedMutation.isPending ? '…' : 'Réceptionner'}
                  </Button>
                )}
              </div>

              <Tabs defaultValue="lines" className="w-full">
                <TabsList className="w-full grid grid-cols-4 h-9">
                  <TabsTrigger value="lines" className="text-xs">Lignes</TabsTrigger>
                  <TabsTrigger value="supplier" className="text-xs">Fournisseur</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs">PJ (BL/BC)</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">Activité</TabsTrigger>
                </TabsList>

                <TabsContent value="lines" className="mt-3">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-xs text-muted-foreground uppercase">
                          <th className="text-left px-3 py-2">Désignation</th>
                          <th className="text-right px-3 py-2">Qté</th>
                          <th className="text-right px-3 py-2">P.U.</th>
                          <th className="text-right px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {purchaseLines.map(line => (
                          <tr key={line.id} className="table-row-hover">
                            <td className="px-3 py-2 font-medium">{line.designation}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{line.quantity}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{line.unitPrice.toFixed(2)} €</td>
                            <td className="px-3 py-2 text-right font-medium">{(line.quantity * line.unitPrice).toLocaleString('fr-FR')} €</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 font-semibold">
                          <td colSpan={3} className="px-3 py-2 text-right text-xs uppercase">Total</td>
                          <td className="px-3 py-2 text-right">{selectedPurchase.amount.toLocaleString('fr-FR')} €</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="supplier" className="mt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><div className="text-xs text-muted-foreground uppercase">Fournisseur</div><div className="font-medium">{selectedPurchase.supplierName}</div></div>
                    <div><div className="text-xs text-muted-foreground uppercase">Chantier</div><div className="font-medium font-mono">{selectedPurchase.jobRef || '–'}</div></div>
                    <div><div className="text-xs text-muted-foreground uppercase">Date commande</div><div className="font-medium">{new Date(selectedPurchase.orderedAt).toLocaleDateString('fr-FR')}</div></div>
                    <div><div className="text-xs text-muted-foreground uppercase">Entité</div><div className="font-medium">{selectedPurchase.company === 'ASP' ? 'ASP Signalisation' : 'JS Concept'}</div></div>
                  </div>
                </TabsContent>

                <TabsContent value="files" className="mt-3">
                  <FileUploader files={purchaseFiles} />
                </TabsContent>

                <TabsContent value="activity" className="mt-3">
                  <ActivityFeed activities={purchaseActivities} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Form Drawer */}
      <Sheet open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Nouvelle demande d'achat</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <CompanySelect value={formCompany} onChange={setFormCompany} />
            <div className="space-y-1.5">
              <Label htmlFor="p-supplier">Fournisseur *</Label>
              <Select value={formSupplierId} onValueChange={setFormSupplierId}>
                <SelectTrigger id="p-supplier">
                  <SelectValue placeholder="Sélectionnez un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-job">Chantier (optionnel)</Label>
              <Select value={formJobId || '__none__'} onValueChange={(v) => setFormJobId(v === '__none__' ? '' : v)}>
                <SelectTrigger id="p-job">
                  <SelectValue placeholder="Aucun chantier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {jobsList.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.reference} — {j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-amount">Montant HT *</Label>
              <Input id="p-amount" type="number" min="0" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-date">Date *</Label>
              <Input id="p-date" type="date" value={formOrderedAt} onChange={e => setFormOrderedAt(e.target.value)} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Création…' : 'Créer la demande'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
