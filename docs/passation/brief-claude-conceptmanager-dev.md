# Brief de passation — Déploiement ConceptManager en dev sur AVD-01

> **Public** : Claude (toi) qui prend la main pour aider Kieran à déployer ConceptManager sur sa VM Azure en environnement de **dev**.
>
> **Date** : 2026-04-28 (jour 1 du chantier déploiement)
>
> **Statut Kieran** : démarrage matinal 10h, énergie cognitive correcte. Sortie d'une grosse session A la veille (migration `/srv/`), il connaît bien la convention.

---

## 0. Tu es qui, tu fais quoi

Tu vas accompagner Kieran Gauthier (CEO Acreed IA Solutions) pour **déployer ConceptManager** (son ERP TPE/PME pour BTP signalisation) sur sa VM Azure **en environnement de développement**, sans mise en prod.

L'objectif final est de préparer une **démo crédible pour JS Concept** (prospect chaud à 90% de signature). Pas de mise en prod tant que JS n'a pas signé.

Tu pourrais être :
- Un Claude qui tourne sur le poste Windows de Kieran (avec accès SSH à la VM)
- Un Claude qui tourne directement sur la VM AVD-01 sous l'utilisateur `kierangauthier`

Adapte tes commandes selon ton environnement. Si tu n'es pas sûr, demande à Kieran "tu me parles depuis ton poste local ou directement depuis la VM ?".

---

## 1. État de la VM — ce que tu dois savoir

### Hardware

| Ressource | Valeur |
|---|---|
| CPU | 8 cœurs |
| RAM | 31 Gi (11 Gi utilisés au moment du brief, 18 Gi available) |
| Disque | `/` 993 G total, 78 G utilisés, 915 G libres (8%) |
| OS | Ubuntu 22.04.5 LTS (Jammy) |
| Docker | v29.2.0 |
| Docker Compose | v5.0.2 (intégré CLI) |
| Adresse IP publique | `4.178.179.147` |
| Hostname | AVD-01 |
| User principal | `kierangauthier` (sudo NOPASSWD) |

**Largement de quoi faire tourner** ConceptManager (frontend + api + postgres + minio = ~2-4 Go RAM, négligeable côté CPU) + un seed 12 mois (~quelques centaines de Mo en DB).

### Convention `/srv/` appliquée le 2026-04-27

C'est la base à comprendre avant tout. La VM a été restructurée la veille selon une convention stricte. **Lis-la avant d'agir** :
- `/srv/claude/docs/convention-srv.md` (sur la VM) — la règle canonique
- `/srv/claude/docs/architecture/arborescence-vm.md` — état actuel

**Résumé minimal pour l'action** :

```
/srv/prod/conceptmanager/   ← clients ConceptManager prod (vide aujourd'hui — JS Concept y arrivera APRÈS signature)
/srv/dev/conceptmanager/    ← démos et environnements dev ConceptManager (c'est ICI qu'on va déployer aujourd'hui)
/srv/prod/tools/            ← outils internes (mimir, ostara, freyr, n8n, horizon, etc.)
/srv/dev/tools/             ← versions dev de ces outils
/srv/claude/                ← ton environnement (skills, mémoire, runbooks, docs)
```

Pour cet exercice : on déploie en `/srv/dev/conceptmanager/<slug>/` où `<slug>` reste à confirmer avec Kieran (probablement `js-concept` ou `demo`).

### Réseaux Docker existants

```bash
docker network ls --filter "label=acreed.env"
```

Doit afficher 4 réseaux :
- `acreed-prod` (172.100.0.0/16) — ne pas y mettre la démo dev
- `acreed-dev` (172.101.0.0/16) — **c'est ici qu'on rattache notre déploiement**
- `acreed-tools` (172.102.0.0/16)
- `acreed-trash` (172.103.0.0/16)

### Outils déjà en service (à NE PAS toucher)

11 URLs publiques tournent en production. Liste-les pour vérifier qu'elles répondent toujours en 200 avant ET après ton déploiement (sanity check) :

```
https://astreos.acreedconsulting.com
https://site.acreedconsulting.com
https://horizon.acreediasolutions.com
https://outline.acreediasolutions.com
https://freyr.acreediasolutions.com
https://mimir.acreediasolutions.com
https://puyfoot43.acreediasolutions.com
https://outil.rh.acreediasolutions.com
https://ostara.acreedconsulting.com
https://n8n.acreediasolutions.com
https://dt.acreediasolutions.com
```

Ports déjà occupés par ces outils (à éviter pour ConceptManager) :
- 5432 → libre (postgres host non utilisé)
- 5433 → mimir prod (127.0.0.1)
- 5435 → mimir dev (127.0.0.1)
- 5440 → conventionnellement réservé ConceptManager prod selon PACK-PILOTE
- 8050-8051 → puyfoot43 (0.0.0.0, dette UFW)
- 8070-8071 → freyr (0.0.0.0, dette UFW)
- 8081 → mimir backend (127.0.0.1)
- 8084 → ancien mimir frontend retiré
- 8090 → conventionnellement réservé ConceptManager frontend
- 8091, 8093 → verif-paie (0.0.0.0, dette UFW)
- 8100-8101 → horizon (127.0.0.1)
- 4100-4107 → ostara (0.0.0.0, dette UFW)
- 3010 → outline (127.0.0.1)
- 5678 → n8n (127.0.0.1)
- 8002 → convertisseur-dt (host)
- 8888, 3001 → site-final-acreed (0.0.0.0, dette UFW)

### Composes par défaut ConceptManager (à connaître)

Le `docker-compose.yml` du projet expose :
- frontend : `8080:80`
- api : `3000:3000`
- postgres : `5432:5432`
- minio : `9000:9000` + console `9001:9001`

**Pour le dev sur VM, tu DOIS rebinder en `127.0.0.1:`** (pas 0.0.0.0) pour éviter d'exposer la démo publiquement et respecter la dette UFW. Ports proposés (à adapter selon disponibilité) :
- frontend : `127.0.0.1:8095:80`
- api : `127.0.0.1:3095:3000`
- postgres : `127.0.0.1:5445:5432`
- minio : `127.0.0.1:9095:9000`, console `127.0.0.1:9096:9001`

Si tu veux exposer publiquement plus tard, ce sera via vhost nginx (pas via port public direct).

---

## 2. État du code source ConceptManager

### Sur le poste de Kieran

Le code source vit sur Windows :
```
E:\Claude\ConceptManager\JS_Concept_final\
```

C'est un projet **TypeScript / React / Vite** pour le frontend, avec une API séparée dans le dossier `api/`. La stack :

- **Frontend** : React 18, Vite, TailwindCSS, shadcn/ui, react-router-dom, react-query, react-hook-form, zod, Dexie (IndexedDB pour PWA offline)
- **Backend (api)** : sous-dossier `api/`, NestJS + Prisma + PostgreSQL (à confirmer en lisant `api/package.json`)
- **DB** : PostgreSQL 16 (alpine)
- **Stockage fichiers** : MinIO (S3-compatible)
- **Frontend Docker** : multi-stage build node:20-alpine → nginx:alpine
- **Tests** : Vitest, Testing Library
- **PWA** : oui (vite-plugin-pwa) — important pour la saisie terrain offline des techniciens

### Variables d'environnement obligatoires (`.env.example`)

```env
NODE_ENV=production              # toujours production même en dev
POSTGRES_DB=concept_manager
POSTGRES_USER=concept
POSTGRES_PASSWORD=<32+ chars random>
JWT_SECRET=<openssl rand -base64 48>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY_DAYS=7
INVOICE_HMAC_KEY=<openssl rand -base64 48>  # SCEAU FACTUR-X — ne pas tourner sans re-sceller les factures existantes
CORS_ORIGINS=https://app.example.com         # à adapter selon URL démo
MINIO_ROOT_USER=<random>
MINIO_ROOT_PASSWORD=<random fort>
MINIO_BUCKET=concept-files
ANTHROPIC_API_KEY=                            # optionnel, IA désactivée si vide
```

**Tous les secrets sont à régénérer** pour ce déploiement, ne JAMAIS réutiliser les valeurs d'un autre environnement.

### Repo Git

Statut à vérifier avec Kieran : a-t-il un remote GitHub/GitLab ou pousse-t-on direct via scp ?

Si remote : `git push` puis `git clone` côté VM.
Si pas de remote : `scp -r` ou `rsync` du dossier vers la VM. Plus rapide, moins reproductible mais OK pour première itération démo.

---

## 3. Méthode de travail à appliquer (CRITIQUE)

Les 11 incidents de la Session A du 2026-04-27 ont produit **un précis opérationnel** que tu dois respecter scrupuleusement. Lis :

- `/srv/claude/docs/lessons-learned-session-a.md` (sur la VM)

Sinon voici les 11 règles condensées :

1. **`cat .env` interdit** dans une session interactive. Si vraiment nécessaire, redirection chmod 600. Préférer `printenv VAR_NAME`. **4 fuites tracées en 4 jours**, on n'en veut pas une 5e.
2. **`sed -i` sur un binaire (DB SQLite, venv) interdit**. Pour patcher des paths absolus en DB, `UPDATE SQL` transactionnel.
3. **`docker compose down -v` interdit** sauf intention explicite (-v supprime les volumes).
4. **`chown -R kierangauthier` aveugle interdit** après un `mv`. Le `mv` préserve l'owner, c'est correct.
5. **Préciser `-f`** quand un projet a plusieurs variants compose (ex: `-f docker-compose.prod.yml`).
6. **URL 200 ≠ fonctionnel**. Toujours valider via `SELECT COUNT(*) FROM <table_métier>` avec valeur attendue.
7. **`name: <slug>-<env>` au top-level du compose** pour tout slug partagé prod/dev (cf incident mimir 2026-04-27).
8. **Pas de bloc `networks:` dupliqué** au top-level du compose. Ajouter dans le bloc existant.
9. **Normaliser CRLF→LF** avant tout sed avec ancres `^...$` : `sed -i 's/\r$//' <fichier>`.
10. **STOP + ping Kieran au moindre doute**. Pas d'auto-fix sur prod.
11. **Filets de sécurité avant action irréversible** : `cp .bak`, `tar tgz`, `pg_dumpall` (chmod 600). Coût < 1 min, sécurité inestimable.

**Bonus contexte spécifique au déploiement ConceptManager** :
- Le compose ConceptManager utilise un **volume nommé `pgdata`**. Sans `name:` explicite au top-level, le project name dériverait du basename du dossier → si on déplace plus tard, **risque de volume orphelin** (incident 9 de Session A). Donc : **`name: cm-<slug>`** dès le départ dans le compose.

---

## 4. Méthode de communication avec Kieran

### Convention `teams-alert`

Sur la VM, Kieran a un script `teams-alert` qui poste sur Teams :

```bash
teams-alert info "Phase X démarrée : <titre>"
teams-alert info "Phase X OK : <résumé 1 ligne>"
teams-alert warning "✋ Attention : <chose>"
teams-alert critical "✋ CHECKPOINT : <action humaine requise>"
```

Utilise-les à chaque étape importante. Pour les commandes longues avec des backticks ou `$()` dans le message, passe par fichier (`teams-alert info "$(cat /tmp/msg.txt)"`) — sinon bash interprète et le message est tronqué.

### Checkpoints humains ✋

À chaque étape sensible (création secrets, premier `up -d`, ajout DNS public, etc.), tu **STOPPES et demandes GO** explicite avant d'agir. Kieran a déjà eu une grosse journée la veille, ne lui force pas la main.

### Journal d'exécution

Tient un journal `~/runbook-deploy-conceptmanager-$(date +%Y%m%d).md` avec une ligne par action significative :

```
## 2026-04-28T10:15:00+02:00
Étape 2.1 — Création dossier /srv/dev/conceptmanager/js-concept/
Commande : sudo mkdir -p /srv/dev/conceptmanager/js-concept/
Résultat : ✅
```

À la fin de la session, tu poses l'URL du journal sur Teams `info`.

### Mémoires Claude

Les mémoires sont dans `/srv/claude/memory/`. Lis l'index `MEMORY.md` au démarrage. **Mémoires critiques pour ce chantier** :

- `project_objectif_strategique.md` — la vision Acreed
- `project_strategie_produit.md` — ConceptManager, Ostara, offres A/B
- `project_pack_pilote.md` — architecture client (4 services Docker), KPIs GO/NO-GO
- `project_jsconcept_groupe.md` — fiche prospect JS Concept (signature à 90%)
- `project_vm_architecture.md` — état de la VM
- `feedback_compose_volumes_orphelins.md` — incident critique Session A
- `feedback_compose_project_name.md` — règle `name:` explicite
- `feedback_secret_output_hygiene.md` — pas de cat .env

Si une mémoire est obsolète après une action, **mets-la à jour** dans la foulée.

---

## 5. Ce que tu dois faire

### Objectif fonctionnel (jour 1)

Déployer ConceptManager sur la VM, en `/srv/dev/conceptmanager/<slug>/`, accessible localement uniquement via tunnel SSH (pas d'URL publique pour aujourd'hui), avec :
- Stack Docker complète UP (frontend, api, postgres, minio)
- DB initialisée (Prisma migrate run)
- 1 utilisateur admin créé pour que Kieran puisse se logger
- Validation visuelle navigateur via `ssh -L 8095:127.0.0.1:8095 kierangauthier@4.178.179.147`

### Objectif fonctionnel (jour 2-3, post-déploiement)

Construire un seed 12 mois pour la démo JS Concept, calibré métier signalisation routière (cf `project_jsconcept_groupe.md`). Ce sera un chantier séparé une fois le déploiement validé.

### Hors scope explicite

- **Pas de mise en prod** tant que JS n'a pas signé (décision Kieran 2026-04-28)
- Pas de DNS public, pas de vhost nginx, pas de cert Let's Encrypt aujourd'hui
- Pas de skill `deploy-client` pour Phase 7 — c'est un chantier futur (mais ce déploiement servira de modèle, alors documente-le bien)
- Pas de touch aux 11 outils déjà en service

---

## 6. Le runbook que tu dois suivre

Voir `runbook-deploiement-conceptmanager-dev.md` (à côté de ce fichier dans le dossier `docs/passation/`).

Ce runbook a 7 phases avec checkpoints. **Suis-le strictement**. S'il y a un trou ou une divergence avec la réalité, **STOP + ping Kieran** comme on l'a fait 11 fois en Session A.

---

## 7. Comment Kieran aime travailler avec toi

Trois règles tirées de sa mémoire `feedback_confirm_avant_action.md` :

1. **Toujours demander GO avant action risquée** (suppression, UFW, rotation secret, push DNS, etc.)
2. **Pas d'auto-fix** quand quelque chose ne se passe pas comme prévu. STOP, alerte critical, attente.
3. **Réponses concises** mais avec contexte technique nécessaire. Tableaux markdown bienvenus pour les inventaires.

Il est CEO d'une boîte qui démarre, runway 8-10 mois, donc **temps précieux**. N'invente rien, demande quand tu ne sais pas. Il préfère "je n'ai pas l'info" à une réponse confiante mais fausse.

Il a 4 fuites de secrets à son actif (toutes via Claude qui a `cat .env` par réflexe). **N'aggrave pas ce score.**

---

## 8. Ce qui peut arriver d'imprévu

D'après la Session A, environ **30% des étapes divergent** d'un runbook prévu. Donc anticipe :

- Le repo Git n'existe pas → push direct via scp/rsync (R2 dans la classification du brief)
- Le compose ConceptManager a peut-être bougé depuis le `.env.example` lu dans ce brief → relire avant de templater
- Un `prisma migrate deploy` peut échouer si la version de Postgres ne match pas la version codée en dur dans le projet → vérifier le `engine` Prisma
- Le frontend nginx peut crasher si la config `nginx.conf` du projet utilise un host non disponible → vérifier
- Le port que tu as choisi (8095) peut être pris → audit `sudo ss -tlnp | grep -E ":(8095|3095|5445|9095|9096)"` AVANT le up
- L'utilisateur admin à créer peut nécessiter un endpoint API spécifique (cf `PACK-PILOTE.md` section 2.2)

Pour chaque divergence : **STOP + audit + propose 2-3 options + GO Kieran**.

---

## 9. Ressources que tu as à disposition sur la VM

| Resource | Path |
|---|---|
| Convention `/srv/` | `/srv/claude/docs/convention-srv.md` |
| Arborescence VM | `/srv/claude/docs/architecture/arborescence-vm.md` |
| Lessons Session A | `/srv/claude/docs/lessons-learned-session-a.md` |
| CR + REX Session A | `/srv/claude/docs/cr-rex-session-a.md` |
| Mémoires Claude | `/srv/claude/memory/MEMORY.md` (index) |
| Archives session A | `~/trash-archives/20260427/` |
| Journal session A | `~/runbook-session-a-20260427.md` |
| Code ConceptManager (à pousser) | `E:\Claude\ConceptManager\JS_Concept_final\` (poste Kieran) |
| `PACK-PILOTE.md` | `E:\Claude\ConceptManager\JS_Concept_final\PACK-PILOTE.md` (référence onboarding client) |

---

## 10. En résumé : ta mission

1. **Confirme avec Kieran** : slug choisi (probablement `js-concept` ou `demo`), méthode de push (Git ou scp).
2. **Vérifie l'état de la VM** : sanity check 11 URLs OK, espace disque, Docker UP.
3. **Suis le runbook** `runbook-deploiement-conceptmanager-dev.md` étape par étape.
4. **STOP aux checkpoints**.
5. **Filets de sécurité** avant action irréversible.
6. **Validation rows métier** post-init DB (pas juste curl 200).
7. **Journal d'exécution** + alertes Teams aux étapes clés.
8. **Mets à jour les mémoires** Claude si tu apprends quelque chose de nouveau.
9. **À la fin** : URL démo accessible via SSH tunnel, login admin fonctionnel, prêt pour seed 12 mois.

Bonne session. Kieran est OK pour démarrer à 10h.
