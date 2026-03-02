import { useState } from 'react';
import { useCashflow } from '@/services/api/hooks';
import { CashflowForecast, EstimatedBilling } from '@/services/api/dashboard.api';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle, FileText } from 'lucide-react';

const fmtK = (n: number) => {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString('fr-FR');
};

const fmtEur = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' \u20ac';

const CONFIDENCE_BADGE: Record<string, { dot: string; label: string; class: string }> = {
  high: { dot: '\uD83D\uDFE2', label: 'Haute', class: 'text-success' },
  medium: { dot: '\uD83D\uDFE1', label: 'Moyenne', class: 'text-warning' },
  low: { dot: '\uD83D\uDD34', label: 'Faible', class: 'text-destructive' },
};

export function CashflowWidget() {
  const { data, isLoading } = useCashflow(90);
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border p-4">
        <Skeleton className="h-4 w-48 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const overdueCount = data.expectedInflows.filter(i => i.status === 'overdue').length;
  const overdueAmount = data.expectedInflows
    .filter(i => i.status === 'overdue')
    .reduce((s, i) => s + i.amountTTC, 0);

  const billingHigh = data.estimatedBilling.filter(b => b.confidence === 'high');
  const billingMedium = data.estimatedBilling.filter(b => b.confidence === 'medium');

  return (
    <>
      <div className="bg-card rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Previsionnel tresorerie</h2>
          </div>
          <button
            onClick={() => setDetailOpen(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Voir detail <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Projections grid */}
        <div className="grid grid-cols-3 divide-x">
          {data.projections.map(p => (
            <div key={p.period} className="p-3 text-center">
              <div className="text-xs font-medium text-muted-foreground mb-2">{p.period}</div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-success font-medium">+{fmtK(p.expectedIn)}</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-xs">
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <span className="text-destructive font-medium">-{fmtK(p.expectedOut)}</span>
                </div>
                {p.estimatedBilling > 0 && (
                  <div className="flex items-center justify-center gap-1 text-xs">
                    <FileText className="h-3 w-3 text-blue-500" />
                    <span className="text-blue-500 font-medium">+{fmtK(p.estimatedBilling)}</span>
                  </div>
                )}
                <div className="pt-1 border-t">
                  <span className={`text-sm font-bold ${p.netPosition >= 0 ? 'text-success' : 'text-destructive'}`}>
                    Net: {p.netPosition >= 0 ? '+' : ''}{fmtK(p.netPosition)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="px-4 py-3 border-t space-y-1.5">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
              <span className="text-destructive font-medium">
                {overdueCount} facture{overdueCount > 1 ? 's' : ''} en retard ({fmtEur(overdueAmount)})
              </span>
            </div>
          )}
          {(billingHigh.length > 0 || billingMedium.length > 0) && (
            <div className="text-xs text-muted-foreground">
              <FileText className="h-3 w-3 inline mr-1" />
              {billingHigh.length + billingMedium.length} chantier{billingHigh.length + billingMedium.length > 1 ? 's' : ''} a facturer :
              <div className="ml-5 mt-1 space-y-0.5">
                {[...billingHigh, ...billingMedium].slice(0, 3).map(b => (
                  <div key={b.jobRef} className="flex items-center gap-1">
                    <span>{CONFIDENCE_BADGE[b.confidence].dot}</span>
                    <span className="font-mono">{b.jobRef}</span>
                    <span>({fmtK(b.remainingToInvoice)} \u20ac)</span>
                    <span className={`${CONFIDENCE_BADGE[b.confidence].class}`}>
                      — {CONFIDENCE_BADGE[b.confidence].label.toLowerCase()} confiance
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Previsionnel tresorerie</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="inflows" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="inflows" className="flex-1">Entrees ({data.expectedInflows.length})</TabsTrigger>
              <TabsTrigger value="outflows" className="flex-1">Sorties ({data.expectedOutflows.length})</TabsTrigger>
              <TabsTrigger value="billing" className="flex-1">A facturer ({data.estimatedBilling.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="inflows" className="mt-3 space-y-2">
              {data.expectedInflows.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucune facture en attente</p>
              )}
              {data.expectedInflows.map(i => (
                <div key={i.invoiceRef} className="flex items-center gap-3 p-2 rounded border text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{i.invoiceRef}</div>
                    <div className="text-xs text-muted-foreground">{i.clientName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{fmtEur(i.amountTTC)}</div>
                    <div className={`text-xs ${i.daysUntilDue < 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {i.daysUntilDue < 0 ? `${Math.abs(i.daysUntilDue)}j retard` : `${i.daysUntilDue}j`}
                    </div>
                  </div>
                  {i.isImported && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">legacy</span>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="outflows" className="mt-3 space-y-2">
              {data.expectedOutflows.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun achat en attente</p>
              )}
              {data.expectedOutflows.map(o => (
                <div key={o.purchaseRef} className="flex items-center gap-3 p-2 rounded border text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{o.purchaseRef}</div>
                    <div className="text-xs text-muted-foreground">{o.supplierName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-destructive">{fmtEur(o.amount)}</div>
                    {o.jobRef && <div className="text-xs text-muted-foreground">{o.jobRef}</div>}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="billing" className="mt-3 space-y-2">
              {data.estimatedBilling.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Aucun chantier a facturer</p>
              )}
              {data.estimatedBilling.map(b => (
                <BillingCard key={b.jobRef} item={b} />
              ))}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}

function BillingCard({ item }: { item: EstimatedBilling }) {
  const badge = CONFIDENCE_BADGE[item.confidence];
  return (
    <div className="p-3 rounded border space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">{item.jobRef}</div>
          <div className="text-xs text-muted-foreground">{item.title} — {item.clientName}</div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${badge.class}`}>
          <span>{badge.dot}</span> {badge.label}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground">Contrat</div>
          <div className="font-medium">{fmtEur(item.totalContract)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Facture</div>
          <div className="font-medium">{fmtEur(item.totalInvoiced)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Reste</div>
          <div className="font-bold text-primary">{fmtEur(item.remainingToInvoice)}</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {item.billingRule} — <span className={badge.class}>{item.confidenceReason}</span>
      </div>
    </div>
  );
}
