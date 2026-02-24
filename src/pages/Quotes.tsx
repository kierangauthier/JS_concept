import { useFilterByCompany } from '@/contexts/AppContext';
import { mockQuotes } from '@/services/mockData';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { Quote } from '@/types';
import { toast } from 'sonner';

export default function Quotes() {
  const quotes = useFilterByCompany(mockQuotes);

  const columns: Column<Quote>[] = [
    { key: 'reference', header: 'Référence', sortable: true, accessor: (q) => q.reference, render: (q) => (
      <div className="flex items-center gap-2">
        <span className="font-medium font-mono text-xs">{q.reference}</span>
        <CompanyBadge company={q.company} />
      </div>
    )},
    { key: 'client', header: 'Client', sortable: true, accessor: (q) => q.clientName, render: (q) => <span>{q.clientName}</span> },
    { key: 'subject', header: 'Objet', render: (q) => <span className="text-muted-foreground truncate max-w-[200px] block">{q.subject}</span> },
    { key: 'amount', header: 'Montant', sortable: true, accessor: (q) => q.amount, render: (q) => (
      <span className="font-medium">{q.amount.toLocaleString('fr-FR')} €</span>
    )},
    { key: 'status', header: 'Statut', render: (q) => <StatusBadge type="quote" status={q.status} /> },
    { key: 'date', header: 'Date', sortable: true, accessor: (q) => q.createdAt, render: (q) => (
      <span className="text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleDateString('fr-FR')}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Devis" subtitle={`${quotes.length} devis`} action={{ label: 'Nouveau devis', onClick: () => toast.info('Ouverture formulaire devis') }} />
      <DataTable
        data={quotes}
        columns={columns}
        searchPlaceholder="Rechercher un devis…"
        searchAccessor={(q) => `${q.reference} ${q.clientName} ${q.subject}`}
        onRowClick={() => toast.info('Ouverture détails devis (side panel)')}
      />
    </div>
  );
}
