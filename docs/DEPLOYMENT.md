# Déploiement ConceptManager — guide opérationnel

Ce document décrit comment déployer une instance ConceptManager
(démo, client payant) sur l'infrastructure Acreed (VM Azure AVD-01)
ou ailleurs.

Le `docker-compose.yml` est paramétré : un seul template, autant d'instances
qu'on veut, isolation stricte par `PROJECT_SLUG` et `DEPLOY_ENV`.

---

## Vue d'ensemble

| Élément | Démo (dev) | Client prod (ex: js-concept) |
|---|---|---|
| `PROJECT_SLUG` | `demo` | `js-concept` |
| `DEPLOY_ENV` | `dev` | `prod` |
| `ACREED_NETWORK` | `acreed-dev` | `acreed-prod` |
| Chemin VM | `/srv/dev/conceptmanager/demo/` | `/srv/prod/conceptmanager/js-concept/` |
| URL publique | `conceptmanager.acreediasolutions.com` | `js-concept.acreediasolutions.com` |
| Containers | `cm-demo-{db,api,frontend,minio}` | `cm-js-concept-{db,api,frontend,minio}` |
| Volumes | `cm-demo-{pgdata,miniodata}` | `cm-js-concept-{pgdata,miniodata}` |

Tous les ports sont bindés sur `127.0.0.1` (loopback). L'exposition publique
passe par nginx host + Let's Encrypt (étapes ci-dessous).

---

## Pré-requis serveur

- Docker + Docker Compose v2
- Réseau Docker `acreed-{dev,prod,tools}` créé en amont (`docker network create`)
- nginx + certbot installés (pour vhost + cert HTTPS)
- Accès `sudo` pour l'utilisateur de déploiement
- Sous-domaine DNS pointant vers l'IP du serveur

---

## Procédure de déploiement (instance neuve)

### 1. Créer l'arborescence

```bash
SLUG=<slug>     # ex: demo, js-concept, asp-signalisation
ENV=<env>       # dev | prod
TARGET=/srv/$ENV/conceptmanager/$SLUG

sudo mkdir -p "$TARGET"
sudo chown $USER:acreed-$ENV "$TARGET"
cd "$TARGET"
```

### 2. Cloner le repo (deploy key SSH recommandée)

```bash
git clone github.com-js-concept:kierangauthier/JS_concept.git .
```

### 3. Préparer le `.env`

```bash
cp .env.example .env
chmod 600 .env
```

Éditer `.env` et renseigner :

**Section déploiement** :
- `PROJECT_SLUG` : kebab-case, identique au nom de dossier
- `DEPLOY_ENV` : `dev` ou `prod`
- `ACREED_NETWORK` : `acreed-dev` ou `acreed-prod`
- Les 5 ports loopback : choisir des valeurs uniques sur le serveur,
  dans les plages conventionnelles documentées dans `.env.example`

**Section secrets applicatifs** : générer toutes les valeurs uniques :
```bash
openssl rand -base64 32 | tr -d '/+=' | head -c 32   # POSTGRES_PASSWORD, MINIO_ROOT_PASSWORD
openssl rand -base64 48                                # JWT_SECRET, INVOICE_HMAC_KEY
echo "cm$(openssl rand -hex 4)"                        # MINIO_ROOT_USER
```

⚠️ **Sauvegarder les 5 secrets dans un password manager** (Bitwarden recommandé)
avec une entrée dédiée par instance. Format suggéré :
- Title : `ConceptManager <SLUG> <ENV> — <serveur>`
- 5 champs cachés : `POSTGRES_PASSWORD`, `JWT_SECRET`, `INVOICE_HMAC_KEY`,
  `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`

⚠️ **`INVOICE_HMAC_KEY` scelle les Factur-X**. Ne jamais le rotater seul :
toutes les factures précédemment scellées deviendraient juridiquement invalides.

⚠️ **`ANTHROPIC_API_KEY=` (vide)** par défaut. Politique Acreed : l'IA tourne
en local sur la VM client (RAG + LLM local), pas via API publique. Ne pas
activer en runtime client.

### 4. Démarrer la stack

```bash
docker compose build
docker compose up -d
```

Vérifier les 4 containers UP :
```bash
docker ps --filter "name=cm-${SLUG}" --format "table {{.Names}}\t{{.Status}}"
```

Attendu : `cm-<slug>-{db,api,frontend,minio}` tous Up, db `(healthy)`.

### 5. Migrations Prisma

Les migrations s'appliquent automatiquement au démarrage de l'API
(via `npx prisma migrate deploy` dans le `CMD` du Dockerfile).

Vérifier :
```bash
docker exec cm-${SLUG}-db psql -U concept -d concept_manager -c '\dt' | wc -l
```

Attendu : ≥ 43 tables (les 43 du schema.prisma + `_prisma_migrations`).

### 6. Création de l'admin

Trois options selon le contexte (audit à faire en première intention) :

**Option A — Endpoint API** (si activé) :
```bash
ADMIN_PWD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)

# Sauvegarder ADMIN_PWD dans Bitwarden / ~/.secrets/ AVANT de continuer.

curl -sX POST http://127.0.0.1:${API_HOST_PORT}/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@<domaine>\",\"password\":\"$ADMIN_PWD\",\"fullName\":\"Admin\"}"

unset ADMIN_PWD
```

**Option B — Seed Prisma** (si configuré) :
```bash
docker exec cm-${SLUG}-api npx prisma db seed
```

**Option C — INSERT SQL direct** (fallback) : voir le runbook de référence.

### 7. Vhost nginx + cert HTTPS

```bash
# Vhost (template à adapter)
sudo tee /etc/nginx/sites-available/${SLUG}.acreediasolutions.com <<EOF
server {
    listen 80;
    server_name ${SLUG}.acreediasolutions.com;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${SLUG}.acreediasolutions.com;

    ssl_certificate /etc/letsencrypt/live/${SLUG}.acreediasolutions.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${SLUG}.acreediasolutions.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_HOST_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/${SLUG}.acreediasolutions.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Cert Let's Encrypt
sudo certbot --nginx -d ${SLUG}.acreediasolutions.com \
  --non-interactive --agree-tos -m kieran.gauthier@acreediasolutions.com

sudo systemctl reload nginx
```

### 8. Validation finale

```bash
# URL HTTPS publique
curl -sI https://${SLUG}.acreediasolutions.com | head -3
# Attendu : HTTP/2 200 (page login)

# API health (via vhost ou direct loopback)
curl -sI https://${SLUG}.acreediasolutions.com/api/health | head -3
```

Test manuel : ouvrir l'URL dans un navigateur, login admin, tour fonctionnel.

---

## Mise à jour d'une instance existante

```bash
cd /srv/<env>/conceptmanager/<slug>
git fetch origin && git pull origin main
docker compose build
docker compose up -d
```

Les migrations Prisma s'appliquent automatiquement au boot.

---

## Conventions de ports loopback

Pour éviter les conflits sur un serveur hébergeant plusieurs instances,
respecter ces plages :

| Service | Plage dev | Plage prod | Exemple `demo` (dev) | Exemple `js-concept` (prod) |
|---|---|---|---|---|
| Postgres | 5440-5449 | 5450-5499 | 5445 | 5450 |
| API | 3090-3099 | 3100-3199 | 3095 | 3100 |
| Frontend | 8090-8099 | 8100-8199 | 8095 | 8100 |
| MinIO API | 9090-9099 | 9100-9199 | 9095 | 9100 |
| MinIO Console | 9090-9099 | 9100-9199 | 9096 | 9101 |

---

## Décommissionnement d'une instance

```bash
cd /srv/<env>/conceptmanager/<slug>

# 1. Backup DB final
docker exec cm-<slug>-db pg_dumpall -U concept | gzip > ~/backup-cm-<slug>-$(date +%Y%m%d).sql.gz

# 2. Stop containers (sans -v, on archive les volumes avant)
docker compose down

# 3. Backup volumes (tar.gz hors-site)
docker run --rm -v cm-<slug>-pgdata:/data -v ~/backups:/backup alpine \
  tar czf /backup/cm-<slug>-pgdata-$(date +%Y%m%d).tar.gz -C /data .

# 4. Suppression volumes
docker volume rm cm-<slug>-pgdata cm-<slug>-miniodata

# 5. Vhost + cert
sudo certbot delete --cert-name <slug>.acreediasolutions.com
sudo rm /etc/nginx/sites-enabled/<slug>.acreediasolutions.com
sudo nginx -t && sudo systemctl reload nginx

# 6. Suppression dossier (après vérification du backup)
sudo mv /srv/<env>/conceptmanager/<slug> ~/trash-archives/$(date +%Y%m%d)/
```

---

## Troubleshooting

### Erreur `PROJECT_SLUG must be set in .env`

Le `.env` n'est pas chargé. Vérifier :
- Présence du fichier `.env` à la racine du projet (à côté de `docker-compose.yml`)
- Variable `PROJECT_SLUG` non vide
- Pas de quotes autour des valeurs : `PROJECT_SLUG=demo` (pas `PROJECT_SLUG="demo"`)

### Erreur `network acreed-dev declared as external, but could not be found`

Le réseau Docker n'existe pas. Le créer :
```bash
docker network create acreed-dev --label "acreed.env=dev" --subnet 172.101.0.0/16
```

### Erreur Prisma libssl au démarrage de l'API

L'image Docker doit avoir `openssl` installé (Alpine 3.20+ ne le ship plus
par défaut). Vérifier `api/Dockerfile` contient `apk add --no-cache openssl`
côté builder ET runner. Et `api/prisma/schema.prisma` contient
`binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`.

### Conflit de port lors du `up -d`

Vérifier qu'aucune autre instance ConceptManager (ou autre service) n'utilise
le même port. Auditer avec :
```bash
sudo ss -tlnp | grep -E ":(POSTGRES_HOST_PORT|API_HOST_PORT|...)"
```

Si conflit, ajuster les ports dans `.env` (rester dans les plages
conventionnelles).

---

## Références

- Convention Acreed `/srv/` : `docs/convention-srv.md`
- Architecture VM AVD-01 : `docs/vm-snapshot/architecture/arborescence-vm.md`
- Lessons learned Session A (incidents 7, 8, 9) : `docs/vm-snapshot/lessons-learned-session-a.md`
- Pack pilote ConceptManager : `PACK-PILOTE.md`
