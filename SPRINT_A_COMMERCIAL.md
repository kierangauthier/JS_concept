# Sprint A — Kit Commercial

---

## 1. Release Note — Sprint A

**Version : 1.1.0 — Mars 2026**

### Ce qui a été ajouté

**Mentions légales automatiques sur tous les documents**
Les devis et factures PDF affichent désormais automatiquement les informations légales de votre société (SIRET, RCS, TVA intracommunautaire, forme juridique, capital) et celles du client quand elles sont renseignées. Ces mentions sont obligatoires en France — leur absence expose à des amendes de 15 000€ par infraction.

**Fiche client enrichie**
Chaque client peut désormais porter son numéro SIRET, son numéro de TVA intracommunautaire, une adresse de facturation distincte et un délai de paiement personnalisé (30, 45, 60 ou 90 jours). L'échéance de chaque facture se calcule automatiquement à partir de ce délai.

**TVA multi-taux sur les devis**
Chaque ligne de devis peut porter son propre taux de TVA (20%, 10%, 5,5%, 0%). Le PDF ventile automatiquement les totaux par taux. Indispensable pour les chantiers qui mélangent fourniture (20%), pose (10%) et travaux en zone protégée (5,5%).

**Facturation depuis le chantier**
Un chantier terminé peut être facturé en un clic. La facture reprend automatiquement toutes les lignes du devis d'origine avec leurs taux de TVA, et l'échéance est calculée selon le délai du client. Le chantier passe en statut "Facturé".

### Ce qui a été corrigé

**Page de connexion nettoyée**
Les identifiants de démonstration pré-remplis et les traces de débogage ont été retirés. La page de connexion est neutre et professionnelle.

### Ce que cela change concrètement

| Avant | Après |
|-------|-------|
| Documents PDF non conformes — risque juridique | Conformes Article L441-9 du Code de commerce |
| Un seul taux de TVA possible (20%) | 4 taux disponibles par ligne |
| Facturation manuelle — ressaisie de chaque ligne | 1 clic depuis le chantier terminé |
| Délai de paiement identique pour tous | Personnalisé par client, échéance auto |
| Écran de login avec données de test visibles | Interface professionnelle prête pour un prospect |

---

## 2. Script de Démo Commerciale — 35 minutes

**Public** : Dirigeant ou directeur administratif d'une PME BTP / signalisation routière
**Objectif** : Montrer que ConceptManager remplace les outils éclatés (Excel + Word + papier) par un flux complet devis-chantier-facture, conforme et fiable.
**Matériel** : Navigateur sur l'instance de démo, aucun slide.

---

### Acte 1 — Prise en main (5 min)

**Connexion**
"Je me connecte comme si j'étais la directrice administrative de votre société."
Se connecter avec un compte admin. Montrer que la page de login est vierge — pas de données de test, pas de mot de passe pré-rempli. C'est votre outil, pas une maquette.

**Vue d'ensemble**
"Voici le tableau de bord. On voit les devis en cours, les chantiers, la trésorerie prévisionnelle. Tout est filtrable par entité si vous avez plusieurs sociétés."
Montrer le filtre ASP / JS / Groupe. Ne pas s'attarder — le prospect verra par lui-même.

---

### Acte 2 — Paramétrage société (5 min)

**Aller dans Administration**
"Première chose quand on met l'outil en service : on renseigne les informations légales de la société."
Ouvrir les paramètres société. Montrer les champs SIRET, RCS, TVA, forme juridique, capital, adresse.

Point clé à dire :
> "Ces informations apparaissent automatiquement sur chaque devis et chaque facture que vous émettez. Vous n'y touchez plus jamais. C'est la fin du copier-coller depuis un modèle Word où quelqu'un oublie de mettre à jour l'adresse après un déménagement."

Compléter les champs si nécessaire.

---

### Acte 3 — Création d'un client (5 min)

**Aller dans Clients → Nouveau client**
"Créons le client pour le chantier qu'on va suivre ensemble."

Renseigner :
- Raison sociale, contact, email, téléphone
- Type : Public ou Privé
- SIRET et n° TVA du client
- Adresse de facturation (distincte si nécessaire)
- **Délai de paiement : 45 jours**

Point clé à dire :
> "Le délai de paiement est porté par le client, pas par la facture. Quand vous facturez ce client, l'échéance se calcule toute seule. Plus de post-it, plus de tableau Excel pour savoir qui paie à 30 et qui paie à 60."

---

### Acte 4 — Le devis multi-TVA (8 min)

C'est le coeur de la démo. Prendre son temps.

**Aller dans Devis → Nouveau devis**
Créer un devis réaliste pour de la signalisation routière :

| Ligne | Unité | Qté | P.U. HT | TVA |
|-------|-------|-----|---------|-----|
| Fourniture panneaux directionnels | u | 8 | 95 € | 20% |
| Pose et scellement panneaux | u | 8 | 120 € | 10% |
| Marquage au sol thermocollé | ml | 150 | 14 € | 10% |
| Étude de signalisation réglementaire | fft | 1 | 800 € | 20% |

Points clés à dire pendant la saisie :
> "Chaque ligne a son propre taux de TVA. Sur un chantier BTP, c'est indispensable : la fourniture c'est 20%, la main d'oeuvre sur existant c'est souvent 10%, et si vous travaillez en zone classée c'est 5,5%. L'outil gère ça nativement."

Montrer les totaux en temps réel : HT, ventilation TVA par taux, TTC, marge.

> "En bas, vous voyez le coût de revient et votre marge. Si la marge passe sous 15%, l'indicateur vire au rouge. Vous ajustez avant d'envoyer, pas après."

**Télécharger le PDF**
Ouvrir le PDF généré. Parcourir avec le prospect :
- En-tête : nom, adresse, SIRET, RCS, TVA de la société
- Bloc client : nom, adresse, SIRET, TVA du client
- Tableau : chaque ligne avec sa colonne TVA
- Totaux : ventilation HT + TVA 10% + TVA 20% + TTC
- Pied de page : mentions légales complètes

> "Ce document sort directement de l'outil. Il est conforme. Vous pouvez l'envoyer tel quel à une collectivité ou à un maître d'ouvrage. Plus besoin de retoucher un PDF ou de passer par Word."

---

### Acte 5 — Du devis au chantier (3 min)

**Accepter le devis**
Passer le devis en "Envoyé" puis "Accepté".

**Convertir en chantier**
Cliquer sur "Convertir". Montrer le chantier créé avec sa référence, le lien vers le devis, le client repris.

> "Un clic. Le chantier est créé, lié au devis, prêt à planifier. Vos conducteurs de travaux le voient sur leur planning. Plus de double saisie."

---

### Acte 6 — Facturation en un clic (5 min)

C'est le moment de vérité commercial. Ne pas se presser.

**Terminer le chantier**
Passer le chantier en "En cours" puis "Terminé".

**Cliquer sur Facturer**
Le bouton "Facturer" apparaît sur un chantier terminé. Un seul clic.

Montrer la facture créée :
- Référence auto (FAC-XXX-2026-xxx)
- Les 4 lignes du devis reprises à l'identique
- Les taux de TVA conservés
- L'échéance calculée à J+45 (le délai du client)

> "Aucune ressaisie. Les lignes viennent du devis, les taux de TVA sont les bons, l'échéance est celle du client. Votre comptable n'a plus qu'à valider."

**Télécharger le PDF facture**
Montrer les mêmes mentions légales, les lignes détaillées, la ventilation TVA.

> "La facture est conforme, prête à envoyer. Vous pouvez aussi l'envoyer par email directement depuis l'outil."

---

### Acte 7 — Facturation de situation (2 min)

**Sur la facture, créer une situation à 30%**

> "Sur les gros chantiers, vous ne facturez pas tout à la fin. Vous facturez par avancement. Ici, je crée une situation à 30% — l'outil calcule le montant correspondant. À 60%, puis 100%, même chose. C'est le fonctionnement standard du BTP."

---

### Acte 8 — Questions et closing (2 min)

Revenir sur le tableau de bord. Montrer le flux complet qu'on vient de parcourir : client → devis → chantier → facture.

> "Tout ce qu'on vient de faire en 30 minutes, c'est le quotidien de votre assistante administrative. Aujourd'hui, elle le fait dans 3 ou 4 outils différents. Demain, c'est un seul écran, un seul flux, zéro ressaisie."

Laisser le prospect poser ses questions.

---

## 3. 10 Arguments Commerciaux

**1. Vos documents sont conformes dès le premier jour**
SIRET, RCS, TVA intracommunautaire, mentions légales — tout apparaît automatiquement sur chaque devis et chaque facture. L'absence de ces mentions sur une facture, c'est 15 000€ d'amende par document. Vous renseignez vos informations une fois, l'outil s'en occupe ensuite.

**2. Vous facturez un chantier terminé en un clic**
Quand un chantier est fini, un bouton. La facture reprend les lignes du devis, les bons taux de TVA, la bonne échéance. Votre assistante ne ressaisit plus rien. Résultat : vous facturez le jour même au lieu d'attendre 2 semaines que quelqu'un retrouve le devis.

**3. La TVA multi-taux est native**
En BTP, un même chantier mélange du 20%, du 10% et parfois du 5,5%. Aujourd'hui vous gérez ça à la main dans Excel ou Word. ConceptManager le fait par ligne, avec ventilation automatique sur le PDF. Plus d'erreur, plus de redressement TVA.

**4. Chaque client a son propre délai de paiement**
30 jours pour un privé, 45 pour cette collectivité, 60 pour ce promoteur. Le délai est sur la fiche client. Chaque facture calcule son échéance automatiquement. Vous savez exactement quand l'argent doit rentrer, sans tableau de suivi parallèle.

**5. Du devis à la facture, aucune donnée ne se perd**
Le devis devient un chantier. Le chantier devient une facture. À chaque étape, les données remontent : lignes, prix, taux, client. Pas de copier-coller, pas de fichier qui traîne sur un bureau, pas de version obsolète envoyée par erreur.

**6. Votre marge est visible avant d'envoyer le devis**
Coût de revient et pourcentage de marge s'affichent en temps réel pendant la saisie. Si vous êtes sous 15%, l'indicateur passe au rouge. Vous ajustez le prix avant d'envoyer — pas quand le chantier est déjà signé à perte.

**7. Deux sociétés, un seul outil**
Si vous avez une structure pour la signalisation et une autre pour les travaux, chaque entité a sa propre numérotation, ses propres mentions légales, ses propres clients. Mais vous pilotez tout depuis un seul écran avec une vue groupe.

**8. La facturation de situation fonctionne comme sur vos chantiers**
Vous ne facturez pas 100% à la livraison. Vous facturez à 30%, puis 60%, puis le solde. L'outil gère les situations avec calcul automatique du montant par tranche. C'est le fonctionnement standard du BTP, pas un formulaire générique.

**9. Vos conducteurs accèdent au terrain, votre comptable accède aux chiffres**
Chaque utilisateur voit ce qui le concerne. Le conducteur voit ses chantiers et pointe ses heures sur son téléphone. Le comptable voit les factures et exporte en format comptable. Le dirigeant voit tout. Pas besoin de formation de 3 jours — l'interface est pensée pour des gens qui passent leur journée sur des chantiers, pas devant un écran.

**10. 18 000€ par an, c'est une assistante administrative 3 jours par mois**
C'est le temps que votre équipe passe aujourd'hui à ressaisir des devis dans des factures, à chercher le bon taux de TVA, à calculer des échéances, à vérifier que le SIRET est sur le document. Ce temps-là, vous ne le payez plus. Et contrairement à une assistante, l'outil ne fait pas d'erreur de saisie, ne prend pas de congés et ne perd pas le fichier.
