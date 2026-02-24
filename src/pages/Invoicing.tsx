import { useFilterByCompany } from '@/contexts/AppContext';
import { mockInvoices } from '@/services/mockData';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { Invoice } from '@/types';
import { toast } from 'sonner';

export default function Invoicing() {
  const invoices = useFilterByCompany(mockInvoices);

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.amount, 0);

  const columns: Column<Invoice>[] = [
    { key: 'reference', header: 'Réf.', sortable: true, accessor: (i) => i.reference, render: (i) => (
      <div className="flex items-center gap-2">
        <span className="font-medium font-mono text-xs">{i.reference}</span>
        <CompanyBadge company={i.company} />
      </div>
    )},
    { key: 'client', header: 'Client', sortable: true, accessor: (i) => i.clientName, render: (i) => <span>{i.clientName}</span> },
    { key: 'job', header: 'Chantier', render: (i) => <span className="text-xs font-mono text-muted-foreground">{i.jobRef || '–'}</span> },
    { key: 'amount', header: 'Montant', sortable: true, accessor: (i) => i.amount, render: (i) => (
      <span className="font-medium">{i.amount.toLocaleString('fr-FR')} €</span>
    )},
    { key: 'status', header: 'Statut', render: (i) => <StatusBadge type="invoice" status={i.status} /> },
    { key: 'issued', header: 'Émission', sortable: true, accessor: (i) => i.issuedAt, render: (i) => (
      <span className="text-xs text-muted-foreground">{new Date(i.issuedAt).toLocaleDateString('fr-FR')}</span>
    )},
    { key: 'due', header: 'Échéance', render: (i) => (
      <span className={`text-xs ${i.status === 'overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
        {new Date(i.dueDate).toLocaleDateString('fr-FR')}
      </span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Facturation" subtitle={`${invoices.length} factures`} action={{ label: 'Nouvelle facture', onClick: () => toast.info('Ouverture formulaire facture') }} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Encaissé</div>
          <div className="text-xl font-bold text-success">{totalPaid.toLocaleString('fr-FR')} €</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">En attente</div>
          <div className="text-xl font-bold text-warning">{totalPending.toLocaleString('fr-FR')} €</div>
        </div>
      </div>

      <DataTable
        data={invoices}
        columns={columns}
        searchPlaceholder="Rechercher une facture…"
        searchAccessor={(i) => `${i.reference} ${i.clientName} ${i.jobRef || ''}`}
        onRowClick={() => toast.info('Ouverture détails facture (side panel)')}
      />
    </div>
  );
}
