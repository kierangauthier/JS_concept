---
name: Contraintes techniques et dette en cours
description: Ce qui est cassé, ce qui manque, ce qu'il ne faut pas oublier — pour toute session technique future
type: project
---

# État de ConceptManager (local)

- V1-V6 livrées, typecheck 0 erreur back + front, 74/74 tests verts.
- Fichiers monstres non refactorés : `Quotes.tsx` 1140 L, `Planning.tsx` 890 L, `Invoicing.tsx` 921 L. À découper un jour, **pas urgent** si JS est signé tel quel.
- Zod appliqué uniquement sur formulaire `Clients` (pilote). Autres formulaires en `useState` manuel.
- Queue abstraction en place (in-memory) mais call sites mail/PDF/IA encore synchrones. BullMQ à brancher plus tard.
- `~280 any` restants.

# État d'Ostara (VM)

- **Pas de remote Git** (risque absolu à corriger en priorité).
- Pas de doc du contrat de brique (blocant pour Kieran qui découvre).
- Typecheck échoue (rootDir monorepo mal configuré — non bloquant à l'exécution mais CI cassée).
- Build échoue dans certains environnements (permissions EACCES VM).
- Pas de rate limiting global (dashboard pourtant exposé publiquement).
- Credentials app déployée hard-codés : `admin@app-builder.local` / `admin123!`.
- Double pipeline audit-fix : Gemini legacy + Anthropic nouveau, à déduplicater.
- Pas de modèle User en Prisma (admin unique via ENV).
- 22 briques basiques, **pas équivalentes** à la qualité V1-V6.

# Ce qui doit migrer de ConceptManager V1-V6 vers les briques Ostara

En Phase 2 (juin). Priorité décroissante :
1. **invoicing + Factur-X** (plus critique : Factur-X + HMAC intégrité + immutabilité + mentions légales dynamiques).
2. **clients** (zod pattern, DataTable, search).
3. **quotes** (bien que Quotes.tsx soit gros, la brique Ostara doit être simplifiée).
4. **chantiers (jobs)**.
5. **common/security** : password policy, env-guards, file-type sniffer, CSP helmet config.
6. **gdpr/consent** (consent history + UI /account).
7. **audit logs WORM**.

# Ce qu'il NE faut PAS faire en Phase 1

- Toucher à Ostara pour ajouter des features.
- Toucher à ConceptManager pour ajouter des features non demandées par JS.
- Extraire des briques.
- Refaire l'archi multi-tenant vs multi-app.

**Why:** Tant que JS n'est pas signé, tout temps passé sur l'industrialisation est du temps NON passé sur la signature. Le risque n°1 est la dérive.

**How to apply:** Si on propose une amélioration technique en Phase 1, demander : "Ça sert à signer JS ? Non ? Alors on attend Phase 2."
