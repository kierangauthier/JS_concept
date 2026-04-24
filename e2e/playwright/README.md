# Playwright E2E — scaffold

Ce dossier contient la configuration Playwright minimale utilisée par le
test plan décrit dans [`docs/runbooks/pentest-prep.md`](../../docs/runbooks/pentest-prep.md).
Playwright **n'est pas encore installé comme dépendance** (évite ~200 MB inutiles
en dev/CI tant que personne ne lance les tests). Pour activer :

```bash
npm install --save-dev @playwright/test
npx playwright install chromium

# Lancer les tests :
npx playwright test -c e2e/playwright/playwright.config.ts
```

## Variables d'environnement

- `CM_E2E_BASE_URL` — URL de l'instance cible. Défaut : `http://localhost:8080`.
- `CM_E2E_USER_EMAIL` / `CM_E2E_USER_PASSWORD` — compte de test (seed ou tenant pentest). Si non défini, les tests authentifiés sont `skip`.

## Scénarios couverts par le scaffold

- Pages légales publiques accessibles sans auth (`/mentions-legales`, `/cgu`, `/cgv`, `/confidentialite`).
- Refus du login avec des credentials invalides (rate limit V1.7 + réponse générique).
- Export RGPD accessible depuis `/account` par le titulaire du compte.

## Scénarios à ajouter en priorité

1. IDOR cross-tenant : admin ASP tente `PATCH /api/users/<jsconcept-user-id>` → 403.
2. Immutabilité facture : PATCH amount d'une facture `sent` → 403 + message attendu.
3. Upload fichier malveillant : EICAR → 400 ou 503 selon la config antivirus.
4. Consent IA : sans consentement, `/api/ai/chat` → 403 `AI_CONSENT_REQUIRED` → modal côté UI.
5. Parcours complet : login → créer client → devis → conversion chantier → facture → paiement.

## Intégration CI

Une fois les tests stabilisés, ajouter un job `e2e` dans `.github/workflows/ci.yml` :

```yaml
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres: { image: postgres:16-alpine, env: {…}, ports: ["5432:5432"] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4 with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npx playwright test -c e2e/playwright/playwright.config.ts
```
