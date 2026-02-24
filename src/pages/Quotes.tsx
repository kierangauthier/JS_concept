import { useState, useMemo } from 'react';
import { useFilterByCompany } from '@/contexts/AppContext';
import { mockQuotes } from '@/services/mockData';
import { mockQuoteLines, mockActivities, mockAttachments } from '@/services/mockDataExtended';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { FileUploader } from '@/components/shared/FileUploader';
import { Quote, QuoteStatus } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, ArrowRight, GripVertical, List, Columns3 } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, Column } from '@/components/shared/DataTable';

const kanbanColumns: { status: QuoteStatus; label: string; color: string }[] = [
  { status: 'draft', label: 'Nouveau / Brouillon', color: 'border-t-muted-foreground' },
  { status: 'sent', label: 'Envoyé', color: 'border-t-info' },
  { status: 'accepted', label: 'Accepté', color: 'border-t-success' },
  { status: 'refused', label: 'Refusé', color: 'border-t-destructive' },
];

export default function Quotes() {
  const quotes = useFilterByCompany(mockQuotes);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const quotesByStatus = useMemo(() => {
    const map: Record<QuoteStatus, Quote[]> = { draft: [], sent: [], accepted: [], refused: [], expired: [] };
    quotes.forEach(q => map[q.status]?.push(q));
    return map;
  }, [quotes]);

  const selectedLines = selectedQuote ? mockQuoteLines.filter(l => l.quoteId === selectedQuote.id) : [];
  const selectedActivities = selectedQuote ? mockActivities.filter(a => a.entityId === selectedQuote.id && a.entityType === 'quote') : [];
  const selectedFiles = selectedQuote ? mockAttachments.filter(a => a.entityId === selectedQuote.id) : [];

  const totalHT = selectedLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalCost = selectedLines.reduce((s, l) => s + l.quantity * l.costPrice, 0);
  const margin = totalHT > 0 ? ((totalHT - totalCost) / totalHT * 100) : 0;

  const listColumns: Column<Quote>[] = [
    { key: 'reference', header: 'Réf.', sortable: true, accessor: (q) => q.reference, render: (q) => (
      <div className="flex items-center gap-2">
        <span className="font-medium font-mono text-xs">{q.reference}</span>
        <CompanyBadge company={q.company} />
      </div>
    )},
    { key: 'client', header: 'Client', sortable: true, accessor: (q) => q.clientName, render: (q) => <span>{q.clientName}</span> },
    { key: 'subject', header: 'Objet', render: (q) => <span className="text-muted-foreground truncate max-w-[200px] block">{q.subject}</span> },
    { key: 'amount', header: 'Montant', sortable: true, accessor: (q) => q.amount, render: (q) => <span className="font-medium">{q.amount.toLocaleString('fr-FR')} €</span> },
    { key: 'status', header: 'Statut', render: (q) => <StatusBadge type="quote" status={q.status} /> },
    { key: 'date', header: 'Date', sortable: true, accessor: (q) => q.createdAt, render: (q) => <span className="text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleDateString('fr-FR')}</span> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Devis"
        subtitle={`${quotes.length} devis`}
        action={{ label: 'Nouveau devis', onClick: () => toast.info('Formulaire nouveau devis') }}
      >
        <div className="flex items-center border rounded-md overflow-hidden">
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setViewMode('kanban')}
          >
            <Columns3 className="h-3.5 w-3.5" />
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
            onClick={() => setViewMode('list')}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </PageHeader>

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {kanbanColumns.map(col => (
            <div key={col.status} className={`bg-muted/30 rounded-lg border-t-2 ${col.color}`}>
              <div className="px-3 py-2.5 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {quotesByStatus[col.status]?.length || 0}
                </span>
              </div>
              <div className="px-2 pb-2 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                {(quotesByStatus[col.status] || []).map(quote => (
                  <button
                    key={quote.id}
                    onClick={() => setSelectedQuote(quote)}
                    className="w-full text-left bg-card rounded-lg border p-3 hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] font-medium text-muted-foreground">{quote.reference}</span>
                      <CompanyBadge company={quote.company} />
                    </div>
                    <h4 className="text-sm font-medium leading-tight mb-1 line-clamp-2">{quote.subject}</h4>
                    <div className="text-xs text-muted-foreground mb-2">{quote.clientName}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{quote.amount.toLocaleString('fr-FR')} €</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(quote.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1.5">
                      <GripVertical className="h-3 w-3 text-muted-foreground mx-auto" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          data={quotes}
          columns={listColumns}
          searchPlaceholder="Rechercher un devis…"
          searchAccessor={(q) => `${q.reference} ${q.clientName} ${q.subject}`}
          onRowClick={(q) => setSelectedQuote(q)}
        />
      )}

      {/* Quote Detail Drawer */}
      <Sheet open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedQuote && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <SheetTitle className="font-mono">{selectedQuote.reference}</SheetTitle>
                  <CompanyBadge company={selectedQuote.company} />
                  <StatusBadge type="quote" status={selectedQuote.status} />
                </div>
                <p className="text-sm text-muted-foreground">{selectedQuote.subject}</p>
              </SheetHeader>

              {/* Actions */}
              <div className="flex gap-2 mb-4">
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => toast.info('Devis dupliqué')}>
                  <Copy className="h-3 w-3" /> Dupliquer
                </Button>
                {selectedQuote.status === 'accepted' && (
                  <Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => toast.success('Chantier créé depuis ce devis')}>
                    <ArrowRight className="h-3 w-3" /> Convertir en chantier
                  </Button>
                )}
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Montant HT</div>
                  <div className="text-lg font-bold">{totalHT.toLocaleString('fr-FR')} €</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Coût revient</div>
                  <div className="text-lg font-bold">{totalCost.toLocaleString('fr-FR')} €</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${margin >= 25 ? 'bg-success/10' : margin >= 15 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Marge</div>
                  <div className="text-lg font-bold">{margin.toFixed(1)}%</div>
                </div>
              </div>

              <Tabs defaultValue="lines" className="w-full">
                <TabsList className="w-full grid grid-cols-4 h-9">
                  <TabsTrigger value="lines" className="text-xs">Lignes</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs">Pièces jointes</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">Activité</TabsTrigger>
                  <TabsTrigger value="info" className="text-xs">Infos</TabsTrigger>
                </TabsList>

                <TabsContent value="lines" className="mt-3 space-y-2">
                  {selectedLines.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune ligne pour ce devis</p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 text-xs text-muted-foreground uppercase">
                            <th className="text-left px-3 py-2">Désignation</th>
                            <th className="text-right px-3 py-2">Qté</th>
                            <th className="text-right px-3 py-2">P.U.</th>
                            <th className="text-right px-3 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedLines.map(line => (
                            <tr key={line.id} className="table-row-hover">
                              <td className="px-3 py-2">
                                <div className="font-medium">{line.designation}</div>
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{line.quantity} {line.unit}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">{line.unitPrice.toFixed(2)} €</td>
                              <td className="px-3 py-2 text-right font-medium">{(line.quantity * line.unitPrice).toLocaleString('fr-FR')} €</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/30 font-semibold">
                            <td colSpan={3} className="px-3 py-2 text-right text-xs uppercase">Total HT</td>
                            <td className="px-3 py-2 text-right">{totalHT.toLocaleString('fr-FR')} €</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="files" className="mt-3">
                  <FileUploader files={selectedFiles} />
                </TabsContent>

                <TabsContent value="activity" className="mt-3">
                  <ActivityFeed activities={selectedActivities} />
                </TabsContent>

                <TabsContent value="info" className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Client</div>
                      <div className="font-medium">{selectedQuote.clientName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Date création</div>
                      <div className="font-medium">{new Date(selectedQuote.createdAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Validité</div>
                      <div className="font-medium">{new Date(selectedQuote.validUntil).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase">Entité</div>
                      <div className="font-medium">{selectedQuote.company === 'ASP' ? 'ASP Signalisation' : 'JS Concept'}</div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
