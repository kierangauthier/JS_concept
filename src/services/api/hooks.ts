/**
 * React Query hooks for all API modules.
 * Each hook falls back to empty arrays when the API is unreachable,
 * so existing mock data still works during development without an API running.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, CreateClientPayload, UpdateClientPayload } from './clients.api';
import { quotesApi, CreateQuotePayload, UpdateQuotePayload } from './quotes.api';
import { jobsApi, CreateJobPayload, UpdateJobPayload, JobPhoto } from './jobs.api';
import { searchApi, SearchResults } from './search.api';
import { timeEntriesApi, CreateTimeEntryPayload } from './time-entries.api';
import { purchasesApi, CreatePurchasePayload } from './purchases.api';
import { invoicesApi, CreateInvoicePayload, CreateSituationPayload } from './invoices.api';
import { workshopApi, CreateWorkshopItemPayload } from './workshop.api';
import { planningApi, CreateSlotPayload } from './planning.api';
import { teamsApi } from './teams.api';
import { usersApi, CreateUserPayload, UpdateUserPayload } from './users.api';
import { teamPlanningApi, CreateTeamSlotPayload } from './team-planning.api';
import { hrApi } from './hr.api';
import { activityLogsApi } from './activity-logs.api';
import { attachmentsApi } from './attachments.api';
import { catalogApi, CreateProductPayload, UpdateProductPayload, CreateCategoryPayload } from './catalog.api';
import { emailApi, SendEmailPayload } from './email.api';
import { amendmentsApi, CreateAmendmentPayload } from './amendments.api';
import { absencesApi, CreateAbsencePayload } from './absences.api';
import { remindersApi, CreateReminderRulePayload } from './reminders.api';
import { quoteTemplatesApi, CreateFromQuotePayload, CreateQuoteFromTemplatePayload } from './quote-templates.api';
import { reportsApi } from './reports.api';
import { importApi, ImportType, PreviewResult, DuplicateAction, ExecuteResult } from './import.api';
import { exportApi, AccountingSettings } from './export.api';
import { dashboardApi, CashflowForecast } from './dashboard.api';
import { http } from './http';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { Quote } from '@/types';
import { Job } from '@/types';

/** Wrap an API call with a temporary company scope if provided */
function withScope<T>(scope: string | undefined, fn: () => Promise<T>): Promise<T> {
  return scope ? http.withCompanyScope(scope, fn) : fn();
}

// ─── Clients ────────────────────────────────────────────────────────────────

export function useClients() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['clients', selectedCompany],
    queryFn: () => clientsApi.list({ limit: 100 }).then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: CreateClientPayload; companyScope?: string }) =>
      withScope(companyScope, () => clientsApi.create(data)),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Client ${c.name} créé`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création client'),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientPayload }) =>
      clientsApi.update(id, data),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['clients', selectedCompany] });
      toast.success(`Client ${c.name} mis à jour`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur mise à jour client'),
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientsApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client archivé');
    },
    onError: (err: any) => toast.error(err.message ?? 'Impossible d\u2019archiver le client'),
  });
}

// ─── Quotes ─────────────────────────────────────────────────────────────────

export function useQuotes() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['quotes', selectedCompany],
    queryFn: () => quotesApi.list({ limit: 100 }).then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useQuoteDetail(id: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: () => quotesApi.get(id!),
    enabled: isAuthenticated && !!id,
    staleTime: 10_000,
  });
}

export function useDuplicateQuote() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: (id: string) => quotesApi.duplicate(id),
    onSuccess: (newQuote) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', selectedCompany] });
      toast.success(`Devis dupliqué : ${newQuote.reference}`);
    },
    onError: (err: any) => {
      toast.error(err.message ?? 'Erreur lors de la duplication');
    },
  });
}

export function useConvertToJob() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: (id: string) => quotesApi.convertToJob(id),
    onSuccess: (job: any) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', selectedCompany] });
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedCompany] });
      toast.success(`Chantier créé : ${job.reference}`);
    },
    onError: (err: any) => {
      toast.error(err.message ?? 'Erreur lors de la conversion');
    },
  });
}

export function useConvertFull() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options: { createWorkshop?: boolean; createPurchases?: boolean } }) =>
      quotesApi.convertFull(id, options),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', selectedCompany] });
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedCompany] });
      queryClient.invalidateQueries({ queryKey: ['workshop', selectedCompany] });
      queryClient.invalidateQueries({ queryKey: ['purchases', selectedCompany] });
      const parts = [`Chantier ${result.job.reference} créé`];
      if (result.workshopItems?.length > 0) parts.push(`${result.workshopItems.length} item(s) atelier`);
      if (result.purchases?.length > 0) parts.push(`${result.purchases.length} commande(s) achat`);
      toast.success(parts.join(' — '));
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur conversion'),
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: CreateQuotePayload; companyScope?: string }) =>
      withScope(companyScope, () => quotesApi.create(data)),
    onSuccess: (q) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(`Devis ${q.reference} créé`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création devis'),
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuotePayload }) =>
      quotesApi.update(id, data),
    onSuccess: (q) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', selectedCompany] });
      queryClient.invalidateQueries({ queryKey: ['quotes', q.id] });
      toast.success('Devis mis à jour');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur mise à jour'),
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Quote['status'] }) =>
      quotesApi.updateStatus(id, status),
    onSuccess: (q) => {
      queryClient.invalidateQueries({ queryKey: ['quotes', selectedCompany] });
      queryClient.invalidateQueries({ queryKey: ['quotes', q.id] });
      toast.success(`Statut → ${q.status}`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur statut'),
  });
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export function useJobs() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['jobs', selectedCompany],
    queryFn: () => jobsApi.list({ limit: 100 }).then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useJobDetail(id: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => jobsApi.get(id!),
    enabled: isAuthenticated && !!id,
    staleTime: 10_000,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: CreateJobPayload; companyScope?: string }) =>
      withScope(companyScope, () => jobsApi.create(data)),
    onSuccess: (j) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(`Chantier ${j.reference} créé`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création chantier'),
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJobPayload }) =>
      jobsApi.update(id, data),
    onSuccess: (j) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedCompany] });
      queryClient.invalidateQueries({ queryKey: ['jobs', j.id] });
      toast.success('Chantier mis à jour');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur mise à jour'),
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Job['status'] }) =>
      jobsApi.updateStatus(id, status),
    onSuccess: (j) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedCompany] });
      queryClient.invalidateQueries({ queryKey: ['jobs', j.id] });
      toast.success(`Statut → ${j.status}`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur statut'),
  });
}

// ─── Job Margin ──────────────────────────────────────────────────────────────

export function useJobMargin(jobId: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['job-margin', jobId],
    queryFn: () => jobsApi.getMargin(jobId!),
    enabled: isAuthenticated && !!jobId,
    staleTime: 60_000,
  });
}

export function useDashboardMargins() {
  const { isAuthenticated, currentUser } = useApp();
  const enabled = isAuthenticated && !!currentUser && ['admin', 'conducteur'].includes(currentUser.role);
  return useQuery({
    queryKey: ['dashboard-margins'],
    queryFn: () => jobsApi.getDashboardMargins(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

// ─── Job Photos ──────────────────────────────────────────────────────────────

export function useJobPhotos(jobId: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['job-photos', jobId],
    queryFn: () => jobsApi.listPhotos(jobId!),
    enabled: isAuthenticated && !!jobId,
    staleTime: 15_000,
  });
}

export function usePresignJobPhoto() {
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: { filename: string; contentType: string } }) =>
      jobsApi.presignPhoto(jobId, data),
    onError: (err: any) => toast.error(err.message ?? 'Erreur presign photo'),
  });
}

export function useCreateJobPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: { storageKey: string; filename: string; contentType: string; sizeBytes: number } }) =>
      jobsApi.createPhoto(jobId, data),
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: ['job-photos', photo.jobId] });
      toast.success('Photo ajoutee');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur creation photo'),
  });
}

export function useDeleteJobPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, photoId }: { jobId: string; photoId: string }) =>
      jobsApi.deletePhoto(jobId, photoId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-photos', variables.jobId] });
      toast.success('Photo supprimee');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur suppression photo'),
  });
}

// ─── Global Search ──────────────────────────────────────────────────────────

export function useSearch(query: string) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchApi.search(query),
    enabled: isAuthenticated && query.length >= 2,
    staleTime: 10_000,
  });
}

// ─── Time Entries ────────────────────────────────────────────────────────────

export function useTimeEntries() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['time-entries', selectedCompany],
    queryFn: () => timeEntriesApi.list({ limit: 100 }).then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: CreateTimeEntryPayload; companyScope?: string }) =>
      withScope(companyScope, () => timeEntriesApi.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Heures enregistrées');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur saisie heures'),
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { date?: string; hours?: number; description?: string } }) =>
      timeEntriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Saisie mise à jour');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur mise à jour saisie'),
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timeEntriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Saisie supprimée');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur suppression saisie'),
  });
}

export function useSubmitTimeEntries() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: (ids: string[]) => timeEntriesApi.submit(ids),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', selectedCompany] });
      toast.success(`${r.submitted} entrée(s) soumise(s)`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur soumission'),
  });
}

export function useApproveTimeEntry() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: (id: string) => timeEntriesApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', selectedCompany] });
      toast.success('Heures approuvées');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur approbation'),
  });
}

export function useApproveBatchTimeEntries() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: (ids: string[]) => timeEntriesApi.approveBatch(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', selectedCompany] });
      toast.success(`${result.approved} entrée(s) approuvée(s)`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur approbation batch'),
  });
}

export function useRejectTimeEntry() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: (id: string) => timeEntriesApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', selectedCompany] });
      toast.success('Heures rejetées');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur rejet'),
  });
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export function usePurchases() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['purchases', selectedCompany],
    queryFn: () => purchasesApi.list({ limit: 100 }).then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function usePurchaseDetail(id: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['purchases', id],
    queryFn: () => purchasesApi.get(id!),
    enabled: isAuthenticated && !!id,
    staleTime: 10_000,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: CreatePurchasePayload; companyScope?: string }) =>
      withScope(companyScope, () => purchasesApi.create(data)),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success(`Commande ${p.reference} créée`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création commande'),
  });
}

export function useMarkOrdered() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: (id: string) => purchasesApi.markOrdered(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', selectedCompany] });
      toast.success('Commande passée');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur passage commande'),
  });
}

export function useMarkReceived() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: (id: string) => purchasesApi.markReceived(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases', selectedCompany] });
      toast.success('Réception enregistrée');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur réception'),
  });
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export function useInvoices() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['invoices', selectedCompany],
    queryFn: () => invoicesApi.list({ limit: 100 }).then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useInvoiceDetail(id: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoicesApi.get(id!),
    enabled: isAuthenticated && !!id,
    staleTime: 10_000,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: CreateInvoicePayload; companyScope?: string }) =>
      withScope(companyScope, () => invoicesApi.create(data)),
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Facture ${inv.reference} créée`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création facture'),
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      invoicesApi.updateStatus(id, status),
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', selectedCompany] });
      queryClient.invalidateQueries({ queryKey: ['invoices', inv.id] });
      toast.success(`Facture → ${inv.status}`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur statut facture'),
  });
}

// ─── Invoice Situations ──────────────────────────────────────────────────────

export function useSituations(invoiceId: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['situations', invoiceId],
    queryFn: () => invoicesApi.getSituations(invoiceId!),
    enabled: isAuthenticated && !!invoiceId,
    staleTime: 10_000,
  });
}

export function useCreateSituation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: CreateSituationPayload }) =>
      invoicesApi.createSituation(invoiceId, data),
    onSuccess: (sit) => {
      queryClient.invalidateQueries({ queryKey: ['situations', sit.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', sit.invoiceId] });
      toast.success(`Situation n°${sit.number} créée`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création situation'),
  });
}

export function useValidateSituation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (situationId: string) => invoicesApi.validateSituation(situationId),
    onSuccess: (sit) => {
      queryClient.invalidateQueries({ queryKey: ['situations', sit.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', sit.invoiceId] });
      toast.success(`Situation n°${sit.number} validée`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur validation situation'),
  });
}

// ─── Workshop ────────────────────────────────────────────────────────────────

export function useWorkshopItems() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['workshop', selectedCompany],
    queryFn: () => workshopApi.list({ limit: 100 }).then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useCreateWorkshopItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: CreateWorkshopItemPayload; companyScope?: string }) =>
      withScope(companyScope, () => workshopApi.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop'] });
      toast.success('Fabrication créée');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création fabrication'),
  });
}

export function useNextStep() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useApp();
  return useMutation({
    mutationFn: (id: string) => workshopApi.nextStep(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop', selectedCompany] });
      toast.success('Étape suivante effectuée');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur avancement'),
  });
}

// ─── Planning Slots ─────────────────────────────────────────────────────────

export function usePlanningSlots(startDate: string, endDate: string) {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['planning-slots', startDate, endDate, selectedCompany],
    queryFn: () => planningApi.list(startDate, endDate),
    enabled: isAuthenticated && !!startDate && !!endDate,
    staleTime: 10_000,
  });
}

export function useCreateSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: CreateSlotPayload; companyScope?: string }) =>
      withScope(companyScope, () => planningApi.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-slots'] });
      toast.success('Créneau planifié');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur planification'),
  });
}

export function useBulkCreateSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: CreateSlotPayload[]; companyScope?: string }) =>
      withScope(companyScope, () => planningApi.bulkCreate(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-slots'] });
      toast.success('Planning mis à jour');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur planification'),
  });
}

export function useDeleteSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => planningApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-slots'] });
      toast.success('Créneau retiré');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur suppression'),
  });
}

// ─── Users ──────────────────────────────────────────────────────────────────

export function useUsers() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['users', selectedCompany],
    queryFn: () => usersApi.list(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserPayload) => usersApi.create(data),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Utilisateur ${u.name} créé`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création utilisateur'),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserPayload }) =>
      usersApi.update(id, data),
    onSuccess: (u) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Utilisateur ${u.name} mis à jour`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur mise à jour utilisateur'),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur désactivé');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur désactivation utilisateur'),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.resetPassword(id, password),
    onSuccess: () => {
      toast.success('Mot de passe réinitialisé');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur réinitialisation mot de passe'),
  });
}

// ─── Teams — error translation ───────────────────────────────────────────────

/**
 * Extracts the most descriptive message from any error shape:
 * ApiError (.message), fetch error, or nested response body.
 */
function extractMsg(err: unknown): { status: number; msg: string } {
  if (err && typeof err === 'object') {
    const e = err as Record<string, any>;
    const status: number = e.status ?? e.statusCode ?? 0;
    const msg: string =
      e.message ??
      e.response?.data?.message ??
      e.response?.message ??
      '';
    return { status, msg };
  }
  return { status: 0, msg: String(err) };
}

function translateTeamError(err: unknown): string {
  const { status, msg } = extractMsg(err);
  if (status === 409 && msg.includes('already an active member'))
    return 'Ce technicien est déjà membre de cette équipe.';
  if (status === 409 && msg.includes('active membership in another team'))
    return "Ce technicien est déjà affecté à une autre équipe. Retirez-le d'abord de son équipe actuelle.";
  if (status === 400 && msg.includes('does not belong'))
    return "Ce technicien n'appartient pas à cette entité.";
  if (status === 404 && msg.includes('User not found'))
    return 'Technicien introuvable.';
  if (status === 400 && msg.includes('deactivated'))
    return 'Ce technicien est désactivé.';
  if (msg) return msg; // already a readable message — show as-is only if no match
  return 'Une erreur est survenue. Veuillez réessayer.';
}

function translateRemoveMemberError(err: unknown): string {
  const { status, msg } = extractMsg(err);
  if (status === 404 && msg.includes('Active member not found'))
    return 'Ce membre est introuvable ou a déjà été retiré.';
  if (status === 404 && msg.includes('Team not found'))
    return 'Équipe introuvable.';
  if (status === 403)
    return 'Opération non autorisée.';
  return 'Erreur lors du retrait du membre. Veuillez réessayer.';
}

// ─── Teams ──────────────────────────────────────────────────────────────────

export function useTeams() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['teams', selectedCompany],
    queryFn: () => teamsApi.list(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: { name: string }; companyScope?: string }) =>
      withScope(companyScope, () => teamsApi.create(data)),
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success(`Équipe "${t.name}" créée`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création équipe'),
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isActive?: boolean } }) =>
      teamsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Équipe mise à jour');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur mise à jour'),
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, data, companyId }: { teamId: string; data: { userId: string; roleInTeam?: string }; companyId?: string }) =>
      teamsApi.addMember(teamId, data, { companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Membre ajouté');
    },
    onError: (err: unknown) => toast.error(translateTeamError(err)),
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId, companyId }: { teamId: string; userId: string; companyId?: string }) =>
      teamsApi.removeMember(teamId, userId, { companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Membre retiré');
    },
    onError: (err: unknown) => toast.error(translateRemoveMemberError(err)),
  });
}

// ─── Team Planning ──────────────────────────────────────────────────────────

export function useTeamPlanning(weekStart: string) {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['team-planning', weekStart, selectedCompany],
    queryFn: () => teamPlanningApi.getWeek(weekStart),
    enabled: isAuthenticated && !!weekStart,
    staleTime: 10_000,
  });
}

export function useCreateTeamSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, companyScope }: { data: CreateTeamSlotPayload; companyScope?: string }) =>
      withScope(companyScope, () => teamPlanningApi.createSlot(data)),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['team-planning'] });
      if (data?.warnings?.length > 0) {
        toast.warning(`Créneau planifié — Attention habilitations :\n${data.warnings.join('\n')}`);
      } else {
        toast.success('Créneau planifié');
      }
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur planification'),
  });
}

export function useDeleteTeamSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamPlanningApi.deleteSlot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-planning'] });
      toast.success('Créneau retiré');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur suppression'),
  });
}

export function useLockWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekStart: string) => teamPlanningApi.lockWeek(weekStart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-planning'] });
      toast.success('Semaine verrouillée');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur verrouillage'),
  });
}

export function useUnlockWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekStart: string) => teamPlanningApi.unlockWeek(weekStart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-planning'] });
      toast.success('Semaine déverrouillée');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur déverrouillage'),
  });
}

export function useSendPlanning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekStart: string) => teamPlanningApi.sendPlanning(weekStart),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['team-planning'] });
      if (result.status === 'simulated') {
        toast.info(`Planning simulé (${result.recipientCount} destinataires — SMTP non configuré)`);
      } else {
        toast.success(`Planning envoyé à ${result.recipientCount} technicien(s)`);
      }
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur envoi planning'),
  });
}

export function useMyPlanning(weekStart: string) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['my-planning', weekStart],
    queryFn: () => teamPlanningApi.getMyPlanning(weekStart),
    enabled: isAuthenticated && !!weekStart,
    staleTime: 10_000,
  });
}

// ─── HR Documents ───────────────────────────────────────────────────────────

export function useHrDocs(userId: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['hr-docs', userId],
    queryFn: () => hrApi.listDocs(userId!),
    enabled: isAuthenticated && !!userId,
    staleTime: 15_000,
  });
}

export function useHrDocPresign() {
  return useMutation({
    mutationFn: (data: { userId: string; type: string; filename: string; contentType: string }) =>
      hrApi.presignUpload(data),
    onError: (err: any) => toast.error(err.message ?? 'Erreur presign upload'),
  });
}

export function useHrDocCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof hrApi.createDoc>[0]) =>
      hrApi.createDoc(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-docs'] });
      toast.success('Document enregistré');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création document'),
  });
}

export function useHrDocDownload() {
  return useMutation({
    mutationFn: (docId: string) => hrApi.downloadDoc(docId),
    onError: (err: any) => toast.error(err.message ?? 'Erreur téléchargement'),
  });
}

export function useHrDocDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => hrApi.deleteDoc(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-docs'] });
      toast.success('Document supprimé');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur suppression document'),
  });
}

export function useUserActivity(userId: string | null, from: string, to: string) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['user-activity', userId, from, to],
    queryFn: () => hrApi.getUserActivity(userId!, from, to),
    enabled: isAuthenticated && !!userId && !!from && !!to,
    staleTime: 30_000,
  });
}

export function useCertificationMatrix() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['certification-matrix', selectedCompany],
    queryFn: () => hrApi.getCertificationMatrix(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

// ─── Activity Logs (by entity) ──────────────────────────────────────────────

export function useActivityLogs(entityType: string, entityId: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['activity-logs', entityType, entityId],
    queryFn: () => activityLogsApi.listByEntity(entityType, entityId!),
    enabled: isAuthenticated && !!entityId,
    staleTime: 15_000,
  });
}

// ─── Attachments (by entity) ────────────────────────────────────────────────

export function useAttachments(entityType: string, entityId: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: () => attachmentsApi.listByEntity(entityType, entityId!),
    enabled: isAuthenticated && !!entityId,
    staleTime: 15_000,
  });
}

// ─── Catalog ───────────────────────────────────────────────────────────────

export function useCatalogCategories() {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['catalog-categories'],
    queryFn: () => catalogApi.listCategories(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useCreateCatalogCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryPayload) => catalogApi.createCategory(data),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
      toast.success(`Catégorie "${c.name}" créée`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création catégorie'),
  });
}

export function useCatalogProducts(search?: string, categoryId?: string) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['catalog-products', search, categoryId],
    queryFn: () => catalogApi.listProducts({ search, categoryId }),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useCreateCatalogProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductPayload) => catalogApi.createProduct(data),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
      toast.success(`Produit "${p.reference}" créé`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur création produit'),
  });
}

export function useUpdateCatalogProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductPayload }) => catalogApi.updateProduct(id, data),
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
      toast.success(`Produit "${p.reference}" mis à jour`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur mise à jour produit'),
  });
}

export function useDeleteCatalogProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
      toast.success('Produit supprimé');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur suppression produit'),
  });
}

export function useImportCatalogCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => catalogApi.importCsv(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-categories'] });
      toast.success(`Import terminé : ${result.imported} produit(s) importé(s), ${result.skipped} ignoré(s)`);
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur import CSV'),
  });
}

// ─── Email ──────────────────────────────────────────────
export function useEmailLogs(entityType: string | null, entityId: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['email-logs', entityType, entityId],
    queryFn: () => emailApi.getLogs(entityType!, entityId!),
    enabled: isAuthenticated && !!entityType && !!entityId,
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendEmailPayload) => emailApi.send(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-logs', variables.entityType, variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs', variables.entityType, variables.entityId] });
      toast.success('Email envoyé avec succès');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur envoi email'),
  });
}

// ─── Amendments ─────────────────────────────────────────
export function useAmendments(quoteId: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['amendments', quoteId],
    queryFn: () => amendmentsApi.getByQuote(quoteId!),
    enabled: isAuthenticated && !!quoteId,
  });
}

export function useCreateAmendment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: string; data: CreateAmendmentPayload }) =>
      amendmentsApi.create(quoteId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['amendments', variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs', 'quote', variables.quoteId] });
      toast.success('Avenant créé');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur création avenant'),
  });
}

export function useUpdateAmendment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAmendmentPayload> }) =>
      amendmentsApi.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['amendments', result.quoteId] });
      toast.success('Avenant mis à jour');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur mise à jour'),
  });
}

export function useUpdateAmendmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      amendmentsApi.updateStatus(id, status),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['amendments', result.quoteId] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs', 'quote', result.quoteId] });
      toast.success('Statut avenant mis à jour');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur statut'),
  });
}

export function useDeleteAmendment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => amendmentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amendments'] });
      toast.success('Avenant supprimé');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur suppression'),
  });
}

// ─── Absences ─────────────────────────────────────────────
export function useAbsences(status?: string) {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['absences', selectedCompany, status],
    queryFn: () => absencesApi.getAll(status),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useAbsenceTypes() {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['absence-types'],
    queryFn: () => absencesApi.getTypes(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useCreateAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAbsencePayload) => absencesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success('Demande d\'absence créée');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur création absence'),
  });
}

export function useApproveAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => absencesApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success('Absence approuvée');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur approbation'),
  });
}

export function useRejectAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => absencesApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success('Absence refusée');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur refus'),
  });
}

export function useDeleteAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => absencesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      toast.success('Absence supprimée');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur suppression'),
  });
}

export function useCreateAbsenceType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: string) => absencesApi.createType(label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence-types'] });
      toast.success('Type d\'absence créé');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur création type'),
  });
}

// ─── Reminders ────────────────────────────────────────────
export function useReminderRules() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['reminder-rules', selectedCompany],
    queryFn: () => remindersApi.getRules(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useReminderLogs(invoiceId: string | null) {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['reminder-logs', invoiceId],
    queryFn: () => remindersApi.getLogsByInvoice(invoiceId!),
    enabled: isAuthenticated && !!invoiceId,
    staleTime: 30_000,
  });
}

export function useCreateReminderRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReminderRulePayload) => remindersApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-rules'] });
      toast.success('Règle de relance créée');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur création règle'),
  });
}

export function useUpdateReminderRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateReminderRulePayload> }) =>
      remindersApi.updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-rules'] });
      toast.success('Règle mise à jour');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur mise à jour règle'),
  });
}

export function useDeleteReminderRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => remindersApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-rules'] });
      toast.success('Règle supprimée');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur suppression règle'),
  });
}

export function useRunReminders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => remindersApi.runManual(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reminder-logs'] });
      const totalSent = data.results.reduce((s, r) => s + r.sent, 0);
      toast.success(`Relances traitées : ${totalSent} envoyée(s)`);
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur traitement relances'),
  });
}

// ─── Quote Templates ──────────────────────────────────────
export function useQuoteTemplates() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['quote-templates', selectedCompany],
    queryFn: () => quoteTemplatesApi.getAll(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useCreateQuoteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFromQuotePayload) => quoteTemplatesApi.createFromQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
      toast.success('Modèle créé');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur création modèle'),
  });
}

export function useCreateQuoteFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: CreateQuoteFromTemplatePayload }) =>
      quoteTemplatesApi.createQuoteFromTemplate(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
      toast.success('Devis créé depuis le modèle');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur création devis'),
  });
}

export function useDeleteQuoteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quoteTemplatesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-templates'] });
      toast.success('Modèle supprimé');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Erreur suppression modèle'),
  });
}

// ─── Reports ──────────────────────────────────────────────
export function useHoursReport(weekOf: string, groupBy: 'user' | 'job') {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['hours-report', selectedCompany, weekOf, groupBy],
    queryFn: () => reportsApi.getHoursReport(weekOf, groupBy),
    enabled: isAuthenticated && !!weekOf,
    staleTime: 30_000,
  });
}

// ─── Import ───────────────────────────────────────────────
export function useImportPreview() {
  return useMutation({
    mutationFn: ({ file, type }: { file: File; type: ImportType }) =>
      importApi.preview(file, type),
    onError: (err: any) => toast.error(err.message ?? 'Erreur analyse CSV'),
  });
}

export function useImportExecute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      type, fileKey, checksum, duplicateActions,
    }: {
      type: ImportType;
      fileKey: string;
      checksum: string;
      duplicateActions: DuplicateAction[];
    }) => importApi.execute(type, fileKey, checksum, duplicateActions),
    onSuccess: (result, { type }) => {
      // Invalidate related queries
      const keyMap: Record<ImportType, string[]> = {
        clients: ['clients'],
        suppliers: ['suppliers'],
        jobs: ['jobs'],
        invoices: ['invoices'],
      };
      keyMap[type].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
      toast.success(
        `Import terminé : ${result.imported} importé(s), ${result.merged} fusionné(s), ${result.skipped} ignoré(s)`,
      );
    },
    onError: (err: any) => toast.error(err.message ?? "Erreur d'import"),
  });
}

// ─── Accounting Settings ────────────────────────────────────────────────────

export function useAccountingSettings() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['accounting-settings', selectedCompany],
    queryFn: () => exportApi.getSettings(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useUpdateAccountingSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AccountingSettings>) => exportApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-settings'] });
      toast.success('Paramètres comptables mis à jour');
    },
    onError: (err: any) => toast.error(err.message ?? 'Erreur mise à jour paramètres'),
  });
}

// ─── Dashboard Cashflow ─────────────────────────────────────────────────────

export function useCashflow(horizon = 90) {
  const { isAuthenticated, currentUser, selectedCompany } = useApp();
  const canView = ['admin', 'conducteur', 'comptable'].includes(currentUser?.role ?? '');
  return useQuery({
    queryKey: ['cashflow', selectedCompany, horizon],
    queryFn: () => dashboardApi.getCashflow(horizon),
    enabled: isAuthenticated && canView,
    staleTime: 5 * 60_000,
  });
}

// ─── AI ────────────────────────────────────────────────────────────────────

import { aiApi } from './ai.api';

export function useAiStatus() {
  const { isAuthenticated } = useApp();
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: () => aiApi.status(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

export function useDailyBriefing() {
  const { isAuthenticated, selectedCompany } = useApp();
  return useQuery({
    queryKey: ['ai', 'briefing', selectedCompany],
    queryFn: () => aiApi.getDailyBriefing(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

export function useExtractQuoteLines() {
  return useMutation({
    mutationFn: (description: string) => aiApi.extractQuoteLines(description),
    onError: (err: any) => toast.error(err.message ?? 'Extraction impossible'),
  });
}

export function useDraftReminder() {
  return useMutation({
    mutationFn: (invoiceId: string) => aiApi.draftReminder(invoiceId),
    onError: (err: any) => toast.error(err.message ?? 'Brouillon impossible'),
  });
}

export function useAiChat() {
  return useMutation({
    mutationFn: ({ message, history }: { message: string; history?: { role: 'user' | 'assistant'; content: string }[] }) =>
      aiApi.chat(message, history ?? []),
    onError: (err: any) => toast.error(err.message ?? 'Assistant indisponible'),
  });
}
