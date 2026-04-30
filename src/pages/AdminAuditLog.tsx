import { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, RefreshCw, Filter, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auditLogApi, AuditLogEntry, AuditLogActionStat } from '@/services/api/audit-log.api';
import { fmt, toISODateLocal } from '@/lib/format';
import { toast } from 'sonner';

// Sensitive actions are always rendered as destructive so they catch the eye
// during a buyer audit. The list is short on purpose — anything not here is
// shown with the neutral muted style.
const SENSITIVE_ACTIONS = new Set([
  'GDPR_EXPORT', 'GDPR_ERASE',
  'AI_CONSENT_GRANTED', 'AI_CONSENT_REVOKED',
  'DATA_DUMP',
  'DELETE',
  'INVOICE_ISSUED',
]);

function actionBadgeClass(action: string): string {
  if (SENSITIVE_ACTIONS.has(action)) return 'bg-destructive/15 text-destructive';
  if (action.startsWith('STATUS_')) return 'bg-info/15 text-info';
  if (action === 'CREATE') return 'bg-success/15 text-success';
  if (action === 'UPDATE') return 'bg-warning/15 text-warning';
  return 'bg-muted text-muted-foreground';
}

export default function AdminAuditLog() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [actions, setActions] = useState<AuditLogActionStat[]>([]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState<string>('all');

  async function load(reset: boolean) {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const page = await auditLogApi.list({
        from: from || undefined,
        to: to || undefined,
        action: action === 'all' ? undefined : action,
        cursor: reset ? undefined : (nextCursor ?? undefined),
        limit: 50,
      });
      setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
      setNextCursor(page.nextCursor);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur de chargement du journal');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    load(true);
    auditLogApi.actions().then(setActions).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensitiveCount = useMemo(
    () => items.filter((i) => SENSITIVE_ACTIONS.has(i.action)).length,
    [items],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Journal d'audit"
        subtitle="Lecture seule — toutes les actions sensibles sont conservées 3 ans"
      />

      <div className="bg-card border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Le journal est <strong>append-only</strong>. Aucune entrée ne peut être modifiée
          ni supprimée depuis cette interface — l'intégrité est garantie au niveau base.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <div className="space-y-1">
            <Label htmlFor="al-from" className="text-xs">Du</Label>
            <Input id="al-from" type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="al-to" className="text-xs">Au</Label>
            <Input id="al-to" type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a.action} value={a.action}>
                    {a.action} ({a.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => load(true)} className="h-11 gap-1.5" disabled={loading}>
            <Filter className="h-3.5 w-3.5" />
            Filtrer
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          {loading ? '…' : `${items.length} entrée(s) — ${sensitiveCount} action(s) sensible(s)`}
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 w-40">Date</th>
              <th className="text-left px-3 py-2 w-44">Action</th>
              <th className="text-left px-3 py-2 w-44">Entité</th>
              <th className="text-left px-3 py-2">Utilisateur</th>
              <th className="text-left px-3 py-2 w-32">IP</th>
              <th className="text-right px-3 py-2 w-24">Δ champs</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-12 ml-auto" /></td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground text-sm">
                  Aucune entrée trouvée pour ce filtre.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="table-row-hover">
                  <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                    {fmt.dateTime(it.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${actionBadgeClass(it.action)}`}>
                      {it.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] truncate">
                    <div>{it.entity}</div>
                    <div className="text-muted-foreground text-[10px] truncate">{it.entityId}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{it.userName ?? <span className="text-muted-foreground italic">Système</span>}</div>
                    {it.userEmail && <div className="text-[10px] text-muted-foreground truncate">{it.userEmail}</div>}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground tabular-nums">
                    {it.ip ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-[10px] text-muted-foreground tabular-nums">
                    {it.beforeKeys > 0 || it.afterKeys > 0 ? `${it.beforeKeys}→${it.afterKeys}` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {nextCursor && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load(false)} disabled={loadingMore} className="gap-1.5 h-11">
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Charger 50 de plus
          </Button>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic">
        Conservation : 3 ans (cf. politique de confidentialité §5). Date courante :{' '}
        {toISODateLocal(new Date())}.
      </p>
    </div>
  );
}
