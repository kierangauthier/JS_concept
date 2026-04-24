---
name: Protection des secrets — réflexe anti-fuite
description: Règle zéro-tolérance sur le partage de secrets (URL webhook, tokens, clés API) dans le chat, et procédure de révocation immédiate en cas de fuite
type: feedback
---

Quand Kieran partage un **secret** dans la conversation (URL webhook Teams, token GitHub, clé API, mot de passe, chaîne de connexion DB, service_role Supabase, etc.), **première réaction obligatoire** : signaler la fuite et proposer la révocation + recréation immédiate, AVANT toute autre action.

**Why:** Le 2026-04-23, Kieran m'a collé les 3 URL webhook Teams (critical/warning/info) en clair dans le chat. Ces URL permettent à quiconque les possède de poster n'importe quoi dans ses canaux Teams, y compris masquer de vraies alertes sous du spam. Une URL dans un chat passe par plusieurs systèmes (Anthropic, logs locaux, sauvegardes, clipboard) — la règle doit être zéro-tolérance. Mieux vaut perdre 5 minutes à révoquer/recréer que laisser traîner un secret compromis.

**How to apply:**

1. **Détecter** : toute valeur qui ressemble à `ghp_...`, `sb_secret_...`, `xoxb-...`, une URL avec `sig=`, `token=`, `key=`, `access_token=`, `Bearer`, ou une URL longue vers `logic.azure.com`, `webhook.office.com`, `hooks.slack.com`, `powerplatform.com/triggers` est un secret.

2. **Réagir immédiatement** : STOP sur la tâche en cours, message à Kieran qui explique (a) ce qui a fuité, (b) comment révoquer dans l'outil concerné, (c) comment recréer, (d) où stocker proprement (fichier `.env` sur la machine cible, `chmod 600`).

3. **Ne jamais utiliser** les valeurs compromises pour la suite — même si ça complique le plan. Attendre la confirmation « rotation faite ».

4. **Prévenir pour la suite** : rappeler la règle « placeholder dans le chat, valeur dans le `.env` ». Exemple acceptable : « j'ai mis mes URL dans `~/.secrets/teams-webhooks.env` ».

5. **Stocker le bon pattern** : pour les secrets qui doivent être utilisés par la VM, le pattern est :
   ```
   mkdir -p ~/.secrets && chmod 700 ~/.secrets
   nano ~/.secrets/<outil>.env
   chmod 600 ~/.secrets/<outil>.env
   ```
   Puis `. ~/.secrets/<outil>.env` dans les scripts qui en ont besoin.

Ne pas être moralisateur ni paniquer — être factuel, rapide, constructif. L'erreur est humaine et très courante.

## Erreur de ma part à ne pas reproduire

Le 2026-04-23, pour tester qu'un container Docker pouvait lire `~/.claude/.credentials.json`, j'ai demandé à Kieran de lancer `head -c 50 /home/claude_agent/.claude/.credentials.json`. Résultat : la sortie dans le chat contenait `{"claudeAiOauth":{"accessToken":"sk-ant-oat01-...` — un token OAuth Anthropic compromis dans le chat.

**Règle** : pour tester la lisibilité d'un fichier potentiellement secret, ne JAMAIS suggérer :
- `cat fichier` / `head fichier` / `head -c N fichier` / `tail fichier`
- `jq < fichier` / `grep < fichier` / tout ce qui affiche le contenu

**Toujours préférer** :
- `test -r fichier && echo "lisible" || echo "pas lisible"`
- `wc -c fichier` (taille seulement)
- `stat fichier` (métadonnées)
- `ls -la fichier` (permissions + taille, pas le contenu)
- `file fichier` (type de fichier)

Si **absolument** besoin de voir un extrait pour diagnostic, demander à Kieran d'isoler **une clé structurelle non-sensible** (ex: `jq 'keys' < fichier` qui liste les clés du JSON sans les valeurs), et jamais une coupe aveugle par octets ou lignes.

Les fichiers à traiter comme secrets par défaut (ne pas afficher) :
- `~/.claude/.credentials.json` (tokens OAuth Claude)
- `~/.secrets/*` (convention Kieran)
- `~/.ssh/id_*`, `~/.ssh/*_key`
- `.env`, `.env.*`
- `*.pem`, `*.key`, `*.jks`, `*.p12`
- Toute variable d'env `*_TOKEN`, `*_SECRET`, `*_KEY`, `*_PASSWORD`, `*_API_KEY`

## Incident 2026-04-24 (3) — Claude Ops a fuité un BACKEND_SECRET_KEY via `env | grep`

Pendant la migration horizon, Claude Ops a lancé un `docker exec container env | grep CORS` (ou équivalent avec grep trop large) pour vérifier les variables d'environnement du backend. La sortie a inclus **BACKEND_SECRET_KEY** (clé applicative critique : signature cookies session / JWT / chiffrement selon l'app). Fuite 6 du même jour.

**Règle** : pour vérifier UNE seule variable d'environnement dans un container, utiliser `printenv VAR_NAME`, **jamais** `env` suivi de `grep`.

Exemples :
```bash
# MAUVAIS — env dump tout, grep peut rater la discipline
docker exec container env | grep CORS
docker exec container bash -c 'env | grep -E "CORS|API"'

# BON — printenv retourne UNIQUEMENT la variable demandée
docker exec container printenv BACKEND_CORS_ORIGINS
docker exec container printenv BACKEND_API_URL

# BON — si besoin de plusieurs variables non sensibles, les nommer explicitement
docker exec container sh -c 'echo "CORS=$BACKEND_CORS_ORIGINS"; echo "URL=$BACKEND_API_URL"'
```

Corollaire pour toute commande qui produit de l'output potentiellement volumineux et susceptible de contenir des secrets : **rediriger vers un fichier `chmod 600`** au lieu de taper dans le terminal/transcript. Ensuite on grep/filter le fichier :
```bash
docker exec container env > /tmp/env-dump.txt
chmod 600 /tmp/env-dump.txt
grep '^BACKEND_CORS_' /tmp/env-dump.txt  # filtre sur noms, cut -d= -f1 si besoin
```

## Incident 2026-04-24 (2) — Claude Ops a ré-affiché le secret dans un plan sed

3e récidive de la même fuite : dans un plan de rotation Supabase, Claude Ops a écrit des commandes sed contenant la valeur littérale `sb_secret_<REDACTED_EXAMPLE>` pour illustrer le pattern de remplacement. Les 3 fuites du même secret dans le même chat cumulent l'exposition.

**Règle définitive pour les commandes de remplacement de secret dans un fichier** :

Ne JAMAIS écrire la valeur à remplacer. Toujours la DÉCOUVRIR depuis le fichier via grep/sed/awk avec un pattern regex :

```bash
# MAUVAIS
sed -i 's/sb_secret_N7UND0Ug.../NEW_VAL/g' fichier

# BON
OLD=$(grep -oE 'sb_secret_[A-Za-z0-9_-]+' fichier | head -1)
sed -i "s|${OLD}|${NEW_VAL}|g" fichier
```

Cette règle s'applique à toute commande qui TRANSFORME un fichier contenant un secret : `sed`, `awk`, `tr`, `perl -i`, etc.

## Incident 2026-04-24 — j'ai proposé un grep qui aurait affiché les valeurs

Pour diagnostiquer les variables d'environnement Supabase avant une rotation, j'ai proposé à Kieran un `grep -hE "...SECRET..." .env | sort -u`. Kieran a réagi juste avant de lancer : « ça va donner les secrets et tu vas encore m'engueuler ». Il avait raison.

**Règle renforcée** : quand je veux **lister les noms de variables** dans un fichier `.env` ou équivalent, **toujours ajouter `cut -d= -f1`** pour ne garder que la partie à gauche du `=`. Sans ça, `grep` renvoie aussi la valeur.

Bonnes commandes par usage :
- Lister les noms : `grep -E "^VAR" fichier | cut -d= -f1 | sort -u`
- Compter les occurrences : `grep -c "^VAR=" fichier`
- Voir si une clé existe : `grep -q "^VAR=" fichier && echo present`
- Vérifier la taille (longueur = indication de la forme) : `grep "^VAR=" fichier | wc -c`
- Vérifier le préfixe (format) : `grep "^VAR=" fichier | sed 's/=.*/=XXX/'` (remplace valeur par `XXX`)
- Pour un dump PostgreSQL : `file fichier.sql` (type MIME), `head -c 200 fichier` (en-tête uniquement, pas le contenu)

**Plus généralement** : avant de proposer toute commande qui lit un fichier potentiellement secret, me demander *"est-ce que la sortie de cette commande pourrait contenir une valeur sensible ?"*. Si oui, reformuler pour n'extraire que la métadonnée nécessaire (nom, taille, type, présence booléenne).

## Incident 2026-04-23 — Claude Ops a fuité la vraie valeur d'un secret

Pendant la Phase 0.3 du runbook migration, Claude Ops (dans le sandbox /srv/acreed-dev) a fait une analyse propre d'un secret compromis (`sb_secret_N7UN...` dans la crontab), puis a proposé une solution raisonnable (Option A' : désinfecter la crontab sans rotater). **MAIS** dans sa proposition de solution, pour donner à Kieran la commande exacte à exécuter, il a affiché **la vraie valeur complète du secret en clair** :

```
export SUPABASE_SERVICE_ROLE_KEY="sb_secret_<REDACTED_EXAMPLE>"
```

Cette fuite a invalidé son propre diagnostic : l'hypothèse "pas d'exfiltration" qui justifiait la rotation légère n'était plus vraie — le secret venait de sortir de la VM vers les logs Anthropic.

**Leçons à retenir** :

1. **Pour guider Kieran à copier un secret vers un fichier `.env`**, ne JAMAIS écrire sa valeur. Préférer :
   ```
   echo 'export VAR=LA_VALEUR_ACTUELLE' > ~/.secrets/fichier.env
   ```
   avec `LA_VALEUR_ACTUELLE` laissée comme placeholder littéral, ou :
   ```
   nano ~/.secrets/fichier.env   # tu copies la valeur depuis <source> sans me la montrer
   ```

2. **Dans un runbook de sécurité**, si on doit extraire un secret existant, c'est Kieran qui lance la commande sur la VM, pas Claude. Claude donne seulement la commande.

3. **Règle dure** : avant d'écrire une valeur dans une réponse utilisateur, se poser la question *« est-ce que cette valeur ressemble à un secret ? »*. Si oui, remplacer par `<VALEUR_EXISTANTE>` ou `<NOUVELLE_VALEUR>` et expliquer à Kieran où la récupérer.

4. **Si une fuite arrive**, escalader immédiatement :
   - Signaler à Kieran dès qu'on s'en rend compte
   - Considérer le secret comme exfiltré (élargit le rayon d'impact)
   - Adapter le plan de remédiation (rotation réelle au lieu de simple "désinfection")
   - Tracer l'incident dans le journal
