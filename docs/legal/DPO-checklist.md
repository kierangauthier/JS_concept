# Checklist DPO — prérequis avant exploitation commerciale

> À cocher et archiver avant toute mise en production facturable.

## Nomination et déclarations

- [ ] DPO désigné (interne ou externe) avec contrat écrit.
- [ ] Déclaration du DPO à la CNIL (formulaire en ligne, gratuit).
- [ ] Coordonnées DPO publiées dans `/confidentialite` et dans le pied de page applicatif.
- [ ] Registre des traitements (`registre-traitements.md`) complété et validé.

## Documents publics

- [ ] `/mentions-legales` : éditeur, hébergeur, directeur publication.
- [ ] `/cgu` : droits/obligations utilisateur, SLA, résiliation.
- [ ] `/cgv` : prix, durée, pénalités, réversibilité.
- [ ] `/confidentialite` : traitements, bases légales, durées, droits, DPO.
- [ ] Cookie banner conforme (pas de dépôt avant consentement non essentiel).

## Contrats sous-traitants

- [ ] DPA signé avec Anthropic (https://www.anthropic.com/legal).
- [ ] DPA signé avec l'hébergeur.
- [ ] DPA signé avec le prestataire SMTP.
- [ ] Clauses contractuelles types 2021/914 annexées pour chaque transfert hors UE.

## Opérationnel

- [ ] Procédure d'exercice des droits (export, erase) testée de bout en bout.
- [ ] Procédure de notification d'incident (<72h) documentée et exercée.
- [ ] Backups chiffrés + test de restauration validé.
- [ ] Chiffrement MinIO (SSE-S3) activé sur les buckets RH.
- [ ] Rotation `JWT_SECRET` et `INVOICE_HMAC_KEY` documentée.
- [ ] Audit logs retenus 3 ans, impossibles à supprimer côté application.

## Consentements

- [ ] Bascule IA désactivée par défaut sur chaque compte.
- [ ] UI d'activation avec rappel du transfert hors UE et lien `/confidentialite`.
- [ ] Stockage de l'horodatage du consentement (`aiProcessingConsentAt`).
- [ ] Révocation facile et effective côté utilisateur.

## Formation

- [ ] Administrateurs tenant : sensibilisation aux demandes d'exercice de droits.
- [ ] Équipe support : procédure d'escalade RGPD.
