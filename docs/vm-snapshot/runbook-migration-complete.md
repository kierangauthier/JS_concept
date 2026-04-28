# Runbook — Migration complète VM AVD-01

> **Destinataire** : Claude qui tourne sur la VM AVD-01 en mode autonome.
>
> **Principe** : tu exécutes ce runbook étape par étape, du haut vers le bas, sans sauter, sans anticiper. Tu postes sur Teams à chaque étape importante. Tu t'arrêtes aux **checkpoints humains** ✋ et tu attends la confirmation de Kieran avant de continuer.
>
> **Règle d'or** : **aucune coupure des outils actifs**. Si tu hésites → tu stoppes, tu postes sur `critical` avec ton doute, tu attends.
>
> **Durée totale estimée** : 6-8 h de travail effectif, étalées sur 2-3 jours avec les checkpoints.
>
> **Version** : 1.0 — 2026-04-23

---

## Prompt de démarrage à coller à Claude VM

```
Tu es l'exécutant autonome du runbook docs/runbook-migration-complete.md sur
la VM AVD-01. Tu connais ce dossier de projet depuis /srv/acreed-dev/ (ou ton
clone Git local).

Règles impératives :

1. Tu lis le runbook, tu exécutes EXACTEMENT ce qui est demandé, dans l'ordre.
2. Avant chaque phase, tu postes un message sur #acreed-alerts-info avec
   teams-alert info "Phase X démarrée : <titre>".
3. À la fin de chaque phase réussie, tu postes
   teams-alert info "Phase X OK : <résumé 1 ligne>".
4. Si une commande échoue ou si un check de validation échoue, tu STOPPES
   IMMÉDIATEMENT, tu postes
   teams-alert critical "Phase X BLOQUÉE à l'étape Y.Z : <erreur>"
   puis tu attends la réponse de Kieran. Tu ne tentes PAS de fixer toi-même
   sans autorisation explicite.
5. Aux checkpoints marqués ✋, tu t'arrêtes, tu postes le message indiqué,
   tu attends que Kieran réponde explicitement « GO » avant de continuer.
6. Tu ne supprimes jamais de donnée, container ou fichier sans l'avoir
   archivé d'abord dans ~/trash-archives/$(date +%Y%m%d)/.
7. Tu ne modifies JAMAIS directement un container marqué comme prod (label
   acreed.env=prod ou réseau acreed-prod). Toute modif prod passe par un
   rebuild d'image tagué en Git.
8. Tu n'exécutes PAS de curl vers l'extérieur hors des commandes explicitement
   prévues dans ce runbook (hormis teams-alert).
9. Tu tiens un journal dans ~/runbook-journal-$(date +%Y%m%d).md : une ligne
   par commande significative avec timestamp + résultat.

Tu commences par la section « Pré-vol ». Tu ne sautes AUCUNE vérification.
```

---

## Pré-vol — vérifications obligatoires avant de commencer

**Ne lance aucune commande du runbook tant que ces 8 checks ne sont pas tous verts.**

```bash
# 1. Timestamp et identité
echo "=== Pré-vol démarré $(date -Iseconds) ==="
whoami     # doit être kierangauthier
hostname   # doit être AVD-01 (ou équivalent)

# 2. Accès sudo (sans mot de passe idéalement)
sudo -n true && echo "✅ sudo OK" || echo "❌ sudo requiert un mot de passe — demander à Kieran"

# 3. Teams webhooks opérationnels
teams-alert info "Pré-vol runbook migration : démarrage des vérifications"
# → doit poster dans #acreed-alerts-info. Vérification visuelle côté Kieran.

# 4. Session SSH de secours
echo "⚠️ Ouvre un SECOND terminal SSH sur la VM AVANT de continuer."
echo "   Si UFW coupe ta session principale à la Phase 0, la session secours permet de rollback."
echo "   Réponds 'oui' dans le terminal principal quand la seconde session est ouverte."

# 5. Espace disque
df -h / | awk 'NR==2 { if ($5+0 > 90) print "❌ Disque saturé", $5; else print "✅ Disque", $5 }'

# 6. Docker fonctionnel
docker ps > /dev/null 2>&1 && echo "✅ Docker OK" || echo "❌ Docker cassé"

# 7. Nginx OK
sudo nginx -t && echo "✅ Nginx config OK" || echo "❌ Nginx config cassée"

# 8. Git config utilisateur
git config --global user.email && git config --global user.name || echo "❌ Git config utilisateur absente"

# 9. Dossier archives prêt
mkdir -p ~/trash-archives/$(date +%Y%m%d)
echo "✅ Dossier archives : ~/trash-archives/$(date +%Y%m%d)/"

# 10. Journal ouvert
JOURNAL=~/runbook-journal-$(date +%Y%m%d).md
touch "$JOURNAL"
echo "# Journal runbook migration $(date -Iseconds)" > "$JOURNAL"
echo "✅ Journal : $JOURNAL"
```

✋ **CHECKPOINT 0 — Validation pré-vol par Kieran**

Poste :
```bash
teams-alert critical "✋ CHECKPOINT 0 : Pré-vol terminé. Kieran, ouvre une seconde session SSH sur AVD-01 (filet de secours avant UFW). Réponds GO quand c'est fait."
```

**Attendre GO avant de continuer.**

---

## PHASE 0 — Sécurité urgente (1 h)

**Référence complète** : `docs/plan-nettoyage-vm.md` section PHASE 0.

```bash
teams-alert info "Phase 0 démarrée : rotation tokens, fermeture Postgres, activation UFW"
```

### 0.1 — Préparer l'archive

```bash
ARCHIVE=~/trash-archives/$(date +%Y%m%d)
cd "$ARCHIVE"
echo "Archives VM cleanup $(date -Iseconds)" > README.txt
```

### 0.2 — Rotation tokens GitHub (CHECKPOINT HUMAIN requis)

✋ **CHECKPOINT 0.2 — Kieran doit révoquer les tokens GitHub manuellement**

Poste :
```bash
teams-alert critical "✋ CHECKPOINT 0.2 : Kieran, va sur GitHub → Settings → Developer settings → Personal access tokens. Révoque TOUS les ghp_... Puis crée 4 deploy keys SSH dédiées (puyfoot-prod, acreed-ia, puyfoot-dev, gestion-immo-dev). Colle les clés publiques dans les Settings → Deploy keys des repos correspondants. Réponds GO quand fait."
```

**Attendre GO.**

Une fois GO :

```bash
# Génération des 4 deploy keys côté VM
for repo in puyfoot-prod acreed-ia puyfoot-dev gestion-immo-dev; do
  if [ ! -f ~/.ssh/deploy_${repo} ]; then
    ssh-keygen -t ed25519 -N "" -f ~/.ssh/deploy_${repo} -C "deploy-key-${repo}"
    echo "──"
    echo "Deploy key $repo :"
    cat ~/.ssh/deploy_${repo}.pub
    echo "──"
  fi
done

teams-alert warning "Phase 0.2 : 4 clés SSH deploy keys générées. Kieran les a-t-il bien ajoutées sur GitHub ? Réponds GO quand oui."
```

✋ **ATTENDRE GO.**

Une fois GO, configurer `~/.ssh/config` et remplacer les remotes git (détails dans `plan-nettoyage-vm.md` 0.2).

```bash
# Validation : plus aucun ghp_ dans les remotes
for r in /opt/puyfoot-prod /opt/acreed-ia /home/kierangauthier/claude-secure/puyfoot-dev /home/kierangauthier/claude-secure/gestion-immo-dev; do
  sudo git -C "$r" remote -v 2>/dev/null | grep -q "ghp_" && teams-alert critical "❌ Token encore présent dans $r"
done
```

### 0.3 — Rotation token Supabase

✋ **CHECKPOINT 0.3 — Kieran doit régénérer le token Supabase**

```bash
teams-alert critical "✋ CHECKPOINT 0.3 : Kieran, va dans Supabase Studio → Settings → API → regénère le service_role_key. Récupère le nouveau token. Réponds GO + envoie-le en message privé (PAS dans ce canal)."
```

**Attendre GO.**

Une fois le token reçu hors canal :

```bash
mkdir -p ~/.secrets && chmod 700 ~/.secrets
# Kieran crée lui-même ~/.secrets/supabase-astreos avec le nouveau token
# Puis update la crontab pour sourcer ce fichier (cf plan-nettoyage-vm.md 0.3)
teams-alert info "Phase 0.3 OK : token Supabase rotaté, crontab mise à jour."
```

### 0.4 — Fermer les Postgres publics

```bash
# gestion-immo-db-prod (5433)
sudo sed -i 's|- "5433:5432"|- "127.0.0.1:5433:5432"|' /opt/acreed-ia/docker-compose.prod.yml
cd /opt/acreed-ia && sudo docker compose -f docker-compose.prod.yml up -d

# gestion-immo-db-dev (5435)
sed -i 's|- "5435:5432"|- "127.0.0.1:5435:5432"|' /home/kierangauthier/claude-secure/gestion-immo-dev/docker-compose.backend.yml
cd /home/kierangauthier/claude-secure/gestion-immo-dev && docker compose -f docker-compose.backend.yml up -d

# Validation
if sudo ss -tlnp | grep -E ":5433|:5435" | grep -v "127.0.0.1" > /dev/null; then
  teams-alert critical "❌ Phase 0.4 : Postgres encore exposé publiquement"
else
  teams-alert info "Phase 0.4 OK : Postgres 5433 et 5435 écoutent sur 127.0.0.1 uniquement"
fi
```

### 0.5 — Activer UFW

✋ **CHECKPOINT 0.5 — avertir avant activation UFW (risque de couper SSH)**

```bash
teams-alert critical "✋ CHECKPOINT 0.5 : UFW va être activé dans 30 s. Vérifie que ta SECONDE session SSH fonctionne (au cas où). Règles proposées : allow 22/80/443, deny tout le reste. Réponds GO pour activer."
```

**Attendre GO.**

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable

if sudo ufw status | grep -q "^Status: active"; then
  teams-alert info "Phase 0.5 OK : UFW actif. Ports ouverts : 22, 80, 443."
else
  teams-alert critical "❌ Phase 0.5 : UFW pas actif malgré enable"
fi
```

### 0.6 — Validation globale Phase 0

Lancer le bloc de checks du plan 0.6. Si tout vert :

```bash
teams-alert info "✅ Phase 0 TERMINÉE : tokens rotatés, Postgres fermés, UFW actif. Passage à Phase 1."
```

Si rouge : `teams-alert critical` avec détails, STOP.

---

## PHASE 1 — Archivage + nettoyage (1,5 h)

**Référence** : `docs/plan-nettoyage-vm.md` section PHASE 1.

```bash
teams-alert info "Phase 1 démarrée : archivage + suppression orphelins + remise en service fastapi-pdf-tool"
```

### 1.1 à 1.5 — Exécuter le plan tel que rédigé

Suivre `plan-nettoyage-vm.md` 1.1 → 1.5 **sans modification**. Points d'attention particuliers :

- **NE PAS archiver ni supprimer** `/home/kierangauthier/fastapi-pdf-tool` (composant actif)
- **NE PAS supprimer** `/var/www/Suivi-consultant` (servi par nginx pour astreos)
- Exécuter la suppression des containers, dossiers abandonnés, vhost cassé conceptmanager.conf

### 1.6 — Désactiver services systemd obsolètes

```bash
sudo systemctl disable --now php8.3-fpm.service
sudo systemctl disable horizon-backup.service 2>/dev/null
```

### 1.6bis — Remettre en service fastapi-pdf-tool

```bash
# Vérifier que le service n'existe pas encore
if [ ! -f /etc/systemd/system/fastapi-pdf-tool.service ]; then
  sudo tee /etc/systemd/system/fastapi-pdf-tool.service > /dev/null <<'EOF'
[Unit]
Description=FastAPI MSAL auth gateway for dt (convertisseur DT)
After=network.target

[Service]
Type=simple
User=kierangauthier
WorkingDirectory=/home/kierangauthier/fastapi-pdf-tool
EnvironmentFile=/home/kierangauthier/fastapi-pdf-tool/.env
ExecStart=/home/kierangauthier/fastapi-pdf-tool/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8002
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable --now fastapi-pdf-tool.service
fi

sleep 3
if systemctl is-active fastapi-pdf-tool.service | grep -q active; then
  teams-alert info "Phase 1.6bis OK : fastapi-pdf-tool actif via systemd"
else
  teams-alert critical "❌ Phase 1.6bis : fastapi-pdf-tool ne démarre pas"
fi

# Vérifier le vhost
curl -sI https://dt.acreedconsulting.com | head -2
```

### 1.7 — Purge build cache Docker

```bash
BEFORE=$(df -h / | awk 'NR==2 {print $4}')
docker builder prune -a -f
AFTER=$(df -h / | awk 'NR==2 {print $4}')
teams-alert info "Phase 1.7 OK : build cache purgé. Disque libre avant=$BEFORE, après=$AFTER"
```

### 1.8 — Validation Phase 1

```bash
teams-alert info "✅ Phase 1 TERMINÉE : orphelins supprimés, fastapi-pdf-tool réactivé, disque libéré. Passage à Phase 2."
```

---

## PHASE 2 — Création des 4 réseaux Docker (15 min)

```bash
teams-alert info "Phase 2 démarrée : création réseaux acreed-prod, acreed-dev, acreed-tools, acreed-trash"

docker network create acreed-prod   --label "acreed.env=prod"   --subnet 172.100.0.0/16 2>/dev/null || echo "acreed-prod existe déjà"
docker network create acreed-dev    --label "acreed.env=dev"    --subnet 172.101.0.0/16 2>/dev/null || echo "acreed-dev existe déjà"
docker network create acreed-tools  --label "acreed.env=tools"  --subnet 172.102.0.0/16 2>/dev/null || echo "acreed-tools existe déjà"
docker network create acreed-trash  --label "acreed.env=trash"  --subnet 172.103.0.0/16 2>/dev/null || echo "acreed-trash existe déjà"

COUNT=$(docker network ls --filter "label=acreed.env" -q | wc -l)
if [ "$COUNT" -eq 4 ]; then
  teams-alert info "✅ Phase 2 TERMINÉE : 4 réseaux Docker créés"
else
  teams-alert critical "❌ Phase 2 : seulement $COUNT réseaux créés au lieu de 4"
fi
```

---

## PHASE 3 — Migration projets vers réseaux (2 h)

**Référence** : `plan-nettoyage-vm.md` PHASE 3 (tableau, template, ordre).

```bash
teams-alert info "Phase 3 démarrée : migration des projets Docker dans leurs réseaux (micro-interruptions 5-30s par projet)"
```

Exécuter les migrations de `plan-nettoyage-vm.md` 3.2 à 3.5 dans l'ordre **dev d'abord, puis prod, puis outils**, en validant chaque URL publique après chaque migration :

```bash
# Après chaque migration, test obligatoire
for url in https://site.acreedconsulting.com https://outline.acreediasolutions.com https://mimir.acreediasolutions.com https://freyr.acreediasolutions.com https://puyfoot43.acreediasolutions.com https://outil.rh.acreedconsulting.com https://horizon.acreedconsulting.com https://n8n.acreedconsulting.com; do
  code=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 5 "$url")
  if [ "$code" != "200" ] && [ "$code" != "302" ] && [ "$code" != "301" ]; then
    teams-alert critical "❌ Phase 3 : $url répond $code après migration"
  fi
done

teams-alert info "✅ Phase 3 TERMINÉE : tous les projets dans leurs réseaux, toutes les URL publiques répondent"
```

---

## PHASE 4 — Symlinks astreos (30 min)

**Référence** : `plan-nettoyage-vm.md` PHASE 4. Exécuter tel quel.

```bash
teams-alert info "Phase 4 démarrée : symlinks astreos vers /home/kierangauthier/claude-secure/astreos/deploy/"
# ... exécution plan 4.1 → 4.4
teams-alert info "✅ Phase 4 TERMINÉE : astreos pilote ses configs système depuis son dossier"
```

---

## MIGRATION DOMAINES (3 h — en parallèle des phases 5-7)

**Référence complète** : `docs/migration-domaines.md`.

```bash
teams-alert info "Migration domaines démarrée : ostara → outil.rh → horizon → dt → n8n vers acreediasolutions.com"
```

### Migration 1 — ostara (simple)

Exécuter `migration-domaines.md` ÉTAPE 1 entière. À la fin :

```bash
CODE_OLD=$(curl -sI -o /dev/null -w "%{http_code}" https://ostara.acreedconsulting.com)
CODE_NEW=$(curl -sI -o /dev/null -w "%{http_code}" https://ostara.acreediasolutions.com)
if [ "$CODE_OLD" = "200" ] && [ "$CODE_NEW" = "200" ]; then
  teams-alert info "✅ Migration ostara OK : les 2 URL répondent 200"
else
  teams-alert critical "❌ Migration ostara : old=$CODE_OLD new=$CODE_NEW"
fi
```

### Migration 2 — outil.rh

Idem `migration-domaines.md` ÉTAPE 2. Validation `teams-alert` en fin.

### Migration 3 — horizon (rebuild frontend)

Idem `migration-domaines.md` ÉTAPE 3. Attention au rebuild Docker du frontend. Validation :

```bash
# Ouvrir manuellement https://horizon.acreediasolutions.com et vérifier Network tab (Kieran)
teams-alert warning "✋ Migration horizon : URL nginx+cert OK. Kieran, ouvre https://horizon.acreediasolutions.com dans un navigateur et vérifie dans F12 Network que les appels API partent vers horizon.acreediasolutions.com (pas l'ancien). Réponds GO ou KO."
```

✋ **ATTENDRE GO** avant de passer à dt.

### Migration 4 — dt (⚠️ Azure AD MSAL)

✋ **CHECKPOINT MIGRATION-4 — Kieran doit modifier Azure AD AVANT toute action VM**

```bash
teams-alert critical "✋ CHECKPOINT dt : Kieran, va sur portal.azure.com → Microsoft Entra ID → App Registrations → Client ID 556e78d7-9152-4283-aba4-56e2ab269fc6 → Authentication → AJOUTER https://dt.acreediasolutions.com/auth/callback dans les Redirect URIs (sans retirer l'ancienne). Save. Réponds GO."
```

**Attendre GO.**

Exécuter ensuite `migration-domaines.md` ÉTAPE 4.2 à 4.7.

### Migration 5 — n8n (⚠️ Azure AD SAML + 3 consommateurs)

✋ **CHECKPOINT MIGRATION-5 — Kieran doit modifier Azure AD SAML**

```bash
teams-alert critical "✋ CHECKPOINT n8n : Kieran, va sur portal.azure.com → Microsoft Entra ID → Enterprise Applications → app n8n → Single sign-on → AJOUTER Identifier 'https://n8n.acreediasolutions.com' et Reply URL 'https://n8n.acreediasolutions.com/signin/sso/saml'. Save. Réponds GO."
```

**Attendre GO.**

Exécuter `migration-domaines.md` ÉTAPE 5.2 à 5.7.

```bash
teams-alert info "✅ MIGRATION DOMAINES TERMINÉE : les 5 sous-domaines servent les 2 noms en parallèle. Période de grâce 30 jours démarrée."
```

---

## PHASE 5 — Observabilité (2 h)

**À rédiger en document dédié `docs/observability-stack.md` (non inclus dans ce runbook v1)**.

Pour l'instant, Claude VM s'arrête ici et attend l'extension du runbook :

```bash
teams-alert info "✋ Runbook v1 terminé. Phases 5 (observabilité), 6 (backup externe), 7 (/srv/acreed-dev) seront livrées dans le runbook v2. État : tout le critique sécurité + migration domaines est FAIT."
```

✋ **FIN DU RUNBOOK v1 — Attendre instructions Kieran pour suite.**

---

## Annexe — Commandes de rollback rapides

### Rollback Phase 0 (UFW)
```bash
sudo ufw disable
```

### Rollback Phase 3 (réseaux Docker)
Pour chaque projet migré, revert le `docker-compose.yml.bak.YYYYMMDD` :
```bash
cd <projet>
cp docker-compose.yml.bak.YYYYMMDD docker-compose.yml
docker compose down && docker compose up -d
```

### Rollback Migration Domaines
Retirer le nouveau nom du `server_name` et recharger nginx :
```bash
sudo sed -i 's/server_name X.acreedconsulting.com X.acreediasolutions.com;/server_name X.acreedconsulting.com;/' /etc/nginx/sites-available/X.acreedconsulting.com
sudo nginx -t && sudo systemctl reload nginx
```

### Rollback total Azure AD
Retirer les redirect URIs / Reply URLs ajoutés dans le portail Azure — les anciens restent en place, donc l'auth continue de marcher sur l'ancien domaine.

---

## Annexe — Table des checkpoints humains ✋

| # | Phase | Ce que Kieran doit faire |
|---|---|---|
| 0 | Pré-vol | Ouvrir 2e session SSH de secours |
| 0.2 | Rotation tokens | Révoquer PAT GitHub, créer 4 deploy keys |
| 0.3 | Token Supabase | Régénérer service_role_key dans Supabase Studio |
| 0.5 | UFW | Confirmer avant activation firewall |
| M-3 | Migration horizon | Valider appels API en F12 Network |
| M-4 | Migration dt | Ajouter redirect URI dans Azure AD App Registration |
| M-5 | Migration n8n | Ajouter Entity ID + ACS dans Azure AD Enterprise App |

Tant que Kieran n'a pas posté **GO** dans le canal `acreed-alerts-critical` en réponse au checkpoint, Claude VM reste bloqué et ne tente rien.

---

## Annexe — Journal d'exécution

Claude VM maintient `~/runbook-journal-YYYYMMDD.md` avec une ligne par action :

```
## 2026-04-23T14:35:12+02:00
Phase 0.2 — Génération clé deploy_puyfoot-prod
Commande : ssh-keygen -t ed25519 ... puyfoot-prod
Résultat : ✅ clé créée, fingerprint SHA256:xxx
```

À la fin du runbook, Claude VM poste une URL du journal sur `#acreed-alerts-info`.
