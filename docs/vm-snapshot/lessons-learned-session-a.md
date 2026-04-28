# Lessons Learned — Session A 2026-04-27

> **Public** : Claude VM dans une session future qui touchera à cette infra. Ce document liste les 11 incidents rencontrés en Session A et les règles dérivées pour ne pas les reproduire.

---

## Incident 1 — Sed runbook trop strict (crontab Suivi_consultant_V2)

**Étape concernée** : 1.4

**Ce qui s'est passé** : Le `sed` du runbook ciblait `Suivi_consultant_V2/backup-db\.sh` (slash direct). La ligne réelle de la crontab était `Suivi_consultant_V2/supabase && ./backup-db.sh` (sous-dossier `supabase` puis chaining shell). Le pattern n'a jamais matché → crontab non commentée alors que le dossier fantôme était déjà supprimé. La cron aurait spammé une erreur au prochain run 02:00.

**Comment on l'a détecté** : Vérification post-sed via `crontab -l | grep -nE "BROKEN"` qui montrait 0 ligne commentée alors qu'on en attendait 1.

**Pourquoi ça arrivait** : Le runbook avait été écrit en supposant un chemin direct, mais la crontab utilisait un chaining `cd .../supabase && ./backup-db.sh`. Le runbook n'avait pas été testé contre la crontab réelle.

**Comment on l'a résolu** : Patch sed étendu après GO Kieran : `s|^\(.*Suivi_consultant_V2.*backup-db\.sh.*\)$|# BROKEN ... — \1|` (regex `.*` entre les 2 ancres au lieu d'un slash strict).

**Règle dérivée** : Toujours valider qu'un sed prescrit a réellement matché en faisant un `grep -c` avant ET après. Si 0 changement → STOP, le pattern ne matche pas la réalité.

**Lien mémoire** : aucune mémoire dédiée — cas trop spécifique.

---

## Incident 2 — Container standalone hors compose (camif-front)

**Étape concernée** : 1.5

**Ce qui s'est passé** : Le runbook supposait que `camif-front` était un service du compose n8n et prescrivait `docker compose stop camif-front`. La commande a échoué (`no such service: camif-front`). Le container existait en réalité en standalone (créé via `docker run` à un moment passé), et le compose n'en avait jamais eu trace.

**Comment on l'a détecté** : Erreur explicite de Docker Compose `no such service` + container toujours running après la "tentative" de stop.

**Pourquoi ça arrivait** : Divergence entre l'état documenté du runbook et l'état réel du système. Quelqu'un avait probablement retiré le bloc YAML précédemment sans `docker rm`, laissant le container orphelin.

**Comment on l'a résolu** : `docker stop camif-front && docker rm camif-front` direct, sans passer par compose.

**Règle dérivée** : Avant de supposer qu'un container est piloté par un compose, vérifier ses labels `com.docker.compose.project`. Si absents → container standalone, agir directement avec `docker stop/rm`. Toujours faire `docker ps -a | grep <name>` ET `docker compose -f <file> ps` pour comparer.

**Lien mémoire** : aucune dédiée.

---

## Incident 3 — Template `cat >>` casse les composes ayant déjà un bloc `networks:`

**Étape concernée** : 3.2 (freyr) — récurrent en 3.6, 4.4, 4.5, 4.6

**Ce qui s'est passé** : Le runbook proposait d'ajouter un réseau Docker à un compose via `cat >> docker-compose.yml <<EOF networks: default: name: acreed-prod external: true EOF`. Pour un compose **sans bloc `networks:` top-level** (comme outline), ça fonctionne. Pour un compose **avec un bloc existant** (freyr, mimir, puyfoot43, etc., qui avaient déjà un réseau interne nommé), le `cat >>` produit un YAML avec **2 clés `networks:` à la racine** — invalide ou mal interprété.

**Comment on l'a détecté** : Au moment de l'edit freyr (3.2), j'ai lu le compose avant d'agir et constaté qu'il avait déjà `networks: freyr_internal:` au top-level + chaque service avec `networks: - freyr_internal`. Le `cat >>` aurait créé un YAML cassé ET acreed-prod n'aurait été joint par aucun service.

**Pourquoi ça arrivait** : Le runbook supposait des composes "simples" sans réseau interne nommé. Réalité : la majorité des composes ayant un postgres interne ont un bloc `networks:` top-level pour isoler la DB.

**Comment on l'a résolu** : **Option A** (édition fine) : ajouter `acreed-<env>: external: true` dans le bloc `networks:` existant + ajouter `- acreed-<env>` à chaque service exposé (frontend, backend, mailpit). Postgres reste sur le réseau interne uniquement (DB non exposée, conforme convention §9).

**Règle dérivée** : Avant d'ajouter un réseau à un compose, **toujours auditer** la structure : `grep -cE "^networks:|^    networks:"`. Si > 0 → option A obligatoire (édition fine), pas `cat >>`.

**Lien mémoire** : à créer (`feedback_compose_networks_existant.md`) — règle générique pour la convention §9.

---

## Incident 4 — Mauvais variant compose (horizon)

**Étape concernée** : 3.4

**Ce qui s'est passé** : Horizon a 3 composes dans son dossier (`docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.dev.yml`). Le runbook prescrivait simplement `docker compose up -d`, qui prend `docker-compose.yml` par défaut. Or ce default est le mode "all-in-one Caddy" (ports 80/443) — incompatible avec un nginx host. Le bon variant pour la VM est `docker-compose.prod.yml` (commenté explicitement « ce serveur héberge déjà ~15 applications derrière un nginx natif… on ne peut pas monter Caddy »).

Conséquence : le `up` standard a essayé de démarrer un container Caddy qui s'est crashé sur conflit port 80. Backend + frontend + db démarrés mais sans port publié sur loopback → URL `horizon.acreediasolutions.com` en 502 pendant ~3 min.

**Comment on l'a détecté** : Erreur `failed to bind host port 0.0.0.0:80/tcp: address already in use` au `up -d`, suivie d'un `curl -sI` retournant 502.

**Pourquoi ça arrivait** : Le runbook ne précisait pas le variant compose à utiliser. Connaissance implicite (lue dans le commentaire d'en-tête du `.prod.yml` mais pas reportée dans le runbook).

**Comment on l'a résolu** : `docker compose down && docker compose -f docker-compose.prod.yml up -d` après GO Kieran.

**Règle dérivée** : Avant tout `up -d` sur un projet ayant plusieurs variants compose, **toujours identifier quel variant tournait avant**. Comparer container_names + ports actuels avec ceux des composes via `docker compose -f <file> config | grep container_name` pour faire le bon choix.

**Lien mémoire** : aucune dédiée — cas spécifique horizon.

---

## Incident 5 — DB SQLite avec paths absolus + fuite secrets `.env`

**Étape concernée** : 3.7 (convertisseur-dt)

**Ce qui s'est passé (1/2 — DB)** : `convertisseur-dt/backend/database.db` (SQLite 124 KB) contenait 11 lignes `cv_history.file_path` avec path absolu vers `/srv/prod/convertisseur-dt/backend/uploads/...`. Un `mv` simple aurait laissé ces 11 références cassées (l'app aurait cherché des fichiers sur l'ancien chemin disparu). La présence d'un `database.db.bak-phaseB` indique qu'on avait déjà eu ce souci en Phase B antérieure.

**Comment on l'a détecté** : Audit pré-mv via `sqlite3 .dump | grep -nE "/srv/prod/convertisseur-dt"` → 11 occurrences.

**Pourquoi ça arrivait** : L'app convertisseur-dt stocke les paths des CV uploadés en absolu dans la DB (au lieu de relatif au dossier d'install).

**Comment on l'a résolu** : Option A après GO — backup database.db (cp) + tgz + pg_dumpall équivalent (16 KB), puis `UPDATE cv_history SET file_path = REPLACE(file_path, '/srv/prod/convertisseur-dt', '/srv/prod/tools/convertisseur-dt') WHERE file_path LIKE '/srv/prod/convertisseur-dt/%'` transactionnel. Validation post : 0 rows en ancien path, 11 rows en nouveau path.

**Règle dérivée (DB)** : Avant tout `mv` d'un projet, **toujours scanner ses DB SQLite** pour détecter des paths absolus stockés en colonne TEXT : `sqlite3 <file>.db .dump | grep -c "<ancien_path>"`. Si > 0 → patcher via `UPDATE SQL` transactionnel, **JAMAIS via `sed -i`** (corruption garantie sur binaire SQLite).

**Ce qui s'est passé (2/2 — fuite secrets)** : Pendant le diagnostic d'un 500 transitoire post-restart, j'ai exécuté `sudo cat .env` du convertisseur-dt → `GEMINI_API_KEY` + `JWT_SECRET` exposés dans le transcript Claude. 4e fuite de secrets côté Claude (3 le 2026-04-24 + 1 ce 2026-04-27).

**Comment on l'a détecté** : Quand j'ai vu les valeurs sensibles dans la sortie, j'ai signalé immédiatement et alerté Teams critical pour rotation.

**Pourquoi ça arrivait** : Le 500 était une rewrite cycle nginx au reload (résolu seul en < 1s). Le `cat .env` n'était même pas nécessaire — `journalctl` + `curl 127.0.0.1:8002` suffisaient. J'ai pris le réflexe par habitude au lieu de prendre 5s pour réfléchir au moyen safe.

**Comment on l'a résolu** : Alerte critical Teams → rotation `GEMINI_API_KEY` (Google AI Studio) + `JWT_SECRET` (regen + redeploy + invalider tous les tokens) à la charge de Kieran. Mémoire `feedback_secret_output_hygiene.md` mise à jour avec le 4e incident et règle dérivée durcie.

**Règle dérivée (secrets)** : Avant tout `cat <fichier_potentiellement_sensible>`, demander à voix haute « cette commande affiche le contenu d'un fichier susceptible de contenir des secrets — l'info dont j'ai besoin est-elle accessible autrement ? ». Logs `journalctl`, curl direct, `printenv VAR_NAME`, count via `grep -c` SUFFISENT dans 99% des cas. Si vraiment nécessaire de lire : rediriger vers `/tmp/output.txt` chmod 600.

**Liens mémoire** :
- `feedback_migration_paths.md` — règle DB via UPDATE SQL
- `feedback_secret_output_hygiene.md` — incrémenté 3 → 4 fuites + règle dérivée

---

## Incident 6 — Chown destructif dans le runbook

**Étape concernée** : 4.1 (astreos), 4.3 (n8n), 4.4 (mimir), 4.5 (puyfoot43 prod), 4.6 (mimir-dev), 4.7 (ostara)

**Ce qui s'est passé** : Le template runbook 4.X contenait systématiquement `sudo chown -R kierangauthier:kierangauthier "$TARGET"` après le `mv`. Or les projets migrés avaient des owners variés : `tdufr:acreed-dev` (astreos, ostara), `kierangauthier:acreed-dev` (mimir, puyfoot43), owner mixte top/data (n8n : top kierangauthier, data azureuser). Appliquer le chown aurait cassé les services tournant sous tdufr ou azureuser (pas d'accès write sur leurs propres data).

**Comment on l'a détecté** : Avant action 4.1, audit `stat -c '%U:%G'` de la source astreos → `tdufr:acreed-dev`. Le service `astreos-notifications.service` tourne sous User=tdufr (PID 12695). Si chown vers kierangauthier → service écrasé en write sur `backups/`, `dist/`.

**Pourquoi ça arrivait** : Le runbook a probablement été écrit en supposant un seul user `kierangauthier` propriétaire de tout. Réalité : multi-user avec services systemd/PM2 tournant sous tdufr.

**Comment on l'a résolu** : Skip systématique du chown après mini-checkpoint Teams critical à 4.1 (« je propose SKIPPER, le mv préserve l'owner »). GO skip-chown généralisé pour 4.3, 4.5, 4.6, 4.7. Le mv préserve l'owner par défaut → état correct.

**Règle dérivée** : **Ne jamais chown aveuglément après un mv**. Le `mv` préserve l'owner, c'est la sémantique correcte. Vérifier qui exécute le service (User= du systemd unit, sudo -u du PM2, UID interne du container) avant de toucher aux ownerships. Si le service tourne sous user X, le dossier doit rester owned par X.

**Lien mémoire** : à créer (`feedback_skip_chown_au_mv.md`).

---

## Incident 7 — CRLF dans compose (mimir)

**Étape concernée** : 4.4

**Ce qui s'est passé** : Le compose `mimir/docker-compose.prod.yml` avait des terminaisons de ligne **CRLF** (Windows-style — visible avec `cat -A` qui affiche `^M$`). Mon premier `sed -i '/^  frontend:$/,/^volumes:$/{/^volumes:$/!d;}'` n'a rien fait silencieusement parce que le pattern `^  frontend:$` ne matche pas (le `\r` invisible reste avant le `$`).

**Comment on l'a détecté** : Vérification post-sed : `wc -c` retournait la même taille avant/après et `grep "frontend:"` montrait toujours le bloc présent.

**Pourquoi ça arrivait** : Le compose avait été édité à un moment sur Windows ou via un éditeur qui ajoute CRLF.

**Comment on l'a résolu** : `sed -i 's/\r$//' docker-compose.prod.yml` pour normaliser, puis re-tentative du sed range qui a fonctionné cette fois.

**Règle dérivée** : Avant tout `sed` avec ancres `^...$` sur un fichier d'origine inconnue, **toujours vérifier les terminaisons de ligne** : `cat -A <fichier> | head -3` ou `file <fichier>`. Si CRLF (`^M$` ou « with CRLF line terminators »), normaliser d'abord avec `sed -i 's/\r$//'`.

**Lien mémoire** : aucune dédiée (cas spécifique mais à intégrer dans une règle plus large « avant sed sur YAML/conf, normaliser CRLF »).

---

## Incident 8 — Service legacy dans compose mimir (frontend D2)

**Étape concernée** : 4.4

**Ce qui s'est passé** : Le compose `mimir/docker-compose.prod.yml` contenait un service `frontend:` (clone legacy du frontend mimir, exposé `0.0.0.0:8084`, sans trafic depuis 2 mois selon convention §11 D2). Le runbook prescrivait son retrait via checkpoint manuel par Kieran.

**Comment on l'a détecté** : Lecture du compose en début 4.4 — service `frontend:` lignes 72-92 confirmé sans trafic.

**Pourquoi c'est notable** : Ce service tournait avec port `0.0.0.0:8084` exposé public (dette UFW), alors que le frontend "actif" mimir est servi en static par nginx host depuis `/var/www/mimir/`. Doublon mort.

**Comment on l'a résolu** : Edit Claude après GO claude-edit + CRLF normalisation : sed range `/^  frontend:$/,/^volumes:$/{/^volumes:$/!d;}` retire le bloc proprement (22 lignes).

**Règle dérivée** : Avant migration d'un projet, **lire le compose entier** et identifier les services qui ne servent à rien (pas de trafic, doublon avec un service nginx host, ports publics inutiles). Profiter du downtime de migration pour les retirer si convention §11 documenté.

**Lien mémoire** : aucune dédiée (D2 est tracée dans convention §11).

---

## Incident 9 — Volumes Docker orphelins après mv (mimir prod, mimir dev)

**Étape concernée** : 4.4 (mimir prod), 4.6 (mimir dev) — découvert pendant 4.6

**Ce qui s'est passé** : **L'incident le plus grave de la session.** Docker Compose dérive le project name du basename du dossier du compose. Quand on fait `mv /opt/acreed-ia → /srv/prod/tools/mimir`, le project name passe de `acreed-ia` à `mimir`. Les volumes nommés (`postgres_data_prod`) sont préfixés par le project name → l'ancien volume `acreed-ia_postgres_data_prod` n'est plus associé au nouveau project, qui crée un volume vide `mimir_postgres_data_prod` au prochain `up -d`.

Effet : la DB tournante a un schéma initialisé (Prisma migrate qui re-tourne sur volume vide) **mais ZÉRO donnée métier**. URL 200 trompeuse car les pages d'accueil ne font pas forcément de SELECT sur tables métier. Mimir prod a tourné ~30 min sur DB vide entre 4.4 et la découverte en 4.6.

**Comment on l'a détecté** : Pendant 4.6, le `docker compose up -d` du compose dev a recréé `mimir-db-prod` (effet de bord parce que les 2 composes mimir partageaient le même project name `mimir`). En investiguant l'effet de bord, j'ai listé les volumes Docker (`docker volume ls | grep postgres`) → trouvé 6 volumes Postgres dont 2 historiques (`acreed-ia_postgres_data_prod` PG 30/01 + `gestion-immo-dev_postgres_data_dev` PG 23/02) que personne n'utilisait + 4 volumes vides créés en Session A.

**Pourquoi ça arrivait** : Le runbook ne mentionnait nulle part la stabilité du project name lors d'un mv. Connaissance implicite de Docker Compose qui n'avait pas été vérifiée. Le passage d'un dossier à un autre = nouveau project = volumes recréés, anciens orphelinés.

**Comment on l'a résolu** : Procédure complète après audit READ-ONLY (sans mutation) :
1. Stop containers backend (3 backends : mimir-prod, pf43_backend, horizon — par précaution massive).
2. Audit volume historique via container postgis temporaire monté en read.
3. Confirmation count rows métier (4 users / 1 project / 9 artisans / 4 docs pour prod, 3/5/9/4 pour dev).
4. Vérification logs backend : 0 POST/PUT/PATCH/DELETE pendant la fenêtre DB-vide → aucune perte de donnée.
5. Filets de sécurité : compose `.bak`, tgz volume RO via alpine `:ro`, pg_dumpall via container temporaire chmod 600.
6. Edit compose : transformer la déclaration `postgres_data_prod: {driver: local}` (ou clé vide) en `postgres_data_prod: {external: true, name: acreed-ia_postgres_data_prod}` (volume historique référencé par nom absolu).
7. Down + up → containers attachés au volume historique. Validation rows OK.

Restauration mimir prod : 4/1/9/4 confirmés. Restauration mimir dev : 3/5/9/4 confirmés.

**Règle dérivée** : Avant tout `mv` d'un projet utilisant des volumes Docker nommés, **TOUJOURS** :
1. Lister les volumes attachés : `docker compose ps --format json | jq` ou `docker inspect <container> --format '{{range .Mounts}}{{.Name}}{{println}}{{end}}'`.
2. Pour chaque volume nommé (pas bind mount) : noter qu'il sera orphelin après mv.
3. Choisir : (a) ajouter `external: true / name: <ancien_volume>` dans le compose AVANT le mv pour stabiliser, ou (b) accepter la rupture et planifier la restauration.
4. **Toujours valider via `SELECT COUNT(*) FROM <table_métier>` post-restart**, jamais via URL 200 seule. Une DB vide avec schéma initialisé répond 200 mais n'a pas les données.

**Liens mémoire** : à créer (`feedback_compose_volumes_orphelins.md`) — règle critique manquante dans la convention.

---

## Incident 10 — Collision project name Compose pour slugs partagés prod/dev

**Étape concernée** : 4.6 — révélée pendant la résolution de l'incident 9

**Ce qui s'est passé** : `mimir` a un déploiement prod (`/srv/prod/tools/mimir/`) et un dev (`/srv/dev/tools/mimir/`). Sans `name:` explicite, Docker Compose dérive le project name du basename `mimir` pour les 2 → **même project name partagé**. `docker compose ls` confirme : project `mimir` agrégeait les 2 fichiers compose en parallèle. Tout `up -d` sur l'un écrasait l'autre (containers et volumes du service `postgres` confondus).

**Comment on l'a détecté** : Pendant la 1ère tentative 4.6 mimir dev, le `up -d postgres` a recréé `mimir-db-prod` (sortie Compose : « Container mimir-db-prod Recreate »). Ensuite `docker compose ls` a montré le project `mimir running(2)` avec les 2 config files listés.

**Pourquoi ça arrivait** : Le slug est partagé prod/dev (cohérent avec convention §4 « le slug est le pivot »), mais le runbook ne mentionnait pas la nécessité d'un `name:` distinct par environnement.

**Comment on l'a résolu** : Edit ajoutant `name: mimir-prod` au top-level de `/srv/prod/tools/mimir/docker-compose.prod.yml` + `name: mimir-dev` à `/srv/dev/tools/mimir/docker-compose.backend.yml`. Puis `docker compose -p mimir down` (force ancien project name pour cleanup) + `up -d` avec les nouveaux composes → 2 projects distincts cohabitent (`mimir-prod` running(2) + `mimir-dev` running(1)).

Edit préventif appliqué aussi à puyfoot43 prod/dev (même slug partagé) en étape 3.

**Règle dérivée** : Pour tout slug ayant un déploiement prod ET dev, **toujours** déclarer `name: <slug>-<env>` au top-level du compose. Sinon collision project name garantie (et tu ne le verras pas tant qu'un seul des 2 est actif). À ajouter à la convention §4 en checklist.

**Lien mémoire** : couvert dans `feedback_compose_volumes_orphelins.md` (à créer).

---

## Incident 11 — mimir-backend-dev jamais migré (dette Prisma latente)

**Étape concernée** : 4.6 — décision postgres-seul (Claude VM + Kieran)

**Ce qui s'est passé** : Avant Session A, seul `gestion-immo-db-dev` (postgres) tournait pour mimir-dev. Le service `gestion-immo-backend-dev` était défini dans le compose mais **pas démarré**. Quand on a basculé le compose sur le volume historique `gestion-immo-dev_postgres_data_dev`, lancer le backend pour la 1ère fois aurait pu déclencher des migrations Prisma sur un schéma DB plus ancien que ce que le code attend → potentiellement migrations destructives non validées.

**Comment on l'a détecté** : Audit pré-bascule des process tdufr / état containers, lecture de l'historique d'inventaire en début 4.6.

**Pourquoi c'est notable** : Le runbook 4.6 prescrivait un `docker compose up -d` complet (postgres + backend), ce qui aurait lancé les migrations sur volume historique sans audit préalable.

**Comment on l'a résolu** : Choix Kieran « GO postgres seul » : `docker compose -f docker-compose.backend.yml up -d postgres` (cible `postgres` explicite). Backend dev volontairement pas démarré. Validation rows 3/5/9/4 confirmée sur volume historique sans toucher au schéma.

**Règle dérivée** : Quand on rebranche un compose à un volume historique potentiellement plus ancien, **ne jamais lancer le backend en première intention**. Lancer seulement la DB, valider rows métier, AUDITER `prisma migrate status` (ou équivalent) sur le volume historique, et seulement ensuite décider si on lance le backend (avec ou sans migration).

**Lien mémoire** : à créer (`feedback_prisma_migrate_volume_historique.md`).

---

## Synthèse — méta-règles dérivées de la Session A

1. **Pas d'auto-fix** : à toute commande qui échoue ou check qui ne valide pas, STOP + alerte critical Teams + attente GO. Plus la production est sensible, plus cette règle est absolue.
2. **Toujours auditer avant agir** : grep -c, count rows, compose config, lsof, état containers. L'audit prend < 1 min, l'incident en coûte 10 à 30.
3. **Filets en triple** avant toute action irréversible : `cp .bak`, `tar tgz`, `pg_dumpall`. Le coût est < 1 min, la sécurité est inestimable.
4. **URL 200 ≠ fonctionnel** : valider via SELECT count(*) sur tables métier, pas via curl seul.
5. **Owner préservé au mv** : `mv` garde l'owner, c'est la sémantique correcte. Skip chown systématique.
6. **CRLF kill silently** : normaliser CRLF→LF avant tout sed avec ancres.
7. **Project name explicite** : `name:` au top-level pour tout compose (en particulier slugs partagés prod/dev).
8. **Volume nommé = orphelin au mv** : référencer en `external: true / name:` ou stabiliser le project name.
9. **DB jamais sed -i** : SQLite/Postgres = UPDATE SQL transactionnel. Binaires (venv) = recréer.
10. **Pas de cat .env** : printenv VAR ou redirection chmod 600. 4 fuites tracées en 4 jours, c'est trop.
11. **Variant compose explicite** : `-f docker-compose.<env>.yml` quand plusieurs variants existent.

---

**Version 1.0 — 2026-04-27** — Émis post-Session A. Mises à jour à chaque future session qui révèle de nouveaux pièges.
