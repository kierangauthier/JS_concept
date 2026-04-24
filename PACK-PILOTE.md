# ConceptManager — Pack Pilote Complet

> **Version** : 1.0
> **Date** : 18 mars 2026
> **Cible** : PME BTP signalisation / amenagement urbain (10-50 personnes)
> **Duree pilote** : 2 semaines
> **Objectif** : Valider la valeur metier en conditions reelles → signature 799 EUR/mois/societe

---

## Table des matieres

1. [Checklist AVANT mise a disposition client](#1-checklist-avant-mise-a-disposition-client)
2. [Procedure d'onboarding client](#2-procedure-donboarding-client)
3. [Scenario de demo (45 min)](#3-scenario-de-demo-45-min)
4. [Parcours pilote recommande (2 semaines)](#4-parcours-pilote-recommande-2-semaines)
5. [Indicateurs de succes du pilote](#5-indicateurs-de-succes-du-pilote)
6. [Risques a surveiller quotidiennement](#6-risques-a-surveiller-quotidiennement)
7. [Plan de support pendant le pilote](#7-plan-de-support-pendant-le-pilote)
8. [Ameliorations a observer (P2/P3)](#8-ameliorations-a-observer-pendant-le-pilote-p2p3)
9. [Go / No-Go apres pilote](#9-go--no-go-apres-pilote)
10. [Les 5 erreurs a ne surtout pas faire](#10-les-5-erreurs-a-ne-surtout-pas-faire-pendant-ce-pilote)

---

## 1. Checklist AVANT mise a disposition client

Chaque point doit etre verifie et valide **avant** de donner acces au client.

### Infrastructure

- [ ] Docker Compose up : 4 services running (`docker compose ps` → postgres healthy, minio started, api up, frontend up)
- [ ] Ports accessibles depuis le reseau client :
  - Frontend : **8090** (ou 80 en production derriere reverse proxy)
  - API : **3020** (interne, proxie par nginx)
  - MinIO Console : **9011** (acces admin uniquement, pas expose au client)
  - PostgreSQL : **5440** (acces admin uniquement, pas expose au client)
- [ ] Si acces distant : reverse proxy HTTPS (nginx/Caddy) avec certificat SSL devant le port 8090
- [ ] DNS ou IP fixe communique au client (ex: `https://conceptmanager.votredomaine.com`)
- [ ] Health check OK : `curl http://[IP]:3020/api/health` → `{"status":"ok"}`

### Variables d'environnement critiques

- [ ] `JWT_SECRET` : chaine aleatoire >= 32 caracteres (generee, pas un defaut)
- [ ] `JWT_EXPIRY` : `15m` (pas plus pour la securite)
- [ ] `REFRESH_TOKEN_EXPIRY_DAYS` : `7`
- [ ] `NODE_ENV` : `production` (desactive Swagger, active les optimisations)
- [ ] `CORS_ORIGINS` : URL exacte du frontend (ex: `https://conceptmanager.client.com`)
- [ ] `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` : changes depuis les defauts `minioadmin`
- [ ] `DATABASE_URL` : mot de passe change depuis `concept_dev`

### Base de donnees

- [ ] Migrations deployees : `docker compose exec api npx prisma migrate deploy` → 0 pending
- [ ] Seed de base execute : `docker compose exec api npx prisma db seed`
- [ ] Seed E2E execute (donnees comptables) : `docker compose exec api npx tsx prisma/seed-e2e.ts`
- [ ] Verification : `docker compose exec postgres psql -U concept -d concept_manager -c "SELECT count(*) FROM companies;"` → 2

### Comptes utilisateurs

- [ ] Comptes crees pour chaque participant du pilote (voir section 2.3)
- [ ] Mots de passe personnalises (pas `Demo1234!` en production)
- [ ] Roles attribues correctement :
  - 1 admin (gerant)
  - 1 conducteur (chef d'equipe)
  - 1 comptable
  - 2-5 techniciens
- [ ] Test de connexion avec chaque compte : login OK, bon role, bonne societe

### Securite

- [ ] `NODE_ENV=production` → Swagger desactive (verifier : `/api/docs` retourne 404)
- [ ] JWT secret unique et long (pas de fallback `dev-secret`)
- [ ] Fail-fast au boot si JWT_SECRET absent ou < 32 chars
- [ ] Rate limiting actif : 100 req/min global, 5/min sur login
- [ ] Helmet active (headers securite)
- [ ] CORS restreint aux origines legitimes
- [ ] Pas de fichier `.env` commite ou expose

### Nettoyage final

- [ ] Pas de donnees de test sensibles dans la base (supprimer si besoin)
- [ ] Disque < 70% (`df -h /`)
- [ ] Docker images purgees (`docker image prune -f`)
- [ ] Build cache purge (`docker builder prune --all -f`)
- [ ] Logs anciens nettoyes
- [ ] Fichiers temporaires supprimes de MinIO (ou bucket vide pour un fresh start)

### Modules

- [ ] Import donnees : **actif** (admin uniquement)
- [ ] Export comptable (FEC/Sage/EBP) : **actif** (admin + comptable)
- [ ] Dashboard cashflow : **actif** (admin + comptable)
- [ ] Terrain offline (PWA) : **actif** (techniciens)
- [ ] Planning equipes : **actif** (admin + conducteur)
- [ ] Validation heures : **actif** (admin + conducteur)
- [ ] Atelier/Workshop : **actif** si pertinent pour le client, sinon masque
- [ ] Catalogue produits : **actif** si catalogue fourni, sinon a remplir J1

---

## 2. Procedure d'onboarding client

> Ce document s'adresse a la personne qui configure l'outil pour le client.
> Le client lui-meme ne fait aucune manipulation technique.

### 2.1 Creer la societe

La base est pre-configuree avec deux societes : **ASP Signalisation** et **JS Concept**.

Pour un nouveau client, deux options :

**Option A — Reutiliser une societe existante :**
1. Se connecter en admin
2. Aller dans **Admin** (icone engrenage en bas du menu)
3. Les societes ASP et JS sont pre-creees
4. Renommer via la base de donnees si necessaire :
   ```sql
   UPDATE companies SET name = 'Nom Client' WHERE code = 'ASP';
   ```

**Option B — Ajouter une societe (necessite intervention technique) :**
1. Ajouter l'entree dans le schema Prisma (enum CompanyCode + seed)
2. Migrer et re-seeder
3. Creer les utilisateurs associes

**Pour le pilote, on recommande l'Option A** : utiliser la societe ASP comme societe pilote du client.

### 2.2 Creer les utilisateurs

1. Se connecter avec le compte **admin** (admin@asp.fr)
2. Aller dans **Admin** (derniere icone du menu lateral)
3. Cliquer **"+ Nouvel utilisateur"**
4. Remplir :
   - **Nom complet** : prenom + nom du collaborateur
   - **Email** : son email professionnel (sera son identifiant)
   - **Role** :
     - `admin` → le gerant / dirigeant (voit tout, peut tout faire)
     - `conducteur` → le chef d'equipe / chef de chantier (planning, validation heures)
     - `comptable` → la personne qui fait les exports vers Sage/EBP
     - `technicien` → les ouvriers sur le terrain (saisie mobile)
   - **Societe** : selectionner la societe du client
   - **Mot de passe** : definir un mot de passe temporaire
5. Communiquer au collaborateur : email + mot de passe + URL de connexion

**Ordre recommande de creation :**
1. D'abord le compte admin (gerant)
2. Puis le conducteur
3. Puis le comptable
4. Enfin les techniciens

### 2.3 Comptes pilote types

| Personne | Role | Email | Mission pendant le pilote |
|----------|------|-------|---------------------------|
| Le gerant | admin | gerant@client.fr | Supervise, importe les donnees, consulte le previsionnel |
| Le chef d'equipe | conducteur | chef@client.fr | Planifie les equipes, valide les heures |
| Le/la comptable | comptable | compta@client.fr | Exporte les ecritures comptables |
| Technicien 1 | technicien | tech1@client.fr | Saisit ses heures et photos sur le terrain |
| Technicien 2 | technicien | tech2@client.fr | Teste aussi le mode hors-ligne |

### 2.4 Premiere connexion du client

Envoyer ce message au gerant :

> Bonjour,
>
> Votre espace ConceptManager est pret.
>
> **Pour vous connecter :**
> 1. Ouvrez votre navigateur (Chrome recommande)
> 2. Allez sur : [URL fournie]
> 3. Entrez votre email et mot de passe
> 4. Vous arrivez sur le **tableau de bord**
>
> **Pour les techniciens terrain :**
> 1. Sur le telephone, ouvrir Chrome
> 2. Aller sur : [URL]/terrain
> 3. Chrome propose "Ajouter a l'ecran d'accueil" → accepter
> 4. L'application s'installe comme une app native
>
> En cas de probleme, contactez-nous a [email/tel support].

### 2.5 Quoi configurer en premier (gerant)

Une fois connecte en admin, dans cet ordre :

| Etape | Ou | Quoi faire | Temps |
|-------|-----|-----------|-------|
| 1 | **Admin** | Verifier que les utilisateurs sont bien crees | 5 min |
| 2 | **Clients** | Ajouter ou importer les clients (bouton Import si CSV dispo) | 15 min |
| 3 | **Catalogue** | Ajouter les produits/prestations courantes (signalisation, marquage, etc.) | 20 min |
| 4 | **Fournisseurs** | Ajouter les fournisseurs principaux (via Achats > ajouter) | 10 min |
| 5 | **Devis** | Creer un premier devis test pour verifier le flux | 10 min |
| 6 | **Planning** | Creer les equipes (Admin > Techniciens > Equipes) | 10 min |

### 2.6 Ordre de decouverte recommande

Pour que le client comprenne l'outil progressivement :

```
Jour 1 : Tableau de bord → Clients → Catalogue
Jour 2 : Devis → Transformer en chantier
Jour 3 : Planning equipes → Assigner techniciens
Jour 4 : Facturation → Premiere facture
Jour 5 : Export comptable → Previsionnel tresorerie
```

Les techniciens commencent a utiliser l'app terrain des le **Jour 3** (une fois le planning fait).

---

## 3. Scenario de demo (45 min)

> Ce script est prevu pour une demo devant le gerant + chef d'equipe + comptable.
> Se connecter en admin@asp.fr avant de commencer.
> Preparer un telephone (ou Chrome DevTools mobile) pour la partie terrain.

### Ouverture (2 min)

**Dire :** "ConceptManager remplace vos Excel, vos fiches papier et vos copier-coller vers Sage par un seul outil. Du devis a l'export comptable, tout est connecte. Je vais vous montrer le flux complet en 40 minutes."

### Etape 1 — Tableau de bord (3 min)

**Montrer :** Page Dashboard (/)
- Les 4 KPIs en haut : CA encaisse, chantiers actifs, devis en attente, factures en retard
- Les alertes en temps reel : factures overdue, heures a valider, elements a recevoir
- Le widget cashflow : projections 30/60/90 jours

**Dire :** "Des votre connexion, vous voyez l'etat de votre activite. Les alertes rouges sont les actions urgentes. Le previsionnel vous dit combien vous allez encaisser dans les 30, 60, 90 prochains jours."

**Point wow :** Cliquer sur le detail cashflow → montrer les indices de confiance (vert/jaune/rouge) par chantier.

**Transition :** "Tout part du client et du devis. Montrons le flux complet."

### Etape 2 — Creer un client (2 min)

**Montrer :** Page Clients (/clients)
1. Cliquer **"+ Nouveau client"**
2. Remplir : "Metropole de Lyon", contact, email, type "public"
3. Sauvegarder

**Dire :** "En 30 secondes, le client est cree. Vous pouvez aussi importer vos clients existants en masse par CSV."

**Transition :** "Maintenant, faisons-lui un devis."

### Etape 3 — Creer un devis (5 min)

**Montrer :** Page Devis (/quotes)
1. Cliquer **"+ Nouveau devis"**
2. Selectionner le client "Metropole de Lyon"
3. Ajouter des lignes :
   - "Marquage au sol — passage pieton" : 12 unites, 85 EUR → 1 020 EUR
   - "Panneau directionnel type D21" : 4 unites, 320 EUR → 1 280 EUR
   - "Pose et fixation" : 1 forfait, 650 EUR
4. Montrer le total : 2 950 EUR HT
5. Montrer l'apercu PDF

**Dire :** "Le devis est structure, chiffre, pret a envoyer. Vous pouvez le dupliquer pour gagner du temps, ou utiliser des modeles."

**Point wow :** Montrer les modeles de devis (templates) s'il y en a.

**Transition :** "Le client accepte. Transformons ce devis en chantier."

### Etape 4 — Transformer en chantier (3 min)

**Montrer :**
1. Sur le devis accepte, cliquer **"Convertir en chantier"**
2. Le chantier se cree automatiquement avec le bon montant, le bon client
3. Aller dans la page Chantiers (/jobs) → le chantier apparait

**Dire :** "Un clic. Le chantier est cree avec toutes les infos du devis. Plus de ressaisie, plus d'oubli."

**Transition :** "Il faut maintenant planifier l'equipe."

### Etape 5 — Planifier l'equipe (4 min)

**Montrer :** Page Planning (/planning)
1. Vue semaine : colonnes = jours, lignes = equipes
2. Glisser le chantier dans un creneau
3. Montrer l'affectation : equipe, horaires, chantier

**Dire :** "Le conducteur planifie sa semaine ici. Les techniciens voient automatiquement leur planning sur leur telephone."

**Point wow :** "Quand vous verrouillez la semaine, le planning est fige. Plus de changement de derniere minute non trace."

**Transition :** "Voyons maintenant ce que voit le technicien sur le terrain."

### Etape 6 — App terrain mobile (7 min) ★ POINT WOW MAJEUR

**Montrer :** Ouvrir `/terrain` sur telephone (ou Chrome DevTools responsive)
1. Se connecter en karim@asp.fr
2. **Aujourd'hui** : le technicien voit ses interventions du jour (chantier, adresse, horaires)
3. Taper sur une intervention :
   - **Saisir les heures** : "4h — Marquage parking nord"
   - **Prendre une photo** du chantier (utiliser la camera ou choisir un fichier)
   - **Signer** sur l'ecran tactile (signature du client ou du technicien)
4. Montrer la **file d'attente** (/terrain/queue) : les elements en attente de sync

**Dire :** "Vos techniciens saisissent directement depuis le chantier. Plus de fiche papier. Les heures arrivent instantanement cote bureau pour validation."

**Point wow OFFLINE :**
1. Passer en mode avion
2. Montrer le bandeau "Mode hors ligne"
3. Saisir des heures → elles vont dans la file d'attente
4. Remettre en ligne → sync automatique

**Dire :** "Meme sans reseau, l'application fonctionne. Vos techniciens sont en zone blanche ? Aucun probleme. Les donnees se synchronisent des qu'ils retrouvent du reseau."

**Transition :** "Les heures sont saisies. Le conducteur les valide."

### Etape 7 — Validation des heures (3 min)

**Montrer :** Page Validation heures (/time-validation)
1. Se reconnecter en cond@asp.fr
2. Les heures soumises par les techniciens apparaissent par semaine
3. **Valider en lot** : cocher tout, cliquer "Approuver"
4. Montrer qu'un rejet est possible avec commentaire

**Dire :** "Le conducteur valide les heures en 5 minutes au lieu de 45 minutes de ressaisie. C'est immediat."

**Transition :** "Maintenant, facturons."

### Etape 8 — Facturation (5 min)

**Montrer :** Page Facturation (/invoicing)
1. Creer une facture sur le chantier
2. Montrer la **facturation par situation** (avancement) :
   - Situation 1 : 30% d'avancement → facture partielle
   - Le montant cumulatif se calcule automatiquement
3. Montrer l'envoi par email
4. Montrer les relances automatiques configurables

**Dire :** "La facturation en situations est standard dans le BTP. ConceptManager la gere nativement. Plus de calculs manuels."

**Point wow :** "Les relances se declenchent automatiquement. Plus de factures oubliees."

**Transition :** "Et pour la comptabilite..."

### Etape 9 — Export comptable (5 min) ★ POINT WOW COMPTABLE

**Montrer :** Se connecter en compta@asp.fr
1. Aller dans **Facturation > Exporter**
2. Choisir format : **FEC** (obligation legale francaise)
3. Selectionner la periode
4. Telecharger
5. Ouvrir le fichier : montrer les 18 colonnes conformes, l'equilibre debit/credit
6. Montrer aussi les formats **Sage** et **EBP**

**Dire :** "Un clic, votre FEC est genere. Vous l'importez dans Sage ou EBP sans aucune ressaisie. Multi-taux TVA (20%, 10%, exonere) — tout est gere."

**Dire au comptable :** "Vous avez acces a l'export mais pas aux parametres comptables. Seul l'admin peut modifier le plan de comptes. C'est une securite."

**Transition :** "Terminons par la vision d'ensemble."

### Etape 10 — Previsionnel tresorerie (4 min)

**Montrer :** Revenir au Dashboard en admin
1. Widget cashflow : 3 colonnes 30/60/90 jours
2. Ouvrir le detail :
   - **Entrees attendues** : factures envoyees avec date d'echeance
   - **Sorties prevues** : commandes fournisseurs en cours
   - **Facturation estimee** : reste a facturer par chantier avec confiance

**Dire :** "Vous savez exactement combien vous allez encaisser et decaisser dans les semaines a venir. Le vert = confiance haute, le jaune = a surveiller, le rouge = incertain."

**Point wow :** "Cet indicateur de confiance se calcule automatiquement en fonction de votre rythme de facturation reel. Plus vous facturez regulierement, plus la prevision est fiable."

### Cloture (2 min)

**Dire :**

"Recapitulons ce qu'on vient de voir en 40 minutes :
- Devis en 2 minutes, converti en chantier en 1 clic
- Planning visuel, techniciens informes automatiquement
- Saisie terrain sur telephone, meme sans reseau
- Validation des heures en 5 minutes au lieu de 45
- Facturation en situations, relances automatiques
- Export comptable instantane (FEC, Sage, EBP)
- Previsionnel tresorerie en temps reel

Le pilote gratuit de 2 semaines vous permet de tester tout ca avec vos vraies donnees, vos vrais chantiers, vos vrais techniciens. On vous accompagne quotidiennement."

**Question de cloture :** "Quand est-ce qu'on demarre ?"

---

## 4. Parcours pilote recommande (2 semaines)

### SEMAINE 1 — Decouverte et prise en main

#### Jour 1 (lundi) — Installation et import

| Qui | Quoi | Objectif |
|-----|------|----------|
| **Gerant** | Se connecter, decouvrir le Dashboard | Premiere impression positive |
| **Gerant** | Importer les clients existants (CSV ou saisie) | Base clients operationnelle |
| **Gerant** | Importer les fournisseurs | Base fournisseurs complete |
| **Nous** | Verifier que l'import s'est bien passe (0 erreur, doublons geres) | Confiance dans les donnees |

**A observer :** Le gerant arrive-t-il a importer seul ? Combien de temps ? Quelles questions ?

#### Jour 2 (mardi) — Premiers devis et chantiers

| Qui | Quoi | Objectif |
|-----|------|----------|
| **Gerant** | Creer 2-3 devis sur des chantiers reels en cours | Valider le flux devis |
| **Gerant** | Convertir un devis accepte en chantier | Tester la conversion |
| **Gerant** | Remplir le catalogue (prestations courantes) | Base catalogue utilisable |
| **Nous** | Verifier que les devis ont les bons montants, TVA, client | Coherence metier |

**A observer :** Le gerant comprend-il la logique devis → chantier ? Le catalogue est-il adapte ?

#### Jour 3 (mercredi) — Planning et terrain

| Qui | Quoi | Objectif |
|-----|------|----------|
| **Conducteur** | Creer les equipes, affecter les techniciens | Structure equipes prete |
| **Conducteur** | Planifier la semaine sur 2-3 chantiers reels | Planning operationnel |
| **Techniciens** | Installer la PWA sur telephone | App terrain fonctionnelle |
| **Techniciens** | Se connecter, voir le planning du jour | Premiere saisie terrain |
| **Nous** | Verifier que le planning s'affiche correctement sur mobile | UX terrain OK |

**A observer :** Les techniciens trouvent-ils l'app intuitive ? Combien de temps pour la premiere saisie ?

#### Jour 4 (jeudi) — Premiere journee terrain reelle

| Qui | Quoi | Objectif |
|-----|------|----------|
| **Techniciens** | Saisir les heures reelles du jour depuis le chantier | Premiere saisie en conditions reelles |
| **Techniciens** | Prendre des photos de chantier | Test upload photos |
| **Conducteur** | Verifier que les heures arrivent dans Validation | Flux complet heures |
| **Conducteur** | Valider les heures soumises | Test validation |
| **Nous** | Comparer heures saisies app vs fiche papier habituelle | Mesurer ecart |

**A observer :** Les techniciens saisissent-ils en temps reel ou en fin de journee ? Qualite des photos ?

#### Jour 5 (vendredi) — Export comptable

| Qui | Quoi | Objectif |
|-----|------|----------|
| **Gerant** | Creer une premiere facture sur un chantier reel | Flux facturation valide |
| **Comptable** | Exporter le FEC sur la periode | Test export reel |
| **Comptable** | Importer le FEC dans Sage/EBP | Validation format |
| **Gerant** | Consulter le previsionnel tresorerie | Premiere lecture cashflow |
| **Nous** | Verifier : FEC equilibre ? Import dans logiciel comptable OK ? | Validation critique |

**A observer :** Le FEC est-il accepte par le logiciel comptable sans correction ? C'est le test le plus important de la semaine.

---

### SEMAINE 2 — Usage reel et validation

#### Jour 6-7 (lundi-mardi) — Usage quotidien

| Qui | Quoi | Objectif |
|-----|------|----------|
| **Tous** | Utiliser ConceptManager comme outil principal (plus de papier) | Adoption reelle |
| **Techniciens** | Saisie 100% via l'app (plus de fiche papier) | Objectif 0 papier |
| **Conducteur** | Validation quotidienne des heures | Routine installee |
| **Gerant** | Dashboard + previsionnel chaque matin | Usage quotidien |
| **Nous** | Verifier les logs : tous les utilisateurs se connectent-ils ? | Adoption mesuree |

**A observer :** Y a-t-il des utilisateurs qui ne se connectent pas ? Pourquoi ?

#### Jour 7 — Test offline (mardi)

| Qui | Quoi | Objectif |
|-----|------|----------|
| **1 technicien** | Aller sur un chantier en zone sans reseau | Test conditions reelles |
| **1 technicien** | Saisir heures + photos en mode offline | Validation offline |
| **1 technicien** | Verifier la sync au retour en zone couverte | Fiabilite sync |
| **Nous** | Verifier : 0 perte de donnees, 0 doublon | KPI critique |

**A observer :** La sync se fait-elle automatiquement ? Le technicien voit-il la confirmation ?

#### Jour 8-9 (mercredi-jeudi) — Validation metier

| Qui | Quoi | Objectif |
|-----|------|----------|
| **Gerant** | Comparer marges calculees par l'outil vs calcul habituel | Validation chiffres |
| **Comptable** | Faire un 2e export FEC sur une periode plus longue | Confirmation format |
| **Conducteur** | Planifier une 2e semaine complete | Routine planning |
| **Nous** | Collecter les retours de chaque role | Feedback structure |

**Questions a poser :**
- Au gerant : "Le previsionnel reflete-t-il votre vision de la tresorerie ?"
- Au comptable : "Le FEC est-il exploitable tel quel ?"
- Au conducteur : "Le planning vous fait-il gagner du temps ?"
- Aux techniciens : "Preferez-vous l'app ou les fiches papier ?"

#### Jour 10 (vendredi) — Bilan et decision

| Qui | Quoi | Objectif |
|-----|------|----------|
| **Tous** | Reunion bilan 1h avec tous les participants | Decision Go/No-Go |
| **Nous** | Presenter les KPIs mesures (voir section 5) | Arguments factuels |
| **Nous** | Recueillir les objections et y repondre | Lever les freins |
| **Gerant** | Prendre la decision : continuer / ajuster / arreter | Conclusion |

---

## 5. Indicateurs de succes du pilote

### Indicateurs quantitatifs

| KPI | Methode de mesure | Seuil GO | Seuil WARNING | Seuil NO-GO |
|-----|-------------------|----------|---------------|-------------|
| **Adoption utilisateurs** | Nb users connectes / Nb users crees | >= 80% | 50-80% | < 50% |
| **Saisie terrain** | Nb heures saisies app vs fiches papier (S2) | 100% app | > 50% app | < 50% app |
| **Validation heures** | Temps quotidien conducteur pour valider | < 15 min | 15-30 min | > 30 min |
| **Export comptable** | FEC importe dans Sage/EBP sans correction | 0 correction | 1-2 corrections mineures | Rejet complet |
| **Previsionnel consulte** | Nb jours ou le gerant ouvre le dashboard (S2) | >= 4/5 jours | 2-3/5 jours | < 2/5 jours |
| **Fiabilite offline** | Donnees perdues lors de sync offline | 0 perte | — | >= 1 perte |
| **Idempotency** | Doublons crees lors de re-sync/re-import | 0 doublon | — | >= 1 doublon |
| **Stabilite** | Incidents bloquants non resolus | 0 | — | >= 1 |
| **Erreurs silencieuses** | Incoherences de donnees detectees | 0 | 1-2 mineures | >= 1 majeure |

### Indicateurs qualitatifs

| Question | Reponse attendue (GO) |
|----------|----------------------|
| Le gerant recommanderait-il l'outil a un confrere ? | Oui sans hesitation |
| Les techniciens preferent-ils l'app aux fiches papier ? | Oui a l'unanimite |
| Le comptable valide-t-il le format d'export ? | Oui, exploitable tel quel |
| Le conducteur gagne-t-il du temps sur la validation ? | Oui, temps divise par 3+ |
| Y a-t-il eu un moment "wow" pendant le pilote ? | Au moins 1 par role |

### Seuils de validation

```
SI tous les KPIs quantitatifs = GO
ET tous les qualitatifs = positifs
ET 0 incident bloquant ouvert
→ SIGNATURE CONTRAT 799 EUR/mois

SI >= 1 KPI en WARNING mais 0 en NO-GO
→ PROLONGER le pilote de 1 semaine avec correctifs cibles

SI >= 1 KPI en NO-GO
→ SPRINT CORRECTIF 1 semaine, puis re-evaluation
```

---

## 6. Risques a surveiller quotidiennement

### Priorite CRITIQUE

#### R1 — Fuite multi-tenant (donnees d'une societe visibles par une autre)

| | |
|-|-|
| **Symptome** | Un utilisateur ASP voit des clients, chantiers ou factures de JS (ou inversement) |
| **Detection** | Verifier quotidiennement : se connecter en technicien ASP → aucun chantier JS ne doit apparaitre |
| **Action immediate** | 1. Stopper l'acces des utilisateurs concernes 2. Identifier le endpoint fautif 3. Verifier le CompanyGuard (`api/src/common/guards/company.guard.ts`) 4. Corriger et re-tester |
| **Gravite** | Perte de confiance instantanee, risque legal (RGPD) |

#### R2 — Perte de donnees offline (saisie terrain qui disparait)

| | |
|-|-|
| **Symptome** | Un technicien saisit des heures/photos offline, revient en ligne, les donnees ne sont pas la |
| **Detection** | Chaque matin, comparer le nombre de saisies attendues vs reellement presentes en base |
| **Action immediate** | 1. Verifier IndexedDB sur le telephone du technicien (DevTools > Application > IndexedDB) 2. Verifier la file d'attente `/terrain/queue` 3. Forcer la sync manuellement 4. Si donnees perdues : re-saisir et investiguer le bug |
| **Gravite** | Techniciens perdent confiance, retour au papier |

#### R3 — FEC rejete par le logiciel comptable

| | |
|-|-|
| **Symptome** | Le comptable ne peut pas importer le FEC dans Sage/EBP — erreur de format, colonnes manquantes, desequilibre |
| **Detection** | Jour 5 du pilote : le comptable teste l'import dans son logiciel |
| **Action immediate** | 1. Recuperer le fichier FEC genere 2. Verifier l'equilibre debit/credit 3. Comparer avec le format attendu par le logiciel 4. Corriger dans `api/src/export/export.service.ts` 5. Re-generer et re-tester |
| **Gravite** | Si le FEC ne marche pas, l'argument "plus de ressaisie" tombe |

### Priorite HAUTE

#### R4 — API down (crash ou indisponibilite)

| | |
|-|-|
| **Symptome** | Pages blanches, erreurs 500 ou 502, "impossible de se connecter" |
| **Detection** | Health check automatique toutes les 5 min : `curl http://[IP]:3020/api/health` |
| **Action immediate** | 1. `docker compose ps` → verifier que api est Up 2. `docker compose logs --tail 100 api` → lire l'erreur 3. `docker compose restart api` si crash isole 4. Si DB down : `docker compose restart postgres` puis `docker compose restart api` |
| **Gravite** | Utilisateurs bloques, perte de credibilite |

#### R5 — Rate limiting trop agressif

| | |
|-|-|
| **Symptome** | Utilisateurs recoivent des erreurs 429 "Too Many Requests" en usage normal |
| **Detection** | Plaintes utilisateurs, erreurs 429 dans les logs API |
| **Action immediate** | 1. Verifier les logs : quel endpoint est sature ? 2. Si usage legitime : augmenter la limite dans `app.module.ts` (ThrottlerModule) 3. Si attaque : bloquer l'IP source |

#### R6 — Session qui expire trop souvent

| | |
|-|-|
| **Symptome** | Utilisateurs deconnectes frequemment (toutes les 15 min), frustration |
| **Detection** | Plaintes utilisateurs, surtout les techniciens terrain |
| **Action immediate** | C'est normal (JWT 15 min + refresh 7j). Verifier que le refresh token fonctionne (reconnexion automatique invisible). Si le refresh echoue : investiguer `api/src/auth/auth.service.ts` |

### Priorite MOYENNE

#### R7 — Photos qui ne s'affichent pas

| | |
|-|-|
| **Symptome** | Cadres vides a la place des photos, erreur 404 sur les images |
| **Detection** | Ouvrir un chantier avec photos → verifier l'affichage |
| **Action immediate** | 1. `docker compose logs minio` → erreur ? 2. Verifier le bucket `concept-files` dans la console MinIO (port 9011) 3. Verifier que les URLs presignees sont generees correctement |

#### R8 — Inchoerences montants (marge, facturation)

| | |
|-|-|
| **Symptome** | Le gerant remarque que la marge affichee ne correspond pas a son calcul |
| **Detection** | Comparaison manuelle sur 2-3 chantiers : montant devis + avenants - heures valorisees - achats = marge |
| **Action immediate** | 1. Identifier l'ecart : heures manquantes ? Achats non comptabilises ? Avenant oublie ? 2. Verifier les donnees en base 3. Corriger si bug, expliquer si logique differente |

---

## 7. Plan de support pendant le pilote

### Frequence de suivi

| Quand | Type | Duree | Avec qui | Objectif |
|-------|------|-------|----------|----------|
| **J1 matin** | Appel onboarding | 45 min | Gerant | Setup initial, import, premier tour |
| **J1-J5 soir** | Check quotidien | 15 min | Gerant (message/call) | "Comment s'est passee la journee ? Blocages ?" |
| **J3 matin** | Appel terrain | 20 min | Conducteur + 1 technicien | Installer la PWA, premiere saisie |
| **J5 apres-midi** | Point semaine 1 | 30 min | Gerant + comptable | Bilan S1, test export comptable |
| **J6-J9 soir** | Check tous les 2 jours | 10 min | Gerant (message) | "Tout roule ? Des questions ?" |
| **J7** | Appel offline | 15 min | 1 technicien | Verifier test offline |
| **J10 matin** | Reunion bilan | 1h | Tous les participants | KPIs, feedback, decision Go/No-Go |

### Check technique quotidien (notre cote)

Chaque matin, avant de contacter le client :

```
1. Health check API : curl http://[IP]:3020/api/health → OK ?
2. Docker ps : 4 services up ?
3. Disque : df -h / → < 80% ?
4. Logs API : docker compose logs --tail 50 api → 0 erreur critique ?
5. Comptes actifs : SELECT count(DISTINCT "userId"), max("createdAt") FROM activity_logs WHERE "createdAt" > now() - interval '24h';
6. Donnees : SELECT count(*) FROM time_entries WHERE "createdAt" > now() - interval '24h'; → heures saisies hier ?
```

### Quoi demander au client

| Jour | Question cle |
|------|-------------|
| J1 | "L'import s'est bien passe ? Combien de clients/fournisseurs ?" |
| J2 | "Avez-vous cree vos premiers devis ? Quelque chose manque dans le catalogue ?" |
| J3 | "Les techniciens ont-ils installe l'app ? Premiere reaction ?" |
| J4 | "Combien d'heures saisies via l'app aujourd'hui ? Des fiches papier encore ?" |
| J5 | "Le comptable a-t-il teste l'export ? Ca passe dans Sage/EBP ?" |
| J7 | "Le test offline s'est bien passe ? Aucune donnee perdue ?" |
| J9 | "Si vous deviez noter l'outil de 1 a 10, combien ? Pourquoi ?" |
| J10 | "Etes-vous pret a continuer avec ConceptManager ?" |

### Comment reagir a un bug

| Gravite | Reaction | Delai |
|---------|----------|-------|
| **Bloquant** (app down, perte de donnees, fuite tenant) | Arreter ce qu'on fait. Diagnostiquer. Corriger. Communiquer au client dans l'heure | < 2h |
| **Critique** (fonction degradee, workaround possible) | Donner le workaround au client. Corriger dans la journee | < 24h |
| **Mineur** (UX, libelle, lenteur non critique) | Noter dans `pilot-incidents.md`. Corriger en fin de pilote ou post-pilote | Backlog |

### Quand intervenir vs laisser explorer

| Situation | Action |
|-----------|--------|
| Le client ne se connecte pas depuis 2 jours | **Intervenir** : appeler, comprendre le blocage |
| Un technicien n'utilise pas l'app | **Intervenir** : identifier la friction (technique ? habitude ? refus ?) |
| Le client demande une feature absente | **Ne pas intervenir** : noter, expliquer que c'est prevu en V2, ne pas developper pendant le pilote |
| Le client personnalise son usage de maniere imprevue | **Laisser explorer** : c'est positif, ca montre l'adoption |
| Le client trouve un bug mineur d'affichage | **Laisser explorer** : noter, ne pas interrompre son usage |
| Le client rencontre une erreur bloquante | **Intervenir immediatement** : chaque minute de blocage erode la confiance |

---

## 8. Ameliorations a observer pendant le pilote (P2/P3)

Pendant le pilote, noter systematiquement les frictions et demandes dans ces categories :

### UX / Ergonomie

| Observation a guetter | Priorite | Impact |
|----------------------|----------|--------|
| Technicien qui ne trouve pas un bouton | P2 | Adoption terrain |
| Trop de clics pour une action frequente | P2 | Productivite quotidienne |
| Information manquante sur une page (ex: adresse chantier) | P2 | Efficacite terrain |
| Navigation confuse (retours en arriere, pages perdues) | P2 | Frustration utilisateur |
| Ecran trop charge ou pas assez lisible sur mobile | P2 | UX terrain |
| Demande de raccourci ou action rapide | P3 | Confort d'utilisation |

### Metier / Fonctionnel

| Observation a guetter | Priorite | Impact |
|----------------------|----------|--------|
| Champ manquant dans un formulaire (ex: n° bon de commande) | P2 | Completude metier |
| Statut ou workflow qui ne correspond pas a la realite | P2 | Coherence metier |
| Calcul de marge qui ne correspond pas au calcul du gerant | P2 | Credibilite chiffres |
| Format d'export a ajuster pour le logiciel comptable | P2 | Adoption comptable |
| Demande d'un rapport/indicateur supplementaire | P3 | Valeur ajoutee |
| Besoin de personnalisation (logo, couleurs, libelles) | P3 | Appropriation |

### Performance

| Observation a guetter | Priorite | Impact |
|----------------------|----------|--------|
| Page qui met > 3s a charger | P2 | Experience utilisateur |
| Sync offline qui prend > 30s | P2 | Fiabilite terrain |
| Export FEC lent sur grandes periodes | P3 | Confort comptable |
| Upload photo lent (> 5s par photo) | P3 | Adoption terrain |

### Credibilite produit

| Observation a guetter | Priorite | Impact |
|----------------------|----------|--------|
| Faute d'orthographe dans l'interface | P3 | Image professionnelle |
| Message d'erreur technique visible par l'utilisateur | P2 | Confiance |
| Favicon / titre onglet incorrect | P3 | Finition |
| Donnees demo visibles (noms fictifs, Lorem ipsum) | P2 | Credibilite |
| Fonctionnalite presente dans le menu mais non fonctionnelle | P2 | Deception |

### Grille de collecte (a remplir pendant le pilote)

| # | Date | Qui | Categorie | Description | Gravite | Action |
|---|------|-----|-----------|-------------|---------|--------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| ... | | | | | | |

---

## 9. Go / No-Go apres pilote

### Conditions pour passer en PRODUCTION

**Tous les criteres suivants doivent etre remplis :**

- [ ] **Adoption** : >= 80% des utilisateurs crees se sont connectes au moins 3 fois en S2
- [ ] **Terrain** : Les techniciens saisissent 100% de leurs heures via l'app en S2 (0 fiche papier)
- [ ] **Comptable** : Le FEC est importe dans le logiciel comptable sans correction manuelle
- [ ] **Gerant** : Le dashboard est consulte au moins 4 jours sur 5 en S2
- [ ] **Offline** : 0 perte de donnees lors des tests hors-ligne
- [ ] **Stabilite** : 0 incident bloquant non resolu en fin de pilote
- [ ] **Satisfaction** : Score moyen >= 7/10 sur le questionnaire de fin
- [ ] **Decision gerant** : Accord verbal ou ecrit pour continuer

→ **Si OUI a tout : signature contrat 799 EUR/mois/societe**

Etapes post-signature :
1. Migration des donnees reelles completes
2. Changement des mots de passe demo
3. Configuration SSL/HTTPS production
4. Mise en place backup automatique (pg_dump quotidien)
5. Formation finale 2h pour les utilisateurs non impliques dans le pilote

### Conditions pour PROLONGER le pilote (+1 semaine)

**Au moins l'un de ces cas :**

- [ ] Adoption > 50% mais < 80% (certains utilisateurs n'ont pas eu le temps)
- [ ] Export comptable necessite 1-2 ajustements mineurs (en cours de correction)
- [ ] Test offline non realise (pas de zone sans reseau rencontree)
- [ ] Le gerant veut tester avec un volume de donnees plus important
- [ ] Demande explicite du client pour "une semaine de plus pour etre sur"

→ **Prolonger 1 semaine. Corriger les points. Re-evaluer le vendredi suivant.**

### Conditions pour STOPPER

**L'un de ces cas suffit :**

- [ ] Le FEC est rejete et ne peut pas etre corrige en < 1 semaine
- [ ] Perte de donnees confirmee et non reproductible (confiance brisee)
- [ ] Fuite multi-tenant detectee (incident securite)
- [ ] Adoption < 30% (les utilisateurs refusent d'utiliser l'outil)
- [ ] Le gerant declare que l'outil ne repond pas au besoin fondamental
- [ ] Probleme technique majeur non resolvable (infra, compatibilite)

→ **Stopper le pilote. Analyser les causes. Decider : correction profonde ou abandon.**

### Matrice de decision resumee

```
                    Adoption >= 80%     Adoption 50-80%     Adoption < 50%
                    ───────────────     ───────────────     ──────────────
FEC OK              → GO PRODUCTION     → +1 SEMAINE        → INVESTIGUER
FEC ajustements     → +1 SEMAINE        → +1 SEMAINE        → STOPPER
FEC rejete          → SPRINT FIX        → STOPPER            → STOPPER
Perte donnees       → STOPPER           → STOPPER            → STOPPER
```

---

## 10. Les 5 erreurs a ne surtout pas faire pendant ce pilote

### Erreur 1 — Developper de nouvelles features pendant le pilote

**Pourquoi c'est tentant :** Le client demande "est-ce qu'on pourrait aussi avoir X ?" et on veut faire plaisir.

**Pourquoi c'est dangereux :** Chaque modification introduit un risque de regression. On risque de casser ce qui marche pour ajouter ce qui n'etait pas prevu. Le pilote teste la stabilite, pas l'extensibilite.

**Quoi faire :** "Excellente idee, je la note pour la V2. Pendant le pilote, on se concentre sur la fiabilite."

---

### Erreur 2 — Ignorer un utilisateur qui ne se connecte pas

**Pourquoi c'est tentant :** On se dit "il est occupe, il viendra plus tard".

**Pourquoi c'est dangereux :** Un utilisateur silencieux est souvent un utilisateur bloque ou desinteresse. A la reunion bilan, il dira "je n'ai pas teste, je ne peux pas donner d'avis" → le gerant hesite → pas de signature.

**Quoi faire :** Appeler des J3 si un utilisateur ne s'est jamais connecte. Comprendre le blocage. L'accompagner individuellement.

---

### Erreur 3 — Laisser trainer un bug bloquant "parce que c'est mineur"

**Pourquoi c'est tentant :** On se dit "c'est un cas rare, ca n'arrivera plus".

**Pourquoi c'est dangereux :** Le client retient le bug, pas l'explication. Un seul crash non resolu pendant le pilote = "l'outil n'est pas stable" dans la tete du gerant.

**Quoi faire :** Corriger dans les 2h. Communiquer proactivement : "On a identifie un bug, il est corrige, voila ce qu'on a fait."

---

### Erreur 4 — Submerger le client de fonctionnalites des le premier jour

**Pourquoi c'est tentant :** L'outil a beaucoup de features, on veut tout montrer.

**Pourquoi c'est dangereux :** Trop d'information = paralysie. Le client ne retient rien, se sent depasse, et utilise l'outil a 10% de son potentiel.

**Quoi faire :** Suivre le parcours progressif (section 4). Une nouvelle fonctionnalite par jour. Laisser le client digerer chaque etape avant de passer a la suivante.

---

### Erreur 5 — Ne pas mesurer les KPIs et arriver au bilan sans donnees

**Pourquoi c'est tentant :** On se dit "on verra bien a la fin".

**Pourquoi c'est dangereux :** Sans chiffres, la reunion bilan devient une discussion d'opinion. Le gerant dira "c'est bien mais je ne suis pas sur" et reportera la decision.

**Quoi faire :** Remplir le tableau KPIs quotidien (`e2e/pilot-incidents.md`). Arriver au bilan J10 avec : "Vos techniciens ont saisi 147 heures via l'app en S2, 0 fiche papier. Le FEC a ete importe dans Sage sans correction. Votre previsionnel montre 45 000 EUR d'encaissements a 30 jours." Les chiffres parlent.

---

## Annexes

### A. Fichiers du pack pilote

| Fichier | Role | Contenu |
|---------|------|---------|
| `PACK-PILOTE.md` | Ce document | Guide complet du pilote |
| `e2e/PILOT-RUNBOOK.md` | Runbook detaille | Scenario jour par jour technique |
| `e2e/README-PILOT.md` | Quick start | Demarrage rapide (1 page) |
| `e2e/QUALIF-REPORT.md` | Rapport qualification | 29/29 tests PASS |
| `e2e/pilot-incidents.md` | Journal d'incidents | A remplir pendant le pilote |
| `PASSATION.md` | Passation technique | Architecture, invariants, troubleshooting |

### B. Contacts support

| Qui | Role | Disponibilite | Contact |
|-----|------|---------------|---------|
| [Nom] | Chef de projet pilote | J1-J10, 9h-18h | [tel/email] |
| [Nom] | Support technique | J1-J10, urgences 24/7 | [tel/email] |

### C. URLs de l'environnement

| Service | URL | Acces |
|---------|-----|-------|
| Application | https://[domaine-client] | Tous les utilisateurs |
| API (health) | https://[domaine-client]/api/health | Verification technique |
| MinIO Console | http://[IP]:9011 | Admin technique uniquement |

*A remplir avant le demarrage du pilote.*
