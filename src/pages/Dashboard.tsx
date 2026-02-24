import { useFilterByCompany } from '@/contexts/AppContext';
import { mockQuotes, mockJobs, mockInvoices } from '@/services/mockData';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { TrendingUp, FileText, HardHat, Receipt, AlertTriangle, Clock } from 'lucide-react';

export default function Dashboard() {
  const quotes = useFilterByCompany(mockQuotes);
  const jobs = useFilterByCompany(mockJobs);
  const invoices = useFilterByCompany(mockInvoices);

  const totalCA = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const activeJobs = jobs.filter(j => j.status === 'in_progress').length;
  const pendingQuotes = quotes.filter(q => q.status === 'sent').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');

  const stats = [
    { label: 'CA encaissé', value: `${(totalCA / 1000).toFixed(0)}k €`, icon: TrendingUp, color: 'text-success' },
    { label: 'Chantiers actifs', value: activeJobs, icon: HardHat, color: 'text-info' },
    { label: 'Devis en attente', value: pendingQuotes, icon: FileText, color: 'text-primary' },
    { label: 'Factures en retard', value: overdueInvoices.length, icon: AlertTriangle, color: 'text-destructive' },
  ];

  const recentJobs = jobs.filter(j => j.status === 'in_progress').slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de l'activité</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Active jobs */}
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Chantiers en cours</h2>
        </div>
        <div className="divide-y">
          {recentJobs.map(job => (
            <div key={job.id} className="px-4 py-3 flex items-center gap-4 table-row-hover">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{job.reference}</span>
                  <CompanyBadge company={job.company} />
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{job.title}</div>
              </div>
              <div className="text-xs text-muted-foreground">{job.clientName}</div>
              <div className="w-24">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${job.progress}%` }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{job.progress}%</span>
                </div>
              </div>
              <StatusBadge type="job" status={job.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Overdue invoices */}
      {overdueInvoices.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" />
            Factures en retard
          </h3>
          <div className="space-y-2">
            {overdueInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{inv.reference}</span>
                  <span className="text-muted-foreground ml-2">{inv.clientName}</span>
                </div>
                <span className="font-semibold">{inv.amount.toLocaleString('fr-FR')} €</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
