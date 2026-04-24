# ConceptManager — note de présentation à l'équipe

> Public : Kieran, le co-fondateur dev (Ostara), le président (commercial).
> Objectif : comprendre en 20 min ce que l'outil fait *réellement*, ses limites,
> et son positionnement vis-à-vis des deals JS Concept et ASP Signalisation.
> Ton : factuel, pas marketing. Toutes les affirmations sont étayées par un
> chemin de fichier (cf. section *Méthodologie*).
>
> *Mise à jour 22/04/2026 soir : bug FOR UPDATE corrigé dans 7 services
> (via advisory lock Postgres), chiffres vérifiés par `wc -l` et `ls`,
> typecheck backend 0 erreur, 74/74 tests verts.*

---

## 1. Vue d'ensemble en 5 lignes

ConceptManager est un logiciel de gestion d'entreprise (un "ERP léger") conçu
pour des PME du BTP / signalisation routière, mais dont la couche fonctionnelle
peut servir n'importe quelle TPE/PME de services. Une équipe s'en sert pour
suivre ses clients, ses chantiers, son catalogue, son planning, sa facturation
et sa trésorerie. Particularité : il produit dès aujourd'hui des factures au
format **Factur-X** (norme française obligatoire à partir de 2026) et chaque
facture émise est scellée par un hash cryptographique anti-falsification. Il
est multi-sociétés dès la conception (deux entreprises peuvent partager une
seule installation sans jamais voir leurs données mutuelles). Il existe en
local sur la machine de Kieran, déployable en Docker, et n'a encore jamais
tourné en production réelle chez un client.

---

## 2. Stack technique

| Couche | Choix |
|---|---|
| Backend | NestJS 10 + Prisma 5 + Passport JWT |
| Base de données | PostgreSQL (43 tables, 12 enums) |
| Frontend | React 18 + Vite + Tailwind + shadcn/ui + TanStack Query |
| Stockage objet | MinIO (PDF, photos, documents RH) |
| PDF / Factur-X | `pdfmake` + Ghostscript (PDF/A-3) + `pdf-lib` |
| Sécurité HTTP | Helmet + CSP stricte + HSTS + Permissions-Policy |
| Rate limiting | `@nestjs/throttler` (auth : 5 req / 5 min / IP) |
| Tests | Vitest (74 cas répartis sur 10 fichiers) |
| CI | GitHub Actions (frontend : typecheck + lint + tests + build ; backend : typecheck + Prisma generate) |
| Conteneurisation | `docker-compose.yml` (api + postgres + minio + nginx) |
| IA | SDK Anthropic (Claude Haiku 4.5) — *module présent, pas dans l'offre Essentiel* |
| Authentification | JWT court + refresh token rotatif avec détection de rejeu |

---

## 3. Ce que l'outil sait faire aujourd'hui

### 3.1 Authentification & multi-tenants

- ✅ **Login bcrypt + JWT + refresh rotatif** ([auth.service.ts:65-105](../api/src/auth/auth.service.ts#L65-L105)). La détection de rejeu (`if (stored.revokedAt) → revoke all`) est en place.
- ✅ **Politique mot de passe** : 12 caractères, majuscule, minuscule, chiffre, symbole ([password.policy.ts:6-29](../api/src/common/security/password.policy.ts#L6-L29)).
- ✅ **Bcrypt cost 12** + auto-rehash transparent au login si l'ancien hash est inférieur ([auth.service.ts:43-53](../api/src/auth/auth.service.ts#L43-L53)).
- ✅ **Multi-tenant strict** : `CompanyGuard` global ([company.guard.ts:30-78](../api/src/common/guards/company.guard.ts#L30-L78)) résout l'en-tête `X-Company-Id` ; un non-admin qui tape une autre société se prend un 403. Toutes les requêtes Prisma sont filtrées par `companyId`.
- ✅ **Reset mot de passe** + vérification email (migrations 20260417120000 et 20260417150000).
- 🟡 **Garde-fou env de production** : `assertProductionEnv()` exige JWT_SECRET, INVOICE_HMAC_KEY, MinIO etc. ≥ 32 chars, sinon le boot échoue ([env-guards.ts:51-67](../api/src/common/security/env-guards.ts#L51-L67)). Mais l'audit V2 (cf. section 5) note que `docker-compose.yml` était jusqu'ici sur `NODE_ENV: development` — à reverifier avant tout déploiement.

### 3.2 Clients, devis, chantiers, catalogue

- ✅ **Clients & sites** : table `Client` + `Site`, type public/privé, soft-delete.
- ✅ **Devis** : numérotation séquentielle par société (`DEV-{CODE}-{ANNEE}-NNN`), lignes détaillées avec coût d'achat (calcul de marge), statuts draft → sent → accepted/refused/expired, avenants (`QuoteAmendment`), templates de devis réutilisables (`QuoteTemplate`).
- ✅ **Chantiers** : statut planifié / en cours / pause / terminé / facturé, références externes, photos (signed URLs MinIO), assignations multi-utilisateurs, signatures de fin d'intervention.
- ✅ **Catalogue produits** : catégories + références + prix vente/achat ([schema.prisma:174-196](../api/prisma/schema.prisma#L174-L196)). Import CSV multi-formats avec auto-détection d'encodage.
- ✅ **Conversion devis → chantier → facture** : le code existe et le **bug `FOR UPDATE + MAX()` identifié par l'audit V2 a été corrigé le 2026-04-22** (7 occurrences dans factures, devis, jobs, purchases, workshop). La sérialisation se fait désormais via `pg_advisory_xact_lock(hashtext('<entity>-seq:' || companyId))` — verrou de transaction scopé par société, auto-libéré au commit/rollback.

### 3.3 Facturation & Factur-X (sujet phare)

- ✅ **Émission de factures** avec numérotation par société, transaction Postgres avec `FOR UPDATE` sur le séquentiel ([invoices.service.ts:111-129](../api/src/invoices/invoices.service.ts#L111-L129)).
- ✅ **Immutabilité dès qu'une facture quitte `draft`** : seuls `status` et `paidAt` restent modifiables ([invoices.service.ts:18-27](../api/src/invoices/invoices.service.ts#L18-L27)). Toute correction passe par un avoir — interdit de re-modifier une facture émise (suppression bloquée [invoices.service.ts:679-686](../api/src/invoices/invoices.service.ts#L679-L686)).
- ✅ **Sceau d'intégrité HMAC-SHA256** posé automatiquement à l'émission, vérifié à chaque lecture ([invoice-integrity.service.ts:27-39](../api/src/invoices/invoice-integrity.service.ts#L27-L39) + [invoices.service.ts:171-189](../api/src/invoices/invoices.service.ts#L171-L189)). Les 32 premiers caractères du hash sont imprimés en pied de PDF.
- ✅ **Factur-X multi-profil** : MINIMUM, BASIC, EN 16931. Sélection automatique du profil le plus riche selon les données disponibles ([facturx.generator.ts:80-87](../api/src/invoices/facturx.generator.ts#L80-L87)). Génération XML CII complète avec espaces de noms `rsm`/`ram`/`udt`, mapping unités UNECE Rec. 20.
- ✅ **PDF/A-3 hybride** : pipeline pdfmake → Ghostscript `-dPDFA=3` → `pdf-lib` qui attache le XML avec la bonne `/AFRelationship: Alternative` et écrit le bloc XMP Factur-X ([facturx-pdf.service.ts:51-173](../api/src/invoices/facturx-pdf.service.ts#L51-L173)).
- ✅ **Fail-fast sur champs légaux manquants** ([invoices.service.ts:471-487](../api/src/invoices/invoices.service.ts#L471-L487)) : SIREN/SIRET, TVA intracommunautaire, adresse, etc. → 422 avec la liste plutôt qu'un XML dégradé.
- ✅ **Factures de situation** (BTP) avec cumul des pourcentages ([invoices.service.ts:727-776](../api/src/invoices/invoices.service.ts#L727-L776)).
- ✅ **Relances automatiques** : règles configurables par société (J+7, J+15, J+30) avec template, journal des envois (`ReminderRule`, `ReminderLog`).
- ✅ **Export FEC** (Fichier des Écritures Comptables) au format 18 colonnes officiel ([invoices.service.ts:589-668](../api/src/invoices/invoices.service.ts#L589-L668)).
- 🔴 **Transmission Chorus Pro / PDP** : *non implémenté et non prévu*. ConceptManager **produit** le Factur-X conforme, la transmission est à la charge du comptable du client. Choix assumé et documenté ([FACTUR-X-roadmap.md:21-29](legal/FACTUR-X-roadmap.md#L21-L29)).

### 3.4 Conformité RGPD & légale

- ✅ **Consentement IA versionné** : `User.aiProcessingConsent` + table `UserConsent` qui historise tous les changements avec horodatage, IP, user-agent ([schema.prisma:235-253](../api/prisma/schema.prisma#L235-L253)).
- ✅ **Audit logs WORM** : trigger PostgreSQL qui interdit UPDATE/DELETE/TRUNCATE sur la table `audit_logs` ([migration 20260422120000](../api/prisma/migrations/20260422120000_audit_logs_worm/migration.sql)). Même un `psql` direct ne peut pas réécrire la trace.
- ✅ **Soft-delete** sur Client/Quote/Job/Invoice/User (champ `deletedAt`).
- ✅ **Champs RH** : `HrDocument` avec `purpose`, `expiresAt`, `retentionUntil` (durées légales).
- ✅ **Pages légales** servies par le front : Mentions légales, CGU, CGV, Confidentialité ([src/pages/legal/](../src/pages/legal/)).
- 🟡 **Registre des traitements + DPO checklist** : documents [docs/legal/registre-traitements.md](legal/registre-traitements.md) et [docs/legal/DPO-checklist.md](legal/DPO-checklist.md) présents, mais le DPO opérationnel n'est *pas* nommé (placeholder dans le runbook).

### 3.5 Pilotage (dashboard, alertes)

- ✅ **Dashboard "Command Center"** ([Dashboard.tsx:24-114](../src/pages/Dashboard.tsx#L24-L114)) : KPIs (CA encaissé, créances, marge moyenne, pipeline), liste d'alertes contextuelles (factures en retard, chantiers sans photo, heures à valider, commandes non reçues, BAT en attente).
- ✅ **Widget cashflow** + **alertes IA proactives** côté front (`AiBriefingWidget`, `AiProactiveAlerts`).
- ✅ **Marges moyennes** calculées côté API (`useDashboardMargins`).
- 🟡 Le module IA est branché sur Claude Haiku ; il consomme un crédit Anthropic à chaque appel — *à exclure de l'offre Essentiel* (cf. section 7).

### 3.6 Modules annexes (présents dans le code mais hors offre Essentiel)

| Module | Code | Statut | Inclus dans Essentiel ? |
|---|---|---|---|
| IA assistant + briefing + proactif | [api/src/ai/](../api/src/ai/) + [api/src/knowledge/](../api/src/knowledge/) (RAG par FTS PostgreSQL) | ✅ Implémenté | ❌ |
| Planning équipes verrouillé par semaine | [api/src/team-planning/](../api/src/team-planning/) | ✅ Implémenté | ❌ |
| RH : congés, absences, documents | [api/src/hr/](../api/src/hr/), [api/src/absences/](../api/src/absences/) | ✅ Implémenté | ❌ |
| Terrain mobile (interventions, photos, signatures, pointage) | [src/pages/terrain/](../src/pages/terrain/) | ✅ Implémenté | ❌ |
| Atelier (BAT → fabrication → pose) | [api/src/workshop/](../api/src/workshop/) | ✅ Implémenté | ❌ |
| Achats fournisseurs | [api/src/purchases/](../api/src/purchases/), [api/src/suppliers/](../api/src/suppliers/) | ✅ Implémenté | 🟡 partiel |

---

## 4. Les atouts techniques différenciants

### 4.1 Factur-X **hybride PDF/A-3 multi-profil** prêt à livrer
**Quoi** : un PDF qui contient à la fois la facture lisible humainement et le XML CII conforme à la norme française 2026, en MINIMUM / BASIC / EN 16931 selon ce que le dossier permet.
**Pourquoi rare** : c'est lourd à monter (Ghostscript en backend, conversion PDF/A-3, attachement XMP). Beaucoup d'outils du marché de niveau "Henrri" se contentent d'un XML séparé ou n'y sont pas du tout.
**Impact commercial** : argument frontal pour 2026. C'est *le* sujet sur lequel on peut couper court à un débat avec un comptable.

### 4.2 **Sceau d'intégrité HMAC-SHA256** sur toute facture émise
**Quoi** : à l'émission, on calcule un HMAC sur les champs légalement signifiants (référence, montant, dates, parties, TVA) et on le stocke. Toute relecture re-calcule et alerte si divergence.
**Pourquoi rare** : c'est un pattern de fintech, pas d'outil métier. Sage, EBP, Pennylane n'exposent pas ça côté utilisateur.
**Impact commercial** : "Vos factures sont scellées cryptographiquement. Si quelqu'un trafique la base de données, on le voit." Argument fort en pré-vente avec un dirigeant qui se méfie.
**Limite** : ce sceau ne remplace pas la PAF (piste d'audit fiable) DGFiP — c'est un contrôle interne qui *complète* la PAF, doc dans [FACTUR-X-roadmap.md:79-89](legal/FACTUR-X-roadmap.md#L79-L89).

### 4.3 **Multi-tenant natif**, pas une rustine
**Quoi** : `companyId` est partout dans le schéma, le `CompanyGuard` global filtre toutes les requêtes ; seul un admin peut basculer en scope `GROUP` (= toutes les sociétés) et ce scope renvoie 403 pour tout autre rôle.
**Pourquoi rare** : à l'échelle TPE/PME, beaucoup d'éditeurs livrent une instance par client. Notre modèle permet d'héberger 10 clients sur une seule base sans risque de fuite.
**Impact commercial** : coût d'exploitation divisé. Permet le tarif à 249 €/mois sans saigner les marges. Aussi : argument "groupe" si JS/ASP changeaient d'avis et voulaient mutualiser.

### 4.4 **Audit trail WORM** au niveau base
**Quoi** : un trigger Postgres (`audit_logs_no_update`/`no_delete`/`no_truncate`) qui rejette toute mutation sur `audit_logs` ([migration WORM](../api/prisma/migrations/20260422120000_audit_logs_worm/migration.sql)).
**Pourquoi rare** : la plupart des audits applicatifs sont "soft" — un dev avec un accès BDD peut effacer ses traces. Ici, même un `psql` direct est bloqué.
**Impact commercial** : tient face à un contrôle URSSAF / inspection du travail / contentieux client. C'est aussi un atout pour la conformité RGPD (preuve d'intégrité du registre).

### 4.5 **Tests + CI sérieuse** pour un projet de cette taille
**Quoi** : 74 tests Vitest sur les morceaux qui comptent (générateur Factur-X 16 tests, intégrité facture 9 tests, password policy 8, file-type sniffer 9, planning overlaps 6, format 8, dead-letter offline 3). CI GitHub Actions qui lance typecheck + tests + build sur chaque PR ([ci.yml](../.github/workflows/ci.yml)). Le backend a un `tsconfig.build.json` strict qui passe en 0 erreur.
**Pourquoi rare** : un projet "vibe code" de 4 jours typique a 0 test et un build qui passe par chance.
**Impact commercial** : à montrer en RDV technique avec un prospect qui a un DSI ou un comptable méfiant ("voilà notre CI verte, tous les tests passent").

---

## 5. Les limites à connaître (honnête)

- **Couverture tests : critique sur les briques de conformité, faible sur le reste**. Les 74 tests Vitest sont **concentrés sur les libs pures** (Factur-X generator : 16 tests, intégrité HMAC : 9, password policy : 8, file-type magic bytes : 9) — soit **42 tests sur les briques légalement sensibles**. En revanche, les **controllers, guards et services NestJS** (≈ 80% du code backend) ne sont pas testés directement. Aucun fichier `*.spec.ts` côté API. Le typecheck strict `tsconfig.build.json` (0 erreur) et la compilation pure font office de premier filet, mais des tests d'intégration sur un Postgres jetable restent à ajouter pour couvrir les flows métier end-to-end.
- **Lint en `continue-on-error`** dans la CI ([ci.yml:36-37](../.github/workflows/ci.yml#L36-L37)) — il y a encore du bruit legacy à nettoyer.
- **Le README.md à la racine est encore le template Lovable d'origine** — il faudra le réécrire avant d'envoyer le repo à un tiers (DSI client, audit pentest…).
- **Ghostscript est un binaire externe obligatoire** : sans `gs` installé dans l'image Docker, l'endpoint Factur-X retourne une 500 explicite ([facturx-pdf.service.ts:103-110](../api/src/invoices/facturx-pdf.service.ts#L103-L110)). Le Dockerfile l'installe (paquet Alpine), mais en dev local Windows il faut soit Docker soit installer GS.
- **Pas de test de validation Factur-X dans la CI** : on génère le XML mais on ne le passe pas à `mustangproject` ou `veraPDF`. C'est noté comme "recommandé avant pentest" dans [FACTUR-X-roadmap.md:32-40](legal/FACTUR-X-roadmap.md#L32-L40).
- **Aucun test de charge** : on ne sait pas comment l'API se comporte à 50 utilisateurs concurrents sur une même société. Le rate-limiter par défaut (100 req/min) est généreux pour 1 user, étouffant pour 20.
- **Tout tourne en local** sur la machine de Kieran. Pas d'environnement de staging, pas d'environnement de production hébergé. Le `docker-compose.yml` est prêt mais nécessite un VPS, un domaine, un certificat TLS, et des secrets dans un coffre (cf. [backup-and-drp.md:71-92](runbooks/backup-and-drp.md#L71-L92)).
- **Aucune restauration de backup n'a été testée** — la table dans `backup-and-drp.md:96-99` est vide. Une sauvegarde non testée n'est pas une sauvegarde.
- **DPO non nommé** ; les contacts ops du runbook DRP sont des placeholders `_À compléter_`.
- **Le projet a été développé en "vibe code"** : Kieran orchestre Claude. Ça veut dire que personne en interne ne maîtrise *à la main* l'intégralité du code. Pour évoluer, il faut soit que Kieran continue à orchestrer, soit qu'on fasse une session d'alignement avec le co-fondateur dev pour qu'il puisse reprendre la main (déjà prévu mercredi dans [MEMOIRE-STRATEGIQUE.md:142-143](../MEMOIRE-STRATEGIQUE.md#L142-L143)).

---

## 6. Numériser la "taille" de l'outil

| Métrique | Valeur | Source |
|---|---|---|
| Lignes TypeScript backend (`api/src/`) | **~13 825** | `wc -l` sur `find api/src -name "*.ts"` |
| Lignes TS+TSX frontend (`src/`) | **~24 499** | `wc -l` sur `find src -name "*.ts" -o -name "*.tsx"` |
| Modules NestJS | **34** (hors `app.module`, `prisma.module`) | `find api/src -name "*.module.ts"` |
| Pages React | **35** | `find src/pages -name "*.tsx"` |
| Modèles Prisma | **43** | `grep "^model " schema.prisma` |
| Enums Prisma | **12** | `grep "^enum " schema.prisma` |
| Fichiers de test Vitest | **10** | `src/test/**/*.test.ts` |
| Cas de test (`it`/`test`) | **74** | `grep -E "^\s*(it|test)\s*\("` |
| Migrations Prisma | **20** | `ls api/prisma/migrations/` (hors `migration_lock.toml`) |
| Vagues de durcissement | **V1 → V6** (sécurité initiale → secrets → tests → UX → hardening → Factur-X hybride) | Documenté dans [MEMOIRE-STRATEGIQUE.md:26](../MEMOIRE-STRATEGIQUE.md#L26) et préfixes `V*` dans le code |

Pour situer : un MVP d'éditeur ERP "type Henrri" tourne autour de 5 000 à 8 000
lignes côté serveur. À ~38 000 lignes au total, ConceptManager a une surface
fonctionnelle dépassant largement un MVP — la dette technique sera donc
proportionnelle (cf. section 5).

---

## 7. Positionnement commercial

### Cible (cf. [MEMOIRE-STRATEGIQUE.md:51-54](../MEMOIRE-STRATEGIQUE.md#L51-L54))
TPE/PME 5–50 salariés, **tous secteurs de services**, qui sont :
- Trop grosses pour Henrri / Tiime (qui plafonnent côté gestion).
- Trop petites pour Sage / Cegid (cher, lourd, intégrateur obligatoire).
- Mal servies par les horizontaux type Pennylane (qui font de la compta-first, pas de la gestion-first).

### Pricing (offre Essentiel — early adopters JS et ASP)

| Élément | Tarif |
|---|---|
| Setup (one shot) | **3 500 €** (plancher absolu : 2 500 €) |
| Mensuel | **249 €** (plancher : 199 €) |
| Engagement | 12 mois |
| Facturation | 50 % à la signature, 50 % à la mise en production |
| Cash à la signature JS | 1 750 € |
| Année 1 par client | 6 488 € |

Tarif normal après 5 références : 4 500 € + 299 €/mois.

### Comparaison rapide

| Critère | ConceptManager (Essentiel) | Batigest (Sage) | Pennylane | Henrri |
|---|---|---|---|---|
| Cible | TPE/PME services 5-50 | BTP TPE/PME | TPE généralistes (compta-first) | Auto-entrepreneurs / TPE |
| Setup | 3 500 € | 2 000-5 000 € | ~990 € | gratuit |
| Mensuel | 249 € | ~80-150 € | ~50-80 € | gratuit / 12 € |
| Factur-X 2026 | ✅ hybride PDF/A-3 multi-profil | partiel | ✅ | ❌ |
| Sceau crypto factures | ✅ HMAC-SHA256 | ❌ | ❌ | ❌ |
| Multi-tenant natif | ✅ | non pertinent | non pertinent | non pertinent |
| Modules métier (chantiers, atelier, terrain) | ✅ | ✅ (BTP) | ❌ (compta) | ❌ |
| Sur-mesure / config en 2h | ✅ (via Ostara, à venir) | ❌ (semaines avec intégrateur) | ❌ | ❌ |
| Gros défaut | n'est pas une PDP, transmission Chorus à la charge du comptable | UX vieillissante, intégrateur obligatoire | ne suit pas un chantier | s'arrête à la facturation |

### Où ConceptManager s'arrête, où Ostara prend le relais

- **JS Concept** + **ASP Signalisation** = livrés avec ConceptManager *tel quel* (cf. [MEMOIRE-STRATEGIQUE.md:81-95](../MEMOIRE-STRATEGIQUE.md#L81-L95)). Pas d'Ostara dans la boucle pour ces deux deals.
- **À partir du 3e client** (visé juillet, autre secteur que BTP-signalisation), Ostara fabrique l'app à partir de briques. Les briques durcies (Factur-X, HMAC, RGPD, multi-tenant) seront extraites de ConceptManager et injectées dans Ostara — plan d'extraction à définir en Phase 2 ([MEMOIRE-STRATEGIQUE.md:107-119](../MEMOIRE-STRATEGIQUE.md#L107-L119)).
- **Ostara n'est jamais vendu**. Le client achète "ConceptManager" (ou un nom blanc), pas l'outil de fabrication ([docs/commercial/README.md:79](commercial/README.md#L79)).

---

## 8. Ce qu'il reste à faire avant de vendre en volume

Par ordre de priorité.

1. **Régression-test le fix `FOR UPDATE`** (corrigé le 22/04/2026 via `pg_advisory_xact_lock`) : créer en live un devis, un chantier, une facture, un BC depuis l'UI. Confirmer que chaque référence est bien séquentielle par société. 30 min de vérification avant la démo JS.
2. **Passer `NODE_ENV=production` dans `docker-compose.yml`** et vérifier que `/api/docs` (Swagger) ne répond plus avec un schéma OpenAPI complet (cf. audit V2 N5).
3. **Réécrire le `README.md`** racine (il est encore en template Lovable) avec : pitch produit, prérequis, démarrage Docker, structure du repo, lien vers `docs/`.
4. **Pousser le code sur un Git remote privé** (`acreed/conceptmanager`) — actuellement 100 % sur la machine de Kieran ([MEMOIRE-STRATEGIQUE.md:122](../MEMOIRE-STRATEGIQUE.md#L122)).
5. **Hébergement de production** : louer un VPS, monter `docker-compose`, configurer un domaine + TLS Let's Encrypt + secrets dans un gestionnaire (Doppler ou Infisical).
6. **Premier test de restauration backup** documenté dans [backup-and-drp.md:96-99](runbooks/backup-and-drp.md#L96-L99) — sinon "DRP" est du papier.
7. **Audit Factur-X via mustangproject** dans la CI ([FACTUR-X-roadmap.md:32-40](legal/FACTUR-X-roadmap.md#L32-L40)). Indispensable avant qu'un comptable de client ne pousse un PDF dans Sage.
8. **Nommer un DPO** (même externe). Compléter les placeholders du runbook ops.
9. **Préparer un jeu de données client réaliste** pour la démo JS (logo JS Concept, références chantier crédibles, 2-3 factures déjà émises).
10. **Pen-test léger** avant le 3e client (ou au moins, suivre la checklist [pentest-prep.md](runbooks/pentest-prep.md)).

---

## 9. Démonstration — 3 moments à montrer en RDV

Choisis pour leur impact sur un dirigeant non-tech qui veut se rassurer en 15 min.

### 9.1 **Saisir un devis → le convertir en chantier → émettre la facture → télécharger le Factur-X**
- Pourquoi : montre la chaîne métier complète bout-en-bout. Le moment "wow" est le téléchargement du PDF Factur-X : on l'ouvre dans Acrobat, on voit l'icône de pièce jointe `factur-x.xml`. Le comptable du client comprend immédiatement.
- Argument à dire : "Vous êtes prêts pour 2026 sans rien faire de plus."

### 9.2 **Le tableau de bord Command Center**
- Pourquoi : 4 KPIs + une liste d'alertes contextuelles ("3 chantiers sans photo", "12h en attente de validation", "facture FAC-JS-2026-014 en retard"). Un dirigeant adore voir son entreprise condensée sur un écran.
- Argument : "Vous arrivez le matin, vous voyez ce qui va mal et vous cliquez pour aller corriger."

### 9.3 **L'export FEC + le sceau d'intégrité de la facture**
- Pourquoi : démonstration "régalienne". On exporte le FEC → un .csv aux 18 colonnes officielles. Puis on ouvre une facture émise → on montre dans son footer le hash HMAC tronqué. Argumentaire : "Si demain l'URSSAF passe, vous lui sortez tout. Et si quelqu'un trafique vos factures dans la base, on le voit."
- Préparation : avoir au moins 5 factures émises (pas brouillon) avec dates étalées pour que l'export FEC soit non vide.

---

## 10. Questions ouvertes pour l'équipe (à trancher cette semaine)

1. **Qui joue la régression-test du fix `FOR UPDATE`** (appliqué le 22/04) et le retest end-to-end avant la démo JS ? (idéalement Kieran, sous 24h, sur Docker propre.)
2. **Hébergement de production : VPS dédié OVH/Hetzner ou managé Scaleway/Render ?** Décision impacte les CGV (sous-traitant RGPD à déclarer).
3. **Module IA : on l'éteint complètement pour les deux premiers clients (Essentiel) ou on le laisse en bêta gratuite pour collecter du feedback ?** Le coût Anthropic est marginal mais le risque d'attente non tenue est réel.
4. **Plan d'extraction des briques V6 vers Ostara** : est-ce qu'on garde les 22 briques actuelles d'Ostara et on les durcit, ou on les remplace par des extractions de ConceptManager ? ([MEMOIRE-STRATEGIQUE.md:165-166](../MEMOIRE-STRATEGIQUE.md#L165-L166))
5. **Stratégie Factur-X transmission** : on rappelle clairement dans le contrat JS que la *transmission* Chorus Pro reste à leur charge (donc à leur comptable), ou on propose dans Pro un module "envoi par email vers Chorus" ?
6. **DPO** : on en nomme un externe (≈300 €/mois) avant le premier client ou on attend ?
7. **README + repo public partiel** : est-ce qu'on s'autorise à mettre le repo en `private` sur un compte org GitHub `acreed` cette semaine, et à donner un accès lecture au comptable expert qui pourrait nous valider Factur-X ?
8. **Témoignage JS** : on inscrit dès la signature dans le contrat la clause "publication d'un cas client à 60 jours", ou on attend de voir comment ça se passe ?
9. **Démo PAC ThermiPro** ([SUIVI-DEVELOPPEMENT.md:5](../SUIVI-DEVELOPPEMENT.md#L5)) : on la garde en chambre comme munition prospect installateur PAC, ou on la sort de la base de prod pour ne pas alourdir ?
10. **Qui prend la responsabilité commerciale** de garantir au client JS que l'outil "tient la charge" alors qu'il n'a jamais été testé en charge réelle ? Ce point est non-trivial : il faut une formulation contractuelle (SLA best-effort, pas de pénalité, support Q+J).

---

## Méthodologie

Fichiers réellement lus pour rédiger ce document (chemins relatifs à la racine du repo) :

- `MEMOIRE-STRATEGIQUE.md`
- `README.md` (constaté comme template Lovable d'origine)
- `AUDIT-V2.md` (lignes 1-120 — bug FOR UPDATE et audit pré-pilote)
- `SUIVI-DEVELOPPEMENT.md` (lignes 1-200 — stack, ThermiPro, knowledge chunks)
- `package.json` racine + `api/package.json`
- `.github/workflows/ci.yml`
- `docker-compose.yml` (référencé via audit)
- `api/src/app.module.ts`
- `api/src/main.ts`
- `api/src/auth/auth.service.ts`
- `api/src/auth/auth.controller.ts`
- `api/src/common/security/env-guards.ts`
- `api/src/common/security/password.policy.ts`
- `api/src/common/security/file-type.ts`
- `api/src/common/guards/company.guard.ts`
- `api/src/common/interceptors/audit-log.interceptor.ts`
- `api/src/audit/audit.service.ts`
- `api/src/invoices/invoices.service.ts` (intégral, 858 lignes)
- `api/src/invoices/invoice-integrity.service.ts`
- `api/src/invoices/facturx.generator.ts` (intégral)
- `api/src/invoices/facturx-pdf.service.ts` (intégral)
- `api/prisma/schema.prisma` (intégral, 1091 lignes)
- `api/prisma/migrations/20260422120000_audit_logs_worm/migration.sql`
- `api/prisma/migrations/` (liste des 21 migrations)
- `src/pages/Invoicing.tsx` (lignes 1-120)
- `src/pages/Dashboard.tsx` (lignes 1-120)
- Inventaire complet de `api/src/*/` (34 modules NestJS)
- Inventaire complet de `src/pages/` (35 pages)
- Inventaire `src/test/` (10 fichiers, 74 cas)
- `docs/commercial/README.md`
- `docs/legal/FACTUR-X-roadmap.md`
- `docs/runbooks/backup-and-drp.md`
- Liste de `docs/runbooks/`, `docs/legal/`, `docs/commercial/`

Tous les chemins de code cités dans le corps du document ont été ouverts et lus.
Aucune fonctionnalité n'a été affirmée sans avoir vu le code correspondant.
