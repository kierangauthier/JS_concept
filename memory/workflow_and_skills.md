---
name: Méthode de travail Acreed (vibe code)
description: Kieran et son collègue ne sont pas devs — ils pilotent Claude pour produire. À savoir pour calibrer tous mes conseils (explications, exemples de code, rythme).
type: user
---

# Méthode réelle

Kieran et son collègue **ne codent pas eux-mêmes**. Ils pilotent Claude (sur leurs machines et sur la VM) pour produire le code. ConceptManager comme Ostara sont issus de ce workflow "vibe code supervisé".

**Why:** Reconnaître ça change complètement comment je dois les aider. Un dev me demande "comment faire", je réponds par du code. Un pilote de Claude me demande la même chose, je dois lui donner un **prompt clair à déléguer à Claude**, ou lui expliquer **pourquoi** avant le comment.

**How to apply:**

- Quand je propose du code, je l'écris **quand même** en détail (parce qu'ils vont le confier à Claude, et plus le contexte est riche, mieux Claude produit).
- Mais j'insiste aussi sur le **pourquoi** de chaque choix structurant, pour qu'ils puissent valider/rejeter même sans comprendre la syntaxe.
- Quand je recommande une action technique lourde (refactor, migration), je leur propose directement **un prompt prêt à coller à Claude sur leur VM/machine**.
- Pour toute doc technique produite par Claude sans supervision humaine, je les encourage à faire "Claude, explique-moi chaque section en 2 phrases comme si j'étais pas dev" avant de valider.

# Conséquences

## Avantages

- **Vitesse de production 5-10× plus rapide** qu'une équipe traditionnelle.
- **Coût marginal par client quasi nul** (l'IA est facturée à l'usage, pas en salaire). Marge brute potentielle ~95%.
- **Capacité à absorber du sur-mesure** sans exploser le coût, contrairement à un concurrent avec dev humain.

## Risques spécifiques

1. **Dépendance Anthropic**. Si tarifs, quotas ou conditions changent, toute la chaîne de production peut se bloquer. À monitorer, à avoir un plan B (Gemini déjà utilisé sur Ostara).
2. **Capacité à débugger quand Claude ne trouve pas**. Tout va bien tant que Claude sait résoudre. Un bug tordu sans solution immédiate = blocage. Il faut accepter de demander de l'aide (forum, Discord, etc.).
3. **Compréhension limitée du code en profondeur**. Pour répondre à "j'ai un bug chez moi" par un client, ils doivent savoir au moins **lire** le code et **identifier** la zone concernée. Pas besoin de le modifier à la main.
4. **Scalabilité du support**. Un ticket client = plus long si à chaque fois il faut rebriefer Claude. Doit être anticipé (templates de prompts support, documentation des cas courants).
5. **Qualité en surface vs en profondeur**. Le vibe code non-supervisé produit du code qui **semble** propre mais peut cacher des trous. Le remède : audits réguliers (ce qu'on a fait sur ConceptManager V1-V6 est à appliquer à Ostara aussi, en Phase 2).

# Pitch commercial à construire

Ne PAS dire "on utilise de l'IA pour coder" — trop générique, tout le monde le dit.

Dire : **"Méthode de production 10× plus rapide."** C'est le différenciateur réel et vendable. "On livre en 2 semaines ce que nos concurrents livrent en 6 mois, avec le même niveau de qualité (cf. V1-V6 de ConceptManager : sécurité durcie, RGPD, Factur-X)."

# Ce qu'il NE faut PAS faire

- Demander à Claude de faire de l'architecture complexe sans supervision humaine → risque de dérive.
- Accumuler de la doc que seul Claude comprend → sert à rien.
- Sous-traiter aussi le pilotage qualité → perte de contrôle, bugs cachés.

**Leur travail de pilote = garder le cap, valider les livrables, détecter les trous.** C'est ça, la valeur ajoutée humaine. Pas le code.
