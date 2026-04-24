---
name: Gouvernance VM multi-admins (kieran + tdufr + président)
description: Frictions actuelles avec le modèle "chacun dans son home" et plan cible de refonte vers un espace dev partagé /srv/dev/ + groupe acreed-dev
type: project
---

# Situation actuelle (2026-04-24) — à corriger

Deux users dev sur la VM AVD-01 :
- **kierangauthier** (UID 1002) — Kieran, sudo NOPASSWD actif
- **tdufr** (UID non vérifié) — son collègue, aussi admin mais via groupe sudo, peut-être pas NOPASSWD

Un troisième (**président**) est prévu mais n'a pas encore de compte.

Les projets sont éparpillés et mal partagés :
- `/home/kierangauthier/claude-secure/*` : owned principalement par **tdufr** bien que dans le home de Kieran (ex : `astreos/`, `astreos/server/.env` en `tdufr:tdufr` mode 600). Cause de frictions : Kieran ne peut pas lire `backup-db.sh` en simple `head` (permission denied).
- `/home/tdufr/.npm/_npx/...` : CLI Supabase installée par tdufr via npx, pas accessible à Kieran sans `sudo -u tdufr`
- `/opt/acreed-ia/`, `/opt/puyfoot-prod/` : owned root (nécessite sudo pour quoi que ce soit)
- Services systemd (ex : `supabase-start.service`) tournent en User=tdufr avec WorkingDirectory dans son home

**Conséquence** : chaque action sur un projet "de l'autre" passe par `sudo -u <user>` ou `sudo`, ce qui casse les workflows d'admin propre et rend difficile l'automatisation.

# État cible — modèle Unix standard pour équipe

**Why:** Kieran veut que lui, tdufr et le président puissent tous les trois agir en admin sur les projets dev sans friction (lecture, écriture, exécution). Sans ce modèle, on empile les workarounds `sudo -u`, on oublie de mettre à jour les perms, on se retrouve avec des fichiers inaccessibles au pire moment (ex : rotation Supabase bloquée parce qu'un script de backup est 700 owned tdufr).

**How to apply:**

## Phase A — Immédiate (15 min, aujourd'hui ou demain, à faible risque)

1. Créer le groupe Unix commun :
   ```
   sudo groupadd -f acreed-dev
   sudo usermod -aG acreed-dev kierangauthier
   sudo usermod -aG acreed-dev tdufr
   ```
2. Ajouter les permissions de groupe sur les dossiers dev existants (sans changer l'owner) :
   - `/home/kierangauthier/claude-secure/*`
   - `/opt/acreed-ia/`, `/opt/puyfoot-prod/`
   - setgid (`2775` sur dossiers) pour que tout nouveau fichier hérite du groupe
3. Se déconnecter/reconnecter pour recharger les groupes dans le shell

## Phase B — Court terme (2h, planifié cette semaine, coordination tdufr requise)

Migration des projets dev vers **`/srv/dev/`** — structure propre :

```
/srv/dev/                           (owned root:acreed-dev, mode 2775)
├── acreed-ia/                      ex /opt/acreed-ia
├── astreos/                        ex /home/kierangauthier/claude-secure/astreos
├── convertisseur-dt/
├── freyr/
├── gestion-immo-dev/
├── horizon/
├── puyfoot-prod/
├── puyfoot-dev/
├── site-final-acreed/
└── verif-paie-web/
```

Étapes à planifier :
- Arrêter les containers des projets migrés
- `mv` les dossiers vers `/srv/dev/<projet>/`
- Corriger les références de chemin : docker-compose (volumes absolus), unit files systemd (WorkingDirectory), nginx vhosts (root/alias/proxy_pass), scripts déploiement (ex : astreos/deploy.sh), `.env` quand ils contiennent des chemins absolus
- Relancer tout, vérifier santé URL par URL
- Coordination avec tdufr pour qu'il ne pousse pas pendant la migration

## Phase C — Quand président rejoint

- Créer compte Unix président
- `usermod -aG acreed-dev`
- Lui documenter la convention : "tout projet dev vit dans /srv/dev/, jamais dans ~/"

# Si nouvelle VM

Si Kieran planifie une nouvelle VM (hypothèse évoquée dans `plan-nettoyage-vm.md`), on part direct sur la bonne structure via cloud-init :
- Groupe `acreed-dev` créé au provisioning
- Les 3 users (kieran, tdufr, président) ajoutés au groupe
- `/srv/dev/` racine posée dès le premier boot
- Sudoers NOPASSWD via `%acreed-dev ALL=(ALL) NOPASSWD:ALL` (une ligne au lieu de 3)
- Convention documentée dès le README /srv/dev/README.md

# Règles à respecter

- **Home utilisateur** = espace strictement perso (configs shell, notes, credentials perso). **Aucun projet pro** ne vit dans un home.
- **Projet pro** = toujours dans `/srv/dev/<projet>/`, owned root:acreed-dev, mode 2775 récursif.
- **Services systemd** de projet pointent vers `/srv/dev/<projet>/` pour leur WorkingDirectory, jamais vers un home utilisateur.
- **Credentials applicatifs** (`.env`) restent dans le dossier projet mais avec permissions `acreed-dev:rw-`, lisibles par tout admin.
- **Secrets opérationnels** (API keys Anthropic, tokens Teams webhook) restent dans `~/.secrets/<user>/` par user (pas partagés), ou dans `/etc/acreed/secrets.d/` si vraiment partagés.

# Dette actuelle à lever

- [ ] Phase A à exécuter avant JS Concept signé
- [ ] Planifier Phase B (coordination tdufr obligatoire)
- [ ] Créer compte président quand il rejoint
- [ ] Réinstaller Supabase CLI dans un chemin accessible groupe acreed-dev (pas dans /home/tdufr/.npm/)
- [ ] Fixer Node v12 système → Node 20 (pour que supabase-start.service puisse reprendre proprement)
