# Guide de prise en main — Serveur Acreed AVD-01

> **Public** : développeur ou opérateur qui rejoint l'équipe Acreed et doit commencer à travailler sur le serveur de production.
>
> **Préalable** : tu as un compte SSH sur la VM (utilisateur `kierangauthier` ou autre selon ton rôle). Si non, demande à Kieran.
>
> **Temps estimé pour devenir opérationnel** : 2-3 heures de lecture + manipulation guidée.

---

## 1. Vue d'ensemble en 2 minutes

Le serveur s'appelle **AVD-01**. C'est une VM Azure située en France, IP publique `4.178.179.147`. Tu y accèdes en SSH :

```bash
ssh kierangauthier@4.178.179.147
```

Le serveur héberge **deux entités juridiques** distinctes :

- **Acreed Consulting** — activité conseil historique. Domaine : `acreedconsulting.com`.
- **Acreed IA Solutions** — éditeur SaaS pour TPE/PME (futur produit phare : ConceptManager). Domaine : `acreediasolutions.com`.

Tout l'applicatif vit dans **`/srv/`**, organisé en trois zones :

```
/srv/
├── prod/         tout ce qui est en production
├── dev/          tout ce qui est en développement
└── claude/       environnement de l'agent Claude (skills, mémoire, runbooks)
```

À l'intérieur de `/srv/prod/`, quatre sous-catégories :

```
/srv/prod/
├── conceptmanager/   déploiements clients du produit ConceptManager (vide aujourd'hui)
├── tools/            outils internes Acreed (la plupart des projets vivent ici)
├── sites/            sites web institutionnels
└── astreos/          outil consultants Acreed Consulting (cas spécial)
```

**Si tu débarques et que tu cherches un projet** : commence par `ls /srv/prod/tools/`.

---

## 2. Les 11 applications en service

Toutes accessibles publiquement en HTTPS.

| URL | Slug interne | Rôle |
|---|---|---|
| `astreos.acreedconsulting.com` | astreos | Outil consultants Acreed Consulting (chantiers, projets, lectures) |
| `site.acreedconsulting.com` | site-final-acreed | Site institutionnel Acreed Consulting |
| `ostara.acreedconsulting.com` | ostara | Builder d'apps interne (héberge 7 apps de test) |
| `outline.acreediasolutions.com` | outline | Wiki interne |
| `freyr.acreediasolutions.com` | freyr | CRM prospects commerciaux |
| `mimir.acreediasolutions.com` | mimir | POC immobilier |
| `puyfoot43.acreediasolutions.com` | puyfoot43 | Suivi marketing maison |
| `horizon.acreediasolutions.com` | horizon | Outil RH / trésorerie |
| `outil.rh.acreediasolutions.com` | verif-paie-web | Outil RH paie |
| `n8n.acreediasolutions.com` | n8n | Automatisation workflows |
| `dt.acreediasolutions.com` | convertisseur-dt | Convertisseur de CV vers Dossier Technique |

Pour chaque application, **le slug** (colonne du milieu) est l'identifiant pivot. Il sert à retrouver tout le reste.

---

## 3. La règle d'or : le slug détermine tout

Pour chaque projet, **6 informations techniques se déduisent automatiquement du slug**.

Exemple avec `mimir` :

| Élément | Valeur déduite |
|---|---|
| Chemin sur disque | `/srv/prod/tools/mimir/` |
| URL publique | `mimir.acreediasolutions.com` |
| Réseau Docker | `acreed-tools` (ou `acreed-prod` selon catégorie) |
| Nom des containers | `mimir-frontend`, `mimir-backend`, `mimir-db` |
| Schéma base de données | `mimir` ou `concept_mimir` |
| Volume Docker | `mimir-pgdata`, `mimir-uploads` |

Pour les futurs **clients ConceptManager**, même règle avec un préfixe `cm-` sur les containers (pour distinguer du moteur) :

| Élément | Pour un client `dupont-sas` |
|---|---|
| Chemin | `/srv/prod/conceptmanager/dupont-sas/` |
| URL | `dupont-sas.acreediasolutions.com` |
| Containers | `cm-dupont-sas-frontend`, `cm-dupont-sas-api`, `cm-dupont-sas-db`, `cm-dupont-sas-minio` |
| Schéma DB | `concept_dupont_sas` |

**Si tu déploies un nouveau projet** : choisis un slug court en kebab-case (`dupont-sas`, pas `Dupont SAS` ni `dupont_sas`), et applique la convention. Pas de créativité, c'est volontaire.

Référence canonique complète : `/srv/claude/docs/convention-srv.md`.

---

## 4. Les 4 réseaux Docker

Tous les containers sont rattachés à l'un de ces 4 réseaux :

| Réseau | Pour qui | Subnet |
|---|---|---|
| `acreed-prod` | Containers exposés publiquement (sites, applications client) | 172.100.0.0/16 |
| `acreed-dev` | Tous les containers en environnement de développement | 172.101.0.0/16 |
| `acreed-tools` | Outils internes (mimir, n8n, puyfoot43, ostara, …) | 172.102.0.0/16 |
| `acreed-trash` | Containers en attente de décommission | 172.103.0.0/16 |

Pour vérifier qu'un container est dans le bon réseau :

```bash
docker inspect <nom-container> --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

**Règle** : un container avec `acreed.env=prod` ne doit techniquement pas pouvoir parler à un container `acreed.env=dev`. C'est l'isolation que cette structure garantit.

---

## 5. Cas particuliers à connaître

Certaines applications dérogent aux règles générales pour de bonnes raisons. Tu vas les rencontrer, ne sois pas surpris.

### Astreos est à part

`/srv/prod/astreos/` est à la racine de `prod/`, pas dans `tools/`. Trois raisons :

1. C'est l'outil le plus critique d'Acreed Consulting (utilisé en production par les consultants chaque jour)
2. Ses fichiers de configuration `/etc/nginx/sites-available/astreos`, `/etc/cron.d/astreos-backup`, etc. sont en réalité des **liens symboliques** vers `/srv/prod/astreos/deploy/`. Le dossier `deploy/` est la **source de vérité unique** : si tu modifies un fichier dans `deploy/`, ça impacte directement `/etc/`. Ne pas modifier les fichiers `/etc/` directement.
3. Astreos utilise une instance Supabase locale (containers `supabase_*_ksevdfdvebyymeygpdwh`) avec une dette technique connue (rotation d'un ancien secret à faire) — voir REX session A.

### Ostara est un monorepo

`/srv/prod/tools/ostara/` contient 13 process simultanés (1 dashboard + 7 apps + 5 services IA) tournant via PM2 sous l'utilisateur `tdufr`. Les apps partagent les `node_modules` du parent, **donc ne sépare pas les dossiers**. Pour interagir avec PM2 :

```bash
sudo -u tdufr -H bash -lc "/home/tdufr/.nvm/versions/node/v24.14.0/bin/pm2 list"
sudo -u tdufr -H bash -lc "/home/tdufr/.nvm/versions/node/v24.14.0/bin/pm2 logs ostara-dashboard --lines 50"
```

### Convertisseur-DT et fastapi-pdf-tool ne sont pas dockerisés

Ces deux applications tournent en service systemd direct (uvicorn host), pas dans Docker. Pour les redémarrer :

```bash
sudo systemctl restart convertisseur-dt.service
sudo systemctl status convertisseur-dt.service
```

Leur DB `convertisseur-dt` est en SQLite (`/srv/prod/tools/convertisseur-dt/backend/database.db`). Tu peux la requêter directement :

```bash
sqlite3 /srv/prod/tools/convertisseur-dt/backend/database.db
```

### Slugs partagés prod et dev (mimir, puyfoot43)

Quand un projet a une version prod **et** une version dev (mimir et puyfoot43 aujourd'hui), leurs `docker-compose.yml` doivent **obligatoirement** déclarer un `name:` distinct au top-level :

```yaml
name: mimir-prod      # dans /srv/prod/tools/mimir/
name: mimir-dev       # dans /srv/dev/tools/mimir/
```

Sans ce `name:`, Docker considère les deux comme un seul déploiement et **écrase silencieusement les données du sibling**. C'est un bug subtil qui nous a coûté une heure de récupération en avril 2026. À retenir pour tout futur client ConceptManager qui aura les deux environnements.

---

## 6. Commandes que tu utiliseras tous les jours

### Vérifier que tout va bien

```bash
# Toutes les URLs publiques répondent ?
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

Tout doit retourner 200, 301 ou 302. Une 5xx → ping Kieran ou voir les logs du service concerné.

### Lister tous les containers et leur réseau

```bash
for c in $(docker ps --format '{{.Names}}'); do
  net=$(docker inspect "$c" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')
  echo "$c → $net"
done
```

### Voir les logs d'un service

```bash
# Container Docker
docker logs <nom-container> --tail 50

# Service systemd
sudo journalctl -u <nom-service>.service -n 50

# PM2 (ostara seulement)
sudo -u tdufr -H bash -lc "/home/tdufr/.nvm/versions/node/v24.14.0/bin/pm2 logs <nom-app> --lines 50"
```

### Se connecter à une base de données

```bash
# Mimir prod
docker exec -it mimir-db-prod psql -U postgres -d acreed_db

# Mimir dev
docker exec -it mimir-db-dev psql -U camif_user -d gestion_immo_dev

# Horizon
docker exec -it horizon-db-1 psql -U tresorerie -d tresorerie

# Outline
docker exec -it outline-postgres-1 psql -U outline -d outline

# Puyfoot43
docker exec -it pf43_postgres psql -U pf43 -d pf43_ops

# Convertisseur-dt (SQLite, pas dans Docker)
sqlite3 /srv/prod/tools/convertisseur-dt/backend/database.db
```

### Redémarrer un service

```bash
# Container Docker (depuis le dossier du projet)
cd /srv/prod/tools/<slug>
sudo docker compose restart

# Si plusieurs variants compose, préciser le bon
sudo docker compose -f docker-compose.prod.yml restart

# Service systemd
sudo systemctl restart <nom-service>.service

# PM2 (ostara)
sudo -u tdufr -H bash -lc "/home/tdufr/.nvm/versions/node/v24.14.0/bin/pm2 restart <nom-app>"
```

### Recharger nginx après modif de config

```bash
sudo nginx -t                           # vérifie la syntaxe
sudo systemctl reload nginx             # recharge sans interruption
```

---

## 7. Les 11 erreurs à ne **jamais** faire

Issues directement de l'intervention du 27 avril 2026, où chacune de ces erreurs a failli (ou a réussi à) provoquer un incident.

1. **`cat .env`** ou tout fichier contenant des secrets dans une session interactive. Si vraiment nécessaire, redirige vers un fichier en `chmod 600`. Préfère `printenv VAR_NAME` pour vérifier une variable précise.

2. **`sed -i` sur un fichier `.db` SQLite** ou tout binaire. Corruption garantie. Pour patcher des chemins absolus dans une DB, utilise `UPDATE SQL` transactionnel.

3. **`docker compose down -v`** sauf intention explicite. Le `-v` supprime les volumes **avec leurs données**. Le `down` simple suffit dans 99% des cas.

4. **`chown -R kierangauthier:kierangauthier`** aveuglément après un déplacement de dossier. Plusieurs services tournent sous `tdufr` ou `azureuser`. Le `mv` préserve l'owner — c'est l'état correct.

5. **Lancer `docker compose up -d` sans préciser `-f`** quand le projet a plusieurs variants (`docker-compose.yml`, `docker-compose.prod.yml`, `.dev.yml`). Vérifie d'abord avec quel variant le projet tournait.

6. **Considérer une URL `200` comme preuve de bon fonctionnement**. Une DB vide avec schéma initialisé donne aussi 200. Toujours valider via un compteur sur une table métier (`SELECT COUNT(*) FROM users`) avec valeur attendue.

7. **Avoir 2 composes avec le même project name** (basename de dossier). Toujours déclarer `name: <slug>-prod` / `name: <slug>-dev` au top-level pour les slugs partagés prod/dev.

8. **Ajouter un bloc `networks:` aveuglément à la fin d'un compose** qui en a déjà un. YAML invalide. Si le compose a déjà un réseau interne nommé, ajoute le réseau `acreed-*` **dans** le bloc existant, et liste-le par service.

9. **`sed` sur un fichier édité Windows sans normaliser CRLF**. Les ancres `^...$` ne matchent pas avec un `\r` invisible. Toujours `sed -i 's/\r$//' <fichier>` d'abord.

10. **Continuer après une commande qui échoue ou un check qui ne valide pas**. STOP, demande, audite. Pas d'auto-fix.

11. **Oublier les filets de sécurité avant action irréversible**. Toujours `cp .bak`, `tar tgz`, ou `pg_dumpall` avant tout déplacement / modification de structure / migration de données. Le filet coûte moins d'une minute à poser, l'absence de filet peut coûter des heures de récupération.

---

## 8. Que faire selon le besoin

### Tu veux comprendre comment c'est rangé

Lis dans cet ordre :

1. Cette page (tu y es)
2. `/srv/claude/docs/convention-srv.md` — la règle canonique
3. `/srv/claude/docs/architecture/arborescence-vm.md` — la photo à jour

### Tu veux corriger un bug ou ajouter une feature à un projet existant

1. Identifie le slug du projet
2. Va dans `/srv/<env>/<sous-cat>/<slug>/`
3. Lis le `docker-compose.yml` (ou `.prod.yml` selon le projet) pour comprendre la stack
4. Pour les projets avec un dépôt Git : `git status` te dit l'état du code
5. **Avant toute modification** : `cp <fichier> <fichier>.bak.$(date +%Y%m%d-%H%M%S)`

### Tu veux déployer un nouveau client ConceptManager

Procédure complète à venir dans `/srv/claude/skills/deploy-client/SKILL.md` (à rédiger). En attendant, suis cette ébauche :

1. Le client a signé et payé l'acompte
2. Choisis un slug en kebab-case (`dupont-sas`)
3. Crée `/srv/prod/conceptmanager/<slug>/`
4. Configure DNS chez OVH : `<slug>.acreediasolutions.com` → `4.178.179.147`
5. Génère un `docker-compose.yml` depuis le template ConceptManager avec :
   - Containers `cm-<slug>-frontend`, `cm-<slug>-api`, `cm-<slug>-db`, `cm-<slug>-minio`
   - JWT_SECRET et autres secrets uniques (générés via `openssl rand -hex 64`)
   - `name: cm-<slug>` au top-level
   - Réseau `acreed-prod` external
6. Configure nginx (vhost) + certbot pour TLS
7. Démarre et lance les migrations Prisma
8. Crée les comptes utilisateurs initiaux selon `PACK-PILOTE.md`
9. Vérifie via `SELECT COUNT(*) FROM users` que l'init s'est bien passée

**Demande à Kieran de relire avant la mise en service.** Le skill canonique sera disponible quand on aura signé un premier client réel.

### Tu rencontres un incident

1. **STOP** — ne tente pas un "petit fix rapide", surtout en production
2. Lis les logs du service concerné (voir section 6)
3. Reproduis localement si possible avant de toucher à la prod
4. **Toujours pose un filet** avant de modifier quoi que ce soit
5. Si tu n'es pas sûr, ping Kieran ou demande à l'agent Claude (qui a accès aux runbooks)

### Tu veux savoir ce qui s'est passé sur le serveur récemment

Tous les journaux d'intervention sont dans `~/runbook-*-YYYYMMDD.md`. Le plus récent est `~/runbook-session-a-20260427.md` — la grande mise au propre du 27 avril 2026.

Pour le récap exécutif : `/srv/claude/docs/cr-rex-session-a.md`.

Pour les leçons apprises (utile si tu veux comprendre les pièges connus) : `/srv/claude/docs/lessons-learned-session-a.md`.

---

## 9. Avec qui parler

| Sujet | Personne |
|---|---|
| Architecture serveur, conventions | Kieran Gauthier |
| Application Astreos | Tristan Dufraisseix |
| Stratégie produit ConceptManager / Ostara | Kieran + équipe dev |
| Aspects commerciaux / signature client | Le président d'Acreed |
| Comptes Azure / facturation infrastructure | Kieran |

L'agent Claude (sur la VM, dans `/srv/claude/`) a accès aux runbooks et aux mémoires de toutes les sessions précédentes. Tu peux lui demander :
- "Comment je redémarre proprement mimir ?"
- "Quels sont les pièges connus pour migrer un projet sous /srv/ ?"
- "Quelle est la convention pour nommer un nouveau client ConceptManager ?"

Il te répondra à partir des documents du serveur.

---

## 10. Dans quel ordre te lancer

Plan d'apprentissage en 3 sessions de ~1h chacune.

**Session 1 — observation passive (1h)**

- Lis cette page entièrement
- Connecte-toi en SSH
- Lance les commandes de la section 6 (vérifier les URLs, lister les containers, voir les logs d'un service)
- Va te promener dans `/srv/prod/tools/` et lis les `docker-compose.yml` de 2-3 projets

**Session 2 — interaction guidée (1h)**

- Lis `/srv/claude/docs/convention-srv.md` (la règle canonique)
- Lis `/srv/claude/docs/architecture/arborescence-vm.md`
- Pour 1 projet de ton choix : lis son code, sa config, ses logs récents, sa base de données. Comprends ce qu'il fait.

**Session 3 — première action (1h)**

- Modifie un fichier de configuration **sur l'environnement de dev d'un projet** (jamais en prod pour ta première action)
- Pose un filet (`cp .bak`)
- Redéploie
- Valide via la procédure habituelle (URL + compteur DB)
- Si tout va bien, défais ta modification (le filet sert à ça)

À l'issue de ces 3 sessions, tu peux commencer à intervenir sur des sujets simples en prod (avec validation Kieran avant tout `up -d` ou redémarrage de service critique).

---

*Document rédigé le 27 avril 2026 sur la base de l'arborescence post-intervention. Pour toute correction ou question, ping Kieran.*
