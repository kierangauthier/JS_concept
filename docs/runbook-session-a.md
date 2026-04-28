# Runbook Session A — Finition Phase B + Phase 2 + Phase 3

> **Objectif** : appliquer la convention `docs/convention-srv.md` à toute la VM en une session contigüe (~3-4 h).
>
> **À la fin de cette session** : tous les projets vivent sous `/srv/prod/<sous-cat>/<slug>/` ou `/srv/dev/<sous-cat>/<slug>/`, dans les 4 réseaux Docker `acreed-{prod,dev,tools,trash}`, avec containers renommés selon la convention. Les projets obsolètes (`thor`, `js-concept` POC, `claude-ops-home`, etc.) sont archivés et supprimés.
>
> **Phase 4 (symlinks astreos)** est faite en fin de Session A parce qu'astreos sera déjà sous `/srv/prod/astreos/`.
>
> **Hors scope Session A** : Phase 0.3 Voie B Supabase (session dédiée), Phase 5 observabilité (runbook v2), Phase 6 backup externe, Phase 7 finalisation `/srv/claude/`.
>
> **Version** : 1.0 — 2026-04-27.

---

## Prompt de démarrage Claude VM

```
Tu reprends le runbook de migration VM AVD-01 après 3 jours de pause.
Ta source de vérité pour cette session est docs/runbook-session-a.md
(ce document). Tu lis CONVENTION-SRV.md (docs/convention-srv.md) en
parallèle pour comprendre la cible.

Règles impératives (rappel) :

1. Tu lis ce runbook, tu exécutes EXACTEMENT ce qui est demandé,
   dans l'ordre. Pas d'anticipation.
2. Avant chaque ÉTAPE (numérotée X.Y), tu postes :
   teams-alert info "Étape X.Y démarrée : <titre>"
3. À la fin d'une ÉTAPE, tu postes :
   teams-alert info "Étape X.Y OK : <résumé 1 ligne>"
4. Si une commande échoue ou si un check échoue, tu STOPPES
   IMMÉDIATEMENT, tu postes
   teams-alert critical "Étape X.Y BLOQUÉE : <erreur>"
   et tu attends GO de Kieran. Pas d'auto-fix.
5. Aux ✋ CHECKPOINTS, tu attends GO explicite avant de continuer.
6. Aucune suppression sans archive préalable dans
   ~/trash-archives/$(date +%Y%m%d)/.
7. Tu tiens un journal ~/runbook-session-a-$(date +%Y%m%d).md avec
   timestamp + commande + résultat pour chaque action significative.
8. Toute action sur container labelisé acreed.env=prod ou réseau
   acreed-prod doit être justifiée — sinon tu STOPPES.

Tu commences par § Pré-vol. Tu ne sautes AUCUNE vérification.
```

---

## Pré-vol — vérifications obligatoires (10 min)

```bash
# 1. Identité + sudo
whoami    # kierangauthier
hostname  # AVD-01
sudo -n true && echo "✅ sudo OK" || echo "❌ sudo demande pwd"

# 2. Teams webhook
teams-alert info "Pré-vol Session A : démarrage des vérifications"

# 3. Session SSH de secours
echo "⚠️ Ouvre une SECONDE session SSH AVANT de continuer."
echo "   Réponds 'oui' quand fait."

# 4. Espace disque (on va archiver ~5 GB, il faut de la marge)
df -h / | awk 'NR==2 { if ($5+0 > 80) print "❌ Disque saturé", $5; else print "✅ Disque", $5, "libre"$4 }'

# 5. Docker fonctionnel
docker ps > /dev/null 2>&1 && echo "✅ Docker OK" || echo "❌ Docker cassé"

# 6. Nginx OK
sudo nginx -t && echo "✅ Nginx config OK" || echo "❌ Nginx config cassée"

# 7. Dossier archives prêt
ARCHIVE=~/trash-archives/$(date +%Y%m%d)
mkdir -p "$ARCHIVE"
echo "✅ Archives : $ARCHIVE"

# 8. Journal ouvert
JOURNAL=~/runbook-session-a-$(date +%Y%m%d).md
echo "# Session A — $(date -Iseconds)" > "$JOURNAL"
echo "✅ Journal : $JOURNAL"

# 9. État réseaux Docker actuels (pour archive)
docker network ls > "$ARCHIVE/networks-before.txt"

# 10. État containers (pour archive)
docker ps -a > "$ARCHIVE/containers-before.txt"
```

✋ **CHECKPOINT PRÉ-VOL** :
```bash
teams-alert critical "✋ CHECKPOINT pré-vol Session A. Kieran : 2e session SSH ouverte ? Réponds GO."
```

**Attendre GO.**

---

## ÉTAPE 1 — Cleanup obsolètes (30 min)

> On commence par dégager le mort, ça libère espace mental et disque avant les migrations.

### 1.1 — Archive et suppression `/srv/apps/js-concept/` (POC janvier obsolète)

```bash
teams-alert info "Étape 1.1 démarrée : cleanup /srv/apps/js-concept (POC janvier)"

# Archive
sudo tar czf "$ARCHIVE/srv-apps-js-concept.tar.gz" -C /srv/apps js-concept
echo "✅ Archive : $(du -h $ARCHIVE/srv-apps-js-concept.tar.gz)"

# Vérifier le container js-concept tournant
docker ps --filter "name=js-concept" --format "{{.Names}} {{.Status}}"

# Stop + rm container
docker stop js-concept 2>/dev/null
docker rm js-concept 2>/dev/null
docker rmi js-concept:latest 2>/dev/null

# Suppression dossier
sudo rm -rf /srv/apps/js-concept

# Suppression vhost POC
sudo cp /etc/nginx/sites-enabled/poc.js.acreediasolutions.com "$ARCHIVE/" 2>/dev/null
sudo rm -f /etc/nginx/sites-enabled/poc.js.acreediasolutions.com
sudo rm -f /etc/nginx/sites-available/poc.js.acreediasolutions.com
sudo nginx -t && sudo systemctl reload nginx

# Si /srv/apps/ est vide, le supprimer
[ -z "$(ls -A /srv/apps 2>/dev/null)" ] && sudo rmdir /srv/apps && echo "✅ /srv/apps/ supprimé"

teams-alert info "Étape 1.1 OK : /srv/apps/js-concept supprimé. DNS poc.js.acreediasolutions.com côté OVH à dégager par Kieran."
```

### 1.2 — Archive et suppression `/srv/claude-ops-home/` (dormant)

```bash
teams-alert info "Étape 1.2 démarrée : cleanup /srv/claude-ops-home (dormant depuis 23/04)"

sudo tar czf "$ARCHIVE/srv-claude-ops-home.tar.gz" -C /srv claude-ops-home
sudo rm -rf /srv/claude-ops-home

teams-alert info "Étape 1.2 OK : /srv/claude-ops-home archivé+supprimé"
```

### 1.3 — Décommissionnement `thor` (ancêtre convertisseur-dt)

```bash
teams-alert info "Étape 1.3 démarrée : décommissionnement thor (681 M, remplacé par convertisseur-dt)"

# Stop + disable systemd
sudo systemctl stop thor-backend.service 2>/dev/null
sudo systemctl disable thor-backend.service 2>/dev/null

# Archive unit file
sudo cp /etc/systemd/system/thor-backend.service "$ARCHIVE/" 2>/dev/null
sudo rm -f /etc/systemd/system/thor-backend.service
sudo systemctl daemon-reload

# Archive vhost
sudo cp /etc/nginx/sites-enabled/thor* "$ARCHIVE/" 2>/dev/null
sudo cp /etc/nginx/sites-available/thor* "$ARCHIVE/" 2>/dev/null
sudo rm -f /etc/nginx/sites-enabled/thor*
sudo rm -f /etc/nginx/sites-available/thor*
sudo nginx -t && sudo systemctl reload nginx

# Crontab root : commenter la ligne backup_app_thor.sh
sudo crontab -l > "$ARCHIVE/crontab-root-before-thor.txt"
sudo crontab -l | sed 's|^\(.*backup_app_thor\.sh.*\)$|# DECOMMISSIONED 2026-04-27 — \1|' | sudo crontab -

# Archive et suppression dossier
sudo tar czf "$ARCHIVE/var-www-thor.tar.gz" -C /var/www thor
sudo rm -rf /var/www/thor

# Vérification : thor.acreediasolutions.com ne répond plus
curl -sI https://thor.acreediasolutions.com 2>&1 | head -3

teams-alert info "Étape 1.3 OK : thor décommissionné (systemd, vhost, dossier, crontab). DNS thor.acreediasolutions.com à dégager côté OVH par Kieran."
```

### 1.4 — Crontab cassée `Suivi_consultant_V2/backup-db.sh`

```bash
teams-alert info "Étape 1.4 démarrée : commenter crontab cassée Suivi_consultant_V2"

crontab -l > "$ARCHIVE/crontab-kierangauthier-before-suivi.txt"
crontab -l | sed 's|^\(.*Suivi_consultant_V2/backup-db\.sh.*\)$|# BROKEN 2026-04-27 — \1|' | crontab -

# Suppression dossier fantôme
sudo rm -rf /home/kierangauthier/claude-secure/Suivi_consultant_final

teams-alert info "Étape 1.4 OK : crontab Suivi_consultant_V2 commentée, dossier fantôme supprimé"
```

### 1.5 — Container `camif-front` dans compose n8n

```bash
teams-alert info "Étape 1.5 démarrée : retrait camif-front du compose n8n"

cd /home/azureuser/n8n
sudo cp docker-compose.yml "$ARCHIVE/n8n-compose-before-camif-removal.yml"

# Stop + rm container
sudo docker compose stop camif-front 2>/dev/null
sudo docker rm camif-front 2>/dev/null

# Note : édition manuelle du docker-compose.yml requise pour retirer
# le bloc 'camif-front:'. Tu STOPPES ici et tu postes :
teams-alert critical "✋ CHECKPOINT 1.5 : Kieran, le service camif-front doit être retiré manuellement de /home/azureuser/n8n/docker-compose.yml (bloc 'camif-front:' complet). Le container est déjà arrêté+rm. Réponds GO une fois le YAML édité."
```

✋ **Attendre GO.**

```bash
# Après GO :
cd /home/azureuser/n8n
sudo docker compose config > /dev/null && echo "✅ Compose valide" || echo "❌ Erreur YAML"
sudo docker compose up -d
sudo docker compose ps

teams-alert info "Étape 1.5 OK : camif-front retiré du compose n8n, n8n toujours up"
```

### 1.6 — Réseau Docker orphelin `js_concept_final_default`

```bash
teams-alert info "Étape 1.6 démarrée : suppression réseaux Docker orphelins"

# Vérifier qu'il n'a plus de containers
docker network inspect js_concept_final_default --format '{{len .Containers}}' 2>/dev/null

# Suppression
docker network rm js_concept_final_default 2>/dev/null

# acreed-network préexistant : à investiguer avant suppression
echo "Containers connectés à acreed-network :"
docker network inspect acreed-network --format '{{range $k,$v := .Containers}}{{$k}} {{end}}' 2>/dev/null
```

✋ **CHECKPOINT 1.6** :
```bash
teams-alert critical "✋ CHECKPOINT 1.6 : Le réseau acreed-network préexiste mais usage non documenté. Lister les containers attachés ci-dessus. Kieran : on supprime ce réseau OU on garde et on documente ? Réponds GO supprime / GO garde."
```

**Attendre GO.**

```bash
# Si "GO supprime" :
docker network rm acreed-network && teams-alert info "Étape 1.6 OK : réseaux orphelins supprimés"
# Si "GO garde" : ne rien faire, juste teams-alert info "Étape 1.6 OK : js_concept_final_default supprimé, acreed-network conservé (à documenter)"
```

### 1.7 — Validation Étape 1

```bash
df -h / | tail -1
echo "Containers restants : $(docker ps --format '{{.Names}}' | wc -l)"
echo "Réseaux restants : $(docker network ls --format '{{.Name}}' | wc -l)"

teams-alert info "✅ Étape 1 TERMINÉE : cleanup obsolètes done. Disque libéré : ~$(du -sh $ARCHIVE | awk '{print $1}') archivés."
```

---

## ÉTAPE 2 — Création des 4 réseaux Docker (5 min)

```bash
teams-alert info "Étape 2 démarrée : création des 4 réseaux acreed-{prod,dev,tools,trash}"

docker network create acreed-prod   --label "acreed.env=prod"   --subnet 172.100.0.0/16 2>/dev/null || echo "acreed-prod existe"
docker network create acreed-dev    --label "acreed.env=dev"    --subnet 172.101.0.0/16 2>/dev/null || echo "acreed-dev existe"
docker network create acreed-tools  --label "acreed.env=tools"  --subnet 172.102.0.0/16 2>/dev/null || echo "acreed-tools existe"
docker network create acreed-trash  --label "acreed.env=trash"  --subnet 172.103.0.0/16 2>/dev/null || echo "acreed-trash existe"

COUNT=$(docker network ls --filter "label=acreed.env" --format "{{.Name}}" | wc -l)
[ "$COUNT" -eq 4 ] && teams-alert info "✅ Étape 2 OK : 4 réseaux acreed-* créés" || teams-alert critical "❌ Étape 2 : seulement $COUNT réseaux créés"
```

---

## ÉTAPE 3 — Réorganisation projets déjà dans `/srv/` (60 min)

> 8 projets dans `/srv/prod/` et `/srv/dev/` à déplacer dans leur sous-catégorie + brancher au bon réseau. Ordre : du moins critique au plus critique. Pour CHAQUE projet, on suit le **template 3.X** ci-dessous.

### Template par projet (à appliquer 8 fois)

```bash
# Variables à adapter pour chaque projet
SLUG="<slug>"                       # ex: freyr
SOURCE="/srv/prod/$SLUG"            # chemin actuel
TARGET="/srv/prod/tools/$SLUG"      # chemin cible (selon convention §8)
ENV="prod"                          # ou dev
NETWORK="acreed-$ENV"               # acreed-prod, acreed-dev, etc.

teams-alert info "Étape 3.X démarrée : migration $SLUG vers $TARGET + branchement $NETWORK"

# 1. Backup compose
cd "$SOURCE"
[ -f docker-compose.yml ] && cp docker-compose.yml "$ARCHIVE/${SLUG}-compose-before.yml"

# 2. Stop containers (downtime court < 30 s)
docker compose down

# 3. Inventaire refs externes AVANT déplacement
sudo grep -rln "$SOURCE" /etc/nginx/ /etc/systemd/system/ 2>/dev/null > "$ARCHIVE/${SLUG}-refs-externes.txt"
sudo crontab -l 2>/dev/null | grep -F "$SOURCE" >> "$ARCHIVE/${SLUG}-refs-externes.txt"
crontab -l 2>/dev/null | grep -F "$SOURCE" >> "$ARCHIVE/${SLUG}-refs-externes.txt"

# 4. Création dossier parent + déplacement
sudo mkdir -p "$(dirname $TARGET)"
sudo mv "$SOURCE" "$TARGET"

# 5. Patch refs externes
for f in $(cat "$ARCHIVE/${SLUG}-refs-externes.txt"); do
  if [ -f "$f" ] && [ -w "$f" ]; then
    sudo sed -i.bak "s|$SOURCE|$TARGET|g" "$f"
  fi
done
# (Pour crontab : édition séparée — voir notes par projet)

# 6. Patch compose : ajouter networks: acreed-<env>
cd "$TARGET"
if ! grep -q "name: $NETWORK" docker-compose.yml; then
  cat >> docker-compose.yml <<EOF

networks:
  default:
    name: $NETWORK
    external: true
EOF
fi

# 7. Up + vérification
docker compose up -d
sleep 5
docker compose ps

# 8. Vérification réseau
for c in $(docker compose ps -q); do
  net=$(docker inspect "$c" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
  echo "Container $(docker inspect $c --format '{{.Name}}') → $net"
done

# 9. Test URL publique (si applicable)
# curl -sI https://<slug>.acreediasolutions.com | head -2

# 10. Reload nginx + systemd si refs patchées
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl daemon-reload
# Restart services systemd impactés (préciser dans chaque section)

teams-alert info "Étape 3.X OK : $SLUG migré vers $TARGET, dans $NETWORK"
```

### Ordre d'exécution (du moins risqué au plus risqué)

| # | Slug | Source actuelle | Cible | Notes |
|---|---|---|---|---|
| 3.1 | `outline` | `/srv/prod/outline/` | `/srv/prod/tools/outline/` | Pas de systemd, pas de cron. Test : `curl -sI https://outline.acreediasolutions.com` doit rester 200/302. |
| 3.2 | `freyr` | `/srv/prod/freyr/` | `/srv/prod/tools/freyr/` | Pas de systemd, pas de cron. Test : `https://freyr.acreediasolutions.com`. |
| 3.3 | `verif-paie-web` | `/srv/prod/verif-paie-web/` | `/srv/prod/tools/verif-paie-web/` | Test : `https://outil.rh.acreediasolutions.com`. CORS dans .env à vérifier. |
| 3.4 | `horizon` | `/srv/prod/horizon/` | `/srv/prod/tools/horizon/` | 3 composes. Test : `https://horizon.acreediasolutions.com`. |
| 3.5 | `site-final-acreed` | `/srv/prod/site-final-acreed/` | `/srv/prod/sites/site-final-acreed/` | Sous-cat `sites/` et non `tools/`. Test : `https://site.acreedconsulting.com`. |
| 3.6 | `puyfoot-dev` | `/srv/dev/puyfoot-dev/` | `/srv/dev/tools/puyfoot43/` | **Renommer** `puyfoot-dev` → `puyfoot43` (slug aligné avec prod future). Pas de vhost. |
| 3.7 | `convertisseur-dt` | `/srv/prod/convertisseur-dt/` | `/srv/prod/tools/convertisseur-dt/` | **Patch unit systemd** : `WorkingDirectory=/srv/prod/tools/convertisseur-dt/backend`. **Patch crontab tdufr** ligne L6. Test : `https://dt.acreediasolutions.com`. Pas de container Docker (uvicorn host) → étapes 4-8 du template ne s'appliquent pas, ne faire que le `mv` + patch refs. |
| 3.8 | `fastapi-pdf-tool` | `/srv/prod/fastapi-pdf-tool/` | `/srv/prod/tools/fastapi-pdf-tool/` | Pas de service systemd actif (à créer en Phase 1.6bis si pas déjà fait). Pas de container Docker. Juste `mv`. |

✋ **CHECKPOINT 3.4 (horizon)** : après 3.4, faire un test F12 dans le navigateur sur `https://horizon.acreediasolutions.com` pour vérifier que les appels API frontend partent bien vers le bon backend (le rebuild Vite hardcodé dans le bundle peut ne pas refléter le nouveau réseau Docker — peu probable mais à valider).

```bash
teams-alert critical "✋ CHECKPOINT 3.4 : horizon migré dans acreed-prod. Kieran, ouvre https://horizon.acreediasolutions.com en navigateur et vérifie F12 Network → API calls partent vers horizon.acreediasolutions.com en 200. Réponds GO ou KO."
```

### Validation Étape 3

```bash
teams-alert info "Étape 3 — validation finale"

# Tous les projets dans /srv/prod/ sont sous une sous-cat
for d in /srv/prod/*/; do
  base=$(basename "$d")
  if [ "$base" != "conceptmanager" ] && [ "$base" != "tools" ] && [ "$base" != "sites" ] && [ "$base" != "astreos" ]; then
    echo "❌ Projet hors sous-cat : $d"
  fi
done

# Tous les containers prod sont dans acreed-prod
for c in $(docker ps --format '{{.Names}}'); do
  net=$(docker inspect "$c" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
  echo "$c → $net"
done | grep -vE "acreed-(prod|dev|tools|trash)" | head -10

# Toutes les URL publiques répondent
for url in https://outline.acreediasolutions.com https://freyr.acreediasolutions.com https://outil.rh.acreediasolutions.com https://horizon.acreediasolutions.com https://site.acreedconsulting.com https://dt.acreediasolutions.com; do
  code=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 5 "$url")
  echo "$code $url"
done

teams-alert info "✅ Étape 3 TERMINÉE : 8 projets réorganisés sous /srv/<env>/<sous-cat>/<slug>/, branchés sur acreed-<env>"
```

---

## ÉTAPE 4 — Migration projets hors `/srv/` (90 min)

> 6 projets restants à faire entrer dans `/srv/`. Ordre : astreos en premier (pré-requis Phase 4 symlinks), app-builder en dernier (le plus lourd). Renames containers gestion-immo → mimir au passage.

### 4.1 — `astreos` (CRITIQUE — outil prod Acreed Consulting)

```bash
SLUG="astreos"
SOURCE="/home/kierangauthier/claude-secure/astreos"
TARGET="/srv/prod/astreos"

teams-alert info "Étape 4.1 démarrée : migration astreos (CRITIQUE — Acreed Consulting prod)"

# 1. Stop services systemd
sudo systemctl stop astreos-notifications.service
sudo systemctl stop supabase-start.service 2>/dev/null

# 2. Backup complet (605 M)
sudo tar czf "$ARCHIVE/astreos-full-before-mv.tar.gz" -C /home/kierangauthier/claude-secure astreos

# 3. Inventaire refs externes
sudo grep -rln "$SOURCE" /etc/nginx/ /etc/systemd/system/ /etc/cron.d/ /etc/logrotate.d/ 2>/dev/null > "$ARCHIVE/astreos-refs-externes.txt"
sudo crontab -u tdufr -l 2>/dev/null | grep -F "$SOURCE" >> "$ARCHIVE/astreos-refs-externes.txt"

# 4. Déplacement
sudo mv "$SOURCE" "$TARGET"
sudo chown -R kierangauthier:kierangauthier "$TARGET"

# 5. Patch refs externes
for f in $(cat "$ARCHIVE/astreos-refs-externes.txt"); do
  [ -f "$f" ] && [ -w "$f" ] && sudo sed -i.bak "s|$SOURCE|$TARGET|g" "$f"
done

# 6. Patch deploy/ pour qu'il référence le nouveau chemin
sudo sed -i.bak "s|/home/kierangauthier/claude-secure/astreos|$TARGET|g" $TARGET/deploy/*.{conf,service,cron,logrotate} 2>/dev/null

# 7. Patch crontab tdufr (ligne L5 backup-db.sh)
sudo crontab -u tdufr -l > "$ARCHIVE/crontab-tdufr-before-astreos.txt"
sudo crontab -u tdufr -l | sed "s|/home/kierangauthier/claude-secure/astreos|$TARGET|g" | sudo crontab -u tdufr -

# 8. Reload + restart
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl daemon-reload
sudo systemctl start astreos-notifications.service
sudo systemctl start supabase-start.service 2>/dev/null

# 9. Tests
sleep 5
sudo systemctl is-active astreos-notifications.service
curl -sI https://astreos.acreedconsulting.com | head -3

teams-alert info "Étape 4.1 OK : astreos migré vers /srv/prod/astreos, services systemd UP, URL publique 200"
```

✋ **CHECKPOINT 4.1** : Kieran teste `https://astreos.acreedconsulting.com` dans son navigateur et vérifie qu'il peut se connecter, voir ses chantiers, etc.

```bash
teams-alert critical "✋ CHECKPOINT 4.1 : astreos migré. Kieran, ouvre https://astreos.acreedconsulting.com et fais un tour fonctionnel (login, dashboard, 1 lecture). Réponds GO ou KO."
```

### 4.2 — Phase 4 du runbook : symlinks `/etc/*` (FAIT MAINTENANT car astreos est sous /srv/prod/astreos/)

```bash
teams-alert info "Étape 4.2 démarrée : Phase 4 symlinks astreos (deploy/ comme source de vérité)"

ASTREOS_DEPLOY=/srv/prod/astreos/deploy

# Vérifier que les fichiers dans deploy/ sont identiques aux /etc/*
for pair in \
  "/etc/nginx/sites-available/astreos $ASTREOS_DEPLOY/nginx-astreos.conf" \
  "/etc/cron.d/astreos-backup $ASTREOS_DEPLOY/astreos-backup.cron" \
  "/etc/systemd/system/astreos-notifications.service $ASTREOS_DEPLOY/astreos-notifications.service" \
  "/etc/systemd/system/supabase-start.service $ASTREOS_DEPLOY/supabase-start.service" \
  "/etc/logrotate.d/astreos-backup $ASTREOS_DEPLOY/astreos-backup.logrotate"
do
  src=$(echo $pair | cut -d' ' -f1)
  dst=$(echo $pair | cut -d' ' -f2)
  if ! diff -q "$src" "$dst" > /dev/null 2>&1; then
    teams-alert critical "❌ Étape 4.2 : différence entre $src et $dst — résolution manuelle requise"
    exit 1
  fi
done

# Backup
ARCHIVE_ETC="$ARCHIVE/astreos-etc-backup"
mkdir -p "$ARCHIVE_ETC"
sudo cp /etc/nginx/sites-available/astreos "$ARCHIVE_ETC/"
sudo cp /etc/cron.d/astreos-backup "$ARCHIVE_ETC/"
sudo cp /etc/systemd/system/astreos-notifications.service "$ARCHIVE_ETC/"
sudo cp /etc/systemd/system/supabase-start.service "$ARCHIVE_ETC/"
sudo cp /etc/logrotate.d/astreos-backup "$ARCHIVE_ETC/"

# Symlinks
sudo rm /etc/nginx/sites-available/astreos
sudo ln -s $ASTREOS_DEPLOY/nginx-astreos.conf /etc/nginx/sites-available/astreos

sudo rm /etc/cron.d/astreos-backup
sudo ln -s $ASTREOS_DEPLOY/astreos-backup.cron /etc/cron.d/astreos-backup

sudo rm /etc/systemd/system/astreos-notifications.service
sudo ln -s $ASTREOS_DEPLOY/astreos-notifications.service /etc/systemd/system/astreos-notifications.service

sudo rm /etc/systemd/system/supabase-start.service
sudo ln -s $ASTREOS_DEPLOY/supabase-start.service /etc/systemd/system/supabase-start.service

sudo rm /etc/logrotate.d/astreos-backup
sudo ln -s $ASTREOS_DEPLOY/astreos-backup.logrotate /etc/logrotate.d/astreos-backup

# Reload
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl daemon-reload
sudo systemctl restart astreos-notifications.service

# Tests
ls -la /etc/nginx/sites-available/astreos /etc/cron.d/astreos-backup /etc/systemd/system/astreos-notifications.service /etc/systemd/system/supabase-start.service /etc/logrotate.d/astreos-backup
curl -sI https://astreos.acreedconsulting.com | head -2

teams-alert info "Étape 4.2 OK : 5 symlinks /etc/* → /srv/prod/astreos/deploy/ activés"
```

### 4.3 — `n8n` (azureuser → kierangauthier)

```bash
SLUG="n8n"
SOURCE="/home/azureuser/n8n"
TARGET="/srv/prod/tools/n8n"

teams-alert info "Étape 4.3 démarrée : migration n8n vers /srv/prod/tools/n8n"

cd "$SOURCE"
sudo cp docker-compose.yml "$ARCHIVE/n8n-compose-before-mv.yml"
sudo docker compose down

# Inventaire refs
sudo grep -rln "$SOURCE" /etc/nginx/ 2>/dev/null > "$ARCHIVE/n8n-refs-externes.txt"

# Déplacement (azureuser → kierangauthier)
sudo mv "$SOURCE" "$TARGET"
sudo chown -R kierangauthier:kierangauthier "$TARGET"

# Patch refs
for f in $(cat "$ARCHIVE/n8n-refs-externes.txt"); do
  sudo sed -i.bak "s|$SOURCE|$TARGET|g" "$f"
done

# Patch compose : ajouter networks acreed-tools (n8n = outil)
cd "$TARGET"
cat >> docker-compose.yml <<'EOF'

networks:
  default:
    name: acreed-tools
    external: true
EOF

sudo docker compose up -d
sleep 5
sudo nginx -t && sudo systemctl reload nginx

curl -sI https://n8n.acreediasolutions.com | head -2

teams-alert info "Étape 4.3 OK : n8n sous /srv/prod/tools/n8n/, dans acreed-tools"
```

### 4.4 — `mimir` (ex-`/opt/acreed-ia/`) avec **rename containers**

```bash
SLUG="mimir"
SOURCE="/opt/acreed-ia"
TARGET="/srv/prod/tools/mimir"

teams-alert info "Étape 4.4 démarrée : migration acreed-ia → mimir + rename containers gestion-immo-* → mimir-*"

cd "$SOURCE"
sudo cp docker-compose.prod.yml "$ARCHIVE/mimir-compose-before-mv.yml"

# Stop containers
sudo docker compose -f docker-compose.prod.yml down

# Inventaire refs
sudo grep -rln "$SOURCE" /etc/nginx/ 2>/dev/null > "$ARCHIVE/mimir-refs-externes.txt"

# Déplacement
sudo mv "$SOURCE" "$TARGET"
sudo chown -R kierangauthier:kierangauthier "$TARGET"

# Patch refs externes
for f in $(cat "$ARCHIVE/mimir-refs-externes.txt"); do
  sudo sed -i.bak "s|$SOURCE|$TARGET|g" "$f"
done

# Patch compose : rename services + container_name + ajout networks
cd "$TARGET"
sudo sed -i.bak \
  -e 's|container_name: gestion-immo-frontend-prod|container_name: mimir-frontend-prod|' \
  -e 's|container_name: gestion-immo-backend-prod|container_name: mimir-backend-prod|' \
  -e 's|container_name: gestion-immo-db-prod|container_name: mimir-db-prod|' \
  docker-compose.prod.yml

# RETRAIT du service frontend (cf D2 — clone legacy de mimir)
# ⚠️ Édition manuelle requise — STOP
teams-alert critical "✋ CHECKPOINT 4.4a : Kieran, dans /srv/prod/tools/mimir/docker-compose.prod.yml, retire le service 'frontend:' complet (c'est un clone du frontend mimir servi par /var/www/mimir/, zéro trafic depuis 2 mois). NE PAS RETIRER backend ni db. Réponds GO une fois fait."
```

✋ **Attendre GO.**

```bash
# Après GO :
cd "$TARGET"

# Ajouter networks: acreed-tools
cat >> docker-compose.prod.yml <<'EOF'

networks:
  default:
    name: acreed-tools
    external: true
EOF

# Up
sudo docker compose -f docker-compose.prod.yml up -d
sleep 5

# Tests
docker ps --filter "name=mimir-" --format "{{.Names}} {{.Status}}"
curl -sI https://mimir.acreediasolutions.com | head -2

teams-alert info "Étape 4.4 OK : mimir migré, containers renommés mimir-*, frontend legacy supprimé, dans acreed-tools"
```

### 4.5 — `puyfoot43` (ex-`puyfoot-prod`)

```bash
SLUG="puyfoot43"
SOURCE="/opt/puyfoot-prod"
TARGET="/srv/prod/tools/puyfoot43"

teams-alert info "Étape 4.5 démarrée : migration puyfoot-prod → puyfoot43"

cd "$SOURCE"
sudo cp docker-compose.yml "$ARCHIVE/puyfoot43-compose-before-mv.yml"
sudo docker compose down

sudo grep -rln "$SOURCE" /etc/nginx/ 2>/dev/null > "$ARCHIVE/puyfoot43-refs-externes.txt"

sudo mv "$SOURCE" "$TARGET"
sudo chown -R kierangauthier:kierangauthier "$TARGET"

for f in $(cat "$ARCHIVE/puyfoot43-refs-externes.txt"); do
  sudo sed -i.bak "s|$SOURCE|$TARGET|g" "$f"
done

cd "$TARGET"
cat >> docker-compose.yml <<'EOF'

networks:
  default:
    name: acreed-tools
    external: true
EOF

sudo docker compose up -d
sleep 5
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://puyfoot43.acreediasolutions.com | head -2

teams-alert info "Étape 4.5 OK : puyfoot43 dans /srv/prod/tools/puyfoot43/"
```

### 4.6 — `mimir-dev` (ex-`gestion-immo-dev`)

```bash
SLUG="mimir-dev"
SOURCE="/home/kierangauthier/claude-secure/gestion-immo-dev"
TARGET="/srv/dev/tools/mimir"

teams-alert info "Étape 4.6 démarrée : migration gestion-immo-dev → /srv/dev/tools/mimir"

cd "$SOURCE"
sudo cp docker-compose.yml "$ARCHIVE/mimir-dev-compose-before-mv.yml"
docker compose down

mv "$SOURCE" "$TARGET"

cd "$TARGET"

# Rename containers gestion-immo-*-dev → mimir-*-dev
sudo sed -i.bak \
  -e 's|container_name: gestion-immo-frontend-dev|container_name: mimir-frontend-dev|' \
  -e 's|container_name: gestion-immo-backend-dev|container_name: mimir-backend-dev|' \
  -e 's|container_name: gestion-immo-db-dev|container_name: mimir-db-dev|' \
  docker-compose.yml docker-compose.backend.yml 2>/dev/null

# Ajout networks: acreed-dev
cat >> docker-compose.yml <<'EOF'

networks:
  default:
    name: acreed-dev
    external: true
EOF

docker compose up -d
sleep 3

teams-alert info "Étape 4.6 OK : mimir-dev migré, containers renommés mimir-*-dev"
```

### 4.7 — `ostara` (app-builder, le plus lourd : 4.8 GB, monorepo PM2)

```bash
SLUG="ostara"
SOURCE="/home/kierangauthier/claude-secure/app-builder"
TARGET="/srv/prod/tools/ostara"

teams-alert info "Étape 4.7 démarrée : migration app-builder → /srv/prod/tools/ostara (4.8 GB monorepo PM2)"

# Stop PM2 (lancé par tdufr)
sudo systemctl stop pm2-tdufr.service

# Backup PM2 dump
sudo cp /home/tdufr/.pm2/dump.pm2 "$ARCHIVE/pm2-tdufr-dump-before-ostara.pm2"

# Inventaire refs
sudo grep -rln "$SOURCE" /etc/nginx/ /etc/systemd/system/ 2>/dev/null > "$ARCHIVE/ostara-refs-externes.txt"

# Déplacement (sans archive tgz — trop gros, 4.8 GB. Le mv est atomique, on a le rollback Git).
# ⚠️ Le mv prend 1-2 min sur 4.8 GB inter-disque, < 30s si même fs.
sudo mv "$SOURCE" "$TARGET"
sudo chown -R tdufr:tdufr "$TARGET"  # PM2 tourne sous tdufr

# Patch refs externes
for f in $(cat "$ARCHIVE/ostara-refs-externes.txt"); do
  sudo sed -i.bak "s|$SOURCE|$TARGET|g" "$f"
done

# Patch PM2 dump (ecosystem) : cwd des 13 process
sudo sed -i.bak "s|$SOURCE|$TARGET|g" /home/tdufr/.pm2/dump.pm2 2>/dev/null

# Restart PM2
sudo systemctl start pm2-tdufr.service
sleep 10

# Tests
sudo systemctl is-active pm2-tdufr.service
curl -sI https://ostara.acreedconsulting.com | head -2

# Vérifier que les 8 ports écoutent toujours
for port in 4100 4101 4102 4103 4104 4105 4106 4107; do
  sudo ss -tlnp | grep ":$port " > /dev/null && echo "✅ :$port écoute" || echo "❌ :$port mort"
done

teams-alert info "Étape 4.7 OK : ostara migré vers /srv/prod/tools/ostara, PM2 tdufr restart, 8 ports actifs"
```

### Validation Étape 4

```bash
teams-alert info "Étape 4 — validation finale"

# Plus rien dans /opt/, /home/kierangauthier/claude-secure/, /home/azureuser/
ls /opt/ 2>/dev/null | grep -v gitlab
ls /home/kierangauthier/claude-secure/ 2>/dev/null
ls /home/azureuser/ 2>/dev/null

# Tous les services systemd actifs
for svc in astreos-notifications fastapi-pdf-tool convertisseur-dt pm2-tdufr; do
  state=$(systemctl is-active "$svc" 2>/dev/null)
  echo "$svc : $state"
done

# Toutes les URL publiques répondent
for url in https://astreos.acreedconsulting.com https://n8n.acreediasolutions.com https://mimir.acreediasolutions.com https://puyfoot43.acreediasolutions.com https://ostara.acreedconsulting.com https://outline.acreediasolutions.com https://freyr.acreediasolutions.com https://horizon.acreediasolutions.com; do
  code=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 5 "$url")
  echo "$code $url"
done

teams-alert info "✅ Étape 4 TERMINÉE : 6 projets migrés sous /srv/, tous services UP"
```

---

## ÉTAPE 5 — Renommer `/srv/acreed-dev/` → `/srv/claude/` (5 min)

```bash
teams-alert info "Étape 5 démarrée : rename /srv/acreed-dev → /srv/claude"

# Vérifier qu'aucun process n'a un FD ouvert dedans
sudo lsof /srv/acreed-dev 2>/dev/null | head

# Inventaire refs
sudo grep -rln "/srv/acreed-dev" /etc/ /home/kierangauthier/.bashrc /home/kierangauthier/.profile 2>/dev/null > "$ARCHIVE/srv-acreed-dev-refs.txt"

# Mv
sudo mv /srv/acreed-dev /srv/claude

# Patch refs si existantes
for f in $(cat "$ARCHIVE/srv-acreed-dev-refs.txt"); do
  sudo sed -i.bak "s|/srv/acreed-dev|/srv/claude|g" "$f"
done

# Vérification
ls -la /srv/claude/

teams-alert info "✅ Étape 5 OK : /srv/claude/ existe, /srv/acreed-dev/ n'existe plus"
```

---

## ÉTAPE 6 — Validation finale Session A (10 min)

```bash
teams-alert info "Étape 6 démarrée : validation finale de la convention /srv/"

# 1. Arborescence /srv/ conforme
echo "=== /srv/ ==="
ls -la /srv/
echo ""
echo "=== /srv/prod/ ==="
ls -la /srv/prod/
echo ""
echo "=== /srv/dev/ ==="
ls -la /srv/dev/
echo ""
echo "=== /srv/claude/ ==="
ls -la /srv/claude/

# 2. Plus aucun projet runtime hors /srv/
echo ""
echo "=== Hors /srv/ (résidus) ==="
ls /opt/ 2>/dev/null | grep -vE "gitlab|^$"
ls /home/kierangauthier/claude-secure/ 2>/dev/null
ls /home/azureuser/ 2>/dev/null | grep -v "^\."
ls /var/www/ 2>/dev/null | grep -vE "html|mimir|Suivi-consultant"

# 3. Les 4 réseaux Docker existent
docker network ls --filter "label=acreed.env" --format "{{.Name}}"

# 4. Tous les containers runtime sont dans acreed-{prod,dev,tools}
for c in $(docker ps --format '{{.Names}}'); do
  net=$(docker inspect "$c" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
  case "$net" in
    *acreed-prod*|*acreed-dev*|*acreed-tools*) ;;
    *) echo "⚠️  $c → $net (hors convention)" ;;
  esac
done

# 5. Toutes les URL publiques répondent en 200/302
echo ""
echo "=== URL publiques ==="
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

# 6. UFW toujours actif
sudo ufw status | head -3

# 7. Disque libéré
df -h / | tail -1

teams-alert info "✅ SESSION A TERMINÉE : convention /srv/ appliquée, Phase 4 symlinks faite, 14 projets en place. Reste : Voie B Supabase (session dédiée), Phase 5 obs, Phase 6 backup, Phase 7 finalisation /srv/claude/."
```

✋ **CHECKPOINT FINAL** :
```bash
teams-alert critical "✋ FIN SESSION A : Kieran, parcours visuel des 11 URL publiques + contrôle astreos en navigateur. Si tout OK : réponds GO. Si KO sur une URL : réponds KO + nom de l'URL."
```

---

## Annexe — Commandes de rollback

### Rollback d'un projet déplacé
```bash
SLUG=<slug>
TARGET=/srv/prod/tools/$SLUG  # ou autre chemin migré
SOURCE=$(grep -E "^/" $ARCHIVE/${SLUG}-refs-externes.txt | head -1 | awk -F: '{print $1}' | xargs dirname)
cd "$TARGET"
docker compose down
sudo mv "$TARGET" "$SOURCE"
# Restaurer refs externes depuis $ARCHIVE/${SLUG}-refs-externes.txt.bak
docker compose up -d
```

### Rollback symlinks astreos (Étape 4.2)
```bash
sudo rm /etc/nginx/sites-available/astreos
sudo cp $ARCHIVE/astreos-etc-backup/astreos /etc/nginx/sites-available/
# Idem pour les autres fichiers
sudo systemctl daemon-reload && sudo systemctl reload nginx
```

### Rollback rename `/srv/acreed-dev/`
```bash
sudo mv /srv/claude /srv/acreed-dev
```

### Rollback complet Session A
Restaurer depuis `$ARCHIVE/*.tar.gz` les projets concernés. Reverser les `.bak` créés par `sed -i.bak` sur les fichiers `/etc/`.

---

## Annexe — Table des checkpoints ✋

| # | Phase | Action Kieran |
|---|---|---|
| 0 | Pré-vol | Ouvrir 2e session SSH |
| 1.5 | n8n compose | Retirer manuellement le bloc `camif-front:` du YAML |
| 1.6 | Réseau acreed-network | GO supprime / GO garde |
| 3.4 | horizon | F12 navigateur sur API calls |
| 4.1 | astreos | Tour fonctionnel astreos.acreedconsulting.com |
| 4.4a | mimir compose | Retirer manuellement le service `frontend:` du compose mimir |
| Final | Validation finale | Parcours des 11 URL publiques |

---

**Fin du runbook Session A.**
