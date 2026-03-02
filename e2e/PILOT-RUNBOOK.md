# Pilote ConceptManager — Runbook 2 semaines

## Participants

| Role | Utilisateur | Login | Objectif |
|------|-------------|-------|----------|
| Gerant/Admin | Marie Dupont | admin@asp.fr | Import donnees, export FEC, previsionnel, supervision |
| Conducteur | Thomas Martin | cond@asp.fr | Planning, validation heures, suivi chantiers |
| Comptable | Emilie Comptable | compta@asp.fr | Export FEC/Sage/EBP, verification comptes |
| Technicien 1 | Karim Benali | karim@asp.fr | Saisie terrain (heures, photos, signature) |
| Technicien 2 | Lucas Bernard | lucas@asp.fr | Saisie terrain + test offline |

Mot de passe : `Demo1234!`

---

## Pre-requis

1. `docker compose up --build` (postgres + minio + api + frontend)
2. `cd api && npx prisma migrate deploy && npx prisma db seed`
3. `cd api && npx ts-node prisma/seed-e2e.ts`
4. Verifier : `curl http://localhost:3000/api/health` → 200

---

## Semaine 1 — Mise en place + Import

### Jour 1-2 : Import initial (Gerant)

1. **Login** admin@asp.fr → scope ASP
2. **Admin > Import donnees**
3. Importer dans l'ordre :
   - Clients (`e2e/import-clients.csv`)
     - Verifier : 8 avec externalRef importes directement
     - Verifier : 3-4 doublons soft detectes (Mairie Lyon, Metropole Grand Lyon, Commune Bron)
     - Choisir : Fusionner (safe) pour les doublons nom+ville
     - Verifier : champs vides completes, champs existants conserves
   - Fournisseurs (`e2e/import-suppliers.csv`)
     - Verifier : Signaux Girod detecte comme doublon
   - Chantiers (`e2e/import-jobs.csv`)
     - Verifier : erreur sur CLI-999 (client inexistant)
     - 5 chantiers legacy importes
   - Factures (`e2e/import-invoices.csv`)
     - Verifier : statuts calcules (paid si date_paiement, overdue si echeance passee)
     - Verifier : TVA 10% et 0% acceptees
     - Verifier : facture sans chantier acceptee

4. **Re-importer clients** (meme CSV)
   - KPI : 0 creation nouvelle (idempotent via externalRef)

### Jour 3 : Export comptable (Comptable)

1. **Login** compta@asp.fr
2. **Facturation > Exporter**
3. Tester les 3 formats :
   - FEC (Journal: Ventes) → verifier 18 colonnes, equilibre debit/credit
   - FEC (Journal: Achats) → verifier que seules les commandes recues apparaissent
   - FEC (Journal: Tous) → combiner
   - Sage → verifier format date DD/MM/YYYY
   - EBP → verifier colonnes
4. **Verification** : ouvrir le FEC dans un parseur en ligne (ex: fec.validateur.fr)
5. **Test RBAC** : tenter de modifier les comptes → refuse (admin uniquement)

### Jour 4-5 : Previsionnel (Gerant)

1. **Dashboard** → widget previsionnel tresorerie
2. Verifier :
   - 3 colonnes (30j/60j/90j) avec entrees/sorties/facturation estimee
   - Alerte factures en retard (au moins 1)
   - Chantier CHT-ASP-2026-001 en confidence haute (3 situations regulieres)
   - Remaining ~13 050 EUR (33 000 - 19 950)
3. Ouvrir **drawer detail** → 3 onglets
   - Entrees : factures sent + overdue avec montant TTC
   - Sorties : commandes draft + ordered
   - A facturer : avec badge confiance (vert/jaune/rouge)

---

## Semaine 2 — Terrain + Offline

### Jour 6-7 : Saisie terrain online (Tech 1 — Karim)

1. Ouvrir `http://localhost:8080/terrain` sur mobile (ou Chrome DevTools mobile)
2. **Aujourd'hui** : voir les chantiers planifies
3. Taper sur un chantier → **Detail intervention**
4. Saisir heures : 4h "Marquage km 8 a 10"
5. Prendre 3 photos (si camera dispo, sinon file input)
6. Signer (canvas) → "Karim Benali"
7. Verifier que tout remonte cote admin (heures dans validation, photos dans chantier)

### Jour 8-9 : Saisie offline (Tech 2 — Lucas)

**Scenario offline complet :**

1. Ouvrir `/terrain` et naviguer (cache les pages)
2. **Couper le reseau** (Chrome DevTools > Network > Offline, ou mode avion)
3. Verifier : bandeau "Mode hors ligne" affiche
4. Aller sur un chantier → saisir :
   - 6h "Travaux decoupe surface"
   - 2 photos
   - Signature "Lucas Bernard"
5. Aller dans **File d'attente** (`/terrain/queue`)
   - Verifier : 4 elements en attente (1 timeEntry + 2 photos + 1 signature)
   - Verifier : bouton "Forcer la synchronisation" desactive (offline)
6. **Simuler crash** : fermer l'onglet, rouvrir `/terrain/queue`
   - Verifier : les 4 elements sont toujours la (IndexedDB persistant)
7. **Remettre le reseau** (Online)
   - Verifier : auto-sync se declenche
   - OU cliquer "Forcer la synchronisation"
   - Verifier : tous les elements passent en "OK"
8. **Verifier cote admin** : les heures, photos, signature sont bien arrivees
9. **Re-sync** (meme donnees) : pas de doublons (idempotencyKey)

### Jour 10 : Tests edge cases (Tech 2)

1. **Limite photos** : tenter d'ajouter 26+ photos sur un chantier → warning a 25
2. **Quota stockage** : (difficile a tester en pratique, verifier que l'alerte existe dans le code)
3. **Retry individuel** : couper reseau, saisir 1 heure, remettre reseau
   - Dans la queue, cliquer le bouton retry sur l'element
   - Verifier : passe en "OK"
4. **Supprimer** : ajouter un element offline, puis le supprimer de la queue avant sync
   - Verifier : element disparait, pas de sync

---

## KPIs Go/No-Go

| KPI | Cible | Mesure |
|-----|-------|--------|
| Reduction papier | -80% fiches terrain | Nombre fiches papier vs saisie app sur 5 jours |
| Export accepte comptable | FEC valide sans correction manuelle | Parseur FEC en ligne = 0 erreur |
| Temps validation heures | < 15 min/jour | Chrono conducteur : login → toutes les heures validees |
| Usage previsionnel | Consultation quotidienne | Le gerant ouvre le dashboard chaque jour (check audit log) |
| Fiabilite offline | 0 perte de donnees | Toutes les saisies offline arrivent en base |
| Idempotency | 0 doublon | Re-sync et re-import = pas de creation parasite |
| Adoption techniciens | 100% saisie app semaine 2 | Les 2 techs saisissent exclusivement via l'app |

---

## Checklist fin de pilote

- [ ] Import : 100% des donnees legacy importees sans erreur
- [ ] Re-import : 0 creation nouvelle
- [ ] Export FEC : validateur en ligne = OK
- [ ] Export Sage/EBP : comptable valide le format
- [ ] Previsionnel : projections coherentes vs realite
- [ ] Terrain online : heures + photos + signatures OK
- [ ] Terrain offline : crash + resync = 0 perte, 0 doublon
- [ ] Queue : retry + delete individuels fonctionnels
- [ ] RBAC : technicien ne peut pas importer/exporter
- [ ] Performance : < 2s chargement pages terrain sur 4G

---

## Decision

Si tous les KPIs sont atteints → **signature contrat 799 EUR/mois**.
Si bloquants identifies → sprint correctif 1 semaine max, re-test, puis signature.
