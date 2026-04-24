# Mémoire stratégique — Acreed Consulting

> Document de référence partagée entre les co-fondateurs et les futures sessions de travail (humaines ou IA).
> Dernière mise à jour : 2026-04-22.

## 1. Contexte humain

### L'équipe
- **Kieran** (toi) : dev, en charge de ConceptManager. 8-10 mois de runway chômage.
- **Collègue dev** : en charge d'Ostara (app-builder). Même situation chômage.
- **Président** : en charge commercial. A une holding avec une activité SSII télécom en parallèle (donc pas 100% Acreed).
- Projet de recruter des commerciaux indépendants payés au variable (non activé).

### L'intuition fondatrice
> "Proposer de l'IA aux TPE/PME. Constat : pas de données chez eux → pas d'IA utile.
> Donc il faut d'abord outiller, capturer la donnée, puis livrer l'IA en surcouche.
> Pour être rentable, les outils doivent être modulaires (briques réutilisables d'un client à l'autre)."

Cette intuition est **juste**. Elle mène au modèle "éditeur d'ERP modulaire pour TPE/PME avec IA native" — légitime, bien positionné face à un marché sous-servi.

## 2. Les deux outils qui existent

### ConceptManager
- **Quoi** : un ERP BTP/signalisation complet, multi-tenant, construit à la main.
- **Origine** : le premier outil métier abouti. Utilisé pour valider le concept auprès de JS Concept et ASP Signalisation (2 prospects chauds, démo faite il y a ~1 mois, pas encore d'utilisation réelle).
- **État technique** (après V1-V6 avec Claude) : solide. Sécurité durcie, Factur-X hybride, RGPD compliant, 74 tests verts, 0 erreur TS.
- **Stack** : NestJS + Prisma + PostgreSQL + React/Vite + Tailwind + shadcn.
- **Localisation** : `E:/Claude/ConceptManager/JS_Concept_final` (machine locale Kieran).
- **Rôle futur** : sera **disséqué en briques** pour alimenter Ostara.

### Ostara (app-builder)
- **Quoi** : un générateur d'applications. Dashboard admin + engine de composition + registry de briques.
- **Origine** : construit par le collègue dev sur un seul week-end (avril 2026).
- **État technique** : fonctionnel, 22 briques basiques dans le registry, 7 apps déjà déployées en test. Typecheck et build fragiles. Pas de doc du contrat de brique. 213 commits mais **sur la VM uniquement, pas de remote Git**.
- **Stack** : React + Vite + Express + Prisma + PostgreSQL. SDK Anthropic + Gemini pour les features d'audit/fix.
- **Localisation** : VM, `/home/kierangauthier/claude-secure/app-builder/`.
- **Rôle** : **outil interne** pour fabriquer les apps des clients. Pas vendu au public (pour l'instant).
- **URL déploiement** : `ostara.acreedconsulting.com`.

### Les 22 briques actuelles d'Ostara
core, absences, artisans, calendar, chantiers, clients, consultants, data-import, dossier-technique, hr-documents, invoicing, jobs, leads, product-catalog, prospects, purchase-orders, quotes, reports, team-planning, ticketing, time-entries, workshop.

Elles sont **basiques** : tirées de modules existants plus simples, **pas** du code durci de ConceptManager V1-V6.

## 3. Le positionnement commercial

### Ce qu'on vend
Un ERP modulaire pour TPE/PME, assemblé sur-mesure via Ostara (côté éditeur), livré sous un nom et une peinture spécifiques par client (côté utilisateur).

**On NE vend PAS Ostara.** Ostara est l'outil de fabrication, pas le produit.

### Cible
TPE/PME tous secteurs, 5-50 salariés, **grandes oubliées** du marché ERP (trop grosses pour Henrri/Tiime, trop petites pour Sage/Cegid, mal servies par les horizontaux type Pennylane).

### Différenciateurs
1. **Sur-mesure rapide** : config en 2h, livraison en 1-2 semaines au lieu de 6 mois.
2. **IA native** intégrée dans les workflows (pas un chatbot à part).
3. **Prix raisonnable** vs ERP établis (149-599 €/mois).
4. **Factur-X prêt pour 2026** (pour ConceptManager ; à propager dans Ostara).

### Pricing cible (non verrouillé, à tester)

| Offre | Setup | Mensuel | Engagement |
|---|---|---|---|
| Essentiel (1ers clients) | 3 500 € | 249 € | 12 mois |
| Essentiel (après 5 refs) | 4 500 € | 299 € | 12 mois |
| Pro | ~6 000 € | ~399 € | 12 mois |
| Sur-mesure | 15-25 K€ | 899-1500 € | 12-24 mois |

**Facturation** : 50/50 (signature / mise en production).

### Ce qu'est dans "Essentiel" (pour l'instant)
- Clients, Devis, Factures, Factur-X, FEC
- Chantiers, Catalogue, Saisie heures
- Dashboard de base
- Multi-tenant sécurisé, backup, support email
- **Sans IA**, **sans planning avancé**, **sans terrain mobile**, **sans RH complet** — ce sont les leviers d'upsell vers Pro.

## 4. Les 2 premiers deals cibles

### JS Concept
- Dirigeant **différent** de ASP, équipes séparées.
- **Démo faite il y a ~1 mois**, prospect chaud. N'utilise pas ConceptManager au quotidien.
- **Livraison envisagée** : le ConceptManager local (V1-V6) tel quel.
- **Pricing visé** : 3 500 € setup + 249 €/mois, engagement 12 mois.
- **Cash à signature** : 1 750 €.

### ASP Signalisation
- Dirigeant **différent** de JS, équipes séparées.
- Même pitch commercial.
- **Pricing** : identique à JS.
- **Objectif** : signer dans les 30 jours après JS.

### Pas de remise "groupe"
Les deux dirigeants ne se coordonnent pas → deux deals indépendants, plein tarif.

## 5. Le plan de transition ConceptManager → Ostara

### Phase 1 — M+0 à M+1 (maintenant → fin mai)
**Objectifs** :
- Finaliser ConceptManager pour JS (bugs cosmétiques, données de démo propres, pitch deck).
- Signer JS Concept. Encaisser 1 750 € de cash.
- Démarrer RDV avec ASP.

**Ce qu'on NE fait PAS** : toucher à Ostara, extraire des briques, refactorer.

### Phase 2 — M+1 à M+2 (juin)
**Objectifs** :
- Mettre ConceptManager en production chez JS (= 2e tranche 1 750 €).
- Signer ASP (1 750 € cash).
- **Commencer la dissection de ConceptManager en briques** pour Ostara.
- Documenter le contrat de brique (fait par le collègue).
- Aligner les deux devs sur V1-V6 (ce que Kieran fait avec Claude actuel).

### Phase 3 — M+2 à M+3 (juillet)
**Objectifs** :
- **Premier client** livré via Ostara (config 2h, déploiement 1 semaine). Secteur différent de BTP signalisation si possible.
- MRR cible : ~900 €.
- Cash cumulé : ~15 K€ (3 setups à 3500 € + 1ers mensuels).

## 6. Risques identifiés (ordre de gravité)

1. **Pas de Git remote** sur Ostara → risque de perte totale si la VM crame. **À régler cette semaine.**
2. **Pas de documentation du contrat de brique** → Ostara n'est maintenable que par son auteur. **À faire cette semaine.**
3. **Divergence ConceptManager V6 / Ostara briques** → le code durci ne sera pas automatiquement dans Ostara. Nécessite un plan d'extraction réfléchi.
4. **Pas d'objectif M+3 chiffré** → risque de dérive, consommation de runway sans signature.
5. **Président mi-temps** (holding SSII en parallèle) → le commercial va avancer moins vite que si full-time.
6. **Commerciaux indépendants au variable** : rarement efficace en early stage. À ne pas activer avant d'avoir 5 clients et un pitch rodé.
7. **Ostara lui-même** : typecheck cassé (rootDir), pas de rate limiting, credentials app hard-codés, double pipeline audit-fix à nettoyer. Dette technique à reprendre avant tout usage externe.

## 7. Les actions de cette semaine (non négociables)

### Lundi
- [ ] Créer repos Git privés : `acreed/ostara` et `acreed/conceptmanager`.
- [ ] Pousser les deux codebases sur les remotes.
- [ ] Accès croisé Kieran ↔ collègue sur les deux repos.

### Mardi
- [ ] **Collègue** : rédige `ostara/docs/BRICK-CONTRACT.md` (structure brique, format brick.json, conventions engine, exemple commenté).

### Mercredi
- [ ] **Kieran ↔ collègue** : session 3h pour présenter V1-V6 de ConceptManager. Partager le rapport d'audit initial et les livrables par vague.

### Jeudi
- [ ] **Kieran + collègue + président** : réunion 2h pour fixer les objectifs M+1, M+2, M+3 (chiffrés, datés).

### Vendredi
- [ ] Kieran : préparation pitch deck + script démo + contrat type + CGV pour JS (cf. bloc pricing ci-dessus).
- [ ] Collègue : commence à réfléchir au plan d'extraction des briques V6 (ne code rien encore).
- [ ] Président : planifie le RDV de signature JS semaine suivante.

## 8. Décisions tranchées (ne pas rouvrir)

- ✅ **Multi-tenant pour ConceptManager** (V1-V6 est multi-tenant).
- ✅ **Multi-app pour Ostara** (chaque client a son app générée).
- ✅ **Ostara reste outil interne** (pas de vente directe pour l'instant).
- ✅ **ConceptManager = source de dissection**, pas cible de génération.
- ✅ **Pas de remise groupe JS + ASP** (dirigeants différents).
- ✅ **Pricing** : 3 500 € + 249 € pour les 2 premiers clients.
- ✅ **Facturation 50/50** (signature / mise en prod).

## 9. Questions encore ouvertes

- Comment Ostara va-t-il intégrer les briques V1-V6 (Factur-X, HMAC, RGPD) **sans tout recoder** ? Plan d'extraction à définir en Phase 2.
- Les 22 briques Ostara actuelles, on les **garde et on les durcit**, ou on les **remplace** par des extractions de ConceptManager ? Décision à prendre après alignement Kieran/collègue.
- Est-ce qu'on expose Ostara en SaaS à des intégrateurs dans un 2e temps (modèle B discuté) ? **Décision reportée à M+6**, pas avant.
- Multi-tenant vs single-tenant pour les apps Ostara générées : techniquement Ostara génère du mono-tenant par défaut. Faut-il le garder ou introduire du multi-tenant dans les briques ? **Décision reportée** à après les 3 premiers clients.

## 10. Ressources et liens

- ConceptManager local : `E:/Claude/ConceptManager/JS_Concept_final`
- Ostara VM : `/home/kierangauthier/claude-secure/app-builder/dashboard`
- Domaine Ostara : `ostara.acreedconsulting.com`
- Docs Factur-X : `docs/legal/FACTUR-X-roadmap.md`
- Docs RGPD : `docs/legal/registre-traitements.md`, `docs/legal/DPO-checklist.md`
- Runbook ops : `docs/runbooks/backup-and-drp.md`
- Guide Factur-X utilisateur : `docs/user/transmettre-factur-x.md`

---

**Ce document est vivant. À mettre à jour à chaque décision stratégique importante.**
