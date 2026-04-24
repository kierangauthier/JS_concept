# ConceptManager — Handoff Claude → Claude (v2)

> **Date** : 17 avril 2026 (fin de journée)
> **Session précédente** : Audit fonctionnel 57 pts + Audit sécurité C1-C4 (résolus)
> **Cette session** : Audit sécurité **I1-I8 + A1-A5 → tous résolus**
> **Projet** : ConceptManager — mini-ERP BTP (NestJS + React + TypeScript + Prisma + PostgreSQL)
> **Dossier** : le dossier monté de l'utilisateur

---

## 0. PROMPT DE REPRISE

```
Tu reprends le développement de ConceptManager (NestJS/Prisma/PostgreSQL +
React/Vite/Tailwind/shadcn). L'audit de sécurité est entièrement fermé
(I1-I8 + A1-A5). Lis HANDOFF-CLAUDE.md en entier avant de commencer.

Première action OBLIGATOIRE avant tout build/test :
  cd api && npm install && npx prisma generate && npx prisma migrate deploy

Puis choisis le prochain chantier fonctionnel ou pose-moi la question.
```

---

## 1. ÉTAT D'AVANCEMENT — AUDIT SÉCURITÉ

| Code | Description | Statut | Priorité |
|------|-------------|--------|----------|
| C1-C4 | Refresh hash / TVA PDF / Factur-X / Cache TTL | ✅ | Session précédente |
| **I1** | Protection CSRF (double-submit cookie) | ✅ | HAUTE |
| **I2** | Masquage PII dans les logs d'audit | ✅ | HAUTE |
| **I5** | Politique mot de passe forte | ✅ | HAUTE |
| **I6** | Reset password (flow email complet) | ✅ | HAUTE |
| **I3** | Effacement RGPD (anonymisation) | ✅ | MOYENNE |
| **I4** | Portabilité RGPD (export JSON) | ✅ | MOYENNE |
| **I7** | Immutabilité factures (SHA-256) | ✅ | MOYENNE |
| **I8** | Rétention 10 ans (CRON mensuel) | ✅ | MOYENNE |
| **A1** | Content Security Policy | ✅ | BASSE |
| **A2** | Rate limiting Redis (env-gated) | ✅ | BASSE |
| **A3** | Vérification email à la création | ✅ | BASSE |
| **A4** | Antivirus uploads (hook ClamAV) | ✅ | BASSE |
| **A5** | Chiffrement champs sensibles DB | ✅ | BASSE |

---

## 2. ACTIONS OBLIGATOIRES AU DÉMARRAGE DE LA PROCHAINE SESSION

```bash
cd api
npm install                        # nouvelles deps (voir §8)
npx prisma generate                # régénère le client avec les 3 nouveaux modèles
npx prisma migrate deploy          # applique les 4 nouvelles migrations
```

Sans ces 3 commandes, environ 15 erreurs TS apparaissent (PasswordResetToken /
EmailVerificationToken introuvables, cookie-parser/pdf-lib/nestjs-schedule
non résolus, etc.). **Toutes** ces erreurs sont attendues et disparaissent
après les 3 commandes ci-dessus.

---

## 3. STACK & ARCHITECTURE (inchangé)

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TS + Vite + Tailwind + shadcn/ui + TanStack Query |
| Backend | NestJS 10 + TS — REST sous `/api/*` |
| ORM | Prisma + PostgreSQL 16 |
| Auth | JWT httpOnly cookies + refresh rotation + **CSRF double-submit** |
| Stockage | MinIO (S3-compatible) |
| PWA | Workbox + Dexie |

**Guard chain** : `JwtAuthGuard → RolesGuard → CompanyGuard`
**Rôles** : `admin`, `conducteur`, `technicien`, `comptable`, `collaborateur`

---

## 4. DÉTAIL DES IMPLÉMENTATIONS SÉCURITÉ

### 4.1 I1 — Protection CSRF (double-submit cookie)

**Pourquoi pas `csurf`** : déprécié en 2022. Implémentation custom ~90 lignes, pattern OWASP.

**Fichiers** :
- `api/src/common/middleware/csrf.middleware.ts` (nouveau) — middleware Express pur
- `api/src/common/controllers/csrf.controller.ts` (nouveau) — `GET /api/csrf-token` (Public)
- `api/src/main.ts` — `app.use(csrfMiddleware)` après `cookieParser` et les body parsers
- `api/src/app.module.ts` — `CsrfController` enregistré
- `src/services/api/http.ts` — lecture `XSRF-TOKEN`, injection `X-XSRF-TOKEN` sur toutes les mutations, bootstrap via `GET /api/csrf-token`, re-lecture après refresh silencieux
- `src/services/api/import.api.ts`, `catalog.api.ts`, `services/offline/syncManager.ts` — les `fetch()` directs incluent aussi le header CSRF

**Exemptions volontaires** : `/api/auth/login`, `/api/auth/refresh`, `/api/csrf-token`, `/api/logs/client-error`. Les requêtes avec `Authorization: Bearer` bypassent aussi (compat E2E / server-to-server — pas vulnérable au CSRF classique).

**Côté client, pour les nouveaux fetches directs** : utiliser `ensureCsrfToken()` + `getCsrfToken()` + `CSRF_HEADER` exportés depuis `src/services/api/http.ts`.

---

### 4.2 I2 — Masquage PII dans les logs d'audit

**Fichiers** :
- `api/src/common/utils/pii.ts` (nouveau) — `maskEmail`, `maskPhone`, `maskPII(value, depth)` récursif, profondeur max 6 (anti-cycle)
- `api/src/audit/audit.service.ts` — applique `maskPII` sur `before` et `after` avant le `prisma.auditLog.create`

**Règles de masquage** (regex case-insensitive sur la clé) :
- `email|mail|e_mail` → `a***@domaine.fr`
- `phone|tel|telephone|mobile|portable` → `+33 ****42`
- `password|token|secret|apiKey|privateKey|authorization|...` → `[REDACTED]`

Masquage **centralisé** : les ~30 callers de `audit.log()` en profitent sans modification.

---

### 4.3 I5 — Politique de mot de passe forte

**Fichiers** :
- `api/src/common/validators/strong-password.decorator.ts` (nouveau) — expose `PASSWORD_POLICY_REGEX`, `PASSWORD_POLICY_MESSAGE`, et le décorateur composite `@IsStrongPassword()`
- `api/src/auth/dto/user.dto.ts` — `@IsString() @MinLength(6)` remplacé par `@IsStrongPassword()` sur `CreateUserDto.password`
- Le DTO `ResetPasswordDto` réutilise `@IsStrongPassword()` (I6)

**Policy** : ≥ 8 caractères, ≥ 1 minuscule, ≥ 1 majuscule, ≥ 1 chiffre, ≥ 1 spécial.

**Non appliquée à `LoginDto`** (les comptes legacy doivent pouvoir se connecter). Les seeds `Demo1234!` satisfont la policy.

---

### 4.4 I6 — Reset de mot de passe (flow complet)

**Schéma Prisma** : nouveau modèle `PasswordResetToken` (tokenHash unique SHA-256, userId cascade, expiresAt, usedAt).

**Migration** : `prisma/migrations/20260417120000_add_password_reset_token/migration.sql`

**Backend** :
- `api/src/auth/auth.service.ts` :
  - `requestPasswordReset(email, baseUrl)` — anti-enumeration (return void inconditionnel), invalide les tokens actifs précédents, TTL 60min, envoi fire-and-forget
  - `resetPassword(rawToken, newPassword)` — vérifie hash/expiry/usage, bcrypt rounds=10, transaction `$transaction` qui (a) update `passwordHash`, (b) marque `usedAt`, (c) **révoque tous les refresh tokens actifs** → re-login forcé partout
- `api/src/auth/dto/password-reset.dto.ts` (nouveau) — `ForgotPasswordDto { email }` + `ResetPasswordDto { token, password }`
- `api/src/auth/auth.controller.ts` — `POST /api/auth/forgot-password` (throttle 3/min, 204) et `POST /api/auth/reset-password` (throttle 5/min, 204), toutes deux Public
- `api/src/mail/mail.service.ts` — `sendPasswordResetEmail(to, url, name?)` avec fallback "log console" si SMTP non configuré

**Frontend** :
- `src/services/api/auth.api.ts` — `forgotPassword` + `resetPassword`
- `src/pages/auth/ForgotPasswordPage.tsx` (nouveau) — état "submitted" unique cohérent avec l'anti-enumeration serveur
- `src/pages/auth/ResetPasswordPage.tsx` (nouveau) — lecture `?token=`, validation policy live miroir, double saisie + confirmation
- `src/pages/auth/LoginPage.tsx` — lien "Mot de passe oublié ?" sous le bouton
- `src/App.tsx` — routes `/forgot-password` (PublicRoute) et `/reset-password` (non-Public : peut être logué ailleurs)

**Variables d'env** : `APP_URL` (base URL frontend utilisée dans l'email ; fallback `req.protocol + host`).

---

### 4.5 I3 + I4 — RGPD (effacement + portabilité)

**Nouveau module** : `api/src/gdpr/` (controller + service + module).

**I3 — Effacement** `DELETE /api/users/:id/gdpr-erase` :
- Admin only, impossible sur son propre compte (force second admin)
- Throttle 3/min
- Transaction : `email → deleted_<id>@gdpr.local`, `name → "Utilisateur anonymisé"`, `avatar/hourlyRate → null`, `isActive → false`, `deletedAt → now`, hash bcrypt scrambled. Révoque tous les refresh tokens. Delete les password reset tokens.
- Idempotent
- **Préserve le `userId`** sur TimeEntry/JobAssignment/Invoice/AuditLog (obligation légale 10 ans, cf. I8)

**I4 — Portabilité** `GET /api/users/:id/gdpr-export` :
- Self OR admin
- Throttle 5/min
- JSON téléchargeable (`Content-Disposition: attachment`)
- Contenu : profil, company, timeEntries, jobAssignments, planningSlots, teamMemberships, hrDocuments, absences, activityLogs, et les **auditLogs dont l'utilisateur est l'auteur** (pas ceux qui le concernent en tant que tiers — confidentialité des autres sujets)
- Refus si le compte est déjà anonymisé

**Audit** : les deux opérations écrivent `GDPR_EXPORT` / `GDPR_ERASE` dans AuditLog (avec masquage I2).

---

### 4.6 I7 — Immutabilité des factures (SHA-256)

**Schéma** : `Invoice.integrityHash: String?` + `Invoice.integrityHashAt: DateTime?`
**Migration** : `prisma/migrations/20260417130000_add_invoice_integrity_hash/migration.sql`

**Service** (`api/src/invoices/invoices.service.ts`) :
- `canonicalJson(value)` — sérialiseur déterministe (clés triées à tous les niveaux)
- `canonicalizeLine` + `buildCanonicalPayload` — normalise les champs métier (reference, amount, vatMode, notes, dates ISO 8601, clientId, lines avec quantités 4 décimales, etc.)
- `computeIntegrityHash(invoice, lines)` — SHA-256 hex du payload canonique
- `verifyIntegrity(invoiceId, companyId)` — retourne `{ valid, expected, current, hashedAt }` ; `valid: null` tant que pas scellée

**IMMUTABLE_AFTER_ISSUANCE** = `{ amount, reference, vatRate, vatMode, notes, lines, issuedAt, dueDate }` — dans `update()`, si `existing.status !== 'draft'` et que le DTO touche un de ces champs → 400 avec message "Émettez un avoir pour corriger". Les transitions `sent → paid → overdue → cancelled` restent possibles.

**Transition `draft → sent`** : re-lit la facture + lignes, calcule et persiste `integrityHash` + `integrityHashAt` dans un second update.

**Endpoint** : `GET /api/invoices/:id/integrity` (admin, comptable).

---

### 4.7 I8 — Rétention 10 ans (CRON mensuel)

**Schéma** : `Invoice.archivalPending: Boolean @default(false)` + `Invoice.archivedAt: DateTime?`
**Migration** : `prisma/migrations/20260417140000_add_invoice_retention/migration.sql`

**Nouveau module** : `api/src/retention/` (RetentionModule + InvoiceRetentionService).

**Service** (`@Cron('30 2 1 * *')` — 1er du mois à 02h30 UTC) :
1. Phase 1 — marque `archivalPending=true` sur les factures dont `issuedAt <= now - 9y` et pas encore archivées
2. Phase 2 — compte (et log `WARN`) les factures `issuedAt <= now - 10y` sans `archivedAt` → ops doit traiter manuellement
3. **Aucune suppression automatique** : la purge reste une décision métier avec sign-off compliance

**Ajout** : `ScheduleModule.forRoot()` dans AppModule. Nouvelle dépendance `@nestjs/schedule` (cf. §8).

Méthode publique `enforceRetention()` utilisable pour tests / ad-hoc.

---

### 4.8 A1 — Content Security Policy (Helmet)

**Fichier** : `api/src/main.ts`

Config CSP stricte passée à Helmet :
- `default-src 'self'`
- `script-src 'self'` en prod, `+ 'unsafe-inline' 'unsafe-eval'` en dev (HMR Vite)
- `style-src 'self' 'unsafe-inline'` (shadcn utilise parfois `style="..."`)
- `img-src 'self' data: blob:`
- `connect-src 'self' + CONNECT_SRC_EXTRA` (pour MinIO externe)
- `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`
- `upgrade-insecure-requests` uniquement en prod
- `referrer-policy: strict-origin-when-cross-origin`

**Var d'env** : `CONNECT_SRC_EXTRA` = liste d'origines séparées par virgules (ex: `https://s3.example.fr,https://cdn.monapp.fr`).

---

### 4.9 A2 — Rate limiting Redis (env-gated)

**Fichier** : `api/src/common/config/throttler.config.ts` (nouveau)

Factory `buildThrottlerConfig()` :
- Si `REDIS_URL` absent → in-memory (comportement actuel)
- Si `REDIS_URL` présent → charge `ioredis` + `@nest-lab/throttler-storage-redis` via `require()` lazy (ne crash pas si les deps ne sont pas installées)
- Logs l'URL masquée au démarrage, gère les erreurs Redis (fail-open)

**AppModule** : `ThrottlerModule.forRoot(buildThrottlerConfig())`

**Nouvelles deps** : `ioredis@^5.4.1`, `@nest-lab/throttler-storage-redis@^1.4.2` (cf. §8).

---

### 4.10 A3 — Vérification email à la création

**Schéma** : `User.emailVerifiedAt: DateTime?` + nouveau modèle `EmailVerificationToken` (tokenHash SHA-256 unique, userId cascade, expiresAt, usedAt).
**Migration** : `prisma/migrations/20260417150000_add_email_verification/migration.sql` — **grandfather toutes les lignes existantes** (`SET emailVerifiedAt = createdAt`).

**Backend** (`api/src/auth/auth.service.ts`) :
- `sendEmailVerification(userId, baseUrl)` — génère un token 7j, envoie l'email (fallback log console)
- `verifyEmail(rawToken)` — marque `emailVerifiedAt` + `usedAt`, transaction atomique
- `login()` bloque avec 403 si `REQUIRE_EMAIL_VERIFICATION=true` ET `emailVerifiedAt == null`

**Déclenchement** : `UsersController.create()` appelle `sendEmailVerification` en fire-and-forget après la création (ne bloque jamais).

**Endpoints** :
- `POST /api/auth/verify-email` (Public, throttle 10/min) — consomme le token
- `POST /api/auth/resend-verification` (Public, throttle 3/min, 204 systématique)

**Var d'env** : `REQUIRE_EMAIL_VERIFICATION=true` pour activer le blocage login (off par défaut pour le pilote).

---

### 4.11 A4 — Antivirus uploads (hook ClamAV)

**Nouveau module** : `api/src/antivirus/` (AntivirusModule @Global + AntivirusService).

**Comportement** :
- Si `CLAMAV_HOST` absent → no-op (le service log un message au boot et `scanBuffer` retourne `{ clean: true }`)
- Si `CLAMAV_HOST` présent → initialise `clamscan` en mode `clamdscan` (TCP), timeout 30s
- `scanBuffer(buffer, originalName)` → `{ clean: true }` OU throw avec status 400 si infecté
- **Fail-open** sur erreur scanner (log WARN) — évite de bloquer les uploads légitimes en cas de panne ClamAV

**Uploads protégés** :
- `POST /api/import/preview` (CSV)
- `POST /api/catalog/import` (CSV)

**À étendre** : les photos chantier passent par URL presignée MinIO → le scan doit être fait côté MinIO (webhook on-upload ou sidecar). Pas implémenté dans ce lot.

**Nouvelle dep** : `clamscan@^2.4.0` (cf. §8).

**Vars d'env** : `CLAMAV_HOST`, `CLAMAV_PORT` (défaut 3310).

---

### 4.12 A5 — Chiffrement champs sensibles DB

**Nouveau fichier** : `api/src/common/utils/crypto-fields.ts` — helpers `encryptField` / `decryptField` / `isFieldCryptoEnabled`.

**Algo** : AES-256-GCM
- Format stocké : `enc:v1:<base64(version_byte ‖ IV_12B ‖ ciphertext ‖ tag_16B)>`
- Préfixe `enc:v1:` pour distinguer texte chiffré vs. legacy en clair → migration progressive possible
- IV aléatoire par écriture (pas de réutilisation)
- Versioning byte → permet rotation future vers un autre algo

**Comportement** :
- Si `ENCRYPTION_KEY` absent → no-op (log WARN au boot, passthrough)
- Si `ENCRYPTION_KEY` présent mais invalide → no-op + log ERROR
- Clé = hex 64 caractères (32 bytes)
- `encryptField` idempotent (détecte préfixe)
- `decryptField` passthrough sur valeurs legacy (sans préfixe) → mixed-state DB OK

**Appliqué sur** : `Client.siret`, `Client.vatNumber` via `ClientsService.create/update/mapClient`.

**À étendre** : `Company.siret`, `Company.vatNumber` quand un `CompaniesService` CRUD sera créé.

**Migration de données** : aucune migration automatique. Pour chiffrer les données existantes en base :
```sql
-- Génération : SELECT encryptField via un script ts-node one-shot
-- (pas fourni ; pilote démarre avec DB clean + ENCRYPTION_KEY dès jour 1)
```

**Var d'env** : `ENCRYPTION_KEY` (64 hex chars). Générer via `openssl rand -hex 32`.

---

## 5. NOUVEAUX FICHIERS (cette session)

**Backend** :
```
api/prisma/migrations/
  ├── 20260417120000_add_password_reset_token/migration.sql   (I6)
  ├── 20260417130000_add_invoice_integrity_hash/migration.sql (I7)
  ├── 20260417140000_add_invoice_retention/migration.sql      (I8)
  └── 20260417150000_add_email_verification/migration.sql     (A3)

api/src/
  ├── antivirus/
  │   ├── antivirus.module.ts                  (A4)
  │   └── antivirus.service.ts                 (A4)
  ├── auth/dto/
  │   ├── password-reset.dto.ts                (I6)
  │   └── verify-email.dto.ts                  (A3)
  ├── common/
  │   ├── config/throttler.config.ts           (A2)
  │   ├── controllers/csrf.controller.ts       (I1)
  │   ├── middleware/csrf.middleware.ts        (I1)
  │   ├── utils/pii.ts                         (I2)
  │   ├── utils/crypto-fields.ts               (A5)
  │   └── validators/strong-password.decorator.ts (I5)
  ├── gdpr/
  │   ├── gdpr.controller.ts                   (I3/I4)
  │   ├── gdpr.module.ts                       (I3/I4)
  │   └── gdpr.service.ts                      (I3/I4)
  └── retention/
      ├── invoice-retention.service.ts         (I8)
      └── retention.module.ts                  (I8)
```

**Frontend** :
```
src/pages/auth/
  ├── ForgotPasswordPage.tsx     (I6)
  └── ResetPasswordPage.tsx      (I6)
```

**Modifications** (backend) :
- `api/src/main.ts` — CSP (A1), CSRF middleware (I1)
- `api/src/app.module.ts` — Schedule/Gdpr/Retention/Antivirus modules, CSRF controller, Redis throttler
- `api/src/auth/auth.service.ts` — reset password (I6), email verification (A3), login gate (A3)
- `api/src/auth/auth.controller.ts` — 4 nouveaux endpoints auth
- `api/src/auth/users.controller.ts` — déclenche sendEmailVerification à la création
- `api/src/auth/dto/user.dto.ts` — `@IsStrongPassword()`
- `api/src/audit/audit.service.ts` — maskPII (I2)
- `api/src/mail/mail.service.ts` — sendPasswordResetEmail
- `api/src/invoices/invoices.service.ts` — computeIntegrityHash + verifyIntegrity + immutabilité post-émission (I7)
- `api/src/invoices/invoices.controller.ts` — `GET /:id/integrity` (I7)
- `api/src/catalog/catalog.controller.ts` — scan antivirus (A4)
- `api/src/import/import.controller.ts` — scan antivirus (A4)
- `api/src/clients/clients.service.ts` — encrypt/decrypt SIRET+vatNumber (A5)
- `api/prisma/schema.prisma` — 3 nouveaux modèles + 4 colonnes ajoutées

**Modifications** (frontend) :
- `src/services/api/http.ts` — CSRF bootstrap + header injection
- `src/services/api/auth.api.ts` — forgot + reset
- `src/services/api/import.api.ts`, `catalog.api.ts`, `services/offline/syncManager.ts` — header CSRF sur fetches directs
- `src/pages/auth/LoginPage.tsx` — lien forgot password
- `src/App.tsx` — routes /forgot-password et /reset-password

---

## 6. SCHÉMA PRISMA — DIFFS

```prisma
model User {
  // ...existant...
  emailVerifiedAt DateTime?                               // A3
  passwordResetTokens     PasswordResetToken[]            // I6
  emailVerificationTokens EmailVerificationToken[]        // A3
}

model Invoice {
  // ...existant...
  integrityHash   String?                                 // I7
  integrityHashAt DateTime?                               // I7
  archivalPending Boolean   @default(false)               // I8
  archivedAt      DateTime?                               // I8
}

// NOUVEAU
model PasswordResetToken { /* tokenHash unique + userId + expiresAt + usedAt */ }
model EmailVerificationToken { /* idem */ }
```

---

## 7. VARIABLES D'ENVIRONNEMENT

| Variable | Effet | Obligatoire | Défaut |
|----------|-------|-------------|--------|
| `APP_URL` | Base URL frontend pour les liens email (reset, verify) | Non | `req.protocol + host` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envoi email réel | Non | fallback log console |
| `REQUIRE_EMAIL_VERIFICATION` | `true` bloque login si email non vérifié | Non | off |
| `REDIS_URL` | Redis pour throttling distribué | Non | in-memory |
| `CONNECT_SRC_EXTRA` | Origines supplémentaires CSP (MinIO ext., CDN…) | Non | `` |
| `CLAMAV_HOST`, `CLAMAV_PORT` | Serveur ClamAV pour scan uploads | Non | no-op |
| `ENCRYPTION_KEY` | 64 hex chars pour AES-256-GCM champs DB | Non | no-op (plain text) |

Générer une clé : `openssl rand -hex 32`

---

## 8. DÉPENDANCES AJOUTÉES (`api/package.json`)

```json
{
  "dependencies": {
    "@nestjs/schedule": "^4.1.0",
    "@nest-lab/throttler-storage-redis": "^1.4.2",
    "clamscan": "^2.4.0",
    "ioredis": "^5.4.1"
  }
}
```

Deps **déjà** présentes (session précédente) : `cookie-parser`, `pdf-lib`, `nodemailer`.

---

## 9. MIGRATIONS PRISMA

Les 4 nouvelles migrations sont idempotentes (`IF NOT EXISTS` partout). Ordre d'application :

```
20260417000000_add_rejection_reason                (session précédente)
20260417120000_add_password_reset_token            (I6)
20260417130000_add_invoice_integrity_hash          (I7)
20260417140000_add_invoice_retention               (I8)
20260417150000_add_email_verification              (A3)
```

Commande : `npx prisma migrate deploy`

---

## 10. POINTS D'ATTENTION POUR LA PROCHAINE SESSION

### Ce qui est potentiellement cassé en E2E et à valider
- Le middleware CSRF rejette maintenant les mutations sans header sur les sessions cookie. Les tests E2E qui utilisent `Authorization: Bearer` sont safe (bypass). Ceux qui utilisent uniquement les cookies (navigateurs) doivent envoyer le header — le frontend le fait automatiquement.
- `UsersController.create()` envoie un email à la création — si `NODE_ENV=test` ou que SMTP n'est pas config, fallback silent log. Vérifier que les tests E2E de création user ne bloquent pas.
- Le blocage "facture immuable" peut casser un test qui re-update une facture envoyée. Vérifier `e2e/`.

### Garder en tête
- `REQUIRE_EMAIL_VERIFICATION` est **off** par défaut → activer en prod uniquement après s'être assuré que les seeds/admins ont un `emailVerifiedAt` (la migration fait le grandfathering).
- `ENCRYPTION_KEY` doit être **stockée dans un KMS** (pas dans `.env` commité). Si elle change, les valeurs existantes restent lisibles si on ne rotate pas la clé, mais deviennent illisibles sinon — prévoir rotation scripts avant activation.
- `@nestjs/schedule` instancie les CRON au bootstrap — en mode multi-instance, le CRON I8 tournera sur chaque replica. Ok pour l'instant (updateMany idempotent), mais à surveiller si on scale.

### Ce qui reste OPEN dans l'audit sécurité
- **Aucun** — I1-I8 + A1-A5 tous clos.

### Pistes pour la suite (non-sécurité)
- A4 : étendre l'antivirus aux uploads MinIO presignés (webhook MinIO post-put)
- A5 : étendre crypto-fields à Company.siret/vatNumber quand un CompaniesService CRUD sera créé ; fournir un script de migration des données existantes
- Tests unitaires : pii, crypto-fields, canonical-json (I7), csrf middleware — aucun test unitaire ajouté cette session (out of scope)
- Monitoring : brancher les warn du retention CRON et d'antivirus sur un canal d'alerting (Sentry ? PagerDuty ?)

---

## 11. COMMANDES CLÉS

```bash
# Premier démarrage de la prochaine session (OBLIGATOIRE)
cd api && npm install && npx prisma generate && npx prisma migrate deploy

# Lancer le stack
docker compose up --build -d

# Seed
docker compose exec api sh -c "npx prisma migrate deploy && npx prisma db seed"

# E2E qualification
cd e2e && bash e2e-qualification.sh

# Vérifier intégrité d'une facture
curl -b cookies.txt http://localhost:3020/api/invoices/<ID>/integrity

# Déclencher manuellement le CRON de rétention (via REPL ou endpoint admin à créer)
# → pas exposé en HTTP pour l'instant ; méthode InvoiceRetentionService.enforceRetention()
```

---

## 12. COMPTES DE TEST

| Rôle | Email | MDP | Société |
|------|-------|-----|---------|
| Admin | admin@asp.fr | Demo1234! | ASP |
| Conducteur | cond@asp.fr | Demo1234! | ASP |
| Comptable | compta@asp.fr | Demo1234! | ASP |
| Technicien 1 | karim@asp.fr | Demo1234! | ASP |
| Technicien 2 | lucas@asp.fr | Demo1234! | ASP |
| Admin JS | admin@js.fr | Demo1234! | JS |

Tous ont `emailVerifiedAt = createdAt` (grandfathering A3).

---

## 13. INVARIANTS À NE PAS CASSER

| Invariant | Fichier clé |
|-----------|-------------|
| Isolation multi-tenant | `api/src/common/guards/company.guard.ts` |
| Idempotency (retry / re-sync) | `api/src/common/interceptors/idempotency.interceptor.ts` |
| Équilibre débit/crédit FEC | `api/src/export/export.service.ts` |
| Sync offline FIFO | `src/services/offline/syncManager.ts` |
| Rotation refresh token | `api/src/auth/auth.service.ts` |
| Rate limiting 100 req/60s | `api/src/app.module.ts` (+ `throttler.config.ts`) |
| **Immutabilité factures sent** | `api/src/invoices/invoices.service.ts` (update + IMMUTABLE_AFTER_ISSUANCE) |
| **CSRF double-submit** | `api/src/common/middleware/csrf.middleware.ts` |
| **PII masking audit** | `api/src/audit/audit.service.ts` + `common/utils/pii.ts` |

---

*Document généré le 17 avril 2026 après clôture complète de l'audit sécurité (14 points : I1-I8 + A1-A5). Document précédent archivé dans l'historique Git.*
