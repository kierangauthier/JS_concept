# SUIVI-DÉVELOPPEMENT — ConceptManager

> Document de référence technique — dernière mise à jour : avril 2026  
> Projet : ConceptManager — outil de gestion chantiers/facturation pour **JS Concept** et **ASP Signalisation**.  
> Un module de démo sectorielle PAC (ThermiPro) a été développé séparément et peut être activé à la demande.

---

## 1. Vue d'ensemble du projet

**ConceptManager** est une application de gestion métier full-stack :
- **Backend** : NestJS + Prisma ORM + PostgreSQL + Docker
- **Frontend** : React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **IA** : Anthropic Claude API (claude-haiku-4-5-20251001)

ConceptManager est développé pour deux vrais clients : **JS Concept** et **ASP Signalisation**, des entreprises spécialisées en signalisation routière et aménagement urbain dans la région lyonnaise.

> **Démo PAC / ThermiPro** : Un module complet (seed + IA spécialisée) a été développé pour démontrer l'outil à des prospects installateurs PAC. Voir section 13 pour le réactiver.

---

## 2. Architecture technique

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                     │
│                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌────────┐  │
│  │  PostgreSQL  │◄──│  NestJS API  │◄──│ React  │  │
│  │  (port 5432) │    │  (port 3000) │    │ (Vite) │  │
│  └─────────────┘    └──────────────┘    └────────┘  │
│         │                  │                        │
│  Prisma ORM           Anthropic API                 │
│  FTS (French)        claude-haiku-4-5-20251001       │
└─────────────────────────────────────────────────────┘
```

**Commandes Docker essentielles :**
```bash
# Rebuild complet après modifications
docker-compose build && docker-compose up -d

# Voir les logs
docker-compose logs -f api

# Reset BDD + reseed
docker-compose exec api npx prisma db push --accept-data-loss
docker-compose exec api npx prisma db seed

# Accéder au shell du container
docker-compose exec api sh
```

---

## 3. Seed ThermiPro — données de démonstration

### Fichiers concernés
- `api/prisma/seed.ts` — point d'entrée, appelle `seedThermiPro` et `seedKnowledgeThermiPro`
- `api/prisma/seed-thermipro.ts` — données métier (~560 lignes)
- `api/prisma/seed-knowledge-thermipro.ts` — base de connaissances RAG (16 chunks)

### Comptes utilisateurs ThermiPro

| ID | Email | Rôle | Nom |
|---|---|---|---|
| `u_tp_admin` | david@thermipro.fr | ADMIN | David Morel |
| `u_tp_cond` | julien@thermipro.fr | CONDUCTOR | Julien Fabre |
| `u_tp_tech01` | thomas.r@thermipro.fr | WORKER | Thomas Rousseau |
| `u_tp_tech02` | alexandre.m@thermipro.fr | WORKER | Alexandre Martin |
| `u_tp_tech03` | nicolas.b@thermipro.fr | WORKER | Nicolas Bernard |
| `u_tp_tech04` | pierre.d@thermipro.fr | WORKER | Pierre Durand |
| `u_tp_tech05` | emma.l@thermipro.fr | WORKER | Emma Laurent |
| `u_tp_tech06` | lucas.g@thermipro.fr | WORKER | Lucas Garnier |

**Mot de passe universel (seed)** : `Password123!` (hashé via bcrypt dans la seed)

### Équipes
- `tm_tp_a` — Équipe A Nord IDF (Thomas + Alexandre + Nicolas)
- `tm_tp_b` — Équipe B Sud IDF (Pierre + Emma + Lucas)

### Volume de données
| Entité | Quantité |
|---|---|
| Clients | 25 (mix particuliers + professionnels) |
| Devis | 30 |
| Chantiers | 18 |
| Factures | 25 (dont 5 en retard) |
| Pointages | 85 (répartis sur 14 mois) |
| Bons de commande | 15 |
| Semaines planning | 3 (S14 verrouillée, S15 verrouillée, S16 brouillon) |
| Documents RH | 14 (CNI, QualiPAC RGE, habilitations) |

---

## 4. Catalogue Ecodan complet

### Fichier de référence
`e2e/catalogue-ecodan-complet.csv` — 52 références

### Catégories et références clés

#### Eco Inverter (entrée de gamme)
| Référence | Puissance | Prix achat HT | Prix vente HT |
|---|---|---|---|
| SUZ-SWM20VA | 2,0 kW | 890 € | 1 190 € |
| SUZ-SWM30VA | 2,5 kW | 1 190 € | 1 690 € |
| SUZ-SWM40VA | 4,0 kW | 1 340 € | 1 890 € |
| SUZ-SWM60VA | 6,3 kW | 1 690 € | 2 390 € |
| SUZ-SWM80VA | 8,0 kW | 1 990 € | 2 890 € |

#### Eco Inverter+ Hyper Heating
| Référence | Puissance | Prix achat HT | Prix vente HT |
|---|---|---|---|
| SUZ-SHWM25VA | 2,5 kW | 1 090 € | 1 490 € |
| SUZ-SHWM40VA | 4,0 kW | 1 390 € | 1 990 € |
| SUZ-SHWM60VA | 6,3 kW | 1 690 € | 2 390 € |
| SUZ-SHWM80VA | 8,0 kW | 2 090 € | 2 990 € |

#### Power Inverter Silence
| Référence | Puissance | Prix achat HT | Prix vente HT |
|---|---|---|---|
| PUZ-SWM50VHA | 5,0 kW | 1 890 € | 2 690 € |
| PUZ-SWM80VHA | 8,0 kW | 2 490 € | 3 490 € |
| PUZ-SWM120YKA | 12,0 kW | 3 490 € | 4 990 € |

#### Zubadan Silence (haute performance froid extrême)
| Référence | Puissance | Prix achat HT | Prix vente HT |
|---|---|---|---|
| PUZ-SHWM50VAA | 5,0 kW | 2 190 € | 3 150 € |
| PUZ-SHWM60VAA | 6,0 kW | 2 490 € | 3 550 € |
| PUZ-SHWM80VAA | 8,0 kW | 3 150 € | 4 460 € |
| PUZ-SHWM100VHA | 10,0 kW | 3 790 € | 5 390 € |
| PUZ-SHWM120VHA | 12,0 kW | 4 290 € | 6 090 € |

#### Zubadan Grande Puissance
| Référence | Puissance | Prix achat HT | Prix vente HT |
|---|---|---|---|
| PUHZ-SHW112YAA | 11,2 kW | 4 490 € | 6 390 € |
| PUHZ-SHW140YAA | 14,0 kW | 5 190 € | 7 390 € |
| PUHZ-SHW230YAA | 23,0 kW | 7 890 € | 11 290 € |

#### Hydrosplit R290 (nouvelle gamme bas-carbone)
| Référence | Puissance | Prix achat HT | Prix vente HT |
|---|---|---|---|
| PUZ-WZ50VAA | 5,0 kW | 2 990 € | 4 290 € |
| PUZ-WZ80VAA | 8,0 kW | 3 490 € | 4 990 € |
| PUZ-WZ120VAA | 12,0 kW | 4 490 € | 6 390 € |

#### Modules hydrauliques (critiques pour la démo)
| Référence | Type | Prix achat HT | Prix vente HT |
|---|---|---|---|
| ERSD-VM6E | Module simple, sans ballon | 1 890 € | 2 690 € |
| ERSF-VM6E | Module avec ballon 150L | 3 490 € | 4 990 € |
| ERST20F-VM6E | Module avec ballon 200L | 3 950 € | 5 590 € |
| ERPX-VM6E | Module premium avec pompe haute efficacité | 2 690 € | 3 790 € |
| ERPT-VM6E | Module triple fonction (PAC + appoint + solaire) | 3 690 € | 5 290 € |

> **Marge brute cible** : 35-45% sur équipements, 50-60% sur main d'œuvre

---

## 5. Base de connaissances RAG

### Architecture
- **Stockage** : Table PostgreSQL `knowledge_chunks`
- **Recherche** : Full-Text Search natif (`tsvector` / `plainto_tsquery`) avec dictionnaire français, + fallback ILIKE
- **Génération** : Claude Haiku avec prompt strict "réponds uniquement à partir du contexte"

### Modèle Prisma
```prisma
model KnowledgeChunk {
  id          String   @id @default(cuid())
  content     String
  source      String
  sourceType  String   @default("pdf")
  page        Int?
  chunkIndex  Int      @default(0)
  tags        String[]
  companyId   String
  createdAt   DateTime @default(now())
  company     Company  @relation(fields: [companyId], references: [id])

  @@map("knowledge_chunks")
}
```

### Migration SQL
Fichier : `api/prisma/migrations/20260415000000_add_knowledge_chunks/migration.sql`
```sql
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'pdf',
    "page" INTEGER,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "knowledge_chunks_fts_idx" ON "knowledge_chunks"
  USING gin(to_tsvector('french', "content"));
```

### 16 chunks pré-chargés (seed-knowledge-thermipro.ts)

| Source | Sujet |
|---|---|
| `guide_choix_gamme` | Tableau comparatif des 6 gammes Ecodan |
| `fiche_technique_eco_inverter` | Specs COP, dimensions, câblage Eco Inverter |
| `fiche_technique_zubadan` | Technologie Flash Injection, performances -30°C |
| `modules_hydrauliques` | ERSD/ERSF/ERST/ERPX/ERPT — dimensions + capacités |
| `codes_erreur_E1_EA` | E1=sonde, E4=débit, E5=HP, E6=BP/fuite, E7=compresseur, EA=no flow, E9=comms |
| `codes_erreur_U1_U3_L1_L4` | Codes compresseur, dégivrage |
| `procedure_mise_en_service` | Remplissage hydraulique, test vide <500 microns, séquence démarrage |
| `maintenance_annuelle_DEUE` | Check-list DTU DEUE obligatoire 4-70kW |
| `fgaz_r32_reglementation` | R32 GWP 675, Catégorie I, R290 nouveau hydrosplit |
| `raccordements_hydrauliques` | DTU 65.16, pressions, débits, qualité eau |
| `raccordements_electriques` | NF C 15-100, sections câbles, calibres disjoncteurs par modèle |
| `regulation_mrc_controller` | Modes température fixe, courbe de chauffe, adaptatif |
| `maprimerénov_cee_2025` | Montants par tranche revenus, TVA 5.5%, conditions |
| `dimensionnement_dtu65_16` | Déperditions W/m² par époque, zones climatiques |
| `technologie_zubadan` | Explication Flash Injection, courbe puissance vs température |
| `catalogue_tarifs_installateur` | Tarifs installateur 2025 (même contenu que seed catalogue) |

### Endpoints Knowledge
```
GET  /knowledge/search?q=<query>     # Recherche FTS
GET  /knowledge/sources              # Liste des sources avec nb chunks
DELETE /knowledge/sources/:source    # Supprimer une source
POST /knowledge/ingest               # Ingestion bulk (JSON)
```

### Script d'ingestion PDF
```bash
# Ingérer un PDF technique
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/ingest-pdf.ts \
  --file "/path/to/Guide_Technique_Ecodan_2024.pdf" \
  --company co_tp \
  --tags "maintenance,codes_erreur" \
  --chunk-size 600

# Variables disponibles
# --file     : chemin absolu vers le PDF
# --company  : ID de la company dans la BDD (ex: co_tp)
# --tags     : tags séparés par virgules
# --chunk-size : nb de mots par chunk (défaut: 600)
```

**PDFs prioritaires à ingérer depuis le dossier "Catalogue mitsu" :**
- `ECODAN_CATALOGUE_INTERACTIF_202620251204.pdf` — catalogue produits 2025-2026
- `Guide_Technique_Ecodan.pdf` — guide installation + mise en service
- `Manuel_Codes_Erreur_Ecodan.pdf` — tous les codes défaut
- `DTU_65_16_PAC.pdf` — norme technique installation

---

## 6. Fonctionnalités IA — les 3 WOW

### WOW 1 — Dimensionnement automatique + génération devis

**Objectif** : En 30 secondes, passer de "je ne sais pas quelle PAC choisir" à un devis complet.

**Endpoint** : `POST /api/ai/size-and-quote`

**Payload** :
```json
{
  "surface": 120,
  "anneeConstruction": 1985,
  "departement": "75",
  "typeEmetteurs": "radiateurs_basse_temp",
  "chauffageExistant": "fioul",
  "typeProjet": "renovation",
  "ecsIntegree": true,
  "nombrePersonnes": 4,
  "observations": "maison mitoyenne, exposition sud"
}
```

**Réponse** :
```json
{
  "puissanceCalculee": 9.2,
  "zoneClimatique": "H1",
  "gammeRecommandee": "Zubadan Silence",
  "modelePrincipal": "PUZ-SHWM100VHA",
  "moduleHydraulique": "ERST20F-VM6E",
  "justification": "Construction 1985 → déperditions ~60W/m²...",
  "maprimerenovEstimate": 3500,
  "quoteLines": [...]
}
```

**Composant React** : `src/components/ai/AiSizingWizard.tsx`
- Dialog 2 étapes : formulaire (6 champs) → résultat (fiche recommandation + tableau lignes devis)
- Bouton "🎯 Dimensionnement auto" dans `Quotes.tsx` (orange, à côté de "Générer avec l'IA")
- Callback `onApply(subject, lines)` injecte directement dans le formulaire devis avec TVA 5.5%

**Logique métier** :
- Carte zones climatiques (dép. → H1/H2/H3) codée dans `ai.service.ts`
- Règle DTU 65.16 : déperditions × surface = puissance nominale (+20% pour bâtiment ancien)
- Construction <1975 → Zubadan obligatoire (températures ext. basses)
- Construction ≥2012 → Eco Inverter suffisant
- ECS intégrée → module ERST20F (ballon 200L)

---

### WOW 2 — Rapport vocal terrain

**Objectif** : Le technicien dicte son compte-rendu en 1 minute → rapport structuré + pointage créé automatiquement.

**Endpoint** : `POST /api/ai/voice-report`

**Payload** :
```json
{
  "transcript": "J'ai posé l'Ecodan 12kW chez Dupont, raccordé le module ERST20F, mise en charge R32 effectuée, pression 2,1 bar, tout fonctionne. J'ai bossé 8h.",
  "jobId": "j_tp01",
  "date": "2026-04-16T17:00:00.000Z"
}
```

**Réponse** :
```json
{
  "reportText": "Intervention du 16/04/2026 — Installation PAC Ecodan 12kW...",
  "hoursWorked": 8,
  "progressPercent": 85,
  "productsUsed": ["Ecodan 12kW", "ERST20F"],
  "observations": "Mise en service prévue demain matin",
  "nextSteps": "Mise en service + formation client",
  "timeEntryDescription": "Installation PAC + raccordement module hydraulique"
}
```

**Composant React** : `src/components/ai/AiVoiceReport.tsx`
- Utilise Web Speech API navigateur (Chrome/Edge uniquement) — aucun coût, aucun service externe
- Langue : `fr-FR`, mode continu
- Bouton "🎤 Rapport vocal" dans `Jobs.tsx` (bleu, à côté de "Générer OS")
- Callback `onApply(result)` met à jour l'avancement du chantier + crée le pointage

**Compatibilité** : Chrome, Edge. Sur Safari/Firefox → texte libre uniquement (bouton Dicter désactivé avec message explicatif)

---

### WOW 3 — Alertes proactives IA

**Objectif** : Chaque matin, le dashboard affiche ce qui nécessite une action commerciale ou opérationnelle, avec des emails pré-rédigés.

**Endpoint** : `GET /api/ai/proactive-alerts`

**Types d'alertes actifs pour JS Concept / ASP Signalisation** :
| Type | Priorité | Déclencheur |
|---|---|---|
| `overdue_invoice` | critical / high | Facture non payée + dépassement échéance |
| `quote_followup` | high | Devis envoyé sans réponse depuis >14 jours |
| `budget_overrun` | high | Heures pointées >20% des heures estimées sur devis |

> `maintenance_due` (entretien annuel PAC) est désactivé — spécifique à la démo ThermiPro.

**Réponse exemple** :
```json
{
  "alerts": [
    {
      "type": "overdue_invoice",
      "priority": "critical",
      "title": "Facture impayée — Fontaine M.",
      "detail": "6 734 € — 23 jours de retard",
      "draftMessage": "Objet: Relance facture n°INV-2026-018...",
      "clientName": "Mme Fontaine",
      "clientEmail": "fontaine@email.fr",
      "relatedId": "inv_tp18",
      "relatedType": "invoice",
      "daysOverdue": 23,
      "amount": 6734
    }
  ],
  "summary": "3 alertes critiques aujourd'hui — 2 impayés, 1 entretien dû",
  "generatedAt": "2026-04-16T08:00:00.000Z"
}
```

**Composant React** : `src/components/ai/AiProactiveAlerts.tsx`
- Auto-chargement au montage (`useEffect`)
- Cartes colorées : rouge (critical), orange (high), jaune (medium)
- Bouton "Envoyer l'email" → dialogue avec email pré-rédigé, éditable avant envoi
- Bouton "Ignorer" par alerte
- Bouton rafraîchir
- Intégré dans `Dashboard.tsx` entre le widget AI Briefing et le widget Cashflow

---

## 7. Modifications des fichiers existants

### `api/prisma/seed.ts`
```typescript
import { seedThermiPro } from './seed-thermipro';
import { seedKnowledgeThermiPro } from './seed-knowledge-thermipro';

// À la fin de main() :
await seedThermiPro(prisma, hash);
await seedKnowledgeThermiPro(prisma);
```

### `api/src/app.module.ts`
```typescript
import { KnowledgeModule } from './knowledge/knowledge.module';
// Ajouté dans imports: [..., KnowledgeModule]
```

### `api/src/ai/ai.module.ts`
```typescript
import { KnowledgeModule } from '../knowledge/knowledge.module';
// Ajouté dans imports: [..., KnowledgeModule]
```

### `api/src/ai/ai.service.ts` — méthodes ajoutées
- `chat()` — modifié pour détecter les questions techniques (regex `RAG_KEYWORDS`) et interroger la KB avant de répondre
- `autoSizeAndQuote(dto, companyId)` — nouveau
- `parseVoiceReport(dto, companyId)` — nouveau
- `getProactiveAlerts(companyId)` — nouveau

### `api/src/ai/ai.controller.ts` — routes ajoutées
```typescript
POST /api/ai/size-and-quote
POST /api/ai/voice-report
GET  /api/ai/proactive-alerts
```

### `src/pages/Quotes.tsx`
- Import `AiSizingWizard`
- State `sizingWizardOpen`
- Bouton "🎯 Dimensionnement auto" dans la toolbar
- `<AiSizingWizard open={sizingWizardOpen} onClose={...} onApply={...} />`

### `src/pages/Jobs.tsx`
- Import `AiVoiceReport` + icône `Mic`
- State `voiceReportOpen`
- Bouton "🎤 Rapport vocal" dans la toolbar du chantier sélectionné
- `<AiVoiceReport open={voiceReportOpen} ... onApply={...} />`

### `src/pages/Dashboard.tsx`
- Import `AiProactiveAlerts`
- `<AiProactiveAlerts />` ajouté dans la colonne droite du dashboard

---

## 8. Structure des nouveaux fichiers

```
api/
├── prisma/
│   ├── seed-thermipro.ts              # Seed données ThermiPro (560 lignes)
│   ├── seed-knowledge-thermipro.ts    # Seed base de connaissances (16 chunks)
│   ├── ingest-pdf.ts                  # Script CLI ingestion PDF
│   └── migrations/
│       └── 20260415000000_add_knowledge_chunks/
│           └── migration.sql
└── src/
    ├── knowledge/
    │   ├── knowledge.module.ts
    │   ├── knowledge.service.ts       # FTS + ILIKE fallback
    │   └── knowledge.controller.ts   # 4 endpoints REST
    └── ai/
        ├── ai.dto.ts                  # + SizingDto, VoiceReportDto, ProactiveAlert
        ├── ai.service.ts              # + 3 nouvelles méthodes
        └── ai.controller.ts           # + 3 nouvelles routes

src/
└── components/
    └── ai/
        ├── AiSizingWizard.tsx         # WOW 1 — Dimensionnement
        ├── AiVoiceReport.tsx          # WOW 2 — Rapport vocal
        └── AiProactiveAlerts.tsx      # WOW 3 — Alertes proactives

e2e/
├── catalogue-ecodan-complet.csv       # 52 références avec prix
└── catalogue-thermipro.csv            # 22 références (version initiale)

DEMO-THERMIPRO-15MIN.md               # Script de démo commerciale
SUIVI-DEVELOPPEMENT.md                # Ce fichier
```

---

## 9. Script de démo 15 minutes

Fichier : `DEMO-THERMIPRO-15MIN.md`

**Fil rouge** : Famille Dupont, Ecodan 12kW, chantier à 65% d'avancement

| Acte | Durée | Fonctionnalité |
|---|---|---|
| 1 — Tableau de bord | 3 min | Alertes proactives IA (WOW 3), KPI temps réel |
| 2 — Devis intelligent | 4 min | Dimensionnement auto (WOW 1) : 6 champs → devis complet |
| 3 — Chantier en cours | 3 min | Rapport vocal (WOW 2) + suivi avancement |
| 4 — Facture impayée | 3 min | Relance email pré-rédigée (Fontaine, 6 734 €) |
| 5 — Clôture | 2 min | ROI, questions, prochaine étape |

**Compte démo à utiliser** : `david@thermipro.fr` / `Password123!`

---

## 10. Points d'attention et TODO

### Bugs corrigés ✅
- `getProactiveAlerts()` : variable `clients` remplacée par `jobsInProgress` dans la boucle budget overrun
- Prompt RAG : références ThermiPro/Ecodan retirées → prompts génériques
- Alertes proactives : `maintenance_due` (PAC) supprimé → 3 types actifs : impayés, relances devis, dépassement heures

### Prochaines étapes recommandées

1. **Charger des docs techniques ASP/JS dans la base RAG** :
   ```bash
   # Exemple : ingérer un guide technique ou règlement interne
   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/ingest-pdf.ts \
     --file "./docs/Guide_Marquage_Routier.pdf" \
     --company co_asp --tags "marquage,normes"
   ```

2. **Vrai envoi email** : Remplacer la simulation dans `AiProactiveAlerts.tsx` par un appel au module mail existant (SMTP / SendGrid)

3. **Persistance des alertes ignorées** : Actuellement en state React (perdu au refresh). Ajouter une table `dismissed_alerts` ou stocker en localStorage

4. **Test rapport vocal sur mobile** : Web Speech API fonctionne sur Chrome Android, idéal pour les techniciens sur chantier

5. **Authentification RAG** : Le endpoint `/knowledge/ingest` devrait être protégé par un guard `ADMIN`

6. **Personnalisation du chatbot** : Alimenter la KB avec les normes métier (CEREMA, instruction interministérielle signalisation routière, etc.) pour un assistant vraiment utile sur le terrain

---

## 11. Nomenclature Ecodan — aide-mémoire

```
SUZ-SWM    = Eco Inverter (entrée de gamme)
SUZ-SHWM   = Eco Inverter+ Hyper Heating
PUZ-SWM    = Power Inverter Silence
PUZ-SHWM   = Zubadan Silence (★ best-seller)
PUHZ-SH    = Zubadan Grande Puissance (>11kW)
PUZ-WZ     = Hydrosplit R290 (nouvelle gamme bas-carbone)
PUZ-WM     = Hydrosplit classique (R410A, fin de vie)

ERSD       = Module hydraulique simple (sans ballon)
ERSF       = Module avec ballon 150L
ERST       = Module avec ballon 200L (★ recommandé ECS)
ERPX       = Module premium haute efficacité
ERPT       = Module triple fonction (PAC + appoint + solaire)
```

**Codes erreur critiques à connaître pour la démo RAG** :
- `E4` = problème de débit — purger le circuit
- `E6` = basse pression / fuite R32 — Catégorie I obligatoire
- `EA` = absence de circulation eau — vérifier pompe + vannes

---

## 12. Références réglementaires utilisées

| Texte | Sujet |
|---|---|
| DTU 65.16 | Installation PAC — hydraulique, dimensionnement, mise en service |
| NF C 15-100 | Installations électriques — câblages, disjoncteurs |
| Directive DEUE | Entretien annuel obligatoire PAC 4-70kW |
| Règlement F-GAZ (UE) 517/2014 | Gestion fluides frigorigènes |
| Art. 279-0 bis A CGI | TVA 5.5% travaux rénovation énergétique |
| MaPrimeRénov' 2025 | Aide ANAH selon tranche de revenus |
| Certification QualiPAC RGE | Prérequis pour éligibilité aides |

---

---

## 13. Démo ThermiPro PAC — comment la réactiver

La démo ThermiPro est entièrement préservée dans les fichiers suivants, **sans modification de la seed principale** :

| Fichier | Rôle |
|---|---|
| `api/prisma/seed-thermipro.ts` | Données de démo : 8 users, 25 clients, 44 refs Ecodan, 30 devis, 18 chantiers, 85 pointages... |
| `api/prisma/seed-knowledge-thermipro.ts` | 16 chunks base documentaire RAG (codes erreur, maintenance, F-GAZ...) |
| `src/components/ai/AiSizingWizard.tsx` | WOW 1 — Dimensionnement PAC auto |
| `DEMO-THERMIPRO-15MIN.md` | Script de démo commerciale 15 min |

### Pour activer ThermiPro en démo

**Option A — Seed standalone (sans toucher à la seed JSC/ASP)** :
```bash
# Créer un script dédié
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-thermipro-standalone.ts
```

**Option B — Réintégrer dans la seed principale** :
Dans `api/prisma/seed.ts`, décommenter :
```typescript
import { seedThermiPro } from './seed-thermipro';
import { seedKnowledgeThermiPro } from './seed-knowledge-thermipro';
// ...
await seedThermiPro(prisma, hash);
await seedKnowledgeThermiPro(prisma);
```

**Option C — Réactiver le bouton Dimensionnement auto** :
Dans `src/pages/Quotes.tsx`, décommenter :
```typescript
import AiSizingWizard from '@/components/ai/AiSizingWizard';
const [sizingWizardOpen, setSizingWizardOpen] = useState(false);
// ... et le bouton + le composant dans le JSX
```

**Compte de connexion ThermiPro** : `david@thermipro.fr` / `Demo1234!`

---

*Document maintenu à jour — ConceptManager pour JS Concept + ASP Signalisation, avril 2026*
