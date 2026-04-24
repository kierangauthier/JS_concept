import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, FileText, Receipt, AlertTriangle,
  Camera, ShoppingCart, CheckCircle2, ArrowRight, Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuotes, useJobs, useInvoices, usePurchases, useTimeEntries, useWorkshopItems, useDashboardMargins } from '@/services/api/hooks';
import { CashflowWidget } from '@/components/dashboard/CashflowWidget';
import { AiBriefingWidget } from '@/components/ai';
import AiProactiveAlerts from '@/components/ai/AiProactiveAlerts';

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
  const purchasesUnpaid = purchases.filter(p => p.status !== 'received').reduce((s, p) => s + p.amount, 0);

  const avgMargin = dashboardMargins?.avgMargin ?? null;
  const marginColor = avgMargin === null ? 'text-muted-foreground'
    : avgMargin >= 25 ? 'text-success'
    : avgMargin >= 15 ? 'text-warning'
    : 'text-destructive';

  const stats = isComptable ? [
    { label: 'CA encaissé', value: `${(totalCA / 1000).toFixed(0)}k €`, icon: TrendingUp, color: 'text-success' },
    { label: 'Créances', value: `${(totalInvoiced / 1000).toFixed(0)}k €`, icon: Receipt, color: 'text-warning' },
    { label: 'Factures en retard', value: overdueInvoices.length, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Dettes fournisseurs', value: `${(purchasesUnpaid / 1000).toFixed(0)}k €`, icon: ShoppingCart, color: 'text-info' },
  ] : [
    { label: 'CA encaissé', value: `${(totalCA / 1000).toFixed(0)}k €`, icon: TrendingUp, color: 'text-success' },
    { label: 'Marge moyenne', value: avgMargin !== null ? `${avgMargin}%` : '—', icon: TrendingUp, color: marginColor },
    { label: 'Créances', value: `${(totalInvoiced / 1000).toFixed(0)}k €`, icon: Receipt, color: 'text-warning' },
    { label: 'Pipeline devis', value: `${(pendingQuotes.reduce((s, q) => s + q.amount, 0) / 1000).toFixed(0)}k €`, icon: FileText, color: 'text-primary' },
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

  // Jobs without any photo (real count from API)
  const jobsMissingPhotos = activeJobs.filter(j => (j.photoCount ?? 0) === 0);
  if (jobsMissingPhotos.length > 0) {
    alerts.push({
      id: 'missing-photos',
      type: 'warning',
      icon: Camera,
      title: `${jobsMissingPhotos.length} chantier(s) sans photo`,
      detail: jobsMissingPhotos.slice(0, 3).map(j => j.reference).join(', '),
      link: '/jobs',
      linkLabel: 'Voir chantiers',
    });
  }

  // Unvalidated hours — only entries waiting for manager approval
  const pendingTimeEntries = timeEntries.filter(t => t.status === 'submitted');
  if (pendingTimeEntries.length > 0) {
    alerts.push({
      id: 'unvalidated-hours',
      type: 'warning',
      icon: Clock,
      title: `${pendingTimeEntries.length} saisie(s) d'heures à valider`,
      detail: `${pendingTimeEntries.reduce((s, t) => s + t.hours, 0)}h en attente`,
      link: '/time-validation',
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de l'activité</p>
      </div>

      {/* Zone 1 — À TRAITER (priorité absolue : toutes les alertes en tête) */}
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-semibold">À traiter</h2>
          {alerts.length > 0 && (
            <span className="text-xs bg-warning/15 text-warning-foreground rounded-full px-2 py-0.5 font-medium">{alerts.length}</span>
          )}
        </div>
        {alerts.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Aucune alerte" description="Tout est en ordre, aucune action requise." />
        ) : (
          <div className="divide-y">
            {alerts.slice(0, 5).map(alert => (
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
            {alerts.length > 5 && (
              <div className="px-4 py-2 text-center">
                <span className="text-xs text-muted-foreground">+ {alerts.length - 5} alerte(s) supplémentaire(s)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 1 bis — Alertes IA proactives (avec emails pré-rédigés) */}
      {!isComptable && (
        <div className="rounded-lg border bg-card p-4">
          <AiProactiveAlerts />
        </div>
      )}

      {/* Zone 2 — Santé de l'activité (4 KPI synthétiques, UNE seule rangée) */}
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

      {/* Zone 3 — Cashflow prévisionnel (info stratégique remontée) */}
      {!isComptable && <CashflowWidget />}

      {/* Zone 4 — AI Briefing (résumé textuel, en bas) */}
      {!isComptable && <AiBriefingWidget />}
    </div>
  );
}
