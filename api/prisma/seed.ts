import { PrismaClient, TimeSlot, TeamPlanningStatus, TimeEntryStatus, WorkshopStatus, WorkshopPriority, PurchaseStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ConceptManager DEMO (massive)...');

  const hash = bcrypt.hashSync('Demo1234!', 10);

  // ─── 1. CLEANUP (reverse dependency order) ──────────────────────────────
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.hrDocument.deleteMany(),
    prisma.timeEntry.deleteMany(),
    prisma.invoiceSituation.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.planningDispatchLog.deleteMany(),
    prisma.teamPlanningSlot.deleteMany(),
    prisma.teamPlanningWeek.deleteMany(),
    prisma.planningSlot.deleteMany(),
    prisma.jobAssignment.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.workshopItem.deleteMany(),
    prisma.purchaseLine.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.job.deleteMany(),
    prisma.quoteLine.deleteMany(),
    prisma.quote.deleteMany(),
    prisma.site.deleteMany(),
    prisma.client.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.team.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.company.deleteMany(),
  ]);

  // ─── 2. COMPANIES ────────────────────────────────────────────────────────
  await prisma.company.createMany({
    data: [
      { id: 'co_asp', code: 'ASP', name: 'ASP SIGNALISATION' },
      { id: 'co_js',  code: 'JS',  name: 'JS CONCEPT' },
    ],
  });

  // ─── 3. USERS (26 total) ─────────────────────────────────────────────────
  await prisma.user.createMany({
    data: [
      // ASP — admin + conducteur
      { id: 'u_asp_admin',  email: 'admin@asp.fr',  passwordHash: hash, name: 'Marie Dupont',     role: 'admin',      companyId: 'co_asp' },
      { id: 'u_asp_cond',   email: 'cond@asp.fr',   passwordHash: hash, name: 'Thomas Martin',    role: 'conducteur', companyId: 'co_asp' },
      // ASP — 10 techniciens (tech06–10 libres pour le dropdown)
      { id: 'u_asp_tech01', email: 'karim@asp.fr',  passwordHash: hash, name: 'Karim Benali',     role: 'technicien', companyId: 'co_asp' },
      { id: 'u_asp_tech02', email: 'lucas@asp.fr',  passwordHash: hash, name: 'Lucas Bernard',    role: 'technicien', companyId: 'co_asp' },
      { id: 'u_asp_tech03', email: 'samir@asp.fr',  passwordHash: hash, name: 'Samir Hamdi',      role: 'technicien', companyId: 'co_asp' },
      { id: 'u_asp_tech04', email: 'remi@asp.fr',   passwordHash: hash, name: 'Rémi Dupuis',      role: 'technicien', companyId: 'co_asp' },
      { id: 'u_asp_tech05', email: 'julien@asp.fr', passwordHash: hash, name: 'Julien Faure',     role: 'technicien', companyId: 'co_asp' },
      { id: 'u_asp_tech06', email: 'axel@asp.fr',   passwordHash: hash, name: 'Axel Morel',       role: 'technicien', companyId: 'co_asp' },
      { id: 'u_asp_tech07', email: 'nabil@asp.fr',  passwordHash: hash, name: 'Nabil Cherif',     role: 'technicien', companyId: 'co_asp' },
      { id: 'u_asp_tech08', email: 'pierre@asp.fr', passwordHash: hash, name: 'Pierre Girard',    role: 'technicien', companyId: 'co_asp' },
      { id: 'u_asp_tech09', email: 'hugo@asp.fr',   passwordHash: hash, name: 'Hugo Leroy',       role: 'technicien', companyId: 'co_asp' },
      { id: 'u_asp_tech10', email: 'mehdi@asp.fr',  passwordHash: hash, name: 'Mehdi Aouad',      role: 'technicien', companyId: 'co_asp' },
      // JS — admin + conducteur
      { id: 'u_js_admin',   email: 'admin@js.fr',   passwordHash: hash, name: 'Nathalie Petit',   role: 'admin',      companyId: 'co_js'  },
      { id: 'u_js_cond',    email: 'cond@js.fr',    passwordHash: hash, name: 'Olivier Renard',   role: 'conducteur', companyId: 'co_js'  },
      // JS — 10 techniciens (tech06–10 libres pour le dropdown)
      { id: 'u_js_tech01',  email: 'yann@js.fr',    passwordHash: hash, name: 'Yann Leblanc',     role: 'technicien', companyId: 'co_js'  },
      { id: 'u_js_tech02',  email: 'claire@js.fr',  passwordHash: hash, name: 'Claire Vigneron',  role: 'technicien', companyId: 'co_js'  },
      { id: 'u_js_tech03',  email: 'antoine@js.fr', passwordHash: hash, name: 'Antoine Brun',     role: 'technicien', companyId: 'co_js'  },
      { id: 'u_js_tech04',  email: 'sara@js.fr',    passwordHash: hash, name: 'Sara Khelil',      role: 'technicien', companyId: 'co_js'  },
      { id: 'u_js_tech05',  email: 'kevin@js.fr',   passwordHash: hash, name: 'Kevin Gros',       role: 'technicien', companyId: 'co_js'  },
      { id: 'u_js_tech06',  email: 'anais@js.fr',   passwordHash: hash, name: 'Anaïs Perrin',     role: 'technicien', companyId: 'co_js'  },
      { id: 'u_js_tech07',  email: 'romain@js.fr',  passwordHash: hash, name: 'Romain Blondel',   role: 'technicien', companyId: 'co_js'  },
      { id: 'u_js_tech08',  email: 'fatou@js.fr',   passwordHash: hash, name: 'Fatou Diallo',     role: 'technicien', companyId: 'co_js'  },
      { id: 'u_js_tech09',  email: 'theo@js.fr',    passwordHash: hash, name: 'Théo Vasseur',     role: 'technicien', companyId: 'co_js'  },
      { id: 'u_js_tech10',  email: 'jade@js.fr',    passwordHash: hash, name: 'Jade Renault',     role: 'technicien', companyId: 'co_js'  },
    ],
  });

  // ─── 4. TEAMS (5) + MEMBERS ──────────────────────────────────────────────
  await prisma.team.createMany({
    data: [
      { id: 't_asp_voirie',   name: 'Équipe Voirie',         isActive: true, companyId: 'co_asp' },
      { id: 't_asp_signa',    name: 'Équipe Signalisation',  isActive: true, companyId: 'co_asp' },
      { id: 't_asp_marquage', name: 'Équipe Marquage',       isActive: true, companyId: 'co_asp' },
      { id: 't_js_amenag',    name: 'Équipe Aménagement',    isActive: true, companyId: 'co_js'  },
      { id: 't_js_chantier',  name: 'Équipe Chantier Léger', isActive: true, companyId: 'co_js'  },
    ],
  });

  const memberFrom = new Date('2026-01-06T00:00:00.000Z');
  await prisma.teamMember.createMany({
    data: [
      // ASP Voirie: tech01 (chef), tech02
      { teamId: 't_asp_voirie',   userId: 'u_asp_tech01', roleInTeam: 'chef', activeFrom: memberFrom },
      { teamId: 't_asp_voirie',   userId: 'u_asp_tech02', roleInTeam: null,   activeFrom: memberFrom },
      // ASP Signalisation: tech03 seul
      { teamId: 't_asp_signa',    userId: 'u_asp_tech03', roleInTeam: null,   activeFrom: memberFrom },
      // ASP Marquage: tech04 (chef), tech05
      { teamId: 't_asp_marquage', userId: 'u_asp_tech04', roleInTeam: 'chef', activeFrom: memberFrom },
      { teamId: 't_asp_marquage', userId: 'u_asp_tech05', roleInTeam: null,   activeFrom: memberFrom },
      // JS Aménagement: tech01 (chef), tech02
      { teamId: 't_js_amenag',    userId: 'u_js_tech01',  roleInTeam: 'chef', activeFrom: memberFrom },
      { teamId: 't_js_amenag',    userId: 'u_js_tech02',  roleInTeam: null,   activeFrom: memberFrom },
      // JS Chantier Léger: tech03 seul
      { teamId: 't_js_chantier',  userId: 'u_js_tech03',  roleInTeam: null,   activeFrom: memberFrom },
    ],
  });

  // ─── 5. CLIENTS ──────────────────────────────────────────────────────────
  await prisma.client.createMany({
    data: [
      { id: 'cl_asp1', name: 'Mairie de Lyon',       contact: 'Jean-Luc Faure',  email: 'travaux@mairie-lyon.fr',  phone: '04 72 10 30 00', address: '1 Place de la Comédie',   city: 'Lyon',   type: 'public',  companyId: 'co_asp' },
      { id: 'cl_asp2', name: 'Métropole Grand Lyon', contact: 'Sophie Renard',   email: 'directions@grandlyon.fr', phone: '04 26 99 10 20', address: '20 Rue du Lac',            city: 'Lyon',   type: 'public',  companyId: 'co_asp' },
      { id: 'cl_asp3', name: 'Département Rhône',    contact: 'Pierre Morel',    email: 'marches@rhone.fr',        phone: '04 72 61 60 00', address: '2 Rue de la Préfecture',   city: 'Lyon',   type: 'public',  companyId: 'co_asp' },
      { id: 'cl_asp4', name: 'DIR Centre-Est',        contact: 'Stéphane Route',  email: 'dir-ce@ddtm.gouv.fr',    phone: '04 74 27 52 00', address: '21 Rue Jean Moulin',       city: 'Bron',   type: 'public',  companyId: 'co_asp' },
      { id: 'cl_asp5', name: 'Colas Rhône-Alpes',    contact: 'Bernard Jaune',   email: 'bjaune@colas.fr',         phone: '04 72 81 64 64', address: '12 Rue de la Villette',    city: 'Lyon',   type: 'private', companyId: 'co_asp' },
      { id: 'cl_js1',  name: 'Commune de Bron',      contact: 'Claire Vigneron', email: 'technique@ville-bron.fr', phone: '04 72 14 80 00', address: '1 Avenue Marcel Cachin',   city: 'Bron',   type: 'public',  companyId: 'co_js'  },
      { id: 'cl_js2',  name: 'SYTRAL Mobilités',     contact: 'Antoine Descours',email: 'projets@sytral.fr',       phone: '04 26 30 20 10', address: '21 Rue Salomon Reinach',   city: 'Lyon',   type: 'public',  companyId: 'co_js'  },
      { id: 'cl_js3',  name: 'Commune de Meylan',    contact: 'Lucie Vert',      email: 'mairie@meylan.fr',        phone: '04 76 41 10 00', address: '4 Av. du Vercors',         city: 'Meylan', type: 'public',  companyId: 'co_js'  },
    ],
  });

  // ─── 5b. SUPPLIERS ───────────────────────────────────────────────────
  await prisma.supplier.createMany({
    data: [
      { id: 'sup_asp1', name: 'Signaux Girod',       contact: 'Marc Girod',      email: 'contact@signaux-girod.fr',  phone: '04 74 65 23 00', category: 'signalisation',   companyId: 'co_asp' },
      { id: 'sup_asp2', name: 'AXIMUM',              contact: 'Denis Lefèvre',   email: 'commercial@aximum.fr',      phone: '01 49 92 50 00', category: 'marquage',        companyId: 'co_asp' },
      { id: 'sup_asp3', name: 'Nadia Signalisation', contact: 'Nadia Belhaj',    email: 'nadia@nadiasignal.fr',      phone: '04 72 33 18 42', category: 'balisage',        companyId: 'co_asp' },
      { id: 'sup_js1',  name: 'Sineu Graff',         contact: 'Philippe Sineu',  email: 'info@sineugraff.com',       phone: '03 29 86 72 63', category: 'mobilier_urbain', companyId: 'co_js'  },
      { id: 'sup_js2',  name: 'Area Aménagement',    contact: 'Lucie Charvet',   email: 'projets@area-amenagement.fr', phone: '04 76 90 14 50', category: 'aménagement',   companyId: 'co_js'  },
    ],
  });

  // ─── 6. QUOTES + LINES ───────────────────────────────────────────────────
  await prisma.quote.createMany({
    data: [
      { id: 'q_asp1', reference: 'DEV-ASP-2026-001', subject: 'Signalisation horizontale RD345',      amount: 28500, status: 'accepted', validUntil: new Date('2026-04-01'), clientId: 'cl_asp1', companyId: 'co_asp' },
      { id: 'q_asp2', reference: 'DEV-ASP-2026-002', subject: 'Marquage parking Hôtel de Ville',      amount:  9200, status: 'sent',     validUntil: new Date('2026-05-01'), clientId: 'cl_asp2', companyId: 'co_asp' },
      { id: 'q_asp3', reference: 'DEV-ASP-2026-003', subject: 'Panneaux directionnels RD1090',        amount: 52300, status: 'draft',    validUntil: new Date('2026-06-01'), clientId: 'cl_asp3', companyId: 'co_asp' },
      { id: 'q_asp4', reference: 'DEV-ASP-2026-004', subject: 'Balisage temporaire N85',              amount: 15400, status: 'accepted', validUntil: new Date('2026-04-15'), clientId: 'cl_asp4', companyId: 'co_asp' },
      { id: 'q_js1',  reference: 'DEV-JS-2026-001',  subject: 'Aménagement piste cyclable Bron',      amount: 41000, status: 'sent',     validUntil: new Date('2026-04-15'), clientId: 'cl_js1',  companyId: 'co_js'  },
      { id: 'q_js2',  reference: 'DEV-JS-2026-002',  subject: 'Mobilier urbain Place du Marché Bron', amount: 18900, status: 'draft',    validUntil: new Date('2026-05-30'), clientId: 'cl_js2',  companyId: 'co_js'  },
    ],
  });

  await prisma.quoteLine.createMany({
    data: [
      { quoteId: 'q_asp1', designation: 'Peinture routière thermoplastique', unit: 'm²',      quantity: 450,  unitPrice: 38,   costPrice: 22,   sortOrder: 1 },
      { quoteId: 'q_asp1', designation: 'Pré-marquage et traçage',           unit: 'forfait', quantity: 1,    unitPrice: 3000, costPrice: 1500, sortOrder: 2 },
      { quoteId: 'q_asp2', designation: 'Marquage places stationnement',     unit: 'place',   quantity: 80,   unitPrice: 85,   costPrice: 45,   sortOrder: 1 },
      { quoteId: 'q_asp2', designation: 'Signalétique directionnelle',        unit: 'unité',   quantity: 12,   unitPrice: 150,  costPrice: 70,   sortOrder: 2 },
      { quoteId: 'q_asp3', designation: 'Panneaux directionnels type B',      unit: 'unité',   quantity: 40,   unitPrice: 320,  costPrice: 180,  sortOrder: 1 },
      { quoteId: 'q_asp3', designation: 'Pose et scellement poteaux',         unit: 'unité',   quantity: 40,   unitPrice: 150,  costPrice: 80,   sortOrder: 2 },
      { quoteId: 'q_asp4', designation: 'Cônes K5a',                         unit: 'unité',   quantity: 200,  unitPrice: 28,   costPrice: 15,   sortOrder: 1 },
      { quoteId: 'q_asp4', designation: 'Barrières de chantier',             unit: 'ml',      quantity: 500,  unitPrice: 18,   costPrice: 9,    sortOrder: 2 },
      { quoteId: 'q_js1',  designation: 'Terrassement et nivellement',        unit: 'm²',      quantity: 1200, unitPrice: 18,   costPrice: 10,   sortOrder: 1 },
      { quoteId: 'q_js1',  designation: 'Revêtement béton bitumineux',        unit: 'm²',      quantity: 1200, unitPrice: 16,   costPrice: 9,    sortOrder: 2 },
      { quoteId: 'q_js2',  designation: 'Bancs urbains bois/métal',           unit: 'unité',   quantity: 15,   unitPrice: 680,  costPrice: 350,  sortOrder: 1 },
      { quoteId: 'q_js2',  designation: 'Corbeilles de propreté',             unit: 'unité',   quantity: 10,   unitPrice: 290,  costPrice: 140,  sortOrder: 2 },
    ],
  });

  // ─── 7. JOBS ─────────────────────────────────────────────────────────────
  await prisma.job.createMany({
    data: [
      {
        id: 'j_asp1', reference: 'CHT-ASP-2026-001',
        title: 'Signalisation RD345 — Phase 1',
        address: '345 Route Départementale, Lyon',
        status: 'in_progress', progress: 45,
        startDate: new Date('2026-02-03'), endDate: new Date('2026-03-14'),
        quoteId: 'q_asp1', clientId: 'cl_asp1', companyId: 'co_asp',
      },
      {
        id: 'j_asp2', reference: 'CHT-ASP-2026-002',
        title: 'Marquage parking Hôtel de Ville',
        address: '2 Rue de la Préfecture, Lyon',
        status: 'completed', progress: 100,
        startDate: new Date('2026-01-13'), endDate: new Date('2026-01-24'),
        quoteId: null, clientId: 'cl_asp2', companyId: 'co_asp',
      },
      {
        id: 'j_asp3', reference: 'CHT-ASP-2026-003',
        title: 'Panneaux directionnels RD1090',
        address: 'RD1090, Département Rhône',
        status: 'planned', progress: 0,
        startDate: new Date('2026-03-10'), endDate: new Date('2026-04-30'),
        quoteId: 'q_asp3', clientId: 'cl_asp3', companyId: 'co_asp',
      },
      {
        id: 'j_asp4', reference: 'CHT-ASP-2026-004',
        title: 'Balisage chantier N85',
        address: 'N85, Bron',
        status: 'invoiced', progress: 100,
        startDate: new Date('2025-11-10'), endDate: new Date('2025-12-20'),
        quoteId: 'q_asp4', clientId: 'cl_asp4', companyId: 'co_asp',
      },
      {
        id: 'j_js1', reference: 'CHT-JS-2026-001',
        title: 'Piste cyclable Bron — Tranche 1',
        address: '1 Avenue Marcel Cachin, Bron',
        status: 'planned', progress: 0,
        startDate: new Date('2026-03-02'), endDate: new Date('2026-05-30'),
        quoteId: 'q_js1', clientId: 'cl_js1', companyId: 'co_js',
      },
      {
        id: 'j_js2', reference: 'CHT-JS-2026-002',
        title: 'Mobilier urbain SYTRAL — Lot 1',
        address: '21 Rue Salomon Reinach, Lyon',
        status: 'in_progress', progress: 30,
        startDate: new Date('2026-02-10'), endDate: new Date('2026-03-28'),
        quoteId: null, clientId: 'cl_js2', companyId: 'co_js',
      },
    ],
  });

  // ─── 8. TEAM PLANNING WEEKS (3) ──────────────────────────────────────────
  const weekAspN = await prisma.teamPlanningWeek.create({
    data: {
      id: 'w_asp_n', weekStart: new Date('2026-02-16'),
      status: TeamPlanningStatus.draft, version: 1,
      companyId: 'co_asp',
    },
  });

  const weekAspN1 = await prisma.teamPlanningWeek.create({
    data: {
      id: 'w_asp_n1', weekStart: new Date('2026-02-23'),
      status: TeamPlanningStatus.locked, version: 2,
      lockedAt: new Date('2026-02-20T09:15:00.000Z'),
      companyId: 'co_asp', lockedByUserId: 'u_asp_cond',
    },
  });

  const weekJsN = await prisma.teamPlanningWeek.create({
    data: {
      id: 'w_js_n', weekStart: new Date('2026-02-16'),
      status: TeamPlanningStatus.draft, version: 1,
      companyId: 'co_js',
    },
  });

  // ─── 9. TEAM PLANNING SLOTS (22) ─────────────────────────────────────────
  await prisma.teamPlanningSlot.createMany({
    data: [
      // ASP semaine N — draft (8 slots)
      { weekId: weekAspN.id,  teamId: 't_asp_voirie',   date: new Date('2026-02-16'), timeSlot: TimeSlot.AM, jobId: 'j_asp1' },
      { weekId: weekAspN.id,  teamId: 't_asp_voirie',   date: new Date('2026-02-16'), timeSlot: TimeSlot.PM, jobId: 'j_asp2' },
      { weekId: weekAspN.id,  teamId: 't_asp_voirie',   date: new Date('2026-02-17'), timeSlot: TimeSlot.AM, jobId: 'j_asp1', notes: 'Accès restreint matin' },
      { weekId: weekAspN.id,  teamId: 't_asp_voirie',   date: new Date('2026-02-18'), timeSlot: TimeSlot.AM, jobId: 'j_asp1' },
      { weekId: weekAspN.id,  teamId: 't_asp_signa',    date: new Date('2026-02-16'), timeSlot: TimeSlot.AM, jobId: 'j_asp1' },
      { weekId: weekAspN.id,  teamId: 't_asp_signa',    date: new Date('2026-02-17'), timeSlot: TimeSlot.AM, jobId: 'j_asp3' },
      { weekId: weekAspN.id,  teamId: 't_asp_marquage', date: new Date('2026-02-16'), timeSlot: TimeSlot.AM, jobId: 'j_asp2' },
      { weekId: weekAspN.id,  teamId: 't_asp_marquage', date: new Date('2026-02-18'), timeSlot: TimeSlot.PM, jobId: 'j_asp2' },
      // ASP semaine N+1 — locked (6 slots)
      { weekId: weekAspN1.id, teamId: 't_asp_voirie',   date: new Date('2026-02-23'), timeSlot: TimeSlot.AM, jobId: 'j_asp1' },
      { weekId: weekAspN1.id, teamId: 't_asp_voirie',   date: new Date('2026-02-23'), timeSlot: TimeSlot.PM, jobId: 'j_asp1' },
      { weekId: weekAspN1.id, teamId: 't_asp_voirie',   date: new Date('2026-02-24'), timeSlot: TimeSlot.AM, jobId: 'j_asp1' },
      { weekId: weekAspN1.id, teamId: 't_asp_marquage', date: new Date('2026-02-23'), timeSlot: TimeSlot.AM, jobId: 'j_asp4' },
      { weekId: weekAspN1.id, teamId: 't_asp_marquage', date: new Date('2026-02-24'), timeSlot: TimeSlot.AM, jobId: 'j_asp4' },
      { weekId: weekAspN1.id, teamId: 't_asp_marquage', date: new Date('2026-02-24'), timeSlot: TimeSlot.PM, jobId: 'j_asp4' },
      // JS semaine N — draft (8 slots)
      { weekId: weekJsN.id,   teamId: 't_js_amenag',   date: new Date('2026-02-16'), timeSlot: TimeSlot.AM, jobId: 'j_js1' },
      { weekId: weekJsN.id,   teamId: 't_js_amenag',   date: new Date('2026-02-16'), timeSlot: TimeSlot.PM, jobId: 'j_js1' },
      { weekId: weekJsN.id,   teamId: 't_js_amenag',   date: new Date('2026-02-17'), timeSlot: TimeSlot.AM, jobId: 'j_js2' },
      { weekId: weekJsN.id,   teamId: 't_js_amenag',   date: new Date('2026-02-18'), timeSlot: TimeSlot.AM, jobId: 'j_js1' },
      { weekId: weekJsN.id,   teamId: 't_js_chantier', date: new Date('2026-02-16'), timeSlot: TimeSlot.AM, jobId: 'j_js2' },
      { weekId: weekJsN.id,   teamId: 't_js_chantier', date: new Date('2026-02-17'), timeSlot: TimeSlot.AM, jobId: 'j_js2' },
      { weekId: weekJsN.id,   teamId: 't_js_chantier', date: new Date('2026-02-17'), timeSlot: TimeSlot.PM, jobId: 'j_js2' },
      { weekId: weekJsN.id,   teamId: 't_js_chantier', date: new Date('2026-02-18'), timeSlot: TimeSlot.AM, jobId: 'j_js2' },
    ],
  });

  // ─── 10. PLANNING DISPATCH LOG ───────────────────────────────────────────
  const dispatchHtml = `<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif"><thead><tr style="background:#1e40af;color:#fff"><th style="padding:8px 12px;text-align:left">Équipe</th><th style="padding:8px 12px">Lun 23/02 AM</th><th style="padding:8px 12px">Lun 23/02 PM</th><th style="padding:8px 12px">Mar 24/02 AM</th><th style="padding:8px 12px">Mar 24/02 PM</th></tr></thead><tbody><tr style="background:#f8fafc"><td style="padding:8px 12px;font-weight:bold">Équipe Voirie</td><td style="padding:8px 12px;text-align:center">CHT-ASP-2026-001</td><td style="padding:8px 12px;text-align:center">CHT-ASP-2026-001</td><td style="padding:8px 12px;text-align:center">CHT-ASP-2026-001</td><td style="padding:8px 12px;text-align:center">—</td></tr><tr><td style="padding:8px 12px;font-weight:bold">Équipe Marquage</td><td style="padding:8px 12px;text-align:center">CHT-ASP-2026-004</td><td style="padding:8px 12px;text-align:center">—</td><td style="padding:8px 12px;text-align:center">CHT-ASP-2026-004</td><td style="padding:8px 12px;text-align:center">CHT-ASP-2026-004</td></tr></tbody></table>`;

  await prisma.planningDispatchLog.create({
    data: {
      weekId: weekAspN1.id, sentByUserId: 'u_asp_cond',
      channel: 'email',
      recipients: ['karim@asp.fr', 'lucas@asp.fr', 'remi@asp.fr', 'julien@asp.fr'],
      status: 'simulated',
      sentAt: new Date('2026-02-20T09:16:00.000Z'),
      htmlContent: dispatchHtml,
    },
  });

  // ─── 11. INVOICES (4 total) ───────────────────────────────────────────────
  await prisma.invoice.createMany({
    data: [
      {
        id: 'inv_asp1', reference: 'FAC-ASP-2026-001',
        amount: 14250, status: 'draft',
        issuedAt: new Date('2026-02-15'), dueDate: new Date('2026-03-17'),
        clientId: 'cl_asp1', jobId: 'j_asp1', companyId: 'co_asp',
      },
      {
        id: 'inv_asp2', reference: 'FAC-ASP-2026-002',
        amount: 9200, status: 'sent',
        issuedAt: new Date('2026-01-28'), dueDate: new Date('2026-02-27'),
        clientId: 'cl_asp2', jobId: 'j_asp2', companyId: 'co_asp',
      },
      {
        id: 'inv_asp3', reference: 'FAC-ASP-2026-003',
        amount: 15400, status: 'paid',
        issuedAt: new Date('2025-12-22'), dueDate: new Date('2026-01-22'),
        paidAt: new Date('2026-01-18'),
        clientId: 'cl_asp4', jobId: 'j_asp4', companyId: 'co_asp',
      },
      {
        id: 'inv_js1', reference: 'FAC-JS-2026-001',
        amount: 8200, status: 'draft',
        issuedAt: new Date('2026-02-18'), dueDate: new Date('2026-03-20'),
        clientId: 'cl_js2', jobId: 'j_js2', companyId: 'co_js',
      },
    ],
  });

  // ─── 12. TIME ENTRIES (30 total) ─────────────────────────────────────────
  await prisma.timeEntry.createMany({
    data: [
      // ASP tech01 — j_asp1 (5 entrées)
      { id: 'te_a01', date: new Date('2026-02-10'), hours: 8, description: 'Marquage axial RD345 — km 0 à km 2',      status: TimeEntryStatus.approved,  userId: 'u_asp_tech01', jobId: 'j_asp1', companyId: 'co_asp' },
      { id: 'te_a02', date: new Date('2026-02-11'), hours: 8, description: 'Marquage RD345 — km 2 à km 4',            status: TimeEntryStatus.approved,  userId: 'u_asp_tech01', jobId: 'j_asp1', companyId: 'co_asp' },
      { id: 'te_a03', date: new Date('2026-02-12'), hours: 7, description: 'Reprise traversée piétons RD345',          status: TimeEntryStatus.submitted, userId: 'u_asp_tech01', jobId: 'j_asp1', companyId: 'co_asp' },
      { id: 'te_a04', date: new Date('2026-02-13'), hours: 8, description: 'Marquage RD345 — km 4 à km 6',            status: TimeEntryStatus.submitted, userId: 'u_asp_tech01', jobId: 'j_asp1', companyId: 'co_asp' },
      { id: 'te_a05', date: new Date('2026-02-17'), hours: 8, description: 'Marquage RD345 — km 6 à km 8',            status: TimeEntryStatus.draft,     userId: 'u_asp_tech01', jobId: 'j_asp1', companyId: 'co_asp' },
      // ASP tech02 — j_asp1 + j_asp2 (5 entrées)
      { id: 'te_a06', date: new Date('2026-02-10'), hours: 8, description: 'Pré-marquage et traçage RD345',            status: TimeEntryStatus.approved,  userId: 'u_asp_tech02', jobId: 'j_asp1', companyId: 'co_asp' },
      { id: 'te_a07', date: new Date('2026-02-11'), hours: 7, description: 'Préparation surface RD345',                status: TimeEntryStatus.approved,  userId: 'u_asp_tech02', jobId: 'j_asp1', companyId: 'co_asp' },
      { id: 'te_a08', date: new Date('2026-02-14'), hours: 6, description: 'Marquage parking Hôtel de Ville',          status: TimeEntryStatus.draft,     userId: 'u_asp_tech02', jobId: 'j_asp2', companyId: 'co_asp' },
      { id: 'te_a09', date: new Date('2026-02-17'), hours: 8, description: 'Traçage RD345 phase 2',                    status: TimeEntryStatus.draft,     userId: 'u_asp_tech02', jobId: 'j_asp1', companyId: 'co_asp' },
      { id: 'te_a10', date: new Date('2026-02-18'), hours: 7, description: 'Contrôle et retouches RD345',              status: TimeEntryStatus.draft,     userId: 'u_asp_tech02', jobId: 'j_asp1', companyId: 'co_asp' },
      // ASP tech03 — j_asp1 + j_asp3 (3 entrées)
      { id: 'te_a11', date: new Date('2026-02-10'), hours: 8, description: 'Pose panneau signalisation km 0',          status: TimeEntryStatus.approved,  userId: 'u_asp_tech03', jobId: 'j_asp1', companyId: 'co_asp' },
      { id: 'te_a12', date: new Date('2026-02-11'), hours: 8, description: 'Pose panneau signalisation km 2',          status: TimeEntryStatus.approved,  userId: 'u_asp_tech03', jobId: 'j_asp1', companyId: 'co_asp' },
      { id: 'te_a13', date: new Date('2026-02-17'), hours: 6, description: 'Repérage terrain RD1090',                  status: TimeEntryStatus.draft,     userId: 'u_asp_tech03', jobId: 'j_asp3', companyId: 'co_asp' },
      // ASP tech04 — j_asp2 + j_asp4 (4 entrées)
      { id: 'te_a14', date: new Date('2026-02-10'), hours: 7, description: 'Marquage emplacements parking ligne 1',    status: TimeEntryStatus.approved,  userId: 'u_asp_tech04', jobId: 'j_asp2', companyId: 'co_asp' },
      { id: 'te_a15', date: new Date('2026-02-11'), hours: 8, description: 'Marquage emplacements parking ligne 2',    status: TimeEntryStatus.approved,  userId: 'u_asp_tech04', jobId: 'j_asp2', companyId: 'co_asp' },
      { id: 'te_a16', date: new Date('2026-02-17'), hours: 8, description: 'Pose cônes K5a N85 — section A',           status: TimeEntryStatus.draft,     userId: 'u_asp_tech04', jobId: 'j_asp4', companyId: 'co_asp' },
      { id: 'te_a17', date: new Date('2026-02-18'), hours: 8, description: 'Pose barrières chantier N85 — section A',  status: TimeEntryStatus.draft,     userId: 'u_asp_tech04', jobId: 'j_asp4', companyId: 'co_asp' },
      // ASP tech05 — j_asp2 (3 entrées)
      { id: 'te_a18', date: new Date('2026-02-10'), hours: 6, description: 'Nettoyage surface parking',                status: TimeEntryStatus.approved,  userId: 'u_asp_tech05', jobId: 'j_asp2', companyId: 'co_asp' },
      { id: 'te_a19', date: new Date('2026-02-12'), hours: 7, description: 'Marquage flèches directionnelles parking', status: TimeEntryStatus.approved,  userId: 'u_asp_tech05', jobId: 'j_asp2', companyId: 'co_asp' },
      { id: 'te_a20', date: new Date('2026-02-13'), hours: 8, description: 'Finitions et contrôle qualité parking',    status: TimeEntryStatus.submitted, userId: 'u_asp_tech05', jobId: 'j_asp2', companyId: 'co_asp' },

      // JS tech01 — j_js1 (4 entrées)
      { id: 'te_j01', date: new Date('2026-02-10'), hours: 8, description: 'Repérage et piquetage piste cyclable',     status: TimeEntryStatus.approved,  userId: 'u_js_tech01', jobId: 'j_js1', companyId: 'co_js' },
      { id: 'te_j02', date: new Date('2026-02-11'), hours: 8, description: 'Terrassement section A — 0 à 200m',        status: TimeEntryStatus.approved,  userId: 'u_js_tech01', jobId: 'j_js1', companyId: 'co_js' },
      { id: 'te_j03', date: new Date('2026-02-12'), hours: 7, description: 'Terrassement section B — 200 à 400m',      status: TimeEntryStatus.submitted, userId: 'u_js_tech01', jobId: 'j_js1', companyId: 'co_js' },
      { id: 'te_j04', date: new Date('2026-02-17'), hours: 8, description: 'Terrassement section C — 400 à 600m',      status: TimeEntryStatus.draft,     userId: 'u_js_tech01', jobId: 'j_js1', companyId: 'co_js' },
      // JS tech02 — j_js2 (3 entrées)
      { id: 'te_j05', date: new Date('2026-02-10'), hours: 8, description: 'Installation bancs et socles lot 1',        status: TimeEntryStatus.approved,  userId: 'u_js_tech02', jobId: 'j_js2', companyId: 'co_js' },
      { id: 'te_j06', date: new Date('2026-02-11'), hours: 6, description: 'Installation corbeilles lot 1',             status: TimeEntryStatus.approved,  userId: 'u_js_tech02', jobId: 'j_js2', companyId: 'co_js' },
      { id: 'te_j07', date: new Date('2026-02-17'), hours: 8, description: 'Installation bancs lot 2',                  status: TimeEntryStatus.draft,     userId: 'u_js_tech02', jobId: 'j_js2', companyId: 'co_js' },
      // JS tech03 — j_js2 (3 entrées)
      { id: 'te_j08', date: new Date('2026-02-12'), hours: 7, description: 'Préparation fond de forme SYTRAL — zone A',status: TimeEntryStatus.submitted, userId: 'u_js_tech03', jobId: 'j_js2', companyId: 'co_js' },
      { id: 'te_j09', date: new Date('2026-02-13'), hours: 8, description: 'Pose platines de scellement SYTRAL',        status: TimeEntryStatus.submitted, userId: 'u_js_tech03', jobId: 'j_js2', companyId: 'co_js' },
      { id: 'te_j10', date: new Date('2026-02-18'), hours: 6, description: 'Livraison et vérification mobilier lot 2',  status: TimeEntryStatus.draft,     userId: 'u_js_tech03', jobId: 'j_js2', companyId: 'co_js' },
    ],
  });

  // ─── 13. HR DOCUMENTS (12 total — metadata only) ─────────────────────────
  await prisma.hrDocument.createMany({
    data: [
      // ASP — 6 documents
      {
        type: 'cni', label: "Carte nationale d'identité",
        storageKey: 'hr/co_asp/u_asp_tech01/cni/20260101-cni.pdf', mimeType: 'application/pdf', sizeBytes: 204800,
        purpose: "Vérification identité — obligation légale employeur",
        uploadedByUserId: 'u_asp_admin', userId: 'u_asp_tech01', companyId: 'co_asp',
      },
      {
        type: 'permis', label: 'Permis de conduire B',
        storageKey: 'hr/co_asp/u_asp_tech02/permis/20260101-permis.pdf', mimeType: 'application/pdf', sizeBytes: 153600,
        purpose: 'Habilitation conduite véhicules légers pour missions terrain',
        expiresAt: new Date('2029-01-15'), retentionUntil: new Date('2030-01-15'),
        uploadedByUserId: 'u_asp_admin', userId: 'u_asp_tech02', companyId: 'co_asp',
      },
      {
        type: 'habilitation_electrique', label: 'Habilitation électrique B2V',
        storageKey: 'hr/co_asp/u_asp_tech03/hab/20260101-hab-elec.pdf', mimeType: 'application/pdf', sizeBytes: 102400,
        purpose: 'Habilitation requise pour chantiers signalisation tricolore',
        expiresAt: new Date('2026-12-31'), retentionUntil: new Date('2027-12-31'),
        uploadedByUserId: 'u_asp_cond', userId: 'u_asp_tech03', companyId: 'co_asp',
      },
      {
        type: 'caces', label: 'CACES R482 catégorie C1',
        storageKey: 'hr/co_asp/u_asp_tech04/caces/20260101-caces.pdf', mimeType: 'application/pdf', sizeBytes: 307200,
        purpose: 'CACES engins de chantier — signalisation et marquage',
        expiresAt: new Date('2028-03-15'), retentionUntil: new Date('2029-03-15'),
        uploadedByUserId: 'u_asp_admin', userId: 'u_asp_tech04', companyId: 'co_asp',
      },
      {
        type: 'visite_medicale', label: 'Aptitude médicale au travail',
        storageKey: 'hr/co_asp/u_asp_tech05/med/20260115-aptitude.pdf', mimeType: 'application/pdf', sizeBytes: 81920,
        purpose: 'Suivi médical réglementaire — médecine du travail',
        expiresAt: new Date('2027-01-15'), retentionUntil: new Date('2029-01-15'),
        uploadedByUserId: 'u_asp_admin', userId: 'u_asp_tech05', companyId: 'co_asp',
      },
      {
        type: 'carte_pro', label: 'Carte professionnelle BTP',
        storageKey: 'hr/co_asp/u_asp_tech06/carte/20260101-carte-btp.pdf', mimeType: 'application/pdf', sizeBytes: 61440,
        purpose: 'Identification sur chantier — réglementation BTP',
        expiresAt: new Date('2031-01-01'), retentionUntil: new Date('2033-01-01'),
        uploadedByUserId: 'u_asp_cond', userId: 'u_asp_tech06', companyId: 'co_asp',
      },

      // JS — 6 documents
      {
        type: 'cni', label: "Carte nationale d'identité",
        storageKey: 'hr/co_js/u_js_tech01/cni/20260101-cni.pdf', mimeType: 'application/pdf', sizeBytes: 204800,
        purpose: "Vérification identité — obligation légale employeur",
        uploadedByUserId: 'u_js_admin', userId: 'u_js_tech01', companyId: 'co_js',
      },
      {
        type: 'permis', label: 'Permis de conduire B+E',
        storageKey: 'hr/co_js/u_js_tech02/permis/20260101-permis.pdf', mimeType: 'application/pdf', sizeBytes: 163840,
        purpose: 'Habilitation conduite remorque pour transport mobilier urbain',
        expiresAt: new Date('2031-06-30'), retentionUntil: new Date('2032-06-30'),
        uploadedByUserId: 'u_js_admin', userId: 'u_js_tech02', companyId: 'co_js',
      },
      {
        type: 'habilitation_electrique', label: 'Habilitation électrique H0B0',
        storageKey: 'hr/co_js/u_js_tech03/hab/20260101-hab-h0b0.pdf', mimeType: 'application/pdf', sizeBytes: 92160,
        purpose: 'Habilitation non-électricien — travaux à proximité ouvrages électriques',
        expiresAt: new Date('2027-09-30'), retentionUntil: new Date('2028-09-30'),
        uploadedByUserId: 'u_js_cond', userId: 'u_js_tech03', companyId: 'co_js',
      },
      {
        type: 'caces', label: 'CACES R389 catégorie 3',
        storageKey: 'hr/co_js/u_js_tech04/caces/20260101-caces.pdf', mimeType: 'application/pdf', sizeBytes: 286720,
        purpose: 'CACES chariot élévateur pour manutention mobilier urbain',
        expiresAt: new Date('2027-06-30'), retentionUntil: new Date('2028-06-30'),
        uploadedByUserId: 'u_js_admin', userId: 'u_js_tech04', companyId: 'co_js',
      },
      {
        type: 'visite_medicale', label: 'Aptitude médicale au travail',
        storageKey: 'hr/co_js/u_js_tech05/med/20260120-aptitude.pdf', mimeType: 'application/pdf', sizeBytes: 73728,
        purpose: 'Suivi médical réglementaire — médecine du travail',
        expiresAt: new Date('2028-01-20'), retentionUntil: new Date('2030-01-20'),
        uploadedByUserId: 'u_js_admin', userId: 'u_js_tech05', companyId: 'co_js',
      },
      {
        type: 'carte_pro', label: 'Carte professionnelle BTP',
        storageKey: 'hr/co_js/u_js_tech06/carte/20260101-carte-btp.pdf', mimeType: 'application/pdf', sizeBytes: 61440,
        purpose: 'Identification sur chantier — réglementation BTP',
        expiresAt: new Date('2030-06-01'), retentionUntil: new Date('2032-06-01'),
        uploadedByUserId: 'u_js_cond', userId: 'u_js_tech06', companyId: 'co_js',
      },
    ],
  });

  // ─── 14. WORKSHOP ITEMS (8 total) ───────────────────────────────────
  await prisma.workshopItem.createMany({
    data: [
      // ASP — 5 workshop items
      {
        id: 'ws_asp1', reference: 'ATL-ASP-001',
        title: 'Panneau directionnel D21a — RD345 km 3',
        description: 'Fabrication panneau aluminium 700x500mm, fond bleu, texte blanc',
        status: 'ready', priority: 'high',
        dueDate: new Date('2026-02-28'),
        assignedTo: 'Karim Benali',
        jobId: 'j_asp1', companyId: 'co_asp',
      },
      {
        id: 'ws_asp2', reference: 'ATL-ASP-002',
        title: 'Panneau signalisation AB3a — RD345 km 5',
        description: 'Découpe et pliage tôle, sérigraphie réglementaire',
        status: 'fabrication', priority: 'high',
        dueDate: new Date('2026-03-05'),
        assignedTo: 'Lucas Bernard',
        jobId: 'j_asp1', companyId: 'co_asp',
      },
      {
        id: 'ws_asp3', reference: 'ATL-ASP-003',
        title: 'Lot 12 panneaux parking Hôtel de Ville',
        description: 'Panneaux directionnels intérieurs parking, aluminium 400x300mm',
        status: 'pose_done', priority: 'medium',
        dueDate: new Date('2026-01-20'),
        assignedTo: 'Rémi Dupuis',
        jobId: 'j_asp2', companyId: 'co_asp',
      },
      {
        id: 'ws_asp4', reference: 'ATL-ASP-004',
        title: 'Panneaux directionnels RD1090 — lot préparation',
        description: 'Découpe 40 supports poteaux galvanisés, pré-perçage fixations',
        status: 'bat_pending', priority: 'low',
        dueDate: new Date('2026-03-15'),
        assignedTo: null,
        jobId: 'j_asp3', companyId: 'co_asp',
      },
      {
        id: 'ws_asp5', reference: 'ATL-ASP-005',
        title: 'Barrières de chantier N85 — soudure renforts',
        description: 'Soudure renforts supplémentaires sur 20 barrières, peinture anticorrosion',
        status: 'bat_approved', priority: 'medium',
        dueDate: new Date('2026-03-01'),
        assignedTo: 'Julien Faure',
        jobId: 'j_asp4', companyId: 'co_asp',
      },
      // JS — 3 workshop items
      {
        id: 'ws_js1', reference: 'ATL-JS-001',
        title: 'Bancs urbains — assemblage lot 2',
        description: 'Assemblage 8 bancs bois/métal, traitement bois autoclave, montage pieds',
        status: 'fabrication', priority: 'high',
        dueDate: new Date('2026-03-10'),
        assignedTo: 'Yann Leblanc',
        jobId: 'j_js2', companyId: 'co_js',
      },
      {
        id: 'ws_js2', reference: 'ATL-JS-002',
        title: 'Platines de scellement SYTRAL',
        description: 'Découpe et perçage 15 platines acier inox pour fixation mobilier',
        status: 'ready', priority: 'medium',
        dueDate: new Date('2026-02-25'),
        assignedTo: 'Antoine Brun',
        jobId: 'j_js2', companyId: 'co_js',
      },
      {
        id: 'ws_js3', reference: 'ATL-JS-003',
        title: 'Bordures béton piste cyclable — contrôle qualité',
        description: 'Vérification dimensionnelle et état de surface lot bordures préfabriquées',
        status: 'pose_planned', priority: 'low',
        dueDate: new Date('2026-03-20'),
        assignedTo: 'Claire Vigneron',
        jobId: 'j_js1', companyId: 'co_js',
      },
    ],
  });

  // ─── 15. PURCHASE ORDERS (7 total) ────────────────────────────────────
  await prisma.purchaseOrder.createMany({
    data: [
      // ASP — 4 purchase orders
      {
        id: 'po_asp1', reference: 'CMD-ASP-2026-001',
        amount: 4800, status: 'received',
        orderedAt: new Date('2026-01-20'),
        supplierId: 'sup_asp1', jobId: 'j_asp1', companyId: 'co_asp',
      },
      {
        id: 'po_asp2', reference: 'CMD-ASP-2026-002',
        amount: 2350, status: 'ordered',
        orderedAt: new Date('2026-02-10'),
        supplierId: 'sup_asp2', jobId: 'j_asp2', companyId: 'co_asp',
      },
      {
        id: 'po_asp3', reference: 'CMD-ASP-2026-003',
        amount: 12800, status: 'draft',
        orderedAt: new Date('2026-02-18'),
        supplierId: 'sup_asp1', jobId: 'j_asp3', companyId: 'co_asp',
      },
      {
        id: 'po_asp4', reference: 'CMD-ASP-2026-004',
        amount: 3200, status: 'received',
        orderedAt: new Date('2025-11-15'),
        supplierId: 'sup_asp3', jobId: 'j_asp4', companyId: 'co_asp',
      },
      // JS — 3 purchase orders
      {
        id: 'po_js1', reference: 'CMD-JS-2026-001',
        amount: 10200, status: 'ordered',
        orderedAt: new Date('2026-02-05'),
        supplierId: 'sup_js1', jobId: 'j_js2', companyId: 'co_js',
      },
      {
        id: 'po_js2', reference: 'CMD-JS-2026-002',
        amount: 6500, status: 'draft',
        orderedAt: new Date('2026-02-20'),
        supplierId: 'sup_js2', jobId: 'j_js1', companyId: 'co_js',
      },
      {
        id: 'po_js3', reference: 'CMD-JS-2026-003',
        amount: 4350, status: 'partial',
        orderedAt: new Date('2026-01-28'),
        supplierId: 'sup_js1', jobId: 'j_js2', companyId: 'co_js',
      },
    ],
  });

  console.log('');
  console.log('✅ Seed ConceptManager DEMO completed successfully');
  console.log('');
  console.log('  Companies    : 2  (ASP SIGNALISATION, JS CONCEPT)');
  console.log('  Users        : 26 — password: Demo1234!');
  console.log('    ASP → admin@asp.fr / cond@asp.fr / karim→mehdi@asp.fr (10 techs)');
  console.log('    JS  → admin@js.fr  / cond@js.fr  / yann→jade@js.fr   (10 techs)');
  console.log('  Teams        : 5  (3 ASP, 2 JS) — tech06–10 libres / entité');
  console.log('  Clients      : 8  (5 ASP, 3 JS)');
  console.log('  Suppliers    : 5  (3 ASP, 2 JS)');
  console.log('  Quotes       : 6  + 12 lignes');
  console.log('  Jobs         : 6  (4 ASP, 2 JS)');
  console.log('  PlanWeeks    : 3  (2 ASP dont 1 locked, 1 JS draft)');
  console.log('  Slots        : 22 (8+6 ASP, 8 JS)');
  console.log('  DispatchLog  : 1  (simulated, semaine locked ASP)');
  console.log('  Invoices     : 4  (3 ASP, 1 JS)');
  console.log('  TimeEntries  : 30 (20 ASP, 10 JS)');
  console.log('  HrDocuments  : 12 (6 ASP, 6 JS)');
  console.log('  WorkshopItems: 8  (5 ASP, 3 JS)');
  console.log('  PurchaseOrders: 7  (4 ASP, 3 JS)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
