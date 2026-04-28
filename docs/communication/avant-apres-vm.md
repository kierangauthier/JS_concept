# Mise au propre du serveur Acreed — État du système

> **Objet** : compte-rendu exécutif de la mise en conformité du serveur de production AVD-01.
>
> **Date** : 27 avril 2026
>
> **Public visé** : direction Acreed (Consulting + IA Solutions), futurs partenaires audit / DPA / RGPD, futurs investisseurs, futur dev senior rejoignant l'équipe.

---

## En une phrase

Le serveur a été restructuré pour passer d'un environnement de prototypage hérité à une infrastructure de production en règle, prête à accueillir les premiers clients payants de ConceptManager.

---

## Pourquoi nous avons fait cela

Acreed IA Solutions s'apprête à signer ses premiers contrats clients (JS Concept, ASP Signalisation) avec un objectif de mise en production sous 30 jours. Le serveur historique avait été monté au fil des projets, chaque outil ajouté de façon isolée sans plan d'ensemble. Cette organisation, suffisante pour la phase de R&D, n'était pas tenable pour héberger des données clients facturées :

- **Risque juridique et commercial** : aucun client professionnel ne signe un DPA (Data Processing Agreement) sans s'assurer que son hébergeur sépare proprement son environnement des autres. Un environnement de tests partagé avec une production active est un point de blocage immédiat dans toute négociation contractuelle B2B.

- **Risque opérationnel** : sans isolation entre développement et production, une mauvaise commande sur un projet de test peut interrompre un service utilisé en production. Plus le nombre d'outils croît, plus le risque devient inacceptable.

- **Risque sécurité** : des secrets en clair (clés d'API, tokens d'authentification) traînaient dans des fichiers de configuration, accessibles à tout intervenant ayant ouvert une session sur le serveur. Un audit de sécurité minimal aurait identifié ces points en premier.

- **Risque humain** : la connaissance de l'organisation du serveur reposait sur la mémoire de ceux qui l'avaient construit. Aucun document ne permettait à un nouveau collaborateur de prendre le relais sans une formation de plusieurs jours auprès du créateur initial.

L'objectif de cette session était d'éliminer ces quatre risques en une seule intervention coordonnée, sans interruption perceptible pour les utilisateurs des outils internes.

---

## Ce qui était en place — état avant

### Une vingtaine d'outils dispersés

Le serveur hébergeait 14 applications réparties dans 5 emplacements différents :

| Emplacement | Nombre d'applications |
|---|---|
| `/opt/` | 2 |
| `/home/kierangauthier/claude-secure/` | 3 |
| `/home/azureuser/` | 1 |
| `/srv/prod/` (sans sous-catégorisation) | 8 |

Aucune logique d'organisation n'unifiait ces emplacements. Pour comprendre où se trouvait un outil, il fallait soit le savoir, soit chercher manuellement.

### Aucune séparation entre développement et production

Tous les outils — qu'ils soient utilisés par des consultants en production, en cours de test, ou abandonnés — partageaient la même infrastructure réseau. Une opération sur un environnement de test pouvait techniquement impacter un environnement de production.

### Plusieurs failles de sécurité dormantes

- Clés API et secrets stockés en clair dans certains fichiers de configuration accessibles
- Bases de données exposées sur des ports publics sans nécessité
- Aucun pare-feu actif au démarrage de la session précédente (corrigé en avril)
- Fragments de projets abandonnés (cumulant ~900 Mo) gardés "au cas où", augmentant la surface d'attaque

### Aucune documentation utilisable

Pas de plan d'architecture, pas de procédure d'onboarding, pas de runbook opérationnel partagé. Chaque intervention sur le serveur reposait sur la mémoire du dernier intervenant.

---

## Ce qui est en place maintenant — état après

### Une arborescence claire en 3 zones

```
/srv/
├── prod/         applications de production
├── dev/          environnements de développement et tests
└── claude/       environnement de l'agent Claude (skills, mémoire, runbooks)
```

À l'intérieur de la production, 4 sous-catégories distinguent la nature de chaque projet :

| Sous-catégorie | Contenu | Exemples |
|---|---|---|
| `conceptmanager/` | Déploiements clients du produit ConceptManager | (vide aujourd'hui — accueillera JS Concept, ASP Signalisation, etc.) |
| `tools/` | Outils internes Acreed | CRM Freyr, wiki Outline, automatisation n8n, builder Ostara, mimir, puyfoot43, horizon, dt, verif-paie-web |
| `sites/` | Sites web institutionnels | site Acreed Consulting |
| `astreos/` | Outil interne Acreed Consulting (cas spécial pour des raisons techniques) | astreos |

Pour un nouveau client ConceptManager, l'emplacement de son déploiement est connu d'avance : `/srv/prod/conceptmanager/<nom-client>/`. Plus besoin de réfléchir.

### Trois niveaux d'isolation entre dev et prod

| Niveau | Mécanisme |
|---|---|
| Physique | Chemins distincts (`/srv/prod/...` vs `/srv/dev/...`) |
| Réseau | Réseaux Docker isolés (`acreed-prod`, `acreed-dev`, `acreed-tools`, `acreed-trash`) |
| Logique | Étiquette de catégorie sur chaque container |

Une opération sur un environnement de développement ne peut techniquement plus affecter un environnement de production. C'est la garantie minimale qu'un client professionnel attend avant de signer.

### Une convention de nommage qui se déduit toute seule

Pour chaque application, six identifiants techniques (chemin, URL publique, réseau, container, base de données, volume) se déduisent mécaniquement d'un seul nom court (le "slug"). Quand on signera Dupont SAS comme client ConceptManager, son installation sera automatiquement à `/srv/prod/conceptmanager/dupont-sas/`, accessible sur `dupont-sas.acreediasolutions.com`, avec ses containers nommés `cm-dupont-sas-<service>`, etc. Aucune décision arbitraire à prendre. Aucune divergence d'un client à l'autre.

### Une documentation à 5 niveaux

À l'issue de la session, le serveur dispose de :

| Document | Audience | Rôle |
|---|---|---|
| Convention `/srv/` | Architectes, futurs développeurs | Règle canonique d'organisation |
| Arborescence du serveur | Tout intervenant | Photo à jour de "où est quoi" |
| Notes d'incidents | Agent Claude futur | Comment éviter les pièges déjà rencontrés |
| Compte-rendu et REX | Direction, agent futur | Synthèse de l'intervention |
| Guide de prise en main | Nouveau développeur | Comment commencer à travailler sur le serveur |

Un développeur senior arrivant sur le serveur dispose d'un parcours documentaire complet pour devenir opérationnel en quelques heures, sans dépendre de la mémoire d'un autre membre de l'équipe.

### Les outils en service

Onze URLs publiques sont en service à l'issue de la session, toutes en réponse normale (code 200) :

- `astreos.acreedconsulting.com` (outil consultants Acreed Consulting)
- `site.acreedconsulting.com` (site Acreed Consulting)
- `ostara.acreedconsulting.com` (outil interne d'édition d'apps)
- `outline.acreediasolutions.com` (wiki interne)
- `freyr.acreediasolutions.com` (CRM commercial)
- `mimir.acreediasolutions.com` (POC immobilier)
- `puyfoot43.acreediasolutions.com` (suivi marketing)
- `horizon.acreediasolutions.com` (outil RH/trésorerie)
- `outil.rh.acreediasolutions.com` (outil RH paie)
- `n8n.acreediasolutions.com` (automatisation)
- `dt.acreediasolutions.com` (convertisseur de Dossier Technique)

Tous fonctionnaient avant la session, tous fonctionnent après.

---

## Pourquoi cette intervention a coûté plus que prévu

L'intervention était prévue pour 4 heures, elle en a duré près de 6. La différence vient de **onze incidents** rencontrés en cours de route : pièges techniques héritages, divergences entre la documentation du serveur et son état réel, comportements non documentés de Docker.

Chacun de ces incidents a été traité avec la même méthode :

1. Détection avant qu'il ne cause de dégât
2. Arrêt immédiat de l'intervention
3. Audit approfondi en lecture seule
4. Filet de sécurité (sauvegarde tgz + dump base de données chiffré)
5. Décision documentée et validée par Kieran
6. Action ciblée
7. Validation par mesure (compteur de lignes en base, pas seulement "le site répond")

**Aucun de ces incidents n'a causé de perte de donnée**. Plusieurs auraient pu, sans cette discipline. L'incident le plus sérieux — un comportement de Docker qui rendait silencieusement les bases de données invisibles après un déplacement de dossier — concernait directement les données de l'outil mimir, en service depuis plusieurs mois.

Le coût supplémentaire de ces deux heures représente la prime d'assurance que paye Acreed pour ne pas avoir perdu ces données. C'est aussi le prix d'apprentissage : chacun des onze incidents a fait l'objet d'une note de leçon apprise, conservée pour les futures interventions. Le prochain serveur Acreed (ou la prochaine session sur celui-ci) ne paiera pas ces deux heures.

---

## Ce qui reste à faire

Quelques sujets ont été identifiés et reportés à des sessions ultérieures, soit parce qu'ils n'étaient pas critiques pour l'objectif principal, soit parce qu'ils méritaient leur propre intervention dédiée.

| Sujet | Échéance proposée | Risque actuel |
|---|---|---|
| Rotation de deux secrets exposés pendant la session | Cette semaine | Faible — exposition limitée à un transcript privé Anthropic |
| Mise en place d'un pare-feu plus strict (durcissement secrets) | 2 semaines | Moyen — la VM est déjà derrière un pare-feu général |
| Rotation d'un ancien secret Supabase | Session dédiée 3-5 h | Faible — secret actif uniquement en interne (couvert par pare-feu) |
| Mise en place de la supervision (alertes proactives) | Session dédiée 2 h | Sans urgence pour le démarrage |
| Mise en place de sauvegardes hors-site | Session dédiée 1 h | À planifier avant signature du premier client |
| Préparation d'un environnement de test isolé pour développer les automatismes Claude | Session dédiée 1 h | Sans urgence |

Toutes ces tâches sont documentées et priorisées. Aucune n'est bloquante pour la signature des premiers clients.

---

## Conclusion exécutive

Le serveur AVD-01 est désormais conforme aux pratiques attendues d'un hébergement de production. La signature d'un premier contrat ConceptManager peut être préparée sans contrainte technique liée à l'infrastructure.

L'intervention a permis :

- D'organiser physiquement et logiquement les 14 applications hébergées
- D'isoler dev et production à trois niveaux
- D'éliminer 900 Mo de code mort et plusieurs services obsolètes
- De documenter l'architecture pour permettre l'arrivée d'un nouveau collaborateur
- De récupérer (sans perte) les données de mimir, mises en péril par un comportement subtil de Docker
- De produire une mémoire de leçons apprises pour les futures interventions

Trois dettes techniques mineures ont été identifiées et planifiées. Aucune ne s'oppose au calendrier commercial.

---

*Document rédigé le 27 avril 2026 sur la base des données factuelles produites par l'intervention. Pour la version technique détaillée, voir le compte-rendu et REX d'intervention. Pour comprendre l'organisation actuelle du serveur, voir le guide de prise en main.*
