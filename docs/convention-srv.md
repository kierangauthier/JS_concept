# Convention `/srv/` — organisation cible de la VM AVD-01

> **Objectif** : transformer la VM en serveur prod avec séparation **physique** dev/prod, prêt à accueillir des clients payants. Cette convention est la **norme cible** de toute migration `/srv/` (Phase B et au-delà).
>
> **Statut** : v1.0 — 2026-04-27 — figée après inventaire post-Phase B partielle (8/14 projets migrés).
>
> **Référence** : remplace toute mention de `/srv/acreed-dev/` dans les runbooks antérieurs.

---

## 1. Principes directeurs

1. **Trois niveaux d'isolement** entre dev et prod : chemin physique (`/srv/prod/` vs `/srv/dev/`), réseau Docker (`acreed-prod` vs `acreed-dev`), label compose. Aucun container avec le label `acreed.env=prod` ne doit pouvoir parler à un container `acreed.env=dev`.

2. **Une seule vérité par projet** : URL publique, nom de dossier, nom de container, nom de schéma DB **alignés** sur le même slug. Si le nom historique d'un container ne correspond pas, on le renomme à l'occasion de la migration.

3. **Le slug est le pivot** : un slug unique en kebab-case décrit chaque projet. Le slug = sous-domaine = nom de dossier = préfixe container = base du nom de schéma Postgres.

4. **Aucun secret en clair** : pas de `ghp_...`, `sb_secret_...`, mot de passe ou token dans `docker-compose.yml`, `.env` versionné, ou crontab. Les secrets vivent dans `~/.secrets/` (chmod 700) et sont sourcés par le service.

5. **Tout passe par Git** pour la prod. Aucune modif directe sur un container `acreed-prod` — on rebuild l'image avec un tag Git, on `pull`, on `up -d`.

6. **Réversibilité** : avant tout `mv` ou `rm`, archivage tgz dans `~/trash-archives/$(date +%Y%m%d)/`. Aucune exception.

---

## 2. Arborescence cible `/srv/`

```
/srv/
├── prod/                              # runtime production
│   ├── conceptmanager/                # clients ConceptManager (vide aujourd'hui)
│   │   └── thermipro/                 # démo commerciale (peut aussi vivre en /srv/dev/)
│   │
│   ├── tools/                         # outils internes Acreed
│   │   ├── convertisseur-dt/          # converter DT (uvicorn host)
│   │   ├── fastapi-pdf-tool/          # gateway MSAL pour dt
│   │   ├── freyr/                     # CRM prospect commercial Acreed IA Solutions
│   │   ├── horizon/                   # outil RH
│   │   ├── mimir/                     # POC immobilier (ex-"gestion-immo")
│   │   ├── n8n/                       # automatisation
│   │   ├── ostara/                    # éditeur Ostara + apps générées (monorepo)
│   │   ├── outline/                   # wiki interne
│   │   ├── puyfoot43/                 # suivi marketing maison
│   │   └── verif-paie-web/            # outil RH paie
│   │
│   ├── sites/                         # sites web institutionnels
│   │   └── site-final-acreed/         # site Acreed Consulting
│   │
│   └── astreos/                       # cas spécial — outil Acreed Consulting
│                                      # (séparé de tools/ : criticité particulière,
│                                      #  symlinks /etc/* vers astreos/deploy/)
│
├── dev/                               # runtime développement
│   ├── conceptmanager/                # déploiements dev des clients CM
│   │   └── thermipro/                 # alternative : démo en dev plutôt que prod
│   │
│   └── tools/                         # versions dev des outils
│       └── mimir/                     # ex-gestion-immo-dev/
│
└── claude/                            # environnement Claude (ex-/srv/acreed-dev/)
    ├── CLAUDE.md                      # config racine, pointeurs
    ├── memory/                        # mémoires partagées
    ├── skills/                        # procédures réutilisables (deploy-client, audit-prod, ...)
    ├── runbooks/                      # runbooks ops (humain-lisibles)
    ├── scripts/                       # scripts one-shot
    ├── projects/                      # clones Git pour exploration
    ├── observability/                 # requêtes Grafana, runbooks alertes
    └── docs/                          # docs commercial / legal / user
```

**Sous-catégories de premier niveau** dans `/srv/prod/` :

| Sous-cat | Contient | Critère d'inclusion |
|---|---|---|
| `conceptmanager/` | Déploiements clients du produit ConceptManager | Le client paie ConceptManager (M+1 et après) |
| `tools/` | Outils internes utilisés par l'équipe Acreed | Outil métier interne, pas vendu en l'état à un client |
| `sites/` | Sites web institutionnels | Site marketing/vitrine sans logique applicative complexe |
| (racine) `astreos/` | Astreos | Cas spécial, voir §6 |

`/srv/dev/` réplique `/srv/prod/` (mêmes sous-cat) pour les versions dev des projets.

`/srv/claude/` est sa propre catégorie, distincte de prod et dev.

---

## 3. Convention de nommage du slug

**Forme** : kebab-case en minuscules, ASCII uniquement, pas de date, pas de version.

**Règle** : le slug **doit** correspondre au sous-domaine principal (sans le `.acreediasolutions.com` ni le `.acreedconsulting.com`).

| Slug | Sous-domaine principal |
|---|---|
| `freyr` | `freyr.acreediasolutions.com` |
| `outline` | `outline.acreediasolutions.com` |
| `mimir` | `mimir.acreediasolutions.com` |
| `puyfoot43` | `puyfoot43.acreediasolutions.com` |
| `convertisseur-dt` | (servi via `dt.acreediasolutions.com` — exception §5) |
| `verif-paie-web` | (servi via `outil.rh.acreediasolutions.com` — exception §5) |

**Exceptions tolérées** : si le slug historique diverge du sous-domaine (ex: `verif-paie-web/` ↔ `outil.rh.*`), on documente l'écart dans le `CLAUDE.md` du projet et on **ne renomme pas** par confort. La cohérence est un objectif, pas un dogme rétroactif.

**Pour les futurs clients ConceptManager** : kebab-case du nom commercial, simple et stable. Exemples :
- `js-concept` (sous-domaine `js-concept.acreediasolutions.com`)
- `asp-signalisation` (sous-domaine `asp-signalisation.acreediasolutions.com`)
- `thermipro` (sous-domaine `thermipro.acreediasolutions.com`)

---

## 4. Conventions techniques par projet

Pour chaque projet, **6 noms** dérivent du slug :

| Élément | Convention | Exemple slug `mimir` |
|---|---|---|
| Chemin | `/srv/<env>/<sous-cat>/<slug>/` | `/srv/prod/tools/mimir/` |
| URL | `<slug>.acreediasolutions.com` (ou `consulting`) | `mimir.acreediasolutions.com` |
| Réseau Docker | `acreed-<env>` (4 réseaux globaux) | `acreed-prod` |
| Container | `<slug>-<service>` | `mimir-frontend`, `mimir-backend`, `mimir-db` |
| Schéma DB | `<slug_underscored>` ou `<slug_underscored>_<purpose>` | `mimir`, `mimir_logs` |
| Volume Docker | `<slug>-<purpose>` | `mimir-pgdata`, `mimir-uploads` |

**Pour les clients ConceptManager** (à venir), même règle avec préfixe `cm-` sur les containers pour distinguer du moteur :

| Élément | Convention client CM `js-concept` |
|---|---|
| Chemin | `/srv/prod/conceptmanager/js-concept/` |
| URL | `js-concept.acreediasolutions.com` |
| Réseau Docker | `acreed-prod` (commun, isolation tenant via Postgres + JWT) |
| Container | `cm-js-concept-frontend`, `cm-js-concept-api`, `cm-js-concept-db`, `cm-js-concept-minio` |
| Schéma DB | `concept_js_concept` |
| Volume | `cm-js-concept-pgdata`, `cm-js-concept-minio` |

**Le préfixe `cm-` n'est PAS appliqué aux outils ni aux sites.** Il marque uniquement les containers ConceptManager pour faciliter `docker ps | grep '^cm-'` quand tu auras 10 clients.

---

## 5. Cas d'exception du sous-domaine

Certains outils servent un sous-domaine qui n'est pas le slug. On garde le slug technique pour le dossier/container (cohérence interne), et on documente le mapping URL :

| Slug | Sous-domaine servi | Raison de l'écart |
|---|---|---|
| `convertisseur-dt` | `dt.acreediasolutions.com` | Le slug technique reflète l'usage métier (converter de Dossier Technique), `dt` est un raccourci commercial. |
| `fastapi-pdf-tool` | `dt.acreediasolutions.com/auth/*` | Gateway MSAL devant le converter, pas un produit autonome. |
| `verif-paie-web` | `outil.rh.acreediasolutions.com` | Slug historique. À renommer en `outil-rh` lors d'un futur passage si décidé. |
| `site-final-acreed` | `site.acreedconsulting.com` | Slug historique. Pas urgent à renommer. |

Ces écarts sont **tolérés** et **documentés**, pas à corriger à chaque migration.

---

## 6. Cas spécial Astreos

Astreos sort de `tools/` parce qu'il a 3 caractéristiques que les autres outils n'ont pas :

1. **Criticité prod** — c'est un outil interne de Acreed Consulting (ta deuxième entité), utilisé en production par les consultants au quotidien. Pas un POC, pas une démo.
2. **Symlinks `/etc/*`** — son `deploy/` contient les configs nginx, cron, systemd, logrotate qui sont la **source de vérité** pour `/etc/nginx/sites-available/astreos`, `/etc/cron.d/astreos-backup`, `/etc/systemd/system/astreos-notifications.service`, etc. Phase 4 du runbook fait des `ln -s` depuis `/etc/` vers `astreos/deploy/`.
3. **Couplage Supabase** — Astreos utilise une instance Supabase locale (`127.0.0.1:54321`), avec un `service_role_key` historique compromis (cf. dette Voie B). Cron astreos hérite de ce secret.

**Cible** : `/srv/prod/astreos/` (au niveau racine de `prod/`, pas dans `tools/`).

**Migration** : à faire **AVANT Phase 4** pour que les symlinks `/etc/*` pointent vers la localisation cible définitive (et pas vers `~/claude-secure/astreos/` puis re-pointer après).

---

## 7. Cas spécial Ostara (monorepo)

Ostara est l'éditeur d'apps interne. Sa structure :

```
/srv/prod/tools/ostara/
├── dashboard/          # éditeur Ostara (port 4100)
├── apps/               # 7 apps générées partagent les node_modules parents
│   ├── projet-test/    (port 4101)
│   ├── projet-v2/      (port 4102)
│   ├── test-v3/        (port 4103)
│   ├── test-v4/        (port 4104)
│   ├── v6/             (port 4105)
│   ├── v5/             (port 4106)
│   └── qdsef/          (port 4107)
├── engine/             # moteur de génération
├── templates/          # templates métiers réutilisables
├── registry/           # registry de briques
└── output/             # sortie des générations
```

**Règle** : on ne **scinde pas** dashboard et apps. Les apps Ostara référencent les `node_modules`, `engine/`, `templates/` du parent — séparer casserait l'architecture.

**Quand un vrai client Ostara payant arrivera (M+3+)** : on créera **alors** un `/srv/prod/ostara-clients/` distinct avec un déploiement isolé par client. Pas avant.

**Aujourd'hui (avril 2026)** : les 7 apps sont des essais de dev, on les garde toutes en l'état dans `apps/`. Décision Kieran 2026-04-27 : "on est encore en phase de test, on ne touche pas".

**Lancement** : tout PM2 sous user `tdufr` via `pm2-tdufr.service`. Ports 4100-4107 actuellement bindés `0.0.0.0` — **dette UFW** à rebinder en `127.0.0.1` lors de la migration.

---

## 8. Mapping état actuel → cible

État au 2026-04-27, inventaire post-Phase B partielle (8 dans `/srv/`, 6 hors `/srv/`).

### Projets déjà dans `/srv/` — actions

| Chemin actuel | Cible | Action |
|---|---|---|
| `/srv/prod/freyr/` | `/srv/prod/tools/freyr/` | `mv` + grep refs externes |
| `/srv/prod/outline/` | `/srv/prod/tools/outline/` | `mv` + grep refs externes |
| `/srv/prod/horizon/` | `/srv/prod/tools/horizon/` | `mv` + grep refs externes |
| `/srv/prod/verif-paie-web/` | `/srv/prod/tools/verif-paie-web/` | `mv` + grep refs externes |
| `/srv/prod/convertisseur-dt/` | `/srv/prod/tools/convertisseur-dt/` | `mv` + patch unit systemd (WD codé en dur) + crontab tdufr |
| `/srv/prod/fastapi-pdf-tool/` | `/srv/prod/tools/fastapi-pdf-tool/` | `mv` + créer service systemd (Phase 1.6bis) avec WD = nouveau chemin |
| `/srv/prod/site-final-acreed/` | `/srv/prod/sites/site-final-acreed/` | `mv` + grep refs externes |
| `/srv/dev/puyfoot-dev/` | (à clarifier) | puyfoot43 = suivi marketing maison, pas ConceptManager. La version "dev" → `/srv/dev/tools/puyfoot43/` ? Ou suppression si plus utilisée ? |

### Projets hors `/srv/` — actions

| Chemin actuel | Cible | Action |
|---|---|---|
| `/home/kierangauthier/claude-secure/astreos/` | `/srv/prod/astreos/` | Migration AVANT Phase 4. Mise à jour du `deploy/` pour référencer le nouveau chemin. Backup tgz obligatoire. |
| `/home/kierangauthier/claude-secure/app-builder/` | `/srv/prod/tools/ostara/` | Migration monorepo. PM2 dump à régénérer (cwd change). Rebinder ports `0.0.0.0` → `127.0.0.1`. Vhost à mettre à jour. |
| `/home/kierangauthier/claude-secure/gestion-immo-dev/` | `/srv/dev/tools/mimir/` | Migration + **rename containers** `gestion-immo-*-dev` → `mimir-*-dev`. Schéma DB Postgres à conserver tel quel (rename = touchy, pas urgent). |
| `/home/azureuser/n8n/` | `/srv/prod/tools/n8n/` | Migration + isoler le service `camif-front` qui squatte le compose (à supprimer si plus utilisé). Vhost SAML à mettre à jour. |
| `/opt/acreed-ia/` | `/srv/prod/tools/mimir/` | Migration + **rename containers** `gestion-immo-*-prod` → `mimir-*-prod`. Frontend orphelin `:8084` à investiguer (D2 — voir §11). |
| `/opt/puyfoot-prod/` | `/srv/prod/tools/puyfoot43/` | Migration + grep refs externes. Mailpit dans le compose à conserver ou non selon usage. |
| `/var/www/Suivi-consultant/` | (à clarifier) | App web associée à astreos ? Si oui → `/srv/prod/astreos/web/` ou similaire. |

### Suppressions planifiées

| Chemin | Raison | Action |
|---|---|---|
| `/srv/apps/js-concept/` (174 M) | POC janvier obsolète, JS Concept refait avec PACK-PILOTE | Archive tgz + `rm -rf` + suppression vhost `poc.js.acreediasolutions.com` + DNS OVH |
| `/srv/claude-ops-home/` | Test du 23/04, dormant depuis | Archive + `rm -rf` |
| `/var/www/thor/` (681 M) | Ancêtre de convertisseur-dt, remplacé | Archive tgz + `rm -rf` + `systemctl disable thor-backend.service` + suppression vhost + crontab + DNS OVH |
| `/home/kierangauthier/claude-secure/Suivi_consultant_final/Suivi_consultant_V2/` | Dossier fantôme (16K vide) | `rm -rf` + commentaire ligne crontab cassée |
| Réseau Docker `js_concept_final_default` | Orphelin (containers supprimés) | `docker network rm` |
| Réseau Docker `acreed-network` (préexistant) | Usage non documenté | À investiguer avant suppression |

### Renames planifiés (D1)

| Avant | Après |
|---|---|
| Container `gestion-immo-frontend-prod` | `mimir-frontend-prod` (ou `mimir-frontend` si ambition de retirer le suffixe `-prod` pour symétrie avec `acreed-prod`) |
| Container `gestion-immo-backend-prod` | `mimir-backend-prod` |
| Container `gestion-immo-db-prod` | `mimir-db-prod` |
| Container `gestion-immo-frontend-dev` | `mimir-frontend-dev` |
| Container `gestion-immo-backend-dev` | `mimir-backend-dev` |
| Container `gestion-immo-db-dev` | `mimir-db-dev` |
| Schéma DB `gestion_immo` | `gestion_immo` **conservé** — rename DB en prod = touchy, pas urgent. À planifier dans une session dédiée si nécessaire. |

---

## 9. Réseaux Docker

Quatre réseaux globaux gérés en externe (créés en Phase 2 du runbook) :

| Réseau | Subnet | Label | Contient |
|---|---|---|---|
| `acreed-prod` | 172.100.0.0/16 | `acreed.env=prod` | Tous les containers de `/srv/prod/` |
| `acreed-dev` | 172.101.0.0/16 | `acreed.env=dev` | Tous les containers de `/srv/dev/` |
| `acreed-tools` | 172.102.0.0/16 | `acreed.env=tools` | Cas particuliers (à utiliser avec parcimonie) |
| `acreed-trash` | 172.103.0.0/16 | `acreed.env=trash` | Containers en attente de décommission |

**Règle** : chaque `docker-compose.yml` déclare `networks: default: name: acreed-<env>, external: true`. Ça force le container dans le bon réseau dès `up -d`.

**Réseaux ad-hoc internes** (ex: `freyr_freyr_internal`) : tolérés pour la communication interne entre services d'un même compose, mais **chaque service exposé** doit aussi rejoindre `acreed-prod` ou `acreed-dev`.

---

## 10. Procédure de déploiement d'un nouveau client ConceptManager

À détailler dans `/srv/claude/skills/deploy-client/SKILL.md` (Phase 7). Squelette :

1. **Préalables**
   - Slug client choisi (kebab-case, ASCII, ≤ 30 chars), ex: `dupont-sas`
   - Sous-domaine créé chez OVH (A record → IP VM)
   - Champs légaux (SIREN, TVA, IBAN, adresse) prêts
   - Acompte de signature encaissé (1 750 €)

2. **Création de l'environnement**
   ```bash
   SLUG=dupont-sas
   mkdir -p /srv/prod/conceptmanager/$SLUG
   cd /srv/prod/conceptmanager/$SLUG
   # Cloner le template ConceptManager dans ce dossier
   ```

3. **Génération du `docker-compose.yml`** depuis template, avec :
   - Containers `cm-$SLUG-frontend`, `cm-$SLUG-api`, `cm-$SLUG-db`, `cm-$SLUG-minio`
   - Schéma DB `concept_$SLUG_underscored`
   - JWT_SECRET unique (32+ chars)
   - INVOICE_HMAC_KEY unique
   - MINIO_ACCESS_KEY/SECRET_KEY uniques
   - DATABASE_URL avec mot de passe unique
   - Networks → `acreed-prod`

4. **Vhost nginx** + certbot pour `$SLUG.acreediasolutions.com`

5. **Premier démarrage** + migrations Prisma + seed initial

6. **Test du flow complet** : créer un client, un devis, une facture, télécharger Factur-X

7. **Création des comptes utilisateurs** (admin + conducteur + comptable + techniciens) selon PACK-PILOTE.md

---

## 11. Questions ouvertes / dettes à traiter

| # | Sujet | Statut |
|---|---|---|
| D2 | Frontend orphelin `gestion-immo-frontend-prod :8084` | **Tranché 2026-04-27** : clone legacy du frontend mimir (bundle identique à `/var/www/mimir/`). Zéro trafic depuis 2 mois. À supprimer du compose lors de la migration `/opt/acreed-ia/` → `/srv/prod/tools/mimir/`. **Pré-requis** : auditer les scripts de déploiement (`deploy.sh`, CI GitLab du repo `acreed-ia`) pour vérifier qu'ils ne push pas vers ce container — sinon le supprimer casserait le pipeline. Si oui : adapter le pipeline pour ne push que vers `/var/www/mimir/`. |
| D7 | Container `camif-front` dans le compose n8n | À supprimer (l'inventaire Phase 1 confirmait que camif est décommissionné). |
| D8 | Réseau Docker `acreed-network` préexistant inconnu | À investiguer avant suppression. |
| D9 | Schémas Postgres `gestion_immo*` | Conservés tels quels. Rename à planifier dans une session dédiée si jugé nécessaire (probablement après un audit client demandant la cohérence). |
| D10 | Frontend `gestion-immo-frontend-prod` exposé `0.0.0.0:8084` | Dette UFW. Rebinder en `127.0.0.1:` lors du passage `mimir`. |
| D11 | Ports Ostara 4100-4107 exposés `0.0.0.0` | Dette UFW. Rebinder en `127.0.0.1:` lors du passage `ostara`. |
| D12 | DNS chez OVH à nettoyer après suppression `thor` et `poc.js.acreediasolutions.com` | À faire par Kieran post-cleanup VM. |
| D13 | Convention DB pour clients ConceptManager : `concept_<slug_underscored>` ou autre ? | Tranchée : `concept_<slug>` underscored (cf §4). |
| D14 | `/var/www/Suivi-consultant/` rôle exact | À clarifier avec le Claude VM (probablement web associé à astreos). |

---

## 12. Critères de "convention appliquée"

La VM est conforme à cette convention quand :

- [ ] Tout projet runtime vit sous `/srv/prod/<sous-cat>/<slug>/` ou `/srv/dev/<sous-cat>/<slug>/`
- [ ] Aucun projet runtime ne reste dans `/opt/`, `/home/<user>/claude-secure/`, `/home/azureuser/`, `/var/www/` (sauf `/var/www/html` default nginx et `/var/www/Suivi-consultant/` selon arbitrage D14)
- [ ] Les 4 réseaux Docker `acreed-{prod,dev,tools,trash}` existent
- [ ] Chaque `docker-compose.yml` déclare son `acreed-<env>` en réseau externe
- [ ] Aucun container avec `acreed.env=prod` ne peut joindre un container `acreed.env=dev`
- [ ] Tous les containers d'un projet portent le slug du projet en préfixe (`<slug>-*` ou `cm-<slug>-*` pour CM)
- [ ] Tous les ports applicatifs sont bindés `127.0.0.1:` (pas `0.0.0.0:`) — UFW + sécu
- [ ] `/srv/claude/` contient `memory/`, `skills/`, `runbooks/`, `scripts/`, `projects/`, `observability/`, `docs/`
- [ ] `/srv/acreed-dev/` n'existe plus (renommé en `/srv/claude/`)
- [ ] Les dossiers obsolètes (`/srv/apps/`, `/srv/claude-ops-home/`, `/var/www/thor/`) sont archivés et supprimés

---

## 13. Versionnement de cette convention

- **v1.0** — 2026-04-27 — version initiale après inventaire post-Phase B partielle. À valider en pratique pendant la finition Phase B.
- Modifications futures à tracer dans ce document avec date + raison. Pas de v2 sans mise à jour des runbooks qui en dépendent (`plan-nettoyage-vm.md`, `runbook-migration-complete.md`).
