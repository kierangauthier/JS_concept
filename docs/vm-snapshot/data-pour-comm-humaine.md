# Data pour communication humaine — Session A 2026-04-27

> **Public** : ce fichier est de la matière première factuelle pour rédiger ailleurs deux documents de communication (un pour le président d'Acreed, un pour onboarder un nouveau dev). **Pas de narration ici, juste des faits.**

---

## 1. Tableau AVANT (avant Session A — état au matin 2026-04-27 ~10:45)

| Projet | Chemin avant | Owner FS | URL publique | Conformité convention |
|---|---|---|---|---|
| outline | `/srv/prod/outline/` | root:acreed-dev | outline.acreediasolutions.com | partielle (manque sous-cat tools/) |
| freyr | `/srv/prod/freyr/` | root:acreed-dev | freyr.acreediasolutions.com | partielle |
| verif-paie-web | `/srv/prod/verif-paie-web/` | root:acreed-dev | outil.rh.acreediasolutions.com | partielle |
| horizon | `/srv/prod/horizon/` | root:acreed-dev | horizon.acreediasolutions.com | partielle |
| site-final-acreed | `/srv/prod/site-final-acreed/` | root:acreed-dev | site.acreedconsulting.com | partielle |
| convertisseur-dt | `/srv/prod/convertisseur-dt/` | root:acreed-dev | dt.acreediasolutions.com | partielle |
| fastapi-pdf-tool | `/srv/prod/fastapi-pdf-tool/` | root:acreed-dev | (gateway dt/auth/*) | partielle |
| puyfoot-dev (slug) | `/srv/dev/puyfoot-dev/` | root:acreed-dev | (pas d'URL publique, dev) | partielle (slug à renommer) |
| astreos | `/home/kierangauthier/claude-secure/astreos/` | tdufr:acreed-dev | astreos.acreedconsulting.com | hors `/srv/` |
| n8n | `/home/azureuser/n8n/` | kierangauthier (top), azureuser (data) | n8n.acreediasolutions.com | hors `/srv/`, owner azureuser |
| mimir (ex-acreed-ia) | `/opt/acreed-ia/` | kierangauthier:acreed-dev | mimir.acreediasolutions.com | hors `/srv/`, container `gestion-immo-*-prod` |
| puyfoot43 prod (ex-puyfoot-prod) | `/opt/puyfoot-prod/` | kierangauthier:acreed-dev | puyfoot43.acreediasolutions.com | hors `/srv/` |
| mimir-dev (ex-gestion-immo-dev) | `/home/kierangauthier/claude-secure/gestion-immo-dev/` | kierangauthier:acreed-dev | (pas d'URL, dev) | hors `/srv/`, container `gestion-immo-*-dev` |
| ostara (ex-app-builder) | `/home/kierangauthier/claude-secure/app-builder/` | tdufr:acreed-dev | ostara.acreedconsulting.com | hors `/srv/` |

**Projets supprimés en Session A** :

| Projet | Chemin supprimé | Raison |
|---|---|---|
| js-concept (POC janvier) | `/srv/apps/js-concept/` | obsolète, refait avec PACK-PILOTE |
| claude-ops-home | `/srv/claude-ops-home/` | dormant depuis 23/04 |
| thor (ancêtre converter-dt) | `/var/www/thor/` | remplacé par convertisseur-dt |
| Suivi_consultant_V2 fantôme | `/home/kierangauthier/claude-secure/Suivi_consultant_final/` | dossier vide 16K + crontab cassée |
| camif-front (container standalone) | (container Docker) | décommissionné |

---

## 2. Tableau APRÈS (post-Session A — état 2026-04-27 ~16:30)

| Projet | Chemin après | Owner FS | URL publique | Conformité convention |
|---|---|---|---|---|
| outline | `/srv/prod/tools/outline/` | root:acreed-dev | outline.acreediasolutions.com | ✅ |
| freyr | `/srv/prod/tools/freyr/` | root:acreed-dev | freyr.acreediasolutions.com | ✅ |
| verif-paie-web | `/srv/prod/tools/verif-paie-web/` | root:acreed-dev | outil.rh.acreediasolutions.com | ✅ |
| horizon | `/srv/prod/tools/horizon/` | root:acreed-dev | horizon.acreediasolutions.com | ✅ |
| site-final-acreed | `/srv/prod/sites/site-final-acreed/` | root:acreed-dev | site.acreedconsulting.com | ✅ |
| convertisseur-dt | `/srv/prod/tools/convertisseur-dt/` | root:acreed-dev | dt.acreediasolutions.com | ✅ |
| fastapi-pdf-tool | `/srv/prod/tools/fastapi-pdf-tool/` | root:acreed-dev | (gateway dt/auth/*) | ✅ |
| astreos | `/srv/prod/astreos/` (racine prod, cas spécial) | tdufr:acreed-dev | astreos.acreedconsulting.com | ✅ |
| n8n | `/srv/prod/tools/n8n/` | kierangauthier (top), azureuser (data) | n8n.acreediasolutions.com | ✅ |
| mimir | `/srv/prod/tools/mimir/` | kierangauthier:acreed-dev | mimir.acreediasolutions.com | ✅ (containers `mimir-*-prod`) |
| puyfoot43 prod | `/srv/prod/tools/puyfoot43/` | kierangauthier:acreed-dev | puyfoot43.acreediasolutions.com | ✅ |
| puyfoot43 dev | `/srv/dev/tools/puyfoot43/` (slug renommé depuis puyfoot-dev) | root:acreed-dev | (pas d'URL, dev) | ✅ |
| mimir dev | `/srv/dev/tools/mimir/` | kierangauthier:acreed-dev | (pas d'URL, dev) | ✅ (containers `mimir-*-dev`) |
| ostara | `/srv/prod/tools/ostara/` | tdufr:acreed-dev | ostara.acreedconsulting.com | ✅ (PM2 monorepo, 13 process) |

---

## 3. Métriques avant/après chiffrées

| Métrique | Avant | Après | Δ |
|---|---|---|---|
| Disque utilisé / | 76 G / 993 G (8%) | 78 G / 993 G (8%) | +2 G (archives Session A 200 M, déjà comptées en avant) |
| Containers Docker total | 41 | 34 | -7 (camif-front + 3 gestion-immo-*-prod renommés mimir-* + frontend D2 retiré + mimir-backend-dev pas relancé + js-concept) |
| Containers prod runtime up | ~20 | 22 (10 prod tools, 2 prod sites, 1 mimir prod backend, 1 mimir prod db, 8 supabase astreos) | stable |
| Réseaux Docker | 18 | 18 | 4 ajoutés (acreed-{prod,dev,tools,trash}) + 4 supprimés (js_concept_final_default, acreed-network, acreed-ia_gestion-immo-prod recyclé, autres anciens) |
| Réseau acreed-prod | absent | 1 (172.100.0.0/16) | +1 |
| Réseau acreed-dev | absent | 1 (172.101.0.0/16) | +1 |
| Réseau acreed-tools | absent | 1 (172.102.0.0/16) | +1 |
| Réseau acreed-trash | absent | 1 (172.103.0.0/16) | +1 |
| Projets sous `/srv/` | 8 | 14 | +6 (astreos, n8n, mimir prod, puyfoot43 prod, mimir dev, ostara migrés depuis hors `/srv/`) |
| Projets hors `/srv/` (runtime) | 6 | 0 | -6 |
| URLs publiques en 200 | 11/11 (avant migration) | 11/11 (après migration) | conservé |
| Symlinks `/etc/*` astreos → `deploy/` | 0 | 5 | +5 (Phase 4 du runbook complète) |
| Slug `acreed-dev` (env Claude) | `/srv/acreed-dev/` | `/srv/claude/` | renommé |
| Volumes Docker historiques avec données | en place mais détachés post-mv | rebranchés via `external: true / name:` | bug volume orphelin résolu |
| Archive Session A | n/a | 200 M dans `~/trash-archives/20260427/` | filets de sécurité posés |

---

## 4. Commandes utiles post-migration

### État global

```bash
# Tous les services up
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

# Containers actifs par projet
for c in $(docker ps --format '{{.Names}}'); do
  net=$(docker inspect "$c" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
  echo "$c → $net"
done

# 4 réseaux acreed-*
docker network ls --filter "label=acreed.env"

# Volumes Docker
docker volume ls
```

### Connexion aux bases

```bash
# mimir prod (DB sur volume external acreed-ia_postgres_data_prod)
docker exec -it mimir-db-prod psql -U postgres -d acreed_db

# mimir dev (DB sur volume external gestion-immo-dev_postgres_data_dev)
docker exec -it mimir-db-dev psql -U camif_user -d gestion_immo_dev

# horizon
docker exec -it horizon-db-1 psql -U tresorerie -d tresorerie

# puyfoot43 prod
docker exec -it pf43_postgres psql -U pf43 -d pf43_ops

# outline (redis + postgres)
docker exec -it outline-postgres-1 psql -U outline -d outline

# convertisseur-dt (SQLite, pas de container)
sqlite3 /srv/prod/tools/convertisseur-dt/backend/database.db
```

### Logs

```bash
# Logs ostara dashboard
sudo -u tdufr -H bash -lc "/home/tdufr/.nvm/versions/node/v24.14.0/bin/pm2 logs ostara-dashboard --lines 50"

# Logs PM2 tous
sudo -u tdufr -H bash -lc "/home/tdufr/.nvm/versions/node/v24.14.0/bin/pm2 list"

# Logs astreos notifications
sudo journalctl -u astreos-notifications.service -n 50

# Logs convertisseur-dt
sudo journalctl -u convertisseur-dt.service -n 50

# Logs container Docker
docker logs <container_name> --tail 50
```

### Trouver à quel projet appartient un container

```bash
docker inspect <container_name> --format '{{ index .Config.Labels "com.docker.compose.project" }}'
# ou
docker compose ls
```

### Vhosts nginx par URL

```bash
# Lister tous les vhosts actifs
ls /etc/nginx/sites-enabled/

# Trouver le vhost qui sert une URL
sudo grep -l "<sous-domaine>" /etc/nginx/sites-enabled/*

# Recharger nginx après modif
sudo nginx -t && sudo systemctl reload nginx
```

### Redémarrer un projet

```bash
# Projet Docker (ex: mimir prod)
cd /srv/prod/tools/mimir
sudo docker compose -f docker-compose.prod.yml restart

# Projet PM2 (ostara)
sudo -u tdufr -H bash -lc "/home/tdufr/.nvm/versions/node/v24.14.0/bin/pm2 restart ostara-dashboard"
sudo systemctl restart pm2-tdufr.service  # restart total

# Service systemd (ex: convertisseur-dt, astreos)
sudo systemctl restart convertisseur-dt.service
sudo systemctl restart astreos-notifications.service
```

---

## 5. À ne jamais faire (règles éprouvées en Session A)

1. **Ne jamais `cat .env`** ou tout fichier qui peut contenir des secrets dans une session interactive. Rediriger vers `/tmp/output.txt` chmod 600 si analyse nécessaire. Utiliser `printenv VAR_NAME` pour vérifier une variable précise. (4 fuites tracées dont 1 le 2026-04-27 sur convertisseur-dt.)
2. **Ne jamais `sed -i` sur un fichier `.db` SQLite** ou tout binaire — corruption garantie. Pour patcher des paths absolus dans une DB, utiliser `UPDATE SQL` transactionnel. Pour les binaires (venv), recréer plutôt que patcher.
3. **Ne jamais `docker compose down -v`** sauf intention explicite — le `-v` supprime les volumes et leurs données. Le `down` simple suffit.
4. **Ne jamais `chown -R kierangauthier:kierangauthier`** aveuglément après un `mv` quand le service tourne sous un autre user (tdufr, azureuser…). Le `mv` préserve l'owner — c'est l'état correct.
5. **Ne jamais lancer un compose sans préciser `-f`** quand le projet a plusieurs variants (`docker-compose.yml`, `docker-compose.prod.yml`, `.dev.yml`). Vérifier avec quel variant le projet tournait avant de redémarrer.
6. **Ne jamais ignorer une URL `200`** comme preuve de bon fonctionnement. Une DB vide avec schéma initialisé donne aussi 200. Toujours valider via `SELECT COUNT(*) FROM <table métier>`.
7. **Ne jamais avoir 2 composes avec le même project name** (basename de dossier). Toujours déclarer `name: <slug>-prod` / `name: <slug>-dev` au top-level pour les slugs partagés prod/dev. Sinon les volumes nommés s'écrasent à chaque `up -d`.
8. **Ne jamais ajouter un bloc `networks:` aveuglément à la fin d'un compose** qui a déjà un bloc `networks:` top-level — YAML invalide. Utiliser l'option A : ajouter le réseau external dans le bloc existant + référencer dans les services exposés.
9. **Ne jamais skipper la conversion CRLF→LF** avant un `sed` sur un fichier édité Windows. `sed -i 's/\r$//'` puis sed normal.
10. **Ne jamais agir sur une commande qui échoue ou un check qui ne valide pas**. STOP + alerte critical + attente GO. Pas d'auto-fix.
11. **Ne jamais oublier les filets** : `cp .bak`, `tar tgz`, `pg_dumpall` chmod 600, journal horodaté avant toute action irréversible. Le coût d'un filet est < 1 min, le coût d'une perte de données est imprévisible.

---

## 6. Glossaire

### Slugs et sous-domaines

| Slug | Sous-domaine | Type |
|---|---|---|
| astreos | astreos.acreedconsulting.com | Outil interne Acreed Consulting |
| site-final-acreed | site.acreedconsulting.com | Site marketing Acreed Consulting |
| ostara | ostara.acreedconsulting.com | Éditeur d'apps interne Acreed (monorepo) |
| outline | outline.acreediasolutions.com | Wiki interne |
| freyr | freyr.acreediasolutions.com | CRM prospect Acreed IA Solutions |
| horizon | horizon.acreediasolutions.com | Outil RH (trésorerie / gestion) |
| mimir | mimir.acreediasolutions.com | POC immobilier (ex-"gestion-immo") |
| puyfoot43 | puyfoot43.acreediasolutions.com | Suivi marketing maison (Puy Foot 43) |
| n8n | n8n.acreediasolutions.com | Automatisation workflows |
| convertisseur-dt | dt.acreediasolutions.com | Converter Dossier Technique (FastAPI) |
| fastapi-pdf-tool | (dt/auth/*) | Gateway MSAL devant convertisseur-dt |
| verif-paie-web | outil.rh.acreediasolutions.com | Outil RH paie |

### Entités Acreed

- **Acreed Consulting** : cabinet IT / portage. Domaines : `acreedconsulting.com`. Outils internes : astreos (consultants), site institutionnel.
- **Acreed IA Solutions** : éditeur SaaS pour TPE/PME. Domaines : `acreediasolutions.com`. Produit phare : ConceptManager (à venir, pas encore déployé). Outils internes : freyr, horizon, mimir, n8n, etc.

### Produits internes

| Nom | Type | Usage |
|---|---|---|
| Astreos | Application web | Outil consultants Acreed Consulting (chantiers, projets, lectures) |
| Ostara | Builder d'apps | Génère et héberge 7+ apps clients (dashboard 4100 + apps 4101-4107) |
| Mimir | POC immobilier | Ex "gestion-immo", démonstrateur (renommé Mimir en Session A) |
| Freyr | CRM | Suivi prospects commerciaux Acreed IA Solutions |
| Horizon | Outil RH/trésorerie | Suivi financier interne |
| Puyfoot43 | Marketing | Suivi club Puy Foot 43 (sponsoring) |
| n8n | Automatisation | Workflows (ACREED Synthèse, Voice-to-Mail, Agent IA Recherche Emploi, etc.) |
| Convertisseur-DT | Outil RH | Conversion CVs en Dossier Technique standardisé |

### Termes Docker / infra

- **Slug** : identifiant kebab-case unique d'un projet, pivot pour 6 noms (cf convention §4).
- **Réseau acreed-{prod,dev,tools,trash}** : 4 réseaux Docker globaux qui isolent dev/prod et regroupent les outils.
- **Project name Compose** : par défaut, basename du dossier où vit le `docker-compose.yml`. Configurable via `name:` au top-level.
- **Bind mount** : `./data:/var/lib/postgresql/data` — le dossier vit sur le host, suit le `mv` du dossier compose.
- **Volume Docker nommé** : `postgres_data_prod` — stocké dans `/var/lib/docker/volumes/<project>_<volname>/`. Préfixé par le project name → orphelin si project name change.
- **Volume external** : `external: true / name: <ancien_volume>` — référence un volume existant par son nom absolu sans préfixe project.

---

## 7. Identité utilisateurs

| User | UID | Usage |
|---|---|---|
| `kierangauthier` | (à vérifier) | Compte admin principal, owner /srv/, exécute les sessions Claude |
| `tdufr` | 1001 (probable) | Tristan Dufraisseix, owner astreos + ostara, exécute pm2-tdufr.service |
| `azureuser` | 1000 (probable) | User par défaut Azure VM, owner historique de n8n et certains data dirs |
| `root` | 0 | Owner historique des fichiers `/etc/`, `/var/www/`, certains projets `/srv/prod/tools/` |

Convention post-Session A : préserver l'owner historique au mv (skip chown systématique). Le service tourne sous le user qui possède ses fichiers.

---

**Version 1.0 — 2026-04-27** — Données factuelles brutes, à utiliser comme matière première pour rédiger documents de communication humaine ailleurs.
