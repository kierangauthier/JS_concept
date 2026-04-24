/**
 * SEED HISTORIQUE 12 MOIS — ASP SIGNALISATION v1
 * ──────────────────────────────────────────────────
 * 5 équipes quasi full-time, Mai 2025 → Avril 2026.
 * ~130 chantiers · CA 60k→120k€/mois · time entries denses.
 * Activité : signalisation verticale, marquage sol, balisage de chantier.
 *
 * Usage (depuis le container) :
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-12months-asp.ts
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

const ASP = 'co_asp';

// ─── IDs fixes ───────────────────────────────────────────────────────────────
const U = {
  admin1: 'u_asp_admin',
  admin2: 'u_asp_cond',
  t1:  'u_asp_tech01',
  t2:  'u_asp_tech02',
  t3:  'u_asp_tech03',
  t4:  'u_asp_tech04',
  t5:  'u_asp_tech05',
  t6:  'u_asp_tech06',
  t7:  'u_asp_tech07',
  t8:  'u_asp_tech08',
  t9:  'u_asp_tech09',
  t10: 'u_asp_tech10',
};
const TEAMS = { a: 'asp_team_a', b: 'asp_team_b', c: 'asp_team_c', d: 'asp_team_d', e: 'asp_team_e' };
const C = {
  mairie:   'cl_asp_ml',
  grandlyon:'cl_asp_gl',
  rhone:    'cl_asp_rh',
  dir:      'cl_asp_di',
  colas:    'cl_asp_co',
  eiffage:  'cl_asp_ei',
  eurovia:  'cl_asp_eu',
  villefranche: 'cl_asp_vf',
  bourg:    'cl_asp_bb',
  vienne:   'cl_asp_vi',
};

// [year, month, clientKey, title, address, amount, durationDays, teamKey]
type Ch = [number, number, string, string, string, number, number, string];

const CHANTIERS: Ch[] = [
  // ── MAI 2025 (11 chantiers) ───────────────────────────────────────────────
  [2025,5,'grandlyon','Signalisation verticale ZAC Carré de Soie',    'Av. Paul Kruger, Vaulx-en-Velin',      22400,15,'a'],
  [2025,5,'colas',    'Balisage chantier RD306 Corbas',               'RD306, Corbas',                         8600, 6,'b'],
  [2025,5,'mairie',   'Marquage PMR parvis Hôtel de Ville — lot 1',   'Place de la Comédie, Lyon 1er',         6400, 4,'c'],
  [2025,5,'dir',      'Signalisation temporaire A6 — balisage nuit',  'A6 km 12, sens Lyon-Paris',            18200,12,'d'],
  [2025,5,'rhone',    'Panneaux directionnels RD48 La Tour-de-Salvagny','RD48, La Tour-de-Salvagny',          11800, 8,'e'],
  [2025,5,'eiffage',  'Balisage chantier réseau eaux pluviales Bron', 'Rue Marcel Cachin, Bron',               7200, 5,'a'],
  [2025,5,'villefranche','Signalisation axes principaux Villefranche','Bd Louis Blanc, Villefranche',         14400,10,'b'],
  [2025,5,'eurovia',  'Marquage axial RD4 Mions — lot 1',             'RD4, Mions',                            5800, 4,'c'],
  [2025,5,'grandlyon','Balisage maintenance réseau eau Décines',      'ZI Décines-Charpieu',                   9600, 7,'d'],
  [2025,5,'mairie',   'Panneaux zone 30 quartier Guillotière',        'Rue de la Guillotière, Lyon 7e',         4200, 3,'e'],
  [2025,5,'vienne',   'Signalétique touristique Vienne Condrieu agglo','Berges du Rhône, Vienne',              13200, 9,'a'],

  // ── JUIN 2025 (11 chantiers) ──────────────────────────────────────────────
  [2025,6,'dir',      'Signalisation temporaire A7 — travaux pont',   'A7 km 8, Rive-de-Gier',               26800,18,'b'],
  [2025,6,'grandlyon','Pose panneaux directionnels Confluence — lot 1','Quai Perrache, Lyon 2e',              19400,13,'c'],
  [2025,6,'colas',    'Balisage chantier terrassement Meyzieu',       'ZA de Meyzieu',                         8200, 6,'d'],
  [2025,6,'rhone',    'Signalisation zones 30 communes Beaujolais',   'Secteur Beaujolais nord',               9400, 7,'e'],
  [2025,6,'mairie',   'Marquage parking Parc de la Tête d\'Or',       'Bd des Belges, Lyon 6e',                7600, 5,'a'],
  [2025,6,'eiffage',  'Panneaux chantier pont Pasteur',               'Quai Claude Bernard, Lyon 7e',         14600,10,'b'],
  [2025,6,'eurovia',  'Marquage routier RD14 Givors — lot 2',         'RD14, Givors',                          6200, 4,'c'],
  [2025,6,'villefranche','Mobilier signalétique gare Villefranche',   'Gare SNCF Villefranche',               16800,11,'d'],
  [2025,6,'bourg',    'Signalisation directionnelle Bourg-en-Bresse', 'Bd du Mail, Bourg-en-Bresse',          21400,14,'e'],
  [2025,6,'grandlyon','Balisage dévoiement réseau gaz Saint-Priest',  'ZI Saint-Priest',                      11200, 8,'a'],
  [2025,6,'vienne',   'Panneaux zone 30 Vienne centre',               'Centre-ville Vienne',                   4800, 3,'b'],

  // ── JUILLET 2025 (11 chantiers) ───────────────────────────────────────────
  [2025,7,'dir',      'Balisage ASF été — tronçon A43 Bourgoin',     'A43 km 42-58, Bourgoin-Jallieu',       34200,22,'c'],
  [2025,7,'grandlyon','Signalisation pistes cyclables Métropole — lot 1','Réseau vélo Lyon-Nord',             24600,16,'d'],
  [2025,7,'colas',    'Marquage parking ZAC des Mûriers Vénissieux', 'ZAC des Mûriers, Vénissieux',           9800, 7,'e'],
  [2025,7,'rhone',    'Panneaux touristiques Route des Pierres Dorées','Route des Pierres Dorées',            18400,12,'a'],
  [2025,7,'mairie',   'Marquage PMR 32 places secteur Presqu\'île',   'Rue de la Ré, Lyon 2e',                 5600, 3,'b'],
  [2025,7,'eiffage',  'Balisage chantier métro B prolongement',       'Av. Jean Jaurès, Lyon 7e',             12800, 9,'c'],
  [2025,7,'eurovia',  'Marquage axial RD386 Chasse-sur-Rhône',        'RD386, Chasse-sur-Rhône',               7400, 5,'d'],
  [2025,7,'villefranche','Signalisation zone industrielle Gleizé',    'ZI Gleizé, Villefranche',              11600, 8,'e'],
  [2025,7,'bourg',    'Panneaux direction hôpital + cliniques',       'Secteur médical Bourg-en-Bresse',       8200, 6,'a'],
  [2025,7,'vienne',   'Marquage sol parking parc expo Vienne',        'Parc des expositions, Vienne',          6800, 5,'b'],
  [2025,7,'grandlyon','Balisage maintenance réseaux ENEDIS Rillieux', 'Rillieux-la-Pape',                     13600, 9,'c'],

  // ── AOÛT 2025 (11 chantiers) ──────────────────────────────────────────────
  [2025,8,'dir',      'Signalisation temporaire A46 nord — lot 1',   'A46N km 5-18, Miribel',               28400,18,'d'],
  [2025,8,'grandlyon','Panneaux directionnels ZAC Confluence — lot 2','Quai Rambaud, Lyon 2e',               16200,11,'e'],
  [2025,8,'colas',    'Balisage chantier assainissement Décines',     'Rue Balzac, Décines-Charpieu',          7800, 5,'a'],
  [2025,8,'rhone',    'Signalisation entrées de ville communes 69',   'Entrées agglomérations Rhône',         12400, 9,'b'],
  [2025,8,'eiffage',  'Balisage et signalisation Voie Lyonnaise 2',   'Cours Gambetta, Lyon 7e',              22800,14,'c'],
  [2025,8,'eurovia',  'Marquage routier RD7 Givors — travaux été',    'RD7, Givors secteur pont',              9200, 6,'d'],
  [2025,8,'villefranche','Signalisation parking relais Villefranche', 'P+R gare Villefranche',                 8600, 6,'e'],
  [2025,8,'bourg',    'Pose panneaux agglomération Bourg agglo',      'Entrées Bourg-en-Bresse agglomération',14800,10,'a'],
  [2025,8,'vienne',   'Marquage axial RD2 Vienne — lot 1',           'RD2, secteur Vienne nord',              7600, 5,'b'],
  [2025,8,'grandlyon','Balisage chantier voirie Décines ZI',          'ZI Décines secteur 2',                 11400, 8,'c'],
  [2025,8,'mairie',   'Panneaux signalisation sortie autoroute D',    'Diffuseur Perrache, Lyon 2e',           5400, 3,'d'],

  // ── SEPTEMBRE 2025 (11 chantiers) ─────────────────────────────────────────
  [2025,9,'dir',      'Signalisation chantier élargt A89 Balbigny',  'A89 km 2, Balbigny',                   38600,22,'e'],
  [2025,9,'grandlyon','Signalisation pistes cyclables Métropole — lot 2','Réseau vélo Est lyonnais',          19200,13,'a'],
  [2025,9,'colas',    'Balisage chantier RD6 Jonage',                 'RD6, Jonage',                           8400, 6,'b'],
  [2025,9,'rhone',    'Panneaux directionnels inter-communes nord',   'RD communes nord Rhône',               16800,11,'c'],
  [2025,9,'eiffage',  'Balisage travaux Voie Lyonnaise 12',          'Bd Vivier Merle, Lyon 3e',             18600,12,'d'],
  [2025,9,'eurovia',  'Marquage axial RD386 lot 3 Chasse',           'RD386, Chasse-sur-Rhône',               6800, 4,'e'],
  [2025,9,'villefranche','Panneaux zone commerciale Limas',          'ZC Limas, Villefranche',                9200, 7,'a'],
  [2025,9,'bourg',    'Signalisation contournement Bourg — phase 1', 'Contournement RN79, Bourg-en-Bresse',  24400,15,'b'],
  [2025,9,'vienne',   'Marquage parking stade nautique Vienne',      'Stade nautique, Vienne',                5200, 3,'c'],
  [2025,9,'grandlyon','Balisage maintenance GRDF Vénissieux secteur','Vénissieux Sud',                       10400, 7,'d'],
  [2025,9,'mairie',   'Signalisation traversée piétonne Croix-Rousse','Bd de la Croix-Rousse, Lyon 4e',       6200, 4,'e'],

  // ── OCTOBRE 2025 (11 chantiers) ───────────────────────────────────────────
  [2025,10,'dir',     'Signalisation ASF automne — A6 côté Paris',   'A6 km 8-21, direction Paris',          32400,19,'a'],
  [2025,10,'grandlyon','Panneaux directionnels ZAC Carré de Soie — fin','ZAC Carré de Soie, Vaulx',          14800,10,'b'],
  [2025,10,'colas',   'Balisage chantier fouilles télécom Caluire',  'Rue de Belfort, Caluire-et-Cuire',      7400, 5,'c'],
  [2025,10,'rhone',   'Signalisation cœur de village communes 69',   'Secteur Beaujolais centres-bourgs',    13600, 9,'d'],
  [2025,10,'eiffage', 'Balisage mise en service Voie Lyonnaise 5',   'Allée de la Robertsau, Lyon 9e',       16400,11,'e'],
  [2025,10,'eurovia', 'Marquage routier RD383 Oullins',              'RD383, Oullins',                        8800, 6,'a'],
  [2025,10,'villefranche','Signalisation directionnelle centre-ville','Centre Villefranche-sur-Saône',        11400, 8,'b'],
  [2025,10,'bourg',   'Signalisation contournement Bourg — phase 2', 'Contournement RN79 phase 2',           21800,14,'c'],
  [2025,10,'vienne',  'Panneaux directionnels agglo Vienne — lot 1', 'Routes agglo Vienne Condrieu',         12400, 8,'d'],
  [2025,10,'grandlyon','Balisage réseaux ENEDIS secteur Mions',      'Mions centre et périphérie',            9600, 7,'e'],
  [2025,10,'mairie',  'Marquage PMR secteur Bellecour',              'Place Bellecour + env., Lyon 2e',        5800, 3,'a'],

  // ── NOVEMBRE 2025 (11 chantiers) ──────────────────────────────────────────
  [2025,11,'dir',     'Signalisation temporaire A480 Grenoble — lot 1','A480 km 3-11, Grenoble',             29200,18,'b'],
  [2025,11,'grandlyon','Signalisation zones 30 Villeurbanne secteur 3','Rue Francis de Pressensé, Villeurb.',  9200, 6,'c'],
  [2025,11,'colas',   'Balisage réhabilitation RD433 Chassieu',      'RD433, Chassieu',                      11600, 8,'d'],
  [2025,11,'rhone',   'Panneaux d\'entrée agglo Brondons + communes', 'Secteur Brondons, Rhône',               8400, 6,'e'],
  [2025,11,'eiffage', 'Panneaux chantier Confluence lot B2',         'Quai Perrache, Lyon 2e',               18200,12,'a'],
  [2025,11,'eurovia', 'Marquage axial RD4 Mions — lot 2 automne',    'RD4, Mions secteur 2',                  7200, 5,'b'],
  [2025,11,'villefranche','Signalisation temporaire travaux A6 dév.',  'Déviation A6 Villefranche',           22400,14,'c'],
  [2025,11,'bourg',   'Pose panneaux F61 zone scolaire Bourg',       'Zones scolaires Bourg-en-Bresse',       6400, 4,'d'],
  [2025,11,'vienne',  'Marquage axial RD2 Vienne — lot 2',           'RD2, secteur Vienne sud',               7800, 5,'e'],
  [2025,11,'grandlyon','Balisage réseau eau Grand Lyon Genas',        'Genas sud',                            12800, 9,'a'],
  [2025,11,'mairie',  'Signalisation plan mobilité durable Lyon 7e', 'Lyon 7e secteur Gerland',              16600,11,'b'],

  // ── DÉCEMBRE 2025 (11 chantiers) ──────────────────────────────────────────
  [2025,12,'dir',     'Balisage hivernal A43 — dispositifs déneigement','A43 km 28-44, La Tour-du-Pin',      14400, 9,'c'],
  [2025,12,'grandlyon','Panneaux directionnels Val de Saône — lot 1', 'Secteur Val de Saône, Anse',          17600,12,'d'],
  [2025,12,'colas',   'Balisage chantier enrobé RD70 Pusignan',       'RD70, Pusignan',                       9200, 6,'e'],
  [2025,12,'rhone',   'Signalisation Noël et manifestations Rhône',   'Divers communes Rhône',                 8800, 7,'a'],
  [2025,12,'eiffage', 'Balisage chantier A89 Tarare — lot hiver',     'A89 km 56, Tarare',                   22600,14,'b'],
  [2025,12,'eurovia', 'Marquage parking ZA Genay — fin d\'année',     'ZA Genay, Rhône',                       6600, 4,'c'],
  [2025,12,'villefranche','Panneaux signalétique marché de Noël',     'Centre Villefranche-sur-Saône',         5200, 4,'d'],
  [2025,12,'bourg',   'Signalisation temporaire déviation Bourg',     'Déviation RN75, Bourg-en-Bresse',     18800,12,'e'],
  [2025,12,'vienne',  'Marquage voie bus RD1086 Vienne',              'RD1086, Vienne',                       11400, 7,'a'],
  [2025,12,'grandlyon','Balisage maintenance GRDF Rillieux hiver',    'Rillieux-la-Pape',                      9800, 7,'b'],
  [2025,12,'mairie',  'Signalisation événement Fête des Lumières',    'Secteurs Lyon 2e et 5e',               14200, 9,'c'],

  // ── JANVIER 2026 (11 chantiers) ───────────────────────────────────────────
  [2026,1,'dir',      'Signalisation chantier A89 Balbigny — lot 2', 'A89 km 2-8, Balbigny',                 42800,24,'d'],
  [2026,1,'grandlyon','Signalisation pistes cyclables Métropole — lot 3','Réseau vélo Ouest lyonnais',        22200,14,'e'],
  [2026,1,'colas',    'Balisage réseaux ENEDIS Villeurbanne secteur', 'Villeurbanne Est',                      8400, 5,'a'],
  [2026,1,'rhone',    'Panneaux directionnels secteur Beaujolais 2',  'Routes Beaujolais, Rhône',             14400,10,'b'],
  [2026,1,'eiffage',  'Signalisation provisoire A432 — phase 1',      'A432 km 3-9, Satolas-et-Bonce',       24800,15,'c'],
  [2026,1,'eurovia',  'Marquage axial RD17 Tassin-la-Demi-Lune',     'RD17, Tassin',                          9400, 6,'d'],
  [2026,1,'villefranche','Signalisation parc d\'activités Mézériat',  'PA Mézériat, Ain',                     12600, 9,'e'],
  [2026,1,'bourg',    'Panneaux touristiques Bourg agglo — lot 1',    'Agglomération Bourg-en-Bresse',        16800,11,'a'],
  [2026,1,'vienne',   'Marquage routier RD4 secteur Chasse — hiver', 'RD4, Chasse-sur-Rhône',                 8200, 5,'b'],
  [2026,1,'grandlyon','Balisage chantier tunnel Fourvière — nuit',   'Tunnel de Fourvière, Lyon',            18400,12,'c'],
  [2026,1,'mairie',   'Signalisation parkings relais P+R Lyon nord', 'P+R Cuire, P+R Vaise, Lyon',           11600, 8,'d'],

  // ── FÉVRIER 2026 (11 chantiers) ───────────────────────────────────────────
  [2026,2,'dir',      'Signalisation temporaire A6 Limonest — fase 1','A6 km 21-28, Limonest',               32400,18,'e'],
  [2026,2,'grandlyon','Panneaux directionnels ZAC Bon Lait — lot 2', 'ZAC Bon Lait, Vénissieux',             18800,13,'a'],
  [2026,2,'colas',    'Balisage chantier eau pluviale Caluire',       'Rue de la Plaine, Caluire',             9200, 6,'b'],
  [2026,2,'rhone',    'Signalisation axes structurants Rhône 2026',   'RD secteur Rhône nord-est',            21400,13,'c'],
  [2026,2,'eiffage',  'Balisage Voie Lyonnaise 1 — travaux finition', 'Quai des Brotteaux, Lyon 6e',         16200,11,'d'],
  [2026,2,'eurovia',  'Marquage axial RD7 Givors printemps',          'RD7, Givors',                           7800, 5,'e'],
  [2026,2,'villefranche','Panneaux zone industrielle Gleizé ext.',    'Extension ZI Gleizé, Villefranche',    14200,10,'a'],
  [2026,2,'bourg',    'Signalisation contournement Bourg — phase 3', 'Contournement RN79 phase 3',           28600,17,'b'],
  [2026,2,'vienne',   'Marquage parking intermodal gare Vienne',      'Parvis gare SNCF, Vienne',              8600, 5,'c'],
  [2026,2,'grandlyon','Balisage réseau gaz GRTgaz Feyzin',           'Site GRTgaz, Feyzin',                  12800, 8,'d'],
  [2026,2,'mairie',   'Signalisation quartier Part-Dieu rénovation',  'Quartier Part-Dieu, Lyon 3e',          19400,13,'e'],

  // ── MARS 2026 (11 chantiers) ──────────────────────────────────────────────
  [2026,3,'dir',      'Signalisation temporaire A480 Grenoble — lot 2','A480 km 11-18, Grenoble',            38200,21,'a'],
  [2026,3,'grandlyon','Signalisation pistes cyclables Métropole — lot 4','Réseau vélo Sud lyonnais',          24400,15,'b'],
  [2026,3,'colas',    'Balisage chantier RD306 Corbas — phase 2',    'RD306, Corbas secteur 2',               11200, 7,'c'],
  [2026,3,'rhone',    'Panneaux directionnels RD12 Mornant',          'RD12, Mornant',                        14800,10,'d'],
  [2026,3,'eiffage',  'Signalisation provisoire A432 — phase 2',      'A432 km 9-15, secteur Rhône',         22400,14,'e'],
  [2026,3,'eurovia',  'Marquage routier RD53 Corbas printemps',       'RD53, Corbas',                          8800, 6,'a'],
  [2026,3,'villefranche','Signalisation aire de covoiturage Limas',  'Aire covoiturage A6, Limas',            9600, 7,'b'],
  [2026,3,'bourg',    'Panneaux touristiques Bourg agglo — lot 2',    'Routes touristiques Ain',              12200, 8,'c'],
  [2026,3,'vienne',   'Marquage axial RD1086 Vienne — phase 2',       'RD1086, Vienne–Chasse',               13600, 9,'d'],
  [2026,3,'grandlyon','Balisage chantier renouvellement canalisations','Rues secteur Monplaisir Lyon 8e',     16800,11,'e'],
  [2026,3,'mairie',   'Signalisation Plan Lumière — parc Tête d\'Or', 'Parc Tête d\'Or, Lyon 6e',            11800, 8,'a'],

  // ── AVRIL 2026 — EN COURS / PLANIFIÉ (8 chantiers) ───────────────────────
  [2026,4,'dir',      'Balisage chantier A7 éch. Ternay — phase 1', 'A7 échangeur Ternay',                  48400,28,'b'],
  [2026,4,'grandlyon','Signalisation pistes cyclables Métropole — lot 5','Réseau vélo Nord, Caluire',        28200,18,'c'],
  [2026,4,'eiffage',  'Signalisation provisoire A432 — phase 3',     'A432 km 15-21, Satolas',              26600,17,'d'],
  [2026,4,'rhone',    'Panneaux directionnels Beaujolais Vert — lot 1','Routes touristiques Beaujolais',     18400,12,'e'],
  [2026,4,'colas',    'Marquage routier RD73 Caluire printemps',      'RD73, Caluire-et-Cuire',              11600, 8,'a'],
  [2026,4,'mairie',   'Marquage PMR secteur Croix-Rousse 2026',       'Plateau Croix-Rousse, Lyon 4e',        8400, 6,'b'],
  [2026,4,'villefranche','Signalisation accès giratoire Limas RD306', 'Giratoire Limas RD306',               14800,10,'c'],
  [2026,4,'bourg',    'Panneaux signalétique musée de Brou',          'Monastère de Brou, Bourg-en-Bresse',  22400,14,'d'],
];

// Factures en retard (par titre exact)
const OVERDUE_TITLES = new Set([
  'Marquage axial RD4 Mions — lot 2 automne',
  'Signalisation temporaire déviation Bourg',
]);

// Chantiers en cours (avril 2026)
const IN_PROGRESS_TITLES = new Set([
  'Balisage chantier A7 éch. Ternay — phase 1',
  'Signalisation provisoire A432 — phase 3',
  'Marquage routier RD73 Caluire printemps',
]);
const PLANNED_TITLES = new Set([
  'Signalisation pistes cyclables Métropole — lot 5',
  'Panneaux directionnels Beaujolais Vert — lot 1',
  'Marquage PMR secteur Croix-Rousse 2026',
  'Signalisation accès giratoire Limas RD306',
  'Panneaux signalétique musée de Brou',
]);

const teamMembers: Record<string, string[]> = {
  [TEAMS.a]: [U.t1,  U.t2],
  [TEAMS.b]: [U.t3,  U.t4],
  [TEAMS.c]: [U.t5,  U.t6],
  [TEAMS.d]: [U.t7,  U.t8],
  [TEAMS.e]: [U.t9,  U.t10],
};

async function main() {
  console.log('🌱 Seed HISTORIQUE 12 MOIS v1 — ASP SIGNALISATION...');
  const hash = bcrypt.hashSync('Demo1234!', 10);

  // ─── 0. CLEANUP ────────────────────────────────────────────────────────────
  console.log('  Nettoyage ASP...');
  await prisma.$transaction([
    prisma.catalogProduct.deleteMany({ where: { companyId: ASP } }),
    prisma.catalogCategory.deleteMany({ where: { companyId: ASP } }),
    prisma.timeEntry.deleteMany({ where: { companyId: ASP } }),
    prisma.invoiceLine.deleteMany({ where: { invoice: { companyId: ASP } } }),
    prisma.invoice.deleteMany({ where: { companyId: ASP } }),
    prisma.planningSlot.deleteMany({ where: { companyId: ASP } }),
    prisma.teamPlanningSlot.deleteMany({ where: { week: { companyId: ASP } } }),
    prisma.teamPlanningWeek.deleteMany({ where: { companyId: ASP } }),
    prisma.jobAssignment.deleteMany({ where: { job: { companyId: ASP } } }),
    prisma.workshopItem.deleteMany({ where: { companyId: ASP } }),
    prisma.purchaseLine.deleteMany({ where: { purchase: { companyId: ASP } } }),
    prisma.purchaseOrder.deleteMany({ where: { companyId: ASP } }),
    prisma.job.deleteMany({ where: { companyId: ASP } }),
    prisma.quoteLine.deleteMany({ where: { quote: { companyId: ASP } } }),
    prisma.quote.deleteMany({ where: { companyId: ASP } }),
    prisma.client.deleteMany({ where: { companyId: ASP } }),
    prisma.teamMember.deleteMany({ where: { team: { companyId: ASP } } }),
    prisma.team.deleteMany({ where: { companyId: ASP } }),
    prisma.hrDocument.deleteMany({ where: { user: { companyId: ASP } } }),
    prisma.refreshToken.deleteMany({ where: { user: { companyId: ASP } } }),
    prisma.user.deleteMany({ where: { companyId: ASP } }),
    prisma.supplier.deleteMany({ where: { companyId: ASP } }),
  ]);
  console.log('  ✓ Nettoyage OK');

  // ─── 1. COMPANY ────────────────────────────────────────────────────────────
  await prisma.company.upsert({
    where: { id: ASP },
    update: {},
    create: { id: ASP, code: 'ASP', name: 'ASP SIGNALISATION' },
  });

  // ─── 2. USERS (12) ─────────────────────────────────────────────────────────
  await prisma.user.createMany({
    data: [
      { id: U.admin1, email: 'admin@asp-signalisation.fr',       passwordHash: hash, name: 'Marie DUPONT',     role: 'admin',       companyId: ASP },
      { id: U.admin2, email: 'cond@asp-signalisation.fr',        passwordHash: hash, name: 'Thomas MARTIN',    role: 'conducteur',  companyId: ASP },
      { id: U.t1,     email: 'karim.benali@asp-signalisation.fr',passwordHash: hash, name: 'Karim BENALI',     role: 'technicien',  companyId: ASP },
      { id: U.t2,     email: 'lucas.bernard@asp-signalisation.fr',passwordHash: hash, name: 'Lucas BERNARD',   role: 'technicien',  companyId: ASP },
      { id: U.t3,     email: 'samir.hamdi@asp-signalisation.fr', passwordHash: hash, name: 'Samir HAMDI',      role: 'technicien',  companyId: ASP },
      { id: U.t4,     email: 'remi.dupuis@asp-signalisation.fr', passwordHash: hash, name: 'Rémi DUPUIS',      role: 'technicien',  companyId: ASP },
      { id: U.t5,     email: 'julien.faure@asp-signalisation.fr',passwordHash: hash, name: 'Julien FAURE',     role: 'technicien',  companyId: ASP },
      { id: U.t6,     email: 'axel.morel@asp-signalisation.fr',  passwordHash: hash, name: 'Axel MOREL',       role: 'technicien',  companyId: ASP },
      { id: U.t7,     email: 'nabil.cherif@asp-signalisation.fr',passwordHash: hash, name: 'Nabil CHERIF',     role: 'technicien',  companyId: ASP },
      { id: U.t8,     email: 'pierre.girard@asp-signalisation.fr',passwordHash: hash, name: 'Pierre GIRARD',   role: 'technicien',  companyId: ASP },
      { id: U.t9,     email: 'hugo.leroy@asp-signalisation.fr',  passwordHash: hash, name: 'Hugo LEROY',       role: 'technicien',  companyId: ASP },
      { id: U.t10,    email: 'mehdi.aouad@asp-signalisation.fr', passwordHash: hash, name: 'Mehdi AOUAD',      role: 'technicien',  companyId: ASP },
    ],
  });

  // ─── 3. ÉQUIPES (5) ────────────────────────────────────────────────────────
  const teamNames: Record<string, string> = {
    [TEAMS.a]: 'Équipe A — Voirie (Karim & Lucas)',
    [TEAMS.b]: 'Équipe B — Signalisation (Samir & Rémi)',
    [TEAMS.c]: 'Équipe C — Marquage (Julien & Axel)',
    [TEAMS.d]: 'Équipe D — Balisage (Nabil & Pierre)',
    [TEAMS.e]: 'Équipe E — Pose (Hugo & Mehdi)',
  };
  for (const [teamId, memberIds] of Object.entries(teamMembers)) {
    await prisma.team.create({
      data: {
        id: teamId, name: teamNames[teamId], companyId: ASP,
        members: { create: memberIds.map(userId => ({ userId })) },
      },
    });
  }
  console.log('  ✓ 5 équipes terrain créées');

  // ─── 4. CLIENTS ────────────────────────────────────────────────────────────
  await prisma.client.createMany({
    data: [
      { id: C.mairie,      name: 'Mairie de Lyon',            contact: 'Jean-Luc FAURE',   email: 'jl.faure@mairie-lyon.fr',         phone: '04 72 10 30 00', address: '1 Place de la Comédie',         city: 'Lyon',                type: 'public',  companyId: ASP },
      { id: C.grandlyon,   name: 'Métropole Grand Lyon',      contact: 'Sophie RENARD',    email: 'srenard@grandlyon.fr',            phone: '04 26 99 10 20', address: '20 Rue du Lac',                 city: 'Lyon',                type: 'public',  companyId: ASP },
      { id: C.rhone,       name: 'Département du Rhône',      contact: 'Pierre MOREL',     email: 'pmorel@rhone.fr',                 phone: '04 72 61 60 00', address: '2 Rue de la Préfecture',        city: 'Lyon',                type: 'public',  companyId: ASP },
      { id: C.dir,         name: 'DIR Centre-Est',            contact: 'Stéphane LAROUTE', email: 'dir-ce@ddtm.gouv.fr',            phone: '04 74 27 52 00', address: '21 Rue Jean Moulin',            city: 'Bron',                type: 'public',  companyId: ASP },
      { id: C.colas,       name: 'Colas Rhône-Alpes',         contact: 'Bernard JAUNE',    email: 'bjaune@colas.fr',                 phone: '04 72 81 64 64', address: '12 Rue de la Villette',         city: 'Lyon',                type: 'private', companyId: ASP },
      { id: C.eiffage,     name: 'Eiffage Route RA',          contact: 'Gilles DUBOIS',    email: 'gdubois@eiffage.fr',              phone: '04 72 23 44 00', address: '4 allée Irène Joliot-Curie',    city: 'Genas',               type: 'private', companyId: ASP },
      { id: C.eurovia,     name: 'Eurovia Rhône-Alpes',       contact: 'Patrick VALLET',   email: 'pvallet@eurovia.com',             phone: '04 74 90 00 20', address: 'ZI de la Plaine, Route de Lyon', city: 'Décines-Charpieu',    type: 'private', companyId: ASP },
      { id: C.villefranche,name: 'CA Villefranche-sur-Saône', contact: 'Isabelle MARCHAL', email: 'imarchal@villefranchecondrieu.fr',phone: '04 74 68 91 00', address: '1050 Chemin de la Madeleine', city: 'Villefranche-sur-Saône',type: 'public',  companyId: ASP },
      { id: C.bourg,       name: 'CA Bourg-en-Bresse',        contact: 'Denis PERRET',     email: 'dperret@cabourg.fr',              phone: '04 74 45 41 00', address: '3 Avenue Alsace-Lorraine',      city: 'Bourg-en-Bresse',     type: 'public',  companyId: ASP },
      { id: C.vienne,      name: 'Vienne Condrieu Agglo',     contact: 'Anne RICHARD',     email: 'arichard@vienne-condrieu.fr',     phone: '04 74 78 87 87', address: '2 Cours Romestang',             city: 'Vienne',              type: 'public',  companyId: ASP },
    ],
  });

  // ─── 5. CATALOGUE ──────────────────────────────────────────────────────────
  const cat1 = await prisma.catalogCategory.create({ data: { id: createId(), name: 'Signalisation verticale', sortOrder: 1, companyId: ASP } });
  const cat2 = await prisma.catalogCategory.create({ data: { id: createId(), name: 'Marquage au sol',         sortOrder: 2, companyId: ASP } });
  const cat3 = await prisma.catalogCategory.create({ data: { id: createId(), name: 'Balisage de chantier',   sortOrder: 3, companyId: ASP } });
  const cat4 = await prisma.catalogCategory.create({ data: { id: createId(), name: 'Mobilier de sécurité',   sortOrder: 4, companyId: ASP } });
  const cat5 = await prisma.catalogCategory.create({ data: { id: createId(), name: 'Main d\'œuvre',          sortOrder: 5, companyId: ASP } });

  await prisma.catalogProduct.createMany({
    data: [
      { id: createId(), reference: 'SIG-B1-500',    designation: 'Panneau type B1 Ø500mm + mât Ø60',      unit: 'u',       salePrice: 235,  costPrice: 128, lineType: 'purchase', categoryId: cat1.id, companyId: ASP },
      { id: createId(), reference: 'SIG-CE-800',    designation: 'Panneau type CE (cédez le passage)',     unit: 'u',       salePrice: 298,  costPrice: 162, lineType: 'purchase', categoryId: cat1.id, companyId: ASP },
      { id: createId(), reference: 'SIG-DP-A0',     designation: 'Panneau directionnel alucobond A0',     unit: 'u',       salePrice: 185,  costPrice: 95,  lineType: 'workshop', categoryId: cat1.id, companyId: ASP },
      { id: createId(), reference: 'SIG-PMR-LOT',   designation: 'Panneau + marquage place PMR complète', unit: 'u',       salePrice: 145,  costPrice: 72,  lineType: 'service',  categoryId: cat1.id, companyId: ASP },
      { id: createId(), reference: 'MAR-AXE-ML',    designation: 'Marquage axial peinture thermoplastique', unit: 'ml',      salePrice: 6.5,  costPrice: 2.8, lineType: 'service',  categoryId: cat2.id, companyId: ASP },
      { id: createId(), reference: 'MAR-TRANS-U',   designation: 'Marquage transversal (stop, cédez)',    unit: 'u',       salePrice: 480,  costPrice: 195, lineType: 'service',  categoryId: cat2.id, companyId: ASP },
      { id: createId(), reference: 'MAR-CHEMI-M2',  designation: 'Cheminement piéton résine m²',          unit: 'm²',      salePrice: 48,   costPrice: 19,  lineType: 'service',  categoryId: cat2.id, companyId: ASP },
      { id: createId(), reference: 'BAL-CONE-K1',   designation: 'Cône K1 Ø600mm (location/semaine)',     unit: 'sem.',    salePrice: 3.5,  costPrice: 0.8, lineType: 'service',  categoryId: cat3.id, companyId: ASP },
      { id: createId(), reference: 'BAL-GBA-ML',    designation: 'Glissière béton armé GBA (location/ml)', unit: 'ml',      salePrice: 18,   costPrice: 7,   lineType: 'purchase', categoryId: cat3.id, companyId: ASP },
      { id: createId(), reference: 'BAL-ATTER-U',   designation: 'Atténuateur de choc TL-100 (loc./j)',   unit: 'j',       salePrice: 280,  costPrice: 120, lineType: 'purchase', categoryId: cat3.id, companyId: ASP },
      { id: createId(), reference: 'BAL-FLASH-U',   designation: 'Feu flash K5 autonome (loc./sem.)',     unit: 'sem.',    salePrice: 22,   costPrice: 9,   lineType: 'purchase', categoryId: cat3.id, companyId: ASP },
      { id: createId(), reference: 'MOB-GRP-U',     designation: 'Glissière de protection route (GBA)',   unit: 'ml',      salePrice: 42,   costPrice: 22,  lineType: 'purchase', categoryId: cat4.id, companyId: ASP },
      { id: createId(), reference: 'MO-TECH-H',     designation: 'Main d\'œuvre technicien / heure',      unit: 'h',       salePrice: 52,   costPrice: 30,  lineType: 'service',  categoryId: cat5.id, companyId: ASP },
      { id: createId(), reference: 'MO-FORFAIT',    designation: 'Forfait pose signalisation verticale',  unit: 'forfait', salePrice: 280,  costPrice: 155, lineType: 'service',  categoryId: cat5.id, companyId: ASP },
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

    const qRef = `ASP-DV${year}-${String(month).padStart(2,'0')}-${String(qSeq).padStart(3,'0')}`;
    const jRef = `CHT-ASP-${year}-${String(jSeq).padStart(3,'0')}`;
    const iRef = `ASP-FA${String(year).slice(2)}${String(iSeq).padStart(4,'0')}`;

    const quoteId = `q_asp_${year}_${month}_${qSeq}`;
    const jobId   = `j_asp_${year}_${month}_${jSeq}`;
    const invId   = `i_asp_${year}_${month}_${jSeq}`;

    const isInProgress = IN_PROGRESS_TITLES.has(title);
    const isPlanned    = PLANNED_TITLES.has(title);
    const isOverdue    = OVERDUE_TITLES.has(title);
    const isDone       = !isInProgress && !isPlanned;

    const startDay = ((jSeq % 20) * 1) + 1;
    const startDate = d(year, month, Math.min(startDay, 24));
    const endDate   = isDone ? addDays(startDate, durationDays) : null;

    const jobStatus: JobStatus = isInProgress ? 'in_progress' : isPlanned ? 'planned' : 'invoiced';
    const progress = isInProgress ? 60 : isPlanned ? 0 : 100;

    const inv1 = Math.round(amount * 0.65);
    const inv2 = amount - inv1;
    await prisma.quote.create({
      data: {
        id: quoteId, reference: qRef, subject: title,
        amount, status: isPlanned ? 'sent' : 'accepted',
        validUntil: addDays(startDate, 30),
        clientId, companyId: ASP,
        lines: { create: [
          { id: createId(), designation: title,                           unit: 'forfait', quantity: 1, unitPrice: inv1, vatRate: 20, sortOrder: 1 },
          { id: createId(), designation: 'Main d\'œuvre et déplacements', unit: 'forfait', quantity: 1, unitPrice: inv2, vatRate: 20, sortOrder: 2 },
        ]},
      },
    });

    await prisma.job.create({
      data: {
        id: jobId, reference: jRef, title, address, status: jobStatus,
        startDate, endDate: endDate ?? undefined, progress,
        quoteId, clientId, companyId: ASP,
        assignments: { create: techIds.map(userId => ({ userId })) },
      },
    });

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
              userId, jobId, companyId: ASP,
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
          dueDate: isOverdue ? d(2026,3,20) : dueDate,
          paidAt,
          clientId, companyId: ASP,
          lines: { create: [
            { id: createId(), designation: title, unit: 'forfait', quantity: 1, unitPrice: invAmt, vatRate: 20, sortOrder: 1 },
          ]},
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
      id: 'q_asp_pipe1', reference: 'ASP-DV2026-04-901',
      subject: 'Signalisation Voies Lyonnaises 3 & 6 — Métropole GL',
      amount: 68400, status: 'sent', validUntil: d(2026,5,20),
      clientId: C.grandlyon, companyId: ASP,
      lines: { create: [
        { id: createId(), designation: 'Signalisation verticale VL3 & VL6 (panneaux + mâts)', unit: 'forfait', quantity: 1, unitPrice: 42000, vatRate: 20, sortOrder: 1 },
        { id: createId(), designation: 'Marquage au sol + pose',                                unit: 'forfait', quantity: 1, unitPrice: 26400, vatRate: 20, sortOrder: 2 },
      ]},
    },
  });
  await prisma.quote.create({
    data: {
      id: 'q_asp_pipe2', reference: 'ASP-DV2026-04-902',
      subject: 'Balisage longue durée A7 Ternay — tranche 2',
      amount: 54200, status: 'sent', validUntil: d(2026,5,31),
      clientId: C.dir, companyId: ASP,
      lines: { create: [
        { id: createId(), designation: 'Balisage longue durée lot 2 (GBA + signalétique)', unit: 'forfait', quantity: 1, unitPrice: 36000, vatRate: 20, sortOrder: 1 },
        { id: createId(), designation: 'Maintien et entretien dispositifs',                 unit: 'forfait', quantity: 1, unitPrice: 18200, vatRate: 20, sortOrder: 2 },
      ]},
    },
  });
  await prisma.quote.create({
    data: {
      id: 'q_asp_pipe3', reference: 'ASP-DV2026-04-903',
      subject: 'Signalisation directionnelle Bourg-en-Bresse Nord — lot 3',
      amount: 38800, status: 'draft', validUntil: d(2026,5,28),
      clientId: C.bourg, companyId: ASP,
      lines: { create: [
        { id: createId(), designation: 'Panneaux directionnels D42 + implantation', unit: 'forfait', quantity: 1, unitPrice: 24000, vatRate: 20, sortOrder: 1 },
        { id: createId(), designation: 'Main d\'œuvre pose et géoréférencement',    unit: 'forfait', quantity: 1, unitPrice: 14800, vatRate: 20, sortOrder: 2 },
      ]},
    },
  });
  console.log('  ✓ Pipeline : 3 devis en cours (161k€)');

  // ─── 8. ATELIER (3 ordres de fabrication) ──────────────────────────────────
  const a7Job = await prisma.job.findFirst({ where: { title: { contains: 'A7 éch. Ternay' }, companyId: ASP } });
  const a432Job = await prisma.job.findFirst({ where: { title: { contains: 'A432 — phase 3' }, companyId: ASP } });
  const beaujolaisJob = await prisma.job.findFirst({ where: { title: { contains: 'Beaujolais Vert' }, companyId: ASP } });

  if (a7Job) {
    await prisma.workshopItem.create({
      data: {
        id: createId(), reference: 'ATL-ASP-2026-001',
        title: 'Panneaux KC1 + KD11 balisage A7 Ternay — fabrication',
        description: '18 panneaux alucobond 3mm impression numérique UV — visuels DIR Centre-Est',
        status: 'fabrication' as WorkshopStatus, priority: 'high' as WorkshopPriority,
        dueDate: d(2026,4,25), assignedTo: 'Julien FAURE',
        jobId: a7Job.id, companyId: ASP,
      },
    });
  }
  if (a432Job) {
    await prisma.workshopItem.create({
      data: {
        id: createId(), reference: 'ATL-ASP-2026-002',
        title: 'Panneaux signalisation directionnelle A432 phase 3',
        description: '12 panneaux alu composite + 8 mâts Ø76 — livraison chantier lundi',
        status: 'bat_pending' as WorkshopStatus, priority: 'high' as WorkshopPriority,
        dueDate: d(2026,4,28), assignedTo: 'Axel MOREL',
        jobId: a432Job.id, companyId: ASP,
      },
    });
  }
  if (beaujolaisJob) {
    await prisma.workshopItem.create({
      data: {
        id: createId(), reference: 'ATL-ASP-2026-003',
        title: 'Totem signalétique Beaujolais Vert — retouches couleurs',
        description: 'Retouches impression 4 totems couleurs Beaujolais Vert, vernis mat',
        status: 'ready' as WorkshopStatus, priority: 'medium' as WorkshopPriority,
        dueDate: d(2026,4,23), assignedTo: 'Mehdi AOUAD',
        jobId: beaujolaisJob.id, companyId: ASP,
      },
    });
  }
  console.log('  ✓ Atelier : 3 ordres de fabrication');

  // ─── 9. PLANNING SEMAINE EN COURS ──────────────────────────────────────────
  const week = await prisma.teamPlanningWeek.create({
    data: {
      id: 'w_asp_demo', weekStart: d(2026,4,20),
      status: TeamPlanningStatus.draft, version: 1,
      companyId: ASP,
    },
  });

  if (a7Job && a432Job) {
    await prisma.teamPlanningSlot.createMany({
      data: [
        { weekId: week.id, teamId: TEAMS.b, date: d(2026,4,21), startHour: 6, endHour: 14, jobId: a7Job.id, notes: 'Mise en place GBA lot 1 — travaux nuit prévue jeudi' },
        { weekId: week.id, teamId: TEAMS.b, date: d(2026,4,22), startHour: 6, endHour: 14, jobId: a7Job.id },
        { weekId: week.id, teamId: TEAMS.b, date: d(2026,4,23), startHour: 6, endHour: 14, jobId: a7Job.id },
        { weekId: week.id, teamId: TEAMS.b, date: d(2026,4,24), startHour: 21,endHour: 5,  jobId: a7Job.id, notes: 'Intervention nuit — fermeture voie D' },
        { weekId: week.id, teamId: TEAMS.d, date: d(2026,4,21), startHour: 7, endHour: 17, jobId: a432Job.id, notes: 'Pose signalisation provisoire — phase 3 ouverture' },
        { weekId: week.id, teamId: TEAMS.d, date: d(2026,4,22), startHour: 7, endHour: 17, jobId: a432Job.id },
        { weekId: week.id, teamId: TEAMS.d, date: d(2026,4,23), startHour: 7, endHour: 17, jobId: a432Job.id },
      ],
    });
  }
  console.log('  ✓ Planning semaine en cours');

  // ─── 10. PLANNING HISTORIQUE (11 semaines passées, 1 par mois) ─────────────
  const historicalMonths = [
    { id: 'w_asp_2025_05', weekStart: d(2025,5,5),  year: 2025, month: 5  },
    { id: 'w_asp_2025_06', weekStart: d(2025,6,2),  year: 2025, month: 6  },
    { id: 'w_asp_2025_07', weekStart: d(2025,7,7),  year: 2025, month: 7  },
    { id: 'w_asp_2025_08', weekStart: d(2025,8,4),  year: 2025, month: 8  },
    { id: 'w_asp_2025_09', weekStart: d(2025,9,1),  year: 2025, month: 9  },
    { id: 'w_asp_2025_10', weekStart: d(2025,10,6), year: 2025, month: 10 },
    { id: 'w_asp_2025_11', weekStart: d(2025,11,3), year: 2025, month: 11 },
    { id: 'w_asp_2025_12', weekStart: d(2025,12,1), year: 2025, month: 12 },
    { id: 'w_asp_2026_01', weekStart: d(2026,1,5),  year: 2026, month: 1  },
    { id: 'w_asp_2026_02', weekStart: d(2026,2,2),  year: 2026, month: 2  },
    { id: 'w_asp_2026_03', weekStart: d(2026,3,2),  year: 2026, month: 3  },
  ];

  for (const { id, weekStart, year, month } of historicalMonths) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear  = month === 12 ? year + 1 : year;
    const hw = await prisma.teamPlanningWeek.create({
      data: { id, weekStart, status: TeamPlanningStatus.locked, version: 1, companyId: ASP },
    });
    const tSlots: any[] = [];
    const pSlots: any[] = [];
    for (const [, teamId] of Object.entries(TEAMS)) {
      const members = teamMembers[teamId];
      const job = await prisma.job.findFirst({
        where: {
          companyId: ASP,
          startDate: { gte: d(year, month, 1), lt: d(nextYear, nextMonth, 1) },
          assignments: { some: { userId: members[0] } },
        },
      });
      if (!job) continue;
      for (let i = 0; i < 5; i++) {
        const date = addDays(weekStart, i);
        tSlots.push({ weekId: hw.id, teamId, date, startHour: 7, endHour: 17, jobId: job.id });
        for (const userId of members) {
          pSlots.push({ id: createId(), date, userId, jobId: job.id, companyId: ASP });
        }
      }
    }
    if (tSlots.length > 0) await prisma.teamPlanningSlot.createMany({ data: tSlots });
    if (pSlots.length > 0) await prisma.planningSlot.createMany({ data: pSlots });
  }

  // PlanningSlot semaine en cours — A7 et A432
  if (a7Job && a432Job) {
    const pSlotsApril: any[] = [];
    for (let i = 0; i < 4; i++) {
      const date = addDays(d(2026,4,21), i);
      for (const uid of teamMembers[TEAMS.b]) {
        pSlotsApril.push({ id: createId(), date, userId: uid, jobId: a7Job.id, companyId: ASP });
      }
      for (const uid of teamMembers[TEAMS.d]) {
        pSlotsApril.push({ id: createId(), date, userId: uid, jobId: a432Job.id, companyId: ASP });
      }
    }
    if (pSlotsApril.length > 0) await prisma.planningSlot.createMany({ data: pSlotsApril });
  }
  console.log('  ✓ Planning historique : 11 semaines + PlanningSlots');

  // ─── RÉCAP ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('✅ SEED 12 MOIS v1 — ASP SIGNALISATION');
  console.log(`  Chantiers            : ${CHANTIERS.length} sur 12 mois (~11/mois)`);
  console.log(`  CA total facturé     : ${(totalInvoiced/1000).toFixed(0)}k€`);
  console.log(`  Équipes terrain      : 5 (10 techniciens)`);
  console.log(`  Pipeline devis       : 3 en cours — 161k€`);
  console.log('');
  console.log('  ⚠️  FACTURES EN RETARD :');
  OVERDUE_TITLES.forEach(t => console.log(`    • ${t}`));
  console.log('');
  console.log('  Connexion admin     : admin@asp-signalisation.fr        /  Demo1234!');
  console.log('  Connexion conducteur: cond@asp-signalisation.fr         /  Demo1234!');
  console.log('  Connexion tech      : karim.benali@asp-signalisation.fr /  Demo1234!');
  console.log('  Connexion tech      : lucas.bernard@asp-signalisation.fr/  Demo1234!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
