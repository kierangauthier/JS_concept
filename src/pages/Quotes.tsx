import { useState, useMemo, useEffect } from 'react';
import { useFormGuard } from '@/hooks/use-dirty-form';
import { useUrlState } from '@/hooks/use-url-state';
import { useFilterByCompany } from '@/contexts/AppContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { FileUploader } from '@/components/shared/FileUploader';
import { Quote, QuoteStatus } from '@/types';
import { toISODateLocal } from '@/lib/format';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, ArrowRight, GripVertical, List, Columns3, Plus, Trash2, Pencil, FileText as FileTextIcon, Download, Mail, Loader2, BookTemplate, Save, Eye } from 'lucide-react';
import { PdfPreviewDialog } from '@/components/shared/PdfPreviewDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { useApp } from '@/contexts/AppContext';
import {
  useQuotes, useQuoteDetail, useDuplicateQuote, useConvertToJob, useConvertFull,
  useClients, useCreateQuote, useUpdateQuote, useUpdateQuoteStatus,
  useActivityLogs, useAttachments, useSendEmail,
  useAmendments, useCreateAmendment, useUpdateAmendmentStatus, useDeleteAmendment,
  useQuoteTemplates, useCreateQuoteTemplate, useCreateQuoteFromTemplate, useDeleteQuoteTemplate,
} from '@/services/api/hooks';
import { CreateQuotePayload } from '@/services/api/quotes.api';
import { CatalogCombobox } from '@/components/shared/CatalogCombobox';

interface QuoteLineForm {
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
}

const defaultLine = (): QuoteLineForm => ({
  designation: '',
  unit: 'u',
  quantity: 1,
  unitPrice: 0,
  costPrice: 0,
});

const kanbanColumns: { status: QuoteStatus; label: string; color: string }[] = [
  { status: 'draft', label: 'Nouveau / Brouillon', color: 'border-t-muted-foreground' },
  { status: 'sent', label: 'Envoyé', color: 'border-t-info' },
  { status: 'accepted', label: 'Accepté', color: 'border-t-success' },
  { status: 'refused', label: 'Refusé', color: 'border-t-destructive' },
];

export default function Quotes() {
  const { data: apiQuotes, isLoading, isError } = useQuotes();
  const allQuotes: Quote[] = apiQuotes ?? [];
  const quotes = useFilterByCompany(allQuotes);

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [viewModeRaw, setViewModeRaw] = useUrlState('view', 'kanban');
  const viewMode = (viewModeRaw === 'list' ? 'list' : 'kanban') as 'kanban' | 'list';
  const setViewMode = (v: 'kanban' | 'list') => setViewModeRaw(v);

  const { selectedCompany } = useApp();

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [formClientId, setFormClientId] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formValidUntil, setFormValidUntil] = useState('');
  const [formVatRate, setFormVatRate] = useState<number>(20);
  const [formLines, setFormLines] = useState<QuoteLineForm[]>([defaultLine()]);
  const [formCompany, setFormCompany] = useState<'ASP' | 'JS'>(selectedCompany === 'JS' ? 'JS' : 'ASP');
  // Snapshot for dirty detection — null while the form is closed.
  const [formBaseline, setFormBaseline] = useState<unknown>(null);

  const formValuesForGuard = useMemo(
    () => ({ clientId: formClientId, subject: formSubject, validUntil: formValidUntil, vatRate: formVatRate, lines: formLines }),
    [formClientId, formSubject, formValidUntil, formVatRate, formLines],
  );
  const { guardClose: guardCloseForm } = useFormGuard(
    formValuesForGuard,
    formOpen ? (formBaseline as typeof formValuesForGuard | null) : null,
    formOpen,
  );
  const closeForm = () => {
    setFormOpen(false);
    setEditingQuote(null);
    setFormBaseline(null);
  };

  // API hooks
  const { data: quoteDetail } = useQuoteDetail(selectedQuote?.id ?? null);
  const { data: apiClients } = useClients();
  const clients = apiClients ?? [];

  const sendEmailMutation = useSendEmail();

  // Email dialog state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  function openEmailDialog() {
    if (!selectedQuote) return;
    const client = clients.find(c => c.id === selectedQuote.clientId);
    setEmailTo(client?.email ?? '');
    setEmailSubject(`Devis ${selectedQuote.reference}`);
    setEmailMessage(`Veuillez trouver ci-joint le devis ${selectedQuote.reference}.\n\nCordialement,`);
    setEmailOpen(true);
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuote || !emailTo.trim()) { toast.error('Saisissez un destinataire'); return; }
    await sendEmailMutation.mutateAsync({
      entityType: 'quote',
      entityId: selectedQuote.id,
      to: emailTo.trim(),
      subject: emailSubject || undefined,
      message: emailMessage || undefined,
    });
    setEmailOpen(false);
  }

  const duplicateMutation = useDuplicateQuote();
  const convertMutation = useConvertToJob();
  const convertFullMutation = useConvertFull();
  const createMutation = useCreateQuote();

  // Convert full dialog
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertWithWorkshop, setConvertWithWorkshop] = useState(false);
  const [convertWithPurchases, setConvertWithPurchases] = useState(false);
  const [convertJobAddress, setConvertJobAddress] = useState('');
  const updateMutation = useUpdateQuote();
  const statusMutation = useUpdateQuoteStatus();

  // Amendments
  const { data: amendments = [] } = useAmendments(selectedQuote?.id ?? null);
  const createAmendmentMutation = useCreateAmendment();
  const amendmentStatusMutation = useUpdateAmendmentStatus();
  const deleteAmendmentMutation = useDeleteAmendment();
  const [avFormOpen, setAvFormOpen] = useState(false);
  const [avSubject, setAvSubject] = useState('');
  const [avLines, setAvLines] = useState<QuoteLineForm[]>([defaultLine()]);

  const avTotalHT = avLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const amendmentsAcceptedTotal = amendments.filter(a => a.status === 'accepted').reduce((s, a) => s + a.amount, 0);

  // Templates
  const { data: templates = [] } = useQuoteTemplates();
  const createTemplateMutation = useCreateQuoteTemplate();
  const createFromTemplateMutation = useCreateQuoteFromTemplate();
  const deleteTemplateMutation = useDeleteQuoteTemplate();
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [fromTemplateOpen, setFromTemplateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [tplClientId, setTplClientId] = useState('');
  const [tplSubject, setTplSubject] = useState('');
  const [tplValidUntil, setTplValidUntil] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return toISODateLocal(d);
  });

  async function handleSaveAsTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuote || !templateName.trim()) { toast.error('Saisissez un nom'); return; }
    await createTemplateMutation.mutateAsync({
      name: templateName.trim(),
      description: templateDesc.trim() || undefined,
      quoteId: selectedQuote.id,
    });
    setSaveTemplateOpen(false);
  }

  async function handleCreateFromTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplateId) { toast.error('Sélectionnez un modèle'); return; }
    if (!tplClientId) { toast.error('Sélectionnez un client'); return; }
    if (!tplSubject.trim()) { toast.error('Saisissez un objet'); return; }
    await createFromTemplateMutation.mutateAsync({
      templateId: selectedTemplateId,
      data: { clientId: tplClientId, subject: tplSubject.trim(), validUntil: new Date(tplValidUntil).toISOString() },
    });
    setFromTemplateOpen(false);
  }

  function openAvForm() {
    setAvSubject('');
    setAvLines([defaultLine()]);
    setAvFormOpen(true);
  }

  async function handleAvSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuote || !avSubject.trim()) { toast.error('Saisissez un objet'); return; }
    const validLines = avLines.filter(l => l.designation.trim() && l.quantity > 0);
    await createAmendmentMutation.mutateAsync({
      quoteId: selectedQuote.id,
      data: { subject: avSubject.trim(), lines: validLines.length > 0 ? validLines : undefined },
    });
    setAvFormOpen(false);
  }

  const quotesByStatus = useMemo(() => {
    const map: Record<QuoteStatus, Quote[]> = { draft: [], sent: [], accepted: [], refused: [], expired: [] };
    quotes.forEach(q => map[q.status]?.push(q));
    return map;
  }, [quotes]);

  const selectedLines = quoteDetail?.lines ?? [];
  const { data: selectedActivities = [] } = useActivityLogs('quote', selectedQuote?.id ?? null);
  const { data: selectedFiles = [] } = useAttachments('quote', selectedQuote?.id ?? null);

  const totalHT = selectedLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalCost = selectedLines.reduce((s, l) => s + l.quantity * (l.costPrice ?? 0), 0);
  const margin = totalHT > 0 ? ((totalHT - totalCost) / totalHT * 100) : 0;

  // Form totals (live calculation)
  const formTotalHT = formLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const formTotalCost = formLines.reduce((s, l) => s + l.quantity * l.costPrice, 0);
  const formMargin = formTotalHT > 0 ? ((formTotalHT - formTotalCost) / formTotalHT * 100) : 0;

  function openCreateForm() {
    setEditingQuote(null);
    setFormClientId('');
    setFormSubject('');
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const validUntil = toISODateLocal(d);
    setFormValidUntil(validUntil);
    setFormVatRate(20);
    const initialLines = [defaultLine()];
    setFormLines(initialLines);
    setFormBaseline({ clientId: '', subject: '', validUntil, vatRate: 20, lines: initialLines });
    setFormOpen(true);
  }

  function openEditForm(q: Quote) {
    setEditingQuote(q);
    setFormClientId(q.clientId);
    setFormSubject(q.subject);
    setFormValidUntil(q.validUntil ? q.validUntil.slice(0, 10) : '');
    setFormVatRate(q.vatRate ?? 20);
    const lines = quoteDetail?.lines ?? [];
    setFormLines(
      lines.length > 0
        ? lines.map(l => ({ designation: l.designation, unit: l.unit, quantity: l.quantity, unitPrice: l.unitPrice, costPrice: l.costPrice ?? 0 }))
        : [defaultLine()]
    );
    // Defer baseline capture — lines may arrive asynchronously via quoteDetail.
    setFormBaseline(null);
    setFormOpen(true);
  }

  // Once quoteDetail has been hydrated in edit mode, snapshot the current values
  // so the dirty-form guard can compare against them.
  useEffect(() => {
    if (formOpen && editingQuote && formBaseline === null) {
      setFormBaseline(formValuesForGuard);
    }
  }, [formOpen, editingQuote, formBaseline, formValuesForGuard]);

  function updateLine(idx: number, field: keyof QuoteLineForm, value: string | number) {
    setFormLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function addLine() {
    setFormLines(prev => [...prev, defaultLine()]);
  }

  function removeLine(idx: number) {
    setFormLines(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formClientId) { toast.error('Sélectionnez un client'); return; }
    if (!formSubject.trim()) { toast.error('Saisissez un objet'); return; }
    if (!formValidUntil) { toast.error('Saisissez une date de validité'); return; }
    const validLines = formLines.filter(l => l.designation.trim() && l.quantity > 0 && l.unitPrice >= 0);
    if (validLines.length === 0) { toast.error('Ajoutez au moins une ligne valide'); return; }

    if (selectedCompany === 'GROUP' && !editingQuote && !formCompany) {
      toast.error('Sélectionnez une entité'); return;
    }

    const payload: CreateQuotePayload = {
      clientId: formClientId,
      subject: formSubject.trim(),
      validUntil: new Date(formValidUntil).toISOString(),
      vatRate: formVatRate,
      lines: validLines,
    };

    if (editingQuote) {
      await updateMutation.mutateAsync({ id: editingQuote.id, data: payload });
    } else {
      const scope = selectedCompany === 'GROUP' ? formCompany : undefined;
      await createMutation.mutateAsync({ data: payload, companyScope: scope });
    }
    closeForm();
  }

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Devis" subtitle="Chargement…" action={{ label: 'Nouveau devis', onClick: () => {} }} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Devis"
        subtitle={`${quotes.length} devis`}
        action={{ label: 'Nouveau devis', onClick: openCreateForm }}
      >
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
          setSelectedTemplateId('');
          setTplClientId('');
          setTplSubject('');
          const d = new Date(); d.setDate(d.getDate() + 30);
          setTplValidUntil(toISODateLocal(d));
          setFromTemplateOpen(true);
        }}>
          <BookTemplate className="h-3 w-3" /> Depuis un modèle
        </Button>
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

      {quotes.length === 0 ? (
        <EmptyState icon={FileTextIcon} title="Aucun devis" description="Créez votre premier devis pour commencer." />
      ) : viewMode === 'kanban' ? (
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
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => openEditForm(selectedQuote)}
                >
                  <Pencil className="h-3 w-3" /> Modifier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  disabled={duplicateMutation.isPending}
                  onClick={() => duplicateMutation.mutate(selectedQuote.id)}
                >
                  <Copy className="h-3 w-3" /> {duplicateMutation.isPending ? '…' : 'Dupliquer'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => {
                    setTemplateName(selectedQuote.subject);
                    setTemplateDesc('');
                    setSaveTemplateOpen(true);
                  }}
                >
                  <Save className="h-3 w-3" /> Modèle
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => setPdfPreviewOpen(true)}
                >
                  <Eye className="h-3 w-3" /> Aperçu
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={async () => {
                    try {
                      const { quotesApi } = await import('@/services/api/quotes.api');
                      await quotesApi.downloadPdf(selectedQuote.id);
                    } catch (err: any) {
                      toast.error(err.message ?? 'Erreur PDF');
                    }
                  }}
                >
                  <Download className="h-3 w-3" /> PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={openEmailDialog}
                >
                  <Mail className="h-3 w-3" /> Email
                </Button>

                {/* Status transition buttons */}
                {selectedQuote.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: selectedQuote.id, status: 'sent' })}
                  >
                    {statusMutation.isPending ? '…' : 'Envoyer'}
                  </Button>
                )}
                {selectedQuote.status === 'sent' && (
                  <>
                    <Button
                      size="sm"
                      className="text-xs bg-success hover:bg-success/90 text-success-foreground"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: selectedQuote.id, status: 'accepted' })}
                    >
                      {statusMutation.isPending ? '…' : 'Accepté'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: selectedQuote.id, status: 'refused' })}
                    >
                      {statusMutation.isPending ? '…' : 'Refusé'}
                    </Button>
                  </>
                )}
                {selectedQuote.status === 'accepted' && (
                  <Button
                    size="sm"
                    className="text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={convertMutation.isPending || convertFullMutation.isPending}
                    onClick={() => {
                      setConvertWithWorkshop(false);
                      setConvertWithPurchases(false);
                      setConvertJobAddress(selectedQuote.clientAddress ?? '');
                      setConvertDialogOpen(true);
                    }}
                  >
                    <ArrowRight className="h-3 w-3" /> {convertMutation.isPending || convertFullMutation.isPending ? '…' : 'Convertir'}
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
                <TabsList className={`w-full grid h-9 ${selectedQuote.status === 'accepted' ? 'grid-cols-5' : 'grid-cols-4'}`}>
                  <TabsTrigger value="lines" className="text-xs">Lignes</TabsTrigger>
                  {selectedQuote.status === 'accepted' && (
                    <TabsTrigger value="amendments" className="text-xs">
                      Avenants {amendments.length > 0 && `(${amendments.length})`}
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="files" className="text-xs">PJ</TabsTrigger>
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

                <TabsContent value="amendments" className="mt-3 space-y-3">
                  {avFormOpen ? (
                    <form onSubmit={handleAvSubmit} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                      <div className="text-sm font-semibold">Nouvel avenant</div>
                      <div className="space-y-1.5">
                        <Label htmlFor="av-subject">Objet *</Label>
                        <Input id="av-subject" value={avSubject} onChange={e => setAvSubject(e.target.value)} placeholder="Description de l'avenant" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Lignes</Label>
                          <Button type="button" size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => setAvLines(prev => [...prev, defaultLine()])}>
                            <Plus className="h-3 w-3" /> Ajouter
                          </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/50 text-muted-foreground">
                                <th className="text-left px-2 py-1.5">Désignation</th>
                                <th className="text-center px-2 py-1.5 w-12">U.</th>
                                <th className="text-right px-2 py-1.5 w-14">Qté</th>
                                <th className="text-right px-2 py-1.5 w-20">P.U. HT</th>
                                <th className="w-8" />
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {avLines.map((line, idx) => (
                                <tr key={idx}>
                                  <td className="px-1 py-1"><Input className="h-7 text-xs" value={line.designation} onChange={e => setAvLines(prev => prev.map((l, i) => i === idx ? { ...l, designation: e.target.value } : l))} placeholder="Désignation" /></td>
                                  <td className="px-1 py-1"><Input className="h-7 text-xs text-center" value={line.unit} onChange={e => setAvLines(prev => prev.map((l, i) => i === idx ? { ...l, unit: e.target.value } : l))} /></td>
                                  <td className="px-1 py-1"><Input className="h-7 text-xs text-right" type="number" min={0} step="any" value={line.quantity} onChange={e => setAvLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: parseFloat(e.target.value) || 0 } : l))} /></td>
                                  <td className="px-1 py-1"><Input className="h-7 text-xs text-right" type="number" min={0} step="any" value={line.unitPrice} onChange={e => setAvLines(prev => prev.map((l, i) => i === idx ? { ...l, unitPrice: parseFloat(e.target.value) || 0 } : l))} /></td>
                                  <td className="px-1 py-1 text-center">
                                    <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => setAvLines(prev => prev.filter((_, i) => i !== idx))} disabled={avLines.length === 1}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="text-right text-sm font-medium">Total : {avTotalHT.toLocaleString('fr-FR')} €</div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="text-xs" disabled={createAmendmentMutation.isPending}>
                          {createAmendmentMutation.isPending ? 'Création…' : 'Créer l\'avenant'}
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setAvFormOpen(false)}>Annuler</Button>
                      </div>
                    </form>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={openAvForm}>
                      <Plus className="h-3 w-3" /> Nouvel avenant
                    </Button>
                  )}

                  {amendments.length === 0 && !avFormOpen ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun avenant pour ce devis</p>
                  ) : (
                    <div className="space-y-2">
                      {amendments.map(av => (
                        <div key={av.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-medium">{av.reference}</span>
                            <StatusBadge type="quote" status={av.status as QuoteStatus} />
                          </div>
                          <div className="text-sm mb-1">{av.subject}</div>
                          <div className="text-sm font-bold mb-2">{av.amount.toLocaleString('fr-FR')} € HT</div>
                          {av.lines.length > 0 && (
                            <div className="text-xs text-muted-foreground mb-2">
                              {av.lines.map(l => `${l.designation} (${l.quantity} ${l.unit})`).join(', ')}
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            {av.status === 'draft' && (
                              <>
                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => amendmentStatusMutation.mutate({ id: av.id, status: 'sent' })}>
                                  Envoyer
                                </Button>
                                <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => deleteAmendmentMutation.mutate(av.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {av.status === 'sent' && (
                              <>
                                <Button size="sm" className="text-xs h-7 bg-success hover:bg-success/90 text-success-foreground" onClick={() => amendmentStatusMutation.mutate({ id: av.id, status: 'accepted' })}>
                                  Accepter
                                </Button>
                                <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => amendmentStatusMutation.mutate({ id: av.id, status: 'refused' })}>
                                  Refuser
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {amendmentsAcceptedTotal > 0 && (
                        <div className="border-t pt-2 mt-2 flex justify-between text-sm">
                          <span className="text-muted-foreground">Total devis + avenants acceptés</span>
                          <span className="font-bold">{(totalHT + amendmentsAcceptedTotal).toLocaleString('fr-FR')} €</span>
                        </div>
                      )}
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

      {/* Create / Edit Form Drawer */}
      <Sheet open={formOpen} onOpenChange={(open) => { if (!open) guardCloseForm(closeForm); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{editingQuote ? `Modifier ${editingQuote.reference}` : 'Nouveau devis'}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {!editingQuote && <CompanySelect value={formCompany} onChange={setFormCompany} />}
            {/* Client */}
            <div className="space-y-1.5">
              <Label htmlFor="q-client">Client *</Label>
              <Select value={formClientId} onValueChange={setFormClientId}>
                <SelectTrigger id="q-client">
                  <SelectValue placeholder="Sélectionnez un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Objet */}
            <div className="space-y-1.5">
              <Label htmlFor="q-subject">Objet *</Label>
              <Input
                id="q-subject"
                value={formSubject}
                onChange={e => setFormSubject(e.target.value)}
                placeholder="Description du devis"
              />
            </div>

            {/* Date validité + TVA */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="q-valid">Date de validité *</Label>
                <Input
                  id="q-valid"
                  type="date"
                  value={formValidUntil}
                  onChange={e => setFormValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q-vat">Taux de TVA</Label>
                <Select value={String(formVatRate)} onValueChange={v => setFormVatRate(parseFloat(v))}>
                  <SelectTrigger id="q-vat"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (exonéré)</SelectItem>
                    <SelectItem value="5.5">5,5% (réduit)</SelectItem>
                    <SelectItem value="10">10% (intermédiaire)</SelectItem>
                    <SelectItem value="20">20% (normal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lignes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lignes *</Label>
                <Button type="button" size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={addLine}>
                  <Plus className="h-3 w-3" /> Ajouter
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-2 py-1.5">Désignation</th>
                      <th className="text-center px-2 py-1.5 w-12">U.</th>
                      <th className="text-right px-2 py-1.5 w-14">Qté</th>
                      <th className="text-right px-2 py-1.5 w-20">P.U. HT</th>
                      <th className="text-right px-2 py-1.5 w-20">Coût</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {formLines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="px-1 py-1">
                          <CatalogCombobox
                            value={line.designation}
                            onChange={(v) => updateLine(idx, 'designation', v)}
                            onPickProduct={(p) => {
                              setFormLines(prev => prev.map((l, i) => i === idx ? {
                                ...l,
                                designation: p.designation,
                                unit: p.unit,
                                unitPrice: p.salePrice,
                                costPrice: p.costPrice ?? 0,
                              } : l));
                            }}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            className="h-7 text-xs text-center"
                            value={line.unit}
                            onChange={e => updateLine(idx, 'unit', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            className="h-7 text-xs text-right"
                            type="number"
                            min={0}
                            step="any"
                            value={line.quantity}
                            onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            className="h-7 text-xs text-right"
                            type="number"
                            min={0}
                            step="any"
                            value={line.unitPrice}
                            onChange={e => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            className="h-7 text-xs text-right"
                            type="number"
                            min={0}
                            step="any"
                            value={line.costPrice}
                            onChange={e => updateLine(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => removeLine(idx)}
                            disabled={formLines.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totaux live */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/30 rounded p-2 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase">Total HT</div>
                  <div className="text-sm font-bold">{formTotalHT.toLocaleString('fr-FR')} €</div>
                </div>
                <div className="bg-muted/30 rounded p-2 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase">Coût</div>
                  <div className="text-sm font-bold">{formTotalCost.toLocaleString('fr-FR')} €</div>
                </div>
                <div className={`rounded p-2 text-center ${formMargin >= 25 ? 'bg-success/10' : formMargin >= 15 ? 'bg-warning/10' : 'bg-destructive/10'}`}>
                  <div className="text-[10px] text-muted-foreground uppercase">Marge</div>
                  <div className="text-sm font-bold">{formMargin.toFixed(1)}%</div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Enregistrement…' : editingQuote ? 'Mettre à jour' : 'Créer le devis'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => guardCloseForm(closeForm)}
              >
                Annuler
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Email Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer le devis par email</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email-to">Destinataire *</Label>
              <Input id="email-to" type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="client@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Objet</Label>
              <Input id="email-subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-message">Message</Label>
              <Textarea id="email-message" value={emailMessage} onChange={e => setEmailMessage(e.target.value)} rows={4} />
            </div>
            <p className="text-xs text-muted-foreground">Le PDF du devis sera joint automatiquement.</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmailOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={sendEmailMutation.isPending} className="gap-1">
                {sendEmailMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                Envoyer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sauvegarder comme modèle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAsTemplate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Nom du modèle *</Label>
              <Input id="tpl-name" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Ex: Signalisation horizontale" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Description</Label>
              <Textarea id="tpl-desc" value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} rows={2} placeholder="Description optionnelle" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaveTemplateOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createTemplateMutation.isPending} className="gap-1">
                {createTemplateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Sauvegarder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create from Template Dialog */}
      <Dialog open={fromTemplateOpen} onOpenChange={setFromTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un devis depuis un modèle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFromTemplate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Modèle *</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez un modèle" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t._count.lines} lignes) — utilisé {t.usageCount}×
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateId && (
              <div className="border rounded-md p-3 bg-muted/30 space-y-1 max-h-32 overflow-y-auto">
                {templates.find(t => t.id === selectedTemplateId)?.lines.map((l, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="truncate flex-1">{l.designation}</span>
                    <span className="text-muted-foreground ml-2">{l.quantity} {l.unit} × {l.unitPrice}€</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={tplClientId} onValueChange={setTplClientId}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez un client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Objet *</Label>
              <Input value={tplSubject} onChange={e => setTplSubject(e.target.value)} placeholder="Objet du devis" />
            </div>

            <div className="space-y-1.5">
              <Label>Validité</Label>
              <Input type="date" value={tplValidUntil} onChange={e => setTplValidUntil(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFromTemplateOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createFromTemplateMutation.isPending} className="gap-1">
                {createFromTemplateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Créer le devis
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Convert Full Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convertir le devis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Le devis <strong>{selectedQuote?.reference}</strong> sera converti en chantier.
            </p>

            {/* Adresse du chantier */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Adresse du chantier</label>
              <p className="text-xs text-muted-foreground">
                Pré-remplie depuis l'adresse du client — modifiez-la si le chantier est à un endroit différent.
              </p>
              <input
                type="text"
                value={convertJobAddress}
                onChange={e => setConvertJobAddress(e.target.value)}
                placeholder="Adresse du chantier"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-3 border-t pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={convertWithWorkshop}
                  onChange={e => setConvertWithWorkshop(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Créer les items atelier (fabrication)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={convertWithPurchases}
                  onChange={e => setConvertWithPurchases(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Créer les commandes achats (fournitures)</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>Annuler</Button>
            <Button
              disabled={convertFullMutation.isPending || convertMutation.isPending}
              onClick={async () => {
                if (!selectedQuote) return;
                const jobAddress = convertJobAddress.trim() || undefined;
                if (convertWithWorkshop || convertWithPurchases) {
                  await convertFullMutation.mutateAsync({
                    id: selectedQuote.id,
                    options: { createWorkshop: convertWithWorkshop, createPurchases: convertWithPurchases, jobAddress },
                  });
                } else {
                  await convertMutation.mutateAsync({ id: selectedQuote.id, jobAddress });
                }
                setConvertDialogOpen(false);
              }}
              className="gap-1"
            >
              {convertFullMutation.isPending || convertMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowRight className="h-3 w-3" />
              )}
              Convertir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF preview */}
      <PdfPreviewDialog
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        title={selectedQuote ? `Aperçu · Devis ${selectedQuote.reference}` : 'Aperçu'}
        fetchBlobUrl={async () => {
          if (!selectedQuote) throw new Error('Aucun devis sélectionné');
          const { quotesApi } = await import('@/services/api/quotes.api');
          return quotesApi.previewPdf(selectedQuote.id);
        }}
        onDownload={async () => {
          if (!selectedQuote) return;
          const { quotesApi } = await import('@/services/api/quotes.api');
          await quotesApi.downloadPdf(selectedQuote.id);
        }}
      />
    </div>
  );
}
