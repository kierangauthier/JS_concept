import { useState } from 'react';
import { useFilterByCompany } from '@/contexts/AppContext';
import { mockInvoices } from '@/services/mockData';
import { mockSituations, mockActivities, mockAttachments } from '@/services/mockDataExtended';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { FileUploader } from '@/components/shared/FileUploader';
import { Invoice, InvoiceStatus } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function Invoicing() {
  const invoices = useFilterByCompany(mockInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  const filtered = statusFilter === 'all' ? invoices : invoices.filter(i => i.status === statusFilter);

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const totalDraft = invoices.filter(i => i.status === 'draft').reduce((s, i) => s + i.amount, 0);

  const invoiceActivities = selectedInvoice ? mockActivities.filter(a => a.entityId === selectedInvoice.id && a.entityType === 'invoice') : [];
  const invoiceFiles = selectedInvoice ? mockAttachments.filter(a => a.entityId === selectedInvoice.id) : [];
  const invoiceSituations = selectedInvoice ? mockSituations.filter(s => s.invoiceId === selectedInvoice.id) : [];

  const statusCounts = {
    all: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    cancelled: invoices.filter(i => i.status === 'cancelled').length,
  };

  const columns: Column<Invoice>[] = [
    { key: 'reference', header: 'Réf.', sortable: true, accessor: (i) => i.reference, render: (i) => (
      <div className="flex items-center gap-2">
        <span className="font-medium font-mono text-xs">{i.reference}</span>
        <CompanyBadge company={i.company} />
      </div>
    )},
    { key: 'client', header: 'Client', sortable: true, accessor: (i) => i.clientName, render: (i) => <span>{i.clientName}</span> },
    { key: 'job', header: 'Chantier', render: (i) => <span className="text-xs font-mono text-muted-foreground">{i.jobRef || '–'}</span> },
    { key: 'amount', header: 'Montant', sortable: true, accessor: (i) => i.amount, render: (i) => <span className="font-medium">{i.amount.toLocaleString('fr-FR')} €</span> },
    { key: 'status', header: 'Statut', render: (i) => <StatusBadge type="invoice" status={i.status} /> },
    { key: 'issued', header: 'Émission', sortable: true, accessor: (i) => i.issuedAt, render: (i) => <span className="text-xs text-muted-foreground">{new Date(i.issuedAt).toLocaleDateString('fr-FR')}</span> },
    { key: 'due', header: 'Échéance', render: (i) => (
      <span className={`text-xs ${i.status === 'overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
        {new Date(i.dueDate).toLocaleDateString('fr-FR')}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Facturation" subtitle={`${invoices.length} factures`} action={{ label: 'Nouvelle facture', onClick: () => toast.info('Formulaire nouvelle facture') }}>
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => toast.success('Export comptable généré (CSV placeholder)')}>
          <Download className="h-3 w-3" /> Export compta
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Encaissé</div>
          <div className="text-xl font-bold text-success">{totalPaid.toLocaleString('fr-FR')} €</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">En attente</div>
          <div className="text-xl font-bold text-warning">{totalPending.toLocaleString('fr-FR')} €</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Brouillons</div>
          <div className="text-xl font-bold text-muted-foreground">{totalDraft.toLocaleString('fr-FR')} €</div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all' as const, label: 'Toutes' },
          { key: 'draft' as const, label: 'Brouillons' },
          { key: 'sent' as const, label: 'Envoyées' },
          { key: 'paid' as const, label: 'Payées' },
          { key: 'overdue' as const, label: 'En retard' },
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
        searchPlaceholder="Rechercher une facture…"
        searchAccessor={(i) => `${i.reference} ${i.clientName} ${i.jobRef || ''}`}
        onRowClick={(i) => setSelectedInvoice(i)}
      />

      {/* Invoice Detail Drawer */}
      <Sheet open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedInvoice && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <SheetTitle className="font-mono">{selectedInvoice.reference}</SheetTitle>
                  <CompanyBadge company={selectedInvoice.company} />
                  <StatusBadge type="invoice" status={selectedInvoice.status} />
                </div>
                <p className="text-sm text-muted-foreground">{selectedInvoice.clientName}</p>
              </SheetHeader>

              {/* Actions */}
              <div className="flex gap-2 mb-4">
                {selectedInvoice.status === 'draft' && (
                  <Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => toast.success('Facture envoyée')}>
                    <Send className="h-3 w-3" /> Envoyer
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => toast.info('Téléchargement PDF')}>
                  <Download className="h-3 w-3" /> PDF
                </Button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><div className="text-xs text-muted-foreground uppercase">Montant</div><div className="text-lg font-bold">{selectedInvoice.amount.toLocaleString('fr-FR')} €</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Chantier</div><div className="font-medium font-mono">{selectedInvoice.jobRef || '–'}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Émission</div><div className="font-medium">{new Date(selectedInvoice.issuedAt).toLocaleDateString('fr-FR')}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Échéance</div><div className={`font-medium ${selectedInvoice.status === 'overdue' ? 'text-destructive' : ''}`}>{new Date(selectedInvoice.dueDate).toLocaleDateString('fr-FR')}</div></div>
                {selectedInvoice.paidAt && (
                  <div><div className="text-xs text-muted-foreground uppercase">Payée le</div><div className="font-medium text-success">{new Date(selectedInvoice.paidAt).toLocaleDateString('fr-FR')}</div></div>
                )}
              </div>

              <Tabs defaultValue={invoiceSituations.length > 0 ? 'situations' : 'activity'} className="w-full">
                <TabsList className="w-full grid grid-cols-3 h-9">
                  <TabsTrigger value="situations" className="text-xs">Situations</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs">Documents</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">Activité</TabsTrigger>
                </TabsList>

                <TabsContent value="situations" className="mt-3">
                  {invoiceSituations.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-2">Pas de situations de travaux</p>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => toast.info('Créer situation')}>
                        Ajouter une situation
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {invoiceSituations.map(sit => (
                        <div key={sit.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{sit.label}</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              sit.status === 'paid' ? 'bg-success/15 text-success' :
                              sit.status === 'sent' ? 'bg-info/15 text-info' : 'bg-muted text-muted-foreground'
                            }`}>{sit.status === 'paid' ? 'Payée' : sit.status === 'sent' ? 'Envoyée' : 'Brouillon'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{sit.percentage}% · {new Date(sit.date).toLocaleDateString('fr-FR')}</span>
                            <span className="font-medium text-foreground">{sit.amount.toLocaleString('fr-FR')} €</span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${sit.status === 'paid' ? 'bg-success' : sit.status === 'sent' ? 'bg-info' : 'bg-muted-foreground/30'}`} style={{ width: `${sit.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                      <div className="text-right text-sm font-bold border-t pt-2">
                        Total situations : {invoiceSituations.reduce((s, sit) => s + sit.amount, 0).toLocaleString('fr-FR')} €
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="files" className="mt-3">
                  <FileUploader files={invoiceFiles} />
                </TabsContent>

                <TabsContent value="activity" className="mt-3">
                  <ActivityFeed activities={invoiceActivities} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
