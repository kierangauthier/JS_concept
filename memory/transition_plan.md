---
name: Plan de transition ConceptManager → Ostara
description: Phases M+1/M+2/M+3 du plan de vente et d'industrialisation — pour savoir où on en est et ce qui vient ensuite
type: project
---

# Phase 1 — M+0 à M+1 (maintenant → fin mai 2026)

**Objectifs commerciaux :**
- Finaliser ConceptManager pour JS (pas de refactor, bugs cosmétiques + données démo).
- Préparer pitch deck, script démo, contrat, CGV.
- Signer JS Concept → encaisser 1 750 € de cash à signature.
- Prendre RDV avec ASP.

**Objectifs techniques :**
- Rien de structurel sur ConceptManager.
- Rien sur Ostara.
- Valider Factur-X via mustangproject sur un PDF généré (2h de taf).

# Phase 2 — M+1 à M+2 (juin)

**Commercial :**
- JS Concept en production → 2e tranche 1 750 €.
- Signer ASP → 1 750 € cash.
- Démarrer prospection nouveaux clients via président + éventuellement premier indépendant.

**Technique :**
- Mettre les deux codebases sur Git remote (GitHub privé).
- Collègue rédige `ostara/docs/BRICK-CONTRACT.md` (format brique, conventions).
- Kieran + collègue : session d'alignement V1-V6.
- **Commencer la dissection ConceptManager en briques Ostara.** Prioriser : invoicing, clients, quotes, chantiers.

# Phase 3 — M+2 à M+3 (juillet)

**Commercial :**
- 1er client **non-BTP** signé via Ostara.
- Démonstrations en live : config Ostara en 2h → app livrée en 1 semaine.
- MRR cible : ~900 € (3-4 clients).
- Cash cumulé : ~15 K€.

**Technique :**
- Toutes les briques V1-V6 transférées.
- Ostara durci minimum : rate limiting, suppression double pipeline audit-fix, credentials app non hard-codés.

**Why:** Ce plan lie **chaque chantier technique à un livrable commercial**. Pas de code qui ne sert pas à signer un client.

**How to apply:** Avant toute nouvelle initiative technique, vérifier qu'elle sert une phase active. Sinon la reporter.

# Décisions tranchées (ne pas rouvrir)

- Multi-tenant pour ConceptManager, multi-app pour Ostara.
- Ostara reste outil interne.
- ConceptManager = source de dissection, pas cible de génération.
- Pas de remise "groupe" JS+ASP.
- Facturation 50/50.
