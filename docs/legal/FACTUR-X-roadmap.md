# Factur-X — feuille de route technique

## Ce qui est livré (V6)

- [x] **Générateur XML multi-profil** (`api/src/invoices/facturx.generator.ts`) :
      MINIMUM, BASIC, EN 16931 — sélection automatique du plus riche selon les données disponibles, `EN 16931` par défaut (recommandé par Sage).
- [x] **Pipeline PDF/A-3 hybride** (`api/src/invoices/facturx-pdf.service.ts`) :
      pdfmake → Ghostscript (`-dPDFA=3`) → pdf-lib (attachement XML + XMP Factur-X).
- [x] **Endpoint REST principal** `GET /api/invoices/:id/facturx` → PDF/A-3 hybride à télécharger.
- [x] **Endpoint XML seul** `GET /api/invoices/:id/facturx.xml` pour les PDP qui préfèrent ingérer le XML pur.
- [x] **Fail-fast** sur champs légaux manquants (422 avec la liste des champs).
- [x] **Bouton UI** « Factur-X » dans la page Factures, avec toast explicite si champs manquants.
- [x] **Intégrité facture** scellée par HMAC-SHA256 à l'émission.
- [x] **Immutabilité** + **suppression interdite** sur facture émise.
- [x] **Mentions légales** (SIREN / TVA intracom / IBAN / capital / RCS) lues depuis `Company`.
- [x] **Ghostscript** installé dans `api/Dockerfile` (paquet `ghostscript` Alpine).
- [x] **Tests unitaires** sur le générateur XML (multi-profil, VAT modes, escaping).
- [x] **Guide utilisateur** `docs/user/transmettre-factur-x.md`.

## Positionnement produit

ConceptManager **produit** le format Factur-X conforme. Il **n'est pas** une
Plateforme de Dématérialisation Partenaire (PDP) et n'en sera pas une. La
transmission (Chorus Pro, PDP privée, email) est à la charge du client ou de
son comptable. Ce choix est :

- Inscrit dans les CGV et la page de téléchargement.
- Documenté pour l'utilisateur final dans `docs/user/transmettre-factur-x.md`.

## Ce qui reste optionnel / à décider

### Validation EN 16931 en CI

Ajouter `mustangproject` (Java, open source) ou `veraPDF` dans le pipeline CI
pour valider un PDF/A-3 de référence à chaque commit. Recommandé **avant
pentest**, pas bloquant pour la livraison.

Implémentation : job supplémentaire dans `.github/workflows/ci.yml` qui télécharge le
JAR mustangproject et lance `java -jar mustang-cli.jar --action validate
--source seed/sample.factur-x.pdf`.

### Réception Factur-X (optionnel, selon positionnement)

Si le produit se met à servir aussi côté "réception de factures fournisseurs",
prévoir un nouveau modèle `IncomingInvoice` et un endpoint
`POST /api/invoices/inbound`. Hors scope en l'état : on produit, on ne reçoit pas.

### Export Sage-spécifique

Sage recommande EN 16931 mais son import a des préférences (ex : unités toujours
en C62 si possible, code TVA S préféré à Z). Le générateur actuel respecte déjà ces
conventions ; à tester sur une instance Sage réelle le moment venu.

## Licences

- **Ghostscript** : licence AGPL v3 (copie libre). Utilisé **comme outil en
  ligne de commande non modifié** depuis un service backend — cet usage ne
  déclenche pas les obligations AGPL de distribution (FAQ Artifex, pratique
  industrie). Mention dans `/mentions-legales` par courtoisie.
- **pdf-lib** : MIT.
- **pdfmake** : MIT.

## Contraintes pour le schéma facture actuel

Le générateur XML utilise :
- `company.legalName`, `siret`, `vatNumber`, `addressLine1`, `postalCode`, `city`, `countryCode`
- `client.name`, `address`, `city`
- `invoice.reference`, `issuedAt`, `dueDate`, `amount`, `vatRate`

Ces champs **doivent** être remplis dans l'interface Admin avant émission. Prévoir une
validation bloquante côté backend quand l'endpoint `GET /api/invoices/:id/facturx` est
appelé sur une facture incomplète (404 clair plutôt qu'un XML dégradé).

## Contact PDP

- **Chorus Pro** : https://chorus-pro.gouv.fr/
- **FNFE-MPE (référentiel Factur-X)** : https://fnfe-mpe.org/

## Sceau d'intégrité et Factur-X

Le hash HMAC-SHA256 stocké dans `integrityHash` est affiché dans le footer du PDF. Il
n'a pas de valeur légale en soi (la DGFiP exige une piste d'audit fiable — PAF — pour les
factures dématérialisées). Pour la **PAF**, trois options :
1. signature électronique qualifiée eIDAS ;
2. EDI structuré ;
3. contrôles permanents documentés (rapprochements, séparation des fonctions).

Le sceau HMAC est un contrôle interne (détection d'altération) qui vient **compléter** la
PAF choisie, pas la remplacer.
