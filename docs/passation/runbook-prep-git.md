# Runbook préparation Git — Avant déploiement ConceptManager dev

> **Public** : Kieran, à exécuter sur son **poste Windows** + sa **VM** avant de lancer `runbook-deploiement-conceptmanager-dev.md`.
>
> **Date émission** : 2026-04-28
>
> **Pré-requis** : avoir lu `brief-claude-conceptmanager-dev.md` (le brief général).
>
> **Durée estimée** : 15-25 min.

---

## Pourquoi ce runbook ?

Le déploiement ConceptManager va cloner le code depuis GitHub (`https://github.com/kierangauthier/JS_concept.git`) sur la VM. Avant ça :

1. **Côté poste Kieran** : les modifications locales doivent être commitées et poussées sur GitHub
2. **Côté VM** : il faut une **deploy key SSH** pour cloner sans exposer de Personal Access Token (cohérent avec la pratique appliquée pour les autres repos lors de la Session A migration)

C'est le même pattern que tu as appliqué aux 4 autres repos en avril 2026 (puyfoot-prod, acreed-ia, puyfoot-dev, gestion-immo-dev — voir `plan-nettoyage-vm.md` 0.2).

---

## ÉTAPE 1 — Audit + commit + push depuis ton poste (10 min)

### 1.1 Vérifier qu'aucun fichier sensible n'est traqué

`.gitignore` exclut déjà `.env`, `.env.local`, `.env.production`, `node_modules`, `.claude/`, etc. Bon point de départ.

Mais pour être 100% sûr, depuis PowerShell :

```powershell
cd E:\Claude\ConceptManager\JS_Concept_final

# Vérifier qu'aucun .env ne va être commité
git status --porcelain | Select-String "\.env"
# Doit retourner VIDE.

# Vérifier qu'aucun node_modules
git status --porcelain | Select-String "node_modules"
# Doit retourner VIDE.

# Vérifier qu'aucun fichier > 50 MB ne va être commité (limite GitHub)
git status --porcelain | ForEach-Object {
    $line = $_ -split '\s+', 2
    if ($line[0] -in @('??','A','M','AM','MM') -and (Test-Path $line[1])) {
        $size = (Get-Item $line[1]).Length / 1MB
        if ($size -gt 50) { Write-Host "ATTENTION: $($line[1]) = $($size.ToString('F2')) MB" }
    }
}
# Doit retourner VIDE.
```

### 1.2 Inventaire des untracked

Selon ton `git status`, voici ce qui doit être commité :

| Fichier/Dossier | Catégorie | Action |
|---|---|---|
| `docs/commercial/ConceptManager-Presentation-Equipe.pptx` | Présentation équipe (504 KB) | ✅ Commit |
| `docs/communication/` | Docs communication humaine (avant-après-vm + onboarding) | ✅ Commit |
| `docs/convention-srv.md` | Convention `/srv/` | ✅ Commit |
| `docs/passation/` | Brief + runbook + ce fichier | ✅ Commit |
| `docs/runbook-session-a.md` | Runbook session migration | ✅ Commit |
| `docs/vm-snapshot/` | Snapshot docs VM (4 docs récupérés depuis `/srv/claude/docs/`) | ✅ Commit |
| `e2e/catalogue-ecodan-complet.csv` | Catalogue PAC ThermiPro | ✅ Commit |
| `e2e/catalogue-thermipro.csv` | Catalogue ThermiPro | ✅ Commit |
| `e2e/playwright/` | Tests E2E | ✅ Commit |
| `public/favicon.svg` | Asset frontend | ✅ Commit |
| `scripts/` | Scripts batch/shell de démo (build-and-start, reset-demo, seed-12months) | ✅ Commit |

**Total** : ~12 catégories de fichiers à commiter. Pas de fichier sensible.

### 1.3 Commits structurés

Je te propose **5 commits thématiques** (au lieu d'un gros commit fourre-tout) pour que l'historique Git reste lisible :

```powershell
cd E:\Claude\ConceptManager\JS_Concept_final

# Commit 1 — Documentation Session A migration (la grosse session 27/04)
git add docs/runbook-session-a.md docs/convention-srv.md docs/vm-snapshot/
git commit -m "docs: convention /srv/, runbook Session A migration VM, snapshot docs VM"

# Commit 2 — Documentation communication humaine (avant-après + onboarding)
git add docs/communication/
git commit -m "docs(communication): avant-apres-vm + onboarding-vm pour direction et nouveau dev"

# Commit 3 — Passation déploiement ConceptManager dev (les 3 docs qu'on vient de produire)
git add docs/passation/
git commit -m "docs(passation): brief + runbook deploiement ConceptManager dev sur AVD-01"

# Commit 4 — Présentation équipe ConceptManager
git add docs/commercial/ConceptManager-Presentation-Equipe.pptx
git commit -m "docs(commercial): presentation equipe ConceptManager (slides)"

# Commit 5 — Scripts seed + tests E2E + assets
git add scripts/ e2e/ public/favicon.svg
git commit -m "feat: scripts seed 12 mois (JS Concept + ASP), catalogues demo, tests E2E playwright, favicon"
```

### 1.4 Vérifier la liste des commits avant push

```powershell
git log --oneline -10
# Doit afficher tes 5 commits du jour + l'historique précédent
```

### 1.5 Push vers GitHub

```powershell
git push origin main
```

Si jamais le push échoue (auth GitHub) :
- Vérifier que tu es loggé sur GitHub côté poste (gh CLI ou credential manager Windows)
- Sinon générer un Personal Access Token : https://github.com/settings/tokens → token avec scope `repo`
- L'utiliser comme mot de passe lors du prompt git push

### 1.6 Validation côté GitHub

Ouvre dans ton navigateur :
```
https://github.com/kierangauthier/JS_concept
```

Vérifie que :
- Le dernier commit affiché est `feat: scripts seed 12 mois...` (le commit 5)
- L'arborescence inclut bien `docs/passation/`, `docs/communication/`, `docs/vm-snapshot/`
- Le commit `docs(passation): brief + runbook...` est présent

---

## ÉTAPE 2 — Génération deploy key SSH côté VM (5 min)

### 2.1 Connexion SSH à la VM

```powershell
ssh kierangauthier@4.178.179.147
```

### 2.2 Génération de la clé SSH dédiée à ce repo

Une fois sur la VM :

```bash
# Vérifier qu'aucune clé du même nom n'existe déjà
ls -la ~/.ssh/deploy_js_concept* 2>/dev/null

# Si déjà existante (peu probable), STOP et appeler Kieran avant régénération.

# Sinon, génération
ssh-keygen -t ed25519 -N "" -f ~/.ssh/deploy_js_concept -C "deploy-key-js-concept-$(hostname)"

# Affichage de la clé publique (à copier vers GitHub)
echo ""
echo "=== Clé publique à coller sur GitHub ==="
cat ~/.ssh/deploy_js_concept.pub
echo "=== Fin clé publique ==="
```

**Copie le contenu** entre les lignes `=== Clé publique ===` (commence par `ssh-ed25519 AAAA...` se termine par `deploy-key-js-concept-AVD-01`).

### 2.3 Configuration `~/.ssh/config` (alias pour Git)

Toujours sur la VM :

```bash
# Backup du config existant si présent
[ -f ~/.ssh/config ] && cp ~/.ssh/config ~/.ssh/config.bak.$(date +%Y%m%d)

# Vérifier qu'il n'existe pas déjà une entrée pour github-js-concept
grep -A4 "Host github-js-concept" ~/.ssh/config 2>/dev/null

# Si rien, ajouter le bloc :
cat >> ~/.ssh/config <<'EOF'

Host github-js-concept
  HostName github.com
  User git
  IdentityFile ~/.ssh/deploy_js_concept
  IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config
```

---

## ÉTAPE 3 — Ajout deploy key sur GitHub (3 min)

### 3.1 Aller sur GitHub Settings du repo

Dans ton navigateur (poste Kieran) :

```
https://github.com/kierangauthier/JS_concept/settings/keys
```

### 3.2 Add deploy key

1. Clique **"Add deploy key"**
2. **Title** : `AVD-01 deploy key (lecture seule)`
3. **Key** : colle la clé publique récupérée à l'étape 2.2 (le `ssh-ed25519 AAAA... deploy-key-js-concept-AVD-01`)
4. **Allow write access** : **NON, surtout pas** (lecture seule pour clone uniquement, pas de push depuis la VM)
5. Clique **"Add key"**

### 3.3 Vérification

La page doit maintenant lister 1 deploy key avec :
- Title : `AVD-01 deploy key (lecture seule)`
- Read access (icône clé)
- Last used : Never (pour l'instant)

---

## ÉTAPE 4 — Test du clone depuis la VM (2 min)

Toujours dans ta session SSH sur la VM :

```bash
# Test de connexion SSH GitHub via l'alias
ssh -T github-js-concept

# Réponse attendue :
# "Hi kierangauthier/JS_concept! You've successfully authenticated, but GitHub does not provide shell access."
# (peu importe le code retour, le message confirme l'auth)
```

Si ça marche → tu es prêt à passer le runbook de déploiement au Claude VM.

Si erreur "Permission denied" → vérifier :
1. La clé publique a bien été ajoutée sur GitHub (étape 3.2)
2. Le fichier `~/.ssh/deploy_js_concept` (privée) existe et a `chmod 600`
3. Le fichier `~/.ssh/config` contient bien le bloc `Host github-js-concept`

---

## ÉTAPE 5 — Test de clone réel (optionnel mais recommandé, 1 min)

```bash
# Clone test dans /tmp pour vérifier que tout marche
cd /tmp
git clone github-js-concept:kierangauthier/JS_concept.git test-clone-js-concept

# Doit afficher : Cloning into 'test-clone-js-concept'... + receiving objects ...

cd test-clone-js-concept
ls -la
git log --oneline -5
# Doit montrer tes 5 commits du jour

# Cleanup
cd /tmp
rm -rf test-clone-js-concept
```

Si ce clone réussit → le runbook de déploiement peut être lancé en toute confiance.

---

## Résumé : ce qui est en place après ce runbook

| Élément | État |
|---|---|
| Code GitHub à jour avec tous les fichiers nécessaires | ✅ |
| `docs/passation/` (brief + runbook deploy + ce runbook prep) commités | ✅ |
| Scripts seed (`seed-12months.bat`, etc.) commités | ✅ |
| Deploy key SSH générée sur la VM (`~/.ssh/deploy_js_concept`) | ✅ |
| Deploy key publique enregistrée sur GitHub (lecture seule) | ✅ |
| Alias `~/.ssh/config` (`github-js-concept`) configuré | ✅ |
| Test `ssh -T github-js-concept` réussi | ✅ |

**À ce stade, tu peux passer la main au Claude VM** pour lancer `runbook-deploiement-conceptmanager-dev.md`.

---

## Pour briefer le Claude VM ensuite

Une fois ce runbook prep Git terminé, tu démarres une session Claude sur la VM avec le prompt suivant :

```
Tu reprends pour déployer ConceptManager en environnement de dev sur la VM.

Lis dans cet ordre :
1. docs/passation/brief-claude-conceptmanager-dev.md (sur ton poste, ou via clone Git)
2. docs/passation/runbook-deploiement-conceptmanager-dev.md
3. /srv/claude/docs/convention-srv.md (sur la VM)
4. /srv/claude/docs/lessons-learned-session-a.md (sur la VM)

Pré-requis déjà satisfaits :
- Code à jour sur https://github.com/kierangauthier/JS_concept (branche main)
- Deploy key SSH configurée sur la VM (alias github-js-concept dans ~/.ssh/config)
- ssh -T github-js-concept testé OK

Décisions tranchées :
- Slug : <à confirmer avec moi> (probablement js-concept ou demo)
- URL : conceptmanager.acreediasolutions.com (vitrine démo, pas par client)
- Méthode push : Git (clone via deploy key SSH)
- Pas de mise en prod tant que JS n'a pas signé

Démarre par la Phase 0 du runbook (Pré-vol).
```

Le Claude VM va te demander confirmation sur le slug en checkpoint 0 puis attaquer.

---

**Version 1.0 — 2026-04-28**
