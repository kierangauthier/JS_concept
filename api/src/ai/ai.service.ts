import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import {
  ExtractQuoteLinesDto, ExtractQuoteLinesResponse,
  DraftReminderDto, DraftReminderResponse,
  DailyBriefingResponse, BriefingAction,
  ChatDto, ChatResponse, ChatSource,
  SizingDto, SizingResponse,
  VoiceReportDto, VoiceReportResult,
  ProactiveAlertsResponse, ProactiveAlert,
} from './dto/ai.dto';

// Mots-clés déclenchant le mode RAG (base documentaire technique)
const RAG_KEYWORDS = /code.?erreur|erreur\s+[A-Z]\d|défaut|dépannage|diagnostic|maintenance|entretien|fluide|r32|r410|f-?gas|habilitation|mise.?en.?service|mes\b|pression|débit|sonde|capteur|compresseur|détendeur|vanne|circulateur|pompe|dégivrage|cop\s|scop|kw\s|puissance|dimensionnement|dtu|ecodan|zubadan|puz-|suz-|puhz-|erst|ersf|ersd|erpx|notice|manuel|guide|installation|schéma|raccordement|frigorifique|hydraulique|électrique|câblage|résistance|appoint|réglementation|norme|r290|hyper.?heating|heat.?pump/i;

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly model = 'claude-haiku-4-5-20251001';

  constructor(
    private prisma: PrismaService,
    private knowledge: KnowledgeService,
  ) {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[AiService] ANTHROPIC_API_KEY non configurée — les features IA seront désactivées');
    }
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  // ─── Helper : appel API Anthropic ────────────────────────────────────────

  private async callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException('Service IA non configuré (ANTHROPIC_API_KEY manquante)');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[AiService] Erreur API Anthropic:', response.status, err);
      throw new InternalServerErrorException(`Anthropic ${response.status}: ${err.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  private parseJson<T>(raw: string): T {
    // Extrait le bloc JSON même si le modèle ajoute du texte autour
    const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
    if (!match) throw new InternalServerErrorException('Réponse IA non parseable');
    try {
      return JSON.parse(match[1]);
    } catch {
      throw new InternalServerErrorException('JSON IA invalide');
    }
  }

  // ─── Feature 1 : Extraction de lignes de devis ───────────────────────────

  async extractQuoteLines(
    dto: ExtractQuoteLinesDto,
    companyId: string,
  ): Promise<ExtractQuoteLinesResponse> {
    // Récupère les produits du catalogue pour aider l'IA
    const catalogProducts = await this.prisma.catalogProduct.findMany({
      where: { companyId, isActive: true },
      select: { designation: true, unit: true, salePrice: true },
      take: 50,
    });

    const catalogContext = catalogProducts.length > 0
      ? `Catalogue produits disponible :\n${catalogProducts.map(p => `- ${p.designation} (unité: ${p.unit}, prix: ${p.salePrice}€)`).join('\n')}`
      : 'Pas de catalogue disponible — utilise des désignations et prix standards BTP.';

    const system = `Tu es un assistant expert en chiffrage BTP pour des PME de signalisation et aménagement urbain.
Tu extrais des lignes de devis structurées depuis une description de chantier (texte libre ou note vocale retranscrite).

${catalogContext}

RÈGLES :
- Retourne UNIQUEMENT du JSON valide, sans texte avant ni après
- Utilise les unités standard BTP : u, m, m², m³, ml, forfait, h, jour
- Les taux TVA BTP standards : 20% (fournitures), 10% (travaux sur existant), 20% par défaut
- Si une info manque, fais une estimation raisonnable et indique confidence: "low" ou "medium"
- unitPrice en euros HT, quantités en décimales

FORMAT JSON ATTENDU :
{
  "subject": "Titre court du chantier",
  "lines": [
    {
      "designation": "Description précise de la prestation",
      "unit": "u",
      "quantity": 1,
      "unitPrice": 150,
      "vatRate": 20
    }
  ],
  "confidence": "high|medium|low"
}`;

    const raw = await this.callClaude(system, `Chantier à chiffrer :\n\n${dto.description}`);
    const parsed = this.parseJson<Omit<ExtractQuoteLinesResponse, 'rawDescription'>>(raw);

    return {
      ...parsed,
      rawDescription: dto.description,
    };
  }

  // ─── Feature 2 : Rédaction de relance intelligente ───────────────────────

  async draftReminder(
    dto: DraftReminderDto,
    companyId: string,
  ): Promise<DraftReminderResponse> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, companyId },
      include: {
        client: { select: { name: true, contact: true, email: true } },
        reminderLogs: {
          include: { rule: { select: { level: true, delayDays: true } } },
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Facture introuvable');

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    const daysOverdue = Math.floor(
      (Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    const previousReminders = invoice.reminderLogs.length;
    const level = previousReminders + 1;
    const tone = level === 1 ? 'courteous' : level === 2 ? 'firm' : 'urgent';

    const system = `Tu es un assistant commercial pour une PME BTP française.
Tu rédiges des relances de paiement professionnelles, en français, adaptées au contexte.

RÈGLES :
- Ton 1ère relance : courtois, rappel simple, ton chaleureux
- Ton 2ème relance : ferme, rappel des obligations légales (pénalités de retard)
- Ton 3ème relance et + : urgent, mention des recours possibles
- Ne jamais être agressif ou menaçant de manière disproportionnée
- Mentionner le numéro de facture, le montant et la date d'échéance
- Signer au nom de l'entreprise (pas d'un individu spécifique)
- Retourne UNIQUEMENT du JSON valide

FORMAT JSON ATTENDU :
{
  "subject": "Objet de l'email",
  "body": "Corps du message complet (peut contenir des \\n pour les sauts de ligne)",
  "tone": "courteous|firm|urgent",
  "level": ${level}
}`;

    const userPrompt = `Rédige une relance de niveau ${level} pour :
- Client : ${invoice.client?.name ?? 'Client inconnu'}${invoice.client?.contact ? ` (${invoice.client.contact})` : ''}
- Référence facture : ${invoice.reference}
- Montant TTC : ${Number(invoice.amount).toLocaleString('fr-FR')} €
- Date d'échéance : ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
- Retard actuel : ${daysOverdue} jour(s)
- Relances précédentes : ${previousReminders}
- Expéditeur : ${company?.name || 'Notre société'}`;

    const raw = await this.callClaude(system, userPrompt);
    return this.parseJson<DraftReminderResponse>(raw);
  }

  // ─── Feature 3 : Briefing quotidien ──────────────────────────────────────

  async getDailyBriefing(companyId: string): Promise<DailyBriefingResponse> {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Collecte toutes les données pertinentes en parallèle
    const [overdueInvoices, expiringQuotes, activeJobs, pendingPurchases] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { companyId, status: 'overdue', deletedAt: null },
        include: { client: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      this.prisma.quote.findMany({
        where: {
          companyId,
          status: 'sent',
          validUntil: { lte: in7days },
          deletedAt: null,
        },
        include: { client: { select: { name: true } } },
        take: 10,
      }),
      this.prisma.job.findMany({
        where: { companyId, status: 'in_progress', deletedAt: null },
        select: { reference: true, title: true, clientId: true },
        take: 10,
      }),
      this.prisma.purchaseOrder.findMany({
        where: { companyId, status: 'ordered', deletedAt: null },
        include: { supplier: { select: { name: true } } },
        take: 5,
      }),
    ]);

    const context = `
FACTURES EN RETARD (${overdueInvoices.length}) :
${overdueInvoices.map(i => `- ${i.reference} | ${i.client?.name ?? 'Client inconnu'} | ${Number(i.amount).toLocaleString('fr-FR')} € | Échue le ${new Date(i.dueDate).toLocaleDateString('fr-FR')}`).join('\n') || 'Aucune'}

DEVIS EXPIRANT DANS 7 JOURS (${expiringQuotes.length}) :
${expiringQuotes.map(q => `- ${q.reference} | ${q.client?.name ?? 'Client inconnu'} | ${Number(q.amount).toLocaleString('fr-FR')} € | Expire le ${new Date(q.validUntil).toLocaleDateString('fr-FR')}`).join('\n') || 'Aucun'}

CHANTIERS EN COURS (${activeJobs.length}) :
${activeJobs.map(j => `- ${j.reference} | ${j.title}`).join('\n') || 'Aucun'}

COMMANDES EN ATTENTE DE RÉCEPTION (${pendingPurchases.length}) :
${pendingPurchases.map(p => `- ${p.reference} | ${p.supplier.name} | ${Number(p.amount).toLocaleString('fr-FR')} €`).join('\n') || 'Aucune'}
`;

    const system = `Tu es un assistant opérationnel pour une PME BTP française.
Tu analyses l'état de l'entreprise et génères un briefing concis des priorités du jour.

RÈGLES :
- Maximum 5 actions, triées par priorité décroissante
- Langage direct, professionnel, orienté action
- Chaque action doit être concrète et actionnable immédiatement
- Retourne UNIQUEMENT du JSON valide

CATÉGORIES POSSIBLES : "Recouvrement", "Commercial", "Chantier", "Achats", "Administratif"

FORMAT JSON ATTENDU :
{
  "summary": "Une phrase résumant la situation globale du jour",
  "actions": [
    {
      "priority": "critical|high|medium",
      "category": "Recouvrement",
      "action": "Action courte et directe",
      "detail": "Contexte et détail utile pour agir"
    }
  ]
}`;

    const raw = await this.callClaude(system, `Voici la situation de l'entreprise aujourd'hui :\n${context}`);
    const parsed = this.parseJson<Omit<DailyBriefingResponse, 'generatedAt'>>(raw);

    return {
      ...parsed,
      generatedAt: now.toISOString(),
    };
  }

  // ─── Feature 4 : Chat assistant contextuel + RAG technique ──────────────

  async chat(dto: ChatDto, companyId: string, userName: string): Promise<ChatResponse> {
    const msg = dto.message.toLowerCase();
    const sources: ChatSource[] = [];
    const isRagQuery = RAG_KEYWORDS.test(dto.message);

    // ── Mode RAG : question technique → recherche dans la base documentaire ─
    if (isRagQuery) {
      const [knowledgeChunks, catalogProducts] = await Promise.all([
        this.knowledge.search(dto.message, companyId, 6).then(results =>
          results.length > 0 ? results : this.knowledge.searchFallback(dto.message, companyId, 4)
        ),
        this.prisma.catalogProduct.findMany({
          where: { companyId, isActive: true },
          select: { reference: true, designation: true, salePrice: true, unit: true },
          take: 30,
        }),
      ]);

      if (knowledgeChunks.length > 0) {
        const docsContext = knowledgeChunks
          .map((c, i) => `[Source ${i + 1} — ${c.source}${c.page ? `, p.${c.page}` : ''}]\n${c.content}`)
          .join('\n\n---\n\n');

        const catalogContext = catalogProducts.length > 0
          ? `\n\nCATALOGUE PRODUITS :\n${catalogProducts.map(p => `- ${p.reference} | ${p.designation} | ${p.salePrice}€ HT`).join('\n')}`
          : '';

        const ragSystem = `Tu es l'assistant technique documentaire de ConceptManager.
Tu réponds aux questions des techniciens à partir de la base documentaire de l'entreprise.

RÈGLE ABSOLUE : Tu ne peux répondre QU'EN UTILISANT les documents fournis ci-dessous.
- Si la réponse est dans les documents → réponds précisément en citant la source entre crochets [Source N]
- Si la réponse n'est PAS dans les documents → réponds UNIQUEMENT : "Je n'ai pas cette information dans ma base documentaire. Consulte la documentation technique correspondante ou contacte le support."
- N'invente JAMAIS une valeur technique, un code, une procédure ou une mesure
- Sois concis et direct — les techniciens sont sur le terrain
- Utilise des listes à puces pour les procédures étape par étape${catalogContext}

DOCUMENTS TECHNIQUES DISPONIBLES :
${docsContext}`;

        const history = dto.history ?? [];
        const messages = [
          ...history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user' as const, content: dto.message },
        ];

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 1024,
            system: ragSystem,
            messages,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          throw new InternalServerErrorException(`Anthropic ${response.status}: ${err.substring(0, 300)}`);
        }

        const data = await response.json();
        const reply = data.content[0].text;

        const ragSources: ChatSource[] = knowledgeChunks.map(c => ({
          type: 'document' as const,
          id: c.id,
          label: `${c.source}${c.page ? ` — p.${c.page}` : ''}`,
          link: `/knowledge`,
        }));

        return { message: reply, sources: ragSources, mode: 'rag' };
      }
    }

    // ── Détection d'intention et chargement du contexte pertinent ──────────
    const [quotes, invoices, jobs, clients, attachments, purchases] = await Promise.all([
      // Devis — si la question parle de devis/chiffrage/offre
      msg.match(/devis|devis|chiffr|offre|quotat/) ?
        this.prisma.quote.findMany({
          where: { companyId, deletedAt: null },
          select: { id: true, reference: true, subject: true, status: true, amount: true, client: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }, take: 20,
        }) : Promise.resolve([]),

      // Factures — si la question parle de facture/paiement/retard/CA
      msg.match(/factur|paiement|impay|retard|encaiss|ca |chiffre d.affaire/) ?
        this.prisma.invoice.findMany({
          where: { companyId, deletedAt: null },
          select: { id: true, reference: true, status: true, amount: true, dueDate: true, client: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }, take: 20,
        }) : Promise.resolve([]),

      // Chantiers — si la question parle de chantier/intervention/travaux
      msg.match(/chantier|intervention|travaux|job|chantier|planning|planning/) ?
        this.prisma.job.findMany({
          where: { companyId, deletedAt: null },
          select: { id: true, reference: true, title: true, status: true, address: true, startDate: true },
          orderBy: { createdAt: 'desc' }, take: 20,
        }) : Promise.resolve([]),

      // Clients — si la question parle de client/contact/mairie
      msg.match(/client|contact|mairie|entreprise|soci\u00e9t\u00e9|fournisseur/) ?
        this.prisma.client.findMany({
          where: { companyId, deletedAt: null },
          select: { id: true, name: true, email: true, phone: true, city: true, type: true },
          orderBy: { name: 'asc' }, take: 20,
        }) : Promise.resolve([]),

      // Documents GED — si la question parle de document/fichier/photo/PJ
      msg.match(/document|fichier|photo|pi\u00e8ce jointe|pj|ged|pdf|bl |bon de livraison|bc |bon de commande/) ?
        this.prisma.attachment.findMany({
          where: {
            OR: [
              { quote: { companyId } },
              { job: { companyId } },
              { invoice: { companyId } },
              { purchase: { companyId } },
            ],
          },
          select: {
            id: true, name: true, mimeType: true, createdAt: true,
            quoteId: true, jobId: true, invoiceId: true, purchaseId: true,
          },
          orderBy: { createdAt: 'desc' }, take: 30,
        }) : Promise.resolve([]),

      // Achats — si la question parle d'achat/commande/fournisseur
      msg.match(/achat|commande|fournisseur|livraison|r\u00e9ception/) ?
        this.prisma.purchaseOrder.findMany({
          where: { companyId, deletedAt: null },
          select: { id: true, reference: true, status: true, amount: true, supplier: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }, take: 15,
        }) : Promise.resolve([]),
    ]);

    // ── Construction du contexte pour le LLM ─────────────────────────────
    const contextParts: string[] = [];

    if (quotes.length > 0) {
      contextParts.push(`DEVIS (${quotes.length}) :\n${quotes.map((q: any) =>
        `- ${q.reference} | ${q.subject} | Client: ${q.client?.name ?? '?'} | Statut: ${q.status} | Montant: ${Number(q.amount).toLocaleString('fr-FR')} €`
      ).join('\n')}`);
      quotes.forEach((q: any) => sources.push({ type: 'quote', id: q.id, label: `${q.reference} — ${q.subject}`, link: `/quotes` }));
    }

    if (invoices.length > 0) {
      contextParts.push(`FACTURES (${invoices.length}) :\n${invoices.map((i: any) =>
        `- ${i.reference} | Client: ${i.client?.name ?? '?'} | Statut: ${i.status} | Montant: ${Number(i.amount).toLocaleString('fr-FR')} € | Échéance: ${i.dueDate ? new Date(i.dueDate).toLocaleDateString('fr-FR') : 'N/A'}`
      ).join('\n')}`);
      invoices.forEach((i: any) => sources.push({ type: 'invoice', id: i.id, label: `${i.reference} — ${i.client?.name ?? '?'}`, link: `/invoicing` }));
    }

    if (jobs.length > 0) {
      contextParts.push(`CHANTIERS (${jobs.length}) :\n${jobs.map((j: any) =>
        `- ${j.reference} | ${j.title} | Statut: ${j.status} | Adresse: ${j.address}`
      ).join('\n')}`);
      jobs.forEach((j: any) => sources.push({ type: 'job', id: j.id, label: `${j.reference} — ${j.title}`, link: `/jobs` }));
    }

    if (clients.length > 0) {
      contextParts.push(`CLIENTS (${clients.length}) :\n${clients.map((c: any) =>
        `- ${c.name} | ${c.type} | ${c.city ?? ''} | ${c.email ?? ''} | ${c.phone ?? ''}`
      ).join('\n')}`);
      clients.forEach((c: any) => sources.push({ type: 'client', id: c.id, label: c.name, link: `/clients` }));
    }

    if (attachments.length > 0) {
      contextParts.push(`DOCUMENTS GED (${attachments.length}) :\n${attachments.map((a: any) => {
        const linkedTo = a.quoteId ? `devis` : a.jobId ? `chantier` : a.invoiceId ? `facture` : `achat`;
        return `- ${a.name} | Lié à: ${linkedTo} | Ajouté le: ${new Date(a.createdAt).toLocaleDateString('fr-FR')}`;
      }).join('\n')}`);
      attachments.forEach((a: any) => sources.push({ type: 'document', id: a.id, label: a.name, link: `/jobs` }));
    }

    if (purchases.length > 0) {
      contextParts.push(`ACHATS (${purchases.length}) :\n${purchases.map((p: any) =>
        `- ${p.reference} | Fournisseur: ${p.supplier?.name ?? '?'} | Statut: ${p.status} | Montant: ${Number(p.amount).toLocaleString('fr-FR')} €`
      ).join('\n')}`);
      purchases.forEach((p: any) => sources.push({ type: 'purchase', id: p.id, label: `${p.reference} — ${p.supplier?.name ?? '?'}`, link: `/purchases` }));
    }

    const dataContext = contextParts.length > 0
      ? contextParts.join('\n\n')
      : 'Aucune donnée spécifique trouvée pour cette question.';

    // ── Prompt système ────────────────────────────────────────────────────
    const system = `Tu es l'assistant IA de ConceptManager, l'outil de gestion de chantiers et de facturation.
Tu aides ${userName} à naviguer dans l'outil, retrouver des données métier, analyser les chantiers et rédiger des contenus professionnels.

FONCTIONNALITÉS DE L'OUTIL :
- Dashboard : vue d'ensemble, alertes, KPIs, chantiers en cours, factures impayées
- Clients : gestion des clients (collectivités, entreprises, particuliers)
- Devis : création, suivi, conversion en chantier. Bouton "Générer avec l'IA" disponible
- Chantiers : planning, équipes, pointages, bons de commande, atelier
- Planning : vue calendrier des interventions par équipe
- Catalogue : produits et tarifs
- Facturation : factures, situations, relances automatiques
- Assistant technique : pose une question technique → je cherche dans la base documentaire
- Rapports : analyses et statistiques

RÈGLES DE RÉPONSE :
- Réponds TOUJOURS en français
- Sois concis et direct — 2 à 5 phrases maximum sauf si on te demande un texte long
- Si tu trouves des données pertinentes dans le contexte, cite les références exactes
- Pour guider la navigation, indique le nom du menu en gras
- N'invente jamais de données — base-toi uniquement sur le contexte fourni
- Pour les questions techniques (normes, procédures…), dis à ${userName} de poser la question directement pour accéder à la base documentaire

DONNÉES DISPONIBLES POUR CETTE QUESTION :
${dataContext}`;

    // ── Historique de conversation ────────────────────────────────────────
    const history = dto.history ?? [];
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user' as const, content: dto.message },
    ];

    // Appel direct avec historique
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[AiService] Chat error:', response.status, err);
      throw new InternalServerErrorException(`Anthropic ${response.status}: ${err.substring(0, 300)}`);
    }

    const data = await response.json();
    const reply = data.content[0].text;

    // Filtrer les sources vraiment pertinentes (max 5)
    const relevantSources = sources.slice(0, 5);

    return { message: reply, sources: relevantSources.length > 0 ? relevantSources : undefined };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  WOW 1 — DIMENSIONNEMENT AUTO → DEVIS EN UN CLIC
  //  (module désactivé — non exposé dans la navigation courante)
  // ══════════════════════════════════════════════════════════════════════════

  async autoSizeAndQuote(
    dto: SizingDto,
    companyId: string,
  ): Promise<SizingResponse> {

    // Récupère le catalogue pour que l'IA génère des lignes cohérentes
    const products = await this.prisma.catalogProduct.findMany({
      where: { companyId, isActive: true },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { salePrice: 'asc' }],
    });

    const catalogStr = products.map(p =>
      `${p.reference} | ${p.designation} | ${p.salePrice}€ vente / ${p.costPrice}€ achat | ${p.unit} | ${p.category?.name ?? ''}`
    ).join('\n');

    const system = `Tu es un expert en chiffrage pour une entreprise du BTP.
À partir du catalogue ci-dessous, génère un devis structuré en JSON.

CATALOGUE DISPONIBLE :
${catalogStr}

Retourne UNIQUEMENT du JSON valide respectant ce schéma :
{
  "recommendation": {
    "gamme": string,
    "puissancekW": 0,
    "referenceGroupe": string,
    "referenceModule": string,
    "justification": string,
    "alternativeGroupe": null,
    "zoneClimatique": "",
    "temperatureBase": 0,
    "deperditionsEstimees": 0
  },
  "quoteLines": [{
    "reference": string,
    "designation": string,
    "unit": string,
    "quantity": number,
    "unitPrice": number,
    "costPrice": number,
    "vatRate": 20
  }],
  "quoteSubject": string,
  "estimatedTotal": number,
  "maPrimeRenovEstimate": ""
}`;

    const userPrompt = `Génère un devis pour la prestation suivante :
${dto.observations ?? 'Prestation standard selon catalogue'}
Surface concernée : ${dto.surface} m²`;

    const raw = await this.callClaude(system, userPrompt);
    return this.parseJson<SizingResponse>(raw);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  WOW 2 — RAPPORT VOCAL TERRAIN → INTERVENTION STRUCTURÉE
  // ══════════════════════════════════════════════════════════════════════════

  async parseVoiceReport(
    dto: VoiceReportDto,
    companyId: string,
  ): Promise<VoiceReportResult> {

    const job = await this.prisma.job.findFirst({
      where: { id: dto.jobId, companyId },
      include: {
        quote: { select: { reference: true, subject: true, client: { select: { name: true } } } },
      },
    });
    if (!job) throw new NotFoundException('Chantier introuvable');

    const system = `Tu es un assistant qui structure les rapports d'intervention terrain de techniciens.
Extrais les informations clés d'un compte-rendu oral ou tapé rapidement par un technicien et retourne du JSON structuré.

RÈGLES :
- Retourne UNIQUEMENT du JSON valide
- hoursWorked : total d'heures travaillées mentionnées (défaut 8 si non précisé)
- progressPercent : avancement estimé en % (0-100), null si non mentionné
- productsUsed : références produits, matériaux ou équipements mentionnés
- observations : anomalies, problèmes, points d'attention (vide si rien à signaler)
- nextSteps : prochaines actions nécessaires
- reportText : compte-rendu d'intervention professionnel rédigé (3-6 phrases)
- timeEntryDescription : description courte pour le pointage (1 phrase max, 80 caractères)

JSON attendu :
{
  "reportText": string,
  "hoursWorked": number,
  "progressPercent": number|null,
  "productsUsed": string[],
  "observations": string,
  "nextSteps": string,
  "timeEntryDescription": string
}`;

    const userPrompt = `Chantier : ${job.title} — Client : ${job.quote?.client?.name ?? '?'}
Avancement actuel : ${job.progress}%
Transcription du technicien : "${dto.transcript}"

Structures ce rapport d'intervention.`;

    const raw = await this.callClaude(system, userPrompt);
    return this.parseJson<VoiceReportResult>(raw);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  WOW 3 — ALERTES PROACTIVES IA
  // ══════════════════════════════════════════════════════════════════════════

  async getProactiveAlerts(companyId: string): Promise<ProactiveAlertsResponse> {
    const now = new Date();
    const alerts: ProactiveAlert[] = [];

    // Récupérer le nom de la société pour personnaliser les emails
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    const companyName = company?.name ?? 'Notre équipe';

    const [invoices, quotes, jobsInProgress] = await Promise.all([
      // Factures impayées
      this.prisma.invoice.findMany({
        where: { companyId, status: 'overdue', deletedAt: null },
        include: { client: { select: { id: true, name: true, email: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      // Devis envoyés sans réponse depuis > 14 jours
      this.prisma.quote.findMany({
        where: { companyId, status: 'sent', deletedAt: null },
        include: { client: { select: { id: true, name: true, email: true } } },
        orderBy: { updatedAt: 'asc' },
      }),
      // Chantiers en cours avec dépassement d'heures
      this.prisma.job.findMany({
        where: { companyId, status: 'in_progress', deletedAt: null },
        include: {
          quote: { select: { amount: true, client: { select: { name: true } } } },
          timeEntries: { select: { hours: true } },
        },
      }),
    ]);

    // ── Factures impayées ─────────────────────────────────────────────────
    for (const inv of invoices) {
      const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue < 1 || !inv.client) continue;
      alerts.push({
        type: 'overdue_invoice',
        priority: daysOverdue > 30 ? 'critical' : 'high',
        title: `Facture impayée — ${inv.client.name} (${Number(inv.amount).toLocaleString('fr-FR')} €)`,
        detail: `${inv.reference} — ${daysOverdue} jours de retard. Échéance : ${new Date(inv.dueDate!).toLocaleDateString('fr-FR')}.`,
        clientName: inv.client.name,
        clientEmail: inv.client.email ?? undefined,
        relatedId: inv.id,
        relatedType: 'invoice',
        daysOverdue,
        amount: Number(inv.amount),
        draftMessage: daysOverdue > 30
          ? `Bonjour,\n\nSauf erreur de notre part, notre facture ${inv.reference} d'un montant de ${Number(inv.amount).toLocaleString('fr-FR')} €, échue depuis ${daysOverdue} jours, n'a pas encore été réglée.\n\nNous vous adressons cette relance ferme et vous demandons de procéder au règlement dans les meilleurs délais, ou de nous contacter si vous souhaitez convenir d'un arrangement.\n\nPassé un délai de 8 jours, nous nous réservons le droit d'engager une procédure de recouvrement.\n\nCordialement,\n${companyName}`
          : `Bonjour,\n\nNous vous rappelons que notre facture ${inv.reference} d'un montant de ${Number(inv.amount).toLocaleString('fr-FR')} € est arrivée à échéance il y a ${daysOverdue} jours.\n\nSauf erreur de notre part, le règlement n'a pas encore été reçu. Pourriez-vous nous confirmer la date de virement ou nous indiquer si vous avez une question sur cette facture ?\n\nMerci de votre retour.\n\nCordialement,\n${companyName}`,
      });
    }

    // ── Devis sans réponse depuis > 14 jours ─────────────────────────────
    for (const q of quotes) {
      const daysSinceUpdate = Math.floor((now.getTime() - q.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate < 14 || !q.client) continue;
      const expired = q.validUntil && new Date(q.validUntil) < now;
      alerts.push({
        type: 'quote_followup',
        priority: daysSinceUpdate > 30 ? 'high' : 'medium',
        title: `Relance devis — ${q.client.name} (${Number(q.amount).toLocaleString('fr-FR')} €)`,
        detail: `${q.reference} — envoyé il y a ${daysSinceUpdate} jours sans réponse.${expired ? ' ⚠️ Devis expiré.' : ''}`,
        clientName: q.client.name,
        clientEmail: q.client.email ?? undefined,
        relatedId: q.id,
        relatedType: 'quote',
        daysOverdue: daysSinceUpdate,
        amount: Number(q.amount),
        draftMessage: `Bonjour,\n\nJe me permets de revenir vers vous concernant notre devis ${q.reference} pour « ${q.subject} », d'un montant de ${Number(q.amount).toLocaleString('fr-FR')} €.\n\nAvez-vous eu l'occasion de l'étudier ? Nous sommes disponibles pour répondre à vos questions ou adapter le projet selon vos besoins.\n\n${expired ? 'Ce devis est arrivé à expiration. Nous pouvons établir un nouveau devis actualisé si vous le souhaitez.\n\n' : ''}Nous restons à votre disposition.\n\nCordialement,\n${companyName}`,
      });
    }

    // ── Chantiers avec dépassement heures > 20% ───────────────────────────
    for (const job of jobsInProgress) {
      if (!job.timeEntries || job.timeEntries.length === 0) continue;
      const totalHours = job.timeEntries.reduce((s: number, t: any) => s + Number(t.hours), 0);
      // Estimation heures depuis montant devis : taux journalier moyen 55€/h
      const estimatedHours = job.quote ? Number(job.quote.amount) / 55 : null;
      if (!estimatedHours || totalHours < estimatedHours * 1.2) continue;
      const overrunPct = Math.round(((totalHours - estimatedHours) / estimatedHours) * 100);
      alerts.push({
        type: 'budget_overrun',
        priority: overrunPct > 40 ? 'critical' : 'high',
        title: `Dépassement budget heures — ${job.quote?.client?.name ?? job.title}`,
        detail: `${totalHours}h pointées vs ~${Math.round(estimatedHours)}h estimées (+${overrunPct}%). Chantier : ${job.title}.`,
        relatedId: job.id,
        relatedType: 'job',
      });
    }

    // Trie par priorité
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const summary = alerts.length === 0
      ? 'Aucune alerte — tout est sous contrôle 👌'
      : `${alerts.filter(a => a.priority === 'critical').length} critique(s) · ${alerts.filter(a => a.priority === 'high').length} important(es) · ${alerts.filter(a => a.priority === 'medium').length} à surveiller`;

    return { alerts, summary, generatedAt: now.toISOString() };
  }
}
