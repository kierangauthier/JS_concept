# Stratégie Commerciale — ConceptManager
> Document de référence interne · Avril 2026

---

## 1. Vision produit

ConceptManager est une **base technique solide** (NestJS + React + IA) que l'on adapte sur mesure pour chaque client. Ce n'est pas un SaaS à paliers fixes — c'est un outil dont le front, les modules activés et les use cases IA sont façonnés selon les vrais besoins du client, pas l'inverse.

**Les use cases IA viennent des clients.** On ne vend pas une liste de features prédéfinies, on cadre avec eux ce qui a de la valeur dans leur métier et on l'implémente.

---

## 2. Deux offres distinctes

### Offre A — ConceptManager complet
**Pour : les clients qui n'ont pas d'outil de gestion**

On leur vend la plateforme complète (CRM, devis, facturation, chantiers, catalogue, IA) personnalisée à leur métier. Chaque déploiement est adapté : vocabulaire, modules actifs, couleurs, PDF aux couleurs de l'entreprise, et use cases IA construits avec eux.

**Tarif indicatif :**
- Setup / onboarding (personnalisation + cadrage IA) : **à partir de 1 500 €** (one-shot)
- Abonnement mensuel (hébergement + support + évolutions mineures) : **à partir de 199 €/mois**
- Développements IA spécifiques supplémentaires : sur devis (demi-heure de cadrage suffit pour chiffrer)

---

### Offre B — Couche IA sur outil existant
**Pour : les clients qui ont déjà un ERP, CRM, ou logiciel métier**

Ils n'ont pas besoin de ConceptManager. Ils ont besoin qu'on analyse leurs données, automatise des tâches répétitives, et construise des assistants intelligents branchés sur leur système. C'est une offre conseil/intégration IA pure.

**Tarif indicatif :**
- Mise en place (analyse du système existant + intégration + premiers use cases) : **à partir de 2 500 €** (one-shot)
- Abonnement mensuel (maintenance + évolutions + nouveaux use cases) : **à partir de 299 €/mois**

---

## 3. Positionnement tarifaire

### Règle de base
Ne jamais arriver chez un client avec "tout est possible, tout est sur mesure, donc on ne peut pas chiffrer tout de suite". Ça fait fuir. Donner toujours **un plancher honnête** et affiner en 30 minutes d'échange.

### Grille à sortir devant un prospect

| | Offre A (avec outil) | Offre B (couche IA) |
|---|---|---|
| **Setup one-shot** | à partir de 1 500 € | à partir de 2 500 € |
| **Mensuel récurrent** | à partir de 199 €/mois | à partir de 299 €/mois |
| **Use cases IA additionnels** | sur devis | sur devis |

**Remise engagement annuel :** -15% sur l'abonnement mensuel.

### Ce que ces tarifs ne couvrent PAS
- Les développements front sur mesure importants (refonte UX, nouveaux modules métier) → chiffrés séparément
- Les intégrations avec des systèmes tiers complexes (Chorus Pro, API fabricant, etc.) → sur devis
- La formation des équipes au-delà de l'onboarding initial → sur devis

---

## 4. Le problème à résoudre (état actuel)

Situation bloquante identifiée :
- On ne peut pas vendre de l'IA facilement car **pas d'exemple de use case concret et démontrable**
- On ne peut pas vendre l'outil facilement car **trop cher perçu sans l'IA qui justifie la valeur**
- Face à un client qui a déjà un outil, on n'a **rien à montrer de concret** sur ce qu'on peut faire avec son système existant

**La solution : une démo "WoW" universelle** — ThermiPro (voir section 5) — qui sert les deux offres et débloque les deux situations.

---

## 5. La démo ThermiPro

### Concept
Une entreprise fictive réaliste et complète dans ConceptManager, qu'on peut montrer en live à n'importe quel prospect.

**ThermiPro SAS** — Installateur certifié RGE QualiPAC, spécialisé pompes à chaleur air-eau et eau-eau, résidentiel et petit collectif. 8 salariés, CA ~1,2M€/an, Île-de-France.

Pourquoi ce secteur :
- Projets à forte valeur (8 000 € – 30 000 €) → les marges et devis sont importants
- Catalogue fabricant réel (Mitsubishi Ecodan, Daikin Altherma) → import CSV crédible
- Workflow complet et riche : visite technique → devis → chantier → situations → réception → SAV
- Spécificités métier fortes : TVA 5,5%/10%, MaPrimeRénov', sous-traitance, autoliquidation TVA

### Ce que la démo contient (à construire)
- [ ] 4-5 clients fictifs avec historique
- [ ] Catalogue PAC Mitsubishi + Daikin (CSV importé, prix proches du marché)
- [ ] Devis à différents stades (brouillon, envoyé, accepté, refusé)
- [ ] Chantiers en cours avec situations de travaux
- [ ] Factures dont une en retard de paiement (pour montrer relance auto)
- [ ] Use cases IA démontrables : génération devis depuis description, analyse de marge, chatbot métier

### Script démo (15 minutes, à construire)
Fil rouge : la famille Dupont veut remplacer sa chaudière fioul par une PAC Mitsubishi 12kW.

1. Appel entrant → création client en 30 secondes
2. Description du projet → devis généré par l'IA
3. Ouverture catalogue "Ecodan" filtré → ajout PAC + module hydraulique + pose → marge 38% visible
4. Envoi email depuis l'outil → accepté → chantier créé automatiquement
5. Situation 1 (30% acompte) → facture envoyée
6. Photo de fin de chantier jointe au dossier
7. Facture solde → relance auto déclenchée
8. Dashboard : "3 chantiers ce mois, marge moyenne 34%, 1 impayé en cours"

**Pivot selon le profil prospect :**
- Client sans outil → on montre tout, de bout en bout
- Client avec outil existant → on isole les moments IA ("imaginez ça branché sur votre Batigest")

---

## 6. Prochaines étapes

- [ ] Construire les données ThermiPro dans ConceptManager (catalogue CSV + clients + devis + chantiers)
- [ ] Rédiger le script démo détaillé pour les commerciaux
- [ ] Créer la grille tarifaire une page (document commercial propre)
- [ ] Rebuild Docker avec les dernières évolutions (marge directe, catalogue → devis, vatMode)

---

*Ce document est vivant — le mettre à jour à chaque inflexion stratégique.*
