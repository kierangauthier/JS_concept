import { useFilterByCompany } from '@/contexts/AppContext';
import { mockPurchases } from '@/services/mockData';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { Purchase } from '@/types';
import { toast } from 'sonner';

export default function Purchases() {
  const purchases = useFilterByCompany(mockPurchases);

  const columns: Column<Purchase>[] = [
    { key: 'reference', header: 'Réf.', sortable: true, accessor: (p) => p.reference, render: (p) => (
      <div className="flex items-center gap-2">
        <span className="font-medium font-mono text-xs">{p.reference}</span>
        <CompanyBadge company={p.company} />
      </div>
    )},
    { key: 'supplier', header: 'Fournisseur', sortable: true, accessor: (p) => p.supplierName, render: (p) => <span>{p.supplierName}</span> },
    { key: 'job', header: 'Chantier', render: (p) => <span className="text-xs font-mono text-muted-foreground">{p.jobRef || '–'}</span> },
    { key: 'amount', header: 'Montant', sortable: true, accessor: (p) => p.amount, render: (p) => (
      <span className="font-medium">{p.amount.toLocaleString('fr-FR')} €</span>
    )},
    { key: 'status', header: 'Statut', render: (p) => <StatusBadge type="purchase" status={p.status} /> },
    { key: 'date', header: 'Date', sortable: true, accessor: (p) => p.orderedAt, render: (p) => (
      <span className="text-xs text-muted-foreground">{new Date(p.orderedAt).toLocaleDateString('fr-FR')}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Achats" subtitle={`${purchases.length} commandes`} action={{ label: 'Nouvelle commande', onClick: () => toast.info('Ouverture formulaire commande') }} />
      <DataTable
        data={purchases}
        columns={columns}
        searchPlaceholder="Rechercher une commande…"
        searchAccessor={(p) => `${p.reference} ${p.supplierName} ${p.jobRef || ''}`}
        onRowClick={() => toast.info('Ouverture détails commande (side panel)')}
      />
    </div>
  );
}
