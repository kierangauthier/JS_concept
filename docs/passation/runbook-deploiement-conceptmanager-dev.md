# Runbook — Déploiement ConceptManager en dev sur AVD-01

> **Public** : Claude VM (ou Claude poste avec accès SSH) qui exécute le déploiement.
>
> **Kieran** : valide les checkpoints ✋ et reste disponible pour décisions.
>
> **Date émission** : 2026-04-28 (jour 1 chantier déploiement).
>
> **Pré-requis** : avoir lu `brief-claude-conceptmanager-dev.md` ET `/srv/claude/docs/convention-srv.md` ET `/srv/claude/docs/lessons-learned-session-a.md`.

---

## Décisions prises avec Kieran

| Décision | Valeur |
|---|---|
| Slug du déploiement | À confirmer en Phase 0 (probablement `js-concept` ou `demo`) |
| Emplacement | `/srv/dev/conceptmanager/<slug>/` |
| Réseau Docker | `acreed-dev` |
| URL publique | `conceptmanager.acreediasolutions.com` (existante, à auditer/configurer) |
| Méthode de push code | Git si remote configuré (R1), sinon scp/rsync (R2) |
| Mise en prod | **NON, pas tant que JS n'a pas signé** — décision Kieran 2026-04-28 |
| `name:` Compose | `cm-<slug>-dev` (top-level) |
| Project name container | `cm-<slug>-<service>` (frontend, api, db, minio) |
| Volume nommé | `cm-<slug>-pgdata`, `cm-<slug>-miniodata` (préfixé pour éviter collision future) |

---

## Phase 0 — Pré-vol

### 0.1 Validation décisions et environnement

```bash
teams-alert info "Phase 0 démarrée : pré-vol déploiement ConceptManager dev"

# Identité
whoami       # doit être kierangauthier
hostname     # doit être AVD-01

# Sudo OK
sudo -n true && echo "✅ sudo OK" || echo "❌ sudo demande pwd"

# Espace disque
df -h / | awk 'NR==2 { print "Disque libre : "$4" ("$5" utilisés)" }'

# Docker UP
docker ps > /dev/null 2>&1 && echo "✅ Docker OK" || echo "❌ Docker cassé"

# Réseau acreed-dev existe
docker network ls --filter "name=acreed-dev" --format "{{.Name}}"
# Doit afficher : acreed-dev

# Convention /srv/ en place
ls -la /srv/dev/conceptmanager/ 2>/dev/null || echo "⚠️ /srv/dev/conceptmanager/ absent — sera créé en Phase 2"
```

### 0.2 Sanity check : 11 URLs en service AVANT déploiement

```bash
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

**Tous doivent répondre 200 ou 302 ou 301**. Si un seul est en 5xx → STOP + ping Kieran (problème antérieur, pas lié à ce déploiement).

### 0.3 Audit conceptmanager.acreediasolutions.com — état actuel

```bash
# 1. Le DNS résout-il ?
dig +short conceptmanager.acreediasolutions.com A
# Doit retourner 4.178.179.147

# 2. Le sous-domaine répond-il en HTTPS ?
curl -sI https://conceptmanager.acreediasolutions.com 2>&1 | head -10

# 3. Y a-t-il un vhost nginx existant ?
sudo ls -la /etc/nginx/sites-enabled/ | grep -i conceptmanager
sudo ls -la /etc/nginx/sites-available/ | grep -i conceptmanager

# 4. Si vhost trouvé, lire vers où il pointe
sudo cat /etc/nginx/sites-enabled/conceptmanager* 2>/dev/null | grep -E "server_name|proxy_pass|root"

# 5. Existe-t-il un certificat Let's Encrypt ?
sudo ls /etc/letsencrypt/live/ 2>/dev/null | grep -i conceptmanager
```

### 0.4 Audit ports cibles disponibles

```bash
# Ports proposés pour ConceptManager dev
# frontend: 8095, api: 3095, postgres: 5445, minio: 9095/9096
for port in 8095 3095 5445 9095 9096; do
  used=$(sudo ss -tlnp 2>/dev/null | grep ":$port " | head -1)
  if [ -n "$used" ]; then
    echo "❌ :$port DÉJÀ PRIS : $used"
  else
    echo "✅ :$port libre"
  fi
done
```

Si un port est pris → choisir une alternative dans la plage 8090-8099 / 3090-3099 / 5440-5449 / 9090-9099 et mettre à jour les variables tout au long du runbook.

### 0.5 Préparer journal et archive

```bash
JOURNAL=~/runbook-deploy-conceptmanager-$(date +%Y%m%d).md
echo "# Journal déploiement ConceptManager dev — $(date -Iseconds)" > "$JOURNAL"
echo "✅ Journal : $JOURNAL"

ARCHIVE=~/trash-archives/$(date +%Y%m%d)
mkdir -p "$ARCHIVE"
echo "✅ Archives : $ARCHIVE"
```

### ✋ CHECKPOINT 0 — Validation pré-vol par Kieran

```bash
teams-alert critical "✋ CHECKPOINT 0 : Pré-vol terminé. Slug confirmé ? URL conceptmanager.acreediasolutions.com — état (libre/occupée) ? Méthode push code (Git/scp) ? Réponds GO + 3 valeurs."
```

**Attendre GO + valeurs** avant de continuer.

Notes attendues de Kieran :
- `SLUG=js-concept` (ou autre)
- État URL : `libre` ou `occupée par <truc>`
- Méthode : `git` ou `scp`

---

## Phase 1 — Récupération du code

### Variante A — Push via Git (si remote configuré)

#### 1.A.1 Côté poste Kieran (Windows)

```powershell
cd E:\Claude\ConceptManager\JS_Concept_final

# Vérifier l'état Git
git status
git remote -v
git branch --show-current

# Push de la branche courante
git push origin <branche>
```

#### 1.A.2 Côté VM

```bash
SLUG=<slug confirmé Kieran>
SOURCE_URL=<url remote Git récupérée côté Kieran>

cd /srv/dev/conceptmanager/
sudo mkdir -p $SLUG
cd $SLUG

# Cloner (en sudo si owner kierangauthier:acreed-dev nécessaire)
git clone $SOURCE_URL .

# Vérifier
ls -la
git log --oneline -5
```

### Variante B — Push via scp/rsync (si pas de remote Git)

#### 1.B.1 Côté poste Kieran (Windows PowerShell)

```powershell
$slug = "js-concept"  # ou autre
scp -r E:\Claude\ConceptManager\JS_Concept_final\* `
  kierangauthier@4.178.179.147:/tmp/conceptmanager-upload/

# Note : on push d'abord en /tmp/ pour ne pas polluer /srv/dev/
# tant qu'on n'est pas sûr que la copie est complète
```

#### 1.B.2 Côté VM — déplacement du /tmp vers la cible

```bash
SLUG=<slug confirmé>
TARGET=/srv/dev/conceptmanager/$SLUG

# Vérifier le upload temporaire
ls -la /tmp/conceptmanager-upload/ | head -10
du -sh /tmp/conceptmanager-upload/

# Créer le dossier cible
sudo mkdir -p $TARGET

# Copier (cp -a préserve les permissions)
sudo cp -a /tmp/conceptmanager-upload/* $TARGET/
sudo cp -a /tmp/conceptmanager-upload/.* $TARGET/ 2>/dev/null  # fichiers cachés (.env.example, .gitignore, etc.)

# Cleanup /tmp/
rm -rf /tmp/conceptmanager-upload/

# Owner = kierangauthier:acreed-dev (cohérent avec /srv/dev/)
sudo chown -R kierangauthier:acreed-dev $TARGET
```

### 1.X.3 Validation post-récupération

```bash
SLUG=<slug>
TARGET=/srv/dev/conceptmanager/$SLUG

cd $TARGET
ls -la
test -f docker-compose.yml && echo "✅ docker-compose.yml présent" || echo "❌ ABSENT"
test -f Dockerfile && echo "✅ Dockerfile présent" || echo "❌ ABSENT"
test -d api && echo "✅ dossier api/ présent" || echo "❌ ABSENT"
test -f .env.example && echo "✅ .env.example présent" || echo "❌ ABSENT"
test -f package.json && echo "✅ package.json présent" || echo "❌ ABSENT"

teams-alert info "Phase 1 OK : code ConceptManager récupéré dans $TARGET"
```

---

## Phase 2 — Configuration `.env` avec secrets uniques

### 2.1 Génération des secrets

```bash
SLUG=<slug>
TARGET=/srv/dev/conceptmanager/$SLUG
cd $TARGET

# Backup .env.example si on doit y revenir
cp .env.example .env.example.bak.$(date +%Y%m%d)

# Génération 5 secrets aléatoires forts
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
JWT_SECRET=$(openssl rand -base64 48)
INVOICE_HMAC_KEY=$(openssl rand -base64 48)
MINIO_ROOT_USER="cm$(openssl rand -hex 4)"
MINIO_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)

# Note : on NE STOCKE PAS ces variables en clair dans un fichier intermédiaire.
# On les écrit DIRECTEMENT dans .env via heredoc ci-dessous.
```

### 2.2 Création du `.env`

```bash
sudo tee $TARGET/.env > /dev/null <<EOF
# ConceptManager — Démo dev pour Acreed
# Généré $(date -Iseconds) — NE PAS COMMITER

NODE_ENV=production

POSTGRES_DB=concept_manager
POSTGRES_USER=concept
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

JWT_SECRET=$JWT_SECRET
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY_DAYS=7

INVOICE_HMAC_KEY=$INVOICE_HMAC_KEY

CORS_ORIGINS=https://conceptmanager.acreediasolutions.com

MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
MINIO_BUCKET=concept-files

ANTHROPIC_API_KEY=
EOF

# Permissions strictes
sudo chmod 600 $TARGET/.env
sudo chown kierangauthier:acreed-dev $TARGET/.env

# Vérifier que le .env est bien rempli (sans afficher les secrets)
sudo wc -l $TARGET/.env
sudo grep -c "^[A-Z_]\+=.\+$" $TARGET/.env
# Attendu : ~12 lignes avec valeurs

# IMPORTANT : NE PAS faire sudo cat $TARGET/.env (cf règle pas-de-cat-env)
```

### 2.3 Sauvegarde sécurisée des secrets pour Kieran

```bash
# Kieran doit avoir une copie chiffrée des secrets pour rotation future
# On sauvegarde dans ~/.secrets/ (chmod 700)

mkdir -p ~/.secrets
chmod 700 ~/.secrets

sudo tee ~/.secrets/conceptmanager-$SLUG-dev.env > /dev/null <<EOF
# Secrets ConceptManager dev $SLUG — généré $(date -Iseconds)
# Sauvegarde pour rotation. Ne jamais lire avec cat dans une session Claude.

POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
INVOICE_HMAC_KEY=$INVOICE_HMAC_KEY
MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
EOF

sudo chmod 600 ~/.secrets/conceptmanager-$SLUG-dev.env
sudo chown kierangauthier:kierangauthier ~/.secrets/conceptmanager-$SLUG-dev.env

teams-alert info "Phase 2 OK : .env créé, secrets uniques, copie sauvegardée dans ~/.secrets/conceptmanager-$SLUG-dev.env (chmod 600)"
```

### ✋ CHECKPOINT 2 — Kieran note les secrets

```bash
teams-alert critical "✋ CHECKPOINT 2 : Secrets générés. Kieran, lis-les via 'sudo cat ~/.secrets/conceptmanager-$SLUG-dev.env' DANS TA SESSION SSH SÉPARÉE (pas dans la session Claude). Note-les dans ton password manager. Réponds GO une fois fait."
```

**Attendre GO** avant de continuer.

---

## Phase 3 — Adaptation du compose pour la convention `/srv/`

### 3.1 Backup compose original

```bash
SLUG=<slug>
TARGET=/srv/dev/conceptmanager/$SLUG
cd $TARGET

cp docker-compose.yml docker-compose.yml.bak.before-srv-conv

# Normaliser CRLF si nécessaire (lessons learned Session A)
sudo sed -i 's/\r$//' docker-compose.yml
```

### 3.2 Inspection du compose actuel

```bash
# Y a-t-il un bloc networks: top-level ?
grep -n "^networks:" docker-compose.yml

# Y a-t-il un name: top-level ?
grep -n "^name:" docker-compose.yml

# Quels sont les container_name actuels ?
grep -E "container_name:" docker-compose.yml
```

D'après le `.env.example` lu, le compose ConceptManager **n'a probablement PAS** de `name:` ni de `networks:` top-level. Donc ajout simple en bas du fichier.

### 3.3 Ajout `name:`, `networks:`, et préfixage container_name

```bash
SLUG=<slug>
TARGET=/srv/dev/conceptmanager/$SLUG

# Étape 1 : ajouter name: au tout début du fichier (avant 'services:')
# Méthode : sed pour insérer avant le premier 'services:'
sudo sed -i "1i name: cm-$SLUG-dev\n" docker-compose.yml

# Vérifier
head -3 docker-compose.yml
# Doit afficher :
# name: cm-<slug>-dev
#
# services:

# Étape 2 : ajouter networks: top-level à la fin (avant 'volumes:')
# On insère avant la ligne 'volumes:' qui existe déjà
sudo sed -i "/^volumes:/i \\
networks:\\
  default:\\
    name: acreed-dev\\
    external: true\\
" docker-compose.yml

# Étape 3 : ajouter container_name à chaque service
# postgres → cm-<slug>-db
# api → cm-<slug>-api
# frontend → cm-<slug>-frontend
# minio → cm-<slug>-minio

sudo sed -i "/^  postgres:/a\\    container_name: cm-$SLUG-db" docker-compose.yml
sudo sed -i "/^  api:/a\\    container_name: cm-$SLUG-api" docker-compose.yml
sudo sed -i "/^  frontend:/a\\    container_name: cm-$SLUG-frontend" docker-compose.yml
sudo sed -i "/^  minio:/a\\    container_name: cm-$SLUG-minio" docker-compose.yml

# Étape 4 : rebinder les ports en 127.0.0.1
# (au lieu de "5432:5432" → "127.0.0.1:5445:5432")
sudo sed -i 's|"5432:5432"|"127.0.0.1:5445:5432"|' docker-compose.yml
sudo sed -i 's|"3000:3000"|"127.0.0.1:3095:3000"|' docker-compose.yml
sudo sed -i 's|"8080:80"|"127.0.0.1:8095:80"|' docker-compose.yml
sudo sed -i 's|"9000:9000"|"127.0.0.1:9095:9000"|' docker-compose.yml
sudo sed -i 's|"9001:9001"|"127.0.0.1:9096:9001"|' docker-compose.yml

# Étape 5 : préfixer les volumes nommés (pgdata → cm-<slug>-pgdata)
sudo sed -i "s|pgdata:|cm-$SLUG-pgdata:|g" docker-compose.yml
sudo sed -i "s|miniodata:|cm-$SLUG-miniodata:|g" docker-compose.yml
```

### 3.4 Validation YAML

```bash
docker compose -f docker-compose.yml config > /dev/null 2>&1 && echo "✅ YAML OK" || echo "❌ YAML ERREUR"

# Si OK, vérifier visuellement
docker compose -f docker-compose.yml config | head -30

# Vérifier que tous les paramètres clés sont là
docker compose -f docker-compose.yml config | grep -E "name:|container_name:|external:|127.0.0.1"
```

### ✋ CHECKPOINT 3 — Validation compose par Kieran

```bash
teams-alert critical "✋ CHECKPOINT 3 : compose patché (name: cm-$SLUG-dev, container_name préfixés, ports 127.0.0.1, networks acreed-dev external). Kieran, lis le compose via 'sudo cat $TARGET/docker-compose.yml' et confirme que ça te va. Réponds GO."
```

**Attendre GO**.

---

## Phase 4 — Premier `docker compose up -d`

### 4.1 Build des images

```bash
SLUG=<slug>
TARGET=/srv/dev/conceptmanager/$SLUG
cd $TARGET

teams-alert info "Phase 4 démarrée : build images ConceptManager"

# Build (va prendre 3-5 min — frontend Vite multi-stage + api Node)
sudo docker compose -f docker-compose.yml build 2>&1 | tail -30

# Vérifier que les images ont été créées
docker images | grep "cm-$SLUG"
```

### 4.2 Premier `up -d`

```bash
sudo docker compose -f docker-compose.yml up -d

sleep 10

# Vérifier que les 4 containers sont UP
docker ps --filter "name=cm-$SLUG" --format "table {{.Names}}\t{{.Status}}"
```

### 4.3 Surveillance logs initiaux (30 s)

```bash
# Logs api — surveiller pour migration Prisma
timeout 30 docker logs -f cm-$SLUG-api 2>&1 | tee /tmp/cm-api-startup.log

# Patterns OK :
# - "Connection to database established"
# - "Prisma migrate: All migrations applied" / "No pending migrations"
# - "Server listening on port 3000"

# Patterns ALERTE :
# - "FATAL", "ECONNREFUSED" en boucle
# - "Migration failed"
# - "DROP" / "ALTER ... DROP"
```

Si un pattern alerte → STOP + ping.

### 4.4 Validation containers + réseau

```bash
# Tous les containers cm-<slug>-* sont dans acreed-dev
for c in $(docker ps --filter "name=cm-$SLUG" --format "{{.Names}}"); do
  net=$(docker inspect "$c" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
  echo "$c → $net"
done

# Doit afficher : tous → acreed-dev
```

### 4.5 Validation health-check API

```bash
# Test de l'API en local (depuis la VM)
curl -sI http://127.0.0.1:3095/api/health | head -3

# Si l'endpoint /api/health existe, doit retourner 200
# Si absent, tester /
curl -sI http://127.0.0.1:3095/ | head -3
```

```bash
teams-alert info "Phase 4 OK : 4 containers UP, api accessible en 127.0.0.1:3095, frontend en 127.0.0.1:8095"
```

---

## Phase 5 — Init DB et utilisateur admin

### 5.1 Vérifier les migrations Prisma

```bash
# Logs api détaillés sur Prisma
docker logs cm-$SLUG-api 2>&1 | grep -iE "prisma|migration" | head -20
```

### 5.2 Connexion à la DB pour valider le schéma

```bash
# La connexion se fait via le user 'concept' (cf .env)
docker exec -it cm-$SLUG-db psql -U concept -d concept_manager -c "\dt"

# Doit lister les tables Prisma : User, Company, Client, Quote, Invoice, etc.
```

Si `\dt` est vide → Prisma n'a pas migré. Corriger :

```bash
docker exec cm-$SLUG-api npx prisma migrate deploy
```

### 5.3 Création utilisateur admin

Selon `PACK-PILOTE.md` section 2.2, l'admin est créé via :

**Option A — Endpoint API d'inscription (si activé)**
```bash
curl -X POST http://127.0.0.1:3095/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acreediasolutions.com","password":"<mdp_temporaire_fort>","fullName":"Admin Acreed"}'
```

**Option B — Seed Prisma**
```bash
docker exec cm-$SLUG-api npx prisma db seed
```

**Option C — Insertion SQL directe**
```bash
docker exec cm-$SLUG-db psql -U concept -d concept_manager <<EOF
INSERT INTO "User" (id, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@acreediasolutions.com',
  crypt('<mdp_temporaire_fort>', gen_salt('bf')),
  'admin',
  NOW(),
  NOW()
);
EOF
```

⚠️ Ces options dépendent de l'implémentation exacte de ConceptManager. **STOP + audit** avant de choisir :

```bash
# Quel endpoint d'inscription est exposé ?
docker logs cm-$SLUG-api 2>&1 | grep -E "POST|GET" | head -20

# Y a-t-il un script de seed ?
ls $TARGET/api/prisma/

# Quel est le schéma User ?
docker exec cm-$SLUG-db psql -U concept -d concept_manager -c "\d \"User\""
```

→ **Ping Kieran** avec ces 3 sorties pour qu'il décide.

### 5.4 Validation rows métier

```bash
# Au moins 1 user créé
docker exec cm-$SLUG-db psql -U concept -d concept_manager -c "SELECT COUNT(*) FROM \"User\";"
# Attendu : ≥ 1

# Schéma initialisé
docker exec cm-$SLUG-db psql -U concept -d concept_manager -c "\dt" | wc -l
# Attendu : ≥ 10 lignes (au moins 8-10 tables Prisma)
```

```bash
teams-alert info "Phase 5 OK : DB schéma initialisé, 1 admin créé. Login admin@acreediasolutions.com prêt."
```

---

## Phase 6 — Accès navigateur via tunnel SSH

### 6.1 Côté Kieran (poste Windows)

```powershell
# Tunnel SSH local vers le frontend ConceptManager dev
ssh -L 8095:127.0.0.1:8095 kierangauthier@4.178.179.147

# Une fois la connexion ouverte (et MAINTENUE),
# Kieran ouvre dans son navigateur :
# http://localhost:8095/
```

### 6.2 Validation visuelle

Kieran fait :
1. Ouvre `http://localhost:8095/` → doit afficher la page de login
2. Login avec `admin@acreediasolutions.com` + mot de passe temporaire
3. Tour rapide : dashboard, modules visibles, pas d'erreur en console F12

```bash
teams-alert critical "✋ CHECKPOINT 6 : Tunnel SSH ouvert ? URL http://localhost:8095/ accessible ? Login OK ? Réponds GO si tout fonctionne."
```

**Attendre GO + retour fonctionnel**.

---

## Phase 7 — Vhost nginx pour exposition HTTPS publique

> ⚠️ Phase optionnelle. Si Kieran ne veut **pas** exposer publiquement aujourd'hui, on s'arrête à Phase 6 (accès via tunnel SSH uniquement). Phase 7 se fait quand on est prêt à montrer à JS Concept.

### 7.1 État du vhost existant (si trouvé en Phase 0.3)

Selon ce que la Phase 0.3 a trouvé :
- Cas A — pas de vhost → on en crée un nouveau
- Cas B — vhost existant qui ne sert rien → on le sauve, on le remplace
- Cas C — vhost existant qui sert un autre projet (POC précédent ?) → STOP + Kieran décide

### 7.2 Création vhost nginx (si Cas A)

```bash
SLUG=<slug>

sudo tee /etc/nginx/sites-available/conceptmanager.acreediasolutions.com > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name conceptmanager.acreediasolutions.com;

    # Redirection HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name conceptmanager.acreediasolutions.com;

    # Certificats Let's Encrypt — créés en 7.3
    ssl_certificate /etc/letsencrypt/live/conceptmanager.acreediasolutions.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/conceptmanager.acreediasolutions.com/privkey.pem;

    # API (proxy vers cm-<slug>-api)
    location /api/ {
        proxy_pass http://127.0.0.1:3095/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend (proxy vers cm-<slug>-frontend)
    location / {
        proxy_pass http://127.0.0.1:8095/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Logs
    access_log /var/log/nginx/conceptmanager.access.log;
    error_log  /var/log/nginx/conceptmanager.error.log;
}
EOF

# Activer le vhost
sudo ln -sf /etc/nginx/sites-available/conceptmanager.acreediasolutions.com /etc/nginx/sites-enabled/

# Test config nginx
sudo nginx -t
```

### 7.3 Certificat Let's Encrypt

```bash
sudo certbot --nginx -d conceptmanager.acreediasolutions.com --non-interactive --agree-tos -m kieran.gauthier@acreediasolutions.com

# Reload nginx
sudo systemctl reload nginx
```

### 7.4 Validation HTTPS

```bash
curl -sI https://conceptmanager.acreediasolutions.com | head -5
# Doit retourner 200 ou 302 vers /login

teams-alert info "Phase 7 OK : conceptmanager.acreediasolutions.com accessible publiquement en HTTPS"
```

### ✋ CHECKPOINT 7 — Tour fonctionnel public Kieran

```bash
teams-alert critical "✋ CHECKPOINT 7 : URL publique HTTPS active. Kieran, ouvre https://conceptmanager.acreediasolutions.com dans navigateur, login admin, tour fonctionnel. Réponds GO ou KO."
```

---

## Phase 8 — Validation finale Session

```bash
SLUG=<slug>
TARGET=/srv/dev/conceptmanager/$SLUG

# Récap complet
echo "=== Containers cm-$SLUG-* ==="
docker ps --filter "name=cm-$SLUG" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "=== Réseau ==="
docker network inspect acreed-dev --format '{{range .Containers}}{{.Name}}{{println}}{{end}}' | grep "cm-$SLUG"

echo ""
echo "=== Volumes ==="
docker volume ls | grep "cm-$SLUG"

echo ""
echo "=== Ports loopback ==="
sudo ss -tlnp | grep -E ":(8095|3095|5445|9095|9096)"

echo ""
echo "=== URL test ==="
if [ -f /etc/nginx/sites-enabled/conceptmanager.acreediasolutions.com ]; then
  curl -sI https://conceptmanager.acreediasolutions.com | head -3
else
  echo "Pas d'URL publique (Phase 7 non faite)"
  curl -sI http://127.0.0.1:8095/ | head -3
fi

echo ""
echo "=== Disque ==="
df -h / | tail -1

echo ""
echo "=== Filets ==="
ls -lh ~/.secrets/conceptmanager-$SLUG-dev.env
ls -lh $TARGET/.env.example.bak.* 2>/dev/null
ls -lh $TARGET/docker-compose.yml.bak.* 2>/dev/null

teams-alert info "✅ DÉPLOIEMENT CONCEPTMANAGER DEV TERMINÉ : 4 containers UP dans acreed-dev, accessible via $([ -f /etc/nginx/sites-enabled/conceptmanager.acreediasolutions.com ] && echo 'HTTPS public' || echo 'tunnel SSH localhost:8095'). Reste : seed 12 mois métier signalisation pour démo JS."
```

---

## Annexe — Rollback complet

Si quelque chose tourne mal et qu'il faut tout annuler :

```bash
SLUG=<slug>
TARGET=/srv/dev/conceptmanager/$SLUG

# Stop containers
cd $TARGET
sudo docker compose -f docker-compose.yml down  # PAS -v

# Si volumes vides à supprimer (DB sans données importantes)
sudo docker volume rm cm-$SLUG-pgdata cm-$SLUG-miniodata 2>/dev/null

# Restaurer compose original
cp docker-compose.yml.bak.before-srv-conv docker-compose.yml

# Supprimer .env
sudo rm -f .env
sudo rm -f ~/.secrets/conceptmanager-$SLUG-dev.env

# Si vhost créé
sudo rm -f /etc/nginx/sites-enabled/conceptmanager.acreediasolutions.com
sudo nginx -t && sudo systemctl reload nginx

# Si dossier à effacer
cd /srv/dev/conceptmanager/
sudo rm -rf $SLUG/

echo "Rollback complet effectué."
```

---

## Annexe — Prochaines étapes après ce déploiement

| Étape | Quand | Documentation |
|---|---|---|
| Construction seed 12 mois métier signalisation pour démo JS | Jour 2-3 | À rédiger dans un runbook séparé |
| Démo de répétition (Kieran teste son pitch) | Jour 4 | `STRATEGIE-COMMERCIALE.md` + `pitch-deck-JS.md` |
| Signature JS Concept | Quand prête | `contrat-type.md` |
| Création prod `/srv/prod/conceptmanager/js-concept/` | Post-signature JS | Skill `deploy-client` (Phase 7 du grand plan) |
| Conversion démo dev → prod (ou wipe + repart propre) | Décision Kieran post-signature | À trancher avec JS sur reprise de données |

---

## Annexe — Table des checkpoints ✋

| # | Phase | Action Kieran |
|---|---|---|
| 0 | Pré-vol | Confirmer slug, état URL, méthode push |
| 2 | Secrets | Lire et noter les secrets dans password manager |
| 3 | Compose patché | Valider visuellement le compose |
| 6 | Tunnel SSH | Valider login + tour fonctionnel local |
| 7 | URL HTTPS publique | Valider tour fonctionnel public (si Phase 7 faite) |

---

**Version 1.0 — 2026-04-28** — Émis pour le Claude qui prendra la main sur le déploiement ConceptManager dev.
