/**
 * seed-knowledge-thermipro.ts
 * Chunks documentaires techniques Mitsubishi Ecodan pour le RAG ThermiPro.
 * Sources : Guide Technique Ecodan 2024, Catalogue Ecodan 2025/2026,
 *           Boussole Réglementaire, dépliant F-GAZ.
 */

import { PrismaClient } from '@prisma/client';

export async function seedKnowledgeThermiPro(prisma: PrismaClient): Promise<void> {
  console.log('📚 Seeding base documentaire technique ThermiPro (RAG)...');

  // Supprime les anciens chunks ThermiPro avant de re-seeder
  await prisma.knowledgeChunk.deleteMany({ where: { companyId: 'co_tp' } });

  const chunks: Array<{
    content: string;
    source: string;
    sourceType: string;
    page?: number;
    chunkIndex: number;
    tags: string[];
  }> = [

    // ══════════════════════════════════════════════════════════════════════
    //  GAMME PRODUITS — GUIDE DE CHOIX
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'ECODAN_CATALOGUE_2025-2026.pdf', sourceType: 'pdf', page: 25, chunkIndex: 0,
      tags: ['gamme', 'guide_choix', 'ecodan', 'split', 'hydrosplit'],
      content: `GUIDE DE CHOIX DES SOLUTIONS ECODAN — GAMME AIR/EAU SPLIT

ECO INVERTER (R32) — Maisons neuves RE2020
Groupes extérieurs split : SUZ-SWM30VA (3kW), SUZ-SWM40VA2 (4kW), SUZ-SWM60VA2 (6kW), SUZ-SWM80VA2 (8kW), SUZ-SWM100VA (10kW).
Réversible · COP jusqu'à 5,11 · -25°C extérieur · R32 · 60°C eau sans appoint.
Modules compatibles : ERSD-VM6E (chauffage seul mural) · ERST17D-VM6BE (Duo 170L 2 zones) · ERST20D-VM6E (Duo 200L) · ERST30D-VM6EE (Duo 300L).

ECO INVERTER+ HYPER HEATING (R32) — Zones froides
Groupes : SUZ-SHWM30VAH, SUZ-SHWM40VAH, SUZ-SHWM60VAH (3 à 6kW).
Puissance maintenue jusqu'à -20°C · -25°C extérieur · R32 · mêmes modules que Eco Inverter.

POWER INVERTER SILENCE (R32) — Rénovation haute température
Groupes : PUZ-SWM80VAA (8kW mono), PUZ-SWM80YAA (8kW tri), PUZ-SWM100VAA (10kW), PUZ-SWM120VAA (12kW).
Silence 42 dB(A) · 68°C eau · -25°C · R32.
Grandes puissances R410A : PUHZ-SW220VKA (22kW), PUHZ-SW250VKA (25kW).

ZUBADAN SILENCE (R32) — Super chauffage rénovation
Groupes : PUZ-SHWM80VAA/YAA (8kW), PUZ-SHWM100VAA/YAA (10kW), PUZ-SHWM120VAA/YAA (12kW), PUZ-SHWM140VAA/YAA (14kW).
Puissance maintenue -15°C · 70°C eau à -7°C sans appoint · -30°C · COP 5,05.
Modules Zubadan : ERSF-VM6E, ERSF-YM9E (chauffage seul) · ERST17D-VM6BE, ERST20F-VM6E/YM9E, ERST30F-VM6EE/YM9EE.
Grande puissance : PUHZ-SHW230YKA2 (23kW tri R410A) + module ERSE-YM9EE.

HYDROSPLIT — Pas de liaisons frigorifiques
Eco Inverter R290 (nouveau) : PUZ-WZ50VHA (5kW), PUZ-WZ60VHA (6kW).
Power Inverter HT Silence R290 (nouveau) : PUZ-WZ80VAA (8kW), PUZ-WZ100VAA (10kW), PUZ-WZ120VAA (12kW).
Power Inverter classique : PUZ-WM50VHA (5kW), PUZ-WM60VAA (6kW), PUZ-WM85VAA (9kW), PUZ-WM112VAA (11kW).
Zubadan hydrosplit : PUZ-HWM140VHA (14kW).
Modules hydrosplit : ERPX-VM6E (chauffage seul) · ERPT20X-VM6E (Duo 200L) · ERPT30X-VM6EE (Duo 300L).`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  ECO INVERTER — CARACTÉRISTIQUES TECHNIQUES
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'ECODAN_CATALOGUE_2025-2026.pdf', sourceType: 'pdf', page: 49, chunkIndex: 1,
      tags: ['eco_inverter', 'technique', 'specs', 'ersd', 'suz-swm'],
      content: `ECO INVERTER MODÈLE MURAL — SUZ-SWM**VA(2) / ERSD-VM6E

Tailles disponibles : 3, 4, 6, 8, 10 kW (split R32)
Plage fonctionnement extérieur : -25°C à +35°C
Température départ eau max : +60°C en thermodynamique seul
Alimentation module : 230V 1P+N+T 50Hz
Appoint électrique module ERSD-VM6E : 6 kW (2+4)
Vase d'expansion : 10L · Poids module : 38 kg
Dimensions module ERSD-VM6E : 800×530×360 mm

Données frigorifiques groupes 3-6kW : R32/675 · 1/4 flare – 1/2 flare · longueur max 26m
Données frigorifiques groupes 8-10kW : R32 · longueur max 46m · dénivelé 30m

Performances Eco Inverter 3kW à A7W35 : COP 5,11 · SCOP(35°C eau) 195/4,95 · Classe A+++
Performances Eco Inverter 6kW à A7W35 : COP 4,85 · SCOP(35°C eau) 189/4,80 · Classe A+++
Performances Eco Inverter 8kW à A7W35 : COP 5,10 · SCOP(35°C eau) 187/4,74 · Classe A+++

Câble module–groupe : 4G 1,5 mm²
Section disjoncteur groupe 3-6kW : 3G 2,5/16 · groupes 8-10kW : 3G 4/20
Section disjoncteur appoint : 3G 6/32`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  ZUBADAN SILENCE — CARACTÉRISTIQUES TECHNIQUES
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'ECODAN_CATALOGUE_2025-2026.pdf', sourceType: 'pdf', page: 87, chunkIndex: 2,
      tags: ['zubadan', 'technique', 'specs', 'puz-shwm', 'haute_temperature'],
      content: `ZUBADAN SILENCE MODÈLE MURAL — PUZ-SHWM**VAA (mono) / PUZ-SHWM**YAA (tri)
Modules : ERSF-VM6E (mono), ERSF-YM9E (tri)

Puissances : 8, 10, 12, 14 kW (split R32) — Monophasé et Triphasé
Plage fonctionnement extérieur : -30°C à +42°C
Température départ eau max : +70°C (sans appoint, à -7°C ext)
Maintien puissance jusqu'à -15°C extérieur (1)
Alimentation mono : 230V 1P+N+T · tri : 400V 3P+N+T

COP (A7W35) : 5,05 (8kW) · 4,90 (10kW) · 4,90 (12kW) · 4,85 (14kW)
Classe énergétique : A+++ (chauffage) · A++ (rafraîchissement)

Zubadan Silence 8kW mono :
- Puissance max à 7°C ext / 35°C eau : 10,00/9,40 kW
- Puissance à -7°C ext, 65°C eau : 5,90 kW
- Puissance max à -15°C : 8,80/8,20 kW
- Niveau sonore groupe : 54/41 dB(A) à 1m · Poids : 106 kg
- Dimensions groupe : 1040×1050×480 mm

Zubadan Silence 14kW mono :
- Puissance max à 7°C ext / 35°C eau : 15,80/15,40 kW
- Puissance max à -15°C : 14,20/14,00 kW
- Niveau sonore groupe : 58/46 dB(A) · Poids : 115 kg

Données frigorifiques : R32/675 · 1/4 flare – 1/2 flare ou 1/4–5/8 flare (selon taille)
Longueur max chaud seul : 50m · Longueur max réversible : 50m (8-10kW) ou 30m (12-14kW)
Câble module–groupe : 4G 1,5 mm²

(1) Puissance à +7°C ext maintenue jusqu'à -7°C ext pour Teau jusqu'à 45°C. Au-delà 45°C, baisse jusqu'à 2,2 kW.`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  MODULES HYDRAULIQUES — GÉNÉRATIONS E / F
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'ECODAN_CATALOGUE_2025-2026.pdf', sourceType: 'pdf', page: 60, chunkIndex: 3,
      tags: ['modules', 'hydraulique', 'ersd', 'ersf', 'erst', 'installation'],
      content: `MODULES HYDRAULIQUES ECODAN — GÉNÉRATION E

MODULES MURAL CHAUFFAGE SEUL (Split) :
- ERSD-VM6E : pour SUZ-SWM 3-6kW · 800×530×360 mm · appoint 6kW · vase exp 10L · 38kg
- ERSF-VM6E : pour PUZ-SWM 8-12kW et PUZ-SHWM 8-14kW mono · 800×530×360 mm · appoint 6kW · 40kg
- ERSF-YM9E : triphasé pour PUZ-SHWM 8-14kW tri · appoint 9kW · 41kg

Composants intégrés ERSD/ERSF :
3-Échangeur à plaques · 4-Circulateur chauffage · 5-Purge manuelle · 6-Vanne de vidange
7-Résistance électrique · 13-Filtre magnétique

MODULES MURAL GRANDE PUISSANCE :
- ERSE-YM9EE : pour PUHZ-SHW230YKA2 (23kW) · 950×600×360 mm · 63kg · appoint 9kW

MODULES DUO AVEC ECS INTÉGRÉE (Split) :
- ERST20F-VM6E : Duo 200L mono (Power/Zubadan 8-14kW) · 1600×595×680 mm · 95kg · appoint 6kW
- ERST20F-YM9E : Duo 200L tri (Zubadan 8-14kW) · même dim · 98kg · appoint 9kW
- ERST30F-VM6EE : Duo 300L mono · 2050×595×680 mm · 110kg · appoint 6kW
- ERST30F-YM9EE : Duo 300L tri · 112kg
- ERST17D-VM6BE : Duo 170L 2 zones · 1750×595×680 mm · 114kg · appoint 6kW

Modules Éco Inverter :
- ERST20D-VM6E : Duo 200L mono (SUZ-SWM) · 1600×595×680 mm · 95kg
- ERST30D-VM6EE : Duo 300L mono · 2050×595×680 mm · 109kg

Composants Duo (ERST**F) : filtre magnétique, filtre anti-tartre, débitmètre électronique,
circulateur chauffage, échangeur à plaques eau/eau, ballon ECS acier inox, résistance ECS immergée.

MODULES HYDROSPLIT :
- ERPX-VM6E : chauffage seul hydrosplit · pas de liaisons frigorifiques côté groupe
- ERPT20X-VM6E : Duo 200L hydrosplit
- ERPT30X-VM6EE : Duo 300L hydrosplit`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  CODES ERREUR ECODAN — GUIDE TECHNIQUE 2024
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'Guide_Technique_Ecodan_2024.pdf', sourceType: 'pdf', page: 85, chunkIndex: 4,
      tags: ['codes_erreur', 'depannage', 'diagnostic', 'ecodan'],
      content: `CODES ERREUR ECODAN — TABLEAU DE DIAGNOSTIC

E1 : Court-circuit ou circuit ouvert sur la sonde de température de départ eau (THW1)
→ Vérifier le câblage et la résistance de la sonde THW1. Résistance attendue à 25°C : ~10 kΩ.

E2 : Court-circuit ou circuit ouvert sonde retour eau (THW2)
→ Vérifier câblage et résistance sonde THW2.

E3 : Court-circuit ou circuit ouvert sonde température eau chaude sanitaire (THWS)
→ Contrôler sonde THWS dans le ballon ECS.

E4 : Température eau trop haute — protection surchauffe
→ Vérifier le débit eau : débit nominal selon le modèle (9 à 47 l/min). Purger le circuit.
→ Contrôler le circulateur et les vannes. Nettoyer le filtre magnétique.

E5 : Haute pression côté réfrigérant (pressostat HP déclenché)
→ Vérifier débit d'eau, propreté échangeur à plaques, température eau de retour.
→ Contrôler la charge en fluide R32. Déclenchement typique > 4,2 MPa.

E6 : Basse pression côté réfrigérant (pressostat BP déclenché)
→ Fuite frigorigène probable → contrôle d'étanchéité obligatoire (R32, habilitation cat. I requise).
→ Vérifier les liaisons frigorifiques et les raccords flare.

E7 : Protection haute pression compresseur
→ Vérifier condenseur (échangeur côté eau) : encrassement, débit insuffisant.
→ Contrôler la température de départ eau : ne doit pas dépasser la consigne max.

E9 : Anomalie communication entre module hydraulique et groupe extérieur
→ Vérifier le câble de communication 4G 1,5 mm² : connexions aux bornes L/N/E/communication.
→ Contrôler l'alimentation 230V du module.

EA : Erreur débit eau faible ou nul
→ Vérifier la pompe circulateur : tension, débit, sens de rotation.
→ Purger le circuit, vérifier les vannes d'isolement.
→ Contrôler le filtre magnétique (colmatage fréquent sur installations rénovées).

EE : Erreur de configuration — incompatibilité groupe/module ou paramètre incorrect
→ Vérifier le câblage et les paramètres de configuration dans le menu installateur.

F8 : Anomalie sonde extérieure (THO)
→ Court-circuit ou circuit ouvert. Vérifier câblage et résistance sonde extérieure.

P8 : Défaut alimentation électrique — tension ou fréquence hors limites
→ Vérifier l'alimentation 230V (ou 400V tri). Tolérance : ±10%.

Remarque générale : Après correction d'un défaut, réinitialiser l'unité en coupant
l'alimentation 30 secondes puis en la rétablissant. Utiliser le menu diagnostic de la
télécommande MRC pour afficher l'historique des défauts.`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  CODES ERREUR — SUITE (COMPRESSEUR, DÉGIVRAGE)
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'Guide_Technique_Ecodan_2024.pdf', sourceType: 'pdf', page: 87, chunkIndex: 5,
      tags: ['codes_erreur', 'compresseur', 'degivrage', 'depannage'],
      content: `CODES ERREUR ECODAN — COMPRESSEUR ET DÉGIVRAGE

U1 : Surintensité compresseur
→ Vérifier la charge en fluide R32 (fuite possible).
→ Contrôler tension alimentation et câblage puissance compresseur.
→ Si récurrent : compresseur défaillant, remplacement nécessaire.

U2 : Sous-tension alimentation compresseur
→ Vérifier l'alimentation 230V, section câble, disjoncteur dédié.

U3 : Surtension alimentation compresseur
→ Protège le compresseur des surtensions réseau.

L1 : Défaut circuit refroidissement électronique
→ Vérifier l'échangeur côté air du groupe extérieur : encrassement, obstacle.

L4 : Température échangeur extérieur trop haute (protection)
→ Vérifier obstacles autour du groupe (dégagement mini 200mm tous côtés).

DÉGIVRAGE AUTOMATIQUE :
Le dégivrage automatique s'enclenche selon les conditions de fonctionnement.
Durée typique : 5 à 15 minutes selon accumulation givre.
Pendant le dégivrage : sortie d'eau chaude réduite — normal.
Le système revient en chauffage automatiquement après le cycle.

Si dégivrage trop fréquent (< 30 min entre cycles) :
→ Vérifier l'emplacement du groupe : éviter les endroits confinés ou très humides.
→ Contrôler la sonde extérieure THO.
→ Vérifier que le groupe n'est pas obstrué par de la neige ou de la végétation.

Zubadan Silence : les dégivrages sont moins fréquents et plus courts grâce à
l'injection de flash qui maintient le compresseur en charge partielle.`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  PROCÉDURE DE MISE EN SERVICE
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'Guide_Technique_Ecodan_2024.pdf', sourceType: 'pdf', page: 102, chunkIndex: 6,
      tags: ['mise_en_service', 'mes', 'installation', 'procedure'],
      content: `PROCÉDURE DE MISE EN SERVICE ECODAN

AVANT LA MISE EN SERVICE — VÉRIFICATIONS OBLIGATOIRES :
1. Circuit hydraulique : rempli, purgé, pression ≥ 1,5 bar à froid.
   Vérifier débit nominal (voir fiche technique selon modèle).
   Nettoyer le filtre magnétique intégré au module.
2. Raccordements frigorifiques (split uniquement) : test d'étanchéité azote obligatoire.
   Mettre sous vide < 500 microns minimum 30 min. Contrôler le maintien du vide.
   Précherger en R32 si longueur > précharge (voir tableau par modèle).
3. Alimentation électrique : vérifier section câble et calibre disjoncteur (voir fiche technique).
   Câble groupe–module : 4G 1,5 mm² (longueur max selon modèle).
4. Paramétrage : configurer le mode de régulation (température eau fixe ou courbe de chauffe).
   Paramétrer les zones si installation bizone (ERST17D).
   Configurer la production ECS si module Duo.

DÉMARRAGE :
1. Mettre le module hydraulique sous tension.
2. Lancer le test de démarrage via la télécommande MRC (menu installateur > test).
3. Vérifier la montée en température eau.
4. Contrôler les débits et pressions.
5. Tester les modes : chauffage, rafraîchissement, ECS.

APRÈS MISE EN SERVICE :
- Remettre le certificat d'intervention (attestation de mise en service Mitsubishi).
- Fiche d'attestation de contrôle : indiquer charge fluide R32 totale (pré-charge + ajout).
- Former le client : télécommande, programmation, mode éco.
- Enregistrer la garantie via le portail Mitsubishi Electric.

L'assistant de mise en service (MES) intégré à la télécommande MRC guide l'installateur
étape par étape. Recommandé pour les premières installations.`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  ENTRETIEN ET MAINTENANCE PÉRIODIQUE
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'Guide_Technique_Ecodan_2024.pdf', sourceType: 'pdf', page: 115, chunkIndex: 7,
      tags: ['maintenance', 'entretien', 'resp_desp', 'inspection', 'annuel'],
      content: `ENTRETIEN ET MAINTENANCE PÉRIODIQUE ECODAN

ENTRETIEN ANNUEL OBLIGATOIRE (directive DEUE, article L224-9 Code de l'environnement) :
Pour tout système thermodynamique de 4 à 70 kW, entretien annuel par technicien habilité.

Contrôles à effectuer à chaque visite :
1. Pression circuit hydraulique (nominal : 1,5 à 2,5 bar — compléter si < 1 bar).
2. Contrôle visuel des raccordements frigorifiques : pas de traces d'huile (signe de fuite).
3. Test étanchéité fluide R32 : contrôle électronique ou test bulles sur raccords.
4. Nettoyage filtre magnétique (particules limaille côté circuit primaire).
5. Nettoyage échangeur extérieur : dépoussiérage ailettes, enlever feuilles/débris.
6. Vérification débit eau : mesure débit (l/min) ou contrôle différentiel de pression.
7. Relevé des températures départ/retour eau et extérieure.
8. Contrôle des pressions HP/BP (via capteurs internes accessibles au menu diagnostic).
9. Vérification tension alimentation et échauffement disjoncteur.
10. Mise à jour firmware si disponible (via carte SD ou MELCloud).

INSPECTION R.E.S.P / D.E.S.P (Directive Équipements Sous Pression) :
Pour groupes de catégorie ≥ II (selon puissance) : inspections périodiques obligatoires
par organisme habilité. Mitsubishi Electric propose son service DESP.
Liste des produits concernés disponible sur confort.mitsubishielectric.fr.

FILTRE MAGNÉTIQUE — Nettoyage :
Fermer les vannes d'isolement amont et aval du filtre.
Purger la pression via le robinet de vidange.
Sortir le cylindre magnétique, rincer sous l'eau, remettre en place.
Rouvrir les vannes et purger l'air.

CONTRAT DE MAINTENANCE MELSmart :
Extension de garantie 5 ans proposée par Mitsubishi Electric.
Comprend : mise en service, visite annuelle, dépannage main d'œuvre inclus.`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  FLUIDES FRIGORIGÈNES — F-GAZ — R32 — RÉGLEMENTATION
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'DEPLIANT_F-GAZ_RESIDENTIEL.pdf', sourceType: 'pdf', page: 1, chunkIndex: 8,
      tags: ['f_gaz', 'r32', 'r410a', 'fluides', 'reglementation', 'habilitation'],
      content: `RÉGLEMENTATION FLUIDES FRIGORIGÈNES — F-GAZ 2024

Règlement F-GAS (UE) n°2024/573 — en vigueur depuis le 11 mars 2024.
Objectif : réduire les émissions de GES des fluides HFC.

FLUIDES AUTORISÉS JUSQU'EN 2050 (dans les équipements CVC neufs et maintenance) :
R32 (GWP 675) · R454B · R290 (propane) · R744 (CO2) · R717 (ammoniac)
R134A · R407C · R410A · R454C restent autorisés pour MAINTENANCE jusqu'en 2050.

GAMME ECODAN ET FLUIDES :
- Eco Inverter / Eco Inverter+ / Power Inverter Silence / Zubadan Silence : R32 (GWP 675)
- Power Inverter grande puissance (PUHZ-SW) : R410A (GWP 2088) — autorisé maintenance
- Zubadan grande puissance (PUHZ-SHW) : R410A
- Hydrosplit R290 (nouveau PUZ-WZ) : R290 propane (GWP 3) — très faible impact carbone

HABILITATION FLUIDES FRIGORIGÈNES — OBLIGATOIRE :
Toute manipulation du circuit frigorifique (charge, récupération, contrôle étanchéité)
nécessite une attestation de capacité (anciennement certificat) délivrée par un organisme agréé.
Catégorie I : tous fluides, toutes opérations. Requis pour R32, R410A, R454B.

CONTRÔLE D'ÉTANCHÉITÉ :
- R32 : contrôle annuel si charge ≥ 5 kg équivalent CO2. R32 : 5kg éq. CO2 = 7,4 kg R32.
- Ecodan résidentiel (charge typique 0,8-1,8 kg R32) : en dessous du seuil 5 kg éq CO2.
  → Pas d'obligation de contrôle périodique, mais contrôle visuel recommandé.
- Tenir à jour le carnet d'intervention (charge initiale, charges successives, récupérations).

R32 — PRÉCAUTIONS DE SÉCURITÉ :
- Légèrement inflammable (classe A2L) — ventiler l'espace de travail.
- Groupe extérieur : fuite en plein air, pas de risque d'accumulation.
- Module intérieur : vérifier aération du local technique.
- Détecteur de gaz R32 recommandé dans les locaux confinés.
- EPI : lunettes, gants résistants aux fluides cryogéniques.

RÉCUPÉRATION OBLIGATOIRE :
Avant toute intervention sur circuit fermé : récupérer le fluide sur groupe de récupération homologué.
Interdit de dégazer dans l'atmosphère.

CHARGE EN FLUIDE R32 (groupes split) — PRÉCHERGE ET COMPLÉMENT :
Groupes SUZ-SWM30/40/60 : précherge usine 5,0 kg/100m, ajout 0,8 g/m au-delà de 5m.
Groupes SUZ-SWM80/100 : précherge 7 kg/100m, ajout 1,1 g/m au-delà.
Groupes PUZ-SHWM80-140 : précherge 35g (chaud) ou 15g (réversible), ajout 1,8 g/m.`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  RACCORDEMENTS HYDRAULIQUES — DTU 65.16
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'Guide_Technique_Ecodan_2024.pdf', sourceType: 'pdf', page: 130, chunkIndex: 9,
      tags: ['hydraulique', 'dtu', 'installation', 'raccordement', 'pression'],
      content: `RACCORDEMENTS HYDRAULIQUES — DTU 65.16

PRESSION DE SERVICE :
Circuit chauffage : remplir à 1,5-2,0 bar froid. Ne pas dépasser 3 bar (soupape de sécurité).
Soupape de sécurité intégrée : tarage 3 bar sur modules mural, 5 bar sur modules Duo (côté chauffage).
Vase d'expansion : 10L (ERSD/ERSF) ou 12L (Duo). Vérifier pression pre-charge (1,0 bar par défaut).

DÉBIT EAU NOMINAL (l/min selon modèle) :
SUZ-SWM30VA : 9 l/min · SUZ-SWM40/60VA : 11,4 l/min · SUZ-SWM60VA2 : 17,2 l/min
SUZ-SWM80VA2 : 20,1 l/min · SUZ-SWM100VA : 21,4 l/min
PUZ-SHWM80VAA : 16,4 l/min · PUZ-SHWM100VAA : 20,4 l/min
PUZ-SHWM120VAA : 24,5 l/min · PUZ-SHWM140VAA : 28,6 l/min
PUHZ-SHW230YKA2 : 47,1 l/min

QUALITÉ DE L'EAU :
pH : 6,0 à 8,5 (eau traitée recommandée)
TH (dureté) : 15 à 25°f — utiliser un adoucisseur si eau > 30°f (risque entartrage ECS)
Inhibiteur de corrosion : recommandé sur installations avec différents métaux.
Filtre magnétique obligatoire pour protéger l'échangeur à plaques.

PURGE DU CIRCUIT :
1. Remplir lentement par le bas via robinet de remplissage.
2. Ouvrir le purgeur automatique du module hydraulique.
3. Purger manuellement chaque radiateur (haut de chaque radiateur).
4. Compléter jusqu'à 1,5-2 bar.
5. Relancer la pompe circulateur 10 min, re-purger si nécessaire.

RELÈVE CHAUDIÈRE :
Utiliser la sonde PAC-TH012HT-E (5m) ou PAC-TH012HTL-E (30m).
Brancher sur les bornes dédiées du module (voir schéma de câblage).
Paramétrer le mode "relève chaudière" dans le menu installateur.
La PAC fonctionne en priorité, la chaudière prend le relai si T°eau < consigne de secours.

CONNEXION PLANCHER CHAUFFANT :
Température départ max plancher chauffant : 45°C (protection dalle).
Paramétrer la limite haute de départ eau dans le menu.
Module bizone ERST17D : zone 1 = radiateurs, zone 2 = plancher.`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  ÉLECTRICITÉ — CÂBLAGE — NORMES
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'Guide_Technique_Ecodan_2024.pdf', sourceType: 'pdf', page: 145, chunkIndex: 10,
      tags: ['electrique', 'cablage', 'norme', 'disjoncteur', 'installation'],
      content: `RACCORDEMENTS ÉLECTRIQUES ECODAN — NORMES NF C 15-100

CÂBLAGE MODULE HYDRAULIQUE → GROUPE EXTÉRIEUR :
Câble : 4 conducteurs (L-N-E-communication) · 4G 1,5 mm².
Longueur maximale : voir fiche technique par modèle (généralement 30 à 50m).
Les 3 conducteurs puissance + 1 conducteur communication (signal bas voltage).

SECTION CÂBLE ET DISJONCTEUR (monophasé 230V) :
SUZ-SWM 3-6kW : câble 3G 2,5 mm² · disjoncteur 16A courbe C
SUZ-SWM 8-10kW : câble 3G 4 mm² · disjoncteur 20A courbe C
PUZ-SHWM 8-12kW : câble 3G 4 mm² · disjoncteur 25A courbe C
PUZ-SHWM 14kW : câble 3G 6 mm² · disjoncteur 32A courbe C

APPOINT ÉLECTRIQUE :
ERSD/ERSF-VM6E (6kW) : câble 3G 6 mm² · disjoncteur 32A
ERSF-YM9E (9kW) : câble 5G 1,5 mm² · disjoncteur 5G 1,5/16A (tri)

DISJONCTEUR DÉDIÉ OBLIGATOIRE :
Chaque PAC doit avoir son propre circuit depuis le tableau électrique.
Disjoncteur courbe C (non D) pour éviter les déclenchements intempestifs au démarrage.
Protection différentielle 30mA de type A (pour appareils avec variateurs).

MISE À LA TERRE :
Conducteur de protection (PE) obligatoire sur groupe et module.
Résistance de terre ≤ 100 Ω.

NORME EN-378 (Installation) :
Applicable aux systèmes avec R32 (classe A2L légèrement inflammable).
Si installation en local confiné (< 10 m²), vérifier le volume minimum selon la charge.
Volume min pour R32 : charge (kg) × facteur (voir tableau norme EN-378-1).
Recommandation Mitsubishi : installation groupe extérieur en plein air → pas de contrainte de volume.`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  RÉGULATION ET TÉLÉCOMMANDE MRC
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'Guide_Technique_Ecodan_2024.pdf', sourceType: 'pdf', page: 160, chunkIndex: 11,
      tags: ['regulation', 'telecommande', 'mrc', 'parametrage', 'courbe_chauffe'],
      content: `RÉGULATION ECODAN — TÉLÉCOMMANDE MRC

3 MODES DE RÉGULATION CHAUFFAGE :
1. Température eau fixe : départ eau à consigne constante (ex: 45°C).
   Usage : radiateurs haute température, relève chaudière.
2. Loi d'eau (écretée) : température départ varie selon T°extérieure (courbe de chauffe).
   Réglages : température de base, coefficient de pente, T°min/max.
   Usage : plancher chauffant, ventilo-convecteurs, radiateurs basse température.
3. Mode auto-adaptatif : régulation selon consigne d'ambiance.
   Nécessite sonde d'ambiance (intégrée dans télécommande MRC).

COURBE DE CHAUFFE — PARAMÉTRAGE :
Point de consigne : T°eau départ en fonction T°ext.
Exemple courbe standard plancher chauffant :
- T°ext 20°C → T°eau 28°C · T°ext 10°C → T°eau 33°C · T°ext 0°C → T°eau 38°C · T°ext -10°C → T°eau 45°C
Ajuster la pente selon l'inertie du bâtiment.

MENU INSTALLATEUR (accès code) :
- Configuration type d'installation (split / hydrosplit, nombre de zones)
- Paramétrage courbe de chauffe
- Limite haute température eau
- Mode relève chaudière (activer sonde PAC-TH012)
- Test de démarrage et diagnostic
- Lecture pressions HP/BP
- Historique des défauts (10 derniers)

CONNECTIVITÉ MELCLOUD :
Interface Wi-Fi : ajouter le module MAC-587IF-E (option).
Application MELCloud Home (iOS/Android) : contrôle à distance, planning, historique conso.
MELCloud Commercial : intégration GTB/GTC possible.

ACCESSOIRES PRINCIPAUX :
- PAR-WT60R-E + PAR-WR61R-E : télécommande sans fil déportable (jusqu'à 8 par récepteur)
- PAC-TH011-E : sonde départ/retour et découplage (1 jeu par zone)
- PAC-TH012HT-E (5m) / PAC-TH012HTL-E (30m) : sonde relève chaudière
- PAC-TH011TK2-E (5m) / PAC-TH011TLK2-E (30m) : sonde ECS ballon déporté`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  AIDES FINANCIÈRES — MAPRIMERENOV — CEE
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'Boussole_Reglementaire_Residentielle_2025.pdf', sourceType: 'pdf', page: 10, chunkIndex: 12,
      tags: ['aides', 'maprimerenov', 'cee', 'tva', 'reglementation', 'rge'],
      content: `AIDES FINANCIÈRES PAC AIR/EAU — RÉSIDENTIEL 2025

MaPrimeRénov' GESTE SIMPLE (remplacement chaudière fossile) :
Montants selon revenus du ménage (plafond 12 000€ travaux éligibles HT) :
- Ménages très modestes : 5 000€ · Ménages modestes : 4 000€
- Ménages intermédiaires : 3 000€ · Ménages supérieurs : non éligible
+ Coup de pouce Chauffage CEE : +1 000 à +4 000€ selon offre fournisseur énergie.
Condition : remplacement d'une chaudière au fioul, gaz, ou électrique résistance.

MaPrimeRénov' PARCOURS ACCOMPAGNÉ (rénovation d'ampleur) :
Gain ≥ 2 classes DPE requis · Accompagnement par Mon Accompagnateur Rénov' (MAR).
Montants jusqu'à 90% du coût des travaux HT (selon revenus et gain DPE).
Le PAC air/eau est fortement valorisé (SCOP élevé).
Montant total aide jusqu'à 63 000€ pour le parcours complet.

TVA RÉDUITE 5,5% (applicable sur PAC air/eau) :
Article 279-0 bis A du CGI : travaux de rénovation énergétique en logement existant > 2 ans.
Applicable sur la fourniture et la pose : matériel PAC + modules + installation + mise en service.
Condition : l'installateur doit facturer la TVA 5,5% (pas d'auto-liquidation).
Logement collectif (art. 278 sexies) : 10% pour les travaux de rénovation.

CEE (Certificats d'Économies d'Énergie) — BAR-TH166 :
Valorise les PAC collectives dédiées au chauffage.
BAR-TH145 : rénovation globale d'immeuble (copropriété).
BAR-TH169 (futur) : PAC dédiée ECS.

CONDITIONS INSTALLATEUR pour éligibilité aides :
- Certification RGE QualiPAC ou Qualibat 5911/5921 obligatoire.
- Être "Home Partenaire" Mitsubishi Electric : accès aux outils d'aide au montage.
- Délai entre signature devis et début travaux : au moins 1 jour.
- Factures avec mention "travaux de rénovation énergétique" et n° SIRET + n° RGE.`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  DIMENSIONNEMENT — DTU 65.16 — BILAN THERMIQUE
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'Guide_Technique_Ecodan_2024.pdf', sourceType: 'pdf', page: 55, chunkIndex: 13,
      tags: ['dimensionnement', 'bilan_thermique', 'dtu', 'puissance', 'calcul'],
      content: `DIMENSIONNEMENT PAC AIR/EAU — DTU 65.16

CALCUL DE LA PUISSANCE NÉCESSAIRE :
Le DTU 65.16 est le guide de référence pour l'installation des PAC jusqu'à 70 kW.
Méthode de calcul des déperditions selon EN 12831 (ou DIN 4108 pour bâtiments anciens).

RÈGLES DE DIMENSIONNEMENT MITSUBISHI :
1. Calculer les déperditions thermiques à la T°base du site (selon zones climatiques).
2. Choisir la PAC pour couvrir 80-100% des besoins à T°base.
3. Zones froides (zone H2, H3) : préférer Zubadan Silence pour maintien puissance -15°C.
4. Maisons neuves RE2020 : Eco Inverter suffisant (bâtiment bien isolé, T°base moins contraignante).
5. Rénovation avec chaudière existante (relève) : dimensionner pour 60-70% des besoins max.

ESTIMATION RAPIDE PAR SURFACE (indicatif) :
Maison neuve RE2020 (100 m²) : 4-6 kW · (150 m²) : 6-8 kW · (200 m²) : 8-10 kW
Maison rénovée BBC (100 m²) : 6-8 kW · (150 m²) : 8-10 kW · (200 m²) : 10-12 kW
Maison non rénovée avant 1975 (100 m²) : 8-12 kW · (150 m²) : 12-16 kW

ZONES CLIMATIQUES FRANCE (T°base selon altitude et zone) :
Zone H1a/H1b (Paris, Nord) : T°base -7°C à -12°C
Zone H2a/H2b (Centre, Ouest) : T°base -5°C à -7°C
Zone H2c/H2d (Méditerranée, SW) : T°base -2°C à +5°C
Zone H3 (Montagne) : T°base -10°C à -15°C → Zubadan Silence recommandé

TEMPÉRATURE DE DÉPART EAU (influence le dimensionnement) :
Plancher chauffant : 28-35°C → PAC très efficace, COP élevé.
Radiateurs basse T° : 40-45°C → Eco/Power Inverter bien adaptés.
Radiateurs haute T° (fonte, acier anciens) : 55-70°C → Zubadan Silence ou Power Inverter.
Ventilo-convecteurs : 35-45°C → idéal pour la réversibilité.

DÉPERDITIONS SELON TYPE DE BÂTIMENT (W/m²) :
Maison passive / RE2020 : 15-25 W/m²
BBC / RT2012 : 30-40 W/m²
Rénovation années 1990 : 50-70 W/m²
Maison non isolée avant 1975 : 80-120 W/m²`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  TECHNOLOGIE ZUBADAN — FONCTIONNEMENT
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'ECODAN_CATALOGUE_2025-2026.pdf', sourceType: 'pdf', page: 83, chunkIndex: 14,
      tags: ['zubadan', 'technologie', 'flash_injection', 'compresseur'],
      content: `TECHNOLOGIE ZUBADAN — SUPER CHAUFFAGE

Une PAC Zubadan = PAC inverter classique + bouteille accumulatrice + 2 détendeurs supplémentaires + injection Flash.

PRINCIPE DE L'INJECTION FLASH :
L'injection Flash injecte directement du frigorigène liquide au milieu du compresseur.
Avantages :
- Augmentation de la masse volumique du gaz comprimé → plus de puissance à même taille.
- Réduction de la température de refoulement → moins de stress thermique compresseur.
- Fonctionnement compresseur en charge partielle → moins de cycles court.

RÉSULTATS CONCRETS :
- Puissance maintenue jusqu'à -15°C extérieur (pas de déclassement).
- Montée en température 2× plus rapide qu'un inverter standard.
- Moins de dégivrages (fréquence et durée réduits).
- Fonctionnement garanti jusqu'à -30°C (chauffage thermodynamique seul).

TEMPÉRATURE EAU JUSQU'À 70°C À -7°C EXTÉRIEUR (Zubadan Silence) :
Condition : module avec échangeur F (ERST**F ou ERSF).
Permet de remplacer une chaudière sans changer les radiateurs fonte ou acier.
Production d'ECS à 60°C en mode thermodynamique (Duo 200L ou 300L).

COMPARAISON AVEC INVERTER STANDARD :
À -15°C ext / 35°C eau :
- PAC inverter standard : perte de 30-50% de puissance nominale.
- PAC Zubadan Silence : 100% de la puissance nominale maintenue.

AVANTAGE DIMENSIONNEMENT :
Jusqu'à 2 tailles de moins qu'un inverter standard pour même puissance réelle à -15°C.
→ Économie sur l'équipement et l'installation pour des performances identiques.`,
    },

    // ══════════════════════════════════════════════════════════════════════
    //  CATALOGUE PRODUITS — TARIFS INSTALLATEURS 2025
    // ══════════════════════════════════════════════════════════════════════
    {
      source: 'Catalogue_ThermiPro_tarifs_2025.csv', sourceType: 'csv', chunkIndex: 15,
      tags: ['tarifs', 'catalogue', 'prix', 'ecodan', 'installateur'],
      content: `CATALOGUE PRODUITS THERMIPRO — PRIX INSTALLATEURS HT 2025
(Prix achat HT installateur / Prix vente HT client)

ECO INVERTER (R32) — Groupes extérieurs split :
SUZ-SWM30VA (3kW) : achat 1 190€ / vente 1 690€
SUZ-SWM40VA2 (4kW) : achat 1 350€ / vente 1 920€
SUZ-SWM60VA2 (6kW) : achat 1 780€ / vente 2 520€
SUZ-SWM80VA2 (8kW) : achat 2 180€ / vente 3 090€
SUZ-SWM100VA (10kW) : achat 2 650€ / vente 3 750€

ECO INVERTER+ HYPER HEATING (R32) :
SUZ-SHWM30VAH (3kW) : achat 1 390€ / vente 1 970€
SUZ-SHWM40VAH (4kW) : achat 1 590€ / vente 2 260€
SUZ-SHWM60VAH (6kW) : achat 2 080€ / vente 2 950€

POWER INVERTER SILENCE (R32) :
PUZ-SWM80VAA (8kW mono) : achat 2 450€ / vente 3 470€
PUZ-SWM100VAA (10kW mono) : achat 2 950€ / vente 4 180€
PUZ-SWM120VAA (12kW mono) : achat 3 480€ / vente 4 930€
PUHZ-SW220VKA (22kW R410A) : achat 4 980€ / vente 7 050€

ZUBADAN SILENCE (R32) :
PUZ-SHWM80VAA (8kW mono) : achat 3 150€ / vente 4 460€
PUZ-SHWM100VAA (10kW mono) : achat 3 680€ / vente 5 210€
PUZ-SHWM120VAA (12kW mono) : achat 4 250€ / vente 6 010€
PUZ-SHWM140VAA (14kW mono) : achat 4 980€ / vente 7 050€
PUHZ-SHW230YKA2 (23kW R410A) : achat 6 450€ / vente 9 130€

MODULES HYDRAULIQUES :
ERSD-VM6E (chauffage seul 3-6kW) : achat 1 850€ / vente 2 620€
ERSF-VM6E (chauffage seul 8-14kW mono) : achat 2 050€ / vente 2 900€
ERST20F-VM6E (Duo 200L 8-14kW mono) : achat 3 950€ / vente 5 590€
ERST30F-VM6EE (Duo 300L 8-14kW mono) : achat 4 780€ / vente 6 760€
ERST17D-VM6BE (Duo 170L 2 zones) : achat 3 580€ / vente 5 070€`,
    },
  ];

  await prisma.knowledgeChunk.createMany({
    data: chunks.map(c => ({ ...c, companyId: 'co_tp' })),
    skipDuplicates: true,
  });

  console.log(`   ✅ ${chunks.length} chunks documentaires indexés pour ThermiPro`);
  console.log(`   📄 Sources : Guide Technique Ecodan 2024 · Catalogue 2025/2026 · F-GAZ · Boussole Réglementaire`);
}
