---
name: Infrastructure serveur Acreed
description: État de la VM actuelle, partenaire hébergement, points d'attention avant signature client — à référencer pour toute question d'infra, scale, déploiement
type: project
---

# Partenaire hébergement

- **Intermédiaire** : BNC Informatique (https://www.bnc-informatique.fr). Sur vérification, le **provider sous-jacent est Microsoft Azure** (pas OVH). VM Standard D8s v4, région **France Central (Paris)**, 8 vCPU / 32 Go RAM / 1 To Standard SSD.
- **Contact** : à récupérer (Kieran a leur email).
- **Ce qu'on NE sait PAS encore** (à demander explicitement) :
  - Datacenter physique exact (Roubaix / Gravelines / Strasbourg ?).
  - SLA de disponibilité.
  - Fréquence des snapshots/backups, localisation des backups.
  - DPA RGPD disponible pour nos clients finaux.
  - Conditions d'ajout d'une VM supplémentaire.

**Why:** Connaître ces réponses est **prérequis légal** pour vendre à des clients pros (RGPD, SLA à répercuter dans nos propres CGV). Sans ces infos, on ne peut pas répondre à une question client du type "où sont mes données ?".

**How to apply:** Avant de signer JS Concept, Kieran doit avoir envoyé et reçu les réponses aux 8 questions listées dans son email à BNC (voir historique conversation 2026-04-22).

# État de la VM actuelle (avant migration)

Relevé le 2026-04-22 :

- **Specs** : 4 vCPU / 15.5 Gi RAM / 124 Go disque root.
- **OS** : Ubuntu 22.04.5 LTS (Jammy).
- **Uptime** : 84 jours.
- **Saturation** : **critique**.
  - Mémoire : 10 Gi utilisés + **6.2 Gi de swap actif sur 8 Gi** → swap permanent, perfs dégradées.
  - Disque : 98 Go / 124 Go = 79 %. Saturation projetée sous 2-3 semaines si rien n'est fait.
  - Load avg 1.10 sur 4 cœurs — acceptable mais rapidement tangent si un projet se réveille.
- **47 containers actifs** dont :
  - **Infra business utile** : `js_concept_final-*` (ConceptManager, 4 containers, 3 semaines d'uptime).
  - **Outil interne** : Ostara (pas dans Docker, tourne directement avec PM2 + nginx côté VM).
  - **Projets clients / perso à trier** : horizon, freyr, pf43 (puyfoot), verif-paie, gestion-immo, site-final-acreed, js-concept (ancien).
  - **Outils personnels** : Supabase complet (11 containers), Outline, Authentik, n8n, Mailpit.

**Problème majeur** : **la VM partage les projets Acreed business, les projets clients externes (non Acreed ?), et les outils personnels**. C'est un risque sécurité, perfs et juridique.

# Nouvelle VM planifiée

- **Specs** : 8 vCPU / 32 Gi RAM (spécifiques disque à confirmer).
- **Livraison** : sous 24 h après cette discussion.
- **Hébergeur** : toujours via BNC (pas de changement de partenaire).
- **Stratégie** : Kieran préfère **rester sur une seule VM** tant que rien n'est signé. Migration multi-VM envisagée après 5 clients signés.

**Why:** Bonne décision économique tant que le CA n'est pas là. Multi-VM coûte ~50-150 €/mois supplémentaires qui ne sont pas justifiés avant un vrai MRR.

# Reverse-proxy — décision 23/04/2026

**nginx conservé** (déjà installé en système sur la VM, PID 1614, écoutant 80/443).
Pas de migration vers Traefik : l'existant fonctionne, le volume de clients
prévu (10-30 en 2 ans) ne justifie pas la complexité d'un changement.

Certificats TLS via **certbot** (Let's Encrypt).

Pour le workflow Ostara "promote to prod" : script shell de 50 lignes qui
génère un fichier `/etc/nginx/sites-available/[client].conf` depuis un
template, active, émet le cert, reload nginx. À développer dans Ostara quand
les 3 premiers clients seront signés.

# Règle prod stricte — validée 23/04/2026

1. Aucune modification directe sur un container prod. Toute modif passe par
   dev → validation → redéploiement prod.
2. BDD prod en lecture seule pour les devs au quotidien. Pas de psql direct
   en écriture.
3. Images Docker prod = toujours issues d'un build identifié (tag Git, commit
   hash).
4. Toute modif prod laisse une trace dans Git (commit + tag).
5. Incident urgent : documenter dans un journal d'incident après coup.

Ces règles s'appliquent **uniquement** au réseau `acreed-prod`.

# Architecture cible — mono-VM propre

Même sur une seule VM, **isolation par réseau Docker obligatoire** :

```
Réseau Docker "acreed-prod"
  → ConceptManager JS (client payant)
  → ConceptManager ASP (client payant à venir)
  → Apps clients générées par Ostara (clients N+2, N+3...)
  → Backup quotidien chiffré obligatoire
  → Monitoring obligatoire

Réseau Docker "acreed-lab"
  → Ostara dashboard + engine (outil interne)
  → Site vitrine acreedconsulting.com
  → Expérimentations
  → Backup hebdomadaire

Réseau Docker "perso" (optionnel, à déplacer si possible)
  → n8n, Outline, Authentik, Supabase, Mailpit
  → Pas de backup, pas de garantie
  → À dégager à terme
```

**Règle stricte** : les containers d'un réseau ne voient pas ceux des autres. Aucune exception.

# Backups — status alarmant

**À date : pas de backup sérieux en place.**

- Les containers Docker n'ont pas de backup automatique vers un stockage externe.
- Les snapshots BNC sont inconnus (à vérifier).
- Si la VM crame ce soir : **perte totale probable** de ConceptManager, Ostara, et tous les projets clients externes.

**Action obligatoire avant de signer JS** :
1. Script `pg_dump` quotidien de chaque base Postgres, chiffré via gpg.
2. Upload vers un bucket Object Storage **externe à la VM et au datacenter BNC** (Scaleway Object Storage Paris par exemple, ~5 €/mois pour 100 Go).
3. Réplication MinIO vers un second bucket distant.
4. Test de restauration trimestriel consigné.

# Monitoring minimal à mettre en place

1. **Uptime Robot** (gratuit jusqu'à 50 monitors) pour alerter si un service ne répond plus.
2. **Netdata** sur la VM pour voir CPU/RAM/disque/IO en temps réel.
3. **Alertes Teams** via webhooks Power Automate (déjà opérationnels depuis 2026-04-23) :
   - Équipe Teams : **"Dev IA Solutions"**
   - 3 canaux : `acreed-alerts-critical` / `acreed-alerts-warning` / `acreed-alerts-info`
   - URL webhook stockées dans `~/.secrets/teams-webhooks.env` sur AVD-01 (chmod 600)
   - Helper `~/bin/teams-alert <info|warning|critical> "msg"` posté en Adaptive Card avec couleur + icône + timestamp + hostname
   - Délai de propagation : 30 s à 5 min (limitation plan gratuit Power Automate)
   - Règles d'alerte :
     - CPU > 90 % pendant 5 minutes → warning
     - RAM > 90 % pendant 5 minutes → warning
     - Disque > 85 % → warning ; > 95 % → critical
     - Container crashé plus de 2 fois en 1 heure → critical
     - Backup quotidien OK → info

# Infrastructure réseau et IP

- **IP publique VM** : `4.178.179.147`
- Tous les enregistrements DNS A `*.acreediasolutions.com` et `*.acreedconsulting.com` pointent sur cette IP.
- 5 sous-domaines `acreediasolutions.com` DNS créés le 2026-04-23 en préparation de la migration (`dt`, `horizon`, `ostara`, `n8n`, `outil.rh`).

# Plan de migration (à exécuter dès livraison nouvelle VM)

### Jour 1 — Setup à blanc
- Installer Docker, Docker Compose, nginx, certbot, UFW, fail2ban.
- Configurer les 3 réseaux Docker.
- Snapshot de l'ancienne VM AVANT toute manipulation.

### Jour 2 — Migration business
- Migrer `js_concept_final-*` (ConceptManager) en priorité.
- Tester intégralement (login, devis, facture, Factur-X).
- Migrer Ostara.

### Jour 3 — Tri et bascule DNS
- Migrer ce qui a de la valeur, stopper les zombies.
- Basculer les DNS progressivement.
- Garder l'ancienne VM 7 jours comme filet.

### Jour 4-5 — Backups + monitoring
- Script backup automatique vers Object Storage externe.
- Monitoring Netdata + Uptime Robot.
- Test de restauration sur un backup frais.

# Décisions tranchées

- ✅ Une seule VM en Phase 1 (mono-tenant logique, multi-projets via réseaux Docker).
- ✅ Garder BNC comme partenaire hébergement pour l'instant.
- ✅ Isolation stricte prod/lab/perso par réseaux Docker.
- ✅ Backups hors VM dès cette semaine.
- ✅ Monitoring minimal dès la nouvelle VM.

# Décisions à prendre après réponses BNC

- Continuer avec leurs backups managed ou tout gérer en propre ?
- Commander une 2e VM dédiée "clients payants" après signatures JS + ASP, ou tout garder sur une seule ?
- Demander attestation RGPD / DPA à BNC pour la réutiliser dans nos DPA clients ?

# Budget infra — repères

| Phase | Clients | Coût VM | Backup externe | Monitoring | Total mensuel |
|---|---|---|---|---|---|
| Phase 1 (actuelle) | 0-3 | ~50-80 € (VM 32 Go chez BNC) | 5 € | 0 € (gratuit) | ~55-85 € |
| Phase 2 | 5-15 | ~100-150 € (+VM 2e) | 10 € | 0 € | ~110-160 € |
| Phase 3 | 20+ | migration cloud managed | 30 € | 30 € | ~200-500 € |

**Marge infra vs revenus : ≥ 80 % dans toutes les phases.** L'infra n'est jamais le frein.
