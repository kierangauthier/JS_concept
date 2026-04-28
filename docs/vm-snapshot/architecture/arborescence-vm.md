# Arborescence VM AVD-01

> **Public** : tout humain ou agent (Claude futur) qui arrive sur la VM et veut comprendre comment c'est rangé.
>
> **Source de vérité** : à jour au 2026-04-27 post-Session A. Pour la convention complète et figée, voir `~/convention-srv.md` (v1.0). Pour le runbook qui a appliqué cette convention, voir `~/runbook-session-a.md` (v1.0).

---

## 1. Vue d'ensemble `/srv/`

```
/srv/
├── prod/            runtime production
│   ├── astreos/         outil Acreed Consulting (cas spécial, hors tools/)
│   ├── tools/           outils internes Acreed (10 projets)
│   ├── sites/           sites web institutionnels (1 projet)
│   └── conceptmanager/  clients ConceptManager (vide aujourd'hui — créé à l'arrivée du 1er client payant)
├── dev/             runtime développement
│   └── tools/           versions dev des outils (2 projets)
└── claude/          environnement Claude VM (skills, runbooks, mémoire, docs)
```

| Sous-dossier | Rôle | État au 2026-04-27 |
|---|---|---|
| `/srv/prod/astreos/` | Outil interne Acreed Consulting (utilisé en production par les consultants). Cas spécial : à la racine de `prod/`, pas dans `tools/`, parce que sa criticité et ses symlinks `/etc/*` justifient un statut distinct. Voir §6 convention. | 1 projet |
| `/srv/prod/tools/` | Outils internes utilisés par l'équipe Acreed (CRM, automatisation, RH, wiki, etc.) | 10 projets |
| `/srv/prod/sites/` | Sites web institutionnels (marketing, vitrine) sans logique applicative complexe | 1 projet |
| `/srv/prod/conceptmanager/` | Déploiements clients du produit ConceptManager (un client par sous-dossier `<slug>/`) | Vide (premier client M+1 ou après) |
| `/srv/dev/tools/` | Versions dev des outils (mêmes slugs que prod, isolation par chemin + réseau Docker `acreed-dev`) | 2 projets |
| `/srv/claude/` | Environnement Claude VM. Contient `memory/`, `skills/`, `runbooks/`, `scripts/`, `projects/`, `observability/`, `docs/`. Renommé depuis `/srv/acreed-dev/` en Session A étape 5. | 8 sous-dossiers + CLAUDE.md |

---

## 2. Inventaire détaillé des projets

### `/srv/prod/astreos/`

| Élément | Valeur |
|---|---|
| URL publique | https://astreos.acreedconsulting.com |
| Slug | `astreos` |
| Owner FS | `tdufr:acreed-dev` |
| Stack | Node + Bun, déployé via `deploy.sh` |
| Service systemd | `astreos-notifications.service` (cron Bun) |
| DB | Supabase locale (containers `supabase_*_ksevdfdvebyymeygpdwh`, project name `supabase`) |
| Réseau Docker | `supabase_network_ksevdfdvebyymeygpdwh` (cas particulier — ne suit pas la convention `acreed-*`, dette latente) |
| Symlinks `/etc/*` | nginx vhost, cron, systemd unit, logrotate → `astreos/deploy/` (source de vérité unique) |

### `/srv/prod/tools/`

| Slug | URL publique | Containers | Réseau | Owner | Port loopback | DB |
|---|---|---|---|---|---|---|
| `convertisseur-dt` | https://dt.acreediasolutions.com | (aucun, uvicorn host) | (host) | `root:acreed-dev` | `0.0.0.0:8002` | SQLite (`backend/database.db`) |
| `fastapi-pdf-tool` | (gateway dt.acreediasolutions.com/auth/*) | (aucun, service systemd à créer) | (host) | `root:acreed-dev` | (à définir) | aucune |
| `freyr` | https://freyr.acreediasolutions.com | `freyr_frontend`, `freyr_backend`, `freyr_postgres` | `acreed-prod` + `freyr_internal` | `root:acreed-dev` | `0.0.0.0:8070-8071` (dette UFW) | postgres:16-alpine |
| `horizon` | https://horizon.acreediasolutions.com | `horizon-frontend-1`, `horizon-backend-1`, `horizon-db-1` | `acreed-prod` | `root:acreed-dev` | `127.0.0.1:8100-8101` | postgres:16-alpine (volume `horizon_pg_data`) |
| `mimir` | https://mimir.acreediasolutions.com | `mimir-backend-prod`, `mimir-db-prod` (frontend retiré D2) | `acreed-tools` (backend) + `mimir-prod_gestion-immo-prod` (db) | `kierangauthier:acreed-dev` | `127.0.0.1:8081, 5433` | postgis/postgis:16 (volume external `acreed-ia_postgres_data_prod`) |
| `n8n` | https://n8n.acreediasolutions.com | `n8n-n8n-1` | `acreed-tools` | `kierangauthier:kierangauthier` (top), `azureuser:azureuser` (data/) | `127.0.0.1:5678` | SQLite (bind `./data` → container) |
| `ostara` | https://ostara.acreedconsulting.com | (aucun Docker, 13 process PM2 sous tdufr) | (host) | `tdufr:acreed-dev` | `0.0.0.0:4100-4107` (dette UFW) | aucune (apps stateless) |
| `outline` | https://outline.acreediasolutions.com | `outline-outline-1`, `postgres-1`, `redis-1` | `acreed-prod` | `root:acreed-dev` | `127.0.0.1:3010` | postgres:14 (bind `./data/postgres`) |
| `puyfoot43` | https://puyfoot43.acreediasolutions.com | `pf43_frontend`, `_backend`, `_postgres`, `_mailpit` | `acreed-tools` (3 exposés) + `puyfoot43_pf43_internal` (db) | `kierangauthier:acreed-dev` | `0.0.0.0:8050-8051` (dette UFW), `127.0.0.1:8052` | postgres:16-alpine (bind `./data_postgres`) + SQLite `pf43_ops.db` (backend/data/) |
| `verif-paie-web` | https://outil.rh.acreediasolutions.com | `verif-paie-frontend`, `verif-paie-backend` | `acreed-prod` | `root:acreed-dev` | `0.0.0.0:8091, 8093` (dette UFW) | aucune (services stateless) |

### `/srv/prod/sites/`

| Slug | URL publique | Containers | Réseau | Owner | Port loopback | DB |
|---|---|---|---|---|---|---|
| `site-final-acreed` | https://site.acreedconsulting.com | `site-final-acreed-frontend-1`, `-api-1` | `acreed-prod` | `root:acreed-dev` | `0.0.0.0:3001, 8888` (dette UFW) | aucune (volume `db-data` léger) |

### `/srv/dev/tools/`

| Slug | URL publique | Containers | Réseau | Owner | Port loopback | DB |
|---|---|---|---|---|---|---|
| `mimir` | (pas d'URL publique, dev) | `mimir-db-dev` (postgres seul, backend volontairement non démarré) | `acreed-dev` + `mimir-dev_gestion-immo-dev-net` | `kierangauthier:acreed-dev` | `127.0.0.1:5435` | postgis/postgis:16 (volume external `gestion-immo-dev_postgres_data_dev`) |
| `puyfoot43` | (pas d'URL publique, dev) | (aucun running, dossier prêt) | `acreed-dev` (au prochain up) | `root:acreed-dev` | (aucun) | bind `./data_postgres` |

### `/srv/claude/`

| Sous-dossier | Rôle |
|---|---|
| `memory/` | Mémoires Claude (user/feedback/project/reference) |
| `skills/` | Procédures réutilisables (deploy-client, audit-prod, ...) |
| `runbooks/` | Runbooks ops (humain-lisibles) |
| `scripts/` | Scripts one-shot |
| `projects/` | Clones Git pour exploration |
| `observability/` | Requêtes Grafana, runbooks alertes |
| `docs/` | Documentation (architecture, lessons-learned, REX, commercial, legal, user) |
| `trash-archives/` | Archives historiques Claude |

---

## 3. Conventions de nommage (résumé)

Pour chaque projet, **6 noms dérivent du slug** (cf convention §4) :

| Élément | Convention | Exemple `mimir` |
|---|---|---|
| Chemin | `/srv/<env>/<sous-cat>/<slug>/` | `/srv/prod/tools/mimir/` |
| URL | `<slug>.acreediasolutions.com` (ou `consulting`) | `mimir.acreediasolutions.com` |
| Réseau Docker | `acreed-<env>` (4 réseaux globaux) | `acreed-tools` (backend exposé) + `mimir-prod_gestion-immo-prod` (interne) |
| Container | `<slug>-<service>` (ou `<slug>-<service>-<env>`) | `mimir-backend-prod`, `mimir-db-prod` |
| Schéma DB | `<slug_underscored>` | `acreed_db` (historique, à harmoniser) |
| Volume Docker | `<slug>-<purpose>` (ou external pour cas migrés) | `acreed-ia_postgres_data_prod` (external après bascule) |

**Exceptions documentées** (cf convention §5) : `convertisseur-dt` → `dt.acreediasolutions.com`, `verif-paie-web` → `outil.rh.acreediasolutions.com`, `site-final-acreed` → `site.acreedconsulting.com`.

---

## 4. 4 réseaux Docker globaux

| Réseau | Subnet | Label | Usage |
|---|---|---|---|
| `acreed-prod` | 172.100.0.0/16 | `acreed.env=prod` | Containers prod exposés publiquement |
| `acreed-dev` | 172.101.0.0/16 | `acreed.env=dev` | Containers dev |
| `acreed-tools` | 172.102.0.0/16 | `acreed.env=tools` | Outils internes (mimir, n8n, puyfoot43, ostara…) |
| `acreed-trash` | 172.103.0.0/16 | `acreed.env=trash` | Containers en attente de décommission |

Chaque `docker-compose.yml` déclare son `acreed-<env>` en **réseau external** :
```yaml
networks:
  default:
    name: acreed-prod
    external: true
```
(option simple) ou en option A pour les composes ayant déjà un réseau interne nommé :
```yaml
networks:
  <projet>_internal:
    driver: bridge
  acreed-prod:
    external: true
```
+ `- acreed-prod` ajouté à chaque service exposé (cf incidents `lessons-learned-session-a.md`).

---

## 5. Cas particuliers

### Ostara (monorepo PM2)

`/srv/prod/tools/ostara/` est un **monorepo** : dashboard (port 4100) + 7 apps générées (`apps/projet-test`, `projet-v2`, `test-v3`, `test-v4`, `v5`, `v6`, `qdsef` sur ports 4101-4107) + `engine/`, `templates/`, `registry/`, `output/`. **On ne scinde pas** : les apps partagent les `node_modules`/`engine`/`templates` du parent.

Lancement via PM2 sous user `tdufr` (`pm2-tdufr.service`). Dump persistant : `/home/tdufr/.pm2/dump.pm2`.

Quand un client Ostara payant arrivera (M+3+) → `/srv/prod/ostara-clients/` distinct.

### Astreos (hors tools/, racine prod/)

3 caractéristiques justifient son emplacement :
1. Criticité prod (utilisé par les consultants Acreed Consulting)
2. Symlinks `/etc/*` → `astreos/deploy/` (source de vérité)
3. Couplage Supabase locale (`127.0.0.1:54321`) avec dette `service_role_key` (Voie B)

Containers Supabase : project name Compose `supabase` (ID `ksevdfdvebyymeygpdwh`). **Risque latent** : tout futur `compose down/up` Supabase orphelinerait les volumes 1.2 GB. À programmer ajout `name: supabase` au compose en session dédiée.

### Slugs partagés prod ↔ dev

`mimir` et `puyfoot43` ont une version prod (`/srv/prod/tools/`) et dev (`/srv/dev/tools/`). Le project name Compose dérivé du basename serait identique → collision. Solution appliquée Session A : `name: <slug>-prod` et `name: <slug>-dev` explicites au top-level des composes.

### Sans Docker

- `convertisseur-dt` : uvicorn host, service systemd (`convertisseur-dt.service`, User=tdufr, port 8002), DB SQLite locale `backend/database.db`. Patches manuels au `mv` (unit + nginx + crontab tdufr + UPDATE SQL paths absolus).
- `fastapi-pdf-tool` : pas de service actif aujourd'hui (à créer Phase 1.6bis). Gateway MSAL devant le converter, mêmes URL `dt.acreediasolutions.com/auth/*`.

---

## 6. Hors `/srv/`

| Chemin | Pourquoi pas dans `/srv/` |
|---|---|
| `/opt/gitlab/` | Installation GitLab Omnibus — package distro, hors scope migration applicative |
| `/opt/acreed-synth/` | Données partagées via bind mount n8n (`/opt/acreed-synth:/data/acreed-synth`). Pas un runtime indépendant. Pourrait être déplacé sous `n8n/data/` mais hors scope. |
| `/var/www/html/` | Default nginx, page placeholder |
| `/var/www/mimir/` | Frontend statique mimir servi directement par nginx host (le clone container D2 a été retiré en Session A 4.4) |
| `/var/www/Suivi-consultant/` | Web associé à astreos ? À clarifier (D14, hors scope Session A) |
| `/home/tdufr/.pm2/` | Dump PM2 persistant ostara — vit chez l'user qui exécute PM2 |
| `/home/tdufr/.local/bin/uvicorn` | Binaire convertisseur-dt installé chez tdufr (lié au User=tdufr du systemd unit) |

---

## 7. Comment regénérer ce document

Pour vérifier que ce doc reste à jour après un changement infra :

```bash
# Arborescence /srv/
sudo find /srv -maxdepth 3 -type d 2>/dev/null | sort

# Containers + réseaux par projet
for c in $(docker ps --format '{{.Names}}'); do
  net=$(docker inspect "$c" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
  echo "$c → $net"
done

# Vérifier qu'aucun projet runtime ne traîne hors /srv/
ls /opt/ 2>/dev/null | grep -vE "(gitlab|^$|acreed-synth|az|containerd)"
ls /home/kierangauthier/claude-secure/ 2>/dev/null
ls /home/azureuser/ 2>/dev/null | grep -vE "^\.|Desktop|Documents|Downloads|Music|Pictures|Public|Templates|Videos|composer|snap|thinclient"

# 4 réseaux acreed-*
docker network ls --filter "label=acreed.env" --format "{{.Name}}"

# Toutes les URLs publiques répondent
for url in \
  https://astreos.acreedconsulting.com \
  https://site.acreedconsulting.com \
  https://horizon.acreediasolutions.com \
  https://outline.acreediasolutions.com \
  https://freyr.acreediasolutions.com \
  https://mimir.acreediasolutions.com \
  https://puyfoot43.acreediasolutions.com \
  https://outil.rh.acreediasolutions.com \
  https://ostara.acreedconsulting.com \
  https://n8n.acreediasolutions.com \
  https://dt.acreediasolutions.com
do
  code=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 5 "$url")
  echo "$code  $url"
done
```

Si la sortie diverge significativement de l'inventaire ci-dessus (nouveaux projets, projets disparus, réseaux inattendus, URL en 5xx), mettre à jour ce doc en mentionnant la date et la cause du changement.

---

**Version 1.0 — 2026-04-27** — Émis post-Session A. Prochaine relecture suggérée : à l'issue de Session B (Voie B Supabase + Phase 7 finalisation `/srv/claude/`).
