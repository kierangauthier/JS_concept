import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  useHoursReport,
  useMonthlyRevenueReport,
  useTopClientsReport,
  usePipelineReport,
  useOverdueInvoicesReport,
  useTeamWorkloadReport,
} from '@/services/api/hooks';
import { reportsApi } from '@/services/api/reports.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Download, ChevronLeft, ChevronRight, Users, HardHat,
  TrendingUp, AlertTriangle, Sparkles, Trophy, Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { toISODateLocal, fmt } from '@/lib/format';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList,
} from 'recharts';

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday;
}

function formatMonth(ym: string): string {
  // 'YYYY-MM' → 'avr. 26'
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

// Module-scoped formatter refs keep function identity stable across renders
// without wrapping the chart in React.memo — that wrapping was suspected of
// breaking ResponsiveContainer's cloneElement chain (initial render received
// data=[] and the YAxis scale cached at 0, so when real data arrived the bars
// rendered flat). useMemo on chartData below is enough to avoid the cascade
// re-renders that timed out CDP in the original audit (PR #46).
const yAxisFormatter = (v: number) => `${(v / 1000).toFixed(0)}k`;
const tooltipFormatter = (v: number) => fmt.currency(v);
const tooltipLabelStyle = { fontSize: 12 };
const tooltipContentStyle = { fontSize: 12 };
const xAxisTickStyle = { fontSize: 11 };
const yAxisTickStyle = { fontSize: 11 };

function MonthlyRevenueChart({
  data,
}: { data: Array<{ name: string; revenue: number; n: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
        <XAxis dataKey="name" tick={xAxisTickStyle} />
        <YAxis tickFormatter={yAxisFormatter} tick={yAxisTickStyle} />
        <Tooltip formatter={tooltipFormatter} labelStyle={tooltipLabelStyle} contentStyle={tooltipContentStyle} />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PipelineChart({
  data, stageColors,
}: {
  data: Array<{ name: string; total: number; count: number; status: string }>;
  stageColors: Record<string, string>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
        <XAxis dataKey="name" tick={xAxisTickStyle} />
        <YAxis tickFormatter={yAxisFormatter} tick={yAxisTickStyle} />
        <Tooltip formatter={tooltipFormatter} labelStyle={tooltipLabelStyle} contentStyle={tooltipContentStyle} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={stageColors[d.status] ?? 'hsl(var(--primary))'} />)}
          <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function Reports() {
  return (
    <div className="space-y-4">
      <PageHeader title="Rapports" subtitle="Pilotage de l'activité — vue 12 mois glissants" />

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="revenue" className="text-xs gap-1"><TrendingUp className="h-3 w-3" />CA & marge</TabsTrigger>
          <TabsTrigger value="clients" className="text-xs gap-1"><Trophy className="h-3 w-3" />Top clients</TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs gap-1"><Sparkles className="h-3 w-3" />Pipeline</TabsTrigger>
          <TabsTrigger value="workload" className="text-xs gap-1"><Activity className="h-3 w-3" />Charge équipes</TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />Factures retard</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-4">
          <MonthlyRevenueCard />
        </TabsContent>
        <TabsContent value="clients" className="mt-4">
          <TopClientsCard />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-4">
          <PipelineCard />
        </TabsContent>
        <TabsContent value="workload" className="mt-4">
          <TeamWorkloadCard />
        </TabsContent>
        <TabsContent value="overdue" className="mt-4">
          <OverdueInvoicesCard />
        </TabsContent>
      </Tabs>

      {/* Hours report (existing) — kept as a separate section below the tabs. */}
      <div className="border-t pt-4 mt-6">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
          Heures planifiées vs réalisées (semaine)
        </h2>
        <HoursWeeklyReport />
      </div>
    </div>
  );
}

// ─── 1. CA mensuel ────────────────────────────────────────────────────────

function MonthlyRevenueCard() {
  const { data, isLoading } = useMonthlyRevenueReport();
  const months = data?.months ?? [];

  const { total, average, invoiceCount, chartData } = useMemo(() => {
    const t = months.reduce((s, m) => s + m.revenue, 0);
    const inv = months.reduce((s, m) => s + m.invoiceCount, 0);
    return {
      total: t,
      average: months.length > 0 ? Math.round(t / months.length) : 0,
      invoiceCount: inv,
      chartData: months.map(m => ({ name: formatMonth(m.month), revenue: m.revenue, n: m.invoiceCount })),
    };
  }, [months]);

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (months.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucun chiffre d'affaires sur la période</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="CA total 12 mois" value={fmt.currency(total)} accent="success" />
        <Kpi label="Moyenne mensuelle" value={fmt.currency(average)} />
        <Kpi label="Factures émises" value={String(invoiceCount)} />
      </div>
      <div className="bg-card rounded-lg border p-4">
        <MonthlyRevenueChart data={chartData} />
      </div>
    </div>
  );
}

// ─── 2. Top 10 clients ────────────────────────────────────────────────────

function TopClientsCard() {
  const { data, isLoading } = useTopClientsReport();
  const clients = data?.clients ?? [];

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (clients.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucun client facturé sur la période</p>
      </div>
    );
  }

  const max = clients[0]?.revenue ?? 1;

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
            <th className="text-left px-4 py-2 w-12">#</th>
            <th className="text-left px-4 py-2">Client</th>
            <th className="text-right px-4 py-2">CA 12 mois</th>
            <th className="text-right px-4 py-2 w-24">Chantiers</th>
            <th className="px-4 py-2 w-48">Part</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {clients.map(c => (
            <tr key={c.clientId} className="table-row-hover">
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{c.rank}</td>
              <td className="px-4 py-2 font-medium">{c.clientName}</td>
              <td className="px-4 py-2 text-right font-medium">{fmt.currency(c.revenue)}</td>
              <td className="px-4 py-2 text-right text-muted-foreground">{c.jobCount}</td>
              <td className="px-4 py-2">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${(c.revenue / max) * 100}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 3. Pipeline commercial ───────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  draft: 'hsl(var(--muted-foreground))',
  sent: 'hsl(var(--primary))',
  accepted: 'hsl(var(--success))',
  refused: 'hsl(var(--destructive))',
  expired: 'hsl(var(--warning))',
};

function PipelineCard() {
  const { data, isLoading } = usePipelineReport();
  const stages = data?.stages ?? [];

  const chartData = useMemo(
    () => stages.map(s => ({ name: s.label, total: s.total, count: s.count, status: s.status })),
    [stages],
  );

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (stages.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucun devis sur la période</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {stages.map(s => (
          <Kpi key={s.status} label={s.label} value={fmt.currency(s.total)} sub={`${s.count} devis`} />
        ))}
      </div>
      <div className="bg-card rounded-lg border p-4">
        <PipelineChart data={chartData} stageColors={STAGE_COLORS} />
      </div>
    </div>
  );
}

// ─── 4. Charge équipes (heatmap) ──────────────────────────────────────────

function TeamWorkloadCard() {
  const { data, isLoading } = useTeamWorkloadReport();
  const teams = data?.teams ?? [];
  const cells = data?.cells ?? [];

  // Build a sorted list of unique weekStart values across all cells.
  const weeks = useMemo(() => {
    const set = new Set(cells.map(c => c.weekStart));
    return Array.from(set).sort();
  }, [cells]);

  // Lookup map: `${teamId}|${weekStart}` → hours
  const lookup = useMemo(() => {
    const m = new Map<string, number>();
    cells.forEach(c => m.set(`${c.teamId}|${c.weekStart}`, c.hours));
    return m;
  }, [cells]);

  // Color scale 0 → 50h. Adjust if your max realistic week is different.
  const cellColor = (h: number) => {
    if (h === 0) return 'bg-muted/30';
    if (h < 15) return 'bg-success/20';
    if (h < 30) return 'bg-success/50';
    if (h < 45) return 'bg-warning/60';
    return 'bg-destructive/70 text-destructive-foreground';
  };

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (teams.length === 0 || weeks.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucune donnée de charge sur la période</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr className="border-b bg-muted/30 text-muted-foreground uppercase text-[10px]">
            <th className="text-left px-3 py-2 sticky left-0 bg-muted/30 min-w-[120px]">Équipe</th>
            {weeks.map(w => (
              <th key={w} className="px-1 py-2 font-medium" title={w}>
                {new Date(w).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map(team => (
            <tr key={team.id} className="border-b last:border-b-0">
              <td className="px-3 py-1.5 font-medium sticky left-0 bg-card">{team.name}</td>
              {weeks.map(w => {
                const h = lookup.get(`${team.id}|${w}`) ?? 0;
                return (
                  <td key={w} className={`px-2 py-1.5 text-center min-w-[44px] ${cellColor(h)}`} title={`${h}h sem. du ${w}`}>
                    {h > 0 ? `${h}h` : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>Charge :</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-muted/30 inline-block" />0h</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-success/20 inline-block" />&lt;15h</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-success/50 inline-block" />&lt;30h</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-warning/60 inline-block" />&lt;45h</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-destructive/70 inline-block" />≥45h</span>
      </div>
    </div>
  );
}

// ─── 5. Factures en retard ────────────────────────────────────────────────

function OverdueInvoicesCard() {
  const { data, isLoading } = useOverdueInvoicesReport();
  const invoices = (data?.invoices ?? []).slice().sort((a, b) => b.daysOverdue - a.daysOverdue);
  const total = invoices.reduce((s, i) => s + i.amount, 0);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (invoices.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucune facture en retard 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Total impayé en retard" value={fmt.currency(total)} accent="destructive" />
        <Kpi label="Nombre de factures" value={String(invoices.length)} />
      </div>
      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <th className="text-left px-4 py-2">Référence</th>
              <th className="text-left px-4 py-2">Client</th>
              <th className="text-right px-4 py-2">Montant</th>
              <th className="text-right px-4 py-2">Échéance</th>
              <th className="text-right px-4 py-2">Retard</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {invoices.map(inv => (
              <tr key={inv.id} className="table-row-hover">
                <td className="px-4 py-2 font-mono text-xs">{inv.reference}</td>
                <td className="px-4 py-2">{inv.clientName}</td>
                <td className="px-4 py-2 text-right font-medium">{fmt.currency(inv.amount)}</td>
                <td className="px-4 py-2 text-right text-xs text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-2 text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    inv.daysOverdue >= 60 ? 'bg-destructive/15 text-destructive' :
                    inv.daysOverdue >= 30 ? 'bg-warning/15 text-warning' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {inv.daysOverdue} j
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Existing weekly hours report ─────────────────────────────────────────

function HoursWeeklyReport() {
  const [weekOf, setWeekOf] = useState(() => toISODateLocal(getMonday(new Date())));
  const [groupBy, setGroupBy] = useState<'user' | 'job'>('user');
  const [exporting, setExporting] = useState(false);

  const { data: report, isLoading } = useHoursReport(weekOf, groupBy);

  function shiftWeek(days: number) {
    const d = new Date(weekOf);
    d.setDate(d.getDate() + days);
    setWeekOf(toISODateLocal(d));
  }

  async function handleExport() {
    setExporting(true);
    try {
      await reportsApi.exportHoursCsv(weekOf, groupBy);
      toast.success('Export CSV téléchargé');
    } catch {
      toast.error('Erreur export');
    } finally {
      setExporting(false);
    }
  }

  const weekEnd = new Date(new Date(weekOf).getTime() + 4 * 86400000);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftWeek(-7)}><ChevronLeft className="h-4 w-4" /></Button>
          <Input type="date" value={weekOf} onChange={e => setWeekOf(e.target.value)} className="w-40 h-8 text-xs" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftWeek(7)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-xs text-muted-foreground ml-2">
            Semaine du {new Date(weekOf).toLocaleDateString('fr-FR')} au {weekEnd.toLocaleDateString('fr-FR')}
          </span>
        </div>
        <div className="flex items-center border rounded-md overflow-hidden">
          <button className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${groupBy === 'user' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`} onClick={() => setGroupBy('user')}>
            <Users className="h-3 w-3" /> Par technicien
          </button>
          <button className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${groupBy === 'job' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`} onClick={() => setGroupBy('job')}>
            <HardHat className="h-3 w-3" /> Par chantier
          </button>
        </div>
        <Button variant="outline" size="sm" className="text-xs gap-1 ml-auto" onClick={handleExport} disabled={exporting}>
          <Download className="h-3 w-3" /> {exporting ? 'Export…' : 'Export CSV'}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : !report || report.rows.length === 0 ? (
        <div className="bg-card rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucune donnée pour cette semaine</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
                <th className="text-left px-4 py-2">{groupBy === 'user' ? 'Collaborateur' : 'Chantier'}</th>
                <th className="text-right px-4 py-2">Planifié</th>
                <th className="text-right px-4 py-2">Réalisé</th>
                <th className="text-right px-4 py-2">Écart</th>
                <th className="text-right px-4 py-2">Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.rows.map(row => (
                <tr key={row.id} className="table-row-hover">
                  <td className="px-4 py-2 font-medium">{row.label}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{row.planned}h</td>
                  <td className="px-4 py-2 text-right font-medium">{row.actual}h</td>
                  <td className={`px-4 py-2 text-right font-medium ${row.delta > 0 ? 'text-success' : row.delta < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {row.delta > 0 ? '+' : ''}{row.delta}h
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      row.ratio >= 90 && row.ratio <= 110 ? 'bg-success/15 text-success' :
                      row.ratio > 110 ? 'bg-warning/15 text-warning' :
                      row.ratio < 90 && row.ratio > 0 ? 'bg-destructive/15 text-destructive' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {row.ratio}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/20 font-bold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right">{report.totals.planned}h</td>
                <td className="px-4 py-2 text-right">{report.totals.actual}h</td>
                <td className={`px-4 py-2 text-right ${report.totals.actual - report.totals.planned > 0 ? 'text-success' : report.totals.actual - report.totals.planned < 0 ? 'text-destructive' : ''}`}>
                  {report.totals.actual - report.totals.planned > 0 ? '+' : ''}
                  {report.totals.actual - report.totals.planned}h
                </td>
                <td className="px-4 py-2 text-right">
                  {report.totals.planned > 0 ? `${Math.round((report.totals.actual / report.totals.planned) * 100)}%` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tiny KPI card ────────────────────────────────────────────────────────

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: 'success' | 'destructive' }) {
  const accentClass =
    accent === 'success' ? 'text-success' :
    accent === 'destructive' ? 'text-destructive' : '';
  return (
    <div className="bg-card border rounded-lg p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base font-bold mt-1 ${accentClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
