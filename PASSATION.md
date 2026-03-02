# ConceptManager — Document de passation

> **Auteur** : Lead dev
> **Date** : 28 fevrier 2026
> **Duree d'absence** : 2 semaines
> **Destinataire** : Dev / Product Owner de remplacement

---

## Table des matieres

0. [Resume executif](#0-resume-executif)
1. [Contexte produit](#1-contexte-produit)
2. [Carte mentale du produit](#2-carte-mentale-du-produit)
3. [Vision fonctionnelle globale](#3-vision-fonctionnelle-globale)
4. [Architecture technique](#4-architecture-technique)
5. [Etat actuel du projet](#5-etat-actuel-du-projet)
6. [Etat reel du produit — Tableau synthese](#6-etat-reel-du-produit)
7. [Points sensibles a surveiller](#7-points-sensibles-a-surveiller)
8. [Ce qu'il ne faut surtout pas casser](#8-ce-quil-ne-faut-surtout-pas-casser)
9. [Procedure technique rapide](#9-procedure-technique-rapide)
10. [Ou chercher en cas de probleme](#10-ou-chercher-en-cas-de-probleme)
11. [Regles de decision pendant mon absence](#11-regles-de-decision-pendant-mon-absence)
12. [Roadmap post-pilote](#12-roadmap-post-pilote)

---

## 0. Resume executif

**ConceptManager** est un mini-ERP BTP concu pour les PME de signalisation et amenagement urbain (20-100 salaries). Il remplace la combinaison Excel + Outlook + logiciels de devis/facture vieillissants par une plateforme unique couvrant le cycle complet : devis, chantiers, planning equipes, saisie terrain (mobile offline), facturation, export comptable et previsionnel tresorerie.

**Ou en est le produit** : Phase pilote de 2 semaines. Quatre sprints livres (Import, Export, Tresorerie, Offline). 29 tests E2E automatises. Le produit est stable et deploye en Docker Compose.

**Objectif pendant mon absence** : Superviser le pilote. S'assurer que les utilisateurs testent reellement les 5 workflows cles (import, export comptable, terrain offline, validation heures, previsionnel). Collecter les incidents dans `e2e/pilot-incidents.md`. Ne corriger que les bloquants.

**Risques majeurs** :
- Export comptable refuse par le comptable reel (format FEC invalide)
- Perte de donnees en mode offline (probleme de sync)
- Faille multi-tenant (un utilisateur voit les donnees d'une autre societe)

**Condition de succes** : 0 incident bloquant non resolu a la fin du pilote → signature contrat **799 EUR/mois/societe**.

---

## 1. Contexte produit

### Ce qu'est ConceptManager

ConceptManager est une application web + mobile (PWA) de gestion integree pour les entreprises du BTP, specialisee signalisation routiere et amenagement urbain.

### Pour qui

PME BTP de 20 a 100 salaries, typiquement des entreprises de signalisation (marquage au sol, panneaux, mobilier urbain). Le produit gere deux entites pilotes : **ASP Signalisation** et **JS Concept**.

### Le probleme metier

Ces entreprises fonctionnent avec :
- Des **devis sur Excel** ou logiciels generiques non connectes aux chantiers
- Un **suivi de chantier papier** (fiches terrain, photos par WhatsApp)
- Une **saisie des heures manuelle** (fiches papier, ressaisie au bureau)
- Un **export comptable artisanal** (copier-coller vers Sage/EBP)
- **Aucune visibilite** sur la marge chantier en temps reel
- **Aucun previsionnel** tresorerie

Resultat : perte de temps, erreurs, retards de facturation, marges inconnues.

### Pourquoi ConceptManager existe

Remplacer cette pile d'outils disjoints par **une seule plateforme** qui couvre le flux complet du metier : du devis a l'export comptable, en passant par le terrain.

### Positionnement

**Mini-ERP BTP premium sans usine a gaz.** Pas un ERP generaliste lourd (SAP, Sage X3), pas un simple logiciel de devis. Un outil metier complet, rapide, utilisable sur le terrain avec un telephone.

### Modele economique

**799 EUR/mois/societe** — tout inclus (utilisateurs illimites, stockage, mises a jour). Pilote gratuit de 2 semaines, signature si tous les KPIs sont atteints.

---

## 2. Carte mentale du produit

```
                        ┌─────────┐
                        │ CLIENT  │
                        └────┬────┘
                             │
                             ▼
                        ┌─────────┐
                        │  DEVIS  │ ← Templates, avenants
                        └────┬────┘
                             │ accepte
                             ▼
                        ┌──────────┐
                        │ CHANTIER │ ← Achats, atelier/fabrication
                        └────┬─────┘
                             │
                    ┌────────┼────────┐
                    ▼        ▼        ▼
              ┌──────────┐ ┌──────┐ ┌────────┐
              │ PLANNING │ │ACHAT │ │ATELIER │
              │ Equipes  │ │Fourniss│ │Kanban  │
              └────┬─────┘ └──────┘ └────────┘
                   │
                   ▼
            ┌────────────┐
            │   HEURES   │ ← Saisie terrain (online/offline)
            │   PHOTOS   │   Signatures sur site
            │ SIGNATURES │
            └─────┬──────┘
                  │ validation conducteur
                  ▼
           ┌─────────────┐
           │ FACTURATION │ ← Situations (avancement)
           │             │   Relances automatiques
           └──────┬──────┘
                  │
                  ▼
          ┌───────────────┐
          │ MARGE CHANTIER│ ← Cout reel vs devis
          └───────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │EXPORT COMPTABLE│ ← FEC / Sage / EBP
         └────────┬───────┘
                  │
                  ▼
        ┌──────────────────┐
        │ CASHFLOW PREVIS. │ ← 30j / 60j / 90j
        └──────────────────┘
```

**Lecture** : Un client genere un devis. Une fois accepte, le devis devient un chantier. Le chantier mobilise des equipes (planning), des achats et de la fabrication (atelier). Sur le terrain, les techniciens saisissent heures, photos et signatures (meme hors connexion). Le conducteur valide les heures. Le chantier est facture (eventuellement en situations successives). La marge est calculee en temps reel. Les ecritures sont exportees vers le logiciel comptable. Le previsionnel tresorerie projette les encaissements/decaissements sur 30/60/90 jours.

---

## 3. Vision fonctionnelle globale

### 3.1 Devis → Chantier

**Logique** : Un devis (statut : brouillon → envoye → accepte/refuse/expire) contient des lignes chiffrees. Une fois accepte, il est converti en chantier. Les avenants (QuoteAmendment) permettent de modifier le montant contractuel apres acceptation.

**Pourquoi c'est important** : C'est le point d'entree de tout le flux financier. Le montant du devis + avenants = montant contractuel du chantier = base de calcul de la marge.

### 3.2 Chantier (Job)

**Logique** : Un chantier a un cycle de vie (planifie → en cours → pause → termine → facture). Il aggrege les heures, les achats, les photos, les signatures. Sa marge = montant contractuel - (heures valorisees + achats).

**Pourquoi c'est important** : C'est l'unite centrale du metier. Tout converge vers le chantier.

### 3.3 Planning equipes

**Logique** : Planning hebdomadaire avec creneaux horaires (7h-18h) par equipe. Une semaine peut etre verrouillee (locked) une fois validee. Le planning est envoye par email aux techniciens.

**Pourquoi c'est important** : Sans planning, les techniciens ne savent pas ou aller. Le planning alimente la page terrain mobile.

### 3.4 Heures (TimeEntry)

**Logique** : Cycle brouillon → soumis → approuve/rejete. Un technicien saisit ses heures par chantier. Le conducteur valide par lot. Les heures validees alimentent la marge chantier.

**Pourquoi c'est important** : Les heures representent le cout principal d'un chantier BTP. Sans validation, la marge est fausse.

### 3.5 Achats (PurchaseOrder)

**Logique** : Commande fournisseur (brouillon → commandee → recue partiellement → recue). Liee a un chantier. Le cout alimente la marge.

**Pourquoi c'est important** : Deuxieme poste de cout apres les heures.

### 3.6 Atelier / Workshop

**Logique** : Kanban de fabrication : BAT en attente → BAT approuve → fabrication → pret → pose planifiee → pose faite. Typiquement pour les panneaux, le marquage, le mobilier urbain.

**Pourquoi c'est important** : Certains chantiers necessitent une fabrication prealable. L'atelier doit savoir quoi produire et quand.

### 3.7 Facturation et situations

**Logique** : Une facture peut etre simple ou decomposee en situations (facturation d'avancement). Chaque situation a un pourcentage et un montant cumulatif. Statuts : brouillon → envoyee → payee / en retard / annulee.

**Relances automatiques** : 3 niveaux d'escalade (rappel poli, relance ferme, mise en demeure) avec delais configurables.

**Pourquoi c'est important** : La facturation en situations est standard dans le BTP. Les relances evitent les impayes.

### 3.8 Export comptable

**Logique** : Generation de fichiers au format FEC (Fichier des Ecritures Comptables, obligation legale francaise), Sage et EBP. Multi-taux TVA (20%, 10%, 0%). Equilibre debit/credit garanti par ecriture.

**Pourquoi c'est important** : Le comptable doit pouvoir importer les ecritures sans ressaisie. Si le FEC est invalide, le pilote echoue.

### 3.9 Previsionnel tresorerie (Cashflow)

**Logique** : Snapshot des encaissements/decaissements + projections a 30/60/90 jours. Calcul du reste a facturer par chantier avec indice de confiance (haute = situations regulieres, moyenne = debut de facturation, basse = rien facture).

**Pourquoi c'est important** : Le gerant doit anticiper sa tresorerie. C'est un differenciateur produit fort.

### 3.10 RH / Habilitations

**Logique** : Stockage des documents RH (CNI, permis, CACES, habilitations) avec dates d'expiration. Matrice de competences. Gestion des absences avec workflow d'approbation.

**Pourquoi c'est important** : Conformite reglementaire. Un technicien sans habilitation valide ne doit pas aller sur chantier.

### 3.11 Mode offline terrain (PWA)

**Logique** : L'app terrain est une PWA installable. En mode hors ligne, les saisies (heures, photos, signatures) sont stockees dans IndexedDB via Dexie. Une file d'attente (`/terrain/queue`) montre les elements en attente. Au retour en ligne, sync automatique avec gestion d'idempotence.

**Pourquoi c'est important** : Les chantiers sont souvent en zone sans reseau. Sans offline, l'app est inutilisable sur le terrain.

---

## 4. Architecture technique

### 4.1 Stack

| Couche | Technologie | Details |
|--------|-------------|---------|
| **Frontend** | React 18 + TypeScript + Vite | shadcn/ui (Radix), Tailwind CSS, TanStack React Query |
| **Backend** | NestJS 10 + TypeScript | REST API sous `/api/*`, Swagger a `/api/docs` |
| **ORM** | Prisma | 41 modeles, 12 enums, migrations versionees |
| **Base de donnees** | PostgreSQL 16 | Docker, volume persistant `pgdata` |
| **Stockage fichiers** | MinIO (S3-compatible) | Photos, documents RH, signatures. Volume `miniodata` |
| **PWA / Offline** | Workbox + Dexie (IndexedDB) | Cache NetworkFirst, SyncManager, compression images |
| **Auth** | JWT + Refresh Token | Access 15min, Refresh 7j avec rotation |
| **Deploiement** | Docker Compose | 4 services : postgres, minio, api, frontend (nginx) |

### 4.2 Schema de flux simplifie

```
┌──────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR                            │
│                                                              │
│  ┌────────────────┐        ┌──────────────────────────────┐  │
│  │  React SPA     │        │  Service Worker (PWA)        │  │
│  │  shadcn/ui     │        │  IndexedDB (Dexie)           │  │
│  │  React Query   │        │  SyncManager                 │  │
│  └───────┬────────┘        └──────────┬───────────────────┘  │
│          │                            │ offline sync         │
└──────────┼────────────────────────────┼──────────────────────┘
           │ HTTPS                      │
           ▼                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    NGINX (port 8080)                          │
│  /api/* → proxy vers API   |   /* → React SPA                │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                  NestJS API (port 3000)                       │
│                                                              │
│  Helmet → CORS → ValidationPipe → ThrottlerGuard             │
│  → JwtAuthGuard → RolesGuard → CompanyGuard                  │
│  → IdempotencyInterceptor → Controller → Service             │
│  → AuditLogInterceptor                                       │
│                                                              │
│  28 modules : auth, clients, quotes, jobs, invoices,         │
│  planning, teams, hr, workshop, purchases, export,           │
│  import, dashboard, catalog, absences, reminders...          │
└──────┬──────────────────────────────────┬────────────────────┘
       │                                  │
       ▼                                  ▼
┌──────────────┐                 ┌─────────────────┐
│ PostgreSQL   │                 │ MinIO (S3)      │
│ port 5432    │                 │ port 9000/9001  │
│ 41 tables    │                 │ concept-files   │
│ multi-tenant │                 │ hr-documents    │
└──────────────┘                 └─────────────────┘
```

### 4.3 Multi-tenant

Deux societes : **ASP Signalisation** et **JS Concept**. Chaque entite (client, devis, chantier, facture...) est scopee par `companyId`. Le header `X-Company-Id` (ASP | JS | GROUP) determine le perimetre. Le `CompanyGuard` force l'isolation :

- **admin / conducteur** : peuvent voir GROUP (cross-company)
- **comptable / technicien** : limites a leur societe

### 4.4 RBAC (4 roles)

| Action | admin | conducteur | comptable | technicien |
|--------|:-----:|:----------:|:---------:|:----------:|
| Import donnees | oui | — | — | — |
| Export FEC/Sage/EBP | oui | — | oui | — |
| Modifier comptes comptables | oui | — | — | — |
| Previsionnel tresorerie | oui | — | oui (lecture) | — |
| Planning equipes | oui | oui | — | — |
| Valider heures | oui | oui | — | — |
| Saisie terrain (mobile) | — | — | — | oui |
| Gestion utilisateurs | oui | — | — | — |

---

## 5. Etat actuel du projet

### 5.1 Sprints livres

| Sprint | Contenu | Statut |
|--------|---------|--------|
| **Sprint 1 — Import** | Import CSV (clients, fournisseurs, chantiers, factures). Detection doublons soft. Validation FK. Idempotence via `externalRef`. | Livre |
| **Sprint 2 — Export** | FEC multi-taux TVA (20%, 10%, 0%), Sage, EBP. Equilibre debit/credit. RBAC export. | Livre |
| **Sprint 3 — Tresorerie** | Cashflow snapshot + projections 30/60/90j. Indice de confiance par chantier. Dashboard widget. | Livre |
| **Sprint 4 — Offline** | PWA terrain, IndexedDB (Dexie), SyncManager, file d'attente, compression photos, idempotence sync. | Livre |

### 5.2 Qualification E2E

- **29 tests automatises** dans `e2e/e2e-qualification.sh`
- **4 blocs** : Import (9 tests), Export (11 tests), Cashflow (6 tests), Idempotency (3 tests)
- **Lancement** : `cd e2e && bash e2e-qualification.sh`
- **Pre-requis** : stack Docker running + seeds executes + `jq` installe

### 5.3 Dataset

- **Seed de base** (`api/prisma/seed.ts`) : 2 societes, 26 utilisateurs, 5 equipes, 8 clients, 5 fournisseurs, 6 devis, 6 chantiers, 4 factures, 30 saisies d'heures, 12 documents RH, 8 items atelier, 7 commandes
- **Seed E2E** (`api/prisma/seed-e2e.ts`) : ajoute les parametres comptables, factures multi-taux, situations, avenants, utilisateur comptable

### 5.4 Phase pilote

> **Le produit est stable et en phase pilote de 2 semaines.**

- Runbook detaille : `e2e/PILOT-RUNBOOK.md`
- Quick start : `e2e/README-PILOT.md`
- Journal d'incidents : `e2e/pilot-incidents.md`
- Rapport de qualification : `e2e/QUALIF-REPORT.md`

**5 roles pilotes** :

| Role | Login | MDP | Mission |
|------|-------|-----|---------|
| Admin/Gerant | admin@asp.fr | Demo1234! | Import, export, previsionnel, supervision |
| Conducteur | cond@asp.fr | Demo1234! | Planning, validation heures, suivi chantiers |
| Comptable | compta@asp.fr | Demo1234! | Export FEC/Sage/EBP, verification comptes |
| Technicien 1 | karim@asp.fr | Demo1234! | Saisie terrain online (heures, photos, signature) |
| Technicien 2 | lucas@asp.fr | Demo1234! | Saisie terrain + test offline |

---

## 6. Etat reel du produit

| Domaine | Maturite | Risque | Commentaire |
|---------|:--------:|:------:|-------------|
| Import CSV | Stable | Faible | Idempotent via externalRef, doublons detectes |
| Export comptable (FEC) | Stable | **Moyen** | Techniquement correct, mais validation par comptable reel en cours |
| Export Sage / EBP | Fonctionnel | Faible | Format genere, a valider avec logiciel cible |
| Cashflow previsionnel | Fonctionnel | Faible | Projections coherentes, indice confiance fiable |
| Offline terrain | Solide | **Moyen** | Techniquement OK, adoption terrain a confirmer |
| Multi-tenant | Correcte | **Critique si cassee** | Guards en place, mais toute regression = fuite de donnees |
| Idempotency | Stable | Faible | Hash + stockage 7j, 409 sur conflit |
| RBAC | Stable | Faible | 4 roles, guards globaux |
| Planning equipes | Stable | Faible | Verrouillage semaine, dispatch email |
| Facturation / situations | Stable | Faible | Multi-situations, relances 3 niveaux |
| Atelier / Workshop | Stable | Faible | Kanban 6 etats |
| RH / Documents | Stable | Faible | Upload MinIO, expiration trackee |

---

## 7. Points sensibles a surveiller

### 7.1 Export comptable — Acceptation reelle

**Risque** : Le FEC est genere correctement (equilibre debit/credit, multi-taux), mais le comptable reel de l'entreprise ne l'a pas encore valide dans son logiciel (Sage, EBP, ou autre).

**Pourquoi c'est critique** : Si le FEC est refuse, le produit perd un argument de vente majeur. Le comptable doit pouvoir importer sans correction manuelle.

**Que surveiller** : Le Jour 3 du pilote, le comptable teste l'export. Verifier le resultat dans `pilot-incidents.md`. Si erreur, corriger dans `api/src/export/export.service.ts`.

### 7.2 Offline terrain — Adoption et erreurs sync

**Risque** : La PWA fonctionne techniquement, mais les techniciens peuvent ne pas l'adopter (habitude papier) ou rencontrer des edge cases non testes (crash app, batterie faible, quota IndexedDB).

**Pourquoi c'est critique** : Si les techniciens n'utilisent pas l'app, le KPI "reduction papier -80%" n'est pas atteint.

**Que surveiller** : Semaine 2 du pilote. Verifier que les saisies arrivent en base. Verifier la file d'attente (`/terrain/queue`). Attention aux doublons (l'idempotence doit les empecher).

### 7.3 Cashflow — Utilise ou ignore

**Risque** : Le widget cashflow est fonctionnel mais le gerant pourrait ne pas le consulter ou ne pas comprendre les indices de confiance.

**Que surveiller** : Le gerant ouvre-t-il le dashboard quotidiennement ? (Verifiable dans les activity logs.)

### 7.4 Multi-tenant — Securite

**Risque** : Une regression dans le `CompanyGuard` ou dans un service qui oublie le filtre `companyId` = fuite de donnees entre ASP et JS.

**Pourquoi c'est critique** : Fuite = incident de securite majeur, perte de confiance.

**Que surveiller** : Si un nouvel endpoint est ajoute, il DOIT passer par le CompanyGuard. Tester avec un technicien ASP qui tente d'acceder aux donnees JS (doit recevoir 403).

### 7.5 Idempotency

**Risque** : Si l'intercepteur d'idempotence est desactive ou bypasse, les re-sync offline ou re-imports peuvent creer des doublons.

**Que surveiller** : Apres chaque re-sync ou re-import, verifier qu'aucune donnee n'est dupliquee. Le test E2E Bloc 4 valide ca.

---

## 8. Ce qu'il ne faut surtout pas casser

| Invariant | Pourquoi | Fichier cle |
|-----------|----------|-------------|
| **Isolation multi-tenant** | Un utilisateur ne doit JAMAIS voir les donnees d'une autre societe | `api/src/common/guards/company.guard.ts` |
| **Idempotency** | Pas de double creation lors de retry, re-sync, re-import | `api/src/common/interceptors/idempotency.interceptor.ts` |
| **Equilibre debit/credit FEC** | Chaque ecriture comptable doit etre equilibree. Sinon le FEC est invalide | `api/src/export/export.service.ts` |
| **Sync offline FIFO** | Les saisies terrain doivent etre rejouees dans l'ordre d'enregistrement | `src/services/offline/syncManager.ts` |
| **Validation FK import** | Un chantier ne peut pas etre importe si le client n'existe pas | `api/src/import/import.service.ts` |
| **Rotation refresh token** | Si un token revoque est reutilise, TOUS les tokens de l'utilisateur sont revoques (protection vol) | `api/src/auth/auth.service.ts` |
| **Rate limiting** | 100 req/60s global. Ne pas desactiver | `api/src/app.module.ts` (ThrottlerModule) |

---

## 9. Procedure technique rapide

### 9.1 Lancer le stack complet

```bash
# Demarrer tous les services (postgres, minio, api, frontend)
docker compose up --build -d

# Attendre que l'API soit prete (~30s)
docker compose logs -f api
# Attendre : "Nest application successfully started"
```

### 9.2 Seeder la base

```bash
# Migrations + seed de base
docker compose exec api sh -c "npx prisma migrate deploy && npx prisma db seed"

# Seed E2E (donnees supplementaires pour les tests)
docker compose exec api npx ts-node prisma/seed-e2e.ts
```

### 9.3 Verifier la sante

```bash
# Health check API
curl http://localhost:3000/api/health
# Reponse attendue : {"status":"ok"}
```

### 9.4 Lancer la qualification E2E

```bash
# Pre-requis : jq installe, stack running, seeds faits
cd e2e
bash e2e-qualification.sh

# Resultat attendu : 29/29 pass
```

### 9.5 Consulter les logs

```bash
# Tous les services
docker compose logs -f

# API seulement
docker compose logs -f api

# Frontend seulement
docker compose logs -f frontend

# PostgreSQL
docker compose logs -f postgres
```

### 9.6 Reset complet de l'environnement

```bash
# Reset en 1 commande (DB + MinIO + reseed)
bash e2e/reset-pilot.sh

# Ou manuellement :
docker compose exec api sh -c "\
  npx prisma migrate reset --force && \
  npx prisma db seed && \
  npx ts-node prisma/seed-e2e.ts"

# Purger les fichiers MinIO
docker compose exec minio sh -c "\
  mc alias set local http://localhost:9000 minioadmin minioadmin && \
  mc rm --recursive --force local/concept-files/ 2>/dev/null; echo OK"
```

### 9.7 Acceder aux services

| Service | URL | Identifiants |
|---------|-----|-------------|
| Frontend | http://localhost:8080 | Voir comptes section 5.4 |
| API | http://localhost:3000/api | — |
| Swagger docs | http://localhost:3000/api/docs | — |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| PostgreSQL | localhost:5432 | concept / concept_dev / concept_manager |

### 9.8 Etat des services Docker

```bash
docker compose ps
```

---

## 10. Ou chercher en cas de probleme

| Symptome | Fichier a verifier | Chemin |
|----------|--------------------|--------|
| Bug import CSV | ImportService | `api/src/import/import.service.ts` |
| Bug export FEC / Sage / EBP | ExportService | `api/src/export/export.service.ts` |
| Bug cashflow / previsionnel | DashboardService | `api/src/dashboard/dashboard.service.ts` |
| Bug offline / sync | SyncManager | `src/services/offline/syncManager.ts` |
| Bug offline / stockage local | Dexie DB | `src/services/offline/db.ts` |
| Bug idempotency (doublons) | IdempotencyInterceptor | `api/src/common/interceptors/idempotency.interceptor.ts` |
| Bug multi-tenant (fuite donnees) | CompanyGuard | `api/src/common/guards/company.guard.ts` |
| Bug RBAC (permissions) | RolesGuard | `api/src/common/guards/roles.guard.ts` |
| Bug auth / token | AuthService | `api/src/auth/auth.service.ts` |
| Bug PWA / cache | Vite PWA config | `vite.config.ts` (section VitePWA) |
| Bug planning | TeamPlanningService | `api/src/team-planning/team-planning.service.ts` |
| Bug facturation | InvoiceService | `api/src/invoices/invoices.service.ts` |
| Bug relances email | ReminderService | `api/src/reminders/reminders.service.ts` |
| Bug audit trail | AuditLogInterceptor | `api/src/common/interceptors/audit-log.interceptor.ts` |
| API ne demarre pas | Verifier logs | `docker compose logs api` |
| "Session expiree" | Token 15min | Re-login, c'est normal |
| Photos absentes | MinIO | `docker compose logs minio` |
| PWA ne se met pas a jour | Cache SW | Hard refresh navigateur |
| Sync offline bloquee | File d'attente | `/terrain/queue` → Forcer sync |
| Erreur 403 | Role utilisateur | Voir tableau RBAC section 4.4 |

---

## 11. Regles de decision pendant mon absence

### A corriger immediatement (BLOQUANT)

- Perte de donnees (saisie terrain disparue, sync qui efface)
- Fuite multi-tenant (un utilisateur voit les donnees d'une autre societe)
- FEC invalide empeche l'import comptable
- Crash de l'API (service down)
- Authentification cassee (impossible de se connecter)

**Action** : Corriger, retester, documenter dans `e2e/pilot-incidents.md`.

### A corriger sous 48h (CRITIQUE)

- Fonction degradee mais workaround possible
- Erreur d'affichage bloquant un workflow
- Sync offline partielle (certaines saisies ne passent pas)

**Action** : Documenter le workaround, corriger quand possible.

### A mettre en backlog (OPTIMISATION / NICE-TO-HAVE)

- Ameliorations UX (bouton mal place, couleur, libelle)
- Suggestions de nouvelles fonctionnalites
- Performance non critique (page qui met 3s au lieu de 1s)
- Rapport ou export supplementaire demande

**Action** : Noter dans `pilot-incidents.md` avec niveau OPTIM ou NICE. Ne pas coder.

### Quand me contacter en urgence

- Incident de securite (fuite de donnees, acces non autorise)
- Perte de donnees confirmee et non recuperable
- API down depuis plus de 2h sans solution identifiee
- Demande explicite du client de changer le scope du pilote

### Quand decider seul

- Correction de bugs mineurs (typo, libelle, style CSS)
- Reset de l'environnement si les donnees sont corrompues
- Re-execution de la qualification E2E apres un fix
- Reponse aux questions des utilisateurs pilotes sur le fonctionnement

### Classification rapide d'un incident

```
L'utilisateur peut-il continuer a travailler ?
├── NON → BLOQUANT → Corriger immediatement
└── OUI
    ├── Avec un workaround penible ? → CRITIQUE → Corriger sous 48h
    └── Sans impact reel ? → OPTIMISATION → Backlog
```

---

## 12. Roadmap post-pilote

Si le pilote est concluant (0 bloquant, KPIs atteints, signature 799 EUR/mois), les prochaines fonctionnalites prevues sont :

| Priorite | Feature | Description |
|:--------:|---------|-------------|
| 1 | **Fiche client 360°** | Vue unifiee par client : devis, chantiers, factures, paiements, historique. Permet au commercial de tout voir en un clic. |
| 2 | **KPI productivite** | Heures par chantier, par technicien, par equipe. Comparaison devis vs reel. Tableaux de bord conducteur. |
| 3 | **Alertes depassement heures** | Notification automatique quand les heures saisies depassent X% du budget prevu. Evite les marges negatives. |
| 4 | **Notifications push / SMS** | Alertes temps reel pour : nouveau planning, facture en retard, habilitation qui expire. Via push navigateur + SMS pour le terrain. |
| 5 | **Gantt multi-semaines** | Vue planning type Gantt sur 4-8 semaines. Drag & drop pour repositionner les chantiers. Vision macro pour le conducteur. |

---

## Annexes

### A. Structure du projet

```
concept-hub/
├── src/                  # Frontend React
│   ├── pages/            # Pages (Dashboard, Clients, Quotes, Jobs, etc.)
│   ├── components/       # Composants (layout, shared, terrain, dashboard, ui)
│   ├── services/api/     # Clients HTTP (30+ fichiers)
│   ├── services/offline/ # Offline : db, sync, compression
│   ├── contexts/         # AppContext (auth, company scope)
│   ├── types/            # Types TypeScript
│   └── hooks/            # Custom hooks
├── api/                  # Backend NestJS
│   ├── src/              # 28 modules (auth, clients, quotes, jobs...)
│   ├── prisma/           # Schema, migrations, seeds
│   └── Dockerfile
├── e2e/                  # Tests et documentation pilote
│   ├── e2e-qualification.sh    # 29 tests automatises
│   ├── reset-pilot.sh          # Reset 1 commande
│   ├── PILOT-RUNBOOK.md        # Scenario 2 semaines
│   ├── README-PILOT.md         # Quick start
│   ├── QUALIF-REPORT.md        # Checklist qualification
│   ├── pilot-incidents.md      # Journal incidents
│   └── import-*.csv            # Donnees test
├── docker-compose.yml    # 4 services
├── Dockerfile            # Frontend (nginx)
├── nginx.conf            # Reverse proxy
├── rules.md              # Spec backend
└── PASSATION.md          # Ce document
```

### B. Comptes de test

| Role | Email | MDP | Societe |
|------|-------|-----|---------|
| Admin ASP | admin@asp.fr | Demo1234! | ASP |
| Conducteur ASP | cond@asp.fr | Demo1234! | ASP |
| Comptable ASP | compta@asp.fr | Demo1234! | ASP |
| Technicien 1 | karim@asp.fr | Demo1234! | ASP |
| Technicien 2 | lucas@asp.fr | Demo1234! | ASP |
| Admin JS | admin@js.fr | Demo1234! | JS |

### C. KPIs Go/No-Go du pilote

| KPI | Cible | Comment mesurer |
|-----|-------|-----------------|
| Reduction papier | -80% fiches terrain | Compter fiches papier vs saisies app sur 5 jours |
| Export accepte comptable | FEC valide sans correction | Parseur FEC en ligne = 0 erreur |
| Temps validation heures | < 15 min/jour | Chrono : login → toutes heures validees |
| Usage previsionnel | Consultation quotidienne | Dashboard ouvert chaque jour (audit log) |
| Fiabilite offline | 0 perte de donnees | Toutes saisies offline arrivent en base |
| Idempotency | 0 doublon | Re-sync et re-import = pas de creation parasite |
| Adoption techniciens | 100% saisie app semaine 2 | Les 2 techs saisissent exclusivement via l'app |

---

*Bonne tenue du projet. En cas de doute, consulter le runbook (`e2e/PILOT-RUNBOOK.md`). En cas d'urgence, me contacter.*
