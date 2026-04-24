---
name: Domaines Acreed — deux entités, deux domaines vivants
description: Frontière domaine/entité Consulting vs IA Solutions, conventions de nommage, état de la migration — à référencer pour tout ce qui touche URL, certificats, emails, communication client
type: project
---

# Règle cardinale

Acreed regroupe **deux entités juridiques distinctes** qui collaborent :

| Entité | Domaine | Activité | Statut |
|---|---|---|---|
| **Acreed Consulting** | `acreedconsulting.com` | Conseil (historique) | Vivant, à marge |
| **Acreed IA Solutions** | `acreediasolutions.com` | Logiciel & IA (nouveau) | Vivant, principal — doit porter le MRR |

**Chaque sous-domaine doit vivre sous le domaine de l'entité qui l'exploite.** Pas d'activité IA Solutions sur `acreedconsulting.com`, pas d'activité Consulting sur `acreediasolutions.com`.

**Why:** Propreté juridique (DPA, CGV, mentions légales pointent vers la bonne société), lisibilité commerciale, préparation comptable et SaaS. Erreur à éviter : penser que `acreedconsulting.com` est « legacy à laisser mourir » — il reste vivant pour les activités conseil.

**How to apply:** Quand tu crées un nouveau sous-domaine, demande-toi d'abord « cet outil sert quelle entité ? » — la réponse détermine le domaine.

# Répartition effective des sous-domaines (état 2026-04-23)

## Sur `acreedconsulting.com` (Consulting) — 2 sous-domaines qui restent

- `astreos.acreedconsulting.com` — outil interne Consulting (Supabase + `/var/www/Suivi-consultant`)
- `site.acreedconsulting.com` — site vitrine du conseil

## Sur `acreediasolutions.com` (IA Solutions) — 7 sous-domaines vivants ou préparés

**Existants (mémoire des anciennes décisions)** :
- `freyr.acreediasolutions.com`
- `mimir.acreediasolutions.com`
- `puyfoot43.acreediasolutions.com`
- `gitlab.acreediasolutions.com` (en cours de décommission)

**En cours de migration depuis `acreedconsulting.com`** (plan : `docs/migration-domaines.md`) — DNS créés le 2026-04-23, vhosts à étendre :
- `dt.acreediasolutions.com` ← `dt.acreedconsulting.com` (convertisseur DT + gateway MSAL)
- `horizon.acreediasolutions.com` ← `horizon.acreedconsulting.com`
- `n8n.acreediasolutions.com` ← `n8n.acreedconsulting.com`
- `ostara.acreediasolutions.com` ← `ostara.acreedconsulting.com`
- `outil.rh.acreediasolutions.com` ← `outil.rh.acreedconsulting.com` (verif-paie)

**Clients ConceptManager à venir** :
- `js-concept.acreediasolutions.com` — premier client payant (objectif M+1)
- `asp.acreediasolutions.com` — second client (objectif M+3)

# IP publique VM

- `4.178.179.147` (Azure D8s v4, France Central, via BNC Informatique)
- Tous les enregistrements DNS A `*.acreediasolutions.com` et `*.acreedconsulting.com` actifs pointent vers cette IP.

# Stratégie de migration des 5 sous-domaines

**Recette zéro-coupure** (cf. `docs/migration-domaines.md` pour détails) :

1. DNS A créés chez OVH avec TTL 300 (fait le 2026-04-23)
2. Vhost nginx étendu pour servir **les deux noms** simultanément
3. Cert TLS étendu avec `certbot --expand`
4. `.env` applicatifs mis à jour
5. Frontends rebuildés (horizon notamment : `VITE_API_BASE_URL` compilé en dur)
6. Systèmes tiers mis à jour :
   - **Azure AD MSAL** pour `dt` (redirect URI du Client ID `556e78d7-9152-4283-aba4-56e2ab269fc6`)
   - **Azure AD SAML** pour `n8n` (Entity ID + ACS URL)
   - `.env` des 3 projets consommateurs des webhooks n8n (`acreed-ia`, `gestion-immo-dev`)

Période de grâce 30 jours, puis retrait des anciens `server_name`, révocation certs, suppression DNS `acreedconsulting.com` devenus obsolètes.

# Convention de nommage (cible IA Solutions)

## Prod (clients payants)
- `[nom-client].acreediasolutions.com` — instance ConceptManager dédiée client
  - `js-concept.acreediasolutions.com`, `asp.acreediasolutions.com`

## Outils internes IA Solutions
- `ostara.acreediasolutions.com` — dashboard Ostara (app-builder)
- `n8n.acreediasolutions.com` — automatisations
- `dt.acreediasolutions.com` — convertisseur DT
- `horizon.acreediasolutions.com`
- `outil.rh.acreediasolutions.com`

## Dev / démo
- `demo.acreediasolutions.com` — ConceptManager démo commerciale (à créer)
- `[projet].dev.acreediasolutions.com` — apps Ostara en phase dev (wildcard DNS à poser)

# Workflow Ostara → DNS

Quand Ostara crée un projet :

1. **Dev** : wildcard DNS `*.dev.acreediasolutions.com` → déploiement auto sur `projet-XYZ.dev.acreediasolutions.com`
2. **Promote to prod** : Kieran saisit le sous-domaine client, déclare manuellement chez OVH, Ostara redéploie dans `acreed-prod` avec cert Let's Encrypt via certbot (pas Traefik — nginx système conservé, cf. `memory/infrastructure.md`)

# Points d'attention

- **Ne jamais supprimer** un sous-domaine Consulting actif (`astreos`, `site`) — ils servent l'activité conseil qui tourne.
- **Toujours vérifier** l'entité à laquelle appartient un outil avant de choisir son domaine.
- **Emails** : `@acreediasolutions.com` pour tout ce qui touche IA Solutions (contact commercial, support, admin technique). `@acreedconsulting.com` reste pour les communications conseil.
- Kieran utilise `kieran.gauthier@acreediasolutions.com` comme email principal.
