# ConceptManager — Rapport de qualification E2E

**Date** : ___________
**Environnement** : Docker Compose (postgres:16 + minio + api + frontend)
**Commit** : ___________

---

## Pre-requis

- [x] Schema Prisma : AccountingSettings, IdempotencyKey, externalRef, vatRate, receivedAt
- [x] Frontend build : `npx tsc --noEmit` = 0 erreurs
- [x] Frontend build : `npx vite build` = OK (PWA SW genere)
- [x] Backend : tous les modules enregistres dans AppModule
- [ ] `npx prisma generate` = OK
- [ ] `npx prisma migrate deploy` = OK
- [ ] `npx prisma db seed` = OK
- [ ] `npx ts-node prisma/seed-e2e.ts` = OK
- [ ] `curl /api/health` = 200

---

## Bugs corriges pre-qualif

| Bug | Fichier | Fix |
|-----|---------|-----|
| Idempotency crash sur userId undefined | idempotency.interceptor.ts | Skip si pas de user authentifie |
| Idempotency companyId vide = partage cross-tenant | idempotency.interceptor.ts | Skip si pas de company scope |
| Import invoice chantier_ref invalide silencieux | import.service.ts | Validation FK chantier_ref dans preview |
| Build fail : ./client module manquant | — | Creation client.ts shim Axios-compatible |
| seed-e2e.ts : require('bcrypt') vs import | seed-e2e.ts | Import ES6 en haut du fichier |

---

## Resultats E2E

### Bloc 1 — Import

| Test | Attendu | Resultat |
|------|---------|----------|
| Preview clients 12 lignes | total >= 10 | |
| Doublons soft detectes | >= 2 | |
| Execute import clients | imported >= 1 | |
| Re-import idempotent (externalRef) | 0 creation | |
| Doublons fournisseurs | >= 1 | |
| Job FK manquante (CLI-999) | >= 1 erreur | |
| Invoice preview | >= 7 valid | |
| Invoice import legacy | >= 5 imported | |
| RBAC : technicien bloque | 403 | |

### Bloc 2 — Export

| Test | Attendu | Resultat |
|------|---------|----------|
| FEC VE genere | >= 5 lignes | |
| FEC VE equilibre (debit == credit) | BALANCED | |
| FEC multi-taux (445711 present) | oui | |
| FEC exoneree (2 lignes, pas de TVA) | 2 lignes | |
| FEC AC genere | >= 4 lignes | |
| FEC AC equilibre | BALANCED | |
| Sage export | 200 | |
| EBP export | 200 | |
| Comptable peut exporter | 200 | |
| Technicien bloque export | 403 | |
| Comptable bloque settings | 403 | |

### Bloc 3 — Cashflow

| Test | Attendu | Resultat |
|------|---------|----------|
| Snapshot overdue > 0 | oui | |
| 3 projections (30j/60j/90j) | 3 | |
| >= 1 haute confiance | oui | |
| j_asp1 remaining ~13050 | > 10000 | |
| Inflows overdue >= 1 | oui | |
| Technicien bloque cashflow | 403 | |

### Bloc 4 — Idempotency

| Test | Attendu | Resultat |
|------|---------|----------|
| Time entry cree (201) | oui | |
| Replay meme key = meme ID | oui | |
| Payload different = 409 | oui | |

---

## Synthese

| Bloc | Tests | Pass | Fail |
|------|-------|------|------|
| Import | 9 | | |
| Export | 11 | | |
| Cashflow | 6 | | |
| Idempotency | 3 | | |
| **Total** | **29** | | |

---

## Verdict

- [ ] **GO** — Tous les tests passent, pret pour pilote 2 semaines
- [ ] **NO-GO** — Tests en echec listes ci-dessus, correction requise

**Commentaires** :


