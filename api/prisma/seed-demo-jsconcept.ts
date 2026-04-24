/**
 * SEED DÉMO — JS CONCEPT (données réelles)
 * ─────────────────────────────────────────
 * Clients, chantiers, devis et factures basés sur les vrais documents.
 * 2 factures en retard → le briefing IA affiche l'alerte dès l'ouverture.
 *
 * Usage :
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-demo-jsconcept.ts
 *
 * Ce script ne touche QUE les données co_js (JS CONCEPT).
 * Les données co_asp (ASP SIGNALISATION) sont conservées telles quelles.
 */

import {
  PrismaClient,
  TeamPlanningStatus,
  TimeEntryStatus,
  WorkshopStatus,
  WorkshopPriority,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed DÉMO — JS CONCEPT (données réelles)...');

  const hash = bcrypt.hashSync('Demo1234!', 10);
  const JS = 'co_js';

  // ─── 0. CLEANUP JS uniquement ────────────────────────────────────────────
  // Suppression dans l'ordre inverse des dépendances
  await prisma.$transaction([
    prisma.catalogProduct.deleteMany({ where: { companyId: JS } }),
    prisma.catalogCategory.deleteMany({ where: { companyId: JS } }),
    prisma.auditLog.deleteMany({ where: { companyId: JS } }),
    prisma.activityLog.deleteMany({ where: { companyId: JS } }),
    prisma.hrDocument.deleteMany({ where: { companyId: JS } }),
    prisma.timeEntry.deleteMany({ where: { companyId: JS } }),
    prisma.invoice.deleteMany({ where: { companyId: JS } }),
    prisma.planningSlot.deleteMany({ where: { companyId: JS } }),
    prisma.teamPlanningSlot.deleteMany({
      where: { week: { companyId: JS } },
    }),
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
    prisma.refreshToken.deleteMany({ where: { user: { companyId: JS } } }),
    prisma.user.deleteMany({ where: { companyId: JS } }),
    prisma.supplier.deleteMany({ where: { companyId: JS } }),
  ]);

  // ─── 1. USERS — vrais contacts JS Concept ────────────────────────────────
  await prisma.user.createMany({
    data: [
      // Gérant / commercial — compte démo admin
      {
        id: 'u_js_esauron',
        email: 'e.sauron@js-concept.fr',
        passwordHash: hash,
        name: 'Emmanuel SAURON',
        role: 'admin',
        companyId: JS,
      },
      // Administrative
      {
        id: 'u_js_bfaure',
        email: 'b.faure@js-concept.fr',
        passwordHash: hash,
        name: 'Blandine FAURE',
        role: 'conducteur',
        companyId: JS,
      },
      // Techniciens terrain (noms plausibles secteur Loire)
      { id: 'u_js_tech01', email: 'yann.leblanc@js-concept.fr',    passwordHash: hash, name: 'Yann LEBLANC',    role: 'technicien', companyId: JS },
      { id: 'u_js_tech02', email: 'thomas.garcia@js-concept.fr',   passwordHash: hash, name: 'Thomas GARCIA',   role: 'technicien', companyId: JS },
      { id: 'u_js_tech03', email: 'julien.moulin@js-concept.fr',   passwordHash: hash, name: 'Julien MOULIN',   role: 'technicien', companyId: JS },
      { id: 'u_js_tech04', email: 'kevin.henry@js-concept.fr',     passwordHash: hash, name: 'Kévin HENRY',     role: 'technicien', companyId: JS },
      { id: 'u_js_tech05', email: 'romain.perrin@js-concept.fr',   passwordHash: hash, name: 'Romain PERRIN',   role: 'technicien', companyId: JS },
    ],
  });

  // ─── 2. ÉQUIPES ───────────────────────────────────────────────────────────
  await prisma.team.createMany({
    data: [
      { id: 't_js_signa',   name: 'Équipe Signalétique',    isActive: true, companyId: JS },
      { id: 't_js_marquage', name: 'Équipe Marquage',       isActive: true, companyId: JS },
      { id: 't_js_mobilier', name: 'Équipe Mobilier Urbain', isActive: true, companyId: JS },
    ],
  });

  const from = new Date('2026-01-06');
  await prisma.teamMember.createMany({
    data: [
      { teamId: 't_js_signa',    userId: 'u_js_tech01', roleInTeam: 'chef', activeFrom: from },
      { teamId: 't_js_signa',    userId: 'u_js_tech02', roleInTeam: null,   activeFrom: from },
      { teamId: 't_js_marquage', userId: 'u_js_tech03', roleInTeam: 'chef', activeFrom: from },
      { teamId: 't_js_marquage', userId: 'u_js_tech04', roleInTeam: null,   activeFrom: from },
      { teamId: 't_js_mobilier', userId: 'u_js_tech05', roleInTeam: null,   activeFrom: from },
    ],
  });

  // ─── 3. CLIENTS (vrais clients JS Concept) ────────────────────────────────
  await prisma.client.createMany({
    data: [
      // Client principal — sous-traitance autoliquidation
      {
        id: 'cl_js_malia',
        name: 'MALIA TP',
        contact: 'Service facturation',
        email: 'factures@maliatp.fr',
        phone: '',
        address: '880 Chemin de Laprat Le crouzet',
        city: 'Saint-Didier-en-Velay',
        type: 'private',
        companyId: JS,
      },
      // Collectivité majeure — Marché 2024
      {
        id: 'cl_js_sem',
        name: 'Saint-Etienne Métropole',
        contact: 'Blandine FAURE',
        email: 'contact@js-concept.fr',
        phone: '04 77 49 73 73',
        address: 'DACT Territoire Plaine, 2 Bis Bd Pasteur',
        city: 'Andrézieux-Bouthéon',
        type: 'public',
        companyId: JS,
      },
      // Sous-traitance — chantier Feurs
      {
        id: 'cl_js_ineo',
        name: 'INEO Rhône-Alpes Auvergne',
        contact: 'Emmanuel SAURON',
        email: 'e.sauron@js-concept.fr',
        phone: '',
        address: '873 Rue de la Peronnière',
        city: 'La Grand-Croix',
        type: 'private',
        companyId: JS,
      },
      // Opérateur télécom
      {
        id: 'cl_js_orange',
        name: 'ORANGE SA',
        contact: 'Service travaux',
        email: 'travaux.roanne@orange.com',
        phone: '',
        address: 'Chantier Rue Macé',
        city: 'Roanne',
        type: 'private',
        companyId: JS,
      },
      // BTP — chantier Villefontaine
      {
        id: 'cl_js_brunet',
        name: 'BRUNET TP',
        contact: 'Responsable chantier',
        email: 'chantier@brunettp.fr',
        phone: '',
        address: 'ZI Villefontaine',
        city: 'Villefontaine',
        type: 'private',
        companyId: JS,
      },
      // Collectivité — Signalétique touristique
      {
        id: 'cl_js_mezenc',
        name: 'CC Mézenc-Meygal',
        contact: 'Service technique',
        email: 'technique@mezenc-meygal.fr',
        phone: '',
        address: '',
        city: 'Le Monastier-sur-Gazeille',
        type: 'public',
        companyId: JS,
      },
    ],
  });

  // ─── 4. FOURNISSEURS ──────────────────────────────────────────────────────
  await prisma.supplier.createMany({
    data: [
      {
        id: 'sup_js_sineu',
        name: 'Sineu Graff — Mobilier Urbain',
        contact: 'Olivier SAUNIER',
        email: 'osaunier@sineugraff.com',
        phone: '06 77 04 55 59',
        category: 'mobilier_urbain',
        companyId: JS,
      },
      {
        id: 'sup_js_girod',
        name: 'Signaux GIROD',
        contact: 'Service commercial',
        email: 'commercial@signaux-girod.fr',
        phone: '04 74 65 23 00',
        category: 'signalisation',
        companyId: JS,
      },
      {
        id: 'sup_js_rubafix',
        name: 'Rubafix Marquage',
        contact: 'Direction commerciale',
        email: 'vente@rubafix.fr',
        phone: '04 72 33 18 42',
        category: 'marquage',
        companyId: JS,
      },
    ],
  });

  // ─── 5. CATALOGUE (produits réels JS Concept) ─────────────────────────────
  await prisma.catalogCategory.createMany({
    data: [
      { id: 'cat_js_marquage', name: 'Marquage routier',       sortOrder: 1, companyId: JS },
      { id: 'cat_js_signa',    name: 'Signalétique',           sortOrder: 2, companyId: JS },
      { id: 'cat_js_mobilier', name: 'Mobilier urbain',        sortOrder: 3, companyId: JS },
      { id: 'cat_js_prestation', name: 'Prestations / Main-d\'œuvre', sortOrder: 4, companyId: JS },
    ],
  });

  await prisma.catalogProduct.createMany({
    data: [
      // Marquage (tarifs réels issus devis DE20260205)
      { reference: 'MRQ-PMR',    designation: 'Marquage cheminement PMR — bande blanche 10cm + logos piétons', unit: 'forfait', salePrice: 85,   costPrice: 45,  lineType: 'service', categoryId: 'cat_js_marquage', companyId: JS },
      { reference: 'MRQ-CROIX',  designation: 'Croix peinture routière jaune devant portail',                  unit: 'forfait', salePrice: 120,  costPrice: 60,  lineType: 'service', categoryId: 'cat_js_marquage', companyId: JS },
      { reference: 'MRQ-PARK',   designation: 'Marquage places parking (~18 places) peinture blanche 10cm',    unit: 'forfait', salePrice: 300,  costPrice: 150, lineType: 'service', categoryId: 'cat_js_marquage', companyId: JS },
      { reference: 'MRQ-DIVERS', designation: 'Marquages divers : PL/VL, fléchage, places ELEC',               unit: 'forfait', salePrice: 180,  costPrice: 90,  lineType: 'service', categoryId: 'cat_js_marquage', companyId: JS },
      // Signalétique (tarifs réels)
      { reference: 'SIG-PANEL',  designation: 'Panneau alu composite 400×320mm + mât 80×40mm + Plastobloc',    unit: 'unité',   salePrice: 96,   costPrice: 52,  lineType: 'workshop', categoryId: 'cat_js_signa', companyId: JS },
      { reference: 'SIG-SPEC',   designation: 'Panneau spécifique sur mesure + mât + bride (ex: Aire retournement)', unit: 'unité', salePrice: 210, costPrice: 110, lineType: 'workshop', categoryId: 'cat_js_signa', companyId: JS },
      { reference: 'SIG-CARTEL', designation: 'Cartel pédagogique — pied châtaignier + alucobond usiné + pose', unit: 'unité',   salePrice: 300,  costPrice: 160, lineType: 'workshop', categoryId: 'cat_js_signa', companyId: JS },
      { reference: 'SIG-RAIL',   designation: 'Rail de guidage pépite "ocre"',                                  unit: 'ml',      salePrice: 15,   costPrice: 8,   lineType: 'purchase', categoryId: 'cat_js_signa', companyId: JS },
      // Mobilier urbain (tarifs réels FA260069)
      { reference: 'MOB-TABLE',  designation: 'Table pique-nique — fourniture et pose',                         unit: 'unité',   salePrice: 720,  costPrice: 400, lineType: 'purchase', categoryId: 'cat_js_mobilier', companyId: JS },
      { reference: 'MOB-POUB',   designation: 'Corbeille de propreté — fourniture et pose',                    unit: 'unité',   salePrice: 566,  costPrice: 300, lineType: 'purchase', categoryId: 'cat_js_mobilier', companyId: JS },
      { reference: 'MOB-BASKET', designation: 'Panier de basket — fourniture et pose',                          unit: 'unité',   salePrice: 1310, costPrice: 700, lineType: 'purchase', categoryId: 'cat_js_mobilier', companyId: JS },
      { reference: 'MOB-FOOT',   designation: 'Cage de foot — fourniture et pose',                              unit: 'unité',   salePrice: 1930, costPrice: 1050, lineType: 'purchase', categoryId: 'cat_js_mobilier', companyId: JS },
      { reference: 'MOB-JARD',   designation: 'Jardinière potager bois pin CL4, 2×1,5×0,4m, fabrication',      unit: 'unité',   salePrice: 1600, costPrice: 850, lineType: 'service', categoryId: 'cat_js_mobilier', companyId: JS },
      { reference: 'MOB-MUR',    designation: 'Mur d\'expression extérieur 1,2×2m — tableau craie + structure pin CL4', unit: 'unité', salePrice: 970, costPrice: 520, lineType: 'service', categoryId: 'cat_js_mobilier', companyId: JS },
      { reference: 'MOB-TMSPORT', designation: 'Terrain multi-sport — fournitures et installation',             unit: 'forfait', salePrice: 500,  costPrice: 280, lineType: 'service', categoryId: 'cat_js_mobilier', companyId: JS },
      // Maintenance (tarifs Saint-Etienne Métropole)
      { reference: 'MAINT-VITRES', designation: 'Démontage soigné des vitres (abri voyageurs)',                 unit: 'unité',   salePrice: 38,   costPrice: 20,  lineType: 'service', categoryId: 'cat_js_prestation', companyId: JS },
      { reference: 'MAINT-DEP',   designation: 'Intervention dépannage simple (sans fournitures)',              unit: 'unité',   salePrice: 91,   costPrice: 50,  lineType: 'service', categoryId: 'cat_js_prestation', companyId: JS },
      { reference: 'MAINT-LAVAGE', designation: 'Lavage parois abri en verre ou polycarbonate',                 unit: 'unité',   salePrice: 27,   costPrice: 15,  lineType: 'service', categoryId: 'cat_js_prestation', companyId: JS },
      { reference: 'MAINT-REV',   designation: 'Révision de prix contractuelle',                                unit: 'unité',   salePrice: 1,    costPrice: 0,   lineType: 'service', categoryId: 'cat_js_prestation', companyId: JS },
    ],
  });

  // ─── 6. DEVIS (vrais références) ─────────────────────────────────────────
  await prisma.quote.createMany({
    data: [
      // Devis converti en chantier → FIRMINY Ecole du Mas (MALIA TP)
      {
        id: 'q_js_firminy',
        reference: 'DEV-JS-2026-068',
        subject: 'FIRMINY — Ecole du Mas (mobilier scolaire extérieur)',
        amount: 17824,
        status: 'accepted',
        validUntil: new Date('2026-03-31'),
        clientId: 'cl_js_malia',
        companyId: JS,
      },
      // Devis maintenance abri voyageurs → Saint-Etienne Métropole
      {
        id: 'q_js_sem_chapelle',
        reference: 'DE20250923',
        subject: 'ANDREZIEUX-BOUTHEON — La Chapelle (maintenance abri)',
        amount: 158.65,
        status: 'accepted',
        validUntil: new Date('2026-12-31'),
        clientId: 'cl_js_sem',
        companyId: JS,
      },
      // Devis en attente signature — INEO Feurs
      {
        id: 'q_js_feurs',
        reference: 'DE20260205',
        subject: 'FEURS — Marquage et signalétique (Equans)',
        amount: 1375,
        status: 'sent',
        validUntil: new Date('2026-04-30'),
        clientId: 'cl_js_ineo',
        companyId: JS,
      },
      // Devis en cours — Brunet TP Villefontaine
      {
        id: 'q_js_villefont',
        reference: 'DE20260253',
        subject: 'VILLEFONTAINE — Cellule commerciale (Brunet TP)',
        amount: 3200,
        status: 'sent',
        validUntil: new Date('2026-05-15'),
        clientId: 'cl_js_brunet',
        companyId: JS,
      },
      // Devis en cours — CC Mézenc-Meygal
      {
        id: 'q_js_mezenc',
        reference: 'DV264896',
        subject: 'MEZENC-MEYGAL — Signalétique pupitre "Volcans en liberté"',
        amount: 4800,
        status: 'draft',
        validUntil: new Date('2026-05-31'),
        clientId: 'cl_js_mezenc',
        companyId: JS,
      },
      // Devis ORANGE Roanne
      {
        id: 'q_js_orange',
        reference: 'DEV-JS-2026-103',
        subject: 'ROANNE — Chantier Rue Macé (ORANGE)',
        amount: 6450,
        status: 'accepted',
        validUntil: new Date('2026-03-15'),
        clientId: 'cl_js_orange',
        companyId: JS,
      },
    ],
  });

  // Lignes de devis (FIRMINY — données réelles FA260069)
  await prisma.quoteLine.createMany({
    data: [
      { quoteId: 'q_js_firminy', designation: 'Table à remettre en place',                            unit: 'unité',   quantity: 2,  unitPrice: 225,  costPrice: 120, sortOrder: 1 },
      { quoteId: 'q_js_firminy', designation: 'Table de pique-nique — fourniture et pose identique existante', unit: 'unité', quantity: 2, unitPrice: 720, costPrice: 400, sortOrder: 2 },
      { quoteId: 'q_js_firminy', designation: 'Poubelle — fourniture et pose corbeille de propreté',  unit: 'unité',   quantity: 4,  unitPrice: 566,  costPrice: 300, sortOrder: 3 },
      { quoteId: 'q_js_firminy', designation: 'Panier de basket — fourniture et pose',                unit: 'unité',   quantity: 2,  unitPrice: 1310, costPrice: 700, sortOrder: 4 },
      { quoteId: 'q_js_firminy', designation: 'Cage de foot — fourniture et pose',                    unit: 'unité',   quantity: 2,  unitPrice: 1930, costPrice: 1050, sortOrder: 5 },
      { quoteId: 'q_js_firminy', designation: 'Jardinière potager — pin CL4, 2m×1,5m×0,4m',          unit: 'unité',   quantity: 2,  unitPrice: 1600, costPrice: 850, sortOrder: 6 },
      { quoteId: 'q_js_firminy', designation: 'Cartel pédagogique — pied châtaignier + alucobond 6mm', unit: 'unité',  quantity: 6,  unitPrice: 300,  costPrice: 160, sortOrder: 7 },
      { quoteId: 'q_js_firminy', designation: 'Mur d\'expression extérieur 1,2×2m (tableau craie)', unit: 'unité',    quantity: 1,  unitPrice: 970,  costPrice: 520, sortOrder: 8 },
      { quoteId: 'q_js_firminy', designation: 'Rail de guidage pépite "ocre"',                        unit: 'ml',      quantity: 48, unitPrice: 15,   costPrice: 8,   sortOrder: 9 },
      { quoteId: 'q_js_firminy', designation: 'Terrain multi-sport',                                  unit: 'forfait', quantity: 1,  unitPrice: 500,  costPrice: 280, sortOrder: 10 },
      // FEURS (données réelles DE20260205)
      { quoteId: 'q_js_feurs', designation: 'Marquage cheminement PMR — bande blanche + logos piétons', unit: 'forfait', quantity: 1, unitPrice: 85,  costPrice: 45,  sortOrder: 1 },
      { quoteId: 'q_js_feurs', designation: 'Croix peinture jaune devant portail',                    unit: 'forfait', quantity: 1,  unitPrice: 120,  costPrice: 60,  sortOrder: 2 },
      { quoteId: 'q_js_feurs', designation: 'Marquage places parking ~18 places, peinture blanche',   unit: 'forfait', quantity: 1,  unitPrice: 300,  costPrice: 150, sortOrder: 3 },
      { quoteId: 'q_js_feurs', designation: 'Marquages divers : PL/VL + fléchage + 2 places ELEC',   unit: 'forfait', quantity: 1,  unitPrice: 180,  costPrice: 90,  sortOrder: 4 },
      { quoteId: 'q_js_feurs', designation: 'Panneau "Aire de retournement" 500×750mm + mât + bride', unit: 'unité',   quantity: 1,  unitPrice: 210,  costPrice: 110, sortOrder: 5 },
      { quoteId: 'q_js_feurs', designation: 'Panneau signalétique déchets alu composite + mât + Plastobloc', unit: 'unité', quantity: 5, unitPrice: 96, costPrice: 52, sortOrder: 6 },
      // SEM Chapelle (données réelles FA260045)
      { quoteId: 'q_js_sem_chapelle', designation: 'Démontage soigné des vitres',                     unit: 'unité',   quantity: 1,  unitPrice: 38,   costPrice: 20,  sortOrder: 1 },
      { quoteId: 'q_js_sem_chapelle', designation: 'Intervention dépannage simple (sans fournitures)', unit: 'unité',  quantity: 1,  unitPrice: 91,   costPrice: 50,  sortOrder: 2 },
      { quoteId: 'q_js_sem_chapelle', designation: 'Lavage parois abri en verre',                     unit: 'unité',   quantity: 1,  unitPrice: 27,   costPrice: 15,  sortOrder: 3 },
      { quoteId: 'q_js_sem_chapelle', designation: 'Révision de prix +1,7%',                          unit: 'unité',   quantity: 1,  unitPrice: 2.65, costPrice: 0,   sortOrder: 4 },
    ],
  });

  // ─── 7. CHANTIERS ────────────────────────────────────────────────────────
  await prisma.job.createMany({
    data: [
      // TERMINÉ → FACTURÉ — FA260069 (17 824€ — EN RETARD)
      {
        id: 'j_js_firminy',
        reference: 'CHT-JS-2026-069',
        title: 'FIRMINY — Ecole du Mas',
        address: 'Ecole du Mas, Firminy (42700)',
        status: 'invoiced',
        progress: 100,
        startDate: new Date('2026-02-02'),
        endDate: new Date('2026-02-21'),
        quoteId: 'q_js_firminy',
        clientId: 'cl_js_malia',
        companyId: JS,
      },
      // TERMINÉ → FACTURÉ — FA260045 (190.38€ — EN RETARD)
      {
        id: 'j_js_sem_chapelle',
        reference: 'CHT-JS-2026-045',
        title: 'ANDREZIEUX-BOUTHEON — La Chapelle (abri voyageurs)',
        address: 'Arrêt La Chapelle, Andrézieux-Bouthéon (42160)',
        status: 'invoiced',
        progress: 100,
        startDate: new Date('2026-02-17'),
        endDate: new Date('2026-02-18'),
        quoteId: 'q_js_sem_chapelle',
        clientId: 'cl_js_sem',
        companyId: JS,
      },
      // TERMINÉ → FACTURÉ — FA260104 (Orange Roanne)
      {
        id: 'j_js_orange',
        reference: 'CHT-JS-2026-104',
        title: 'ROANNE — Chantier Rue Macé (ORANGE)',
        address: 'Rue Macé, Roanne (42300)',
        status: 'invoiced',
        progress: 100,
        startDate: new Date('2026-03-02'),
        endDate: new Date('2026-03-14'),
        quoteId: 'q_js_orange',
        clientId: 'cl_js_orange',
        companyId: JS,
      },
      // EN COURS — dépasse légèrement le budget (pour l'alerte IA)
      {
        id: 'j_js_feurs',
        reference: 'CHT-JS-2026-205',
        title: 'FEURS — Marquage et signalétique (Equans)',
        address: 'ZA La Peronnière, Feurs (42110)',
        status: 'in_progress',
        progress: 40,
        startDate: new Date('2026-04-07'),
        endDate: new Date('2026-04-18'),
        quoteId: 'q_js_feurs',
        clientId: 'cl_js_ineo',
        companyId: JS,
      },
      // PLANIFIÉ
      {
        id: 'j_js_villefont',
        reference: 'CHT-JS-2026-253',
        title: 'VILLEFONTAINE — Cellule commerciale (Brunet TP)',
        address: 'ZA Villefontaine (38090)',
        status: 'planned',
        progress: 0,
        startDate: new Date('2026-05-04'),
        endDate: new Date('2026-05-15'),
        quoteId: 'q_js_villefont',
        clientId: 'cl_js_brunet',
        companyId: JS,
      },
    ],
  });

  // ─── 8. FACTURES (dont 2 EN RETARD — moment clé de la démo IA) ───────────
  await prisma.invoice.createMany({
    data: [
      // ⚠️ EN RETARD — 17 824€ — MALIA TP / Firminy
      // C'est la 1ère alerte que l'IA va afficher
      {
        id: 'inv_js_fa260069',
        reference: 'FA260069',
        amount: 17824.00,
        status: 'overdue',
        issuedAt: new Date('2026-02-28'),
        dueDate: new Date('2026-03-31'),  // échu — affiche en rouge
        vatMode: 'autoliquidation',
        vatRate: 0,
        notes: 'Travaux soumis au régime de la sous-traitance — TVA autoliquidée par le preneur d\'ordre (art. 283,2)',
        clientId: 'cl_js_malia',
        jobId: 'j_js_firminy',
        companyId: JS,
        externalRef: 'Chantier FIRMINY - Ecole du Mas',
      },
      // ⚠️ EN RETARD — 190.38€ TTC — Saint-Etienne Métropole / La Chapelle
      // C'est la 2ème alerte IA
      {
        id: 'inv_js_fa260045',
        reference: 'FA260045',
        amount: 158.65,
        status: 'overdue',
        issuedAt: new Date('2026-02-19'),
        dueDate: new Date('2026-03-31'),  // échu
        vatMode: 'normal',
        vatRate: 20,
        notes: 'Engagement 2500676 — DE20250923 du 12/11/2025',
        clientId: 'cl_js_sem',
        jobId: 'j_js_sem_chapelle',
        companyId: JS,
        externalRef: 'ANDREZIEUX-BOUTHEON - La Chapelle (Marché 2024)',
      },
      // ENVOYÉE — en attente règlement — FA260104 Orange Roanne
      {
        id: 'inv_js_fa260104',
        reference: 'FA260104',
        amount: 6450.00,
        status: 'sent',
        issuedAt: new Date('2026-03-17'),
        dueDate: new Date('2026-04-17'),
        vatMode: 'autoliquidation',
        vatRate: 0,
        notes: 'Travaux sous-traitance — TVA autoliquidée art. 283,2',
        clientId: 'cl_js_orange',
        jobId: 'j_js_orange',
        companyId: JS,
        externalRef: 'ORANGE - Rue Macé, ROANNE',
      },
      // PAYÉE — Saint-Etienne Métropole (facture précédente, marché 2024)
      {
        id: 'inv_js_fa260051',
        reference: 'FA260051',
        amount: 420.00,
        status: 'paid',
        issuedAt: new Date('2026-01-31'),
        dueDate: new Date('2026-02-28'),
        paidAt: new Date('2026-02-24'),
        vatMode: 'normal',
        vatRate: 20,
        notes: 'Marché 2024 — situation mensuelle',
        clientId: 'cl_js_sem',
        jobId: null,
        companyId: JS,
      },
    ],
  });

  // ─── 9. SAISIES D'HEURES ─────────────────────────────────────────────────
  await prisma.timeEntry.createMany({
    data: [
      // Chantier FIRMINY — terminé (Yann + Thomas)
      { id: createId(), date: new Date('2026-02-02'), hours: 8, description: 'Déchargement et mise en place mobilier scolaire',   status: TimeEntryStatus.approved, userId: 'u_js_tech01', jobId: 'j_js_firminy', companyId: JS },
      { id: createId(), date: new Date('2026-02-03'), hours: 8, description: 'Pose tables et bancs + scellement béton',           status: TimeEntryStatus.approved, userId: 'u_js_tech01', jobId: 'j_js_firminy', companyId: JS },
      { id: createId(), date: new Date('2026-02-04'), hours: 7, description: 'Pose poubelles et paniers basket',                  status: TimeEntryStatus.approved, userId: 'u_js_tech01', jobId: 'j_js_firminy', companyId: JS },
      { id: createId(), date: new Date('2026-02-05'), hours: 8, description: 'Installation cages de foot + terrain multi-sport',  status: TimeEntryStatus.approved, userId: 'u_js_tech01', jobId: 'j_js_firminy', companyId: JS },
      { id: createId(), date: new Date('2026-02-02'), hours: 8, description: 'Manutention et terrassement scellements',           status: TimeEntryStatus.approved, userId: 'u_js_tech02', jobId: 'j_js_firminy', companyId: JS },
      { id: createId(), date: new Date('2026-02-03'), hours: 8, description: 'Fabrication jardinières bois pin CL4',              status: TimeEntryStatus.approved, userId: 'u_js_tech02', jobId: 'j_js_firminy', companyId: JS },
      { id: createId(), date: new Date('2026-02-05'), hours: 7, description: 'Pose cartels pédagogiques + mur d\'expression',     status: TimeEntryStatus.approved, userId: 'u_js_tech02', jobId: 'j_js_firminy', companyId: JS },
      { id: createId(), date: new Date('2026-02-19'), hours: 6, description: 'Pose rail de guidage ocre + contrôle réception',    status: TimeEntryStatus.approved, userId: 'u_js_tech03', jobId: 'j_js_firminy', companyId: JS },
      { id: createId(), date: new Date('2026-02-20'), hours: 4, description: 'Retouches et réception client MALIA TP',            status: TimeEntryStatus.approved, userId: 'u_js_tech01', jobId: 'j_js_firminy', companyId: JS },
      // Chantier SEM La Chapelle — terminé (Julien)
      { id: createId(), date: new Date('2026-02-17'), hours: 4, description: 'Maintenance abri voyageurs La Chapelle — vitres + dépannage', status: TimeEntryStatus.approved, userId: 'u_js_tech03', jobId: 'j_js_sem_chapelle', companyId: JS },
      // Chantier Orange Roanne — terminé
      { id: createId(), date: new Date('2026-03-02'), hours: 8, description: 'Signalétique chantier télécom Rue Macé — pose panneaux', status: TimeEntryStatus.approved, userId: 'u_js_tech01', jobId: 'j_js_orange', companyId: JS },
      { id: createId(), date: new Date('2026-03-03'), hours: 8, description: 'Marquage et balisage zone travaux Orange',           status: TimeEntryStatus.approved, userId: 'u_js_tech02', jobId: 'j_js_orange', companyId: JS },
      { id: createId(), date: new Date('2026-03-14'), hours: 6, description: 'Dépose balisage et réception chantier Orange',      status: TimeEntryStatus.approved, userId: 'u_js_tech01', jobId: 'j_js_orange', companyId: JS },
      // Chantier Feurs — en cours (semaine dernière)
      { id: createId(), date: new Date('2026-04-07'), hours: 8, description: 'Repérage terrain + préparation surface marquage',   status: TimeEntryStatus.approved, userId: 'u_js_tech03', jobId: 'j_js_feurs', companyId: JS },
      { id: createId(), date: new Date('2026-04-08'), hours: 8, description: 'Marquage cheminement PMR + places parking',         status: TimeEntryStatus.approved, userId: 'u_js_tech03', jobId: 'j_js_feurs', companyId: JS },
      { id: createId(), date: new Date('2026-04-09'), hours: 6, description: 'Pose panneaux déchets + signalétique',              status: TimeEntryStatus.submitted, userId: 'u_js_tech04', jobId: 'j_js_feurs', companyId: JS },
    ],
  });

  // ─── 10. PLANNING (semaine courante + suivante) ───────────────────────────
  const weekDemo = await prisma.teamPlanningWeek.create({
    data: {
      id: 'w_js_demo', weekStart: new Date('2026-04-20'),
      status: TeamPlanningStatus.draft, version: 1,
      companyId: JS,
    },
  });

  await prisma.teamPlanningSlot.createMany({
    data: [
      // Feurs — suite du chantier cette semaine
      { weekId: weekDemo.id, teamId: 't_js_marquage', date: new Date('2026-04-21'), startHour: 7, endHour: 12, jobId: 'j_js_feurs', notes: 'Finition marquage parking + panneau aire retournement' },
      { weekId: weekDemo.id, teamId: 't_js_marquage', date: new Date('2026-04-21'), startHour: 13, endHour: 17, jobId: 'j_js_feurs' },
      { weekId: weekDemo.id, teamId: 't_js_signa',    date: new Date('2026-04-22'), startHour: 7, endHour: 12, jobId: 'j_js_feurs', notes: 'Réception avec Equans' },
    ],
  });

  // ─── 11. ATELIER (workshop) ───────────────────────────────────────────────
  await prisma.workshopItem.createMany({
    data: [
      // Devis Mézenc-Meygal — en préparation
      {
        id: 'ws_js_mezenc1',
        reference: 'ATL-JS-2026-001',
        title: 'Pupitres "Volcans en liberté" — découpe alucobond',
        description: 'Découpe et usinage panneaux alucobond 6mm selon visuels fournis par CC Mézenc-Meygal. 8 panneaux format A2.',
        status: 'bat_pending' as WorkshopStatus,
        priority: 'medium' as WorkshopPriority,
        dueDate: new Date('2026-04-30'),
        assignedTo: 'Yann LEBLANC',
        jobId: 'j_js_villefont',
        companyId: JS,
      },
      // Villefontaine — préparation panneaux
      {
        id: 'ws_js_villefont1',
        reference: 'ATL-JS-2026-002',
        title: 'Panneaux cellule commerciale Villefontaine — fabrication',
        description: 'Impression numérique + découpe panneaux alu composite 3mm, format 1200×800mm. Lot 6 panneaux.',
        status: 'fabrication' as WorkshopStatus,
        priority: 'high' as WorkshopPriority,
        dueDate: new Date('2026-04-28'),
        assignedTo: 'Thomas GARCIA',
        jobId: 'j_js_villefont',
        companyId: JS,
      },
    ],
  });

  // ─── 12. COMMANDES FOURNISSEURS ───────────────────────────────────────────
  await prisma.purchaseOrder.createMany({
    data: [
      // Sineu Graff — commande corbeilles Mézenc-Meygal (devis validé 128 862)
      {
        id: 'po_js_sineu1',
        reference: 'CMD-JS-2026-001',
        amount: 1500,
        status: 'ordered',
        vatRate: 20,
        orderedAt: new Date('2026-04-15'),
        supplierId: 'sup_js_sineu',
        jobId: null,
        companyId: JS,
      },
      // Girod — panneaux Feurs (INEO)
      {
        id: 'po_js_girod1',
        reference: 'CMD-JS-2026-002',
        amount: 480,
        status: 'received',
        vatRate: 20,
        orderedAt: new Date('2026-04-01'),
        receivedAt: new Date('2026-04-05'),
        supplierId: 'sup_js_girod',
        jobId: 'j_js_feurs',
        companyId: JS,
      },
    ],
  });

  // ─── Résumé ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('✅ Seed DÉMO JS CONCEPT — données réelles');
  console.log('');
  console.log('  Comptes de connexion :');
  console.log('    admin → e.sauron@js-concept.fr  / Demo1234!');
  console.log('    admin → b.faure@js-concept.fr   / Demo1234!');
  console.log('    tech  → yann.leblanc@js-concept.fr / Demo1234!');
  console.log('');
  console.log('  Clients (vrais) : MALIA TP, Saint-Etienne Métropole, INEO, ORANGE, Brunet TP, CC Mézenc-Meygal');
  console.log('  Chantiers       : 5 (2 facturés, 1 en cours Feurs, 1 planifié Villefontaine)');
  console.log('  Devis           : 6 (2 acceptés, 2 envoyés, 1 brouillon, 1 Orange)');
  console.log('');
  console.log('  ⚠️  FACTURES EN RETARD (déclenchent l\'alerte IA) :');
  console.log('    FA260069 — MALIA TP           — 17 824,00 € — échue le 31/03/2026');
  console.log('    FA260045 — Saint-Etienne Métr — 190,38 € TTC — échue le 31/03/2026');
  console.log('');
  console.log('  Le briefing IA affichera : "2 factures en retard, ~18 000€ à encaisser"');
}

main().catch(console.error).finally(() => prisma.$disconnect());
