# Runbook Bootstrap — Préparation VM AVD-01 pour exécution autonome

> **Objectif** : créer `/srv/acreed-dev/`, y déposer les runbooks et la mémoire, installer Claude CLI, pour que Claude VM puisse ensuite exécuter `runbook-migration-complete.md` en autonomie.
>
> **Durée** : 20-30 min.
>
> **Prérequis** : accès SSH à la VM `AVD-01` (`4.178.179.147`) en tant que `kierangauthier` avec `sudo`.
>
> **Exécution** : **mixte** — une partie depuis ton poste Windows (transfert scp), une partie sur la VM.

---

## Étape 1 — Transfert des fichiers depuis ton poste (5 min)

Depuis ton **poste local Windows**, ouvre un terminal **PowerShell** dans le dossier du projet :

```powershell
cd E:\Claude\ConceptManager\JS_Concept_final
```

Vérifie que les deux dossiers à envoyer sont bien là :

```powershell
Get-ChildItem docs, memory | Select-Object Name, Length
```

Tu dois voir `docs/` (avec `runbook-migration-complete.md`, `plan-nettoyage-vm.md`, `migration-domaines.md`, etc.) et `memory/` (avec `MEMORY.md` et les `.md` individuels).

### Transfert via scp

```powershell
# Transfert du dossier docs/
scp -r docs kierangauthier@4.178.179.147:/tmp/acreed-dev-staging-docs

# Transfert du dossier memory/
scp -r memory kierangauthier@4.178.179.147:/tmp/acreed-dev-staging-memory
```

**Note** : si c'est la première fois que tu te connectes en SSH à `4.178.179.147` depuis ce poste Windows, `scp` te demandera de confirmer l'empreinte de l'hôte (`Are you sure you want to continue connecting? yes`), puis ton mot de passe (ou ta clé SSH si configurée).

**Vérification côté VM** (depuis une session SSH ouverte parallèlement) :

```bash
ls -la /tmp/acreed-dev-staging-docs/ | head -20
ls -la /tmp/acreed-dev-staging-memory/ | head -20
```

Tu dois voir les `.md` dedans. Si OK, passe à l'étape 2.

---

## Étape 2 — Création de l'arborescence `/srv/acreed-dev/` (5 min)

**À exécuter sur la VM** en SSH.

```bash
# Création avec les bonnes permissions
sudo mkdir -p /srv/acreed-dev
sudo chown kierangauthier:kierangauthier /srv/acreed-dev
chmod 755 /srv/acreed-dev

cd /srv/acreed-dev

# Sous-dossiers
mkdir -p docs memory skills projects observability scripts runbooks trash-archives

# Déplacement des fichiers depuis /tmp
mv /tmp/acreed-dev-staging-docs/* docs/
mv /tmp/acreed-dev-staging-memory/* memory/
rmdir /tmp/acreed-dev-staging-docs /tmp/acreed-dev-staging-memory

# Vérification
tree -L 2 /srv/acreed-dev 2>/dev/null || find /srv/acreed-dev -maxdepth 2 -type d
```

Tu dois voir quelque chose comme :

```
/srv/acreed-dev/
├── docs/
│   ├── runbook-migration-complete.md
│   ├── runbook-bootstrap.md
│   ├── plan-nettoyage-vm.md
│   ├── migration-domaines.md
│   └── ...
├── memory/
│   ├── MEMORY.md
│   ├── domains.md
│   ├── infrastructure.md
│   └── ...
├── skills/
├── projects/
├── observability/
├── scripts/
├── runbooks/
└── trash-archives/
```

---

## Étape 3 — Création du `CLAUDE.md` racine (5 min)

Ce fichier donne à Claude VM le contexte permanent qu'il chargera à chaque démarrage dans ce dossier.

```bash
cd /srv/acreed-dev

cat > CLAUDE.md <<'EOF'
# /srv/acreed-dev — Pilotage opérationnel VM AVD-01

Ce dossier est la **racine opérationnelle** de tout ce que Claude fait sur la
VM de production Acreed. Il contient les runbooks, la mémoire partagée, les
skills, et les scripts qui pilotent l'infrastructure.

## Contexte d'exécution

- **Hôte** : AVD-01 (Azure D8s v4, France Central, via BNC Informatique)
- **IP publique** : 4.178.179.147
- **Utilisateur** : kierangauthier (accès sudo)
- **Date de création de ce dossier** : 2026-04-23

## Deux entités, deux domaines — règle cardinale

Acreed = **2 entités juridiques** :

| Entité | Domaine | Activité |
|---|---|---|
| **Acreed Consulting** | `acreedconsulting.com` | Conseil (historique) |
| **Acreed IA Solutions** | `acreediasolutions.com` | Logiciel & IA (principal) |

**Chaque sous-domaine doit vivre sous le domaine de l'entité qui l'exploite.**
Cf. `memory/domains.md` pour la répartition détaillée.

## Règles d'exécution (à respecter à chaque session)

1. **Lecture obligatoire au démarrage** : lire `memory/MEMORY.md` puis les
   entrées individuelles pertinentes avant d'agir.
2. **Pas de touche prod sans rebuild d'image** : tout container du réseau
   `acreed-prod` est immuable pendant sa durée de vie. Toute modif passe par
   un commit Git + un rebuild.
3. **Archivage avant suppression** : jamais de `rm -rf` direct. Archiver
   d'abord dans `trash-archives/$(date +%Y%m%d)/`.
4. **Alerter via teams-alert** à chaque action structurante :
   - Début de phase : `teams-alert info "Phase X démarrée"`
   - Fin de phase OK : `teams-alert info "Phase X OK : résumé"`
   - Blocage : `teams-alert critical "✋ BLOQUÉ à l'étape Y : cause"` puis stop.
5. **Checkpoints humains ✋** : aux moments où Kieran doit agir (Azure AD,
   rotation de secrets, validation visuelle), poster sur `#acreed-alerts-critical`
   et attendre un **GO explicite** avant de continuer.

## Runbooks disponibles

- `docs/runbook-migration-complete.md` — le runbook principal, à exécuter avec
  le prompt de démarrage qui est en tête.
- `docs/plan-nettoyage-vm.md` — plan de référence pour les phases 0-7.
- `docs/migration-domaines.md` — bascule des 5 sous-domaines IA Solutions.

## Scripts installés

- `~/bin/teams-alert <info|warning|critical> "message"` — alerte Teams via
  webhook Power Automate (Adaptive Card avec couleur + icône + timestamp).
- `~/.secrets/teams-webhooks.env` (chmod 600) — URL des 3 webhooks.

## Principe général

Tu es un exécutant prudent et transparent. Tu documentes ce que tu fais dans
le journal de session (`~/runbook-journal-YYYYMMDD.md`), tu préviens avant
chaque action risquée, tu n'inventes rien.
EOF

cat CLAUDE.md | head -5
```

---

## Étape 4 — Installation Claude CLI (5 min)

Vérification :

```bash
if command -v claude >/dev/null 2>&1; then
  echo "✅ Claude CLI déjà installé : $(claude --version 2>/dev/null || echo 'version inconnue')"
else
  echo "⚠️ Claude CLI non installé. Installation..."
fi
```

Si non installé :

```bash
# Installation officielle (cf. docs.anthropic.com)
curl -fsSL https://claude.ai/install.sh | bash

# Recharge le PATH
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Vérification
claude --version
```

### Configuration de la clé API

```bash
# Création du dossier config Claude
mkdir -p ~/.config/claude-code
```

✋ **CHECKPOINT BOOTSTRAP-1 — Clé API Anthropic**

Kieran doit fournir sa clé API Anthropic. Pour ne pas la faire transiter par un chat :

1. Se connecter à **[console.anthropic.com](https://console.anthropic.com)** → API Keys
2. Créer une clé dédiée **"VM AVD-01 — Claude runbooks"** (pour pouvoir la révoquer plus tard sans impacter d'autres usages)
3. Copier la clé — elle commence par `sk-ant-api03-...`
4. Sur la VM, créer le fichier de config :

```bash
mkdir -p ~/.config/claude-code
nano ~/.config/claude-code/config.json
```

Coller (en remplaçant la valeur par la vraie clé) :

```json
{
  "api_key": "sk-ant-api03-REMPLACER-PAR-LA-VRAIE-CLE",
  "model": "claude-opus-4-7",
  "default_output_format": "text"
}
```

Puis :

```bash
chmod 600 ~/.config/claude-code/config.json
```

Test :

```bash
cd /srv/acreed-dev
echo "Dis bonjour" | claude --print
```

Si Claude répond, c'est bon. Sinon, vérifier la clé ou l'absence de typo dans le JSON.

---

## Étape 5 — Skills squelettes (5 min)

```bash
cd /srv/acreed-dev/skills

# Skill : teams-alert (déjà implémenté dans ~/bin, documenté ici)
mkdir -p teams-alert
cat > teams-alert/SKILL.md <<'EOF'
# Skill : teams-alert

Envoi d'alertes Teams via webhook Power Automate.

## Usage

    teams-alert <info|warning|critical> "message"

## Niveaux

- `info` → canal `acreed-alerts-info` (vert, ℹ️). Pour les événements normaux
  (backup OK, déploiement OK, fin de phase de runbook).
- `warning` → canal `acreed-alerts-warning` (orange, ⚠️). Pour les seuils
  dépassés non bloquants (RAM > 90%, disque > 85%).
- `critical` → canal `acreed-alerts-critical` (rouge, 🔴). Pour les pannes
  ou blocages. UTILISÉ pour signaler les checkpoints humains ✋.

## Délai

30 sec à 5 min de latence (limitation Power Automate gratuit). Acceptable
pour alerting d'infrastructure.

## Dépendances

- `~/.secrets/teams-webhooks.env` (chmod 600) avec les 3 URL webhook
- `~/bin/teams-alert` (script shell, chmod +x)
EOF

# Skill : deploy-client (squelette — à remplir quand on aura le premier client)
mkdir -p deploy-client
cat > deploy-client/SKILL.md <<'EOF'
# Skill : deploy-client

Déploiement d'une nouvelle instance ConceptManager pour un client signé.

## À compléter quand JS Concept est signé (objectif M+1).

Contenu prévu :
- Création du sous-domaine `[client].acreediasolutions.com` chez OVH
- Génération du `docker-compose.yml` dédié (template)
- Configuration nginx + certbot
- Import initial du catalogue client
- Tests end-to-end (création devis, facture, Factur-X)
EOF

# Skill : audit-prod (squelette)
mkdir -p audit-prod
cat > audit-prod/SKILL.md <<'EOF'
# Skill : audit-prod

Audit de santé des containers du réseau `acreed-prod`.

## À compléter après Phase 5 (observabilité).

Contenu prévu :
- Liste des containers `acreed-prod` avec leur statut
- Vérification des URLs publiques (curl)
- Requêtes Grafana / Loki pour erreurs récentes
- Rapport posté sur #acreed-alerts-info
EOF

ls skills/
```

---

## Étape 6 — Validation finale du bootstrap

```bash
cd /srv/acreed-dev

echo "── Validation bootstrap ──"

# 1. Arborescence
for d in docs memory skills projects observability scripts runbooks trash-archives; do
  test -d "$d" && echo "✅ $d/" || echo "❌ $d/ manquant"
done

# 2. CLAUDE.md
test -f CLAUDE.md && echo "✅ CLAUDE.md" || echo "❌ CLAUDE.md manquant"

# 3. Runbooks présents
for f in docs/runbook-migration-complete.md docs/plan-nettoyage-vm.md docs/migration-domaines.md; do
  test -f "$f" && echo "✅ $f" || echo "❌ $f manquant"
done

# 4. Mémoire présente
test -f memory/MEMORY.md && echo "✅ memory/MEMORY.md" || echo "❌ memory/MEMORY.md manquant"

# 5. Claude CLI fonctionnel
command -v claude >/dev/null && echo "✅ claude CLI" || echo "❌ claude CLI manquant"

# 6. Config Claude
test -f ~/.config/claude-code/config.json && echo "✅ config Claude" || echo "❌ config Claude manquante"

# 7. teams-alert fonctionnel (test réel)
if teams-alert info "Bootstrap /srv/acreed-dev terminé — Claude VM prêt à exécuter le runbook principal"; then
  echo "✅ teams-alert fonctionnel (message envoyé)"
else
  echo "❌ teams-alert en erreur"
fi

echo ""
echo "── Bootstrap terminé ──"
```

---

## Étape 7 — Lancement du runbook principal

Une fois la validation de l'étape 6 toute verte, **lance Claude VM** :

```bash
cd /srv/acreed-dev
claude
```

Une fois dans l'interface Claude, **colle le prompt de démarrage** qui se trouve en tête du fichier `docs/runbook-migration-complete.md` (section « Prompt de démarrage à coller à Claude VM »).

Claude VM commence par le pré-vol, puis s'arrête au **CHECKPOINT 0** en attendant ton GO dans le canal Teams `acreed-alerts-critical`.

**À partir de là, c'est Claude VM qui pilote. Tu interviens uniquement aux checkpoints ✋.**

---

## Tableau récapitulatif — qui fait quoi

| Étape | Qui ? | Où ? | Durée |
|---|---|---|---|
| 1. Transfert scp | Kieran | Poste Windows | 5 min |
| 2. Arborescence /srv/acreed-dev | Kieran (SSH) | VM | 5 min |
| 3. CLAUDE.md | Kieran (SSH) | VM | 5 min |
| 4. Install Claude CLI + clé API | Kieran (SSH) | VM | 5 min |
| 5. Skills squelettes | Kieran (SSH) | VM | 5 min |
| 6. Validation bootstrap | Kieran (SSH) | VM | 2 min |
| 7. Lancement runbook principal | Claude VM prend le relais | VM | Variable |

**Total bootstrap** : ~25-30 min pour Kieran, puis l'exécution autonome démarre.

---

## Annexe — En cas de problème au bootstrap

### `scp` refuse la connexion

- Vérifier que SSH écoute bien sur le port 22 (`sudo ss -tlnp | grep :22`)
- Vérifier que UFW n'est PAS encore actif (si Phase 0 déjà faite : il l'est, mais 22 est autorisé donc OK)
- Si authentification par mot de passe uniquement : ça devrait marcher. Si pas de mot de passe défini : utiliser une clé SSH (voir `ssh-copy-id`)

### `claude` ne trouve pas `config.json`

- Vérifier le chemin exact : `ls -la ~/.config/claude-code/`
- Alternativement, passer la clé via variable d'environnement :
  ```bash
  export ANTHROPIC_API_KEY="sk-ant-api03-..."
  claude
  ```
  (à stocker dans `~/.bashrc` pour persister)

### Claude CLI installe mais `claude --version` échoue

- Recharger le PATH : `source ~/.bashrc`
- Vérifier l'emplacement : `which claude` ou `ls ~/.local/bin/claude`

### teams-alert échoue au test de l'étape 6

- Vérifier que `~/.secrets/teams-webhooks.env` existe et est lisible : `ls -la ~/.secrets/`
- Vérifier le contenu (sans le partager) : `wc -l ~/.secrets/teams-webhooks.env` doit donner ~3 lignes
- Relancer le test manuel : `curl -X POST ... "$TEAMS_WEBHOOK_INFO"` avec le payload Adaptive Card
