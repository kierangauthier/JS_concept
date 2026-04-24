# Migration des sous-domaines IA Solutions

> **Objectif** : séparer proprement les sous-domaines liés à l'activité **IA Solutions** (produit logiciel) de ceux qui restent liés à l'activité **Consulting** (conseil historique), sans aucune coupure utilisateur.
>
> **Durée totale estimée** : 3 à 4 heures de travail actif + 30 jours de grâce pendant lesquels les anciens noms restent servis.
>
> **Risque** : faible si on suit la recette. Le principe est que chaque vhost nginx sert **les deux noms simultanément** pendant toute la transition.
>
> **Version** : 1.0 — 2026-04-23

---

## Contexte — deux entités, deux domaines

Acreed regroupe **deux entités juridiques** qui collaborent :

| Entité | Domaine | Activité |
|---|---|---|
| **Acreed Consulting** | `acreedconsulting.com` | Conseil (activité historique) |
| **Acreed IA Solutions** | `acreediasolutions.com` | Logiciel et IA (nouvelle activité, appelée à porter le MRR) |

Historiquement, tous les outils ont été déployés en `*.acreedconsulting.com`. Aujourd'hui, on veut que **chaque sous-domaine soit hébergé sous le domaine de l'entité qui l'exploite** : c'est plus propre juridiquement (DPA, CGV, mentions légales pointent vers la bonne société), plus lisible commercialement, et ça prépare la séparation comptable et SaaS.

## Répartition cible des 7 sous-domaines actifs

| # | Actuel | Entité | Décision |
|---|---|---|---|
| 1 | `astreos.acreedconsulting.com` | Consulting | ✅ **RESTE** — zéro modification |
| 2 | `site.acreedconsulting.com` | Consulting | ✅ **RESTE** — zéro modification |
| 3 | `dt.acreedconsulting.com` | IA Solutions | 🔄 → `dt.acreediasolutions.com` |
| 4 | `horizon.acreedconsulting.com` | IA Solutions | 🔄 → `horizon.acreediasolutions.com` |
| 5 | `n8n.acreedconsulting.com` | IA Solutions | 🔄 → `n8n.acreediasolutions.com` |
| 6 | `ostara.acreedconsulting.com` | IA Solutions | 🔄 → `ostara.acreediasolutions.com` |
| 7 | `outil.rh.acreedconsulting.com` | IA Solutions | 🔄 → `outil.rh.acreediasolutions.com` |

**5 basculent, 2 restent.**

## État des DNS — déjà préparé

Les 5 enregistrements `A` ont été créés chez OVH le 2026-04-23 et sont propagés :

| Sous-domaine | Cible | TTL |
|---|---|---|
| `dt.acreediasolutions.com` | `4.178.179.147` | 300 |
| `horizon.acreediasolutions.com` | `4.178.179.147` | 300 |
| `ostara.acreediasolutions.com` | `4.178.179.147` | 300 |
| `n8n.acreediasolutions.com` | `4.178.179.147` | 300 |
| `outil.rh.acreediasolutions.com` | `4.178.179.147` | 300 |

Vérifié par `dig +short` — les 5 répondent bien `4.178.179.147`.

---

## Stratégie générale — zéro coupure

Pour chaque sous-domaine qui bascule, on applique **exactement** la même recette en 6 étapes :

1. **Étendre le vhost nginx** pour qu'il serve **les deux noms** (ancien + nouveau) simultanément
2. **Étendre le certificat TLS** avec `certbot --expand` pour couvrir les deux noms
3. **Recharger nginx** — les deux URL répondent maintenant
4. **Mettre à jour les `.env` applicatifs** pour que l'app se reconnaisse sous son nouveau nom (CORS, URLs publiques, etc.)
5. **Rebuilder les frontends** qui ont l'URL en dur (horizon, astreos)
6. **Mettre à jour les systèmes tiers** : Azure AD (MSAL, SAML), consommateurs de webhooks n8n

Le nouveau nom est **immédiatement fonctionnel**, l'ancien continue de répondre normalement. Aucune interruption perceptible par l'utilisateur.

Après **30 jours de grâce** (durée pendant laquelle les anciens bookmarks, liens partagés, configs tierces oubliées sont absorbés), on retire les `server_name *.acreedconsulting.com` des vhosts qui ont basculé, on révoque les certs, on supprime les DNS côté OVH.

---

## Ordre d'exécution recommandé

Du moins critique (faible dépendance externe, peu de consommateurs) au plus critique (beaucoup de références à modifier) :

| Étape | Sous-domaine | Complexité | Dépendance externe |
|---|---|---|---|
| 1 | `ostara` | ⭐ | Aucune (outil interne, pas de SSO externe) |
| 2 | `outil.rh` | ⭐ | Aucune |
| 3 | `horizon` | ⭐⭐ | Rebuild frontend (URL en dur dans `VITE_API_BASE_URL`) |
| 4 | `dt` | ⭐⭐⭐ | **Azure AD MSAL** : redirect URI à modifier dans App Registration |
| 5 | `n8n` | ⭐⭐⭐⭐ | **Azure AD SAML** + **3 projets consommateurs** de webhooks |

**Règle** : on valide complètement chaque étape avant de passer à la suivante.

---

## ÉTAPE 1 — `ostara` (le plus simple)

### 1.1 — Préalables

```bash
# Vérifier que le DNS répond bien
dig +short ostara.acreediasolutions.com A
# → doit afficher 4.178.179.147
```

### 1.2 — Étendre le vhost nginx

```bash
sudo cp /etc/nginx/sites-available/ostara.acreedconsulting.com \
        /etc/nginx/sites-available/ostara.acreedconsulting.com.bak.$(date +%Y%m%d)

# Ajouter le nouveau server_name
sudo sed -i 's/server_name ostara.acreedconsulting.com;/server_name ostara.acreedconsulting.com ostara.acreediasolutions.com;/' \
  /etc/nginx/sites-available/ostara.acreedconsulting.com

# Vérifier
grep server_name /etc/nginx/sites-available/ostara.acreedconsulting.com
# → server_name ostara.acreedconsulting.com ostara.acreediasolutions.com;
```

### 1.3 — Étendre le certificat TLS

```bash
sudo certbot --expand \
  --cert-name ostara.acreedconsulting.com \
  -d ostara.acreedconsulting.com \
  -d ostara.acreediasolutions.com \
  --nginx --non-interactive

# Recharger nginx
sudo nginx -t && sudo systemctl reload nginx
```

### 1.4 — Validation

```bash
# Les deux URL doivent répondre
curl -sI https://ostara.acreedconsulting.com | head -2
curl -sI https://ostara.acreediasolutions.com | head -2
```

Les deux doivent retourner `HTTP/2 200` (ou 302 selon l'app).

### 1.5 — Configuration applicative

Ostara tourne via PM2 (pas Docker). Vérifier s'il a une URL publique en dur dans sa config :

```bash
grep -rn "ostara.acreedconsulting.com" /home/kierangauthier/claude-secure/ostara/ 2>/dev/null
grep -rn "ostara.acreedconsulting.com" /var/www/ostara/ 2>/dev/null
```

Si quelque chose remonte, ajuster à `ostara.acreediasolutions.com` et redémarrer :

```bash
pm2 restart ostara
```

### 1.6 — Rollback (si besoin)

```bash
sudo cp /etc/nginx/sites-available/ostara.acreedconsulting.com.bak.YYYYMMDD \
        /etc/nginx/sites-available/ostara.acreedconsulting.com
sudo nginx -t && sudo systemctl reload nginx
```

Le certificat étendu n'a pas besoin d'être rétréci — il continue de fonctionner.

---

## ÉTAPE 2 — `outil.rh`

### 2.1 — Étendre le vhost

```bash
sudo cp /etc/nginx/sites-available/outil.rh.acreedconsulting.com \
        /etc/nginx/sites-available/outil.rh.acreedconsulting.com.bak.$(date +%Y%m%d)

sudo sed -i 's/server_name outil.rh.acreedconsulting.com;/server_name outil.rh.acreedconsulting.com outil.rh.acreediasolutions.com;/' \
  /etc/nginx/sites-available/outil.rh.acreedconsulting.com

grep server_name /etc/nginx/sites-available/outil.rh.acreedconsulting.com
```

### 2.2 — Étendre le certificat

```bash
sudo certbot --expand \
  --cert-name outil.rh.acreedconsulting.com \
  -d outil.rh.acreedconsulting.com \
  -d outil.rh.acreediasolutions.com \
  --nginx --non-interactive

sudo nginx -t && sudo systemctl reload nginx
```

### 2.3 — Validation

```bash
curl -sI https://outil.rh.acreedconsulting.com | head -2
curl -sI https://outil.rh.acreediasolutions.com | head -2
```

### 2.4 — Configuration applicative

Le backend verif-paie-web doit accepter le nouveau CORS :

```bash
cd /home/kierangauthier/claude-secure/verif-paie-web/
grep -rn "outil.rh.acreedconsulting\|CORS" .env docker-compose*.yml 2>/dev/null
```

Si un `CORS_ORIGIN` ou `FRONTEND_URL` pointe vers l'ancien domaine, ajouter le nouveau (valeurs multiples si le framework le permet, sinon dupliquer la variable). Puis :

```bash
docker compose up -d
```

---

## ÉTAPE 3 — `horizon`

Plus délicat : le frontend Vite a l'URL API **compilée en dur** dans le bundle JS.

### 3.1 — Étendre le vhost

```bash
sudo cp /etc/nginx/sites-enabled/horizon.acreedconsulting.com \
        /etc/nginx/sites-enabled/horizon.acreedconsulting.com.bak.$(date +%Y%m%d)

sudo sed -i 's/server_name horizon.acreedconsulting.com;/server_name horizon.acreedconsulting.com horizon.acreediasolutions.com;/' \
  /etc/nginx/sites-enabled/horizon.acreedconsulting.com
```

### 3.2 — Étendre le certificat

```bash
sudo certbot --expand \
  --cert-name horizon.acreedconsulting.com \
  -d horizon.acreedconsulting.com \
  -d horizon.acreediasolutions.com \
  --nginx --non-interactive

sudo nginx -t && sudo systemctl reload nginx
```

### 3.3 — Mettre à jour le `.env` applicatif

```bash
cd /home/kierangauthier/claude-secure/horizon/
cp .env .env.bak.$(date +%Y%m%d)

# 6 variables à changer
sed -i 's|horizon.acreedconsulting.com|horizon.acreediasolutions.com|g' .env
sed -i 's|admin@acreedconsulting.com|admin@acreediasolutions.com|g' .env

# Vérifier
grep -E "acreedconsulting|acreediasolutions" .env
```

**Les 6 lignes modifiées** (pour info) :
- `APP_DOMAIN=horizon.acreediasolutions.com`
- `ADMIN_EMAIL=admin@acreediasolutions.com`
- `BACKEND_CORS_ORIGINS=https://horizon.acreediasolutions.com`
- `VITE_API_BASE_URL=https://horizon.acreediasolutions.com`
- `CADDY_EMAIL=admin@acreediasolutions.com`
- (autres si présentes)

⚠️ **Attention BACKEND_CORS_ORIGINS** : si tu veux que les deux frontends (ancien + nouveau domaine) puissent taper l'API pendant la transition, liste les deux valeurs séparées par une virgule :
```
BACKEND_CORS_ORIGINS=https://horizon.acreedconsulting.com,https://horizon.acreediasolutions.com
```

### 3.4 — Rebuild du frontend

Le `VITE_API_BASE_URL` est **compilé au build** dans le bundle JavaScript. Un simple `docker compose up -d` ne suffit pas — il faut **rebuilder l'image frontend**.

```bash
cd /home/kierangauthier/claude-secure/horizon/

# Si le Dockerfile frontend build le bundle, rebuild
docker compose build frontend
docker compose up -d frontend

# Si l'image est pulled depuis un registry, il faut d'abord rebuild dans le pipeline de build
# puis push + pull
```

### 3.5 — Validation

```bash
# Les deux URL répondent
curl -sI https://horizon.acreedconsulting.com | head -2
curl -sI https://horizon.acreediasolutions.com | head -2

# Test manuel navigateur : ouvrir https://horizon.acreediasolutions.com
# Vérifier dans la devtools (onglet Network) que les appels API partent bien
# vers https://horizon.acreediasolutions.com/api/... et pas vers l'ancien domaine
```

---

## ÉTAPE 4 — `dt` ⚠️ critique (Azure AD MSAL)

Ce sous-domaine a une **dépendance externe** qui peut tout casser si oubliée : la gateway `fastapi-pdf-tool` utilise **Microsoft MSAL pour l'authentification**, et le `redirect_uri` est **enregistré dans Azure AD**. Si on change le domaine côté app sans mettre à jour Azure AD, l'authentification échoue avec `AADSTS50011: The redirect URI specified in the request does not match the redirect URIs configured for the application`.

### 4.1 — Mettre à jour Azure AD (FAIRE EN PREMIER)

Avant de toucher quoi que ce soit sur la VM :

1. Se connecter à **[portal.azure.com](https://portal.azure.com)**
2. Aller dans **Microsoft Entra ID** → **App Registrations**
3. Rechercher l'app avec le **Client ID `556e78d7-9152-4283-aba4-56e2ab269fc6`** (c'est celui du `.env` de `fastapi-pdf-tool`)
4. Ouvrir **Authentication** → **Redirect URIs**
5. **Ajouter** (ne pas remplacer) la nouvelle URL :
   - `https://dt.acreediasolutions.com/auth/callback`
6. Laisser l'ancienne `https://cv-dt.acreediasolutions.com/auth/callback` **en place** pour ne pas casser l'app pendant la transition
7. Cliquer **Save**

**Note** : le `.env` actuel pointe vers `cv-dt.acreediasolutions.com` alors que le vhost nginx sert `dt.acreedconsulting.com`. Il y a donc déjà un décalage. La bascule va normaliser sur `dt.acreediasolutions.com`.

### 4.2 — Étendre le vhost nginx

```bash
sudo cp /etc/nginx/sites-available/dt.acreedconsulting.com \
        /etc/nginx/sites-available/dt.acreedconsulting.com.bak.$(date +%Y%m%d)

sudo sed -i 's/server_name dt.acreedconsulting.com;/server_name dt.acreedconsulting.com dt.acreediasolutions.com;/' \
  /etc/nginx/sites-available/dt.acreedconsulting.com
```

### 4.3 — Étendre le certificat

```bash
sudo certbot --expand \
  --cert-name dt.acreedconsulting.com \
  -d dt.acreedconsulting.com \
  -d dt.acreediasolutions.com \
  --nginx --non-interactive

sudo nginx -t && sudo systemctl reload nginx
```

### 4.4 — Mettre à jour `.env` de `fastapi-pdf-tool`

```bash
cd /home/kierangauthier/fastapi-pdf-tool/
cp .env .env.bak.$(date +%Y%m%d)

# Modifier la redirect URI
sed -i 's|REDIRECT_URI=https://cv-dt.acreediasolutions.com/auth/callback|REDIRECT_URI=https://dt.acreediasolutions.com/auth/callback|' .env

grep REDIRECT_URI .env
# → REDIRECT_URI=https://dt.acreediasolutions.com/auth/callback
```

### 4.5 — Redémarrer la gateway MSAL

Si le service systemd a été créé (Phase 1.6bis du plan VM) :

```bash
sudo systemctl restart fastapi-pdf-tool.service
sudo systemctl status fastapi-pdf-tool.service
```

Sinon (lancement manuel historique), relancer uvicorn dans un tmux ou créer le service systemd maintenant.

### 4.6 — Validation

```bash
curl -sI https://dt.acreedconsulting.com | head -2
curl -sI https://dt.acreediasolutions.com | head -2

# Test fonctionnel : depuis un navigateur, ouvrir
# https://dt.acreediasolutions.com
# → doit rediriger vers login.microsoftonline.com
# → après auth, doit revenir sur https://dt.acreediasolutions.com/auth/callback
# → puis afficher l'app convertisseur-dt
```

### 4.7 — Nettoyage du certificat `cv-dt` inutile

Un certificat `cv-dt.acreediasolutions.com` existe mais n'a **jamais été utilisé** (pas de vhost nginx). À supprimer :

```bash
sudo certbot delete --cert-name cv-dt.acreediasolutions.com
```

---

## ÉTAPE 5 — `n8n` ⚠️⚠️ le plus complexe

Multi-dépendances :
- **Azure AD SAML** : n8n utilise SAML pour l'authentification
- **8 variables d'environnement** à modifier dans `docker-compose.yml`
- **3 projets consommateurs** des webhooks n8n qui pointent vers l'ancien domaine

### 5.1 — Mettre à jour Azure AD SAML (FAIRE EN PREMIER)

1. Se connecter à **[portal.azure.com](https://portal.azure.com)**
2. Aller dans **Microsoft Entra ID** → **Enterprise Applications**
3. Rechercher l'app n8n (si tu connais son nom exact, sinon filtrer par `application type: Non-gallery`)
4. Ouvrir **Single sign-on** → section **Basic SAML Configuration**
5. **Ajouter** (pas remplacer) :
   - **Identifier (Entity ID)** : `https://n8n.acreediasolutions.com`
   - **Reply URL (ACS)** : `https://n8n.acreediasolutions.com/signin/sso/saml`
6. Laisser les anciens en place jusqu'à la fin de la période de grâce
7. **Save**

### 5.2 — Étendre le vhost nginx

```bash
sudo cp /etc/nginx/sites-available/n8n.conf \
        /etc/nginx/sites-available/n8n.conf.bak.$(date +%Y%m%d)

sudo sed -i 's/server_name n8n.acreedconsulting.com;/server_name n8n.acreedconsulting.com n8n.acreediasolutions.com;/' \
  /etc/nginx/sites-available/n8n.conf
```

### 5.3 — Étendre le certificat

```bash
sudo certbot --expand \
  --cert-name n8n.acreedconsulting.com \
  -d n8n.acreedconsulting.com \
  -d n8n.acreediasolutions.com \
  --nginx --non-interactive

sudo nginx -t && sudo systemctl reload nginx
```

### 5.4 — Mettre à jour `docker-compose.yml` de n8n

```bash
cd /home/azureuser/n8n/
sudo cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d)

# Remplacer toutes les occurrences
sudo sed -i 's|n8n.acreedconsulting.com|n8n.acreediasolutions.com|g' docker-compose.yml
sudo sed -i 's|acreedconsulting.com|acreediasolutions.com|g' docker-compose.yml

# Vérifier les 8 variables sensibles
grep -nE "N8N_HOST|N8N_EDITOR_BASE_URL|N8N_PUBLIC_API_BASE_URL|WEBHOOK_URL|N8N_SAML_ENTITY_ID|N8N_SAML_ACS_URL|N8N_SAML_ALLOWED_DOMAINS|N8N_CORS_ALLOWED_ORIGINS" docker-compose.yml
```

⚠️ **N8N_CORS_ALLOWED_ORIGINS** : cette variable liste plusieurs origines séparées par virgule. Vérifier qu'elle contient maintenant :
```
N8N_CORS_ALLOWED_ORIGINS=https://mimir.acreediasolutions.com,https://n8n.acreediasolutions.com
```

### 5.5 — Redéployer n8n

```bash
cd /home/azureuser/n8n/
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs --tail=50 n8n | grep -iE "ready|saml|error"
```

### 5.6 — Propager aux 3 projets consommateurs des webhooks

Les projets IA Solutions appellent n8n en webhook. Si on ne met pas à jour leurs `.env`, ils continuent d'appeler l'ancien domaine — ça fonctionnera pendant 30 jours (grâce au double vhost) mais ce n'est pas propre.

**acreed-ia (gestion-immo prod)** :
```bash
cd /opt/acreed-ia/
sudo cp .env .env.bak.$(date +%Y%m%d)
sudo sed -i 's|n8n.acreedconsulting.com|n8n.acreediasolutions.com|g' .env
sudo cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d)
sudo cp docker-compose.backend.yml docker-compose.backend.yml.bak.$(date +%Y%m%d)
sudo sed -i 's|n8n.acreedconsulting.com|n8n.acreediasolutions.com|g' docker-compose.yml docker-compose.backend.yml
sudo docker compose up -d
```

**gestion-immo-dev** :
```bash
cd /home/kierangauthier/claude-secure/gestion-immo-dev/
cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d)
cp docker-compose.backend.yml docker-compose.backend.yml.bak.$(date +%Y%m%d)
sed -i 's|n8n.acreedconsulting.com|n8n.acreediasolutions.com|g' docker-compose.yml docker-compose.backend.yml
docker compose up -d
```

### 5.7 — Validation

```bash
curl -sI https://n8n.acreedconsulting.com | head -2
curl -sI https://n8n.acreediasolutions.com | head -2

# Test fonctionnel : ouvrir https://n8n.acreediasolutions.com
# → doit afficher l'interface n8n
# → tester le SSO SAML (bouton "Sign in with SSO")
# → vérifier qu'un workflow existant s'exécute toujours (ex: le webhook voix-cr-email)
```

**Test du webhook depuis un consommateur** :
```bash
# Depuis un container acreed-ia ou gestion-immo-dev
curl -X POST https://n8n.acreediasolutions.com/webhook/voix-cr-email \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Phase de grâce (30 jours)

Les deux noms restent actifs en parallèle. Pendant ces 30 jours :

1. **Communication** : prévenir par email (toi + ton collègue + le président) que les URL officielles sont maintenant `*.acreediasolutions.com`. Les anciennes continuent de fonctionner mais sont **dépréciées**.

2. **Logging** : activer dans nginx un log spécifique pour voir quels clients / bookmarks / configs externes frappent encore les anciens noms :

```nginx
# À ajouter dans chaque vhost qui a les deux server_name
map $host $is_legacy {
  default 0;
  ~*\.acreedconsulting\.com$ 1;
}

access_log /var/log/nginx/legacy-hits.log combined if=$is_legacy;
```

Puis à la fin de la période :
```bash
sudo awk '{print $1, $7}' /var/log/nginx/legacy-hits.log | sort -u | head -50
```

3. **Mises à jour externes** : mettre à jour les bookmarks, les signatures email, les docs internes, les intégrations tierces (Zapier, Make, etc.) qui pointeraient vers les anciens noms.

## Retrait définitif — J+30

Une fois la période de grâce écoulée et le log `legacy-hits.log` quasi vide :

### Retrait côté nginx

Pour chaque sous-domaine qui a basculé :

```bash
# Exemple pour ostara
sudo sed -i 's/server_name ostara.acreedconsulting.com ostara.acreediasolutions.com;/server_name ostara.acreediasolutions.com;/' \
  /etc/nginx/sites-available/ostara.acreedconsulting.com

# Renommer le fichier pour clarté (optionnel)
sudo mv /etc/nginx/sites-available/ostara.acreedconsulting.com \
        /etc/nginx/sites-available/ostara.acreediasolutions.com
sudo mv /etc/nginx/sites-enabled/ostara.acreedconsulting.com \
        /etc/nginx/sites-enabled/ostara.acreediasolutions.com

sudo nginx -t && sudo systemctl reload nginx
```

Répéter pour `outil.rh`, `horizon`, `dt`, `n8n`.

### Retrait des certificats `acreedconsulting.com` devenus obsolètes

```bash
sudo certbot delete --cert-name ostara.acreedconsulting.com
sudo certbot delete --cert-name outil.rh.acreedconsulting.com
sudo certbot delete --cert-name horizon.acreedconsulting.com
sudo certbot delete --cert-name dt.acreedconsulting.com
sudo certbot delete --cert-name n8n.acreedconsulting.com

# PAS TOUCHER :
# - astreos.acreedconsulting.com (reste sur Consulting)
# - site.acreedconsulting.com (reste sur Consulting)
```

Refaire un cert propre avec le seul nom `acreediasolutions.com` :

```bash
sudo certbot --nginx \
  -d ostara.acreediasolutions.com \
  --non-interactive
# ... idem pour les 4 autres
```

### Retrait des DNS côté OVH

Dans la zone DNS `acreedconsulting.com`, supprimer les enregistrements A des 5 sous-domaines qui ont basculé :

- `dt`
- `horizon`
- `ostara`
- `n8n`
- `outil.rh`

**NE PAS SUPPRIMER** :
- `astreos` (reste actif)
- `site` (reste actif)
- enregistrement apex `@` du domaine `acreedconsulting.com` (reste actif)

### Retrait des `server_name` anciens dans les configs nginx

Dernière passe pour nettoyer les fichiers :

```bash
for f in /etc/nginx/sites-enabled/*.acreediasolutions.com; do
  grep -l "acreedconsulting" "$f" && echo "⚠️  $f contient encore acreedconsulting"
done
```

Si quelque chose remonte, éditer manuellement.

---

## Validation finale — critères de "terminé"

La migration est **complète** quand :

- [ ] Les 5 nouveaux sous-domaines `*.acreediasolutions.com` répondent en `200`
- [ ] Les 2 sous-domaines `astreos.acreedconsulting.com` et `site.acreedconsulting.com` sont intacts
- [ ] Le SSO MSAL fonctionne sur `dt.acreediasolutions.com`
- [ ] Le SSO SAML fonctionne sur `n8n.acreediasolutions.com`
- [ ] Le webhook `n8n.acreediasolutions.com/webhook/voix-cr-email` est appelé avec succès par `acreed-ia` et `gestion-immo-dev`
- [ ] Le frontend `horizon.acreediasolutions.com` appelle bien l'API `horizon.acreediasolutions.com` (pas l'ancien domaine)
- [ ] Après 30 jours, `legacy-hits.log` est (quasi) vide
- [ ] Les 5 certs `*.acreedconsulting.com` obsolètes sont révoqués
- [ ] Les 5 enregistrements DNS A obsolètes dans `acreedconsulting.com` sont supprimés

---

## Résumé en une page

**Ce qui ne bouge pas** (Consulting) :
- `astreos.acreedconsulting.com`
- `site.acreedconsulting.com`

**Ce qui bascule** (IA Solutions) dans cet ordre :
1. `ostara` → simple
2. `outil.rh` → simple
3. `horizon` → rebuild frontend
4. `dt` → **Azure AD MSAL** à mettre à jour d'abord
5. `n8n` → **Azure AD SAML** + 3 projets consommateurs à mettre à jour

**Stratégie** : chaque vhost sert les 2 noms pendant 30 jours, puis on retire les anciens.

**Zéro coupure utilisateur** sur toute la durée.
