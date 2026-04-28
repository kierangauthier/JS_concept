# Transmettre votre Factur-X

ConceptManager **produit** vos factures au format Factur-X conforme. La
**transmission** à votre client (ou à sa plateforme de dématérialisation) est à
votre charge — ce guide explique comment faire selon le cas.

## 1. Télécharger le fichier

1. Ouvrir la facture concernée (page Factures → la ligne correspondante).
2. Cliquer sur le bouton **Factur-X**.
3. Un fichier `.factur-x.en16931.pdf` (ou `.basic.pdf` / `.minimum.pdf` selon ce que contient la facture) est téléchargé sur votre poste.

Ce fichier est à la fois **un PDF lisible** et un **XML structuré** embarqué.
N'importe quel logiciel comptable moderne (Sage, EBP, Cegid, Pennylane, Quadratus,
Cegid Loop, etc.) sait le lire.

## 2. Comment le transmettre

### Cas A — Votre client est une entité publique

Les factures à destination des administrations françaises passent **obligatoirement
par Chorus Pro** (https://chorus-pro.gouv.fr), gratuit.

1. Connectez-vous à Chorus Pro avec le compte de votre entreprise.
2. Menu "Factures émises" → "Déposer une facture".
3. Sélectionnez "Dépôt PDF/A-3 (Factur-X)".
4. Déposez le fichier téléchargé depuis ConceptManager.
5. Chorus Pro fait l'intégralité du travail : validation, transmission, suivi.

### Cas B — Votre client utilise une Plateforme de Dématérialisation Partenaire (PDP)

À partir du 01/09/2026, toutes les factures B2B françaises doivent passer par
une PDP (liste officielle : https://www.impots.gouv.fr/portail-de-la-facturation-electronique).

Votre client vous communiquera **quelle PDP il utilise**. Vous avez alors deux options :

1. **Vous déposez vous-même** le fichier sur votre propre PDP (si vous en avez une) — elle se chargera de le router vers la PDP du destinataire.
2. **Vous confiez à votre expert-comptable** le dépôt (c'est souvent lui qui a un abonnement PDP).

Dans les deux cas, c'est un **simple upload du fichier** que vous avez téléchargé.

### Cas C — Transmission par email (interne ou client petit sans PDP)

Pour des échanges internes ou avec des clients sans obligation de passer par une PDP
(par exemple : particuliers, entités hors UE) :

1. Attacher le `.factur-x.*.pdf` à votre email (comme n'importe quel PDF).
2. Le destinataire peut l'ouvrir visuellement et sa compta peut extraire les données structurées.

## 3. Quel profil choisir ?

ConceptManager choisit **automatiquement** le profil le plus riche que vos données
permettent :

| Profil du fichier | Contenu |
|---|---|
| **EN 16931** (recommandé, défaut) | Totaux + **lignes de facture détaillées** + IBAN + conditions de paiement |
| **BASIC** | Idem EN 16931 (en léger retrait sur quelques champs extension) |
| **MINIMUM** | Totaux seulement |

Le profil est imprimé dans le nom du fichier (`.en16931.pdf` / `.basic.pdf` / `.minimum.pdf`)
et indiqué dans les métadonnées. La plupart des PDP et logiciels préfèrent **EN 16931**.

## 4. Que faire si le bouton Factur-X est grisé ou renvoie une erreur

Le bouton **ne fonctionne pas** dans deux cas :

- **Facture en brouillon** : émettez-la d'abord (statut "Envoyée").
- **Champs légaux manquants** : vous recevez un message listant les champs à compléter. Allez dans **Admin → Paramètres → Entité** et remplissez :
  - Raison sociale légale
  - SIREN / SIRET
  - Numéro TVA intracommunautaire
  - Adresse postale complète
  - IBAN / BIC (optionnel mais recommandé)

## 5. Obligations légales à connaître

- **À partir du 01/09/2026** : vous êtes tenu(e) de pouvoir **recevoir** des
  factures au format Factur-X (Art. 289 bis du CGI). ConceptManager n'est pas
  une PDP et ne reçoit donc pas les factures entrantes pour vous — votre
  expert-comptable ou votre PDP s'en charge.
- **À partir du 01/09/2026 (moyennes et grandes entreprises) / 01/09/2027 (TPE/PME)** :
  vous êtes tenu(e) d'**émettre** des factures Factur-X. ConceptManager le fait.
- **Archivage 10 ans** : obligation issue du Code de commerce, gérée
  automatiquement par ConceptManager (voir `docs/runbooks/backup-and-drp.md`).

## 6. Ressources officielles

- FNFE-MPE (référentiel Factur-X) : https://fnfe-mpe.org/
- Chorus Pro : https://chorus-pro.gouv.fr
- Portail officiel facturation électronique : https://www.impots.gouv.fr/portail-de-la-facturation-electronique
