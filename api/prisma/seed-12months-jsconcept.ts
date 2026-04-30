/**
 * SEED HISTORIQUE 12 MOIS — JS CONCEPT v3
 * ─────────────────────────────────────────
 * 4 équipes quasi full-time, Mai 2025 → Avril 2026.
 * ~140 chantiers · CA 70k→140k€/mois · time entries denses.
 *
 * Usage (depuis le container) :
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-12months-jsconcept.ts
 */

import {
  PrismaClient, JobStatus, InvoiceStatus, TimeEntryStatus,
  WorkshopStatus, WorkshopPriority, TeamPlanningStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

// ─── helpers ─────────────────────────────────────────────────────────────────
const d  = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const addDays = (date: Date, n: number) => new Date(date.getTime() + n * 86400000);

const JS = 'co_js';

// ─── IDs fixes ───────────────────────────────────────────────────────────────
const U = {
  admin1: 'u_js_a1', admin2: 'u_js_a2',
  t1: 'u_js_t1', t2: 'u_js_t2',
  t3: 'u_js_t3', t4: 'u_js_t4',
  t5: 'u_js_t5', t6: 'u_js_t6',
  t7: 'u_js_t7', t8: 'u_js_t8',
};
const TEAMS = { a: 'tj_a', b: 'tj_b', c: 'tj_c', d: 'tj_d' };
const C = {
  sem:      'cl_js_sem',
  malia:    'cl_js_mal',
  ineo:     'cl_js_ine',
  orange:   'cl_js_ora',
  brunet:   'cl_js_bru',
  mezenc:   'cl_js_mez',
  equans:   'cl_js_equ',
  vinci:    'cl_js_vin',
  smacl:    'cl_js_sma',
  roannais: 'cl_js_roa',
};

// ─── Chantiers par mois ───────────────────────────────────────────────────────
// [year, month, clientKey, title, address, amount, durationDays, teamKey]
type Ch = [number, number, string, string, string, number, number, string];

const CHANTIERS: Ch[] = [
  // ── MAI 2025 (12 chantiers) ───────────────────────────────────────────────
  [2025,5,'sem',    'Mobilier parc du Soleil — phase 1',               'Parc du Soleil, St-Étienne',           18400,18,'a'],
  [2025,5,'malia',  'Signalisation chantier RN82 Firminy',             'RN82 km 14, Firminy',                   8900, 7,'b'],
  [2025,5,'brunet', 'Panneaux réglementaires lotissement Brunet',      'Lotissement Les Charmes, Le Puy',       4200, 4,'c'],
  [2025,5,'ineo',   'Balisage fibre optique Belleville Nord',          'ZI Belleville, Roanne',                 6800, 5,'d'],
  [2025,5,'orange', 'Marquage parking Hôtel de Ville Roanne',          'Place de l\'Hôtel de Ville, Roanne',    3200, 2,'a'],
  [2025,5,'smacl',  'Pose abri voyageurs arrêt Carnot',                'Rue Carnot, Firminy',                   9600, 8,'b'],
  [2025,5,'sem',    'Signalétique quartier Montreynaud — phase 1',     'Quartier Montreynaud, St-Étienne',      8600, 7,'c'],
  [2025,5,'malia',  'Marquage axial RD1082 — lot 2',                   'RD1082, Rive-de-Gier',                  4800, 3,'d'],
  [2025,5,'equans', 'Balisage réseau GRDF Andrézieux-Bouthéon',        'ZI Andrézieux-Bouthéon',                6200, 5,'a'],
  [2025,5,'sem',    'Mobilier P+R Monthieu — lot 1',                   'Parking Monthieu, St-Étienne',         12400,10,'b'],
  [2025,5,'vinci',  'Signalisation provisoire A47 éch. 8 — lot 1',    'A47 éch. 8, St-Étienne',                9800, 8,'c'],
  [2025,5,'roannais','Panneaux directionnels Roannais — tranche 1',   'Secteur Roanne centre',                  7600, 6,'d'],

  // ── JUIN 2025 (12 chantiers) ──────────────────────────────────────────────
  [2025,6,'ineo',   'Balisage télécom secteur Belleville-sur-Saône',  'ZI Belleville-sur-Saône',              12600,11,'a'],
  [2025,6,'smacl',  'Équipements aire de jeux Firminy-Vert',           'Rue Jean Jaurès, Firminy',             22800,18,'b'],
  [2025,6,'sem',    'Marquage parking Hôtel de Région',                'Place Jean Jaurès, St-Étienne',         6300, 4,'c'],
  [2025,6,'vinci',  'Signalisation provisoire A47 échangeur 6',       'A47 éch. 6, Givors',                   14200,10,'d'],
  [2025,6,'roannais','Mobilier esplanade du lac de Villerest',        'Lac de Villerest, Roanne',              11800, 9,'a'],
  [2025,6,'malia',  'Marquage axial RD1082 — lot 3',                   'RD1082, Rive-de-Gier',                  5400, 3,'b'],
  [2025,6,'sem',    'Marquage parking hôpital Bellevue',               'CHU Bellevue, St-Étienne',              5800, 4,'c'],
  [2025,6,'equans', 'Panneaux sécurité site SNCF Roanne',             'Technicentre SNCF, Roanne',              7400, 5,'d'],
  [2025,6,'vinci',  'Signalisation chantier ZAC Péri-Val — lot 1',    'ZAC Péri-Val, Givors',                 11600, 9,'a'],
  [2025,6,'brunet', 'Signalétique voirie Yssingeaux Nord',             'Secteur nord Yssingeaux',               5200, 4,'b'],
  [2025,6,'mezenc', 'Mobilier belvédère Mont Mézenc',                  'Sommet Mézenc, Le Monastier',          14400,11,'c'],
  [2025,6,'smacl',  'Marquage parking Mairie Firminy',                 'Place Nougier, Firminy',                2800, 2,'d'],

  // ── JUILLET 2025 (12 chantiers) ───────────────────────────────────────────
  [2025,7,'vinci',  'Signalisation chantier A45 Brignais',            'A45 échangeur Brignais',               31500,21,'a'],
  [2025,7,'orange', 'Balisage déploiement fibre secteur Roanne',      'Rue Benoît Malon, Roanne',              9800, 8,'b'],
  [2025,7,'roannais','Mobilier berges du Rhins',                      'Berges du Rhins, Roanne',              14200,12,'c'],
  [2025,7,'equans', 'Panneaux chantier réseau gaz Andrézieux',        'ZI Andrézieux-Bouthéon',                8400, 6,'d'],
  [2025,7,'brunet', 'Signalisation voirie communale Aurec',           'Routes communales Aurec-sur-Loire',     3600, 3,'a'],
  [2025,7,'mezenc', 'Panneaux touristiques Mézenc — phase 1',         'CC Mézenc-Meygal, Le Monastier',       16200,14,'b'],
  [2025,7,'sem',    'Marquage PMR 18 places parking Bergson',         'Bd Bergson, St-Étienne',                3800, 2,'c'],
  [2025,7,'sem',    'Pose corbeilles parc Tarentaize — lot 1',        'Parc Tarentaize, St-Étienne',           4400, 3,'d'],
  [2025,7,'ineo',   'Balisage réseau RTE Haute-Loire — lot 1',        'Lignes HT secteur Yssingeaux',         11600, 9,'a'],
  [2025,7,'orange', 'Signalétique NRO Firminy',                       'NRO Firminy centre',                    5600, 4,'b'],
  [2025,7,'smacl',  'Mobilier place des Sports Firminy',              'Place des Sports, Firminy',            18800,14,'c'],
  [2025,7,'roannais','Panneaux directionnels Roannais — tranche 2',   'Routes secteur nord Roanne',            9200, 7,'a'],

  // ── AOÛT 2025 (12 chantiers) ──────────────────────────────────────────────
  [2025,8,'sem',    'Mobilier parc du Soleil — phase 2',              'Parc du Soleil, St-Étienne',           16800,16,'a'],
  [2025,8,'malia',  'Balisage travaux rue de la République',          'Rue de la République, Firminy',         5400, 4,'b'],
  [2025,8,'equans', 'Panneaux chantier SNCF Lyon-Part-Dieu',          'Gare Lyon-Part-Dieu',                  19600,16,'c'],
  [2025,8,'ineo',   'Signalétique entrepôt logistique Roanne',        'ZA Mulsant, Roanne',                    7200, 6,'d'],
  [2025,8,'vinci',  'Clôtures et signalisation ZAC Péri-Val',         'ZAC Péri-Val, Givors',                 12400,10,'a'],
  [2025,8,'orange', 'Balisage câblage télécom La Talaudière',         'Centre La Talaudière',                  4600, 4,'b'],
  [2025,8,'roannais','Marquage parking centre commercial Roanne',     'CC Carrefour, Roanne',                  6400, 5,'c'],
  [2025,8,'mezenc', 'Panneaux sentiers Mézenc — jalonnement',         'CC Mézenc-Meygal, divers',             12800,10,'d'],
  [2025,8,'equans', 'Balisage réseau HTA secteur Firminy',            'Secteur Firminy-sur-Loire',             9400, 7,'a'],
  [2025,8,'sem',    'Signalisation voie verte Vallée du Gier',        'Vallée du Gier, St-Étienne',            7800, 6,'b'],
  [2025,8,'brunet', 'Panneaux de chantier Brunet TP — lot 2',         'Divers Haute-Loire',                    3800, 3,'c'],
  [2025,8,'smacl',  'Signalétique intermodale gare Firminy',          'Gare SNCF Firminy',                    11200, 9,'d'],

  // ── SEPTEMBRE 2025 (12 chantiers) ─────────────────────────────────────────
  [2025,9,'vinci',  'Signalisation déviation RD1082 Rive-de-Gier',   'RD1082, Rive-de-Gier',                 28400,20,'a'],
  [2025,9,'smacl',  'Abris voyageurs ligne 10 — lot 3',              'Av. Marx Dormoy, Firminy',              24600,18,'b'],
  [2025,9,'ineo',   'Signalétique datacenter Roanne',                 'ZA de Mulsant, Roanne',                 7800, 6,'c'],
  [2025,9,'roannais','Mobilier place du Marché Riorges',              'Place du Marché, Riorges',             18400,14,'d'],
  [2025,9,'sem',    'Marquage voie cyclable Bellevue',                'Av. Libération, St-Étienne',            7200, 5,'a'],
  [2025,9,'malia',  'Signalisation chantier tunnel Saint-Claude',     'Tunnel Saint-Claude, RN82',             9800, 8,'b'],
  [2025,9,'brunet', 'Panneaux F24 zone 30 Aurec',                    'Centre-ville Aurec-sur-Loire',           3200, 2,'c'],
  [2025,9,'equans', 'Balisage GRDF réseau Haute-Loire',              'Secteur Le Puy-en-Velay',               8600, 7,'d'],
  [2025,9,'vinci',  'Signalétique chantier pont de Givors',          'Pont Givors, RN86',                    14800,11,'a'],
  [2025,9,'orange', 'Balisage déploiement fibre Saint-Just',         'Saint-Just-Saint-Rambert',              6200, 5,'b'],
  [2025,9,'sem',    'Mobilier parvis bibliothèque Tarentaize',        'Bibliothèque Tarentaize, St-Étienne',   8400, 6,'c'],
  [2025,9,'roannais','Panneaux directionnels Roannais — tranche 3',  'Agglomération Roannaise',              11600, 9,'d'],

  // ── OCTOBRE 2025 (12 chantiers) ───────────────────────────────────────────
  [2025,10,'sem',   'Marquage PMR 42 places parking Dorian',         'Bd Karl Marx, St-Étienne',              8900, 4,'a'],
  [2025,10,'roannais','Mobilier place du Marché Riorges — fin',      'Place du Marché, Riorges',             31200,22,'b'],
  [2025,10,'orange','Signalétique chantier télécom Rive-de-Gier',    'Centre-ville Rive-de-Gier',            11400, 9,'c'],
  [2025,10,'equans','Balisage maintenance réseau HTA Roanne',        'Secteur nord Roanne',                  16800,12,'d'],
  [2025,10,'vinci', 'Mobilier urbain ZAC des Acacias — phase 1',     'ZAC des Acacias, St-Chamond',          22000,16,'a'],
  [2025,10,'ineo',  'Panneaux de chantier St-Étienne Métropole',     'Divers St-Étienne Métropole',           6400, 5,'b'],
  [2025,10,'smacl', 'Abri bus et mobilier place Léon Noël',          'Place Léon Noël, Firminy',             13600,11,'c'],
  [2025,10,'sem',   'Signalétique piste cyclable Métropole SEM',     'Métropole SEM, divers',                 9200, 7,'d'],
  [2025,10,'malia', 'Balisage route départementale RD498',           'RD498 secteur Loire',                   7800, 6,'a'],
  [2025,10,'mezenc','Mobilier refuge forestier Mézenc',              'Forêt domaniale Mézenc',               13200,10,'b'],
  [2025,10,'brunet','Pose panneaux zones 30 La Ricamarie',           'Centre La Ricamarie',                   4200, 3,'c'],
  [2025,10,'ineo',  'Signalisation balisage RTE — secteur Roanne',   'Lignes HT nord Roanne',                12400, 9,'d'],

  // ── NOVEMBRE 2025 (12 chantiers) ──────────────────────────────────────────
  [2025,11,'equans','Balisage maintenance réseau HTA Roanne — lot 2','Secteur est Roanne',                   16800,12,'a'],
  [2025,11,'vinci', 'Mobilier urbain ZAC des Acacias — phase 2',     'ZAC des Acacias, St-Chamond',          38500,24,'b'],
  [2025,11,'brunet','Panneaux voirie commune Aurec-sur-Loire',       'Routes communales, Aurec-sur-Loire',    5800, 4,'c'],
  [2025,11,'sem',   'Mobilier Christmas Market place du Peuple',     'Place du Peuple, St-Étienne',          12600,10,'d'],
  [2025,11,'malia', 'Signalisation chantier déviation Unieux',       'RD3, Unieux',                          14200,11,'a'],
  [2025,11,'mezenc','Panneaux touristiques Mézenc — phase 2',        'CC Mézenc-Meygal, Le Monastier',       18600,15,'b'],
  [2025,11,'roannais','Signalétique quai fluvial Roanne',            'Port de Roanne',                        9200, 7,'c'],
  [2025,11,'orange','Balisage réseau cuivre Saint-Chamond',          'Saint-Chamond centre',                  5400, 4,'d'],
  [2025,11,'sem',   'Signalisation plan vélo 2025 — phase 2',        'Bd périphérique SEM',                  14600,11,'a'],
  [2025,11,'ineo',  'Panneaux chantier fibre optique Le Puy',        'Le Puy-en-Velay',                       8800, 7,'b'],
  [2025,11,'roannais','Marquage parking esplanade Roanne',           'Esplanade du Port, Roanne',             6200, 5,'c'],
  [2025,11,'vinci', 'Signalisation provisoire RN7 Dardilly',         'RN7, Dardilly–Limonest',               18200,13,'d'],

  // ── DÉCEMBRE 2025 (12 chantiers) ──────────────────────────────────────────
  [2025,12,'ineo',  'Balisage éclairage public Firminy',             'Centre-ville Firminy',                  8400, 6,'a'],
  [2025,12,'sem',   'Marquage parking Châteaucreux — phase 2',       'Gare Châteaucreux, St-Étienne',        11200, 8,'b'],
  [2025,12,'vinci', 'Signalisation provisoire A72 — lot 2',          'A72, échangeur Andrézieux',            24000,18,'c'],
  [2025,12,'orange','Balisage réseau fibre Riorges',                 'Riorges centre',                        7800, 6,'d'],
  [2025,12,'equans','Panneaux sécurité usine chimique Roanne',       'Zone industrielle Roanne',               9600, 8,'a'],
  [2025,12,'smacl', 'Abri voyageurs arrêt Saint-Louis',             'Rue Saint-Louis, Firminy',              14200,11,'b'],
  [2025,12,'brunet','Signalisation parking privé Brunet TP',         'Dépôt Brunet TP, Le Puy',               4400, 3,'c'],
  [2025,12,'sem',   'Mobilier urbain Noël place Jean Jaurès',        'Place Jean Jaurès, St-Étienne',         9600, 7,'d'],
  [2025,12,'malia', 'Signalisation temporaire fin chantier RD Loire','Routes RD secteur Loire',               7200, 5,'a'],
  [2025,12,'roannais','Pose bancs et corbeilles centre Roanne',      'Centre-ville Roanne',                   8400, 6,'b'],
  [2025,12,'mezenc','Signalétique hiver Mézenc — damiers et flèches','Pistes Mézenc-Meygal',                  6800, 5,'c'],
  [2025,12,'vinci', 'Signalétique chantier ponts Lyon secteur sud',  'Ponts Lyon section sud',               22400,16,'d'],

  // ── JANVIER 2026 (12 chantiers) ───────────────────────────────────────────
  [2026,1,'vinci',  'Signalisation chantier contournement Feurs',    'RN89, Feurs',                          42000,24,'a'],
  [2026,1,'roannais','Mobilier esplanade Roanne-Vichy',              'Quai Cdt Rolland, Roanne',             19800,16,'b'],
  [2026,1,'sem',    'Marquage voie cyclable Bellevue — phase 2',     'Av. Libération, St-Étienne',            9200, 7,'c'],
  [2026,1,'ineo',   'Balisage chantier RTE Haute-Loire — lot 2',     'Lignes HT secteur Yssingeaux',         18600,14,'d'],
  [2026,1,'malia',  'Panneaux de chantier Malia — contrat cadre',    'Divers chantiers Loire',               11400, 9,'a'],
  [2026,1,'equans', 'Signalétique entrepôt Amazon Roanne',           'ZAC Bonvert, Mably',                   28400,20,'b'],
  [2026,1,'orange', 'Balisage maintenance NRO Saint-Just',           'NRO Saint-Just-Saint-Rambert',          6200, 5,'c'],
  [2026,1,'sem',    'Signalétique parc scientifique Technopôle',     'Technopôle de St-Étienne',             11800, 9,'d'],
  [2026,1,'smacl',  'Remplacement panneaux zone 30 Firminy',         'Centre Firminy',                        5600, 4,'a'],
  [2026,1,'brunet', 'Signalisation accès chantier Yssingeaux',       'Yssingeaux',                            4800, 4,'b'],
  [2026,1,'vinci',  'Balisage longue durée RN82 — section Gier',     'RN82, secteur Loire',                  16400,12,'c'],
  [2026,1,'mezenc', 'Signalétique touristique plateau Mézenc',        'Plateau Mézenc',                        9200, 7,'d'],

  // ── FÉVRIER 2026 (12 chantiers) ───────────────────────────────────────────
  [2026,2,'malia',  'Mobilier urbain Firminy Vert — livraison',      'Quartier Firminy-Vert',                24800,17,'a'],
  [2026,2,'sem',    'Maintenance abri voyageurs La Chapelle',        'Arrêt La Chapelle, St-Étienne',         1200, 1,'b'],
  [2026,2,'equans', 'Balisage réseau gaz Andrézieux — phase 2',      'ZI Andrézieux-Bouthéon',               13600,11,'c'],
  [2026,2,'vinci',  'Panneaux directionnels ZAC Montreynaud',        'ZAC Montreynaud, St-Étienne',          18400,14,'d'],
  [2026,2,'roannais','Mobilier berges de Loire — tranche 2',         'Berges Loire, Roanne',                 22600,17,'a'],
  [2026,2,'smacl',  'Mobilier place du 8 mai 1945 Firminy',          'Place du 8 mai, Firminy',              16800,13,'b'],
  [2026,2,'ineo',   'Signalétique parc éolien Montfaucon',           'Parc éolien Montfaucon-en-Velay',      11200, 9,'c'],
  [2026,2,'sem',    'Signalétique stade Geoffroy-Guichard — accès',  'Stade G.Guichard, St-Étienne',        12400, 9,'d'],
  [2026,2,'ineo',   'Balisage chantier orange secteur Péri-Sud',     'Secteur Péri-Sud, St-Étienne',          7600, 6,'a'],
  [2026,2,'orange', 'Balisage NRO Andrézieux-Bouthéon',              'NRO Andrézieux',                        5800, 4,'b'],
  [2026,2,'malia',  'Signalisation déviation Onzion — travaux',      'RD Onzion, Loire',                      8200, 6,'c'],
  [2026,2,'roannais','Pose mobilier urbain parc de la Chanée',       'Parc de la Chanée, Roanne',            14800,11,'d'],

  // ── MARS 2026 (12 chantiers) ──────────────────────────────────────────────
  [2026,3,'orange', 'Signalétique chantier télécom Rue Macé',        'Rue Macé, Roanne',                      7200, 6,'a'],
  [2026,3,'vinci',  'Panneaux directionnels ZAC Montreynaud — fin',  'ZAC Montreynaud, St-Étienne',          18400,14,'b'],
  [2026,3,'roannais','Signalisation touristique Loire à Vélo',       'Berges Loire secteur Roannais',        22600,16,'c'],
  [2026,3,'sem',    'Mobilier parc Tarentaize — phase 1',            'Parc Tarentaize, St-Étienne',          34800,22,'d'],
  [2026,3,'equans', 'Balisage maintenance réseau GRDF Feurs',        'Secteur Feurs–Poncins',                14200,10,'a'],
  [2026,3,'malia',  'Signalisation chantier voie rapide L45',        'L45, St-Étienne',                      19600,14,'b'],
  [2026,3,'brunet', 'Panneaux lotissement Les Genêts Yssingeaux',    'Lotissement Les Genêts',                8600, 7,'c'],
  [2026,3,'smacl',  'Abris voyageurs ligne 3 — lot 2',               'Lignes 3 Firminy',                     21400,16,'d'],
  [2026,3,'vinci',  'Signalétique ZAC Montesuy St-Étienne',          'ZAC Montesuy, St-Étienne',              9400, 7,'a'],
  [2026,3,'ineo',   'Balisage chantier réseau ENEDIS Feurs',         'Feurs centre',                          7200, 5,'b'],
  [2026,3,'orange', 'Balisage déploiement 5G Saint-Just',            'Saint-Just-Saint-Rambert',              6400, 5,'c'],
  [2026,3,'sem',    'Marquage PMR nouveau CHU Nord',                 'CHU Nord, St-Étienne',                 11800, 8,'d'],

  // ── AVRIL 2026 — EN COURS / PLANIFIÉ (8 chantiers) ───────────────────────
  [2026,4,'smacl',  'Marquage PMR parking Feurs centre-ville',       'Place de la République, Feurs',         4800, 5,'a'],
  [2026,4,'mezenc', 'Signalétique sentiers Mézenc-Meygal',           'CC Mézenc-Meygal, Le Monastier',       31200,20,'b'],
  [2026,4,'vinci',  'Balisage chantier échangeur A72',               'A72 échangeur 8, Andrézieux',          44000,28,'c'],
  [2026,4,'sem',    'Mobilier parc Tarentaize — phase 2',            'Parc Tarentaize, St-Étienne',          38400,25,'d'],
  [2026,4,'roannais','Mobilier jardin du Parc Roanne',               'Jardin du Parc, Roanne',               22400,15,'a'],
  [2026,4,'ineo',   'Balisage maintenance ENEDIS Loire',             'Secteur Loire',                         9800, 8,'b'],
  [2026,4,'equans', 'Signalétique entrepôt ZAC Bonvert Mably',       'Zone Bonvert, Mably',                  16200,10,'c'],
  [2026,4,'brunet', 'Panneaux voirie Yssingeaux — phase 2',          'Yssingeaux',                            7400, 6,'d'],
];

// Factures en retard (par titre exact)
const OVERDUE_TITLES = new Set([
  'Mobilier urbain Firminy Vert — livraison',
  'Maintenance abri voyageurs La Chapelle',
]);

// Chantiers en cours (avril 2026)
const IN_PROGRESS_TITLES = new Set([
  'Marquage PMR parking Feurs centre-ville',
  'Balisage chantier échangeur A72',
  'Balisage maintenance ENEDIS Loire',
]);
const PLANNED_TITLES = new Set([
  'Signalétique sentiers Mézenc-Meygal',
  'Mobilier parc Tarentaize — phase 2',
  'Mobilier jardin du Parc Roanne',
  'Signalétique entrepôt ZAC Bonvert Mably',
  'Panneaux voirie Yssingeaux — phase 2',
]);

const teamMembers: Record<string, string[]> = {
  [TEAMS.a]: [U.t1, U.t2],
  [TEAMS.b]: [U.t3, U.t4],
  [TEAMS.c]: [U.t5, U.t6],
  [TEAMS.d]: [U.t7, U.t8],
};

async function main() {
  console.log('🌱 Seed HISTORIQUE 12 MOIS v3 — JS CONCEPT...');
  const hash = bcrypt.hashSync('Demo1234!', 10);

  // ─── 0. CLEANUP ────────────────────────────────────────────────────────────
  console.log('  Nettoyage...');
  await prisma.$transaction([
    prisma.catalogProduct.deleteMany({ where: { companyId: JS } }),
    prisma.catalogCategory.deleteMany({ where: { companyId: JS } }),
    prisma.timeEntry.deleteMany({ where: { companyId: JS } }),
    prisma.invoice.deleteMany({ where: { companyId: JS } }),
    prisma.planningSlot.deleteMany({ where: { companyId: JS } }),
    prisma.teamPlanningSlot.deleteMany({ where: { week: { companyId: JS } } }),
    prisma.teamPlanningWeek.deleteMany({ where: { companyId: JS } }),
    prisma.jobAssignment.deleteMany({ where: { job: { companyId: JS } } }),
    prisma.workshopItem.deleteMany({ where: { companyId: JS } }),
    prisma.purchaseLine.deleteMany({ where: { purchase: { companyId: JS } } }),
    prisma.purchaseOrder.deleteMany({ where: { companyId: JS } }),
    prisma.job.deleteMany({ where: { companyId: JS } }),
    prisma.quoteLine.deleteMany({ where: { quote: { companyId: JS } } }),
    prisma.quote.deleteMany({ where: { companyId: JS } }),
    prisma.client.deleteMany({ where: { companyId: JS } }),
    prisma.teamMember.deleteMany({ where: { team: { companyId: JS } } }),
    prisma.team.deleteMany({ where: { companyId: JS } }),
    prisma.hrDocument.deleteMany({ where: { user: { companyId: JS } } }),
    prisma.refreshToken.deleteMany({ where: { user: { companyId: JS } } }),
    prisma.user.deleteMany({ where: { companyId: JS } }),
    prisma.supplier.deleteMany({ where: { companyId: JS } }),
  ]);
  console.log('  ✓ Nettoyage OK');

  // ─── 1. COMPANY ────────────────────────────────────────────────────────────
  await prisma.company.upsert({
    where: { id: JS },
    update: {},
    create: { id: JS, code: 'JS', name: 'JS CONCEPT' },
  });

  // ─── 2. USERS (10) ─────────────────────────────────────────────────────────
  await prisma.user.createMany({
    data: [
      { id: U.admin1, email: 'e.sauron@js-concept.fr',        passwordHash: hash, name: 'Emmanuel SAURON',   role: 'admin',       companyId: JS },
      { id: U.admin2, email: 'b.faure@js-concept.fr',         passwordHash: hash, name: 'Baptiste FAURE',    role: 'conducteur',  companyId: JS },
      { id: U.t1,     email: 'yann.leblanc@js-concept.fr',    passwordHash: hash, name: 'Yann LEBLANC',      role: 'technicien',  companyId: JS },
      { id: U.t2,     email: 'thomas.rey@js-concept.fr',      passwordHash: hash, name: 'Thomas REY',        role: 'technicien',  companyId: JS },
      { id: U.t3,     email: 'julien.mora@js-concept.fr',     passwordHash: hash, name: 'Julien MORA',       role: 'technicien',  companyId: JS },
      { id: U.t4,     email: 'kevin.petit@js-concept.fr',     passwordHash: hash, name: 'Kévin PETIT',       role: 'technicien',  companyId: JS },
      { id: U.t5,     email: 'sebastien.gaudin@js-concept.fr',passwordHash: hash, name: 'Sébastien GAUDIN',  role: 'technicien',  companyId: JS },
      { id: U.t6,     email: 'maxime.favre@js-concept.fr',    passwordHash: hash, name: 'Maxime FAVRE',      role: 'technicien',  companyId: JS },
      { id: U.t7,     email: 'nicolas.dumas@js-concept.fr',   passwordHash: hash, name: 'Nicolas DUMAS',     role: 'technicien',  companyId: JS },
      { id: U.t8,     email: 'antoine.berger@js-concept.fr',  passwordHash: hash, name: 'Antoine BERGER',    role: 'technicien',  companyId: JS },
    ],
  });

  // ─── 3. ÉQUIPES (4) ────────────────────────────────────────────────────────
  const teamNames: Record<string, string> = {
    [TEAMS.a]: 'Équipe A — Yann & Thomas',
    [TEAMS.b]: 'Équipe B — Julien & Kévin',
    [TEAMS.c]: 'Équipe C — Sébastien & Maxime',
    [TEAMS.d]: 'Équipe D — Nicolas & Antoine',
  };
  for (const [teamId, memberIds] of Object.entries(teamMembers)) {
    await prisma.team.create({
      data: {
        id: teamId, name: teamNames[teamId], companyId: JS,
        members: { create: memberIds.map(userId => ({ userId })) },
      },
    });
  }
  console.log('  ✓ 4 équipes terrain créées');

  // ─── 4. CLIENTS ────────────────────────────────────────────────────────────
  await prisma.client.createMany({
    data: [
      { id: C.sem,      name: 'Saint-Étienne Métropole', contact: 'Claire VIDAL',    email: 'cvidal@saint-etienne-metropole.fr', phone: '04 77 43 72 00', address: '2 avenue de la Libération',       city: 'Saint-Étienne',   type: 'public',  companyId: JS },
      { id: C.malia,    name: 'MALIA TP',                contact: 'Marc ALIBERT',    email: 'marc.alibert@malia-tp.fr',         phone: '04 77 23 11 45', address: '12 rue des Carriers',             city: 'Saint-Étienne',   type: 'private', companyId: JS },
      { id: C.ineo,     name: 'INEO INFRACOM',           contact: 'Patrice MORIN',   email: 'pmorin@ineo.com',                  phone: '04 72 18 55 30', address: 'ZI Belleville, BP 42',            city: 'Lyon',            type: 'private', companyId: JS },
      { id: C.orange,   name: 'ORANGE SA',               contact: 'Sandrine DUPUY',  email: 'sdupuy@orange.com',                phone: '01 44 44 22 22', address: '78 rue Olivier de Serres',        city: 'Paris',           type: 'private', companyId: JS },
      { id: C.brunet,   name: 'Brunet TP',               contact: 'Alain BRUNET',    email: 'alain@brunet-tp.fr',               phone: '04 71 09 34 56', address: '8 route de Lyon',                 city: 'Le Puy-en-Velay', type: 'private', companyId: JS },
      { id: C.mezenc,   name: 'CC Mézenc-Meygal',        contact: 'Sophie BERTRAND', email: 'sbertrand@mezenc-meygal.fr',       phone: '04 71 59 11 82', address: '6 place de la Mairie',            city: 'Le Monastier',    type: 'public',  companyId: JS },
      { id: C.equans,   name: 'EQUANS France',           contact: 'David LACROIX',   email: 'dlacroix@equans.com',              phone: '04 72 32 18 00', address: '3 avenue Condorcet',              city: 'Lyon',            type: 'private', companyId: JS },
      { id: C.vinci,    name: 'VINCI Construction',      contact: 'Rémi CHAPUIS',    email: 'remi.chapuis@vinci.com',           phone: '04 72 19 40 00', address: 'Tour VINCI, 1 cours F.Roosevelt',  city: 'Villeurbanne',    type: 'private', companyId: JS },
      { id: C.smacl,    name: 'Mairie de Firminy',       contact: 'Laurent GIRAUD',  email: 'lgiraud@mairie-firminy.fr',        phone: '04 77 40 90 00', address: 'Place Nougier',                   city: 'Firminy',         type: 'public',  companyId: JS },
      { id: C.roannais, name: 'Roannais Agglomération',  contact: 'Pierre FONTAINE', email: 'pfontaine@roannais-agglo.fr',      phone: '04 77 44 22 50', address: '1 rue Préfecture',                city: 'Roanne',          type: 'public',  companyId: JS },
    ],
  });

  // ─── 5. CATALOGUE ──────────────────────────────────────────────────────────
  const cat1 = await prisma.catalogCategory.create({ data: { id: createId(), name: 'Mobilier urbain',   sortOrder: 1, companyId: JS } });
  const cat2 = await prisma.catalogCategory.create({ data: { id: createId(), name: 'Signalisation',     sortOrder: 2, companyId: JS } });
  const cat3 = await prisma.catalogCategory.create({ data: { id: createId(), name: 'Marquage sol',      sortOrder: 3, companyId: JS } });
  const cat4 = await prisma.catalogCategory.create({ data: { id: createId(), name: 'Main d\'œuvre',     sortOrder: 4, companyId: JS } });

  await prisma.catalogProduct.createMany({
    data: [
      { id: createId(), reference: 'MOB-BANC-001',  designation: 'Banc urbain béton anthracite L180',       unit: 'u',       salePrice: 680,  costPrice: 420,  lineType: 'purchase', categoryId: cat1.id, companyId: JS },
      { id: createId(), reference: 'MOB-TABLE-001', designation: 'Table pique-nique PMR bois pin CL4',      unit: 'u',       salePrice: 720,  costPrice: 440,  lineType: 'purchase', categoryId: cat1.id, companyId: JS },
      { id: createId(), reference: 'MOB-POUBELL-01',designation: 'Corbeille urbaine acier galvanisé 50L',   unit: 'u',       salePrice: 285,  costPrice: 165,  lineType: 'purchase', categoryId: cat1.id, companyId: JS },
      { id: createId(), reference: 'MOB-CAGE-001',  designation: 'Cage de foot aluminium 5m×2m',           unit: 'u',       salePrice: 1930, costPrice: 1250, lineType: 'purchase', categoryId: cat1.id, companyId: JS },
      { id: createId(), reference: 'MOB-ABRI-001',  designation: 'Abri voyageurs 4 places galva',          unit: 'u',       salePrice: 3800, costPrice: 2400, lineType: 'purchase', categoryId: cat1.id, companyId: JS },
      { id: createId(), reference: 'SIG-PAN-B1',    designation: 'Panneau signalisation type B (Ø500)',    unit: 'u',       salePrice: 145,  costPrice: 78,   lineType: 'purchase', categoryId: cat2.id, companyId: JS },
      { id: createId(), reference: 'SIG-PAN-AB4',   designation: 'Panneau AB4 stop octogone',              unit: 'u',       salePrice: 168,  costPrice: 89,   lineType: 'purchase', categoryId: cat2.id, companyId: JS },
      { id: createId(), reference: 'SIG-MAT-001',   designation: 'Mât signalisation Ø60 H=2500',          unit: 'u',       salePrice: 95,   costPrice: 52,   lineType: 'purchase', categoryId: cat2.id, companyId: JS },
      { id: createId(), reference: 'SIG-ALUCO-001', designation: 'Panneau alucobond impression numérique', unit: 'm²',      salePrice: 185,  costPrice: 95,   lineType: 'workshop', categoryId: cat2.id, companyId: JS },
      { id: createId(), reference: 'MAR-PMR-001',   designation: 'Marquage place PMR peinture routière',   unit: 'u',       salePrice: 85,   costPrice: 28,   lineType: 'service',  categoryId: cat3.id, companyId: JS },
      { id: createId(), reference: 'MAR-AXE-001',   designation: 'Marquage axial ml',                     unit: 'ml',      salePrice: 4.5,  costPrice: 1.8,  lineType: 'service',  categoryId: cat3.id, companyId: JS },
      { id: createId(), reference: 'MAR-CHEMI-001', designation: 'Cheminement PMR résine colorée m²',     unit: 'm²',      salePrice: 42,   costPrice: 18,   lineType: 'service',  categoryId: cat3.id, companyId: JS },
      { id: createId(), reference: 'MO-TECH-001',   designation: 'Main d\'œuvre technicien / heure',      unit: 'h',       salePrice: 55,   costPrice: 32,   lineType: 'service',  categoryId: cat4.id, companyId: JS },
      { id: createId(), reference: 'MO-POSE-001',   designation: 'Forfait pose mobilier urbain',          unit: 'forfait', salePrice: 350,  costPrice: 195,  lineType: 'service',  categoryId: cat4.id, companyId: JS },
    ],
  });
  console.log('  ✓ Catalogue : 14 produits');

  // ─── 6. CHANTIERS ──────────────────────────────────────────────────────────
  let qSeq = 1, jSeq = 1, iSeq = 1;
  let totalInvoiced = 0;
  const now = new Date();

  for (const ch of CHANTIERS) {
    const [year, month, clientKey, title, address, amount, durationDays, teamKey] = ch;
    const clientId = C[clientKey as keyof typeof C];
    const teamId   = TEAMS[teamKey as keyof typeof TEAMS];
    const techIds  = teamMembers[teamId];

    const qRef = `DEV-JS-${year}-${String(qSeq).padStart(3,'0')}`;
    const jRef = `CHT-JS-${year}-${String(jSeq).padStart(3,'0')}`;
    const iRef = `FAC-JS-${year}-${String(iSeq).padStart(3,'0')}`;

    const quoteId = `q_js_${year}_${month}_${qSeq}`;
    const jobId   = `j_js_${year}_${month}_${jSeq}`;
    const invId   = `i_js_${year}_${month}_${jSeq}`;

    const isInProgress = IN_PROGRESS_TITLES.has(title);
    const isPlanned    = PLANNED_TITLES.has(title);
    const isOverdue    = OVERDUE_TITLES.has(title);
    const isDone       = !isInProgress && !isPlanned;

    // startDate réparti dans le mois
    const startDay = ((jSeq % 20) * 1) + 1;
    const startDate = d(year, month, Math.min(startDay, 24));
    const endDate   = isDone ? addDays(startDate, durationDays) : null;

    const jobStatus: JobStatus = isInProgress ? 'in_progress' : isPlanned ? 'planned' : 'invoiced';
    const progress = isInProgress ? 55 : isPlanned ? 0 : 100;

    // Quote
    const inv1 = Math.round(amount * 0.65);
    const inv2 = amount - inv1;
    await prisma.quote.create({
      data: {
        id: quoteId, reference: qRef, subject: title,
        amount, status: isPlanned ? 'sent' : 'accepted',
        validUntil: addDays(startDate, 30),
        clientId, companyId: JS,
        lines: { create: [
          { id: createId(), designation: title,                           unit: 'forfait', quantity: 1, unitPrice: inv1, sortOrder: 1 },
          { id: createId(), designation: 'Main d\'œuvre et déplacements', unit: 'forfait', quantity: 1, unitPrice: inv2, sortOrder: 2 },
        ]},
      },
    });

    // Job
    await prisma.job.create({
      data: {
        id: jobId, reference: jRef, title, address, status: jobStatus,
        startDate, endDate: endDate ?? undefined, progress,
        quoteId, clientId, companyId: JS,
        assignments: { create: techIds.map(userId => ({ userId })) },
      },
    });

    // Time entries
    if (isDone || isInProgress) {
      const workEnd = isDone ? endDate! : addDays(now, -1);
      const entries: any[] = [];
      let cur = new Date(startDate);
      while (cur <= workEnd) {
        const wd = cur.getDay();
        if (wd !== 0 && wd !== 6) {
          for (const userId of techIds) {
            entries.push({
              id: createId(), date: new Date(cur), hours: 8,
              description: `${jRef} — ${title}`,
              status: isInProgress && cur > addDays(now, -14)
                ? TimeEntryStatus.submitted : TimeEntryStatus.approved,
              userId, jobId, companyId: JS,
            });
          }
        }
        cur = addDays(cur, 1);
      }
      if (entries.length > 0) {
        for (let i = 0; i < entries.length; i += 50) {
          await prisma.timeEntry.createMany({ data: entries.slice(i, i + 50) });
        }
      }
    }

    // Invoice (uniquement chantiers terminés)
    if (isDone) {
      const issuedAt = addDays(endDate!, 3);
      const dueDate  = addDays(issuedAt, 30);
      const invAmt   = Math.round(amount * 0.8);
      const invStatus: InvoiceStatus = isOverdue ? 'overdue' : 'paid';
      const paidAt   = isOverdue ? undefined : addDays(dueDate, -8);

      await prisma.invoice.create({
        data: {
          id: invId, reference: iRef, amount: invAmt, status: invStatus,
          issuedAt,
          dueDate: isOverdue ? d(2026,3,28) : dueDate,
          paidAt,
          vatRate: 20,
          clientId, companyId: JS,
        },
      });
      totalInvoiced += invAmt;
      iSeq++;
    }

    qSeq++;
    jSeq++;
  }

  console.log(`  ✓ ${CHANTIERS.length} chantiers — ${(totalInvoiced/1000).toFixed(0)}k€ facturé`);

  // ─── 7. PIPELINE COMMERCIAL (3 devis en cours) ─────────────────────────────
  await prisma.quote.create({
    data: {
      id: 'q_js_pipe1', reference: 'DEV-JS-2026-901',
      subject: 'Mobilier parc des Ailes — Roanne Agglo',
      amount: 58400, status: 'sent', validUntil: d(2026,5,15),
      clientId: C.roannais, companyId: JS,
      lines: { create: [
        { id: createId(), designation: 'Mobilier urbain lot 1', unit: 'forfait', quantity: 1, unitPrice: 36000, sortOrder: 1 },
        { id: createId(), designation: 'Pose et scellements',   unit: 'forfait', quantity: 1, unitPrice: 22400, sortOrder: 2 },
      ]},
    },
  });
  await prisma.quote.create({
    data: {
      id: 'q_js_pipe2', reference: 'DEV-JS-2026-902',
      subject: 'Signalisation directionnelle ZI Nord — SEM',
      amount: 34800, status: 'sent', validUntil: d(2026,5,30),
      clientId: C.sem, companyId: JS,
      lines: { create: [
        { id: createId(), designation: 'Panneaux directionnels (42 + mâts)', unit: 'forfait', quantity: 1, unitPrice: 21000, sortOrder: 1 },
        { id: createId(), designation: 'Pose et implantation',               unit: 'forfait', quantity: 1, unitPrice: 13800, sortOrder: 2 },
      ]},
    },
  });
  await prisma.quote.create({
    data: {
      id: 'q_js_pipe3', reference: 'DEV-JS-2026-903',
      subject: 'Mobilier parc Tarentaize — phase 3',
      amount: 42600, status: 'draft', validUntil: d(2026,5,25),
      clientId: C.sem, companyId: JS,
      lines: { create: [
        { id: createId(), designation: 'Mobilier phase 3 (bancs, corbeilles, signalétique)', unit: 'forfait', quantity: 1, unitPrice: 28000, sortOrder: 1 },
        { id: createId(), designation: 'Main d\'œuvre pose', unit: 'forfait', quantity: 1, unitPrice: 14600, sortOrder: 2 },
      ]},
    },
  });
  console.log('  ✓ Pipeline : 3 devis en cours (136k€)');

  // ─── 8. ATELIER (3 ordres de fabrication) ──────────────────────────────────
  const mezencJob   = await prisma.job.findFirst({ where: { title: { contains: 'Mézenc-Meygal' }, companyId: JS } });
  const vinciA72Job = await prisma.job.findFirst({ where: { title: { contains: 'échangeur A72' }, companyId: JS } });
  const montreynaudJob = await prisma.job.findFirst({ where: { title: { contains: 'Montreynaud, St-Étienne' }, companyId: JS, status: 'invoiced' }, orderBy: { startDate: 'desc' } });

  if (mezencJob) {
    await prisma.workshopItem.create({
      data: {
        id: createId(), reference: 'ATL-JS-2026-001',
        title: 'Pupitres "Volcans en liberté" — découpe alucobond',
        description: '8 panneaux alucobond 6mm format A2 — visuels CC Mézenc-Meygal',
        status: 'bat_pending' as WorkshopStatus, priority: 'medium' as WorkshopPriority,
        dueDate: d(2026,4,30), assignedTo: 'Sébastien GAUDIN',
        jobId: mezencJob.id, companyId: JS,
      },
    });
  }
  if (vinciA72Job) {
    await prisma.workshopItem.create({
      data: {
        id: createId(), reference: 'ATL-JS-2026-002',
        title: 'Panneaux balisage A72 — découpe + impression',
        description: 'Impression numérique + découpe 24 panneaux alu composite 3mm',
        status: 'fabrication' as WorkshopStatus, priority: 'high' as WorkshopPriority,
        dueDate: d(2026,4,28), assignedTo: 'Nicolas DUMAS',
        jobId: vinciA72Job.id, companyId: JS,
      },
    });
  }
  if (montreynaudJob) {
    await prisma.workshopItem.create({
      data: {
        id: createId(), reference: 'ATL-JS-2026-003',
        title: 'Panneaux directionnels ZAC Montreynaud — retouches',
        description: 'Retouches peinture + vernis 6 panneaux',
        status: 'ready' as WorkshopStatus, priority: 'low' as WorkshopPriority,
        dueDate: d(2026,4,22), assignedTo: 'Maxime FAVRE',
        jobId: montreynaudJob.id, companyId: JS,
      },
    });
  }
  console.log('  ✓ Atelier : 3 ordres de fabrication');

  // ─── 9. PLANNING — couverture complète semaine par semaine ─────────────────
  // Reconstruit la fenêtre [start, end] de chaque chantier (même logique que la
  // section 6 : startDay = (jSeq % 20) + 1, capé à 24, durée = durationDays).
  // Puis pour chaque semaine ISO entre mai 2025 et avril 2026, crée une
  // teamPlanningWeek + slots Lun-Ven pour chaque équipe ayant un chantier actif
  // cette semaine (intersection [chantier.start, chantier.end] ∩ [lundi, vendredi]).

  const getMonday = (date: Date): Date => {
    const d2 = new Date(date);
    const day = d2.getDay();
    const diff = day === 0 ? -6 : 1 - day; // dimanche → lundi précédent
    d2.setDate(d2.getDate() + diff);
    d2.setHours(0, 0, 0, 0);
    return d2;
  };

  // Fenêtre temporelle de chaque chantier, indexée par teamId
  type ChantierWindow = {
    title: string;
    start: Date;
    end: Date;
    teamId: string;
    jobId: string;
  };
  const chantierWindows: ChantierWindow[] = [];
  let jSeq2 = 1;
  for (const ch of CHANTIERS) {
    const [year, month, , title, , , durationDays, teamKey] = ch;
    const startDay = ((jSeq2 % 20) * 1) + 1;
    const start = d(year, month, Math.min(startDay, 24));
    const end = addDays(start, durationDays);
    chantierWindows.push({
      title,
      start,
      end,
      teamId: TEAMS[teamKey as keyof typeof TEAMS],
      jobId: `j_js_${year}_${month}_${jSeq2}`,
    });
    jSeq2++;
  }

  const seedStart = getMonday(d(2025, 5, 5));   // lundi 5 mai 2025
  const seedEnd   = getMonday(d(2026, 4, 27));  // lundi 27 avril 2026 (incluse)
  const todayMonday = getMonday(now);

  let weeksCreated = 0;
  let totalTeamSlots = 0;
  let totalPSlots = 0;

  for (let weekStart = new Date(seedStart); weekStart <= seedEnd; weekStart = addDays(weekStart, 7)) {
    const weekEnd = addDays(weekStart, 4); // vendredi
    const isPast = weekEnd < todayMonday;

    const weekId = `w_js_${weekStart.getFullYear()}_${String(weekStart.getMonth() + 1).padStart(2, '0')}_${String(weekStart.getDate()).padStart(2, '0')}`;

    const hw = await prisma.teamPlanningWeek.create({
      data: {
        id: weekId,
        weekStart: new Date(weekStart),
        status: isPast ? TeamPlanningStatus.locked : TeamPlanningStatus.draft,
        version: 1,
        companyId: JS,
      },
    });

    const tSlots: any[] = [];
    const pSlots: any[] = [];

    // Pour chaque équipe, trouver le chantier actif cette semaine
    for (const teamId of Object.values(TEAMS)) {
      const activeChantier = chantierWindows.find(c =>
        c.teamId === teamId &&
        c.start <= weekEnd &&
        c.end   >= weekStart
      );
      if (!activeChantier) continue;

      // Intersection [chantier, semaine] côté jours ouvrés
      const slotStart = activeChantier.start > weekStart ? activeChantier.start : weekStart;
      const slotEnd   = activeChantier.end   < weekEnd   ? activeChantier.end   : weekEnd;

      for (let day = new Date(slotStart); day <= slotEnd; day = addDays(day, 1)) {
        const dow = day.getDay();
        if (dow === 0 || dow === 6) continue; // skip weekend

        tSlots.push({
          weekId: hw.id,
          teamId,
          date: new Date(day),
          startHour: 7,
          endHour: 17,
          jobId: activeChantier.jobId,
        });

        for (const userId of teamMembers[teamId]) {
          pSlots.push({
            id: createId(),
            date: new Date(day),
            userId,
            jobId: activeChantier.jobId,
            companyId: JS,
          });
        }
      }
    }

    if (tSlots.length > 0) await prisma.teamPlanningSlot.createMany({ data: tSlots });
    if (pSlots.length > 0) await prisma.planningSlot.createMany({ data: pSlots });

    weeksCreated++;
    totalTeamSlots += tSlots.length;
    totalPSlots += pSlots.length;
  }

  console.log(`  ✓ Planning : ${weeksCreated} semaines, ${totalTeamSlots} team slots, ${totalPSlots} planning slots individuels`);

  // ─── RÉCAP ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('✅ SEED 12 MOIS v3 — JS CONCEPT');
  console.log(`  Chantiers            : ${CHANTIERS.length} sur 12 mois (~12/mois)`);
  console.log(`  CA total facturé     : ${(totalInvoiced/1000).toFixed(0)}k€`);
  console.log(`  Équipes terrain      : 4 (8 techniciens)`);
  console.log(`  Pipeline devis       : 3 en cours — 136k€`);
  console.log('');
  console.log('  ⚠️  FACTURES EN RETARD :');
  OVERDUE_TITLES.forEach(t => console.log(`    • ${t}`));
  console.log('');
  console.log('  Connexion admin     : e.sauron@js-concept.fr       /  Demo1234!');
  console.log('  Connexion conducteur: b.faure@js-concept.fr        /  Demo1234!');
  console.log('  Connexion tech      : yann.leblanc@js-concept.fr   /  Demo1234!');
  console.log('  Connexion tech      : thomas.rey@js-concept.fr     /  Demo1234!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
