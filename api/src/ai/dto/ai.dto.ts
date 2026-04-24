import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsIn, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ExtractQuoteLinesDto {
  @IsString()
  @IsNotEmpty()
  description: string;
}

export class DraftReminderDto {
  @IsString()
  @IsNotEmpty()
  invoiceId: string;
}

export class DailyBriefingDto {}

// ─── WOW 1 : Dimensionnement auto ─────────────────────────────────────────────

export class SizingDto {
  @IsNumber()
  surface: number; // m² habitable

  @IsNumber()
  anneeConstruction: number; // ex: 1985

  @IsString()
  @IsNotEmpty()
  departement: string; // ex: "78" (Yvelines)

  @IsEnum(['radiateurs_fonte', 'radiateurs_acier', 'radiateurs_alu', 'plancher_chauffant', 'ventilo_convecteurs', 'mixte'])
  typeEmetteurs: string;

  @IsEnum(['fioul', 'gaz', 'electrique', 'autre'])
  chauffageExistant: string;

  @IsEnum(['renovation', 'neuf'])
  typeProjet: string;

  @IsOptional()
  @IsEnum(['oui', 'non'])
  ecsIntegree?: string; // besoin ECS via PAC

  @IsOptional()
  @IsNumber()
  nombrePersonnes?: number; // pour ECS

  @IsOptional()
  @IsString()
  observations?: string; // infos complémentaires
}

export interface SizingRecommendation {
  gamme: string;
  puissancekW: number;
  referenceGroupe: string;
  referenceModule: string;
  justification: string;
  alternativeGroupe?: string;
  zoneClimatique: string;
  temperatureBase: number;
  deperditionsEstimees: number;
}

export interface SizingResponse {
  recommendation: SizingRecommendation;
  quoteLines: Array<{
    reference: string;
    designation: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    vatRate: number;
  }>;
  quoteSubject: string;
  estimatedTotal: number;
  maPrimeRenovEstimate?: string;
}

// ─── WOW 2 : Rapport vocal terrain ────────────────────────────────────────────

export class VoiceReportDto {
  @IsString()
  @IsNotEmpty()
  transcript: string; // texte transcrit (ou saisi) par le technicien

  @IsString()
  @IsNotEmpty()
  jobId: string; // chantier concerné

  @IsOptional()
  @IsString()
  date?: string; // date d'intervention (ISO), default = aujourd'hui
}

export interface VoiceReportResult {
  reportText: string;        // compte-rendu d'intervention rédigé
  hoursWorked: number;       // heures pointées détectées
  progressPercent?: number;  // nouvel avancement estimé
  productsUsed: string[];    // références produits mentionnées
  observations: string;      // points d'attention / anomalies
  nextSteps: string;         // prochaines étapes suggérées
  timeEntryDescription: string; // description pour le pointage
}

// ─── WOW 3 : Alertes proactives ───────────────────────────────────────────────

export interface ProactiveAlert {
  type: 'maintenance_due' | 'quote_followup' | 'budget_overrun' | 'overdue_invoice' | 'upcoming_job';
  priority: 'critical' | 'high' | 'medium';
  title: string;
  detail: string;
  draftMessage?: string; // email/SMS pré-rédigé
  clientName?: string;
  clientEmail?: string;
  relatedId?: string;   // id du devis/chantier/facture/client
  relatedType?: string;
  daysOverdue?: number;
  amount?: number;
}

export interface ProactiveAlertsResponse {
  alerts: ProactiveAlert[];
  summary: string;
  generatedAt: string;
}

// ─── Réponses communes ────────────────────────────────────────────────────────

export interface QuoteLineAI {
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface ExtractQuoteLinesResponse {
  subject: string;
  lines: QuoteLineAI[];
  confidence: 'high' | 'medium' | 'low';
  rawDescription: string;
}

export interface DraftReminderResponse {
  subject: string;
  body: string;
  tone: 'courteous' | 'firm' | 'urgent';
  level: number;
}

export interface BriefingAction {
  priority: 'critical' | 'high' | 'medium';
  category: string;
  action: string;
  detail: string;
  link?: string;
}

export interface DailyBriefingResponse {
  summary: string;
  actions: BriefingAction[];
  generatedAt: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export class ChatMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @IsOptional()
  history?: ChatMessageDto[];
}

export interface ChatSource {
  type: 'quote' | 'invoice' | 'job' | 'client' | 'document' | 'purchase';
  id: string;
  label: string;
  link: string;
}

export interface ChatResponse {
  message: string;
  sources?: ChatSource[];
  mode?: 'rag' | 'standard';
}
