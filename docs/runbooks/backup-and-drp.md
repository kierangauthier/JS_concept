# Backup & Disaster Recovery — Runbook

> À garder à jour. Propriétaire : ops. Revue : tous les trimestres.

## Portée

Trois assets à protéger :

| Asset | Support | RPO cible | RTO cible |
|---|---|---|---|
| Base de données PostgreSQL | serveur + volume Docker | ≤ 24h | ≤ 2h |
| Bucket MinIO (PDF factures, photos, documents RH) | volume `miniodata` | ≤ 24h | ≤ 4h |
| Secrets (`.env`, clés HMAC, JWT) | fichier hors repo | N/A (immuable) | 1h |

> **RPO** (Recovery Point Objective) = tolérance de perte de données.
> **RTO** (Recovery Time Objective) = tolérance d'indisponibilité.

## 1. Backup PostgreSQL

### Stratégie

- **Dump quotidien** (pg_dump, format custom) : conservation 30 jours.
- **Dump hebdomadaire** : conservation 12 mois.
- **Chiffrement** : AES-256 via `gpg` (clé ops, hors du serveur hébergé).
- **Stockage** : second bucket MinIO ou service externe (B2, S3) **dans une autre région**.
- **Vérification** : une restauration de validation par trimestre, consignée ici.

### Script de référence

```bash
#!/usr/bin/env bash
set -euo pipefail
DATE=$(date +%Y-%m-%d)
DUMP="cm-${DATE}.dump"
docker exec -t postgres pg_dump -U "${POSTGRES_USER}" -Fc "${POSTGRES_DB}" > "${DUMP}"
gpg --encrypt --recipient "${OPS_PGP_KEY_ID}" --output "${DUMP}.gpg" "${DUMP}"
rm "${DUMP}"
aws s3 cp "${DUMP}.gpg" "s3://cm-backups/postgres/${DATE}/"
rm "${DUMP}.gpg"
```

### Restauration

```bash
# 1. Télécharger le dump chiffré le plus récent.
aws s3 cp s3://cm-backups/postgres/2026-04-22/cm-2026-04-22.dump.gpg .
gpg --decrypt cm-2026-04-22.dump.gpg > cm.dump
# 2. Monter un conteneur cible vide.
docker compose up -d postgres
# 3. Restaurer.
docker exec -i postgres pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists < cm.dump
```

## 2. Backup MinIO

### Stratégie

- **Replication** `mc mirror` quotidienne vers un second bucket chiffré.
- **Object versioning** activé sur le bucket principal (protège contre un `rm` accidentel).
- **Object lock** en mode `Compliance` pour les PDF de factures émises (rend la suppression impossible pendant 10 ans — cohérent avec la rétention légale).

### Script de référence

```bash
mc alias set src https://minio.example.com $ACCESS $SECRET
mc alias set dst https://backup.example.com $DST_ACCESS $DST_SECRET
mc mirror --overwrite src/concept-files dst/concept-files-backup
```

## 3. Secrets et clés

### Inventaire

- `JWT_SECRET` — signe les JWT d'accès.
- `INVOICE_HMAC_KEY` — scelle les factures (V2.2).
- `POSTGRES_PASSWORD`, `MINIO_ROOT_*`, `ANTHROPIC_API_KEY`.

### Où les stocker

- **Interdit** : repo git, Docker image, Slack, email.
- **Production** : un gestionnaire de secrets (Doppler / Infisical SaaS ; HashiCorp Vault self-hosted).
- **Backup** : copie chiffrée PGP dans un coffre physique hors site (pour survivre à la perte du gestionnaire).

### Rotation

| Secret | Fréquence | Procédure |
|---|---|---|
| `JWT_SECRET` | Tous les 6 mois ou sur compromission | Rotation douce : accepter ancienne+nouvelle 15 min (durée d'un access token), puis invalider tous les refresh tokens → les utilisateurs reconnectent. |
| `INVOICE_HMAC_KEY` | **NE PAS** tourner sans re-sceller | Déclencher une migration qui ré-hash chaque facture scellée avec la nouvelle clé en une transaction. Stocker l'ancienne clé 90 jours en cold storage pour audit. |
| `POSTGRES_PASSWORD` | 12 mois | `ALTER ROLE` + redémarrage API. |
| `MINIO_ROOT_PASSWORD` | 12 mois | Création d'un user app dédié plutôt que rotation root. |
| `ANTHROPIC_API_KEY` | Immédiat sur compromise | Révoquer côté Anthropic, régénérer, redéployer. |

## 4. Tests de restauration

| Date | Type | Résultat | Notes |
|---|---|---|---|
| À remplir | | | |

Obligation : au moins **une restauration complète par trimestre** (DB + MinIO), horodatée ci-dessus. Une sauvegarde non testée = aucune sauvegarde.

## 5. Plan de continuité (DRP)

### Scénario — perte totale du serveur hébergeant PostgreSQL

1. Lancer un nouvel hôte Docker à partir de l'image API et du compose `docker-compose.yml`.
2. Télécharger le dump le plus récent depuis le bucket backup.
3. Restaurer (commande §1).
4. Mettre à jour DNS si nécessaire.
5. Smoke test : `GET /api/ready` doit renvoyer `status: 'ok'`, puis login avec un compte de test.
6. Notifier les utilisateurs (templates email dans `docs/runbooks/notify-users.md` — à créer).

### Scénario — fuite suspectée de `INVOICE_HMAC_KEY`

1. Générer une nouvelle clé.
2. Lancer la migration de re-sceau (à préparer, voir `scripts/reseal-invoices.ts`, actuellement non fourni).
3. Conserver l'ancienne clé 90 jours en coffre pour re-vérifier l'intégrité de l'historique.
4. Déclarer un incident de sécurité, notifier le DPO. Évaluer l'obligation de notification CNIL (Art. 33 : 72h).

### Scénario — fuite de données

1. Isoler (fermer accès réseau, révoquer tokens si pertinent).
2. Préserver les preuves (copie des journaux d'audit).
3. Évaluer l'impact sur les personnes concernées.
4. Notification CNIL sous 72h (Art. 33 RGPD).
5. Notification aux personnes concernées si risque élevé (Art. 34).
6. Rapport post-mortem dans `docs/incidents/`.

## Contacts

- **Ops primaire** : _À compléter_
- **Ops secondaire** : _À compléter_
- **DPO** : _À nommer_
- **Hébergeur** : _À configurer_
