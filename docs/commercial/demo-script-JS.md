# Script de démo — RDV JS Concept

> Démo live, 15 minutes chrono. À exécuter après la slide 3 du pitch deck.
> Objectif : faire **voir**, pas raconter. Chaque clic doit apporter une valeur visible.

---

## Règles avant la démo

### La veille

- [ ] Tester la démo complète **avec le même compte et les mêmes données** qu'on utilisera.
- [ ] Vérifier que l'outil est accessible (URL qui marche, login qui passe).
- [ ] Préparer un **jeu de données propre et crédible** :
  - 3 clients prêts, dont 1 "Mairie de X" (client public plausible pour JS).
  - 5 prestations dans le catalogue avec des vrais noms BTP signalisation (pose panneau B14, marquage peinture, signalisation temporaire, pose glissière, etc.).
  - 1 chantier déjà créé pour pouvoir y ajouter une facture.
- [ ] **Nettoyer les données démo précédentes** : aucun client "Test", aucune facture "blabla".
- [ ] Screen entier, browser en plein écran, pas de notifications (désactiver Slack/Teams/email pendant la démo).
- [ ] Avoir **un partage 4G** sur le téléphone prêt, au cas où le wifi du client tombe.

### Pendant la démo

- **Parle aux yeux du dirigeant**, pas à l'écran.
- **Clique lentement.** Le dirigeant doit suivre visuellement.
- **Nomme chaque action** : "Je clique ici sur Nouveau devis... et vous voyez, l'outil me propose directement les prestations de votre catalogue."
- **Si un bug arrive** : ne panique pas, ne t'excuse pas 3 fois. Reformule : "On va prendre cet exemple plutôt." et continue.
- **Ne promets jamais** ce que tu n'as pas déjà. Si le prospect dit "Est-ce qu'on peut faire X ?", réponds : "Bonne question, je note. Dans le plan actuel on a Y qui couvre ça. On en reparle si besoin après le démarrage."

---

## Parcours — 15 min précis

### 0:00 — 0:30 — Introduction (30s)

> "Je vais vous montrer ConceptManager en situation réelle, avec un jeu de données représentatif de ce qu'un chantier type pourrait donner chez vous. **15 minutes, on a le temps.**"

**Écran** : page d'accueil de l'outil, dashboard. Laisser voir 3-4 secondes.

---

### 0:30 — 3:00 — Créer un client (2 min 30)

**Contexte parlé** :
> "Un client nouveau arrive, disons la Mairie de Saint-Denis qui vous consulte pour un chantier de signalisation autour d'une école."

**Actions** :
1. Cliquer sur **Clients** dans la navigation.
2. Cliquer sur **+ Nouveau client**.
3. Remplir (rapide, en narrant) :
   - Nom : `Mairie de Saint-Denis`
   - Contact : `Jean Dupont`
   - Email : `jean.dupont@saint-denis.fr`
   - Téléphone : `01 23 45 67 89`
   - Adresse : `2 place Victor Hugo, 93200 Saint-Denis`
   - Type : **Public** (c'est un point à mettre en avant : "On distingue public et privé, c'est important pour la facturation publique obligatoire via Chorus Pro").
4. **Valider**.

**Points à souligner** :
- "Le client est créé en 20 secondes. Aucun champ inutile."
- "Tout ce qu'on saisit ici est réutilisable dans les devis, les factures, les chantiers. Zéro double saisie."

---

### 3:00 — 6:30 — Créer un devis (3 min 30)

**Contexte parlé** :
> "La Mairie vous demande un devis pour 3 prestations de signalisation temporaire autour de l'école. Je vais vous montrer comment vous le faites en 3 minutes."

**Actions** :
1. Cliquer sur **Devis** → **+ Nouveau devis**.
2. Sélectionner le client qu'on vient de créer.
3. Ajouter 3 lignes depuis le catalogue :
   - **Pose panneau B14 limitation 70 km/h** — quantité 4 — prix unitaire 1 200 €
   - **Marquage peinture résine blanc** — quantité 150 m — prix unitaire 28 €
   - **Signalisation temporaire chantier** — forfait — prix 3 450 €
4. L'outil calcule automatiquement : **HT 12 450 €, TVA 20% = 2 490 €, TTC 14 940 €**.
5. Cliquer **Enregistrer**.
6. Cliquer **Aperçu PDF** → montrer le PDF avec le logo JS Concept.
7. Cliquer **Envoyer par email** → préremplir le destinataire, laisser le texte type se charger.

**Points à souligner** :
- "Le catalogue vous fait gagner 80% du temps de saisie. Vous ajoutez votre pose B14 une fois, vous la réutilisez 200 fois."
- "Le PDF sort aux couleurs de votre entreprise, pas aux nôtres. Pas de pub, pas de marque d'eau."
- "L'email avec le devis en pièce jointe part en un clic. Vous suivez dans l'outil s'il a été ouvert, accepté, refusé."

---

### 6:30 — 8:00 — Convertir devis en chantier (1 min 30)

**Contexte parlé** :
> "La Mairie accepte le devis. D'un clic, vous convertissez en chantier. Plus besoin de ressaisir."

**Actions** :
1. Sur le devis, cliquer **Convertir en chantier**.
2. L'outil crée automatiquement :
   - Un chantier lié au client.
   - Les prestations du devis sont copiées dedans.
   - Un numéro de chantier unique est attribué.
3. Montrer la page du chantier : vous avez **client, devis d'origine, prestations, budget prévu, statut**.

**Points à souligner** :
- "Aucune double saisie entre le devis et le chantier."
- "Vous suivez votre marge en temps réel : prévu vs réel. Quand le chantier avance, le budget consommé est là."

---

### 8:00 — 12:00 — **Émettre la facture et le Factur-X** (4 min — MOMENT CLÉ)

**Contexte parlé** :
> "Le chantier est terminé. Vous facturez. Voici **le moment où ConceptManager gagne toute sa valeur pour 2026**."

**Actions** :
1. Sur le chantier, cliquer **Créer une facture**.
2. La facture reprend automatiquement les lignes du chantier.
3. Valider le montant, la date d'échéance.
4. Cliquer **Émettre la facture** → statut passe de `brouillon` à `émise`.
5. **Montrer les 2 boutons** :
   - **PDF classique** (pour le client qui ne veut pas de Factur-X).
   - **Factur-X** (celui qui compte pour 2026).
6. Cliquer **Factur-X**. Le fichier est téléchargé.
7. **Ouvrir le fichier devant le dirigeant** :
   - Il voit le PDF lisible normalement.
   - Cliquer sur le trombone (pièces jointes Adobe) → montrer le fichier `factur-x.xml` embarqué.
8. **Ouvrir le XML dans un éditeur** (Notepad suffit) — juste 5 secondes pour qu'il voie la structure.

**Points à souligner** :
- "Ce fichier, vous pouvez l'envoyer à votre expert-comptable : **il l'importe en 3 secondes** dans son logiciel. Plus de re-saisie de sa part."
- "Vous pouvez le déposer sur **Chorus Pro** pour la Mairie (la transmission publique obligatoire) : il est accepté directement."
- "Vous pouvez l'envoyer par email à votre client privé : **c'est conforme à la loi de 2026**."
- "Et sur le PDF, vous avez nos mentions légales complètes : SIRET, TVA intracom, IBAN, pénalités de retard. Rien à rajouter à la main."

**Si le dirigeant pose la question "et la transmission à la PDP ?"** :
> "La transmission vers la PDP, c'est le métier de votre expert-comptable ou de votre PDP choisie. Nous, on **produit** le fichier conforme. Ce qui fait 95% du travail, et c'est ce qui coûterait 10 000 € chez un concurrent. La transmission elle-même, c'est un upload de fichier."

---

### 12:00 — 13:30 — Le dashboard (1 min 30)

**Contexte parlé** :
> "Et vous, en tant que dirigeant, vous regardez votre activité en temps réel."

**Actions** :
1. Cliquer sur **Dashboard**.
2. Montrer :
   - CA encaissé sur le mois en cours.
   - Marge moyenne sur les chantiers terminés.
   - Créances (factures émises non payées).
   - Alertes : factures en retard, devis qui expirent.
3. Hover sur une alerte → cliquer → on arrive directement sur la ligne concernée.

**Points à souligner** :
- "En 5 secondes, vous avez votre position financière."
- "Les alertes vous font gagner du temps : pas besoin de chercher, l'outil vous dit ce qui demande attention."

---

### 13:30 — 15:00 — Conclusion + lien avec la slide 4 (1 min 30)

**Contexte parlé** :
> "Voilà la démo. Vous avez vu en 15 minutes : un client créé, un devis envoyé, un chantier suivi, une facture Factur-X émise et téléchargée, un pilotage financier. Tout ça dans le même outil, sans double saisie, et prêt pour septembre 2026."

**Points à enchaîner directement vers la slide 4 (prix)** :
> "Maintenant, je vous propose qu'on regarde combien tout ça coûte. Vous allez voir : c'est bien en dessous de ce que vous imaginez."

---

## Pièges à éviter pendant la démo

### Piège 1 — Le "ah attendez, je vais vous montrer aussi..."

Non. 15 min. On tient le script. Les features bonus (IA, terrain mobile, planning avancé, etc.) on les mentionne en **option**, on ne les démontre pas. C'est pour garder :
- La simplicité du message.
- Du temps pour les questions et la négociation prix.
- Une carte à jouer : "l'IA, c'est dans le plan Pro, on peut en parler dans 3 mois quand vous êtes installés".

### Piège 2 — Trop de détails techniques

Un dirigeant de PME ne veut pas savoir **comment** le Factur-X est fabriqué. Il veut savoir que :
- C'est conforme.
- Il n'a rien à faire.
- Ça marche.

Si on te demande des détails techniques, réponse standard : "C'est le format officiel FNFE-MPE, validé par les règles européennes EN 16931. Tous les logiciels comptables en France savent le lire."

### Piège 3 — Dire "c'est facile"

Ne dis jamais "c'est super simple" ou "c'est facile". Le dirigeant va penser :
- Soit "donc ça doit valoir 50 €/mois pas 250 €".
- Soit "si c'est facile, pourquoi vous n'avez pas 1000 clients ?".

Dis plutôt : **"On a passé 18 mois à construire ça pour vous éviter les 18 mois à le construire vous-même."**

### Piège 4 — Répondre "oui" à tout

Si le dirigeant demande "Est-ce que ça peut faire X ?" et que tu n'en es pas sûr : **"Je vérifie et je vous confirme par email demain."** Ne jamais inventer. Ne jamais promettre une feature qui n'existe pas.

---

## Variantes selon les réactions

### Si le dirigeant a l'air engagé / convaincu

Accélérer la slide 4 (prix) et aller directement à la question de clôture : **"Qu'est-ce qui vous empêche de signer cette semaine ?"**

### Si le dirigeant a l'air dubitatif

Ne pas insister. Poser : **"Qu'est-ce que vous n'avez pas vu qui serait indispensable pour vous ?"**. Écouter. Répondre factuellement. Proposer un 2e RDV sous 7 jours avec un focus sur son besoin spécifique.

### Si le dirigeant ne parle pas pendant la démo

Poser des questions **pendant** : "C'est le type de prestation que vous facturez, ça ?", "Votre marquage, vous le facturez au mètre linéaire aussi ?" — pour l'impliquer et vérifier que ce qu'on montre correspond à son métier.

---

## Matériel à emporter

- [ ] Laptop avec l'outil accessible, batterie chargée, chargeur.
- [ ] 4G de secours sur téléphone.
- [ ] Devis papier et contrat papier imprimés en 2 exemplaires chacun (au cas où il voudrait signer en direct — **privilégier DocuSign** quand même).
- [ ] Cartes de visite.
- [ ] **Le logo JS Concept** déjà chargé dans l'outil pour la démo (pas en stock photo).
- [ ] Bloc-notes pour prendre note des demandes / objections pendant la réunion.
