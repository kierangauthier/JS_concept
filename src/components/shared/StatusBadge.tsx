import { QuoteStatus, JobStatus, PurchaseStatus, InvoiceStatus } from '@/types';

interface BadgeConfig {
  label: string;
  className: string;
}

const quoteStatusMap: Record<QuoteStatus, BadgeConfig> = {
  draft: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Envoyé', className: 'bg-info/15 text-info' },
  accepted: { label: 'Accepté', className: 'bg-success/15 text-success' },
  refused: { label: 'Refusé', className: 'bg-destructive/15 text-destructive' },
  expired: { label: 'Expiré', className: 'bg-muted text-muted-foreground' },
};

const jobStatusMap: Record<JobStatus, BadgeConfig> = {
  planned: { label: 'Planifié', className: 'bg-info/15 text-info' },
  in_progress: { label: 'En cours', className: 'bg-primary/15 text-primary-foreground' },
  paused: { label: 'En pause', className: 'bg-warning/15 text-warning-foreground' },
  completed: { label: 'Terminé', className: 'bg-success/15 text-success' },
  invoiced: { label: 'Facturé', className: 'bg-muted text-muted-foreground' },
};

const purchaseStatusMap: Record<PurchaseStatus, BadgeConfig> = {
  draft: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  ordered: { label: 'Commandé', className: 'bg-info/15 text-info' },
  received: { label: 'Reçu', className: 'bg-success/15 text-success' },
  partial: { label: 'Partiel', className: 'bg-warning/15 text-warning-foreground' },
};

const invoiceStatusMap: Record<InvoiceStatus, BadgeConfig> = {
  draft: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Envoyée', className: 'bg-info/15 text-info' },
  paid: { label: 'Payée', className: 'bg-success/15 text-success' },
  overdue: { label: 'En retard', className: 'bg-destructive/15 text-destructive' },
  cancelled: { label: 'Annulée', className: 'bg-muted text-muted-foreground' },
};

type StatusType = 'quote' | 'job' | 'purchase' | 'invoice';

interface StatusBadgeProps {
  type: StatusType;
  status: string;
}

export function StatusBadge({ type, status }: StatusBadgeProps) {
  let config: BadgeConfig | undefined;

  switch (type) {
    case 'quote': config = quoteStatusMap[status as QuoteStatus]; break;
    case 'job': config = jobStatusMap[status as JobStatus]; break;
    case 'purchase': config = purchaseStatusMap[status as PurchaseStatus]; break;
    case 'invoice': config = invoiceStatusMap[status as InvoiceStatus]; break;
  }

  if (!config) return <span>{status}</span>;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export function CompanyBadge({ company }: { company: string }) {
  const isASP = company === 'ASP';
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
      isASP ? 'bg-secondary text-secondary-foreground' : 'bg-primary/20 text-primary-foreground'
    }`}>
      {isASP ? 'ASP' : 'JS'}
    </span>
  );
}
