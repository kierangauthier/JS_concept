import { useState } from 'react';
import { useFilterByCompany } from '@/contexts/AppContext';
import { mockPurchases } from '@/services/mockData';
import { mockActivities, mockAttachments, mockQuoteLines } from '@/services/mockDataExtended';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { FileUploader } from '@/components/shared/FileUploader';
import { Purchase, PurchaseStatus } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowRight, Package, CheckCircle2 } from 'lucide-react';

const workflowSteps: { status: PurchaseStatus; label: string; icon: React.ElementType }[] = [
  { status: 'draft', label: 'Demande', icon: Package },
  { status: 'ordered', label: 'Commandé', icon: ArrowRight },
  { status: 'received', label: 'Reçu', icon: CheckCircle2 },
];

export default function Purchases() {
  const purchases = useFilterByCompany(mockPurchases);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | 'all'>('all');

  const filtered = statusFilter === 'all' ? purchases : purchases.filter(p => p.status === statusFilter);

  const purchaseActivities = selectedPurchase ? mockActivities.filter(a => a.entityId === selectedPurchase.id && a.entityType === 'purchase') : [];
  const purchaseFiles = selectedPurchase ? mockAttachments.filter(a => a.entityId === selectedPurchase.id) : [];

  // Fake purchase lines (reuse some quote lines as order lines)
  const purchaseLines = selectedPurchase ? mockQuoteLines.slice(0, 3).map((l, i) => ({
    ...l, id: `pl${i}`, designation: ['Panneaux D21a lot 18', 'Supports IPN galva x15', 'Massifs béton 50x50 x15'][i] || l.designation,
    quantity: [18, 15, 15][i] || l.quantity,
    unitPrice: [195, 280, 95][i] || l.unitPrice,
  })) : [];

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

  return (
    <div className="space-y-4">
      <PageHeader title="Achats" subtitle={`${purchases.length} commandes`} action={{ label: 'Nouvelle demande', onClick: () => toast.info('Formulaire nouvelle demande d\'achat') }} />

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

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Rechercher une commande…"
        searchAccessor={(p) => `${p.reference} ${p.supplierName} ${p.jobRef || ''}`}
        onRowClick={(p) => setSelectedPurchase(p)}
      />

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
                  const isCurrent = idx === currentIdx;
                  return (
                    <div key={step.status} className="flex items-center gap-1 flex-1">
                      <div className={`flex items-center gap-1.5 flex-1 ${isCurrent ? '' : ''}`}>
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
                  <Button size="sm" className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => toast.success('Commande passée')}>
                    Passer commande
                  </Button>
                )}
                {selectedPurchase.status === 'ordered' && (
                  <Button size="sm" className="text-xs bg-success hover:bg-success/90 text-success-foreground" onClick={() => toast.success('Réception enregistrée')}>
                    Réceptionner
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
    </div>
  );
}
