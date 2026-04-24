# Registre des activités de traitement (RGPD Art. 30)

> Document interne à tenir à jour. Template minimal — le remplissage final doit être validé par le DPO.

## Identité du responsable du traitement

- **Raison sociale** : _À compléter_
- **SIREN / SIRET** : _À compléter_
- **Adresse** : _À compléter_
- **Représentant légal** : _À compléter_
- **DPO (Délégué à la protection des données)** : _À nommer — nom + email dédié_
- **Coordonnées CNIL** : https://www.cnil.fr

---

## Traitements

### T1 — Gestion des comptes utilisateurs

| | |
|---|---|
| Finalité | Authentification, contrôle d'accès, audit interne |
| Base légale | Exécution du contrat (Art. 6.1.b) |
| Catégories de personnes | Salariés et prestataires habilités des entreprises clientes |
| Données traitées | Email, nom, rôle, entité, hash de mot de passe, journaux d'accès, avatar |
| Durée de conservation | Durée du contrat + 3 ans (prescription civile) |
| Destinataires | Administrateurs de l'entreprise cliente, équipe support (sur demande) |
| Transferts hors UE | Non |
| Mesures de sécurité | Hash bcrypt 12 rounds, JWT court terme, refresh tokens rotés, TLS, audit logs |

### T2 — Gestion commerciale et opérationnelle

| | |
|---|---|
| Finalité | Gestion des clients, devis, chantiers, planning, achats |
| Base légale | Exécution du contrat de prestation |
| Catégories de personnes | Clients professionnels, interlocuteurs fournisseurs |
| Données traitées | Nom, raison sociale, email, téléphone, adresse, historique commercial |
| Durée de conservation | Durée de la relation commerciale + 5 ans |
| Destinataires | Utilisateurs habilités de l'entité (client et fournisseur) |
| Transferts hors UE | Non |
| Mesures de sécurité | Contrôle d'accès par `companyId`, audit logs |

### T3 — Facturation et comptabilité

| | |
|---|---|
| Finalité | Émission, conservation et transmission des factures |
| Base légale | Obligation légale (Code de commerce L.123-22, CGI art. 242 nonies A) |
| Catégories de personnes | Clients professionnels |
| Données traitées | Référence facture, montant, TVA, client, échéance, paiement, sceau HMAC |
| Durée de conservation | 10 ans à compter de la clôture de l'exercice |
| Destinataires | Comptable interne, expert-comptable, administration fiscale, futur PDP |
| Transferts hors UE | Non |
| Mesures de sécurité | Immutabilité post-émission, sceau HMAC-SHA256, archivage froid après 9 ans |

### T4 — Données RH (documents, absences, heures, salaires)

| | |
|---|---|
| Finalité | Gestion administrative du personnel |
| Base légale | Obligation légale (Code du travail) + exécution du contrat de travail |
| Catégories de personnes | Salariés |
| Données traitées | Documents contractuels, fiches de paie, heures travaillées, absences, salaire horaire |
| Durée de conservation | Selon nature : contrat de travail 5 ans, bulletins de paie 5 ans (50 ans pour l'assurance maladie) |
| Destinataires | RH, manager direct, salarié concerné |
| Transferts hors UE | Non |
| Mesures de sécurité | Accès rôle-restreint, stockage MinIO chiffré au repos, audit logs |

### T5 — Photos et géolocalisation terrain

| | |
|---|---|
| Finalité | Suivi de chantier, preuve d'intervention |
| Base légale | Exécution du contrat de prestation |
| Catégories de personnes | Salariés terrain |
| Données traitées | Photos (EXIF potentiellement sensible), coordonnées GPS de chantier |
| Durée de conservation | Durée du chantier + 5 ans (preuve contractuelle) |
| Destinataires | Équipe de conduite de travaux, client destinataire du livrable |
| Mesures de sécurité | Accès restreint, suppression automatique EXIF personnelles _À implémenter_ |

### T6 — Fonctionnalités d'Intelligence Artificielle (Anthropic)

| | |
|---|---|
| Finalité | Assistance utilisateur (rédaction, analyse métier, alertes proactives) |
| Base légale | **Consentement explicite (Art. 6.1.a)** — opt-in par utilisateur |
| Catégories de personnes | Utilisateurs ayant activé l'option |
| Données traitées | Contenu texte fourni (devis, factures, mails, questions libres) |
| Durée de conservation | Non conservé côté sous-traitant au-delà du traitement immédiat (voir DPA Anthropic) |
| Destinataires | **Anthropic PBC — États-Unis** |
| Transferts hors UE | **Oui** — encadré par les Clauses Contractuelles Types 2021/914 + DPA Anthropic |
| Mesures de sécurité | Activation par consentement (`aiProcessingConsent`), guard applicatif, audit trail de chaque appel |

### T7 — Journaux d'audit et de sécurité

| | |
|---|---|
| Finalité | Traçabilité, détection d'incidents, preuves |
| Base légale | Intérêt légitime de l'éditeur et du client (sécurité du SI) |
| Catégories de personnes | Utilisateurs du Service |
| Données traitées | Horodatage, userId, action, entité, IP, user-agent, PII masquées |
| Durée de conservation | 3 ans |
| Destinataires | Administrateur du tenant, équipe sécurité éditeur |
| Mesures de sécurité | Masquage PII (emails, téléphones), table WORM logique |

---

## Droits des personnes concernées

Les demandes (accès, rectification, effacement, portabilité, opposition, limitation) sont traitées
sous 30 jours via :
- l'interface utilisateur (`Mon compte` → `Données personnelles`),
- ou par email au DPO.

## Violations de données

Tout incident de sécurité impactant des données personnelles doit être :
1. notifié à la CNIL sous 72h (Art. 33) ;
2. communiqué aux personnes concernées si le risque est élevé (Art. 34).

Un runbook d'incident est à maintenir dans `docs/legal/incident-response.md`.
