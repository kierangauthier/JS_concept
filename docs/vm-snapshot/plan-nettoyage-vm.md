# Plan de nettoyage VM Azure AVD-01

> **Objectif** : faire passer la VM de *fourre-tout expérimental* à *infra de production propre*, prête à héberger ConceptManager JS et ASP Signalisation.
>
> **Durée totale estimée** : 10-12 heures de travail, étalées sur 3-4 jours.
>
> **Règle absolue** : on ne supprime jamais sans archiver d'abord. Chaque phase inclut un filet de sécurité.
>
> **Rollback** : à chaque fin de phase, on documente un `ROLLBACK` en commentaire. Si quelque chose casse, on sait comment revenir.
>
> **Version** : 1.0 — 2026-04-23

---

## Vue d'ensemble des 7 phases

| # | Phase | Durée | Risque | Précondition |
|---|---|---|---|---|
| 0 | Sécurité urgente | 1 h | Nul | — |
| 1 | Archivage + suppression orphelins | 1,5 h | Faible | Phase 0 finie |
| 2 | Création des 4 réseaux Docker | 15 min | Nul | Phase 1 finie |
| 3 | Migration projets vers leurs réseaux | 2 h | Moyen | Phase 2 finie |
| 4 | Symlinks astreos (Scénario A du doc review) | 30 min | Faible | Phase 3 finie |
| 5 | Stack observabilité Prometheus+Loki+Grafana+Alertmanager | 2 h | Faible | Phase 3 finie |
| 6 | Backup externe Azure Blob | 1 h | Faible | Phase 3 finie |
| 7 | Claude dans /srv/acreed-dev + skills | 1 h | Nul | Phase 5 finie |

---

## PHASE 0 — Sécurité urgente (1 h)

**Pourquoi maintenant :** des secrets en clair et des ports exposés au monde. Si on attend, on signe JS avec une VM vulnérable.

### 0.1 — Préparer le dossier d'archives

```bash
mkdir -p ~/trash-archives
mkdir -p ~/trash-archives/$(date +%Y%m%d)
cd ~/trash-archives/$(date +%Y%m%d)
echo "Archives VM cleanup $(date)" > README.txt
```

### 0.2 — Rotation des tokens GitHub exposés

**Liste des tokens à rotater** :
- `/opt/puyfoot-prod/.git/config` (remote origin)
- `/opt/acreed-ia/.git/config` (remote origin)
- `/home/kierangauthier/claude-secure/puyfoot-dev/.git/config`
- `/home/kierangauthier/claude-secure/gestion-immo-dev/.git/config`

**Étape 1** — Aller sur GitHub → Settings → Developer settings → Personal access tokens → **Révoquer tous les tokens `ghp_...`** qui apparaissent dans ces URL.

**Étape 2** — Créer une **deploy key** par repo (plus sûr qu'un PAT) :

```bash
# Pour chaque repo, génère une clé SSH dédiée
for repo in puyfoot-prod acreed-ia puyfoot-dev gestion-immo-dev; do
  ssh-keygen -t ed25519 -N "" -f ~/.ssh/deploy_${repo} -C "deploy-key-${repo}"
  echo ""
  echo "── Deploy key pour $repo ──"
  cat ~/.ssh/deploy_${repo}.pub
  echo ""
done
```

Tu copies chaque clé publique, tu l'ajoutes dans **Settings → Deploy keys** du repo GitHub correspondant.

**Étape 3** — Reconfigurer les remotes git en SSH avec la bonne clé :

```bash
# ~/.ssh/config — une section par repo
cat >> ~/.ssh/config <<'EOF'

Host github-puyfoot-prod
  HostName github.com
  User git
  IdentityFile ~/.ssh/deploy_puyfoot-prod
  IdentitiesOnly yes

Host github-acreed-ia
  HostName github.com
  User git
  IdentityFile ~/.ssh/deploy_acreed-ia
  IdentitiesOnly yes

Host github-puyfoot-dev
  HostName github.com
  User git
  IdentityFile ~/.ssh/deploy_puyfoot-dev
  IdentitiesOnly yes

Host github-gestion-immo-dev
  HostName github.com
  User git
  IdentityFile ~/.ssh/deploy_gestion-immo-dev
  IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config
```

```bash
# Remplace les remotes
sudo git -C /opt/puyfoot-prod remote set-url origin github-puyfoot-prod:kierangauthier/PuyFoot43.git
sudo git -C /opt/acreed-ia remote set-url origin github-acreed-ia:kierangauthier/habitat-hub.git
git -C /home/kierangauthier/claude-secure/puyfoot-dev remote set-url origin github-puyfoot-dev:kierangauthier/PuyFoot43.git
git -C /home/kierangauthier/claude-secure/gestion-immo-dev remote set-url origin github-gestion-immo-dev:kierangauthier/Gestion_immo_V2.git

# Vérification — plus aucun ghp_ ne doit apparaître
for r in /opt/puyfoot-prod /opt/acreed-ia /home/kierangauthier/claude-secure/puyfoot-dev /home/kierangauthier/claude-secure/gestion-immo-dev; do
  echo "── $r ──"
  sudo git -C "$r" remote -v 2>/dev/null || git -C "$r" remote -v
done
```

### 0.3 — Rotation du token Supabase dans la crontab

```bash
# Crée un fichier de secrets user-owned
mkdir -p ~/.secrets
chmod 700 ~/.secrets
cat > ~/.secrets/supabase-astreos <<EOF
# Token Supabase pour le cron de purge logs Astreos
SUPABASE_SECRET=$(read -s -p "Colle le nouveau token Supabase : " token && echo "$token")
EOF
chmod 600 ~/.secrets/supabase-astreos

# NOTE: avant cette étape, va dans Supabase Studio et régénère le service_role_key
# pour invalider l'ancien token qui était dans la crontab.

# Édite la crontab
crontab -e
# Remplace la ligne 'curl POST .../purge-old-logs -H "Authorization: Bearer sb_secret_..."'
# par :
# 0 3 1 * * . ~/.secrets/supabase-astreos && curl -X POST http://127.0.0.1:54321/functions/v1/purge-old-logs -H "Authorization: Bearer $SUPABASE_SECRET" >> /var/log/supabase-purge.log 2>&1
```

### 0.4 — Fermer les Postgres exposés publiquement

**Problème identifié** : `gestion-immo-db-prod` (port 5433) et `gestion-immo-db-dev` (port 5435) sont accessibles depuis Internet.

```bash
# Édite /opt/acreed-ia/docker-compose.prod.yml
# Change : - "5433:5432"  →  - "127.0.0.1:5433:5432"
sudo sed -i 's|- "5433:5432"|- "127.0.0.1:5433:5432"|' /opt/acreed-ia/docker-compose.prod.yml

# Édite /home/kierangauthier/claude-secure/gestion-immo-dev/docker-compose.backend.yml
sed -i 's|- "5435:5432"|- "127.0.0.1:5435:5432"|' /home/kierangauthier/claude-secure/gestion-immo-dev/docker-compose.backend.yml

# Applique sans downtime visible (recréation des containers DB)
cd /opt/acreed-ia && sudo docker compose -f docker-compose.prod.yml up -d
cd /home/kierangauthier/claude-secure/gestion-immo-dev && docker compose -f docker-compose.backend.yml up -d

# Vérification : les ports doivent maintenant être en 127.0.0.1
sudo ss -tlnp | grep -E ":5433|:5435"
```

### 0.5 — Activer le firewall UFW

```bash
# Règles avant activation
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Vérifie les règles proposées AVANT activation
sudo ufw show added

# Active (attention : ta session SSH utilise bien le port 22 ?)
sudo ufw enable

# Vérification
sudo ufw status verbose
```

> **⚠️ Attention** : si après `ufw enable` tu perds ta session SSH, BNC peut restaurer la VM via la console Azure. Mais normalement, tu as autorisé le port 22, tout se passe bien.

### 0.6 — Validation Phase 0

```bash
echo "── Check 1 : plus aucun ghp_ dans les remotes ──"
sudo grep -r "ghp_" /opt/puyfoot-prod/.git /opt/acreed-ia/.git 2>/dev/null && echo "❌ Token encore présent" || echo "✅ OK"
grep -r "ghp_" /home/kierangauthier/claude-secure/*/\.git 2>/dev/null && echo "❌ Token encore présent" || echo "✅ OK"

echo ""
echo "── Check 2 : plus aucun sb_secret_ dans la crontab user ──"
crontab -l | grep -c "sb_secret_" && echo "❌ Token dans crontab" || echo "✅ OK"

echo ""
echo "── Check 3 : Postgres ne sont plus sur 0.0.0.0 ──"
sudo ss -tlnp | grep -E ":5433|:5435" | grep -v "127.0.0.1" && echo "❌ Encore exposé" || echo "✅ OK"

echo ""
echo "── Check 4 : UFW actif ──"
sudo ufw status | grep -E "^Status: active" && echo "✅ OK" || echo "❌ UFW inactif"
```

### ROLLBACK Phase 0

Si un problème : les fichiers `docker-compose.*` sont versionnés, `git diff` montre les changements. Pour revenir : `git checkout -- <fichier>` + `docker compose up -d`.

Pour UFW : `sudo ufw disable`.

---

## PHASE 1 — Archivage + suppression des orphelins (1,5 h)

**Pourquoi** : libérer de l'espace et de la complexité avant de réorganiser. On archive tout pour pouvoir revenir en arrière si besoin.

### 1.1 — Archiver tous les candidats au trash

```bash
ARCHIVE_DIR=~/trash-archives/$(date +%Y%m%d)
cd $ARCHIVE_DIR

# Dossiers abandonnés
# ⚠️ fastapi-pdf-tool : NE PAS ARCHIVER — composant actif (auth gateway MSAL pour
# cv-dt.acreediasolutions.com, cf. REDIRECT_URI dans .env). Voir phase 1.6bis
# pour sa remise en service.
# sudo tar czf fastapi-pdf-tool.tar.gz /home/kierangauthier/fastapi-pdf-tool 2>/dev/null
sudo tar czf acreed-synth.tar.gz /opt/acreed-synth 2>/dev/null
sudo tar czf camif-capture-pro.tar.gz /home/kierangauthier/camif-capture-pro 2>/dev/null
sudo tar czf thor-bak-old.tar.gz /var/www/thor.bak..2026-01-21-133208 2>/dev/null
sudo tar czf suivi-consultant-prev.tar.gz /var/www/Suivi-consultant.prev 2>/dev/null
sudo tar czf acreed-ia-solutions-varwww-astreos.tar.gz /var/www/astreos 2>/dev/null

# Projets Docker stoppés à supprimer
sudo tar czf authentik-compose.tar.gz /opt/authentik 2>/dev/null
sudo tar czf js-concept-old-image-info.txt <(docker inspect js-concept 2>/dev/null) 2>/dev/null
sudo tar czf js_concept_final-compose.tar.gz /home/kierangauthier/claude-secure/JS_Concept_final 2>/dev/null

# Liste ce qu'on a archivé
ls -lh *.tar.gz
```

### 1.2 — Supprimer les containers Docker obsolètes

```bash
# Authentik (stoppé, décommissionné)
docker rm authentik authentik-worker authentik-postgres authentik-redis 2>/dev/null
docker volume rm authentik_authentik_postgres authentik_authentik_redis 2>/dev/null

# js-concept orphan (container running, sera remplacé par la nouvelle version)
docker stop js-concept
docker rm js-concept
docker rmi js-concept:latest 2>/dev/null

# js_concept_final (compose stoppé)
docker rm js_concept_final-frontend-1 js_concept_final-api-1 js_concept_final-postgres-1 js_concept_final-minio-1 2>/dev/null
docker volume rm js_concept_final_pgdata js_concept_final_miniodata 2>/dev/null

# horizon-test-db (vestige exited)
docker rm horizon-test-db 2>/dev/null

# pf43_api_dev (container exited incohérent)
docker rm pf43_api_dev 2>/dev/null

# supabase_edge_runtime (exited, 11 min)
docker rm supabase_edge_runtime_ksevdfdvebyymeygpdwh 2>/dev/null
```

### 1.3 — Supprimer le site camif (coordonné)

```bash
# Couper le container camif-front du compose n8n
cd /home/azureuser/n8n
sudo docker compose stop camif-front
sudo docker rm camif-front 2>/dev/null

# Retirer la section camif-front du docker-compose.yml n8n
sudo cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d)
# Édite manuellement le fichier pour retirer le bloc "camif-front:"
sudo nano docker-compose.yml

# Applique
sudo docker compose up -d

# Vérifie que n8n tourne toujours
docker ps | grep n8n
```

### 1.4 — Supprimer les dossiers abandonnés

```bash
# Ces dossiers sont archivés (étape 1.1), on peut supprimer sans crainte
# ⚠️ fastapi-pdf-tool : À CONSERVER — c'est l'auth gateway MSAL devant
# cv-dt.acreediasolutions.com (voir phase 1.6bis). NE PAS SUPPRIMER.

sudo rm -rf /opt/acreed-synth
rm -rf /home/kierangauthier/camif-capture-pro
sudo rm -rf /var/www/thor.bak..2026-01-21-133208
sudo rm -rf /var/www/Suivi-consultant.prev
sudo rm -rf /var/www/astreos
```

### 1.6bis — Remise en service de `fastapi-pdf-tool` (composant actif non démarré)

**Découverte** : le `.env` de `/home/kierangauthier/fastapi-pdf-tool` contient :
```
TENANT_ID=32066917-68fb-4a5b-aee8-cbdb423e01c8
CLIENT_ID=556e78d7-9152-4283-aba4-56e2ab269fc6
REDIRECT_URI=https://cv-dt.acreediasolutions.com/auth/callback
```

C'est donc la **gateway d'authentification Microsoft (MSAL)** qui protège le
service `cv-dt.acreediasolutions.com` (Convertisseur Dossier Technique). Elle
tournait probablement via `uvicorn` en direct, sans service systemd, et le
redémarrage VM l'a orphelinée.

**Vérification** : le service est-il référencé ailleurs ?
```bash
# Trouver un éventuel vhost nginx qui reverse-proxy vers elle
sudo grep -rn "cv-dt" /etc/nginx/ 2>/dev/null
sudo grep -rn "fastapi-pdf-tool\|:8001\|:8002" /etc/nginx/ 2>/dev/null

# Voir si un process uvicorn existait dans les logs
sudo journalctl --since "7 days ago" | grep -i "fastapi-pdf-tool\|uvicorn" | head -20

# Vérifier si le vhost cv-dt répond toujours (probablement 502 si gateway down)
curl -sI https://cv-dt.acreediasolutions.com | head -5
```

**Création d'un service systemd** (pour qu'elle démarre au boot et redémarre en
cas de crash) :

```bash
sudo tee /etc/systemd/system/fastapi-pdf-tool.service > /dev/null <<'EOF'
[Unit]
Description=FastAPI MSAL auth gateway for cv-dt.acreediasolutions.com
After=network.target

[Service]
Type=simple
User=kierangauthier
WorkingDirectory=/home/kierangauthier/fastapi-pdf-tool
EnvironmentFile=/home/kierangauthier/fastapi-pdf-tool/.env
ExecStart=/home/kierangauthier/fastapi-pdf-tool/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# ⚠️ AJUSTE le port (--port 8001) selon ce qui sort de `grep ":800" /etc/nginx/`.
# Si le vhost nginx proxy vers 8002, remplace.

sudo systemctl daemon-reload
sudo systemctl enable --now fastapi-pdf-tool.service
sudo systemctl status fastapi-pdf-tool.service

# Test
curl -sI https://cv-dt.acreediasolutions.com | head -5
```

**Classification réseau Docker** : ce service n'étant **pas dockerisé** (venv
Python direct), il ne rentre pas dans un réseau Docker. Mais il sert de la prod
→ le considérer comme tel pour les phases backups (phase 6) et monitoring
(phase 5).

**Action à planifier plus tard** : dockeriser `fastapi-pdf-tool` +
`convertisseur-dt` ensemble dans un compose, et les mettre dans `acreed-prod`.
Pas urgent — le systemd + reverse-proxy nginx suffit pour l'instant.

> **⚠️ NOTE IMPORTANTE** : **on NE supprime PAS `/var/www/Suivi-consultant/`** — c'est le dossier servi par nginx pour astreos.acreedconsulting.com. La confusion précédente est corrigée.

### 1.5 — Nettoyer le vhost nginx cassé

Le vhost `conceptmanager.conf` pointe vers `8090` et `3020` qui n'existent plus.

```bash
sudo cp /etc/nginx/sites-enabled/conceptmanager.conf ~/trash-archives/$(date +%Y%m%d)/
sudo rm /etc/nginx/sites-enabled/conceptmanager.conf
sudo rm /etc/nginx/sites-available/conceptmanager.conf  # si symlink cassé

sudo nginx -t && sudo systemctl reload nginx
```

### 1.6 — Désactiver les services systemd obsolètes

```bash
# php8.3-fpm : actif mais aucun vhost nginx ne l'utilise
sudo systemctl disable --now php8.3-fpm.service

# horizon-backup.service : unit file absent, référence cassée
sudo systemctl disable horizon-backup.service 2>/dev/null
```

### 1.7 — Purger le build cache Docker (gain disque 9 Go)

```bash
# Avant
docker system df

# Purge
docker builder prune -a -f

# Après
docker system df
```

### 1.8 — Validation Phase 1

```bash
echo "── Containers à supprimer — doivent avoir disparu ──"
docker ps -a | grep -E "authentik|js-concept|js_concept_final|horizon-test-db|pf43_api_dev|camif-front" && echo "❌ Encore présents" || echo "✅ OK"

echo ""
echo "── Dossiers à supprimer — doivent avoir disparu ──"
for d in /opt/acreed-synth /home/kierangauthier/camif-capture-pro /var/www/Suivi-consultant.prev /var/www/astreos; do
  test ! -d "$d" && echo "✅ $d supprimé" || echo "❌ $d existe encore"
done

echo ""
echo "── Dossiers à CONSERVER ──"
test -d /var/www/Suivi-consultant && echo "✅ /var/www/Suivi-consultant présent (normal)" || echo "❌ SUPPRIMÉ PAR ERREUR"
test -d /home/kierangauthier/fastapi-pdf-tool && echo "✅ /home/kierangauthier/fastapi-pdf-tool présent (auth gateway cv-dt)" || echo "❌ SUPPRIMÉ PAR ERREUR"

echo ""
echo "── Service fastapi-pdf-tool actif ──"
systemctl is-active fastapi-pdf-tool.service 2>/dev/null | grep -q active && echo "✅ OK" || echo "❌ Inactif — voir phase 1.6bis"

echo ""
echo "── Gain disque ──"
df -h / | tail -1
```

### ROLLBACK Phase 1

Tout est archivé dans `~/trash-archives/$(date +%Y%m%d)/`. Pour restaurer un projet :
```bash
cd ~/trash-archives/$(date +%Y%m%d)
sudo tar xzf <projet>.tar.gz -C /
```

---

## PHASE 2 — Création des 4 réseaux Docker (15 min)

**Pourquoi** : isoler la prod du dev au niveau réseau. Un container dev ne pourra jamais parler à un container prod.

### 2.1 — Création

```bash
docker network create acreed-prod   --label "acreed.env=prod"   --subnet 172.100.0.0/16
docker network create acreed-dev    --label "acreed.env=dev"    --subnet 172.101.0.0/16
docker network create acreed-tools  --label "acreed.env=tools"  --subnet 172.102.0.0/16
docker network create acreed-trash  --label "acreed.env=trash"  --subnet 172.103.0.0/16

docker network ls --filter "label=acreed.env"
```

### 2.2 — Validation

```bash
docker network inspect acreed-prod | grep -E "Name|Subnet"
docker network inspect acreed-dev | grep -E "Name|Subnet"
```

---

## PHASE 3 — Migration des projets vers leurs réseaux (2 h)

**Pourquoi** : c'est l'étape qui transforme "tout sur un même réseau bridge" en "isolation stricte par environnement".

**Principe** : pour chaque projet, on ajoute au `docker-compose.yml` la section `networks:` qui déclare le bon réseau externe, puis on fait un `docker compose up -d` qui recrée les containers dans le bon réseau. **Zéro downtime visible**.

### 3.1 — Tableau de migration

| Projet | Réseau cible | Dossier compose |
|---|---|---|
| `site-final-acreed` | `acreed-prod` | `/home/kierangauthier/claude-secure/site-final-acreed/` |
| `outline` | `acreed-prod` | `/opt/outline/` |
| `acreed-ia` (gestion-immo) | `acreed-prod` | `/opt/acreed-ia/` |
| `freyr` | `acreed-prod` | `/home/kierangauthier/claude-secure/freyr/` |
| `puyfoot-prod` | `acreed-prod` | `/opt/puyfoot-prod/` |
| `verif-paie-web` | `acreed-prod` | `/home/kierangauthier/claude-secure/verif-paie-web/` |
| `horizon` | `acreed-dev` (puis `prod` dans 1 semaine) | `/home/kierangauthier/claude-secure/horizon/` |
| `gestion-immo-dev` | `acreed-dev` | `/home/kierangauthier/claude-secure/gestion-immo-dev/` |
| `puyfoot-dev` | `acreed-trash` (à supprimer, redondant avec prod) | `/home/kierangauthier/claude-secure/puyfoot-dev/` |
| `app-builder` (Ostara) | `acreed-dev` | pas Docker (PM2) — skip |
| `supabase CLI (astreos)` | `acreed-dev` | lancé par systemd, via docker network connect |
| `n8n` | `acreed-tools` | `/home/azureuser/n8n/` |
| `GitLab` | `acreed-trash` (décommission à venir) | Omnibus système |

### 3.2 — Template de migration par projet

Pour chaque projet à migrer, la procédure est identique :

```bash
# Exemple : migrer site-final-acreed vers acreed-prod
cd /home/kierangauthier/claude-secure/site-final-acreed

# Backup du compose
cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d)

# Ajoute networks: en bas du fichier
cat >> docker-compose.yml <<'EOF'

networks:
  default:
    name: acreed-prod
    external: true
EOF

# Recréation des containers dans le nouveau réseau
docker compose down
docker compose up -d

# Vérification
docker inspect site-final-acreed_frontend_1 | grep -A 3 Networks
```

### 3.3 — Script de migration batch (optionnel)

```bash
# Si tu veux tout migrer en une commande — à utiliser avec précaution
cat > ~/migrate-project.sh <<'EOF'
#!/bin/bash
# Usage : ./migrate-project.sh <chemin_dossier> <acreed-prod|acreed-dev|acreed-tools>
set -e
DIR=$1
NET=$2

cd "$DIR" || exit 1
cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d)

# Ajoute la section networks si pas déjà présente
if ! grep -q "name: $NET" docker-compose.yml; then
  cat >> docker-compose.yml <<EOT

networks:
  default:
    name: $NET
    external: true
EOT
fi

docker compose down
docker compose up -d
docker compose ps
EOF
chmod +x ~/migrate-project.sh
```

### 3.4 — Migration dans l'ordre (critique : commencer par les moins sensibles)

```bash
# Dev d'abord (moins critique)
~/migrate-project.sh /home/kierangauthier/claude-secure/horizon acreed-dev
~/migrate-project.sh /home/kierangauthier/claude-secure/gestion-immo-dev acreed-dev

# Puis prod (plus critique mais pas de clients payants dessus)
~/migrate-project.sh /home/kierangauthier/claude-secure/site-final-acreed acreed-prod
~/migrate-project.sh /opt/outline acreed-prod
~/migrate-project.sh /opt/acreed-ia acreed-prod
~/migrate-project.sh /home/kierangauthier/claude-secure/freyr acreed-prod
~/migrate-project.sh /opt/puyfoot-prod acreed-prod
~/migrate-project.sh /home/kierangauthier/claude-secure/verif-paie-web acreed-prod

# Outils
~/migrate-project.sh /home/azureuser/n8n acreed-tools

# Tests : chaque URL publique doit toujours répondre
for url in https://site.acreedconsulting.com https://outline.acreediasolutions.com https://mimir.acreediasolutions.com https://freyr.acreediasolutions.com https://puyfoot43.acreediasolutions.com https://outil.rh.acreedconsulting.com https://horizon.acreedconsulting.com https://n8n.acreedconsulting.com; do
  code=$(curl -sI -o /dev/null -w "%{http_code}" "$url")
  echo "$code $url"
done
```

### 3.5 — Suppression de puyfoot-dev (orphelin)

```bash
cd /home/kierangauthier/claude-secure/puyfoot-dev
docker compose down -v  # -v supprime les volumes dev
cd ~
tar czf ~/trash-archives/$(date +%Y%m%d)/puyfoot-dev.tar.gz -C /home/kierangauthier/claude-secure puyfoot-dev
rm -rf /home/kierangauthier/claude-secure/puyfoot-dev
```

### 3.6 — Validation Phase 3

```bash
echo "── Vérification : tous les containers prod sont dans acreed-prod ──"
for c in site-final-acreed_frontend_1 outline-outline-1 gestion-immo-frontend-prod freyr_frontend pf43_frontend verif-paie-frontend; do
  net=$(docker inspect "$c" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null)
  echo "$c → $net"
done

echo ""
echo "── Vérification : tous les sites publics répondent en 200 ──"
# (commande déjà au 3.4)
```

### ROLLBACK Phase 3

Les `docker-compose.yml.bak.YYYYMMDD` sont créés automatiquement. Pour rollback un projet :
```bash
cd <projet>
cp docker-compose.yml.bak.<date> docker-compose.yml
docker compose down && docker compose up -d
```

---

## PHASE 4 — Symlinks astreos (Scénario A du doc review) (30 min)

**Pourquoi** : le doc review Astreos propose de remplacer les fichiers `/etc/*` par des symlinks vers `astreos/deploy/*` pour que le dossier astreos soit l'unique source de vérité. Excellente idée.

### 4.1 — Backup des fichiers actuels

```bash
ARCHIVE_DIR=~/trash-archives/$(date +%Y%m%d)/astreos-etc-backup
mkdir -p $ARCHIVE_DIR

sudo cp /etc/nginx/sites-available/astreos $ARCHIVE_DIR/
sudo cp /etc/cron.d/astreos-backup $ARCHIVE_DIR/
sudo cp /etc/astreos-backup.env $ARCHIVE_DIR/
sudo cp /etc/systemd/system/astreos-notifications.service $ARCHIVE_DIR/
sudo cp /etc/systemd/system/supabase-start.service $ARCHIVE_DIR/
sudo cp /etc/logrotate.d/astreos-backup $ARCHIVE_DIR/

ls -lh $ARCHIVE_DIR
```

### 4.2 — Vérifier que les fichiers dans astreos/deploy/ sont identiques

```bash
ASTREOS=/home/kierangauthier/claude-secure/astreos/deploy

diff /etc/nginx/sites-available/astreos $ASTREOS/nginx-astreos.conf
diff /etc/cron.d/astreos-backup $ASTREOS/astreos-backup.cron
diff /etc/systemd/system/astreos-notifications.service $ASTREOS/astreos-notifications.service
diff /etc/systemd/system/supabase-start.service $ASTREOS/supabase-start.service
diff /etc/logrotate.d/astreos-backup $ASTREOS/astreos-backup.logrotate

# Si des différences : DÉCIDE quelle version garder avant de continuer.
```

### 4.3 — Remplacer par des symlinks

```bash
ASTREOS=/home/kierangauthier/claude-secure/astreos/deploy

sudo rm /etc/nginx/sites-available/astreos
sudo ln -s $ASTREOS/nginx-astreos.conf /etc/nginx/sites-available/astreos

sudo rm /etc/cron.d/astreos-backup
sudo ln -s $ASTREOS/astreos-backup.cron /etc/cron.d/astreos-backup

sudo rm /etc/systemd/system/astreos-notifications.service
sudo ln -s $ASTREOS/astreos-notifications.service /etc/systemd/system/astreos-notifications.service

sudo rm /etc/systemd/system/supabase-start.service
sudo ln -s $ASTREOS/supabase-start.service /etc/systemd/system/supabase-start.service

sudo rm /etc/logrotate.d/astreos-backup
sudo ln -s $ASTREOS/astreos-backup.logrotate /etc/logrotate.d/astreos-backup

# /etc/astreos-backup.env contient des secrets — on ne le symlink PAS, on le garde tel quel.
# Il doit juste être backupé (phase 6).

# Rechargement
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl daemon-reload
sudo systemctl restart astreos-notifications.service
```

### 4.4 — Validation Phase 4

```bash
echo "── Symlinks actifs ──"
ls -la /etc/nginx/sites-available/astreos /etc/cron.d/astreos-backup /etc/systemd/system/astreos-notifications.service /etc/systemd/system/supabase-start.service /etc/logrotate.d/astreos-backup

echo ""
echo "── Services toujours OK ──"
sudo systemctl status astreos-notifications.service | head -5
curl -sI https://astreos.acreedconsulting.com | head -3
```

### ROLLBACK Phase 4

```bash
sudo rm /etc/nginx/sites-available/astreos
sudo cp ~/trash-archives/$(date +%Y%m%d)/astreos-etc-backup/astreos /etc/nginx/sites-available/
# idem pour les autres fichiers
sudo systemctl daemon-reload && sudo systemctl reload nginx
```

---

## PHASE 5 — Stack observabilité (2 h)

**Pourquoi** : passer de "je ne sais pas ce qui se passe en prod" à "je suis alerté sur Teams avant que le client s'en rende compte".

> **Cette phase sera détaillée dans un document séparé `docs/observability-stack.md`** produit après la Phase 3, parce qu'elle dépend du bon placement des réseaux Docker.

**Composants** :
- Prometheus (métriques, 15 j de rétention) dans `acreed-prod`
- Loki (logs, 30 j de rétention) dans `acreed-prod`
- Node-exporter + cAdvisor + Blackbox-exporter + Postgres-exporter
- Alertmanager → webhook Teams (3 canaux : Critical / Warning / Info)
- Grafana dans `acreed-dev`
- 7 alertes "zone verte" configurées

**Prérequis avant démarrage** :
- Les 3 webhooks Teams (URL) créés par Kieran
- Les 4 réseaux Docker créés (phase 2)

---

## PHASE 6 — Backup externe Azure Blob (1 h)

**Pourquoi** : si la VM crame demain, on a 30 jours de backup hors-site.

### 6.1 — Créer un compte Azure Blob Storage

**Demander à BNC** de créer un Storage Account Azure dédié backups, dans une **région différente** de la VM (ex : West Europe / Amsterdam si la VM est à Paris).

Récupérer :
- Storage account name
- Access key (ou SAS token)
- Container name (ex : `acreed-backups`)

### 6.2 — Installer Azure CLI

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az login --use-device-code
```

### 6.3 — Script de backup quotidien

```bash
cat > ~/bin/backup-daily.sh <<'EOF'
#!/bin/bash
set -e

DATE=$(date +%Y-%m-%d)
BACKUP_DIR=/tmp/backups-$DATE
mkdir -p $BACKUP_DIR

# === Postgres prod ===
for container in $(docker ps --filter "network=acreed-prod" --format "{{.Names}}" | grep -E "postgres|db"); do
  echo "Backup $container..."
  docker exec "$container" pg_dumpall -U postgres > "$BACKUP_DIR/pg-$container-$DATE.sql"
  gzip "$BACKUP_DIR/pg-$container-$DATE.sql"
done

# === Fichiers MinIO (s'il y en a) ===
# docker exec ... mc mirror ...

# === Chiffrement avec GPG (clé publique ops) ===
for f in $BACKUP_DIR/*.gz; do
  gpg --encrypt --recipient backup@acreediasolutions.com --output "$f.gpg" "$f"
  rm "$f"
done

# === Upload Azure Blob ===
az storage blob upload-batch \
  --destination acreed-backups \
  --source "$BACKUP_DIR" \
  --pattern "*.gpg" \
  --account-name <STORAGE_ACCOUNT>

# === Cleanup local ===
rm -rf "$BACKUP_DIR"

# === Vérification : envoyer un message de succès sur Teams ===
curl -H 'Content-Type: application/json' -d '{"text":"✅ Backup quotidien OK"}' <TEAMS_WEBHOOK_INFO>
EOF
chmod +x ~/bin/backup-daily.sh
```

### 6.4 — Cron de backup

```bash
crontab -e
# Ajoute :
# 0 2 * * * ~/bin/backup-daily.sh >> /var/log/backup-daily.log 2>&1
```

### 6.5 — Test de restauration (obligatoire, 1× par trimestre)

Documenter dans `docs/runbooks/backup-restore-test.md` la procédure de restauration d'un backup chiffré depuis Azure Blob vers une instance test. **Un backup non testé n'est pas un backup.**

---

## PHASE 7 — Claude dans /srv/acreed-dev + skills (1 h)

**Pourquoi** : centraliser l'environnement dev, les skills, les mémoires, pour que Claude devienne un outil pro reproductible.

### 7.1 — Créer la structure

```bash
sudo mkdir -p /srv/acreed-dev
sudo chown kierangauthier:kierangauthier /srv/acreed-dev
cd /srv/acreed-dev

mkdir -p memory skills projects observability scripts runbooks

# Initialiser CLAUDE.md
cat > CLAUDE.md <<'EOF'
# Environnement de développement Acreed IA Solutions

Ce dossier est la **racine opérationnelle** de tout ce que l'équipe fait
avec Claude : skills réutilisables, mémoires partagées, scripts, runbooks.

## Principes

1. **Lecture seule sur la prod**. Claude peut interroger Grafana/Loki mais
   jamais agir directement sur les containers `acreed-prod`.
2. **Toute action prod passe par Git + redéploiement**. Jamais de modif
   directe sur un container prod.
3. **Les skills sont versionnés**. Un skill qui marche = on le garde. Un
   skill cassé = on le documente comme cassé, on ne le supprime pas
   silencieusement.

## Arborescence

- `memory/` — index + mémoires factuelles (comme sur le poste Kieran)
- `skills/` — procédures réutilisables (deploy-client, audit-prod, etc.)
- `projects/` — clones Git des projets actifs
- `observability/` — requêtes Grafana types, runbooks alertes
- `scripts/` — scripts one-shot
- `runbooks/` — procédures opérationnelles (backup, restore, incident)
EOF
```

### 7.2 — Copier la mémoire stratégique depuis le poste Kieran

```bash
# Depuis le poste Kieran, pousse vers la VM (ou clone via Git)
# Exemple via scp :
# scp -r E:/Claude/ConceptManager/JS_Concept_final/memory/* kierangauthier@AVD-01:/srv/acreed-dev/memory/
```

### 7.3 — Créer les premiers skills squelettes

```bash
cd /srv/acreed-dev/skills

# Skill : déploiement d'un client ConceptManager
mkdir -p deploy-client
cat > deploy-client/SKILL.md <<'EOF'
# Déploiement d'un nouveau client ConceptManager

## Prérequis
- Le client a signé le contrat et payé l'acompte de 1 750 €.
- Son sous-domaine client a été créé chez OVH (A record → IP VM).
- Ses champs légaux (SIREN, TVA, IBAN, adresse) sont prêts.

## Procédure en 7 étapes

1. Cloner le template ConceptManager dans `/srv/acreed-dev/projects/`
2. Générer un `docker-compose.yml` dédié client (template)
3. Adapter les env vars (DB name, JWT secret unique, INVOICE_HMAC_KEY unique)
4. Démarrer le stack dans le réseau `acreed-prod`
5. Générer la config nginx + certbot pour `<client>.acreediasolutions.com`
6. Importer les données initiales du client (catalogue, clients existants)
7. Test complet : créer un client, un devis, une facture, télécharger le Factur-X

## Template nginx
Voir `/srv/acreed-dev/skills/deploy-client/nginx.template.conf`

## Rollback
- `docker compose down` + suppression du dossier projet
- Retirer la config nginx + `sudo nginx -t && sudo systemctl reload nginx`
- Retirer le DNS chez OVH
EOF

# Autres skills à créer au fil de l'eau
mkdir -p audit-prod backup-restore incident-response onboarding-ostara
```

### 7.4 — Validation Phase 7

```bash
ls -la /srv/acreed-dev/
cat /srv/acreed-dev/CLAUDE.md | head -10
ls /srv/acreed-dev/skills/
```

---

## Ordre recommandé d'exécution

### Jour 1 (aujourd'hui soir ou demain matin)
- Phase 0 (sécurité urgente) — 1 h **non négociable**

### Jour 2 (demain)
- Phase 1 (nettoyage) — 1,5 h
- Phase 2 (création réseaux) — 15 min
- Phase 3 (migration projets) — 2 h

### Jour 3
- Phase 4 (symlinks astreos) — 30 min
- Phase 5 (observabilité) — 2 h
- Validation croisée des phases 1-4

### Jour 4
- Phase 6 (backup externe) — 1 h
- Phase 7 (Claude /srv/acreed-dev) — 1 h
- Tests finaux + doc runbooks

---

## Points d'attention en cours d'exécution

1. **Ne jamais sauter la Phase 0.** Un token exposé = un risque majeur même si aucun client n'est encore dessus.
2. **Valider chaque phase avant la suivante.** Les checks de validation sont là pour ça.
3. **Ne pas lancer plusieurs phases en parallèle.** Tout doit être séquentiel pour avoir un rollback clair en cas de pépin.
4. **Garder un terminal SSH actif en permanence** pendant la Phase 0.5 (activation UFW) au cas où tu te coupes toi-même.
5. **Noter l'heure de début/fin de chaque phase** dans un fichier `~/cleanup-log.md` pour traçabilité.

---

## Questions encore ouvertes (à trancher en cours de route)

1. **GitLab décommission** : Phase 1 (archiver les 7 repos vers GitHub privé) ou plus tard ? → ma reco : **plus tard**, un sprint dédié de 3-4 h après les 7 phases.
2. **Webhooks Teams** : créer les 3 canaux (Critical / Warning / Info) avant la Phase 5.
3. **Azure Blob Storage pour backups** : demander à BNC ou créer soi-même ?

---

## ✅ Critères de "terminé"

La VM est **propre et prête pour JS Concept** quand :

- [ ] Zéro secret en clair (code, git, crontab, env)
- [ ] Tous les Postgres écoutent sur 127.0.0.1 uniquement
- [ ] UFW actif avec uniquement 22/80/443 autorisés
- [ ] 4 réseaux Docker créés, tous les projets assignés
- [ ] Zéro container "orphelin" (sans label compose)
- [ ] Zéro dossier "mort" (code non utilisé par aucun service)
- [ ] Stack observabilité opérationnelle, alertes Teams testées
- [ ] Backup quotidien opérationnel + test de restauration documenté
- [ ] `/srv/acreed-dev/` existe avec CLAUDE.md + 3 skills squelettes minimum
- [ ] Document runbook de restauration complet

---

**Fin du plan de nettoyage VM.**
