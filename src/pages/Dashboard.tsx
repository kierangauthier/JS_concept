import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, FileText, HardHat, Receipt, AlertTriangle, Clock,
  Camera, ShoppingCart, CheckCircle2, XCircle, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuotes, useJobs, useInvoices, usePurchases, useTimeEntries, useWorkshopItems, useDashboardMargins } from '@/services/api/hooks';
import { CashflowWidget } from '@/components/dashboard/CashflowWidget';

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
  const { currentUser } = useApp();
  const isComptable = currentUser?.role === 'comptable';
  const { data: apiQuotes, isLoading: loadingQuotes } = useQuotes();
  const { data: apiJobs, isLoading: loadingJobs } = useJobs();
  const { data: apiInvoices, isLoading: loadingInvoices } = useInvoices();
  const { data: apiPurchases, isLoading: loadingPurchases } = usePurchases();
  const { data: apiTimeEntries, isLoading: loadingTime } = useTimeEntries();
  const { data: apiWorkshopItems, isLoading: loadingWorkshop } = useWorkshopItems();
  const { data: dashboardMargins } = useDashboardMargins();

  const isLoading = loadingQuotes || loadingJobs || loadingInvoices || loadingPurchases || loadingTime || loadingWorkshop;

  const quotes = useFilterByCompany(apiQuotes ?? []);
  const jobs = useFilterByCompany(apiJobs ?? []);
  const invoices = useFilterByCompany(apiInvoices ?? []);
  const purchases = useFilterByCompany(apiPurchases ?? []);
  const timeEntries = useFilterByCompany(apiTimeEntries ?? []);
  const workshopItems = useFilterByCompany(apiWorkshopItems ?? []);

  const totalCA = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const activeJobs = jobs.filter(j => j.status === 'in_progress');
  const pendingQuotes = quotes.filter(q => q.status === 'sent');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const unreceived = purchases.filter(p => p.status === 'ordered');
  const batPending = workshopItems.filter(w => w.status === 'bat_pending');

  const totalInvoiced = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const totalPurchases = purchases.reduce((s, p) => s + p.amount, 0);
  const purchasesUnpaid = purchases.filter(p => p.status !== 'received').reduce((s, p) => s + p.amount, 0);

  const stats = isComptable ? [
    { label: 'CA encaissé', value: `${(totalCA / 1000).toFixed(0)}k €`, icon: TrendingUp, color: 'text-success' },
    { label: 'Créances', value: `${(totalInvoiced / 1000).toFixed(0)}k €`, icon: Receipt, color: 'text-warning' },
    { label: 'Factures en retard', value: overdueInvoices.length, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Dettes fournisseurs', value: `${(purchasesUnpaid / 1000).toFixed(0)}k €`, icon: ShoppingCart, color: 'text-info' },
  ] : [
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

  // Low margin jobs
  if (dashboardMargins && dashboardMargins.lowMarginCount > 0) {
    alerts.push({
      id: 'low-margin',
      type: 'warning',
      icon: TrendingUp,
      title: `${dashboardMargins.lowMarginCount} chantier(s) avec marge < 15%`,
      detail: dashboardMargins.lowMarginJobs.slice(0, 3).map(j => `${j.reference} (${j.marginPercent}%)`).join(', '),
      link: '/jobs',
      linkLabel: 'Voir chantiers',
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

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
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-semibold">Centre de commande</h2>
          {alerts.length > 0 && (
            <span className="text-xs text-muted-foreground bg-warning/15 text-warning-foreground rounded-full px-2 py-0.5 font-medium">{alerts.length}</span>
          )}
        </div>
        {alerts.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Aucune alerte" description="Tout est en ordre, aucune action requise." />
        ) : (
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
        )}
      </div>

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

      {/* Margin widget */}
      {!isComptable && dashboardMargins && (dashboardMargins.best.length > 0 || dashboardMargins.worst.length > 0) && (
        <div className="bg-card rounded-lg border">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Marges chantiers</h2>
            </div>
            <span className={`text-sm font-bold ${dashboardMargins.avgMargin >= 25 ? 'text-success' : dashboardMargins.avgMargin >= 15 ? 'text-warning' : 'text-destructive'}`}>
              Moy. {dashboardMargins.avgMargin}%
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
            {/* Best margins */}
            <div className="p-4">
              <div className="text-xs font-medium text-success uppercase tracking-wider mb-3">Meilleures marges</div>
              <div className="space-y-2">
                {dashboardMargins.best.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-28 truncate">{m.reference}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-success/70" style={{ width: `${Math.min(Math.max(m.marginPercent, 0), 100)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-success w-12 text-right">{m.marginPercent}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Worst margins */}
            <div className="p-4">
              <div className="text-xs font-medium text-destructive uppercase tracking-wider mb-3">Marges à surveiller</div>
              <div className="space-y-2">
                {dashboardMargins.worst.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-28 truncate">{m.reference}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${m.marginPercent >= 15 ? 'bg-warning/70' : 'bg-destructive/70'}`} style={{ width: `${Math.min(Math.max(m.marginPercent, 0), 100)}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${m.marginPercent >= 15 ? 'text-warning' : 'text-destructive'}`}>{m.marginPercent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cashflow forecast widget */}
      <CashflowWidget />

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isComptable ? (
          <>
            <div className="bg-card rounded-lg border p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Factures émises</div>
              <div className="text-xl font-bold">{invoices.filter(i => i.status === 'sent').length}</div>
              <div className="text-xs text-muted-foreground">{invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.amount, 0).toLocaleString('fr-FR')} €</div>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Factures payées</div>
              <div className="text-xl font-bold">{invoices.filter(i => i.status === 'paid').length}</div>
              <div className="text-xs text-muted-foreground">{totalCA.toLocaleString('fr-FR')} €</div>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Commandes fournisseurs</div>
              <div className="text-xl font-bold">{purchases.length}</div>
              <div className="text-xs text-muted-foreground">{totalPurchases.toLocaleString('fr-FR')} €</div>
            </div>
            <div className="bg-card rounded-lg border p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Créances &gt;30j</div>
              <div className="text-xl font-bold text-destructive">{overdueInvoices.length}</div>
              <div className="text-xs text-muted-foreground">{overdueInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString('fr-FR')} €</div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
