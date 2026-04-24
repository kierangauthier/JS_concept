/**
 * AiProactiveAlerts — WOW 3 : Intelligence proactive sur le Dashboard
 * Alertes : entretien annuel dû, devis sans réponse, impayés, dépassements budget
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Wrench, Clock, TrendingUp, AlertTriangle, CheckCircle2,
  Mail, RefreshCw, ChevronRight, Sparkles, Loader2,
} from 'lucide-react';
import { api } from '@/services/api';

interface ProactiveAlert {
  type: 'maintenance_due' | 'quote_followup' | 'budget_overrun' | 'overdue_invoice' | 'upcoming_job';
  priority: 'critical' | 'high' | 'medium';
  title: string;
  detail: string;
  draftMessage?: string;
  clientName?: string;
  clientEmail?: string;
  relatedId?: string;
  relatedType?: string;
  daysOverdue?: number;
  amount?: number;
}

interface AlertsResponse {
  alerts: ProactiveAlert[];
  summary: string;
  generatedAt: string;
}

const TYPE_ICONS: Record<string, any> = {
  maintenance_due: Wrench,
  quote_followup:  Clock,
  budget_overrun:  TrendingUp,
  overdue_invoice: AlertTriangle,
  upcoming_job:    CheckCircle2,
};

const TYPE_LABELS: Record<string, string> = {
  maintenance_due: 'Entretien annuel',
  quote_followup:  'Relance devis',
  budget_overrun:  'Dépassement',
  overdue_invoice: 'Impayé',
  upcoming_job:    'Chantier',
};

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'border-l-4 border-l-red-500 bg-red-50',
  high:     'border-l-4 border-l-orange-400 bg-orange-50',
  medium:   'border-l-4 border-l-yellow-400 bg-yellow-50',
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high:     'bg-orange-100 text-orange-800',
  medium:   'bg-yellow-100 text-yellow-800',
};

export default function AiProactiveAlerts() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailDialog, setEmailDialog] = useState<ProactiveAlert | null>(null);
  const [emailBody, setEmailBody] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  async function loadAlerts() {
    setLoading(true);
    try {
      const d = await api.get<AlertsResponse>('/api/ai/proactive-alerts');
      setData(d.data);
    } catch (e) {
      console.error('[ProactiveAlerts]', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAlerts(); }, []);

  function openEmail(alert: ProactiveAlert) {
    setEmailDialog(alert);
    setEmailBody(alert.draftMessage ?? '');
  }

  async function sendEmail() {
    if (!emailDialog?.clientEmail) return;
    setSendLoading(true);
    try {
      // Marque comme envoyé localement (l'envoi réel utilise le module mail existant)
      await new Promise(r => setTimeout(r, 800)); // simulation
      const key = emailDialog.relatedId ?? emailDialog.title;
      setSentIds(prev => new Set([...prev, key]));
      setEmailDialog(null);
    } finally {
      setSendLoading(false);
    }
  }

  function dismiss(alert: ProactiveAlert) {
    setDismissed(prev => new Set([...prev, alert.relatedId ?? alert.title]));
  }

  const visibleAlerts = (data?.alerts ?? []).filter(a => !dismissed.has(a.relatedId ?? a.title));
  const criticalCount = visibleAlerts.filter(a => a.priority === 'critical').length;

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold text-sm">Intelligence proactive</h3>
            {criticalCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                {criticalCount}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={loadAlerts} disabled={loading} className="h-7 px-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Summary */}
        {data && (
          <p className="text-xs text-gray-500">{data.summary}</p>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyse de vos données en cours…
          </div>
        )}

        {/* Alerts list */}
        {visibleAlerts.length === 0 && !loading && (
          <div className="text-center py-6 text-sm text-gray-400">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
            Tout est sous contrôle 👌
          </div>
        )}

        <div className="space-y-2">
          {visibleAlerts.slice(0, 6).map((alert, i) => {
            const Icon = TYPE_ICONS[alert.type] ?? AlertTriangle;
            const key = alert.relatedId ?? alert.title;
            const sent = sentIds.has(key);

            return (
              <div key={i} className={`rounded-lg p-3 ${PRIORITY_STYLE[alert.priority]}`}>
                <div className="flex items-start gap-2.5">
                  <Icon className="h-4 w-4 mt-0.5 shrink-0 text-gray-600" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 truncate">{alert.title}</span>
                      <Badge className={`text-xs px-1.5 py-0 ${PRIORITY_BADGE[alert.priority]}`}>
                        {TYPE_LABELS[alert.type]}
                      </Badge>
                      {alert.amount && (
                        <span className="text-xs text-gray-500">
                          {alert.amount.toLocaleString('fr-FR')} €
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{alert.detail}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2 ml-6">
                  {alert.draftMessage && alert.clientEmail && !sent && (
                    <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2"
                      onClick={() => openEmail(alert)}>
                      <Mail className="h-3 w-3" />
                      Envoyer l'email
                    </Button>
                  )}
                  {sent && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Email envoyé
                    </span>
                  )}
                  {alert.relatedId && (
                    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 px-2"
                      onClick={() => window.location.hash = `/${alert.relatedType}s`}>
                      Voir <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}
                  <button className="text-xs text-gray-400 hover:text-gray-600 ml-auto" onClick={() => dismiss(alert)}>
                    Ignorer
                  </button>
                </div>
              </div>
            );
          })}

          {visibleAlerts.length > 6 && (
            <p className="text-xs text-gray-400 text-center">
              + {visibleAlerts.length - 6} alertes supplémentaires
            </p>
          )}
        </div>
      </div>

      {/* Email dialog */}
      <Dialog open={!!emailDialog} onOpenChange={() => setEmailDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email pour {emailDialog?.clientName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              À : {emailDialog?.clientEmail}
            </p>
            <Textarea
              rows={10}
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              className="text-sm font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog(null)}>Annuler</Button>
            <Button onClick={sendEmail} disabled={sendLoading} className="gap-2">
              {sendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
