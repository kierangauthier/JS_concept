import { useFilterByCompany } from '@/contexts/AppContext';
import { mockQuotes, mockJobs, mockInvoices, mockPurchases, mockTimeEntries } from '@/services/mockData';
import { mockWorkshopItems } from '@/services/mockDataExtended';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import {
  TrendingUp, FileText, HardHat, Receipt, AlertTriangle, Clock,
  Camera, ShoppingCart, CheckCircle2, XCircle, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  icon: React.ElementType;
  title: string;
  detail: string;
  link: string;
  linkLabel: string;
}

export default function Dashboard() {
  const quotes = useFilterByCompany(mockQuotes);
  const jobs = useFilterByCompany(mockJobs);
  const invoices = useFilterByCompany(mockInvoices);
  const purchases = useFilterByCompany(mockPurchases);
  const timeEntries = useFilterByCompany(mockTimeEntries);
  const workshopItems = useFilterByCompany(mockWorkshopItems);

  const totalCA = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const activeJobs = jobs.filter(j => j.status === 'in_progress');
  const pendingQuotes = quotes.filter(q => q.status === 'sent');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const unreceived = purchases.filter(p => p.status === 'ordered');
  const batPending = workshopItems.filter(w => w.status === 'bat_pending');

  const stats = [
    { label: 'CA encaissé', value: `${(totalCA / 1000).toFixed(0)}k €`, icon: TrendingUp, color: 'text-success' },
    { label: 'Chantiers actifs', value: activeJobs.length, icon: HardHat, color: 'text-info' },
    { label: 'Devis en attente', value: pendingQuotes.length, icon: FileText, color: 'text-primary' },
    { label: 'Factures en retard', value: overdueInvoices.length, icon: AlertTriangle, color: 'text-destructive' },
  ];

  // Command Center alerts
  const alerts: Alert[] = [];

  // Overdue invoices
  overdueInvoices.forEach(inv => {
    alerts.push({
      id: `inv-${inv.id}`,
      type: 'danger',
      icon: Receipt,
      title: `Facture en retard: ${inv.reference}`,
      detail: `${inv.clientName} · ${inv.amount.toLocaleString('fr-FR')} € · échue le ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}`,
      link: '/invoicing',
      linkLabel: 'Voir',
    });
  });

  // Jobs without recent photos (simulated: in_progress jobs)
  const jobsMissingPhotos = activeJobs.filter(j => j.progress > 30 && j.progress < 90);
  if (jobsMissingPhotos.length > 0) {
    alerts.push({
      id: 'missing-photos',
      type: 'warning',
      icon: Camera,
      title: `${jobsMissingPhotos.length} chantier(s) sans photo récente`,
      detail: jobsMissingPhotos.slice(0, 3).map(j => j.reference).join(', '),
      link: '/jobs',
      linkLabel: 'Voir chantiers',
    });
  }

  // Unvalidated hours
  if (timeEntries.length > 0) {
    alerts.push({
      id: 'unvalidated-hours',
      type: 'warning',
      icon: Clock,
      title: `${timeEntries.length} saisie(s) d'heures à valider`,
      detail: `${timeEntries.reduce((s, t) => s + t.hours, 0)}h au total`,
      link: '/jobs',
      linkLabel: 'Valider',
    });
  }

  // Unreceived orders
  if (unreceived.length > 0) {
    alerts.push({
      id: 'unreceived-orders',
      type: 'info',
      icon: ShoppingCart,
      title: `${unreceived.length} commande(s) non réceptionnée(s)`,
      detail: unreceived.slice(0, 3).map(p => p.reference).join(', '),
      link: '/purchases',
      linkLabel: 'Voir achats',
    });
  }

  // BAT pending
  if (batPending.length > 0) {
    alerts.push({
      id: 'bat-pending',
      type: 'info',
      icon: FileText,
      title: `${batPending.length} BAT en attente de validation`,
      detail: batPending.map(w => w.reference).join(', '),
      link: '/workshop',
      linkLabel: 'Voir atelier',
    });
  }

  const alertColors = {
    danger: 'border-l-destructive bg-destructive/5',
    warning: 'border-l-warning bg-warning/5',
    info: 'border-l-info bg-info/5',
  };
  const alertIconColors = {
    danger: 'text-destructive',
    warning: 'text-warning',
    info: 'text-info',
  };

  const recentJobs = activeJobs.slice(0, 6);

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

      {/* Command Center */}
      {alerts.length > 0 && (
        <div className="bg-card rounded-lg border">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-semibold">Centre de commande</h2>
            <span className="text-xs text-muted-foreground bg-warning/15 text-warning-foreground rounded-full px-2 py-0.5 font-medium">{alerts.length}</span>
          </div>
          <div className="divide-y">
            {alerts.map(alert => (
              <div key={alert.id} className={`px-4 py-3 flex items-center gap-3 border-l-2 ${alertColors[alert.type]}`}>
                <alert.icon className={`h-4 w-4 flex-shrink-0 ${alertIconColors[alert.type]}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{alert.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{alert.detail}</div>
                </div>
                <Link to={alert.link} className="text-xs font-medium text-info hover:underline flex items-center gap-1 flex-shrink-0">
                  {alert.linkLabel} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active jobs */}
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Chantiers en cours</h2>
          </div>
          <Link to="/jobs" className="text-xs text-info hover:underline">Voir tous</Link>
        </div>
        <div className="divide-y">
          {recentJobs.map(job => (
            <div key={job.id} className="px-4 py-3 flex items-center gap-4 table-row-hover">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium font-mono">{job.reference}</span>
                  <CompanyBadge company={job.company} />
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{job.title}</div>
              </div>
              <div className="text-xs text-muted-foreground hidden sm:block">{job.clientName}</div>
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

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Devis acceptés</div>
          <div className="text-xl font-bold">{quotes.filter(q => q.status === 'accepted').length}</div>
          <div className="text-xs text-muted-foreground">{quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + q.amount, 0).toLocaleString('fr-FR')} € HT</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Commandes en cours</div>
          <div className="text-xl font-bold">{unreceived.length}</div>
          <div className="text-xs text-muted-foreground">{unreceived.reduce((s, p) => s + p.amount, 0).toLocaleString('fr-FR')} €</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Fabrications atelier</div>
          <div className="text-xl font-bold">{workshopItems.filter(w => w.status === 'fabrication').length}</div>
          <div className="text-xs text-muted-foreground">{batPending.length} BAT en attente</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Chantiers terminés</div>
          <div className="text-xl font-bold">{jobs.filter(j => j.status === 'completed').length}</div>
          <div className="text-xs text-muted-foreground">ce mois</div>
        </div>
      </div>
    </div>
  );
}
