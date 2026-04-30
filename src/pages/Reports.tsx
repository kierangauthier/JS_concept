import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useHoursReport } from '@/services/api/hooks';
import { reportsApi } from '@/services/api/reports.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, ChevronLeft, ChevronRight, Users, HardHat } from 'lucide-react';
import { toast } from 'sonner';
import { toISODateLocal } from '@/lib/format';

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday;
}

export default function Reports() {
  const [weekOf, setWeekOf] = useState(() => toISODateLocal(getMonday(new Date())));
  const [groupBy, setGroupBy] = useState<'user' | 'job'>('user');
  const [exporting, setExporting] = useState(false);

  const { data: report, isLoading } = useHoursReport(weekOf, groupBy);

  function prevWeek() {
    const d = new Date(weekOf);
    d.setDate(d.getDate() - 7);
    setWeekOf(toISODateLocal(d));
  }

  function nextWeek() {
    const d = new Date(weekOf);
    d.setDate(d.getDate() + 7);
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
    <div className="space-y-4">
      <PageHeader
        title="Rapports"
        subtitle="Heures planifiées vs réalisées"
      >
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleExport} disabled={exporting}>
          <Download className="h-3 w-3" /> {exporting ? 'Export...' : 'Export CSV'}
        </Button>
      </PageHeader>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={weekOf}
            onChange={e => setWeekOf(e.target.value)}
            className="w-40 h-8 text-xs"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            Semaine du {new Date(weekOf).toLocaleDateString('fr-FR')} au {weekEnd.toLocaleDateString('fr-FR')}
          </span>
        </div>

        <div className="flex items-center border rounded-md overflow-hidden ml-auto">
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${groupBy === 'user' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setGroupBy('user')}
          >
            <Users className="h-3 w-3" /> Par technicien
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${groupBy === 'job' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setGroupBy('job')}
          >
            <HardHat className="h-3 w-3" /> Par chantier
          </button>
        </div>
      </div>

      {/* Report Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : !report || report.rows.length === 0 ? (
        <div className="bg-card rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">Aucune donnée pour cette semaine</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {groupBy === 'user' ? 'Collaborateur' : 'Chantier'}
                </th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Planifié</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Réalisé</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Écart</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ratio</th>
                <th className="px-4 py-2 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.rows.map(row => (
                <tr key={row.id} className="table-row-hover">
                  <td className="px-4 py-2.5 font-medium">{row.label}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{row.planned}h</td>
                  <td className="px-4 py-2.5 text-right font-medium">{row.actual}h</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${
                    row.delta > 0 ? 'text-success' : row.delta < 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {row.delta > 0 ? '+' : ''}{row.delta}h
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      row.ratio >= 90 && row.ratio <= 110 ? 'bg-success/15 text-success' :
                      row.ratio > 110 ? 'bg-warning/15 text-warning' :
                      row.ratio < 90 && row.ratio > 0 ? 'bg-destructive/15 text-destructive' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {row.ratio}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/70 transition-all"
                           style={{ width: `${Math.min(row.ratio, 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/20 font-bold">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right">{report.totals.planned}h</td>
                <td className="px-4 py-2.5 text-right">{report.totals.actual}h</td>
                <td className={`px-4 py-2.5 text-right ${
                  report.totals.actual - report.totals.planned > 0 ? 'text-success' :
                  report.totals.actual - report.totals.planned < 0 ? 'text-destructive' : ''
                }`}>
                  {report.totals.actual - report.totals.planned > 0 ? '+' : ''}
                  {report.totals.actual - report.totals.planned}h
                </td>
                <td className="px-4 py-2.5 text-right">
                  {report.totals.planned > 0
                    ? `${Math.round((report.totals.actual / report.totals.planned) * 100)}%`
                    : '—'}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
