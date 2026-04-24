---
name: ConceptManager vs Ostara
description: Les deux outils qui existent dans l'écosystème Acreed — à lire en premier avant toute reco technique pour ne pas les confondre
type: project
---

# Deux outils, rôles opposés

## ConceptManager (local, sur le poste de Kieran)

- Localisation : `E:/Claude/ConceptManager/JS_Concept_final`
- Stack : NestJS + Prisma + PostgreSQL (API) + React/Vite + Tailwind + shadcn (front).
- Construit à la main, pas par Ostara.
- A subi 6 vagues de durcissement (V1-V6 avec Claude) : sécurité, Factur-X hybride EN 16931, RGPD, CSP, audit WORM, HMAC intégrité factures, tests 74/74, typecheck 0.
- Cible immédiate : **livré tel quel à JS Concept et ASP Signalisation** (deux prospects chauds, démo faite ~1 mois, pas encore utilisé).
- Rôle futur : **source à disséquer** pour en extraire des briques Ostara.

## Ostara (sur la VM, construit par le collègue)

- Localisation VM : `/home/kierangauthier/claude-secure/app-builder/dashboard`
- URL : `ostara.acreedconsulting.com`
- Stack : React/Vite + Express + Prisma + PostgreSQL + SDK Anthropic/Gemini.
- C'est un **générateur d'apps** : dashboard admin + engine de composition + registry de 22 briques + live deploy PM2/nginx.
- 213 commits, mais **sur la VM uniquement** (pas de remote Git à date).
- Les 22 briques sont **basiques** (tirées de modules plus simples), pas équivalentes à ConceptManager.
- Rôle : **outil interne**, pas vendu aux clients finaux.

**Why:** Le raisonnement : ConceptManager a été construit d'abord (vrai besoin JS/ASP). Ostara vient après pour industrialiser. L'ordre est le bon, il ne faut pas l'inverser.

**How to apply:** Pour toute reco technique, se souvenir :
- Quand on parle de code métier durci (Factur-X, RGPD, HMAC) → c'est ConceptManager.
- Quand on parle de génération d'app, engine, briques, deploy PM2 → c'est Ostara.
- Les deux **ne sont pas encore réconciliés**. Travail à venir en Phase 2 (juin).
