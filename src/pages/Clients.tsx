import { useFilterByCompany } from '@/contexts/AppContext';
import { mockClients } from '@/services/mockData';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { CompanyBadge } from '@/components/shared/StatusBadge';
import { Client } from '@/types';
import { toast } from 'sonner';

export default function Clients() {
  const clients = useFilterByCompany(mockClients);

  const columns: Column<Client>[] = [
    { key: 'name', header: 'Nom', sortable: true, accessor: (c) => c.name, render: (c) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{c.name}</span>
        <CompanyBadge company={c.company} />
      </div>
    )},
    { key: 'contact', header: 'Contact', accessor: (c) => c.contact, render: (c) => <span>{c.contact}</span> },
    { key: 'city', header: 'Ville', sortable: true, accessor: (c) => c.city, render: (c) => <span>{c.city}</span> },
    { key: 'type', header: 'Type', render: (c) => (
      <span className={`text-xs font-medium ${c.type === 'public' ? 'text-info' : 'text-muted-foreground'}`}>
        {c.type === 'public' ? 'Public' : 'Privé'}
      </span>
    )},
    { key: 'phone', header: 'Téléphone', render: (c) => <span className="text-muted-foreground">{c.phone}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Clients" subtitle={`${clients.length} clients`} action={{ label: 'Nouveau client', onClick: () => toast.info('Ouverture formulaire client') }} />
      <DataTable
        data={clients}
        columns={columns}
        searchPlaceholder="Rechercher un client…"
        searchAccessor={(c) => `${c.name} ${c.contact} ${c.city} ${c.email}`}
        onRowClick={() => toast.info('Ouverture fiche client (side panel)')}
      />
    </div>
  );
}
