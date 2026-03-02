# ConceptManager — Handoff Backend pour Claude (à lire avant de coder)

## 0) Objectif
Tu prends le relais sur le **backend** d’un produit déjà maquetté (front Lovable) pour le transformer en application réellement utilisable.

**North Star produit :**
- Outil B2B “mini-ERP + Field Service Management” pour une entreprise de signalisation / aménagement urbain
- **Multi-entité** : “ASP SIGNALISATION” et “JS CONCEPT” + vue “GROUPE”
- **UX premium** : rapide, fluide, lisible, pas une usine à gaz, tout accessible en 1 clic
- Le front existe déjà et doit rester stable : tu raccordes un back sans casser l’UI.

---

## 1) Ton rôle (Claude)
Tu es le **Lead Backend Engineer**. Ta mission est de :
1. Mettre en place une API stable sous `/api/*` compatible avec le front existant.
2. Construire la **base de données** et les **migrations**.
3. Implémenter **auth**, **RBAC**, et **scoping multi-entité** (tenant).
4. Gérer **upload & stockage** des photos / pièces jointes (S3 compatible recommandé).
5. Ajouter **audit log** sur actions sensibles (validation heures, conversion devis→chantier, réception achats, exports).
6. Fournir une base déployable **sur VM Azure** au départ, et **portable on-prem** (chez le client) ensuite.

---

## 2) Contexte technique actuel (Front Lovable)
### Stack front
- Vite + React + TypeScript
- UI : shadcn/ui + composants métiers (DataTable, StatusBadge, Drawer, ActivityFeed, Kanban)
- Navigation : Sidebar desktop + Topbar + Bottom nav mobile pour Terrain
- RBAC & multi-entité : gérés en **démo** côté front

### Important : le front n’appelle pas encore `/api/*`
Le front consomme des données mock via :
- `src/services/mockData.ts`
- `src/services/mockDataExtended.ts`
- `src/services/terrainData.ts`

➡️ Donc ton backend doit introduire des routes `/api/*` **et** on basculera progressivement le front du mock vers l’API.
**Objectif : remplacer la source de données, pas réécrire les écrans.**

### Fonctionnalités UI déjà présentes (doivent être supportées côté back)
- **Devis** : Kanban + drawer (lignes, marge, PJ, activité) + actions (dupliquer, convertir en chantier)
- **Chantiers** : table + timeline + drawer avec onglets (infos, planning, équipe, photos, heures, achats liés, documents) + “Générer OS” (placeholder)
- **Achats** : workflow Demande → Commandé → Reçu (stepper) + PJ (BC/BL)
- **Atelier** : Kanban multi-étapes (BAT → fabrication → prêt → pose) + action “prochaine étape”
- **Facturation** : factures + situations + export placeholder
- **Dashboard** : “Command Center” (alertes : factures en retard, photos manquantes, heures non validées, commandes non reçues, BAT en attente)
- **Terrain mobile** : feuille de route du jour + fiche intervention (checklist, timer heures start/pause/stop, photos, commentaire, signature placeholder)
- **Offline terrain** : actuellement simulé (badge + queue fictive)

---

## 3) Contraintes fortes (à respecter)
### Déploiement
- Doit tourner :
  - sur **VM Azure** (Docker)
  - potentiellement **chez le client** (on-prem)
➡️ Donc : **Docker Compose**, pas de dépendance obligatoire à des services managés Azure.

### Sécurité
- Multi-entité strict :
  - tout objet métier appartient à une `company` (ASP/JS)
  - la vue “GROUPE” est réservée (admin/gérant)
- RBAC :
  - Admin/Gérant : global + validations + paramètres
  - Conducteur : devis, chantiers, planning, achats, atelier
  - Technicien : terrain mobile uniquement (ses interventions)
  - Comptable : facturation + exports
- Audit obligatoire sur actions sensibles.

### Compatibilité front
- Minimiser les changements UI.
- Si tu dois imposer une structure, fais-le via une couche “services API” côté front, mais côté backend expose une API simple et stable.

---

## 4) Choix d’architecture recommandés (tu peux ajuster, mais reste portable)
### Stack backend proposée
- **Node.js + TypeScript**
- Framework : **NestJS** (ou Fastify si tu préfères minimal)
- DB : **PostgreSQL**
- ORM : **Prisma** + migrations
- Fichiers : **MinIO** (S3 compatible) + metadata en DB
- Auth :
  - option simple : JWT access + refresh (DB)
  - option “enterprise” : Keycloak (possible plus tard)
➡️ Priorité : livrer vite et propre en JWT refresh, Keycloak en V2 si nécessaire.

### Packaging
- `docker-compose.yml` à la racine :
  - `api`
  - `postgres`
  - `minio`
  - (option) `caddy/traefik` pour TLS reverse proxy

---

## 5) Modèle de données (minimum “complet”)
> Tout doit contenir `companyId` sauf les objets purement “admin global”.

### Tables (suggestion)
- `Company` (ASP, JS) + possibilité “GROUPE” en vue logique (pas forcément une ligne)
- `User` (role, companyId, active)
- `Customer` (client)
- `Site` (chantier/adresse liée à customer)
- `Quote`
- `QuoteLine`
- `Job` (chantier / intervention)
- `JobAssignment` (job ↔ users/teams)
- `TimeEntry` (heures)
- `Attachment` (PJ/Photos/Docs) + lien polymorphe (quote/job/purchase/invoice)
- `Vendor` (fournisseur)
- `PurchaseOrder`
- `PurchaseLine`
- `Receipt` (réception, même simple)
- `WorkshopItem` (BAT/fabrication/pose) lié à job/quote
- `Invoice`
- `InvoiceSituation` (situations de travaux)
- `ActivityLog` (commentaires + actions visibles)
- `AuditLog` (actions sensibles, immuable)

### Enums (à définir clairement)
- QuoteStatus : `NEW | PRICING | SENT | ACCEPTED | REFUSED` (adapter au front)
- JobStatus : `TO_PLAN | PLANNED | IN_PROGRESS | DONE | INVOICED` (ou équivalent)
- PurchaseStatus : `REQUESTED | ORDERED | RECEIVED`
- WorkshopStatus : `BAT_PENDING | BAT_VALIDATED | FABRICATION | READY | INSTALL_PLANNED | INSTALLED`
- InvoiceStatus : `DRAFT | SENT | PAID | LATE`
- TimeEntryStatus : `DRAFT | SUBMITTED | APPROVED | REJECTED` (IMPORTANT : à ajouter, le front ne l’a pas encore en vrai)

---

## 6) API v0 (à implémenter en priorité)
> REST simple. Pagination/filtre ok mais pas overkill.

### Auth / profil
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET  /api/me`

### Multi-entité (scoping)
- Le front doit envoyer `X-Company-Id: ASP|JS|GROUP` (ou `companyId=...`)
- Côté API :
  - si `GROUP` → autorisé uniquement admin/gérant
  - sinon filtre strict sur `companyId`

### CRUD principaux
- `GET/POST /api/customers`
- `GET/POST /api/sites`
- `GET/POST /api/quotes`
- `GET/POST /api/jobs`
- `GET/POST /api/vendors`
- `GET/POST /api/purchase-orders`
- `GET/POST /api/workshop-items`
- `GET/POST /api/invoices`
- `GET/POST /api/time-entries`

### Actions métier (très importantes)
- `POST /api/quotes/:id/duplicate`
- `POST /api/quotes/:id/convert-to-job`
- `POST /api/time-entries/submit`
- `POST /api/time-entries/:id/approve`
- `POST /api/time-entries/:id/reject`
- `POST /api/purchase-orders/:id/mark-ordered`
- `POST /api/purchase-orders/:id/mark-received`
- `POST /api/workshop-items/:id/next-step`
- `POST /api/invoices/:id/export` (placeholder au début)

### Timeline / activité
- `GET /api/jobs/:id/timeline` (ou inclus dans job)
- `GET/POST /api/activity` (par entité, ex `?entity=job&id=...`)

### Fichiers (photos / PJ)
Option recommandée (portable, scalable) :
- `POST /api/files/presign`  -> retourne URL S3 + key
- `POST /api/files/complete` -> crée `Attachment` en DB et lie à une entité
Alternative simple :
- `POST /api/files/upload` multipart -> API push vers MinIO

---

## 7) Plan d’exécution (ordre conseillé)
### Phase 0 — Socle (obligatoire)
1) Docker Compose + Postgres + MinIO + API
2) Auth + RBAC + scoping company
3) Prisma schema + migrations + seed minimal (2 companies, 4 roles, jeux de données)

### Phase 1 — Core business (effet immédiat)
4) Quotes + QuoteLines + convert-to-job
5) Jobs + Assignments + Attachments + Activity
6) Time entries + workflow SUBMIT/APPROVE (avec audit)

### Phase 2 — Opérations
7) Purchases (PO + lines + reçus)
8) Workshop workflow
9) Invoices + situations + export placeholder

### Phase 3 — Durcissement
10) Audit log complet + logs structurés
11) Pagination/filtre serveur
12) Tests (smoke tests endpoints critiques)

---

## 8) “Definition of Done” (ce qu’on considère terminé)
Un module est “DONE” quand :
- Les endpoints sont stables + validés (DTO + validation)
- Le scoping company est impossible à contourner
- Les actions sensibles génèrent un `AuditLog`
- Les erreurs sont propres (status codes cohérents)
- Le front peut basculer du mock à l’API sans refonte d’UI

---

## 9) Points d’attention (pièges à éviter)
- **Ne pas laisser “GROUP” accessible** aux profils non admin/gérant.
- Ne pas coder des règles métier “dans le front” : tout ce qui est validation, statuts, transitions = backend.
- Ne pas multiplier les sources de vérité (types dispersés). Idéalement, un schéma Prisma + DTOs alignés.
- Terrain offline réel : option V2 si non cadrée, ne pas se noyer dedans au départ.

---

## 10) Résultat attendu
À la fin, on veut :
- Un backend déployable par Docker Compose (Azure VM / on-prem)
- Une API sous `/api/*`
- Une DB PostgreSQL propre (migrations + seeds)
- MinIO pour photos/PJ
- Auth/RBAC/Multi-entité solides
- Audit log
- Intégration progressive avec le front existant (remplacement des mocks par appels API)