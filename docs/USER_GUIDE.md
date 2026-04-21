# Guide utilisateur ConceptManager

Ce guide couvre les fonctionnalités ajoutées lors des sprints QA/UX (sprints 1 à 4).
Il complète le manuel métier existant — il ne le remplace pas.

---

## Sommaire

1. [Raccourcis clavier](#raccourcis-clavier)
2. [Planning : drag & drop des créneaux](#planning--drag--drop-des-créneaux)
3. [Aperçu PDF avant envoi](#aperçu-pdf-avant-envoi)
4. [Perte de saisie : garde-fous](#perte-de-saisie--garde-fous)
5. [Terrain mobile : pull-to-refresh](#terrain-mobile--pull-to-refresh)
6. [File d'attente offline : queue & dead-letter](#file-dattente-offline--queue--dead-letter)
7. [Archivage des clients](#archivage-des-clients)
8. [Session expirée](#session-expirée)

---

## Raccourcis clavier

### Planning

| Raccourci | Action |
|-----------|--------|
| `Ctrl + ←` | Semaine précédente |
| `Ctrl + →` | Semaine suivante |
| `Home` ou `T` | Revenir à la semaine en cours |
| `E` | Basculer en vue « Équipes » |
| `R` | Basculer en vue « Techniciens » |

Les raccourcis sont ignorés lorsque le curseur est dans un champ de saisie.

---

## Planning : drag & drop des créneaux

Depuis un planning en brouillon (non verrouillé) :

1. Survolez un créneau : le curseur devient une main.
2. Cliquez-glissez le créneau vers un autre jour de la même équipe.
3. Relâchez : la cellule cible s'illumine avant le dépôt.

**Règles :**

- Le déplacement **entre équipes** n'est pas encore supporté ; un message d'avertissement apparaît.
- Si le nouveau créneau **chevauche** un créneau existant sur le jour cible, un toast rouge bloque le déplacement et l'original reste en place.
- Si le serveur rejette la recréation (problème réseau, droits, etc.), le toast d'erreur demande de recréer manuellement via le bouton `+`.

---

## Aperçu PDF avant envoi

Sur un devis ou une facture sélectionné, trois boutons :

- **Aperçu** (👁) — ouvre le PDF généré dans une fenêtre, sans l'envoyer.
- **PDF** (⬇) — télécharge directement le fichier.
- **Email** (✉) — envoie le devis/facture au client.

Depuis l'aperçu, un bouton `Télécharger` permet de récupérer le fichier sans fermer la fenêtre.

---

## Perte de saisie : garde-fous

Les formulaires longs (devis, client, chantier) protègent désormais contre la perte accidentelle de saisie.

Si vous avez modifié des champs et tentez de fermer le panneau (Esc, clic extérieur, bouton Annuler), une confirmation s'affiche :
> *Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?*

En cas de rechargement de l'onglet (F5, fermeture du navigateur), une confirmation native du navigateur apparaît également.

---

## Terrain mobile : pull-to-refresh

Sur les écrans Terrain (Aujourd'hui, Chantiers, Photos, Heures) :

- **Faire glisser vers le bas** depuis le haut de l'écran déclenche un rafraîchissement des données.
- L'indicateur circulaire tourne pendant la mise à jour.
- Disponible uniquement en tactile (pas au trackpad).

---

## File d'attente offline : queue & dead-letter

Lorsqu'une action (saisie d'heures, photo, signature) est déclenchée **hors connexion**, elle est placée dans la file d'attente locale.

### Synchronisation automatique

- Dès le retour du réseau, la file se vide automatiquement.
- Chaque mutation est retentée jusqu'à **3 fois**.

### Dead-letter (échecs persistants)

Après 3 échecs, la mutation passe en statut **« Échec »** et **n'est plus retentée automatiquement**. C'est une protection contre les données corrompues qui tourneraient en boucle.

Pour résoudre un échec :

1. Cliquez sur la barre de statut en haut de l'écran Terrain, ou accédez à **Terrain › File d'attente**.
2. La bannière rouge indique combien d'éléments sont en échec.
3. Cliquez sur **Réessayer tout** pour remettre en file toutes les mutations en échec.
4. Si un élément spécifique est invalide, le bouton poubelle permet de le supprimer définitivement.

---

## Archivage des clients

Dans la fiche client, le bouton **Archiver** (aux côtés de Modifier) permet de retirer un client inactif sans supprimer ses données historiques (devis, factures, chantiers restent consultables).

- Action **destructive** mais **réversible côté base** (soft-delete).
- Seuls les clients non-archivés apparaissent dans la liste.
- La restauration nécessite aujourd'hui une action côté base de données (à exposer dans l'admin plus tard si besoin).

---

## Session expirée

Si votre session expire (inactivité prolongée), un message **« Session expirée — veuillez vous reconnecter »** s'affiche et vous êtes redirigé vers la page de connexion. Après reconnexion, vous êtes **ramené automatiquement à la page que vous consultiez**, pas au tableau de bord.

Cela ne protège **pas** la saisie en cours — enregistrez régulièrement les formulaires longs.
