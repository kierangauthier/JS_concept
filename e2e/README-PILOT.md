# ConceptManager — Pilot Pack

## Demarrage rapide

```bash
# 1. Lancer le full stack
docker compose up --build -d

# 2. Attendre que postgres soit healthy (~10s)
docker compose logs -f api  # Attendre "Nest application successfully started"

# 3. Seeder la base
docker compose exec api sh -c "npx prisma migrate deploy && npx prisma db seed"
docker compose exec api npx ts-node prisma/seed-e2e.ts

# 4. Verifier
curl http://localhost:3000/api/health   # → {"status":"ok"}
```

**Frontend** : http://localhost:8080
**API** : http://localhost:3000/api
**MinIO Console** : http://localhost:9001 (minioadmin/minioadmin)

---

## Comptes utilisateurs

| Role | Email | Mot de passe | Scope |
|------|-------|-------------|-------|
| Admin/Gerant | admin@asp.fr | Demo1234! | ASP |
| Conducteur | cond@asp.fr | Demo1234! | ASP |
| Comptable | compta@asp.fr | Demo1234! | ASP |
| Technicien 1 | karim@asp.fr | Demo1234! | ASP |
| Technicien 2 | lucas@asp.fr | Demo1234! | ASP |
| Admin JS | admin@js.fr | Demo1234! | JS |

---

## Roles et permissions

| Action | admin | conducteur | comptable | technicien |
|--------|-------|------------|-----------|------------|
| Import donnees | oui | non | non | non |
| Export FEC/Sage/EBP | oui | non | oui | non |
| Modifier comptes comptables | oui | non | non | non |
| Previsionnel tresorerie | oui | non | oui | non |
| Planning equipes | oui | oui | non | non |
| Valider heures | oui | oui | non | non |
| Saisie terrain | non | non | non | oui |

---

## Installer la PWA (terrain offline)

### Android (Chrome)
1. Ouvrir http://[IP-SERVEUR]:8080/terrain
2. Chrome affiche "Ajouter a l'ecran d'accueil"
3. Taper "Installer"

### iOS (Safari)
1. Ouvrir http://[IP-SERVEUR]:8080/terrain
2. Taper l'icone Partager → "Sur l'ecran d'accueil"
3. L'app s'ouvre en mode standalone

### Test offline
1. Ouvrir l'app, naviguer (cache les donnees)
2. Passer en mode avion
3. L'app fonctionne, les saisies vont en file d'attente
4. Repasser en ligne → sync automatique

---

## Comment exporter les ecritures comptables

1. Login comptable ou admin
2. Aller dans **Facturation**
3. Cliquer **Exporter**
4. Choisir :
   - Format : FEC / Sage / EBP
   - Journal : Ventes / Achats / Tous
   - Periode : du/au
5. Cliquer **Telecharger**
6. Verifier dans votre logiciel comptable

---

## Reset environnement (1 commande)

```bash
# Reset complet : DB + MinIO + reseed
docker compose exec api sh -c "\
  npx prisma migrate reset --force && \
  npx prisma db seed && \
  npx ts-node prisma/seed-e2e.ts"

# Purger MinIO (fichiers uploades)
docker compose exec minio sh -c "mc alias set local http://localhost:9000 minioadmin minioadmin && mc rm --recursive --force local/concept-files/ 2>/dev/null; echo OK"
```

---

## Monitoring

### Health check
```bash
curl http://localhost:3000/api/health
# Reponse attendue : {"status":"ok"}
```

### Logs
```bash
# Tous les services
docker compose logs -f

# API seulement
docker compose logs -f api

# Frontend seulement
docker compose logs -f frontend
```

### Etat des services
```bash
docker compose ps
```

---

## Qualification E2E

```bash
# Prerequis : jq installe, stack running, seeds executes
cd e2e
bash e2e-qualification.sh

# Resultat attendu : "All E2E tests passed"
```

---

## En cas de probleme

| Symptome | Solution |
|----------|----------|
| API ne demarre pas | `docker compose logs api` → verifier DB connection |
| "Session expiree" | Re-login, le token expire apres 15 min |
| Photos ne s'affichent pas | Verifier MinIO (`docker compose logs minio`) |
| PWA ne se met pas a jour | Vider cache navigateur + hard refresh |
| Sync offline bloquee | Aller dans File d'attente → Forcer la synchronisation |
| Erreur 403 | Verifier le role de l'utilisateur (voir tableau ci-dessus) |
