# CR / REX — Session A 2026-04-27

> **Public** : Kieran (humain) + Claude futur. Synthèse globale d'une session d'ops prod.

---

## En-tête

| | |
|---|---|
| **Date** | 2026-04-27 (lundi) |
| **Heure début** | ~10:47 (pré-vol) |
| **Heure fin** | ~16:35 (clôture validation finale) |
| **Durée totale** | ~5h45 (incluant audit incident volumes orphelins ~1h, plusieurs checkpoints longs) |
| **Périmètre** | VM AVD-01, application convention `/srv/` (Phase B finition + Phase 2 + Phase 3 + Phase 4 symlinks astreos + Étape 5 rename `/srv/acreed-dev`) |
| **Équipe** | Kieran Gauthier (humain, prise de décision + checkpoints), Claude VM (exécution sous runbook strict, alertes Teams) |
| **Source** | `~/runbook-session-a.md` v1.0, `~/convention-srv.md` v1.0, journal exhaustif `~/runbook-session-a-20260427.md` |

---

## Objectif initial

Appliquer la convention `/srv/` à la totalité de la VM en une session contigüe. À la fin :
- Tous les projets vivent sous `/srv/<env>/<sous-cat>/<slug>/` ou `/srv/<env>/astreos/`.
- Les 4 réseaux Docker `acreed-{prod,dev,tools,trash}` existent et chaque compose y est branché.
- Containers renommés selon convention (`<slug>-<service>`).
- Projets obsolètes archivés et supprimés.
- Phase 4 symlinks astreos en bonus de fin de session.
- `/srv/acreed-dev/` renommé en `/srv/claude/`.
- Aucun service prod cassé en sortie.

---

## Ce qui a été fait

| Étape | Description | Durée approx. | Résultat |
|---|---|---|---|
| Pré-vol | Vérifications obligatoires (sudo, Docker, nginx, archives, journal, snapshots) + checkpoint 2e SSH | ~10 min | ✅ |
| Étape 1 | Cleanup obsolètes : js-concept, claude-ops-home, thor, Suivi_consultant_V2, camif-front, 2 réseaux orphelins | ~30 min | ✅ avec 3 micro-incidents (sed runbook 1.4, container standalone 1.5, checkpoint réseau 1.6) |
| Étape 2 | Création des 4 réseaux Docker `acreed-{prod,dev,tools,trash}` | ~5 min | ✅ |
| Étape 3 | Réorganisation 8 projets dans `/srv/` (outline, freyr, verif-paie-web, horizon, site-final-acreed, puyfoot-dev→puyfoot43, convertisseur-dt, fastapi-pdf-tool) | ~90 min (vs 60 min planifiés) | ✅ avec incidents pattern `cat >>`, mauvais variant horizon, DB SQLite + fuite secret convertisseur-dt |
| Étape 4 | Migration 6 projets hors `/srv/` (astreos, n8n, mimir, puyfoot43 prod, mimir-dev, ostara) + Phase 4 symlinks astreos | ~150 min (vs 90 min planifiés) | ✅ avec incident majeur volumes orphelins (~1h de récupération inclus) |
| Étape 5 | Rename `/srv/acreed-dev` → `/srv/claude` | ~3 min | ✅ |
| Étape 6 | Validation finale : arborescence, 11 URLs, 4 réseaux, UFW, conformité §12 | ~10 min | ✅ |

---

## Métriques avant / après

| Métrique | Avant Session A | Après Session A | Δ |
|---|---|---|---|
| Projets sous `/srv/` | 8 | 14 | +6 (migrés depuis hors `/srv/`) |
| Projets runtime hors `/srv/` | 6 (astreos, n8n, mimir, puyfoot43 prod, mimir-dev, ostara) | 0 | -6 |
| Containers Docker total | 41 | 34 | -7 (camif-front + frontend D2 retiré + js-concept + 4 renommés/recréés mimir) |
| Réseaux Docker total | 18 | 18 (mais composition différente) | 4 ajoutés acreed-*, 4 supprimés (anciens / orphelins) |
| 4 réseaux acreed-* | 0 | 4 | +4 |
| Symlinks `/etc/*` astreos → `deploy/` | 0 | 5 | +5 (Phase 4) |
| URL publiques 200 | 11/11 | 11/11 | conservé |
| Disque utilisé / | 76 G (8%) | 78 G (8%) | +2 G (archives Session A) |
| Disque libéré (runtime supprimé) | n/a | ~898 M (thor 681 + js-concept 174 + claude-ops-home 43) | |
| Archives Session A | 0 | ~200 M dans `~/trash-archives/20260427/` | filets de sécurité |
| Volumes Docker historiques rebranchés | 0 | 2 (mimir prod + mimir dev via `external: true / name:`) | rescue post-incident |
| URL avec downtime > 30s pendant session | 0 | 1 (mimir prod ~30 min DB-vide silencieux + ~3 min 502 réel) | impact mesuré |
| Écritures utilisateurs perdues | n/a | **0** (vérifié via grep POST/PUT/PATCH/DELETE sur logs backend pendant fenêtre) | aucune perte |

---

## Incidents traversés

11 incidents tracés. Détail dans `lessons-learned-session-a.md`. Tableau récap :

| # | Étape | Titre court | Sévérité | Résolution |
|---|---|---|---|---|
| 1 | 1.4 | Sed runbook trop strict (crontab Suivi_consultant_V2) | Faible | Pattern sed étendu après GO |
| 2 | 1.5 | Container standalone hors compose (camif-front) | Faible | docker stop direct |
| 3 | 3.2 et + | Template `cat >>` casse composes avec networks: existant | Moyen (récurrent) | Option A édition fine |
| 4 | 3.4 | Mauvais variant compose (horizon) | Moyen | `-f docker-compose.prod.yml` |
| 5 | 3.7 | DB SQLite paths absolus + fuite secrets `.env` | **Élevé** (sécurité) | UPDATE SQL + rotation secrets requise |
| 6 | 4.x | Chown destructif dans le runbook | Moyen | Skip chown systématique |
| 7 | 4.4 | CRLF dans compose (mimir) | Faible | dos2unix avant sed |
| 8 | 4.4 | Service legacy frontend D2 mimir | Faible | Edit retrait via sed range |
| 9 | 4.4 + 4.6 | **Volumes Docker orphelins** (mimir prod + dev) | **Critique** | Bascule `external: true / name:` post-audit |
| 10 | 4.6 | Collision project name Compose (slugs prod/dev partagés) | **Critique** | `name:` explicite top-level |
| 11 | 4.6 | mimir-backend-dev jamais migré (dette Prisma latente) | Moyen | Postgres seul, backend différé session dédiée |

---

## Décisions structurantes

Arbitrages pris en cours de session, validés par Kieran à chaque GO :

| Décision | Raison |
|---|---|
| **Option A édition fine** (au lieu du `cat >>` runbook) pour les composes ayant un bloc `networks:` existant | Le `cat >>` produirait YAML avec 2 clés top-level (invalide) ET acreed-* ne serait pas joint. Convention §9 préserve l'isolation interne en gardant le réseau interne nommé pour la DB tout en exposant le frontend/backend dans acreed-*. |
| **Skip chown** systématique au mv (vs. `chown kierangauthier:kierangauthier` du runbook) | Préserver l'owner historique évite de casser les services tournant sous tdufr / azureuser. Le mv préserve l'owner par défaut, c'est la sémantique correcte. |
| **`name:` explicite** dans tous les composes ayant un slug partagé prod/dev (mimir, puyfoot43) | Sans `name:`, le project name est dérivé du basename → collision pour les slugs partagés → écrasement mutuel des volumes. Ajout préventif `name: <slug>-prod` / `name: <slug>-dev`. |
| **Postgres seul** pour mimir-dev (pas de up backend) | Le backend dev n'avait jamais migré le schéma de la DB historique. Lancer le backend = risque migration destructive non auditée. Postgres seul = restauration des données validée sans risque. |
| **Ostara non scindé** (monorepo conservé) | Les 7 apps partagent les `node_modules`/`engine`/`templates` du parent. Scinder casserait l'architecture. À reconsidérer M+3+ quand client Ostara payant arrive (`/srv/prod/ostara-clients/` distinct). |
| **`-f docker-compose.prod.yml` pour horizon** | Le default `docker-compose.yml` est un mode standalone Caddy 80/443 incompatible avec nginx host. `prod.yml` bind 127.0.0.1:8100/8101 derrière nginx. |
| **Frontend mimir D2 retiré** profitant du downtime de migration | Service legacy clone du frontend mimir, sans trafic depuis 2 mois, port 0.0.0.0:8084 inutile. Retrait via Edit Claude après GO Kieran (CRLF normalisation préalable). |
| **`UPDATE SQL` pour convertisseur-dt** (vs. sed -i sur DB) | sed -i sur SQLite = corruption garantie (incident 2026-04-24 documenté en mémoire). UPDATE transactionnel sur 11 rows `cv_history.file_path` = sécurisé. |
| **Bascule mimir prod/dev sur volumes historiques** via compose `external: true / name:` | Découverte d'un bug Compose/runbook pendant 4.6 : volumes orphelins. Procédure complète : audit READ-ONLY, filets triples (compose .bak + tgz + pg_dumpall), edit ciblé, validation rows métier. |

---

## Ce qui a marché

5 pratiques qui ont sauvé la session :

1. **Filets de sécurité en triple** avant toute action irréversible : `cp .bak` du compose + `tar tgz` du volume en read-only via container alpine + `pg_dumpall` via container postgis temporaire (chmod 600). Aucune perte de donnée possible — tous les filets sont restés en place pour rollback.

2. **Audit READ-ONLY systématique avant action**. À chaque étape, lecture exhaustive de l'état avant tout `mv`/`up`/`sed` : `docker compose ls`, `docker volume inspect`, `grep -c`, `lsof`, `docker inspect --format`. Plusieurs incidents (3, 7, 9, 11) auraient été indétectables sans ce reflexe systématique.

3. **STOP + alerte critical Teams + attente GO** au moindre doute. 11 incidents = 11 STOP avant action destructive. Aucun auto-fix tenté. Cette discipline a coûté ~30 min cumulés mais a évité des dégâts probablement irréversibles (notamment incident 9 où agir aurait pu écraser les données mimir prod).

4. **Validation rows métier** comme critère ultime, jamais URL 200 seule. L'incident 9 a montré qu'une URL 200 + « Connexion PostgreSQL établie » dans les logs peut masquer une DB schéma-only sans données. Le `SELECT COUNT(*) FROM <table>` avec valeur attendue exacte est la seule preuve fonctionnelle valide.

5. **Mémoires feedback live** : la mémoire `feedback_secret_output_hygiene.md` (créée le 2026-04-24 après 3 fuites) a été incrémentée pendant la session après la 4e fuite (incident 5). Idem `feedback_migration_paths.md` qui a guidé la décision UPDATE SQL en 3.7. La mémoire ne sert que si elle est vivante.

---

## Ce qu'il faudra ajuster pour les prochaines sessions

9 corrections à apporter au runbook v2 :

| # | Ajustement | Étape concernée |
|---|---|---|
| 1 | Élargir le pattern sed crontab Suivi_consultant_V2 (`.*` entre les 2 ancres au lieu de slash strict) | 1.4 |
| 2 | Prévoir le cas container standalone (hors compose) avec docker stop/rm direct | 1.5 |
| 3 | Préciser `-f docker-compose.<env>.yml` pour les projets multi-variants (horizon, mimir, mimir-dev) | 3.4, 4.4, 4.6 |
| 4 | **Option A** (édition fine) pour les composes ayant déjà un bloc `networks:` existant — remplacer le `cat >>` du template | 3.x, 4.x |
| 5 | UPDATE SQL pour DB avec paths absolus stockés en colonne TEXT (audit `sqlite3 .dump | grep -c <ancien_path>` obligatoire avant mv) | 3.7 |
| 6 | Retirer le `chown -R kierangauthier:kierangauthier` (préserver l'owner historique du mv) | 4.x systématique |
| 7 | Normalisation CRLF → LF avant tout sed avec ancres `^...$` | 4.4 |
| 8 | Ajouter `name: <slug>-<env>` au top-level des composes ayant un slug partagé prod/dev | 4.x |
| 9 | Audit volume Docker nommé orphelin avant tout mv (basename change → préfixe project change → volume non rattaché) | 4.x |

10ème ajustement implicite : durcir la règle "pas de cat .env" dans le runbook lui-même (déjà dans mémoire feedback, mais à rappeler explicitement aux étapes diagnostic).

---

## Dettes restantes

Référence vers les mémoires Claude (`/home/kierangauthier/.claude/projects/.../memory/`).

**Sécurité — urgent** :
- 🔥 Rotation `GEMINI_API_KEY` (Google AI Studio) + `JWT_SECRET` convertisseur-dt (4e fuite Claude le 2026-04-27 lors du diagnostic 3.7)

**Court terme (24-48h)** :
- Cleanup 4 volumes vides Docker (`mimir_postgres_data_prod`, `mimir_postgres_data_dev`, `mimir-prod_postgres_data_prod`, `mimir-dev_postgres_data_dev`) — environ 432 MB après confirmation que les volumes historiques sont stables
- DNS OVH : dégager `thor.acreediasolutions.com` + `poc.js.acreediasolutions.com`
- Audit pipeline acreed-ia / CI GitLab (D2 — vérifier qu'aucun script ne push vers le frontend mimir retiré)

**Moyen terme (semaine)** :
- Procédure dédiée mimir-backend-dev (audit `prisma migrate status` sur le volume historique avant tout up backend)
- Astreos Supabase : ajouter `name: supabase` au compose Supabase (session 30 min dédiée tdufr — risque latent : tout futur compose down/up Supabase orphelinerait les volumes 1.2 GB)
- Patch runbook v2 (~9 corrections listées ci-dessus)

**Hors scope Session A — sessions futures** :
- Phase 0.3 Voie B Supabase (rotation `service_role_key` historique compromis)
- Phase 5 observabilité (runbook v2 dédié)
- Phase 6 backup externe
- Phase 7 finalisation `/srv/claude/` (skills, runbooks, scripts complets)
- Dette UFW D11 (rebinder ports `0.0.0.0:*` → `127.0.0.1:*` pour les projets ayant la dette : freyr 8070-8071, verif-paie 8091-8093, site-final 3001/8888, ostara 4100-4107, puyfoot43 prod 8050-8051)
- Dette nommage : containers `pf43_*`/`verif-paie-*` ne respectent pas strictement convention §4 (préfixe slug). À harmoniser à l'occasion d'un futur déploiement.

---

## REX méta

3-5 phrases sur ce que cette session nous apprend sur la méthode :

1. **Le runbook + checkpoints + STOP discipliné a fonctionné**. Sur 11 incidents traversés (dont 2 critiques), aucun n'a causé de perte de donnée ni de régression durable. La discipline « pas d'auto-fix, on STOP et on demande » a coûté ~30 min cumulés mais a évité des dégâts probablement non récupérables (notamment incident 9 où un mauvais geste sur les volumes orphelins aurait pu écraser des mois de données mimir).

2. **La mémoire feedback est vivante quand elle est consultée et mise à jour pendant la session**. `feedback_migration_paths.md` (créé 2026-04-24) a guidé la décision UPDATE SQL en 3.7. `feedback_secret_output_hygiene.md` a été incrémenté en cours de session après la 4e fuite. Une mémoire qui ne sert pas est une mémoire morte ; ici elles ont prouvé leur utilité opérationnelle.

3. **Les bugs runbook sont la norme, pas l'exception**, dès que la réalité diverge de l'état supposé au moment où le runbook a été écrit. 9 corrections post-session sur ~30 sous-étapes = ~30% des étapes ont divergé. Conséquence pratique : un runbook ne dispense **jamais** de l'audit READ-ONLY pré-action. Un runbook + un audit valide > un runbook seul, même soigné.

4. **La validation par compteur (rows métier) est la seule preuve fonctionnelle valide pour une migration de données**. URL 200, "Connection established" dans les logs, healthcheck OK ne suffisent pas. L'incident 9 montre une DB vide schéma-only qui passe tous ces tests. Le `SELECT COUNT(*) FROM <table_métier>` avec valeur attendue exacte (4/1/9/4 pour mimir prod, 3/5/9/4 pour mimir dev) a été le filet ultime.

5. **Le step-by-step strict (1 étape, 1 GO Kieran, 1 validation, 1 étape suivante) est cher en temps mais nécessaire en prod**. La Session A a duré ~5h45 contre ~3-4h estimées. La différence n'est pas de la lenteur, c'est le coût de la sécurité. Sur une session purement automatisée, on aurait gagné 2h mais on aurait probablement perdu les données mimir prod et fui plus de secrets. À garder comme métrique : **vitesse < sécurité, en prod toujours**.

---

**Version 1.0 — 2026-04-27** — Émis post-clôture Session A. À relire avant Session B (Voie B Supabase) pour s'assurer que les corrections runbook v2 ont bien été appliquées.
