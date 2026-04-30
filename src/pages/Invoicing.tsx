import { useState } from 'react';
import { useFilterByCompany, useApp } from '@/contexts/AppContext';
import { useUrlState } from '@/hooks/use-url-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices, useInvoiceDetail, useUpdateInvoiceStatus, useCreateInvoice, useClients, useJobs, useActivityLogs, useAttachments, useSituations, useCreateSituation, useValidateSituation, useSendEmail, useReminderLogs, useRunReminders } from '@/services/api/hooks';
import { invoicesApi } from '@/services/api/invoices.api';
import { exportApi, ExportFormat, FecJournal } from '@/services/api/export.api';
import { useAccountingSettings, useUpdateAccountingSettings } from '@/services/api/hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, Column } from '@/components/shared/DataTable';
import { StatusBadge, CompanyBadge } from '@/components/shared/StatusBadge';
import { CompanySelect } from '@/components/shared/CompanySelect';
import { ActivityFeed } from '@/components/shared/ActivityFeed';
import { FileUploader } from '@/components/shared/FileUploader';
import { Invoice, InvoiceStatus } from '@/types';
import { toISODateLocal } from '@/lib/format';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Send, Plus, CheckCircle2, Loader2, Mail, Bell, Settings, Eye, FileCheck2 } from 'lucide-react';
import { FacturXError } from '@/services/api/invoices.api';
import { PdfPreviewDialog } from '@/components/shared/PdfPreviewDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const SITUATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  validated: 'Valid\u00e9e',
  sent: 'Envoy\u00e9e',
  paid: 'Pay\u00e9e',
};

const SITUATION_STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  validated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sent: 'bg-info/15 text-info',
  paid: 'bg-success/15 text-success',
};

const SITUATION_BAR_CLASSES: Record<string, string> = {
  draft: 'bg-muted-foreground/30',
  validated: 'bg-blue-500',
  sent: 'bg-info',
  paid: 'bg-success',
};

export default function Invoicing() {
  const { data: apiInvoices, isLoading } = useInvoices();
  const allInvoices: Invoice[] = apiInvoices ?? [];
  const invoices = useFilterByCompany(allInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const VALID_INVOICE_STATUSES: (InvoiceStatus | 'all')[] = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'];
  const [statusFilterRaw, setStatusFilterRaw] = useUrlState('status', 'all');
  const statusFilter = (VALID_INVOICE_STATUSES.includes(statusFilterRaw as any)
    ? statusFilterRaw
    : 'all') as InvoiceStatus | 'all';
  const setStatusFilter = (s: InvoiceStatus | 'all') => setStatusFilterRaw(s);
  const { selectedCompany } = useApp();

  // Load invoice detail from API when selected (for situations)
  const { data: invoiceDetail } = useInvoiceDetail(selectedInvoice?.id ?? null);
  const updateStatusMutation = useUpdateInvoiceStatus();
  const createMutation = useCreateInvoice();

  // Situations hooks
  const { data: situationsData } = useSituations(selectedInvoice?.id ?? null);
  const createSituationMutation = useCreateSituation();
  const validateSituationMutation = useValidateSituation();

  // Data for the create form
  const { data: apiClients } = useClients();
  const clients = apiClients ?? [];
  const { data: apiJobs } = useJobs();
  const jobs = apiJobs ?? [];

  // Create form state
  const [formOpen, setFormOpen] = useState(false);
  const [formClientId, setFormClientId] = useState('');
  const [formJobId, setFormJobId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formIssuedAt, setFormIssuedAt] = useState(toISODateLocal(new Date()));
  const [formDueDate, setFormDueDate] = useState('');
  const [formCompany, setFormCompany] = useState<'ASP' | 'JS'>('ASP');

  // PDF download state
  const [pdfLoading, setPdfLoading] = useState(false);
  const [facturXLoading, setFacturXLoading] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  // Email
  const sendEmailMutation = useSendEmail();
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  function openEmailDialog() {
    if (!selectedInvoice) return;
    const client = clients.find(c => c.name === selectedInvoice.clientName);
    setEmailTo(client?.email ?? '');
    setEmailSubject(`Facture ${selectedInvoice.reference}`);
    setEmailMessage(`Veuillez trouver ci-joint la facture ${selectedInvoice.reference}.\n\nCordialement,`);
    setEmailOpen(true);
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoice || !emailTo.trim()) { toast.error('Saisissez un destinataire'); return; }
    await sendEmailMutation.mutateAsync({
      entityType: 'invoice',
      entityId: selectedInvoice.id,
      to: emailTo.trim(),
      subject: emailSubject || undefined,
      message: emailMessage || undefined,
    });
    setEmailOpen(false);
  }

  // Export modal state
  const [fecOpen, setFecOpen] = useState(false);
  const [fecFrom, setFecFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [fecTo, setFecTo] = useState(() => toISODateLocal(new Date()));
  const [fecLoading, setFecLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('fec');
  const [fecJournal, setFecJournal] = useState<FecJournal>('ALL');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: accountingSettings } = useAccountingSettings();
  const updateSettingsMutation = useUpdateAccountingSettings();

  async function handleDownloadPdf(invoiceId: string) {
    setPdfLoading(true);
    try {
      await invoicesApi.downloadPdf(invoiceId);
      toast.success('PDF téléchargé');
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur téléchargement PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDownloadFacturX(invoiceId: string) {
    setFacturXLoading(true);
    try {
      await invoicesApi.downloadFacturX(invoiceId);
      toast.success('Factur-X téléchargé');
    } catch (err) {
      if (err instanceof FacturXError && err.status === 422 && err.missing.length > 0) {
        toast.error(
          `Factur-X indisponible — ${err.missing.length} champ(s) légaux manquant(s) : ${err.missing.join(', ')}`,
          { duration: 8000 },
        );
      } else {
        toast.error((err as any)?.message ?? 'Erreur Factur-X');
      }
    } finally {
      setFacturXLoading(false);
    }
  }

  async function handleExportCompta(e: React.FormEvent) {
    e.preventDefault();
    if (!fecFrom || !fecTo) { toast.error('Sélectionnez une période'); return; }
    setFecLoading(true);
    try {
      if (exportFormat === 'fec') {
        await exportApi.downloadFec(fecFrom, fecTo, fecJournal);
      } else if (exportFormat === 'sage') {
        await exportApi.downloadSage(fecFrom, fecTo);
      } else {
        await exportApi.downloadEbp(fecFrom, fecTo);
      }
      toast.success(`Export ${exportFormat.toUpperCase()} téléchargé`);
      setFecOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Erreur lors de l'export");
    } finally {
      setFecLoading(false);
    }
  }

  // Situation form state
  const [sitFormOpen, setSitFormOpen] = useState(false);
  const [sitPercentage, setSitPercentage] = useState('');
  const [sitDescription, setSitDescription] = useState('');
  const [sitDate, setSitDate] = useState(toISODateLocal(new Date()));

  // Use situations from the dedicated query, fallback to invoice detail
  const invoiceSituations = situationsData ?? invoiceDetail?.situations ?? [];

  // Computed: last situation percentage and preview for the form
  const lastSituationPct = invoiceSituations.length > 0
    ? invoiceSituations[invoiceSituations.length - 1].percentage
    : 0;
  const sitPreviewPct = parseFloat(sitPercentage) || 0;
  const sitPreviewAmount = selectedInvoice && sitPreviewPct > lastSituationPct
    ? Math.round(((sitPreviewPct - lastSituationPct) / 100) * selectedInvoice.amount * 100) / 100
    : 0;

  function openSituationForm() {
    const nextPct = lastSituationPct + 10;
    setSitPercentage(String(nextPct > 100 ? 100 : nextPct));
    setSitDescription('');
    setSitDate(toISODateLocal(new Date()));
    setSitFormOpen(true);
  }

  async function handleSituationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoice) return;
    const pct = parseFloat(sitPercentage);
    if (!pct || pct <= 0 || pct > 100) {
      toast.error('Saisissez un pourcentage valide (1-100)');
      return;
    }
    if (pct <= lastSituationPct) {
      toast.error(`Le pourcentage doit \u00eatre sup\u00e9rieur \u00e0 ${lastSituationPct}%`);
      return;
    }
    await createSituationMutation.mutateAsync({
      invoiceId: selectedInvoice.id,
      data: {
        percentage: pct,
        description: sitDescription || undefined,
        date: sitDate ? new Date(sitDate).toISOString() : undefined,
      },
    });
    setSitFormOpen(false);
  }

  function openCreateForm() {
    setFormClientId('');
    setFormJobId('');
    setFormAmount('');
    setFormIssuedAt(toISODateLocal(new Date()));
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setFormDueDate(toISODateLocal(d));
    setFormOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) { toast.error('Saisissez un montant valide'); return; }
    if (!formIssuedAt) { toast.error("Saisissez une date d'\u00e9mission"); return; }
    if (!formDueDate) { toast.error("Saisissez une date d'\u00e9ch\u00e9ance"); return; }

    const scope = selectedCompany === 'GROUP' ? formCompany : undefined;
    await createMutation.mutateAsync({
      data: {
        clientId: formClientId && formClientId !== '__none__' ? formClientId : undefined,
        jobId: formJobId && formJobId !== '__none__' ? formJobId : undefined,
        amount,
        issuedAt: new Date(formIssuedAt).toISOString(),
        dueDate: new Date(formDueDate).toISOString(),
      },
      companyScope: scope,
    });
    setFormOpen(false);
  }

  const filtered = statusFilter === 'all' ? invoices : invoices.filter(i => i.status === statusFilter);

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const totalDraft = invoices.filter(i => i.status === 'draft').reduce((s, i) => s + i.amount, 0);

  const { data: invoiceActivities = [] } = useActivityLogs('invoice', selectedInvoice?.id ?? null);
  const { data: invoiceFiles = [] } = useAttachments('invoice', selectedInvoice?.id ?? null);
  const { data: reminderLogs = [] } = useReminderLogs(selectedInvoice?.id ?? null);
  const runRemindersMutation = useRunReminders();

  const statusCounts = {
    all: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    cancelled: invoices.filter(i => i.status === 'cancelled').length,
  };

  const columns: Column<Invoice>[] = [
    { key: 'reference', header: 'R\u00e9f.', sortable: true, accessor: (i) => i.reference, render: (i) => (
      <div className="flex items-center gap-2">
        <span className="font-medium font-mono text-xs">{i.reference}</span>
        <CompanyBadge company={i.company} />
      </div>
    )},
    { key: 'client', header: 'Client', sortable: true, accessor: (i) => i.clientName, render: (i) => <span>{i.clientName}</span> },
    { key: 'job', header: 'Chantier', render: (i) => <span className="text-xs font-mono text-muted-foreground">{i.jobRef || '\u2013'}</span> },
    { key: 'amount', header: 'Montant', sortable: true, accessor: (i) => i.amount, render: (i) => <span className="font-medium">{i.amount.toLocaleString('fr-FR')} €</span> },
    { key: 'status', header: 'Statut', render: (i) => <StatusBadge type="invoice" status={i.status} /> },
    { key: 'issued', header: '\u00c9mission', sortable: true, accessor: (i) => i.issuedAt, render: (i) => <span className="text-xs text-muted-foreground">{new Date(i.issuedAt).toLocaleDateString('fr-FR')}</span> },
    { key: 'due', header: '\u00c9ch\u00e9ance', render: (i) => (
      <span className={`text-xs ${i.status === 'overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
        {new Date(i.dueDate).toLocaleDateString('fr-FR')}
      </span>
    )},
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Facturation" subtitle="Chargement…" action={{ label: 'Nouvelle facture', onClick: () => {} }} />
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Facturation" subtitle={`${invoices.length} factures`} action={{ label: 'Nouvelle facture', onClick: openCreateForm }}>
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setFecOpen(true)}>
          <Download className="h-3 w-3" /> Export compta
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Encaissé</div>
          <div className="text-xl font-bold text-success">{totalPaid.toLocaleString('fr-FR')} €</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">En attente</div>
          <div className="text-xl font-bold text-warning">{totalPending.toLocaleString('fr-FR')} €</div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Brouillons</div>
          <div className="text-xl font-bold text-muted-foreground">{totalDraft.toLocaleString('fr-FR')} €</div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all' as const, label: 'Toutes' },
          { key: 'draft' as const, label: 'Brouillons' },
          { key: 'sent' as const, label: 'Envoy\u00e9es' },
          { key: 'paid' as const, label: 'Pay\u00e9es' },
          { key: 'overdue' as const, label: 'En retard' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === f.key ? 'bg-secondary text-secondary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label} ({statusCounts[f.key]})
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        searchPlaceholder="Rechercher une facture…"
        searchAccessor={(i) => `${i.reference} ${i.clientName} ${i.jobRef || ''}`}
        onRowClick={(i) => setSelectedInvoice(i)}
      />

      {/* Invoice Detail Drawer */}
      <Sheet open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedInvoice && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <SheetTitle className="font-mono">{selectedInvoice.reference}</SheetTitle>
                  <CompanyBadge company={selectedInvoice.company} />
                  <StatusBadge type="invoice" status={selectedInvoice.status} />
                </div>
                <p className="text-sm text-muted-foreground">{selectedInvoice.clientName}</p>
              </SheetHeader>

              {/* Actions */}
              <div className="flex gap-2 mb-4">
                {selectedInvoice.status === 'draft' && (
                  <Button
                    size="sm"
                    className="text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={updateStatusMutation.isPending}
                    onClick={() => updateStatusMutation.mutate({ id: selectedInvoice.id, status: 'sent' })}
                  >
                    <Send className="h-3 w-3" /> {updateStatusMutation.isPending ? '\u2026' : 'Envoyer'}
                  </Button>
                )}
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
                  disabled={pdfLoading}
                  onClick={() => handleDownloadPdf(selectedInvoice.id)}
                >
                  {pdfLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  disabled={facturXLoading || selectedInvoice.status === 'draft'}
                  title={selectedInvoice.status === 'draft'
                    ? 'Émettez la facture pour générer le Factur-X'
                    : 'Télécharger le Factur-X (PDF/A-3 avec XML embarqué)'}
                  onClick={() => handleDownloadFacturX(selectedInvoice.id)}
                >
                  {facturXLoading
                    ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    : <FileCheck2 className="h-3 w-3" aria-hidden="true" />
                  } Factur-X
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={openEmailDialog}
                >
                  <Mail className="h-3 w-3" /> Email
                </Button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div><div className="text-xs text-muted-foreground uppercase">Montant</div><div className="text-lg font-bold">{selectedInvoice.amount.toLocaleString('fr-FR')} €</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Chantier</div><div className="font-medium font-mono">{selectedInvoice.jobRef || '\u2013'}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Émission</div><div className="font-medium">{new Date(selectedInvoice.issuedAt).toLocaleDateString('fr-FR')}</div></div>
                <div><div className="text-xs text-muted-foreground uppercase">Échéance</div><div className={`font-medium ${selectedInvoice.status === 'overdue' ? 'text-destructive' : ''}`}>{new Date(selectedInvoice.dueDate).toLocaleDateString('fr-FR')}</div></div>
                {selectedInvoice.paidAt && (
                  <div><div className="text-xs text-muted-foreground uppercase">Payée le</div><div className="font-medium text-success">{new Date(selectedInvoice.paidAt).toLocaleDateString('fr-FR')}</div></div>
                )}
              </div>

              <Tabs defaultValue={invoiceSituations.length > 0 ? 'situations' : 'activity'} className="w-full">
                <TabsList className="w-full grid grid-cols-4 h-9">
                  <TabsTrigger value="situations" className="text-xs">Situations ({invoiceSituations.length})</TabsTrigger>
                  <TabsTrigger value="reminders" className="text-xs">Relances ({reminderLogs.length})</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs">Documents</TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs">Activité</TabsTrigger>
                </TabsList>

                <TabsContent value="situations" className="mt-3">
                  {/* Situation creation form (inline) */}
                  {sitFormOpen ? (
                    <form onSubmit={handleSituationSubmit} className="border rounded-lg p-4 mb-3 space-y-3 bg-muted/30">
                      <div className="text-sm font-semibold">Nouvelle situation de travaux</div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="sit-pct">Avancement cumulé (%)</Label>
                          <Input
                            id="sit-pct"
                            type="number"
                            min={lastSituationPct + 0.01}
                            max={100}
                            step="0.01"
                            value={sitPercentage}
                            onChange={e => setSitPercentage(e.target.value)}
                            placeholder={`> ${lastSituationPct}%`}
                          />
                          {lastSituationPct > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              Situation précédente : {lastSituationPct}%
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="sit-date">Date</Label>
                          <Input
                            id="sit-date"
                            type="date"
                            value={sitDate}
                            onChange={e => setSitDate(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Auto-calculated amount preview */}
                      {sitPreviewAmount > 0 && (
                        <div className="bg-card border rounded-md p-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Delta : {(sitPreviewPct - lastSituationPct).toFixed(2)}% de {selectedInvoice.amount.toLocaleString('fr-FR')} €</span>
                          </div>
                          <div className="text-lg font-bold">
                            {sitPreviewAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="sit-desc">Description (optionnel)</Label>
                        <Textarea
                          id="sit-desc"
                          value={sitDescription}
                          onChange={e => setSitDescription(e.target.value)}
                          placeholder="Travaux réalisés, observations..."
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="text-xs" disabled={createSituationMutation.isPending}>
                          {createSituationMutation.isPending ? 'Cr\u00e9ation\u2026' : 'Cr\u00e9er la situation'}
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setSitFormOpen(false)}>
                          Annuler
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="mb-3">
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={openSituationForm}>
                        <Plus className="h-3 w-3" /> Nouvelle situation
                      </Button>
                    </div>
                  )}

                  {invoiceSituations.length === 0 && !sitFormOpen ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">Aucune situation de travaux enregistrée</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Créez des situations pour facturer progressivement l'avancement du chantier.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Situations table header */}
                      {invoiceSituations.length > 0 && (
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-1">
                          <div className="col-span-1">N°</div>
                          <div className="col-span-3">Date</div>
                          <div className="col-span-1 text-right">%</div>
                          <div className="col-span-3 text-right">Montant</div>
                          <div className="col-span-2 text-right">Cumulé</div>
                          <div className="col-span-2 text-right">Statut</div>
                        </div>
                      )}

                      {invoiceSituations.map(sit => (
                        <div key={sit.id} className="border rounded-lg p-3">
                          {/* Table-like row */}
                          <div className="grid grid-cols-12 gap-2 items-center text-sm">
                            <div className="col-span-1 font-mono font-bold text-xs">{sit.number}</div>
                            <div className="col-span-3 text-xs text-muted-foreground">
                              {new Date(sit.date).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="col-span-1 text-right font-medium text-xs">{sit.percentage}%</div>
                            <div className="col-span-3 text-right font-medium">
                              {sit.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </div>
                            <div className="col-span-2 text-right text-xs text-muted-foreground">
                              {(sit.cumulativeAmount ?? sit.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </div>
                            <div className="col-span-2 text-right">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                SITUATION_STATUS_CLASSES[sit.status] ?? 'bg-muted text-muted-foreground'
                              }`}>
                                {SITUATION_STATUS_LABELS[sit.status] ?? sit.status}
                              </span>
                            </div>
                          </div>

                          {/* Description if present */}
                          {sit.description && (
                            <p className="text-xs text-muted-foreground mt-1 pl-1">{sit.description}</p>
                          )}

                          {/* Progress bar */}
                          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${SITUATION_BAR_CLASSES[sit.status] ?? 'bg-muted-foreground/30'}`}
                              style={{ width: `${sit.percentage}%` }}
                            />
                          </div>

                          {/* Validate button for draft situations */}
                          {sit.status === 'draft' && (
                            <div className="mt-2 flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1 h-7"
                                disabled={validateSituationMutation.isPending}
                                onClick={() => validateSituationMutation.mutate(sit.id)}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                {validateSituationMutation.isPending ? 'Validation\u2026' : 'Valider'}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Totals footer */}
                      {invoiceSituations.length > 0 && (
                        <div className="border-t pt-3 mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total facturé</span>
                            <span className="font-bold">
                              {invoiceSituations.reduce((s, sit) => s + sit.amount, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Reste à facturer</span>
                            <span className="font-medium text-muted-foreground">
                              {(selectedInvoice.amount - invoiceSituations.reduce((s, sit) => s + sit.amount, 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Avancement</span>
                            <span className="font-medium">
                              {invoiceSituations[invoiceSituations.length - 1]?.percentage ?? 0}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="reminders" className="mt-3">
                  {reminderLogs.length === 0 ? (
                    <div className="text-center py-6">
                      <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucune relance envoyée</p>
                      {['sent', 'overdue'].includes(selectedInvoice.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1 mt-3"
                          disabled={runRemindersMutation.isPending}
                          onClick={() => runRemindersMutation.mutate()}
                        >
                          <Bell className="h-3 w-3" />
                          {runRemindersMutation.isPending ? 'Traitement...' : 'Lancer les relances'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reminderLogs.map(log => (
                        <div key={log.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                Relance N{log.rule?.level ?? '?'}
                              </span>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                log.status === 'sent' ? 'bg-success/15 text-success' :
                                log.status === 'simulated' ? 'bg-info/15 text-info' :
                                'bg-destructive/15 text-destructive'
                              }`}>
                                {log.status === 'sent' ? 'Envoyé' : log.status === 'simulated' ? 'Simulé' : 'Échoué'}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(log.sentAt).toLocaleDateString('fr-FR')} à {new Date(log.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{log.recipientEmail}</div>
                          {log.error && <div className="text-xs text-destructive mt-1">{log.error}</div>}
                        </div>
                      ))}
                      {['sent', 'overdue'].includes(selectedInvoice.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1 w-full"
                          disabled={runRemindersMutation.isPending}
                          onClick={() => runRemindersMutation.mutate()}
                        >
                          <Bell className="h-3 w-3" />
                          {runRemindersMutation.isPending ? 'Traitement...' : 'Relancer manuellement'}
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="files" className="mt-3">
                  <FileUploader files={invoiceFiles} />
                </TabsContent>

                <TabsContent value="activity" className="mt-3">
                  <ActivityFeed activities={invoiceActivities} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Invoice Form Drawer */}
      <Sheet open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Nouvelle facture</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <CompanySelect value={formCompany} onChange={setFormCompany} />

            <div className="space-y-1.5">
              <Label htmlFor="inv-client">Client</Label>
              <Select value={formClientId} onValueChange={setFormClientId}>
                <SelectTrigger id="inv-client">
                  <SelectValue placeholder="Sélectionnez un client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-job">Chantier</Label>
              <Select value={formJobId} onValueChange={setFormJobId}>
                <SelectTrigger id="inv-job">
                  <SelectValue placeholder="Sélectionnez un chantier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.reference} — {j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-amount">Montant HT *</Label>
              <Input id="inv-amount" type="number" min="0" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0.00" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-issued">Émission *</Label>
                <Input id="inv-issued" type="date" value={formIssuedAt} onChange={e => setFormIssuedAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-due">Échéance *</Label>
                <Input id="inv-due" type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Cr\u00e9ation\u2026' : 'Cr\u00e9er la facture'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Annuler</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Export comptable Dialog */}
      <Dialog open={fecOpen} onOpenChange={setFecOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export comptable</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExportCompta} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fec">FEC (Fichier des Ecritures Comptables)</SelectItem>
                  <SelectItem value="sage">Sage 100</SelectItem>
                  <SelectItem value="ebp">EBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exportFormat === 'fec' && (
              <div className="space-y-1.5">
                <Label>Journal</Label>
                <Select value={fecJournal} onValueChange={(v) => setFecJournal(v as FecJournal)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous (Ventes + Achats)</SelectItem>
                    <SelectItem value="VE">Ventes uniquement</SelectItem>
                    <SelectItem value="AC">Achats uniquement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fec-from">Du</Label>
                <Input id="fec-from" type="date" value={fecFrom} onChange={e => setFecFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fec-to">Au</Label>
                <Input id="fec-to" type="date" value={fecTo} onChange={e => setFecTo(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {exportFormat === 'fec'
                ? 'Exporte les ecritures comptables au format FEC (18 colonnes, conforme Article A.47 A-1 du LPF).'
                : `Exporte au format ${exportFormat.toUpperCase()} pour import dans votre logiciel comptable.`}
            </p>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="ghost" size="sm" className="gap-1 mr-auto" onClick={() => { setFecOpen(false); setSettingsOpen(true); }}>
                <Settings className="h-3 w-3" /> Parametres comptes
              </Button>
              <Button type="button" variant="outline" onClick={() => setFecOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={fecLoading} className="gap-1">
                {fecLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Telecharger
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Accounting Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Parametres comptables</SheetTitle>
          </SheetHeader>
          {accountingSettings && (
            <form
              className="space-y-6 mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                updateSettingsMutation.mutate({
                  accountClient: fd.get('accountClient') as string,
                  accountRevenue: fd.get('accountRevenue') as string,
                  accountVatOutput: fd.get('accountVatOutput') as string,
                  accountSupplier: fd.get('accountSupplier') as string,
                  accountPurchases: fd.get('accountPurchases') as string,
                  accountVatInput: fd.get('accountVatInput') as string,
                  billingDelayInProgress: Number(fd.get('billingDelayInProgress')),
                  billingDelayCompleted: Number(fd.get('billingDelayCompleted')),
                });
              }}
            >
              <div>
                <h4 className="text-sm font-semibold mb-2">Journal Ventes</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Clients</Label>
                    <Input name="accountClient" defaultValue={accountingSettings.accountClient} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Chiffre d'affaires</Label>
                    <Input name="accountRevenue" defaultValue={accountingSettings.accountRevenue} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">TVA collectee</Label>
                    <Input name="accountVatOutput" defaultValue={accountingSettings.accountVatOutput} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Journal Achats</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fournisseurs</Label>
                    <Input name="accountSupplier" defaultValue={accountingSettings.accountSupplier} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Achats</Label>
                    <Input name="accountPurchases" defaultValue={accountingSettings.accountPurchases} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">TVA deductible</Label>
                    <Input name="accountVatInput" defaultValue={accountingSettings.accountVatInput} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Previsionnel</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Delai facturation en cours (jours)</Label>
                    <Input name="billingDelayInProgress" type="number" defaultValue={accountingSettings.billingDelayInProgress} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Delai facturation termine (jours)</Label>
                    <Input name="billingDelayCompleted" type="number" defaultValue={accountingSettings.billingDelayCompleted} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
              <Button type="submit" size="sm" disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </form>
          )}
        </SheetContent>
      </Sheet>

      {/* Email Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer la facture par email</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-email-to">Destinataire *</Label>
              <Input id="inv-email-to" type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="client@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email-subject">Objet</Label>
              <Input id="inv-email-subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email-message">Message</Label>
              <Textarea id="inv-email-message" value={emailMessage} onChange={e => setEmailMessage(e.target.value)} rows={4} />
            </div>
            <p className="text-xs text-muted-foreground">Le PDF de la facture sera joint automatiquement.</p>
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

      {/* PDF preview */}
      <PdfPreviewDialog
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        title={selectedInvoice ? `Aperçu · Facture ${selectedInvoice.reference}` : 'Aperçu'}
        fetchBlobUrl={async () => {
          if (!selectedInvoice) throw new Error('Aucune facture sélectionnée');
          return invoicesApi.previewPdf(selectedInvoice.id);
        }}
        onDownload={() => selectedInvoice ? handleDownloadPdf(selectedInvoice.id) : undefined}
      />
    </div>
  );
}
