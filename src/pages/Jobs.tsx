import { useFilterByCompany } from '@/contexts/AppContext';
import { mockJobs } from '@/services/mockData';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { Job } from '@/types';
import { toast } from 'sonner';

export default function Jobs() {
  const jobs = useFilterByCompany(mockJobs);

  const columns: Column<Job>[] = [
    { key: 'reference', header: 'Référence', sortable: true, accessor: (j) => j.reference, render: (j) => (
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
    { key: 'startDate', header: 'Début', sortable: true, accessor: (j) => j.startDate, render: (j) => (
      <span className="text-xs text-muted-foreground">{new Date(j.startDate).toLocaleDateString('fr-FR')}</span>
    )},
    { key: 'assignedTo', header: 'Équipe', render: (j) => (
      <span className="text-xs text-muted-foreground">{j.assignedTo.join(', ')}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Chantiers" subtitle={`${jobs.length} chantiers`} action={{ label: 'Nouveau chantier', onClick: () => toast.info('Ouverture formulaire chantier') }} />
      <DataTable
        data={jobs}
        columns={columns}
        searchPlaceholder="Rechercher un chantier…"
        searchAccessor={(j) => `${j.reference} ${j.title} ${j.clientName} ${j.assignedTo.join(' ')}`}
        onRowClick={() => toast.info('Ouverture détails chantier (side panel)')}
      />
    </div>
  );
}
