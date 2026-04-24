# ConceptManager — Audit V2 : Validation pre-pilote

> **Date** : 18 mars 2026
> **Auditeur** : Audit senior QA + Architecture + Securite + Produit
> **Perimetre** : Validation post-corrections P0/P1, robustesse reelle, risques residuels
> **Objectif** : Autoriser ou refuser la mise en pilote client reel

---

## 1. Resume executif

### Etat global

Le produit est **fonctionnellement riche** et **architecturalement solide** dans son design multi-tenant. Les corrections P0/P1 sont effectives. La qualification E2E (29/29) valide les workflows cles (import, export, cashflow, idempotency).

**Cependant, un bug critique bloquant a ete decouvert** : la creation d'entites via l'API (devis, factures, chantiers, commandes, items atelier) echoue systematiquement avec une erreur PostgreSQL `FOR UPDATE is not allowed with aggregate functions`. Ce bug est pre-existant (present depuis le commit initial) mais **rend l'outil inutilisable en conditions reelles** : un gerant ne peut pas creer de nouveau devis.

### Verdict

## **NO-GO en l'etat — GO sous conditions apres correction du bug critique**

Le bug `FOR UPDATE + MAX()` doit etre corrige avant tout pilote. Une fois corrige, le produit est eligible pour un pilote avec surveillance renforcee.

### Niveau de risque

| Axe | Niveau | Justification |
|-----|--------|---------------|
| Stabilite | **Critique** (1 bug bloquant) | Creation devis/factures/chantiers impossible |
| Securite | **Modere** | Isolation tenant OK, mais stack traces exposees sur erreurs |
| Robustesse | **Bon** | Validation input, rate limiting, soft delete fonctionnels |
| Produit | **Bon** | Richesse fonctionnelle, UX terrain solide |
| Donnees | **Faible risque** | Donnees seed credibles (sauf imports E2E a nettoyer) |

---

## 2. Validation des P0/P1

| ID | Correction | Statut | Preuve | Risque residuel |
|----|-----------|--------|--------|-----------------|
| **P0-1** | companyId null → QuoteTemplates | **OK robuste** | `X-Company-Id: GROUP` → 403 "Requires company scope". Teste avec admin, conducteur, technicien. | Aucun. Le pattern `requireCompany()` est defensif. |
| **P0-2** | Build masque erreurs (|| true) | **OK robuste** | Dockerfile ne contient plus `|| true` ni `--noEmitOnError false`. Build echouerait sur erreur TS. | Aucun. |
| **P0-3** | mockUsers exposes | **OK robuste** | `mockUsers` supprime de AppContext.tsx. Aucun composant ne le reference. | Aucun. |
| **P1-1** | Cashflow 30/60/90j identiques | **OK fragile** | Outflows filtres par `estimatedPaymentDate`. Logique correcte. Mais avec les donnees seed, les 3 projections restent identiques (toutes les echeances < 30j). | Avec des donnees reelles etendues, les projections differentieront. OK pour un pilote si le client a des echeances a > 30j. |
| **P1-2** | Swagger expose en prod | **OK robuste** | Code conditionne par `NODE_ENV !== 'production'`. | **Attention** : docker-compose.yml utilise `NODE_ENV: development`. En deploiement production, il faut s'assurer que `NODE_ENV=production`. |
| **P1-3** | JWT secret dev | **OK robuste** | Fallback supprime. Secret 64 chars genere dans docker-compose. `process.env.JWT_SECRET!` dans auth.module.ts et jwt.strategy.ts. | Aucun. |
| **P1-7** | Fail-fast JWT_SECRET | **OK robuste** | `main.ts` verifie `JWT_SECRET.length < 32` au boot et `process.exit(1)`. | Aucun. |
| **P1-5** | Disque 82% | **OK** | Disque a 56% apres nettoyage Docker. | Surveillance a maintenir pendant le pilote. |
| **P1-4** | Qualification E2E | **OK** | 29/29 PASS documente dans QUALIF-REPORT.md. | Tests E2E ne couvrent pas la creation de nouvelles entites (bug FOR UPDATE non detecte car le seed bypass cette logique). |
| **P1-6** | Documentation onboarding | **OK** | PASSATION.md mis a jour avec ports corrects et commande tsx. | Aucun. |

---

## 3. Nouveaux problemes identifies

### N1 — CRITIQUE : Creation d'entites impossible (FOR UPDATE + MAX)

| | |
|-|-|
| **Gravite** | **CRITIQUE — BLOQUANT** |
| **Zone** | API — quotes.service.ts, invoices.service.ts, jobs.service.ts, purchases.service.ts, workshop.service.ts |
| **Preuve** | `POST /api/quotes` → 500 : `Raw query failed. Code: 0A000. Message: ERROR: FOR UPDATE is not allowed with aggregate functions` |
| **Impact** | **Impossible de creer** : devis, factures, chantiers, commandes fournisseur, items atelier. L'outil est inutilisable pour tout usage reel au-dela de la consultation des donnees seed. |
| **Cause** | `$queryRaw` utilise `SELECT MAX(...) ... FOR UPDATE` — PostgreSQL interdit `FOR UPDATE` avec des fonctions d'agregation. Bug pre-existant (commit initial). Le seed bypass cette logique car il cree les entites directement avec des IDs en dur. |
| **Endpoints affectes** | `POST /api/quotes`, `POST /api/invoices`, `POST /api/jobs`, `POST /api/quotes/:id/convert`, 7 fichiers au total |
| **Recommandation** | Remplacer par un `SELECT ... FOR UPDATE` sur une table de sequences ou utiliser un subquery : `SELECT COALESCE(MAX(...), 0) + 1 FROM (SELECT reference FROM quotes WHERE ... FOR UPDATE) sub`. Alternative : utiliser une sequence PostgreSQL dediee par societe. **Correction obligatoire avant pilote.** |

### N2 — ELEVE : Stack traces Prisma exposees dans les reponses HTTP

| | |
|-|-|
| **Gravite** | **ELEVE** |
| **Zone** | API — CompanyGuard (company.guard.ts:83), toute erreur Prisma non-HttpException |
| **Preuve** | `X-Company-Id: BOGUS` → 500 avec body contenant le chemin fichier (`/app/dist/src/common/guards/company.guard.js:62:51`), la requete Prisma complete, et le schema interne |
| **Impact** | Information disclosure : un attaquant apprend les chemins internes, la structure des tables, les noms de colonnes. Aide a preparer des attaques ciblees. |
| **Cause** | Le `AllExceptionsFilter` ne retourne pas la stack trace dans la reponse pour les `Error` generiques, mais Prisma lance des `PrismaClientValidationError` dont le `message` contient tout le contexte. Le filtre inclut `exception.message` dans la reponse. |
| **Recommandation** | 1. Dans `AllExceptionsFilter`, pour les erreurs non-HttpException, remplacer `message = exception.message` par `message = 'Internal server error'`. 2. Dans `CompanyGuard.resolveCompanyId()`, entourer le `findFirst` d'un try/catch et retourner `null` (code invalide). **Correction recommandee avant pilote.** |

### N3 — ELEVE : Company code invalide retourne 500 au lieu de 400

| | |
|-|-|
| **Gravite** | **ELEVE** |
| **Zone** | API — company.guard.ts |
| **Preuve** | `X-Company-Id: BOGUS` → HTTP 500. `X-Company-Id: ASP' OR '1'='1` → HTTP 500 |
| **Impact** | Experience utilisateur degradee (500 = "le serveur a plante" au lieu de "code invalide"). Confusion dans les logs de monitoring. |
| **Cause** | `code as any` passe une valeur invalide a un champ Prisma enum, ce qui lance une exception non geree. Le guard a un `if (!resolvedId) throw ForbiddenException` mais l'erreur Prisma se produit avant le retour `null`. |
| **Recommandation** | Entourer le `this.prisma.company.findFirst()` d'un try/catch dans `resolveCompanyId()`. Si erreur → retourner `null` → le guard retourne 403 "Unknown company code". **Correction simple, recommandee avant pilote.** |

### N4 — MODERE : Search endpoint autorise GROUP scope (fuite cross-tenant)

| | |
|-|-|
| **Gravite** | **MODERE** |
| **Zone** | API — search.service.ts |
| **Preuve** | `GET /api/search?q=test` avec `X-Company-Id: GROUP` retourne resultats de toutes les societes |
| **Impact** | Un admin en scope GROUP peut chercher dans les donnees de toutes les societes. Acceptable pour admin, mais le service ne valide pas que seuls les admin/conducteur y accedent (le guard le fait, mais c'est une defense en profondeur insuffisante). |
| **Cause** | `const companyFilter = companyId ? { companyId } : {};` — si null, pas de filtre |
| **Recommandation** | Acceptable si le RolesGuard empeche les non-admin d'acceder au GROUP scope (verifie : OK). Documenter comme comportement attendu. P3. |

### N5 — MODERE : Swagger accessible en environnement Docker actuel

| | |
|-|-|
| **Gravite** | **MODERE** |
| **Zone** | Configuration — docker-compose.yml |
| **Preuve** | `curl http://localhost:3020/api/docs` → 200 (page Swagger). `curl http://localhost:3020/api/docs-json` → 200 (schema OpenAPI complet) |
| **Impact** | En l'etat actuel du docker-compose (`NODE_ENV: development`), Swagger est accessible. Expose la documentation complete de l'API, tous les endpoints, les schemas de donnees. |
| **Cause** | docker-compose.yml definit `NODE_ENV: development`. Le code conditionne Swagger sur `NODE_ENV !== 'production'`. |
| **Recommandation** | Changer `NODE_ENV: production` dans docker-compose.yml pour le deploiement pilote. **Correction obligatoire avant mise a disposition client.** |

### N6 — MODERE : Cast `as any` / `as unknown as` dans export.service.ts

| | |
|-|-|
| **Gravite** | **MODERE** |
| **Zone** | API — export.service.ts:88, export.service.ts:413 |
| **Preuve** | `settings.vatRates as unknown as VatRateConfig[]` — double cast dangereux. Si le JSON en base n'a pas la bonne structure, erreur silencieuse en runtime. |
| **Impact** | Export FEC pourrait generer des ecritures incorrectes si les parametres comptables sont malformes. |
| **Cause** | Le champ `vatRates` est stocke en JSON dans Prisma (type `Json`). Le cast bypasse toute validation de structure. |
| **Recommandation** | Ajouter une validation runtime (schema Zod ou validation manuelle) au lieu du double cast. P2 — le seed cree des donnees correctes, donc faible risque pendant le pilote. |

### N7 — FAIBLE : Donnees de test E2E polluent la base

| | |
|-|-|
| **Gravite** | **FAIBLE** |
| **Zone** | Base de donnees |
| **Preuve** | Clients "Client Test 1" a "Client Test 12" presents dans la base ASP (crees par les tests E2E d'import) |
| **Impact** | Pendant une demo, le gerant voit des clients fictifs melanges aux donnees metier credibles |
| **Recommandation** | Faire un reset complet avant le pilote client : `npx prisma migrate reset --force && npx prisma db seed && npx tsx prisma/seed-e2e.ts`. Ou nettoyer les clients test manuellement. |

### N8 — FAIBLE : Valeurs negatives acceptees dans les lignes de devis

| | |
|-|-|
| **Gravite** | **FAIBLE** |
| **Zone** | API — quotes (creation lignes) |
| **Preuve** | Non testable actuellement (creation de devis bloquee par N1). Mais la DTO `CreateQuoteLineDto` n'a probablement pas de validation `@Min(0)` sur quantity/unitPrice |
| **Impact** | Un utilisateur pourrait creer des lignes avec montants negatifs, faussant le total du devis |
| **Recommandation** | Ajouter `@IsPositive()` ou `@Min(0)` sur les champs quantity et unitPrice des DTOs. P3. |

---

## 4. Problemes fonctionnels

### PF1 — Creation de devis impossible

| | |
|-|-|
| **Reproduction** | `POST /api/quotes` avec body valide `{"clientId":"...","subject":"...","validUntil":"..."}` |
| **Attendu** | 201 Created avec le devis cree et sa reference generee |
| **Observe** | 500 Internal Server Error : `FOR UPDATE is not allowed with aggregate functions` |
| **Consequence** | Le flux metier principal (client → devis → chantier → facture) est **completement casse** des la 2e etape |

### PF2 — Creation de factures impossible

| | |
|-|-|
| **Reproduction** | `POST /api/invoices` avec body valide |
| **Attendu** | 201 Created |
| **Observe** | Meme erreur 500 que PF1 |
| **Consequence** | Impossible de facturer un chantier |

### PF3 — Conversion devis → chantier impossible

| | |
|-|-|
| **Reproduction** | `POST /api/quotes/:id/convert` |
| **Attendu** | 201 Created avec le chantier genere |
| **Observe** | Meme erreur 500 (le convert appelle la creation de job qui utilise le meme pattern) |

---

## 5. Risques pour le pilote

### Ce qui va casser immediatement (si non corrige)

| Risque | Probabilite | Impact | Action |
|--------|-------------|--------|--------|
| **Gerant essaie de creer un devis → crash** | 100% | Perte de confiance immediate, pilote interrompu | Corriger N1 AVANT pilote |
| **Gerant essaie de facturer → crash** | 100% | Idem | Corriger N1 AVANT pilote |

### Ce qui peut casser pendant les 2 semaines

| Risque | Probabilite | Impact | Surveillance |
|--------|-------------|--------|-------------|
| Header X-Company-Id mal forme → 500 au lieu de 400 | Faible (header gere par le frontend) | Confusion technique | Corriger N3 avant pilote |
| Stack trace exposee dans reponse erreur | Moyen (toute erreur Prisma inattendue) | Fuite d'information technique | Corriger N2 avant pilote |
| Swagger accessible si NODE_ENV oublie | Moyen | Exposition de l'API | Configurer NODE_ENV=production |
| Export FEC incorrect si parametres comptables modifies | Faible | Comptable rejette l'export | Tester l'export apres toute modif settings |
| Sync offline qui echoue silencieusement | Faible | Perte de confiance terrain | Surveiller la queue quotidiennement |
| Disque se remplit (photos, logs) | Moyen sur 2 semaines | API ralentit ou crash | Monitoring disque quotidien |

### Ce qui peut faire perdre confiance

| Situation | Cause | Prevention |
|-----------|-------|------------|
| "L'outil a plante quand j'ai cree un devis" | Bug N1 | Corriger avant pilote |
| "J'ai vu une erreur technique incomprehensible" | Bug N2/N3 | Sanitizer les erreurs |
| Donnees fictives dans la base ("Client Test 1") | Pollution E2E | Reset propre avant pilote |
| "Swagger" accessible avec toute la doc API | NODE_ENV=development | Passer en production |

---

## 6. Evaluation produit

### Clarte

| Aspect | Note | Commentaire |
|--------|------|-------------|
| Navigation desktop | 8/10 | Menu lateral clair, icones explicites, organisation logique par domaine metier |
| Navigation terrain | 9/10 | 5 onglets en bas, parcours lineaire, adapte mobile |
| Terminologie | 8/10 | Vocabulaire metier BTP correct (devis, chantier, situation, conducteur) |
| Messages d'erreur | 5/10 | Erreurs de validation correctes (400 + message clair). Erreurs serveur = stack traces (N2) |
| Onboarding | 7/10 | PASSATION.md et PACK-PILOTE.md complets mais techniques. Le client non-technique a besoin d'accompagnement |

### Fluidite

| Aspect | Note | Commentaire |
|--------|------|-------------|
| Flux devis → chantier | **BLOQUE** | Bug N1 empeche la creation |
| Import donnees | 9/10 | Preview + execute + idempotency : solide |
| Export comptable | 9/10 | FEC equilibre, multi-taux, 3 formats |
| Dashboard cashflow | 8/10 | Projections, confiance, detail par chantier |
| Terrain offline | 8/10 | File d'attente, sync auto, idempotency |
| Validation heures | 8/10 | Semaine par semaine, batch approve |

### Credibilite

| Aspect | Note | Commentaire |
|--------|------|-------------|
| Donnees seed (hors E2E) | 8/10 | Noms credibles (Mairie de Lyon, DIR Centre-Est, Colas) |
| Donnees E2E importees | 3/10 | "Client Test 1-12" detruisent la credibilite |
| Calculs comptables | 9/10 | FEC equilibre, TVA multi-taux correcte |
| Calculs cashflow | 7/10 | Confiance calculee correctement, mais projections identiques avec seed |
| Design UI | 7/10 | shadcn/ui propre et professionnel, pas de "look demo" |

### Perception client probable

- **Premiere impression** : Positive si la demo est faite sur les donnees seed (pas les E2E)
- **Deuxieme jour** : **Catastrophe** quand le gerant essaie de creer son premier devis → 500
- **Si N1 corrige** : Bonne adoption probable, richesse fonctionnelle impressionnante pour une PME BTP

---

## 7. Verdict final

### Peut-on lancer le pilote ?

**NON en l'etat actuel.** Le bug N1 (FOR UPDATE + MAX) rend l'outil inutilisable pour tout usage reel.

### Dans quelles conditions ?

**OUI apres correction de :**

| # | Correction | Effort estime | Obligatoire |
|---|-----------|---------------|-------------|
| **N1** | Remplacer `FOR UPDATE` + `MAX()` dans 7 fichiers | 1-2h | **OUI — bloquant** |
| **N2** | Sanitizer les erreurs Prisma dans AllExceptionsFilter | 30 min | **OUI — securite** |
| **N3** | Try/catch dans CompanyGuard.resolveCompanyId | 15 min | **OUI — UX** |
| **N5** | `NODE_ENV: production` dans docker-compose.yml | 1 min | **OUI — securite** |
| **N7** | Reset base (supprimer donnees E2E) | 5 min | **OUI — credibilite** |

**Effort total : ~3-4h de corrections.**

### Avec quel niveau de risque ?

Apres les corrections ci-dessus : **risque FAIBLE a MODERE** pour un pilote de 2 semaines.

- **Faible** : securite, isolation tenant, stabilite des fonctions existantes
- **Modere** : robustesse des nouvelles creations (devis, factures) — a tester intensivement apres le fix

### Qu'est-ce qui DOIT etre surveille quotidiennement ?

1. **Health check API** : `curl /api/health` → 200
2. **Erreurs 500 dans les logs** : `docker compose logs api | grep -c "500"`
3. **Disque** : `df -h /` → rester < 80%
4. **Connexions utilisateurs** : tous les comptes se connectent-ils ?
5. **File d'attente offline** : elements bloques en "failed" ?
6. **Creation de devis/factures** : fonctionne sans erreur ? (test quotidien)

---

## 8. Plan d'action residuel

### AVANT pilote (obligatoire)

| # | Action | Fichiers | Priorite |
|---|--------|----------|----------|
| 1 | **Corriger FOR UPDATE + MAX()** dans toutes les queries de generation de reference | quotes.service.ts, invoices.service.ts, jobs.service.ts, purchases.service.ts, workshop.service.ts (7 occurrences) | **CRITIQUE** |
| 2 | **Sanitizer les erreurs** non-HttpException dans AllExceptionsFilter | all-exceptions.filter.ts | **HAUTE** |
| 3 | **Try/catch dans CompanyGuard** pour codes invalides | company.guard.ts | **HAUTE** |
| 4 | **NODE_ENV=production** dans docker-compose.yml | docker-compose.yml | **HAUTE** |
| 5 | **Reset base de donnees** (supprimer les donnees E2E polluantes) | Script reset | **MOYENNE** |
| 6 | **Re-run qualification E2E** apres corrections | e2e/ | **HAUTE** |
| 7 | **Tester le flux complet** : creer client → devis → chantier → facture → export | Manuel | **CRITIQUE** |

### P2 — Apres debut pilote (1ere semaine)

| # | Action | Impact |
|---|--------|--------|
| 1 | Validation `@Min(0)` sur quantity/unitPrice dans les DTOs | Evite les montants negatifs |
| 2 | Remplacer double cast `as unknown as VatRateConfig[]` par validation runtime | Robustesse export |
| 3 | Ajouter validation sur le `companyCode` derive dans quote-templates (slice) | Robustesse references |

### P3 — Post-pilote

| # | Action | Impact |
|---|--------|--------|
| 1 | Remplacer les 15+ casts `as any` par du typage Prisma correct | Qualite code |
| 2 | Ajouter des tests unitaires sur la generation de references | Regression prevention |
| 3 | Logging structure (JSON) au lieu de console.error | Observabilite production |
| 4 | Monitoring/alerting automatise (health + disque + erreurs) | Operations |

### Quick wins (< 30 min, valeur immediate)

1. `NODE_ENV: production` dans docker-compose.yml (1 min)
2. Try/catch dans CompanyGuard (15 min)
3. Reset de la base avant demo (5 min)

---

## Si j'etais responsable produit, est-ce que j'autoriserais ce pilote ?

**Non, pas aujourd'hui. Oui demain apres 3-4h de corrections.**

Le produit est **impressionnant par sa richesse fonctionnelle** : import/export comptable, offline terrain, multi-tenant, idempotency, cashflow previsionnel — c'est un vrai mini-ERP qui couvre le flux complet du BTP. La qualite architecturale est reelle : guards globaux, validation DTO, rate limiting, soft delete. La qualification E2E (29/29) prouve que les fondations sont solides.

Mais un pilote client, c'est le moment ou **la premiere impression compte**. Et la premiere chose qu'un gerant va faire apres l'import de ses donnees, c'est creer un devis. Si ca crash avec une erreur 500, le pilote est mort dans les 48h.

Le bug `FOR UPDATE + MAX()` est **le seul vrai bloquant**. Il est pre-existant (pas une regression de nos corrections), il est localise (7 fichiers, meme pattern), et il est corrigeable en quelques heures. Les 4 autres corrections obligatoires (erreurs sanitisees, company guard, NODE_ENV, reset base) sont des quick wins de 30-45 minutes au total.

**Ma decision :**
1. Corriger N1 a N5 aujourd'hui
2. Re-tester le flux complet (client → devis → chantier → facture → export)
3. Re-runner la qualification E2E
4. Si tout passe : **GO pilote avec surveillance renforcee**

Le risque residuel apres corrections est faible. Le produit a de la valeur metier reelle. Le pack pilote est complet. L'accompagnement est structure. Les KPIs sont definis.

**Verdict final : GO sous conditions — 3-4h de corrections separent ce produit d'un pilote client reussi.**
