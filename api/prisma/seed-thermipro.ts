/**
 * seed-thermipro.ts — ThermiPro SAS · Démo volumineuse
 * 8 users · 25 clients · 30 devis · 18 chantiers · 25 factures
 * 80+ pointages · 3 semaines planning · 15 BDC · docs RH
 */

import {
  PrismaClient,
  TimeEntryStatus,
  PurchaseStatus,
  TeamPlanningStatus,
} from '@prisma/client';

export async function seedThermiPro(prisma: PrismaClient, hash: string) {
  console.log('🔥 Seeding ThermiPro SAS (volume démo)...');

  // ─── COMPANY ──────────────────────────────────────────────────────────────
  await prisma.company.create({
    data: { id: 'co_tp', code: 'TP', name: 'ThermiPro SAS' },
  });

  // ─── USERS ────────────────────────────────────────────────────────────────
  await prisma.user.createMany({
    data: [
      { id: 'u_tp_admin',  email: 'david@thermipro.fr',   passwordHash: hash, name: 'David Moreau',    role: 'admin',      companyId: 'co_tp' },
      { id: 'u_tp_cond',   email: 'julien@thermipro.fr',  passwordHash: hash, name: 'Julien Favre',    role: 'conducteur', companyId: 'co_tp' },
      { id: 'u_tp_tech01', email: 'maxime@thermipro.fr',  passwordHash: hash, name: 'Maxime Torres',   role: 'technicien', companyId: 'co_tp' },
      { id: 'u_tp_tech02', email: 'kevin@thermipro.fr',   passwordHash: hash, name: 'Kevin Bauer',     role: 'technicien', companyId: 'co_tp' },
      { id: 'u_tp_tech03', email: 'romain@thermipro.fr',  passwordHash: hash, name: 'Romain Chevalier',role: 'technicien', companyId: 'co_tp' },
      { id: 'u_tp_tech04', email: 'hassan@thermipro.fr',  passwordHash: hash, name: 'Hassan Mabille',  role: 'technicien', companyId: 'co_tp' },
      { id: 'u_tp_tech05', email: 'theo@thermipro.fr',    passwordHash: hash, name: 'Théo Gauthier',   role: 'technicien', companyId: 'co_tp' },
      { id: 'u_tp_tech06', email: 'pierre@thermipro.fr',  passwordHash: hash, name: 'Pierre Lacombe',  role: 'technicien', companyId: 'co_tp' },
    ],
  });

  // ─── TEAMS ────────────────────────────────────────────────────────────────
  const teamA = await prisma.team.create({ data: { id: 'tm_tp_a', name: 'Équipe A — Nord IDF', companyId: 'co_tp' } });
  const teamB = await prisma.team.create({ data: { id: 'tm_tp_b', name: 'Équipe B — Sud IDF',  companyId: 'co_tp' } });

  await prisma.teamMember.createMany({
    data: [
      { teamId: teamA.id, userId: 'u_tp_tech01', roleInTeam: 'chef d\'équipe' },
      { teamId: teamA.id, userId: 'u_tp_tech02', roleInTeam: 'technicien' },
      { teamId: teamA.id, userId: 'u_tp_tech03', roleInTeam: 'technicien' },
      { teamId: teamB.id, userId: 'u_tp_tech04', roleInTeam: 'chef d\'équipe' },
      { teamId: teamB.id, userId: 'u_tp_tech05', roleInTeam: 'technicien' },
      { teamId: teamB.id, userId: 'u_tp_tech06', roleInTeam: 'technicien' },
    ],
  });

  // ─── CLIENTS (25) ─────────────────────────────────────────────────────────
  await prisma.client.createMany({
    data: [
      // Particuliers — fil rouge démo
      { id: 'cl_tp01', name: 'Famille Dupont',         contact: 'Marc Dupont',         email: 'marc.dupont@gmail.com',         phone: '06 12 34 56 78', address: '12 Rue des Châtaigniers',      city: 'Versailles',            type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp02', name: 'Mme Isabelle Leroy',     contact: 'Isabelle Leroy',      email: 'i.leroy@outlook.fr',            phone: '06 87 65 43 21', address: '47 Av. du Général de Gaulle', city: 'Boulogne-Billancourt',  type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp03', name: 'M. Karim Benzara',       contact: 'Karim Benzara',       email: 'k.benzara@benzara.fr',          phone: '06 55 44 33 22', address: '8 Allée des Roses',           city: 'Saint-Germain-en-Laye', type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp04', name: 'M. et Mme Fontaine',     contact: 'Bernard Fontaine',    email: 'b.fontaine@wanadoo.fr',         phone: '06 98 76 54 32', address: '23 Rue de la Paix',           city: 'Rueil-Malmaison',       type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp05', name: 'SCI Grenelle Property',  contact: 'Élodie Marchetti',    email: 'e.marchetti@grenelle-immo.fr',  phone: '01 45 67 89 01', address: '15 Rue de Grenelle',          city: 'Paris 7e',              type: 'professional',  companyId: 'co_tp' },
      // Particuliers supplémentaires
      { id: 'cl_tp06', name: 'M. et Mme Renard',       contact: 'Sophie Renard',       email: 's.renard@free.fr',              phone: '06 22 33 44 55', address: '3 Impasse du Moulin',         city: 'Meudon',                type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp07', name: 'M. Thierry Lombard',     contact: 'Thierry Lombard',     email: 't.lombard@sfr.fr',              phone: '06 11 22 33 44', address: '19 Rue Victor Hugo',          city: 'Vincennes',             type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp08', name: 'Famille Perrin',          contact: 'Antoine Perrin',      email: 'a.perrin@gmail.com',            phone: '06 44 55 66 77', address: '56 Chemin des Vignes',        city: 'Versailles',            type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp09', name: 'Mme Clara Bonnet',        contact: 'Clara Bonnet',        email: 'c.bonnet@gmail.com',            phone: '06 77 88 99 00', address: '8 Rue de l\'Église',          city: 'Sceaux',                type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp10', name: 'M. Arnaud Faure',         contact: 'Arnaud Faure',        email: 'a.faure@orange.fr',             phone: '06 33 44 55 66', address: '42 Avenue de la Forêt',       city: 'Chaville',              type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp11', name: 'M. et Mme Girard',        contact: 'Philippe Girard',     email: 'p.girard@laposte.net',          phone: '06 55 66 77 88', address: '7 Rue du Château',            city: 'Maisons-Laffitte',      type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp12', name: 'Mme Nathalie Vidal',      contact: 'Nathalie Vidal',      email: 'n.vidal@gmail.com',             phone: '06 66 77 88 99', address: '33 Boulevard du Maréchal',    city: 'Antony',                type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp13', name: 'M. Stéphane Morin',       contact: 'Stéphane Morin',      email: 's.morin@hotmail.fr',            phone: '06 88 99 00 11', address: '12 Rue des Lilas',            city: 'Le Chesnay',            type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp14', name: 'Famille Leclerc',          contact: 'Jean-Pierre Leclerc', email: 'jp.leclerc@gmail.com',          phone: '06 99 00 11 22', address: '5 Allée des Peupliers',       city: 'Vélizy-Villacoublay',   type: 'private',       companyId: 'co_tp' },
      { id: 'cl_tp15', name: 'Mme Hélène Schmitt',      contact: 'Hélène Schmitt',      email: 'h.schmitt@free.fr',             phone: '06 00 11 22 33', address: '29 Rue du Bois',              city: 'Versailles',            type: 'private',       companyId: 'co_tp' },
      // Professionnels — syndics, promoteurs, bailleurs
      { id: 'cl_tp16', name: 'Syndic Foncia Versailles', contact: 'Pierre-Antoine Dury', email: 'p.dury@foncia.fr',             phone: '01 39 50 12 34', address: '18 Rue de la Division',       city: 'Versailles',            type: 'professional',  companyId: 'co_tp' },
      { id: 'cl_tp17', name: 'Nexity Promotion IDF',     contact: 'Laure Monnot',        email: 'l.monnot@nexity.fr',            phone: '01 55 32 18 00', address: '19 Rue de Vienne',            city: 'Paris 8e',              type: 'professional',  companyId: 'co_tp' },
      { id: 'cl_tp18', name: 'Icade Résidentiel',         contact: 'Bertrand Jolly',      email: 'b.jolly@icade.fr',              phone: '01 41 57 72 00', address: '35 Rue de la Gare',           city: 'Issy-les-Moulineaux',   type: 'professional',  companyId: 'co_tp' },
      { id: 'cl_tp19', name: 'Bailleur OPH Yvelines',    contact: 'Sandrine Aubert',     email: 's.aubert@oph78.fr',             phone: '01 34 97 00 00', address: '2 Rue Jean-Baptiste Colbert', city: 'Versailles',            type: 'professional',  companyId: 'co_tp' },
      { id: 'cl_tp20', name: 'Vinci Immobilier',          contact: 'Cédric Pons',         email: 'c.pons@vinci-immobilier.fr',    phone: '01 47 16 35 00', address: '1 Cours Ferdinand-de-Lesseps', city: 'Rueil-Malmaison',      type: 'professional',  companyId: 'co_tp' },
      { id: 'cl_tp21', name: 'Syndic Citya Boulogne',     contact: 'Marc Lefèvre',        email: 'm.lefevre@citya.com',           phone: '01 46 04 20 10', address: '32 Av. du Général Leclerc',  city: 'Boulogne-Billancourt',  type: 'professional',  companyId: 'co_tp' },
      { id: 'cl_tp22', name: 'Kaufman & Broad IDF',       contact: 'Virginie Aumont',     email: 'v.aumont@kb.fr',                phone: '01 41 43 44 45', address: '11 Rue Scribe',               city: 'Paris 9e',              type: 'professional',  companyId: 'co_tp' },
      { id: 'cl_tp23', name: 'CDC Habitat Île-de-France', contact: 'Louis Trémont',       email: 'l.tremont@cdchabitat.fr',       phone: '01 40 75 80 00', address: '3 Rue de Messine',            city: 'Paris 8e',              type: 'professional',  companyId: 'co_tp' },
      { id: 'cl_tp24', name: 'Mairie de Meudon',          contact: 'Responsable Énergie', email: 'energie@mairie-meudon.fr',      phone: '01 41 14 80 00', address: '12 Av. du Maréchal Joffre',  city: 'Meudon',                type: 'professional',  companyId: 'co_tp' },
      { id: 'cl_tp25', name: 'Résidences Idéales',        contact: 'Damien Pichot',       email: 'd.pichot@residences-ideales.fr',phone: '01 30 21 45 67', address: '8 Rue du Stade',              city: 'Mantes-la-Jolie',       type: 'professional',  companyId: 'co_tp' },
    ],
  });

  // ─── FOURNISSEURS ─────────────────────────────────────────────────────────
  await prisma.supplier.createMany({
    data: [
      { id: 'sup_tp1', name: 'Mitsubishi Electric France', contact: 'Responsable commercial IDF', email: 'pac@mitsubishi-electric.fr', phone: '01 41 38 20 00', category: 'pac_equipement', companyId: 'co_tp' },
      { id: 'sup_tp2', name: 'Daikin France',               contact: 'Agence Île-de-France',       email: 'pro@daikin.fr',              phone: '01 56 37 24 00', category: 'pac_equipement', companyId: 'co_tp' },
      { id: 'sup_tp3', name: 'Atlantic Climatisation',      contact: 'Service PRO',                email: 'pro@atlantic.fr',            phone: '02 51 44 23 23', category: 'pac_equipement', companyId: 'co_tp' },
      { id: 'sup_tp4', name: 'Rexel IDF',                   contact: 'Agence Versailles',          email: 'versailles@rexel.fr',        phone: '01 39 49 60 00', category: 'accessoires',    companyId: 'co_tp' },
    ],
  });

  // ─── CATALOGUE ECODAN COMPLET (références réelles 2025) ──────────────────
  await prisma.catalogCategory.createMany({
    data: [
      { id: 'cat_tp_eco',   name: 'Eco Inverter (R32)',           sortOrder: 1, companyId: 'co_tp' },
      { id: 'cat_tp_ecop',  name: 'Eco Inverter+ Hyper Heating',  sortOrder: 2, companyId: 'co_tp' },
      { id: 'cat_tp_pow',   name: 'Power Inverter Silence',        sortOrder: 3, companyId: 'co_tp' },
      { id: 'cat_tp_zub',   name: 'Zubadan Silence',               sortOrder: 4, companyId: 'co_tp' },
      { id: 'cat_tp_hyd',   name: 'Hydrosplit',                    sortOrder: 5, companyId: 'co_tp' },
      { id: 'cat_tp_mod',   name: 'Modules hydrauliques',          sortOrder: 6, companyId: 'co_tp' },
      { id: 'cat_tp_acc',   name: 'Accessoires & connectivité',    sortOrder: 7, companyId: 'co_tp' },
      { id: 'cat_tp_mo',    name: "Main d'œuvre & services",       sortOrder: 8, companyId: 'co_tp' },
    ],
  });

  await prisma.catalogProduct.createMany({
    data: [
      // ── ECO INVERTER (R32) — groupes extérieurs split ──────────────────
      { reference: 'SUZ-SWM30VA',    designation: 'Mitsubishi Ecodan Eco Inverter 3 kW — groupe ext. split R32',         unit: 'unité',   salePrice: 1690,  costPrice: 1190,  lineType: 'purchase', categoryId: 'cat_tp_eco', companyId: 'co_tp' },
      { reference: 'SUZ-SWM40VA2',   designation: 'Mitsubishi Ecodan Eco Inverter 4 kW — groupe ext. split R32',         unit: 'unité',   salePrice: 1920,  costPrice: 1350,  lineType: 'purchase', categoryId: 'cat_tp_eco', companyId: 'co_tp' },
      { reference: 'SUZ-SWM60VA2',   designation: 'Mitsubishi Ecodan Eco Inverter 6 kW — groupe ext. split R32',         unit: 'unité',   salePrice: 2520,  costPrice: 1780,  lineType: 'purchase', categoryId: 'cat_tp_eco', companyId: 'co_tp' },
      { reference: 'SUZ-SWM80VA2',   designation: 'Mitsubishi Ecodan Eco Inverter 8 kW — groupe ext. split R32',         unit: 'unité',   salePrice: 3090,  costPrice: 2180,  lineType: 'purchase', categoryId: 'cat_tp_eco', companyId: 'co_tp' },
      { reference: 'SUZ-SWM100VA',   designation: 'Mitsubishi Ecodan Eco Inverter 10 kW — groupe ext. split R32',        unit: 'unité',   salePrice: 3750,  costPrice: 2650,  lineType: 'purchase', categoryId: 'cat_tp_eco', companyId: 'co_tp' },
      // ── ECO INVERTER+ HYPER HEATING (R32) ─────────────────────────────
      { reference: 'SUZ-SHWM30VAH',  designation: 'Mitsubishi Ecodan Eco Inverter+ 3 kW Hyper Heating R32',              unit: 'unité',   salePrice: 1970,  costPrice: 1390,  lineType: 'purchase', categoryId: 'cat_tp_ecop', companyId: 'co_tp' },
      { reference: 'SUZ-SHWM40VAH',  designation: 'Mitsubishi Ecodan Eco Inverter+ 4 kW Hyper Heating R32',              unit: 'unité',   salePrice: 2260,  costPrice: 1590,  lineType: 'purchase', categoryId: 'cat_tp_ecop', companyId: 'co_tp' },
      { reference: 'SUZ-SHWM60VAH',  designation: 'Mitsubishi Ecodan Eco Inverter+ 6 kW Hyper Heating R32',              unit: 'unité',   salePrice: 2950,  costPrice: 2080,  lineType: 'purchase', categoryId: 'cat_tp_ecop', companyId: 'co_tp' },
      // ── POWER INVERTER SILENCE (R32) ───────────────────────────────────
      { reference: 'PUZ-SWM80VAA',   designation: 'Mitsubishi Ecodan Power Inverter Silence 8 kW mono R32',              unit: 'unité',   salePrice: 3470,  costPrice: 2450,  lineType: 'purchase', categoryId: 'cat_tp_pow', companyId: 'co_tp' },
      { reference: 'PUZ-SWM80YAA',   designation: 'Mitsubishi Ecodan Power Inverter Silence 8 kW tri R32',               unit: 'unité',   salePrice: 3610,  costPrice: 2550,  lineType: 'purchase', categoryId: 'cat_tp_pow', companyId: 'co_tp' },
      { reference: 'PUZ-SWM100VAA',  designation: 'Mitsubishi Ecodan Power Inverter Silence 10 kW mono R32',             unit: 'unité',   salePrice: 4180,  costPrice: 2950,  lineType: 'purchase', categoryId: 'cat_tp_pow', companyId: 'co_tp' },
      { reference: 'PUZ-SWM120VAA',  designation: 'Mitsubishi Ecodan Power Inverter Silence 12 kW mono R32',             unit: 'unité',   salePrice: 4930,  costPrice: 3480,  lineType: 'purchase', categoryId: 'cat_tp_pow', companyId: 'co_tp' },
      { reference: 'PUHZ-SW220VKA',  designation: 'Mitsubishi Ecodan Power Inverter 22 kW — grande puissance R410A',     unit: 'unité',   salePrice: 7050,  costPrice: 4980,  lineType: 'purchase', categoryId: 'cat_tp_pow', companyId: 'co_tp' },
      { reference: 'PUHZ-SW250VKA',  designation: 'Mitsubishi Ecodan Power Inverter 25 kW — grande puissance R410A',     unit: 'unité',   salePrice: 8040,  costPrice: 5680,  lineType: 'purchase', categoryId: 'cat_tp_pow', companyId: 'co_tp' },
      // ── ZUBADAN SILENCE (R32) — super chauffage ────────────────────────
      { reference: 'PUZ-SHWM80VAA',  designation: 'Mitsubishi Ecodan Zubadan Silence 8 kW mono R32 — 70°C à -7°C',      unit: 'unité',   salePrice: 4460,  costPrice: 3150,  lineType: 'purchase', categoryId: 'cat_tp_zub', companyId: 'co_tp' },
      { reference: 'PUZ-SHWM80YAA',  designation: 'Mitsubishi Ecodan Zubadan Silence 8 kW tri R32',                      unit: 'unité',   salePrice: 4640,  costPrice: 3280,  lineType: 'purchase', categoryId: 'cat_tp_zub', companyId: 'co_tp' },
      { reference: 'PUZ-SHWM100VAA', designation: 'Mitsubishi Ecodan Zubadan Silence 10 kW mono R32',                    unit: 'unité',   salePrice: 5210,  costPrice: 3680,  lineType: 'purchase', categoryId: 'cat_tp_zub', companyId: 'co_tp' },
      { reference: 'PUZ-SHWM100YAA', designation: 'Mitsubishi Ecodan Zubadan Silence 10 kW tri R32',                     unit: 'unité',   salePrice: 5410,  costPrice: 3820,  lineType: 'purchase', categoryId: 'cat_tp_zub', companyId: 'co_tp' },
      { reference: 'PUZ-SHWM120VAA', designation: 'Mitsubishi Ecodan Zubadan Silence 12 kW mono R32',                    unit: 'unité',   salePrice: 6010,  costPrice: 4250,  lineType: 'purchase', categoryId: 'cat_tp_zub', companyId: 'co_tp' },
      { reference: 'PUZ-SHWM140VAA', designation: 'Mitsubishi Ecodan Zubadan Silence 14 kW mono R32 — rénovation',       unit: 'unité',   salePrice: 7050,  costPrice: 4980,  lineType: 'purchase', categoryId: 'cat_tp_zub', companyId: 'co_tp' },
      { reference: 'PUZ-SHWM140YAA', designation: 'Mitsubishi Ecodan Zubadan Silence 14 kW tri R32',                     unit: 'unité',   salePrice: 7330,  costPrice: 5180,  lineType: 'purchase', categoryId: 'cat_tp_zub', companyId: 'co_tp' },
      { reference: 'PUHZ-SHW230YKA2',designation: 'Mitsubishi Ecodan Zubadan 23 kW tri R410A — collectif',               unit: 'unité',   salePrice: 9130,  costPrice: 6450,  lineType: 'purchase', categoryId: 'cat_tp_zub', companyId: 'co_tp' },
      // ── HYDROSPLIT ─────────────────────────────────────────────────────
      { reference: 'PUZ-WZ50VHA',    designation: 'Mitsubishi Ecodan Eco Inv. Silence R290 5 kW hydrosplit — NOUVEAU',   unit: 'unité',   salePrice: 3940,  costPrice: 2780,  lineType: 'purchase', categoryId: 'cat_tp_hyd', companyId: 'co_tp' },
      { reference: 'PUZ-WZ60VHA',    designation: 'Mitsubishi Ecodan Eco Inv. Silence R290 6 kW hydrosplit — NOUVEAU',   unit: 'unité',   salePrice: 4220,  costPrice: 2980,  lineType: 'purchase', categoryId: 'cat_tp_hyd', companyId: 'co_tp' },
      { reference: 'PUZ-WZ80VAA',    designation: 'Mitsubishi Ecodan Power Inv. HT Silence R290 8 kW hydrosplit',        unit: 'unité',   salePrice: 4930,  costPrice: 3480,  lineType: 'purchase', categoryId: 'cat_tp_hyd', companyId: 'co_tp' },
      { reference: 'PUZ-WZ100VAA',   designation: 'Mitsubishi Ecodan Power Inv. HT Silence R290 10 kW hydrosplit',       unit: 'unité',   salePrice: 5730,  costPrice: 4050,  lineType: 'purchase', categoryId: 'cat_tp_hyd', companyId: 'co_tp' },
      { reference: 'PUZ-WM85VAA',    designation: 'Mitsubishi Ecodan Power Inverter Silence 9 kW hydrosplit R32',        unit: 'unité',   salePrice: 5070,  costPrice: 3580,  lineType: 'purchase', categoryId: 'cat_tp_hyd', companyId: 'co_tp' },
      { reference: 'PUZ-HWM140VHA',  designation: 'Mitsubishi Ecodan Zubadan 14 kW hydrosplit R32 — -30°C',              unit: 'unité',   salePrice: 7760,  costPrice: 5480,  lineType: 'purchase', categoryId: 'cat_tp_hyd', companyId: 'co_tp' },
      // ── MODULES HYDRAULIQUES ───────────────────────────────────────────
      { reference: 'ERSD-VM6E',      designation: 'Module hydraulique Ecodan chauffage seul mural — SUZ-SWM 3-6kW',      unit: 'unité',   salePrice: 2620,  costPrice: 1850,  lineType: 'purchase', categoryId: 'cat_tp_mod', companyId: 'co_tp' },
      { reference: 'ERSF-VM6E',      designation: 'Module hydraulique Ecodan chauffage seul mural — PUZ-SWM/SHWM 8-14kW mono', unit: 'unité', salePrice: 2900, costPrice: 2050, lineType: 'purchase', categoryId: 'cat_tp_mod', companyId: 'co_tp' },
      { reference: 'ERSF-YM9E',      designation: 'Module hydraulique Ecodan chauffage seul mural triphasé — PUZ-SHWM 8-14kW tri', unit: 'unité', salePrice: 3090, costPrice: 2180, lineType: 'purchase', categoryId: 'cat_tp_mod', companyId: 'co_tp' },
      { reference: 'ERST17D-VM6BE',  designation: 'Module Ecodan Duo ECS 170L 2 zones — SUZ-SWM/PUZ-SHWM 3-14kW',      unit: 'unité',   salePrice: 5070,  costPrice: 3580,  lineType: 'purchase', categoryId: 'cat_tp_mod', companyId: 'co_tp' },
      { reference: 'ERST20D-VM6E',   designation: 'Module Ecodan Duo ECS 200L — SUZ-SWM Eco Inverter 3-10kW',           unit: 'unité',   salePrice: 5310,  costPrice: 3750,  lineType: 'purchase', categoryId: 'cat_tp_mod', companyId: 'co_tp' },
      { reference: 'ERST20F-VM6E',   designation: 'Module Ecodan Duo ECS 200L — PUZ-SWM/SHWM Power/Zubadan mono',      unit: 'unité',   salePrice: 5590,  costPrice: 3950,  lineType: 'purchase', categoryId: 'cat_tp_mod', companyId: 'co_tp' },
      { reference: 'ERST20F-YM9E',   designation: 'Module Ecodan Duo ECS 200L triphasé — PUZ-SHWM Zubadan tri',        unit: 'unité',   salePrice: 5780,  costPrice: 4080,  lineType: 'purchase', categoryId: 'cat_tp_mod', companyId: 'co_tp' },
      { reference: 'ERST30F-VM6EE',  designation: 'Module Ecodan Duo ECS 300L — PUZ-SWM/SHWM Power/Zubadan mono',      unit: 'unité',   salePrice: 6760,  costPrice: 4780,  lineType: 'purchase', categoryId: 'cat_tp_mod', companyId: 'co_tp' },
      { reference: 'ERPX-VM6E',      designation: 'Module hydraulique Ecodan hydrosplit chauffage seul — PUZ-WM/WZ',    unit: 'unité',   salePrice: 3230,  costPrice: 2280,  lineType: 'purchase', categoryId: 'cat_tp_mod', companyId: 'co_tp' },
      { reference: 'ERPT20X-VM6E',   designation: 'Module Ecodan Duo hydrosplit ECS 200L — PUZ-WM/WZ',                  unit: 'unité',   salePrice: 5920,  costPrice: 4180,  lineType: 'purchase', categoryId: 'cat_tp_mod', companyId: 'co_tp' },
      // ── ACCESSOIRES & CONNECTIVITÉ ─────────────────────────────────────
      { reference: 'MAC-587IF-E',    designation: 'Interface Wi-Fi MELCloud Home — pilotage à distance Ecodan',           unit: 'unité',   salePrice: 248,   costPrice: 175,   lineType: 'purchase', categoryId: 'cat_tp_acc', companyId: 'co_tp' },
      { reference: 'PAR-WT60R-E',    designation: 'Télécommande sans fil + récepteur PAR-WR61R-E',                       unit: 'forfait', salePrice: 298,   costPrice: 210,   lineType: 'purchase', categoryId: 'cat_tp_acc', companyId: 'co_tp' },
      { reference: 'ACC-FLUIDE',     designation: 'Raccordements frigorifiques split + mise en charge R32 (forfait)',     unit: 'forfait', salePrice: 480,   costPrice: 290,   lineType: 'service',  categoryId: 'cat_tp_acc', companyId: 'co_tp' },
      { reference: 'ACC-ELEC',       designation: 'Câblage électrique + disjoncteur dédié + mise à la terre',            unit: 'forfait', salePrice: 520,   costPrice: 310,   lineType: 'service',  categoryId: 'cat_tp_acc', companyId: 'co_tp' },
      { reference: 'ACC-DEPOSE',     designation: 'Dépose ancienne chaudière + évacuation déchets',                      unit: 'unité',   salePrice: 480,   costPrice: 290,   lineType: 'service',  categoryId: 'cat_tp_acc', companyId: 'co_tp' },
      { reference: 'ACC-ROBINET',    designation: 'Remplacement robinet thermostatique (par pièce)',                      unit: 'unité',   salePrice: 45,    costPrice: 25,    lineType: 'service',  categoryId: 'cat_tp_acc', companyId: 'co_tp' },
      { reference: 'ACC-PLANCHER',   designation: 'Raccordement plancher chauffant hydraulique (forfait)',                unit: 'forfait', salePrice: 1400,  costPrice: 850,   lineType: 'service',  categoryId: 'cat_tp_acc', companyId: 'co_tp' },
      // ── MAIN D'ŒUVRE & SERVICES ────────────────────────────────────────
      { reference: 'MO-VISITE',      designation: 'Visite technique + bilan thermique sur site',                         unit: 'forfait', salePrice: 280,   costPrice: 130,   lineType: 'service',  categoryId: 'cat_tp_mo', companyId: 'co_tp' },
      { reference: 'MO-TECH',        designation: 'Technicien PAC certifié RGE (heure)',                                 unit: 'h',       salePrice: 78,    costPrice: 45,    lineType: 'service',  categoryId: 'cat_tp_mo', companyId: 'co_tp' },
      { reference: 'MO-MES',         designation: 'Mise en service constructeur + paramétrage + formation client',       unit: 'forfait', salePrice: 750,   costPrice: 420,   lineType: 'service',  categoryId: 'cat_tp_mo', companyId: 'co_tp' },
      { reference: 'MO-ENTRETIEN',   designation: 'Contrat entretien annuel PAC (obligatoire 4-70 kW)',                  unit: 'forfait', salePrice: 280,   costPrice: 140,   lineType: 'service',  categoryId: 'cat_tp_mo', companyId: 'co_tp' },
      { reference: 'MO-DEPL',        designation: 'Déplacement technicien (par km)',                                     unit: 'km',      salePrice: 0.95,  costPrice: 0.48,  lineType: 'service',  categoryId: 'cat_tp_mo', companyId: 'co_tp' },
    ],
  });

  // ─── DEVIS (30) ───────────────────────────────────────────────────────────
  await prisma.quote.createMany({
    data: [
      // ── Acceptés (11) ──
      { id: 'q_tp01', reference: 'DEV-TP-2025-001', subject: 'PAC Ecodan 12kW + ballon ECS — Famille Dupont, Versailles',          amount: 13706, status: 'accepted', validUntil: new Date('2025-07-15'), vatMode: 'normal' as any, clientId: 'cl_tp01', companyId: 'co_tp' },
      { id: 'q_tp02', reference: 'DEV-TP-2025-002', subject: 'PAC Daikin Altherma 8kW — Mme Leroy, Boulogne',                      amount:  8814, status: 'accepted', validUntil: new Date('2025-08-30'), vatMode: 'normal' as any, clientId: 'cl_tp02', companyId: 'co_tp' },
      { id: 'q_tp03', reference: 'DEV-TP-2025-003', subject: 'PAC Ecodan 6kW — M. et Mme Fontaine, Rueil',                         amount:  9620, status: 'accepted', validUntil: new Date('2025-03-31'), vatMode: 'normal' as any, clientId: 'cl_tp04', companyId: 'co_tp' },
      { id: 'q_tp04', reference: 'DEV-TP-2025-004', subject: 'PAC Daikin 8kW — Famille Renard, Meudon',                            amount:  8350, status: 'accepted', validUntil: new Date('2025-09-15'), vatMode: 'normal' as any, clientId: 'cl_tp06', companyId: 'co_tp' },
      { id: 'q_tp05', reference: 'DEV-TP-2025-005', subject: 'PAC Ecodan 8kW — M. Lombard, Vincennes',                             amount:  9100, status: 'accepted', validUntil: new Date('2025-10-01'), vatMode: 'normal' as any, clientId: 'cl_tp07', companyId: 'co_tp' },
      { id: 'q_tp06', reference: 'DEV-TP-2025-006', subject: 'PAC Daikin 12kW + plancher chauffant — Famille Perrin, Versailles',  amount: 12800, status: 'accepted', validUntil: new Date('2025-10-30'), vatMode: 'normal' as any, clientId: 'cl_tp08', companyId: 'co_tp' },
      { id: 'q_tp07', reference: 'DEV-TP-2025-007', subject: 'PAC Ecodan 6kW — Mme Bonnet, Sceaux',                               amount:  8900, status: 'accepted', validUntil: new Date('2025-11-15'), vatMode: 'normal' as any, clientId: 'cl_tp09', companyId: 'co_tp' },
      { id: 'q_tp08', reference: 'DEV-TP-2025-008', subject: 'PAC Daikin 8kW — M. Faure, Chaville',                               amount:  8600, status: 'accepted', validUntil: new Date('2025-12-01'), vatMode: 'normal' as any, clientId: 'cl_tp10', companyId: 'co_tp' },
      { id: 'q_tp09', reference: 'DEV-TP-2025-009', subject: 'PAC Ecodan 12kW — M. et Mme Girard, Maisons-Laffitte',              amount: 12400, status: 'accepted', validUntil: new Date('2025-12-31'), vatMode: 'normal' as any, clientId: 'cl_tp11', companyId: 'co_tp' },
      { id: 'q_tp10', reference: 'DEV-TP-2026-001', subject: 'PAC eau-eau 20kW + plancher chauffant — M. Benzara, St-Germain',    amount: 16408, status: 'accepted', validUntil: new Date('2026-06-30'), vatMode: 'normal' as any, clientId: 'cl_tp03', companyId: 'co_tp' },
      { id: 'q_tp11', reference: 'DEV-TP-2026-002', subject: '16 PAC Daikin 8kW — Foncia Versailles (résidence 16 lots)',          amount: 98400, status: 'accepted', validUntil: new Date('2026-03-31'), vatMode: 'normal' as any, clientId: 'cl_tp16', companyId: 'co_tp' },
      // ── Envoyés en attente (7) ──
      { id: 'q_tp12', reference: 'DEV-TP-2026-003', subject: 'PAC Ecodan 8kW — Mme Vidal, Antony',                                amount:  9200, status: 'sent',     validUntil: new Date('2026-05-15'), vatMode: 'normal' as any, clientId: 'cl_tp12', companyId: 'co_tp' },
      { id: 'q_tp13', reference: 'DEV-TP-2026-004', subject: 'PAC Daikin 6kW — M. Morin, Le Chesnay',                             amount:  7800, status: 'sent',     validUntil: new Date('2026-05-20'), vatMode: 'normal' as any, clientId: 'cl_tp13', companyId: 'co_tp' },
      { id: 'q_tp14', reference: 'DEV-TP-2026-005', subject: 'PAC Ecodan 12kW + ECS — Famille Leclerc, Vélizy',                   amount: 13100, status: 'sent',     validUntil: new Date('2026-05-31'), vatMode: 'normal' as any, clientId: 'cl_tp14', companyId: 'co_tp' },
      { id: 'q_tp15', reference: 'DEV-TP-2026-006', subject: 'PAC Daikin 8kW — Mme Schmitt, Versailles',                          amount:  8900, status: 'sent',     validUntil: new Date('2026-06-01'), vatMode: 'normal' as any, clientId: 'cl_tp15', companyId: 'co_tp' },
      { id: 'q_tp16', reference: 'DEV-TP-2026-007', subject: '8 PAC Ecodan 12kW — Nexity Promotion IDF (programme neuf)',         amount: 68800, status: 'sent',     validUntil: new Date('2026-06-15'), vatMode: 'normal' as any, clientId: 'cl_tp17', companyId: 'co_tp' },
      { id: 'q_tp17', reference: 'DEV-TP-2026-008', subject: '12 PAC Daikin 8kW — CDC Habitat (rénovation résidence sociale)',    amount: 74400, status: 'sent',     validUntil: new Date('2026-06-30'), vatMode: 'normal' as any, clientId: 'cl_tp23', companyId: 'co_tp' },
      { id: 'q_tp18', reference: 'DEV-TP-2026-009', subject: 'PAC eau-eau 30kW — Mairie de Meudon (bâtiment public)',             amount: 28500, status: 'sent',     validUntil: new Date('2026-07-01'), vatMode: 'normal' as any, clientId: 'cl_tp24', companyId: 'co_tp' },
      // ── Brouillons (6) ──
      { id: 'q_tp19', reference: 'DEV-TP-2026-010', subject: '20 PAC Ecodan 8kW — Vinci Immobilier (résidence 20 lots)',          amount: 132000, status: 'draft',   validUntil: new Date('2026-08-01'), vatMode: 'normal' as any, clientId: 'cl_tp20', companyId: 'co_tp' },
      { id: 'q_tp20', reference: 'DEV-TP-2026-011', subject: '6 PAC Daikin 12kW — Kaufman & Broad (programme mixte)',             amount: 52200, status: 'draft',    validUntil: new Date('2026-08-15'), vatMode: 'normal' as any, clientId: 'cl_tp22', companyId: 'co_tp' },
      { id: 'q_tp21', reference: 'DEV-TP-2026-012', subject: 'PAC Ecodan 14kW — Résidences Idéales (maison individuelle 220m²)', amount: 15200, status: 'draft',    validUntil: new Date('2026-07-30'), vatMode: 'normal' as any, clientId: 'cl_tp25', companyId: 'co_tp' },
      { id: 'q_tp22', reference: 'DEV-TP-2026-013', subject: 'PAC Daikin 4kW — Mme Bonnet, Sceaux (studio)',                     amount:  6200, status: 'draft',    validUntil: new Date('2026-07-15'), vatMode: 'normal' as any, clientId: 'cl_tp09', companyId: 'co_tp' },
      { id: 'q_tp23', reference: 'DEV-TP-2026-014', subject: 'PAC eau-eau 20kW + forage — Icade Résidentiel',                    amount: 32000, status: 'draft',    validUntil: new Date('2026-09-01'), vatMode: 'normal' as any, clientId: 'cl_tp18', companyId: 'co_tp' },
      { id: 'q_tp24', reference: 'DEV-TP-2026-015', subject: '4 PAC Ecodan 12kW — OPH Yvelines (logements sociaux)',             amount: 38800, status: 'draft',    validUntil: new Date('2026-09-15'), vatMode: 'normal' as any, clientId: 'cl_tp19', companyId: 'co_tp' },
      // ── Refusés (4) ──
      { id: 'q_tp25', reference: 'DEV-TP-2025-010', subject: 'PAC tertiaire multi-split — SCI Grenelle (Paris 7e)',               amount: 38500, status: 'refused',  validUntil: new Date('2025-04-01'), vatMode: 'normal' as any, clientId: 'cl_tp05', companyId: 'co_tp' },
      { id: 'q_tp26', reference: 'DEV-TP-2025-011', subject: 'PAC eau-eau 30kW — Citya Boulogne (refus budget)',                  amount: 41000, status: 'refused',  validUntil: new Date('2025-06-01'), vatMode: 'normal' as any, clientId: 'cl_tp21', companyId: 'co_tp' },
      { id: 'q_tp27', reference: 'DEV-TP-2025-012', subject: 'PAC Daikin 16kW — M. Lombard, Vincennes (2e demande, refus)',      amount: 14200, status: 'refused',  validUntil: new Date('2025-10-15'), vatMode: 'normal' as any, clientId: 'cl_tp07', companyId: 'co_tp' },
      { id: 'q_tp28', reference: 'DEV-TP-2026-016', subject: 'PAC Ecodan 8kW — Mme Faure, Chaville (concurrence)',               amount:  9400, status: 'refused',  validUntil: new Date('2026-04-01'), vatMode: 'normal' as any, clientId: 'cl_tp10', companyId: 'co_tp' },
      // ── Expiré / annulé (2) ──
      { id: 'q_tp29', reference: 'DEV-TP-2025-013', subject: 'PAC Ecodan 12kW — prospect perdu (no-show visite)',                 amount: 12000, status: 'draft',    validUntil: new Date('2025-05-01'), vatMode: 'normal' as any, clientId: 'cl_tp15', companyId: 'co_tp' },
      { id: 'q_tp30', reference: 'DEV-TP-2025-014', subject: 'PAC Daikin 8kW — Famille Perrin (annulé avant signature)',          amount:  8500, status: 'refused',  validUntil: new Date('2025-09-30'), vatMode: 'normal' as any, clientId: 'cl_tp08', companyId: 'co_tp' },
    ],
  });

  // Quote lines (lignes représentatives pour les principaux devis)
  await prisma.quoteLine.createMany({
    data: [
      // q_tp01 — Dupont 12kW
      { quoteId: 'q_tp01', designation: 'Mitsubishi Ecodan PUHZ-SW120VKA — 12kW',    unit: 'unité',   quantity: 1,  unitPrice: 7200, costPrice: 4800, vatRate: 5.5, sortOrder: 0 },
      { quoteId: 'q_tp01', designation: 'Ballon tampon ECS intégré EHST20D (200L)',   unit: 'unité',   quantity: 1,  unitPrice: 2550, costPrice: 1700, vatRate: 5.5, sortOrder: 1 },
      { quoteId: 'q_tp01', designation: "Kit circulateur + vase d'expansion",          unit: 'forfait', quantity: 1,  unitPrice: 520,  costPrice: 320,  vatRate: 5.5, sortOrder: 2 },
      { quoteId: 'q_tp01', designation: 'Raccordements frigorifiques R32',             unit: 'forfait', quantity: 1,  unitPrice: 420,  costPrice: 250,  vatRate: 5.5, sortOrder: 3 },
      { quoteId: 'q_tp01', designation: 'Câblage électrique + disjoncteur',            unit: 'forfait', quantity: 1,  unitPrice: 460,  costPrice: 280,  vatRate: 5.5, sortOrder: 4 },
      { quoteId: 'q_tp01', designation: 'Dépose chaudière fioul + évacuation',         unit: 'unité',   quantity: 1,  unitPrice: 450,  costPrice: 280,  vatRate: 5.5, sortOrder: 5 },
      { quoteId: 'q_tp01', designation: 'Robinets thermostatiques',                   unit: 'unité',   quantity: 8,  unitPrice: 38,   costPrice: 22,   vatRate: 5.5, sortOrder: 6 },
      { quoteId: 'q_tp01', designation: 'Technicien PAC certifié',                    unit: 'h',       quantity: 16, unitPrice: 72,   costPrice: 42,   vatRate: 5.5, sortOrder: 7 },
      { quoteId: 'q_tp01', designation: 'Mise en service + formation client',          unit: 'forfait', quantity: 1,  unitPrice: 650,  costPrice: 380,  vatRate: 5.5, sortOrder: 8 },
      // q_tp02 — Leroy 8kW
      { quoteId: 'q_tp02', designation: 'Daikin Altherma 3 EDLA08D3V3 — 8kW',        unit: 'unité',   quantity: 1,  unitPrice: 5250, costPrice: 3500, vatRate: 5.5, sortOrder: 0 },
      { quoteId: 'q_tp02', designation: "Kit circulateur + vase d'expansion",          unit: 'forfait', quantity: 1,  unitPrice: 520,  costPrice: 320,  vatRate: 5.5, sortOrder: 1 },
      { quoteId: 'q_tp02', designation: 'Raccordements frigorifiques',                 unit: 'forfait', quantity: 1,  unitPrice: 420,  costPrice: 250,  vatRate: 5.5, sortOrder: 2 },
      { quoteId: 'q_tp02', designation: 'Câblage électrique + disjoncteur',            unit: 'forfait', quantity: 1,  unitPrice: 460,  costPrice: 280,  vatRate: 5.5, sortOrder: 3 },
      { quoteId: 'q_tp02', designation: 'Dépose chaudière gaz + évacuation',           unit: 'unité',   quantity: 1,  unitPrice: 450,  costPrice: 280,  vatRate: 5.5, sortOrder: 4 },
      { quoteId: 'q_tp02', designation: 'Robinets thermostatiques',                   unit: 'unité',   quantity: 6,  unitPrice: 38,   costPrice: 22,   vatRate: 5.5, sortOrder: 5 },
      { quoteId: 'q_tp02', designation: 'Technicien PAC certifié',                    unit: 'h',       quantity: 12, unitPrice: 72,   costPrice: 42,   vatRate: 5.5, sortOrder: 6 },
      { quoteId: 'q_tp02', designation: 'Mise en service + formation',                 unit: 'forfait', quantity: 1,  unitPrice: 650,  costPrice: 380,  vatRate: 5.5, sortOrder: 7 },
      // q_tp03 — Fontaine 6kW
      { quoteId: 'q_tp03', designation: 'Mitsubishi Ecodan PUHZ-SW60VKA — 6kW',      unit: 'unité',   quantity: 1,  unitPrice: 4350, costPrice: 2900, vatRate: 5.5, sortOrder: 0 },
      { quoteId: 'q_tp03', designation: 'Module hydraulique EHPT20X',                 unit: 'unité',   quantity: 1,  unitPrice: 2050, costPrice: 1350, vatRate: 5.5, sortOrder: 1 },
      { quoteId: 'q_tp03', designation: "Kit circulateur + vase d'expansion",          unit: 'forfait', quantity: 1,  unitPrice: 520,  costPrice: 320,  vatRate: 5.5, sortOrder: 2 },
      { quoteId: 'q_tp03', designation: 'Raccordements frigorifiques R32',             unit: 'forfait', quantity: 1,  unitPrice: 420,  costPrice: 250,  vatRate: 5.5, sortOrder: 3 },
      { quoteId: 'q_tp03', designation: 'Câblage électrique + disjoncteur',            unit: 'forfait', quantity: 1,  unitPrice: 460,  costPrice: 280,  vatRate: 5.5, sortOrder: 4 },
      { quoteId: 'q_tp03', designation: 'Dépose chaudière électrique',                unit: 'unité',   quantity: 1,  unitPrice: 450,  costPrice: 280,  vatRate: 5.5, sortOrder: 5 },
      { quoteId: 'q_tp03', designation: 'Technicien PAC certifié',                    unit: 'h',       quantity: 10, unitPrice: 72,   costPrice: 42,   vatRate: 5.5, sortOrder: 6 },
      { quoteId: 'q_tp03', designation: 'Mise en service + formation',                 unit: 'forfait', quantity: 1,  unitPrice: 650,  costPrice: 380,  vatRate: 5.5, sortOrder: 7 },
      // q_tp10 — Benzara eau-eau
      { quoteId: 'q_tp10', designation: 'Atlantic Alféa Excellia 20kW — PAC eau-eau', unit: 'unité',   quantity: 1,  unitPrice: 10800,costPrice: 7200, vatRate: 5.5, sortOrder: 0 },
      { quoteId: 'q_tp10', designation: 'Ballon ECS 200L',                            unit: 'unité',   quantity: 1,  unitPrice: 950,  costPrice: 600,  vatRate: 5.5, sortOrder: 1 },
      { quoteId: 'q_tp10', designation: 'Raccordement plancher chauffant',             unit: 'forfait', quantity: 1,  unitPrice: 1300, costPrice: 800,  vatRate: 5.5, sortOrder: 2 },
      { quoteId: 'q_tp10', designation: "Kit circulateur + vase d'expansion",          unit: 'forfait', quantity: 1,  unitPrice: 520,  costPrice: 320,  vatRate: 5.5, sortOrder: 3 },
      { quoteId: 'q_tp10', designation: 'Câblage électrique + disjoncteur',            unit: 'forfait', quantity: 1,  unitPrice: 460,  costPrice: 280,  vatRate: 5.5, sortOrder: 4 },
      { quoteId: 'q_tp10', designation: 'Technicien PAC certifié',                    unit: 'h',       quantity: 24, unitPrice: 72,   costPrice: 42,   vatRate: 5.5, sortOrder: 5 },
      { quoteId: 'q_tp10', designation: 'Mise en service + formation',                 unit: 'forfait', quantity: 1,  unitPrice: 650,  costPrice: 380,  vatRate: 5.5, sortOrder: 6 },
      // q_tp11 — Foncia 16 PAC
      { quoteId: 'q_tp11', designation: 'Daikin Altherma 3 EDLA08D3V3 × 16',         unit: 'unité',   quantity: 16, unitPrice: 5250, costPrice: 3500, vatRate: 5.5, sortOrder: 0 },
      { quoteId: 'q_tp11', designation: "Kits hydrauliques complets × 16",             unit: 'forfait', quantity: 16, unitPrice: 520,  costPrice: 320,  vatRate: 5.5, sortOrder: 1 },
      { quoteId: 'q_tp11', designation: 'Installation + mise en service × 16',        unit: 'forfait', quantity: 16, unitPrice: 1000, costPrice: 620,  vatRate: 5.5, sortOrder: 2 },
    ],
  });

  // ─── CHANTIERS (18) ───────────────────────────────────────────────────────
  await prisma.job.createMany({
    data: [
      // ── Terminés — facturés (7) ──
      { id: 'j_tp01', reference: 'CHT-TP-2025-001', title: 'PAC Ecodan 6kW — Fontaine, Rueil-Malmaison',          address: '23 Rue de la Paix, 92500 Rueil-Malmaison',          status: 'invoiced',     progress: 100, startDate: new Date('2025-02-24'), endDate: new Date('2025-02-26'), quoteId: 'q_tp03', clientId: 'cl_tp04', companyId: 'co_tp' },
      { id: 'j_tp02', reference: 'CHT-TP-2025-002', title: 'PAC Daikin 8kW — Famille Renard, Meudon',             address: '3 Impasse du Moulin, 92190 Meudon',                  status: 'invoiced',     progress: 100, startDate: new Date('2025-04-07'), endDate: new Date('2025-04-09'), quoteId: 'q_tp04', clientId: 'cl_tp06', companyId: 'co_tp' },
      { id: 'j_tp03', reference: 'CHT-TP-2025-003', title: 'PAC Ecodan 8kW — M. Lombard, Vincennes',              address: '19 Rue Victor Hugo, 94300 Vincennes',                status: 'invoiced',     progress: 100, startDate: new Date('2025-06-02'), endDate: new Date('2025-06-04'), quoteId: 'q_tp05', clientId: 'cl_tp07', companyId: 'co_tp' },
      { id: 'j_tp04', reference: 'CHT-TP-2025-004', title: 'PAC Daikin 12kW + plancher — Famille Perrin, Versailles', address: '56 Chemin des Vignes, 78000 Versailles',         status: 'invoiced',     progress: 100, startDate: new Date('2025-07-14'), endDate: new Date('2025-07-18'), quoteId: 'q_tp06', clientId: 'cl_tp08', companyId: 'co_tp' },
      { id: 'j_tp05', reference: 'CHT-TP-2025-005', title: 'PAC Ecodan 6kW — Mme Bonnet, Sceaux',                 address: "8 Rue de l'Église, 92330 Sceaux",                    status: 'invoiced',     progress: 100, startDate: new Date('2025-09-08'), endDate: new Date('2025-09-10'), quoteId: 'q_tp07', clientId: 'cl_tp09', companyId: 'co_tp' },
      { id: 'j_tp06', reference: 'CHT-TP-2025-006', title: 'PAC Daikin 8kW — M. Faure, Chaville',                 address: '42 Avenue de la Forêt, 92370 Chaville',             status: 'invoiced',     progress: 100, startDate: new Date('2025-10-20'), endDate: new Date('2025-10-22'), quoteId: 'q_tp08', clientId: 'cl_tp10', companyId: 'co_tp' },
      { id: 'j_tp07', reference: 'CHT-TP-2025-007', title: 'PAC Ecodan 12kW — M. et Mme Girard, Maisons-Laffitte',address: '7 Rue du Château, 78600 Maisons-Laffitte',           status: 'invoiced',     progress: 100, startDate: new Date('2025-11-17'), endDate: new Date('2025-11-21'), quoteId: 'q_tp09', clientId: 'cl_tp11', companyId: 'co_tp' },
      // ── En cours (5) ──
      { id: 'j_tp08', reference: 'CHT-TP-2026-001', title: 'PAC Ecodan 12kW + ECS — Famille Dupont, Versailles',  address: '12 Rue des Châtaigniers, 78000 Versailles',          status: 'in_progress',  progress: 65,  startDate: new Date('2026-04-07'), endDate: new Date('2026-04-11'), quoteId: 'q_tp01', clientId: 'cl_tp01', companyId: 'co_tp' },
      { id: 'j_tp09', reference: 'CHT-TP-2026-002', title: 'PAC Daikin 8kW — Mme Leroy, Boulogne-Billancourt',   address: '47 Av. du Gén. de Gaulle, 92100 Boulogne',          status: 'in_progress',  progress: 40,  startDate: new Date('2026-04-08'), endDate: new Date('2026-04-10'), quoteId: 'q_tp02', clientId: 'cl_tp02', companyId: 'co_tp' },
      { id: 'j_tp10', reference: 'CHT-TP-2026-003', title: '16 PAC Daikin 8kW — Foncia Versailles',               address: '18 Rue de la Division, 78000 Versailles',           status: 'in_progress',  progress: 25,  startDate: new Date('2026-04-01'), endDate: new Date('2026-05-15'), quoteId: 'q_tp11', clientId: 'cl_tp16', companyId: 'co_tp' },
      { id: 'j_tp11', reference: 'CHT-TP-2026-004', title: 'PAC eau-eau 20kW — M. Benzara, Saint-Germain',        address: '8 Allée des Roses, 78100 Saint-Germain-en-Laye',    status: 'in_progress',  progress: 10,  startDate: new Date('2026-04-14'), endDate: new Date('2026-04-18'), quoteId: 'q_tp10', clientId: 'cl_tp03', companyId: 'co_tp' },
      { id: 'j_tp12', reference: 'CHT-TP-2026-005', title: 'PAC Ecodan 12kW — Mme Leroy (2e chantier, SAV)',      address: '47 Av. du Gén. de Gaulle, 92100 Boulogne',          status: 'in_progress',  progress: 80,  startDate: new Date('2026-04-10'), endDate: new Date('2026-04-10'), quoteId: null,     clientId: 'cl_tp02', companyId: 'co_tp' },
      // ── Planifiés (4) ──
      { id: 'j_tp13', reference: 'CHT-TP-2026-006', title: 'PAC Ecodan 8kW — Mme Vidal, Antony',                  address: '33 Boulevard du Maréchal, 92160 Antony',            status: 'planned',      progress: 0,   startDate: new Date('2026-04-28'), endDate: new Date('2026-04-29'), quoteId: 'q_tp12', clientId: 'cl_tp12', companyId: 'co_tp' },
      { id: 'j_tp14', reference: 'CHT-TP-2026-007', title: 'PAC Daikin 6kW — M. Morin, Le Chesnay',               address: '12 Rue des Lilas, 78150 Le Chesnay',                status: 'planned',      progress: 0,   startDate: new Date('2026-05-05'), endDate: new Date('2026-05-06'), quoteId: 'q_tp13', clientId: 'cl_tp13', companyId: 'co_tp' },
      { id: 'j_tp15', reference: 'CHT-TP-2026-008', title: 'PAC Ecodan 12kW — Famille Leclerc, Vélizy',            address: '5 Allée des Peupliers, 78140 Vélizy',               status: 'planned',      progress: 0,   startDate: new Date('2026-05-12'), endDate: new Date('2026-05-14'), quoteId: 'q_tp14', clientId: 'cl_tp14', companyId: 'co_tp' },
      { id: 'j_tp16', reference: 'CHT-TP-2026-009', title: '8 PAC Ecodan — Nexity Promotion IDF',                  address: '19 Rue de Vienne, 75008 Paris',                     status: 'planned',      progress: 0,   startDate: new Date('2026-06-01'), endDate: new Date('2026-07-31'), quoteId: 'q_tp16', clientId: 'cl_tp17', companyId: 'co_tp' },
      // ── Terminé non facturé (1) + annulé (1) ──
      { id: 'j_tp17', reference: 'CHT-TP-2025-008', title: 'PAC Daikin 8kW — Leroy, Boulogne (travaux supp.)',     address: '47 Av. du Gén. de Gaulle, 92100 Boulogne',          status: 'completed',    progress: 100, startDate: new Date('2025-08-11'), endDate: new Date('2025-08-13'), quoteId: null,     clientId: 'cl_tp02', companyId: 'co_tp' },
      { id: 'j_tp18', reference: 'CHT-TP-2025-009', title: 'PAC Daikin 12kW — M. Lombard, Vincennes (2e)',         address: '19 Rue Victor Hugo, 94300 Vincennes',               status: 'completed',    progress: 100, startDate: new Date('2025-10-27'), endDate: new Date('2025-10-29'), quoteId: null,     clientId: 'cl_tp07', companyId: 'co_tp' },
    ],
  });

  // ─── JOB ASSIGNMENTS ──────────────────────────────────────────────────────
  await prisma.jobAssignment.createMany({
    data: [
      { jobId: 'j_tp01', userId: 'u_tp_tech01' }, { jobId: 'j_tp01', userId: 'u_tp_tech02' },
      { jobId: 'j_tp02', userId: 'u_tp_tech03' }, { jobId: 'j_tp02', userId: 'u_tp_tech04' },
      { jobId: 'j_tp03', userId: 'u_tp_tech01' }, { jobId: 'j_tp03', userId: 'u_tp_tech05' },
      { jobId: 'j_tp04', userId: 'u_tp_tech02' }, { jobId: 'j_tp04', userId: 'u_tp_tech03' },
      { jobId: 'j_tp05', userId: 'u_tp_tech04' },
      { jobId: 'j_tp06', userId: 'u_tp_tech05' }, { jobId: 'j_tp06', userId: 'u_tp_tech06' },
      { jobId: 'j_tp07', userId: 'u_tp_tech01' }, { jobId: 'j_tp07', userId: 'u_tp_tech02' },
      { jobId: 'j_tp08', userId: 'u_tp_tech01' }, { jobId: 'j_tp08', userId: 'u_tp_tech02' },
      { jobId: 'j_tp09', userId: 'u_tp_tech03' }, { jobId: 'j_tp09', userId: 'u_tp_tech04' },
      { jobId: 'j_tp10', userId: 'u_tp_tech01' }, { jobId: 'j_tp10', userId: 'u_tp_tech02' }, { jobId: 'j_tp10', userId: 'u_tp_tech03' }, { jobId: 'j_tp10', userId: 'u_tp_tech04' },
      { jobId: 'j_tp11', userId: 'u_tp_tech05' }, { jobId: 'j_tp11', userId: 'u_tp_tech06' },
      { jobId: 'j_tp12', userId: 'u_tp_tech03' },
      { jobId: 'j_tp17', userId: 'u_tp_tech05' },
      { jobId: 'j_tp18', userId: 'u_tp_tech06' },
    ],
  });

  // ─── FACTURES (25) ────────────────────────────────────────────────────────
  await prisma.invoice.createMany({
    data: [
      // ── Payées (13) ──
      // Fontaine — acompte + solde
      { id: 'inv_tp01', reference: 'FAC-TP-2025-001', amount: 2886,  status: 'paid',    issuedAt: new Date('2025-02-10'), dueDate: new Date('2025-02-25'), paidAt: new Date('2025-02-18'), clientId: 'cl_tp04', jobId: 'j_tp01', companyId: 'co_tp' },
      { id: 'inv_tp02', reference: 'FAC-TP-2025-002', amount: 6734,  status: 'paid',    issuedAt: new Date('2025-02-28'), dueDate: new Date('2025-03-30'), paidAt: new Date('2025-06-15'), clientId: 'cl_tp04', jobId: 'j_tp01', companyId: 'co_tp' },
      // Renard — solde complet
      { id: 'inv_tp03', reference: 'FAC-TP-2025-003', amount: 2505,  status: 'paid',    issuedAt: new Date('2025-03-20'), dueDate: new Date('2025-04-05'), paidAt: new Date('2025-03-28'), clientId: 'cl_tp06', jobId: 'j_tp02', companyId: 'co_tp' },
      { id: 'inv_tp04', reference: 'FAC-TP-2025-004', amount: 5845,  status: 'paid',    issuedAt: new Date('2025-04-10'), dueDate: new Date('2025-05-10'), paidAt: new Date('2025-04-22'), clientId: 'cl_tp06', jobId: 'j_tp02', companyId: 'co_tp' },
      // Lombard — solde complet
      { id: 'inv_tp05', reference: 'FAC-TP-2025-005', amount: 2730,  status: 'paid',    issuedAt: new Date('2025-05-15'), dueDate: new Date('2025-06-01'), paidAt: new Date('2025-05-20'), clientId: 'cl_tp07', jobId: 'j_tp03', companyId: 'co_tp' },
      { id: 'inv_tp06', reference: 'FAC-TP-2025-006', amount: 6370,  status: 'paid',    issuedAt: new Date('2025-06-05'), dueDate: new Date('2025-07-05'), paidAt: new Date('2025-06-18'), clientId: 'cl_tp07', jobId: 'j_tp03', companyId: 'co_tp' },
      // Perrin — plancher chauffant
      { id: 'inv_tp07', reference: 'FAC-TP-2025-007', amount: 3840,  status: 'paid',    issuedAt: new Date('2025-07-01'), dueDate: new Date('2025-07-15'), paidAt: new Date('2025-07-08'), clientId: 'cl_tp08', jobId: 'j_tp04', companyId: 'co_tp' },
      { id: 'inv_tp08', reference: 'FAC-TP-2025-008', amount: 8960,  status: 'paid',    issuedAt: new Date('2025-07-19'), dueDate: new Date('2025-08-19'), paidAt: new Date('2025-07-30'), clientId: 'cl_tp08', jobId: 'j_tp04', companyId: 'co_tp' },
      // Bonnet + Faure
      { id: 'inv_tp09', reference: 'FAC-TP-2025-009', amount: 8900,  status: 'paid',    issuedAt: new Date('2025-09-11'), dueDate: new Date('2025-10-11'), paidAt: new Date('2025-09-25'), clientId: 'cl_tp09', jobId: 'j_tp05', companyId: 'co_tp' },
      { id: 'inv_tp10', reference: 'FAC-TP-2025-010', amount: 8600,  status: 'paid',    issuedAt: new Date('2025-10-23'), dueDate: new Date('2025-11-23'), paidAt: new Date('2025-11-05'), clientId: 'cl_tp10', jobId: 'j_tp06', companyId: 'co_tp' },
      // Girard — acompte + solde
      { id: 'inv_tp11', reference: 'FAC-TP-2025-011', amount: 3720,  status: 'paid',    issuedAt: new Date('2025-11-10'), dueDate: new Date('2025-11-17'), paidAt: new Date('2025-11-14'), clientId: 'cl_tp11', jobId: 'j_tp07', companyId: 'co_tp' },
      { id: 'inv_tp12', reference: 'FAC-TP-2025-012', amount: 8680,  status: 'paid',    issuedAt: new Date('2025-11-22'), dueDate: new Date('2025-12-22'), paidAt: new Date('2025-12-05'), clientId: 'cl_tp11', jobId: 'j_tp07', companyId: 'co_tp' },
      // Leroy travaux supp. payée
      { id: 'inv_tp13', reference: 'FAC-TP-2025-013', amount: 1850,  status: 'paid',    issuedAt: new Date('2025-08-14'), dueDate: new Date('2025-09-14'), paidAt: new Date('2025-08-28'), clientId: 'cl_tp02', jobId: 'j_tp17', companyId: 'co_tp' },
      // ── En cours / partiellement payées (7) ──
      // Dupont — acompte 30% payé + situation 60% envoyée
      { id: 'inv_tp14', reference: 'FAC-TP-2026-001', amount: 4112,  status: 'paid',    issuedAt: new Date('2026-03-20'), dueDate: new Date('2026-04-05'), paidAt: new Date('2026-03-28'), clientId: 'cl_tp01', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'inv_tp15', reference: 'FAC-TP-2026-002', amount: 4112,  status: 'sent',    issuedAt: new Date('2026-04-10'), dueDate: new Date('2026-05-10'),                                 clientId: 'cl_tp01', jobId: 'j_tp08', companyId: 'co_tp' },
      // Leroy 8kW — acompte payé + solde envoyé
      { id: 'inv_tp16', reference: 'FAC-TP-2026-003', amount: 2644,  status: 'paid',    issuedAt: new Date('2026-03-25'), dueDate: new Date('2026-04-08'), paidAt: new Date('2026-04-01'), clientId: 'cl_tp02', jobId: 'j_tp09', companyId: 'co_tp' },
      { id: 'inv_tp17', reference: 'FAC-TP-2026-004', amount: 6170,  status: 'sent',    issuedAt: new Date('2026-04-10'), dueDate: new Date('2026-05-10'),                                 clientId: 'cl_tp02', jobId: 'j_tp09', companyId: 'co_tp' },
      // Foncia — acompte 30% payé + situation travaux envoyée
      { id: 'inv_tp18', reference: 'FAC-TP-2026-005', amount: 29520, status: 'paid',    issuedAt: new Date('2026-03-28'), dueDate: new Date('2026-04-12'), paidAt: new Date('2026-04-08'), clientId: 'cl_tp16', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'inv_tp19', reference: 'FAC-TP-2026-006', amount: 24600, status: 'sent',    issuedAt: new Date('2026-04-08'), dueDate: new Date('2026-05-08'),                                 clientId: 'cl_tp16', jobId: 'j_tp10', companyId: 'co_tp' },
      // Lombard 2e chantier — envoyé
      { id: 'inv_tp20', reference: 'FAC-TP-2025-014', amount: 3200,  status: 'sent',    issuedAt: new Date('2025-10-30'), dueDate: new Date('2025-11-30'),                                 clientId: 'cl_tp07', jobId: 'j_tp18', companyId: 'co_tp' },
      // ── IMPAYÉES (5) — moment fort démo ──
      // Fontaine — solde IMPAYÉ 45 jours (déjà dans la seed originale)
      { id: 'inv_tp21', reference: 'FAC-TP-2026-007', amount: 6734,  status: 'overdue', issuedAt: new Date('2026-02-28'), dueDate: new Date('2026-03-30'),                                 clientId: 'cl_tp04', jobId: 'j_tp01', companyId: 'co_tp' },
      // Lombard 2e chantier — solde IMPAYÉ 30 jours
      { id: 'inv_tp22', reference: 'FAC-TP-2026-008', amount: 3200,  status: 'overdue', issuedAt: new Date('2026-03-05'), dueDate: new Date('2026-04-05'),                                 clientId: 'cl_tp07', jobId: 'j_tp18', companyId: 'co_tp' },
      // Mme Bonnet — 2e intervention SAV impayée
      { id: 'inv_tp23', reference: 'FAC-TP-2026-009', amount: 480,   status: 'overdue', issuedAt: new Date('2026-03-10'), dueDate: new Date('2026-04-10'),                                 clientId: 'cl_tp09', jobId: null,     companyId: 'co_tp' },
      // M. Morin — acompte refusé (chèque sans provision)
      { id: 'inv_tp24', reference: 'FAC-TP-2026-010', amount: 2340,  status: 'overdue', issuedAt: new Date('2026-04-01'), dueDate: new Date('2026-04-15'),                                 clientId: 'cl_tp13', jobId: null,     companyId: 'co_tp' },
      // Leroy travaux supp. — 2e relance sans réponse
      { id: 'inv_tp25', reference: 'FAC-TP-2025-015', amount: 920,   status: 'overdue', issuedAt: new Date('2025-12-01'), dueDate: new Date('2025-12-31'),                                 clientId: 'cl_tp02', jobId: null,     companyId: 'co_tp' },
    ],
  });

  // ─── PLANNING WEEKS (3) ───────────────────────────────────────────────────
  const wTpS14 = await prisma.teamPlanningWeek.create({ data: { id: 'w_tp_s14', weekStart: new Date('2026-03-30'), status: TeamPlanningStatus.locked, version: 2, lockedAt: new Date('2026-03-27T08:00:00Z'), companyId: 'co_tp', lockedByUserId: 'u_tp_cond' } });
  const wTpS15 = await prisma.teamPlanningWeek.create({ data: { id: 'w_tp_s15', weekStart: new Date('2026-04-07'), status: TeamPlanningStatus.locked, version: 2, lockedAt: new Date('2026-04-04T08:00:00Z'), companyId: 'co_tp', lockedByUserId: 'u_tp_cond' } });
  const wTpS16 = await prisma.teamPlanningWeek.create({ data: { id: 'w_tp_s16', weekStart: new Date('2026-04-14'), status: TeamPlanningStatus.draft,  version: 1, companyId: 'co_tp' } });

  // Slots S14 (semaine passée — tout terminé)
  await prisma.teamPlanningSlot.createMany({
    data: [
      { weekId: wTpS14.id, teamId: teamA.id, userId: 'u_tp_tech01', jobId: 'j_tp08', date: new Date('2026-03-31'), startHour: 8, endHour: 17 },
      { weekId: wTpS14.id, teamId: teamA.id, userId: 'u_tp_tech02', jobId: 'j_tp08', date: new Date('2026-03-31'), startHour: 8, endHour: 17 },
      { weekId: wTpS14.id, teamId: teamA.id, userId: 'u_tp_tech03', jobId: 'j_tp09', date: new Date('2026-03-31'), startHour: 8, endHour: 16 },
      { weekId: wTpS14.id, teamId: teamB.id, userId: 'u_tp_tech04', jobId: 'j_tp09', date: new Date('2026-03-31'), startHour: 8, endHour: 16 },
      { weekId: wTpS14.id, teamId: teamA.id, userId: 'u_tp_tech01', jobId: 'j_tp08', date: new Date('2026-04-01'), startHour: 8, endHour: 17 },
      { weekId: wTpS14.id, teamId: teamA.id, userId: 'u_tp_tech02', jobId: 'j_tp08', date: new Date('2026-04-01'), startHour: 8, endHour: 17 },
      { weekId: wTpS14.id, teamId: teamB.id, userId: 'u_tp_tech05', jobId: 'j_tp11', date: new Date('2026-04-01'), startHour: 8, endHour: 17 },
      { weekId: wTpS14.id, teamId: teamB.id, userId: 'u_tp_tech06', jobId: 'j_tp11', date: new Date('2026-04-01'), startHour: 8, endHour: 17 },
      { weekId: wTpS14.id, teamId: teamA.id, userId: 'u_tp_tech03', jobId: 'j_tp10', date: new Date('2026-04-02'), startHour: 8, endHour: 17 },
      { weekId: wTpS14.id, teamId: teamA.id, userId: 'u_tp_tech04', jobId: 'j_tp10', date: new Date('2026-04-02'), startHour: 8, endHour: 17 },
      { weekId: wTpS14.id, teamId: teamB.id, userId: 'u_tp_tech05', jobId: 'j_tp10', date: new Date('2026-04-02'), startHour: 8, endHour: 17 },
      { weekId: wTpS14.id, teamId: teamB.id, userId: 'u_tp_tech06', jobId: 'j_tp10', date: new Date('2026-04-02'), startHour: 8, endHour: 17 },
    ],
  });

  // Slots S15 (semaine en cours — chantiers actifs)
  await prisma.teamPlanningSlot.createMany({
    data: [
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech01', jobId: 'j_tp08', date: new Date('2026-04-07'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech02', jobId: 'j_tp08', date: new Date('2026-04-07'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech03', jobId: 'j_tp09', date: new Date('2026-04-07'), startHour: 8, endHour: 16 },
      { weekId: wTpS15.id, teamId: teamB.id, userId: 'u_tp_tech04', jobId: 'j_tp09', date: new Date('2026-04-07'), startHour: 8, endHour: 16 },
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech01', jobId: 'j_tp08', date: new Date('2026-04-08'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech02', jobId: 'j_tp08', date: new Date('2026-04-08'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamB.id, userId: 'u_tp_tech05', jobId: 'j_tp11', date: new Date('2026-04-08'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamB.id, userId: 'u_tp_tech06', jobId: 'j_tp11', date: new Date('2026-04-08'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech01', jobId: 'j_tp10', date: new Date('2026-04-09'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech02', jobId: 'j_tp10', date: new Date('2026-04-09'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech03', jobId: 'j_tp10', date: new Date('2026-04-09'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamB.id, userId: 'u_tp_tech04', jobId: 'j_tp10', date: new Date('2026-04-09'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech01', jobId: 'j_tp08', date: new Date('2026-04-10'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech02', jobId: 'j_tp08', date: new Date('2026-04-10'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamB.id, userId: 'u_tp_tech05', jobId: 'j_tp12', date: new Date('2026-04-10'), startHour: 8, endHour: 12 },
      { weekId: wTpS15.id, teamId: teamB.id, userId: 'u_tp_tech06', jobId: 'j_tp12', date: new Date('2026-04-10'), startHour: 8, endHour: 12 },
      { weekId: wTpS15.id, teamId: teamA.id, userId: 'u_tp_tech03', jobId: 'j_tp10', date: new Date('2026-04-11'), startHour: 8, endHour: 17 },
      { weekId: wTpS15.id, teamId: teamB.id, userId: 'u_tp_tech04', jobId: 'j_tp10', date: new Date('2026-04-11'), startHour: 8, endHour: 17 },
    ],
  });

  // Slots S16 (semaine prochaine — draft)
  await prisma.teamPlanningSlot.createMany({
    data: [
      { weekId: wTpS16.id, teamId: teamA.id, userId: 'u_tp_tech01', jobId: 'j_tp10', date: new Date('2026-04-14'), startHour: 8, endHour: 17 },
      { weekId: wTpS16.id, teamId: teamA.id, userId: 'u_tp_tech02', jobId: 'j_tp10', date: new Date('2026-04-14'), startHour: 8, endHour: 17 },
      { weekId: wTpS16.id, teamId: teamB.id, userId: 'u_tp_tech05', jobId: 'j_tp11', date: new Date('2026-04-14'), startHour: 8, endHour: 17 },
      { weekId: wTpS16.id, teamId: teamB.id, userId: 'u_tp_tech06', jobId: 'j_tp11', date: new Date('2026-04-14'), startHour: 8, endHour: 17 },
      { weekId: wTpS16.id, teamId: teamA.id, userId: 'u_tp_tech03', jobId: 'j_tp10', date: new Date('2026-04-15'), startHour: 8, endHour: 17 },
      { weekId: wTpS16.id, teamId: teamB.id, userId: 'u_tp_tech04', jobId: 'j_tp10', date: new Date('2026-04-15'), startHour: 8, endHour: 17 },
    ],
  });

  // ─── TIME ENTRIES (85 pointages) ──────────────────────────────────────────
  await prisma.timeEntry.createMany({
    data: [
      // ── S04 fév 2025 — j_tp01 Fontaine ──
      { id: 'te_tp001', date: new Date('2025-02-24'), hours: 8, description: 'Dépose chaudière électrique + préparation emplacement PAC',     status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp01', companyId: 'co_tp' },
      { id: 'te_tp002', date: new Date('2025-02-24'), hours: 8, description: 'Raccordements hydrauliques + mise en place module EHPT',        status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp01', companyId: 'co_tp' },
      { id: 'te_tp003', date: new Date('2025-02-25'), hours: 8, description: 'Raccordements frigorifiques + mise en charge R32',               status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp01', companyId: 'co_tp' },
      { id: 'te_tp004', date: new Date('2025-02-25'), hours: 6, description: 'Câblage électrique + disjoncteur dédié',                        status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp01', companyId: 'co_tp' },
      { id: 'te_tp005', date: new Date('2025-02-26'), hours: 4, description: 'Mise en service + paramétrage + formation Mme Fontaine',         status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp01', companyId: 'co_tp' },
      // ── S15 avr 2025 — j_tp02 Renard ──
      { id: 'te_tp006', date: new Date('2025-04-07'), hours: 8, description: 'Dépose chaudière gaz + préparation accès PAC côté jardin',       status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp02', companyId: 'co_tp' },
      { id: 'te_tp007', date: new Date('2025-04-07'), hours: 8, description: 'Mise en place unité extérieure Daikin 8kW + liaisons cuivre',    status: TimeEntryStatus.approved,  userId: 'u_tp_tech04', jobId: 'j_tp02', companyId: 'co_tp' },
      { id: 'te_tp008', date: new Date('2025-04-08'), hours: 8, description: 'Raccordements hydrauliques + robinets thermostatiques',           status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp02', companyId: 'co_tp' },
      { id: 'te_tp009', date: new Date('2025-04-09'), hours: 5, description: 'Mise en service Daikin + formation Mme Renard',                   status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp02', companyId: 'co_tp' },
      // ── S23 juin 2025 — j_tp03 Lombard ──
      { id: 'te_tp010', date: new Date('2025-06-02'), hours: 8, description: 'Installation Ecodan 8kW unité extérieure toiture',                status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp03', companyId: 'co_tp' },
      { id: 'te_tp011', date: new Date('2025-06-02'), hours: 8, description: 'Module hydraulique EHPT + ballon ECS',                           status: TimeEntryStatus.approved,  userId: 'u_tp_tech05', jobId: 'j_tp03', companyId: 'co_tp' },
      { id: 'te_tp012', date: new Date('2025-06-03'), hours: 8, description: 'Raccordements frigorifiques + test étanchéité',                   status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp03', companyId: 'co_tp' },
      { id: 'te_tp013', date: new Date('2025-06-04'), hours: 5, description: 'Mise en service + paramétrage courbe de chauffe',                 status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp03', companyId: 'co_tp' },
      // ── S29 juil 2025 — j_tp04 Perrin plancher chauffant ──
      { id: 'te_tp014', date: new Date('2025-07-14'), hours: 8, description: 'Dépose ancienne chaudière + déconnexion plancher chauffant',      status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp04', companyId: 'co_tp' },
      { id: 'te_tp015', date: new Date('2025-07-14'), hours: 8, description: 'Mise en place Daikin 12kW + liaisons frigorifiques',              status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp04', companyId: 'co_tp' },
      { id: 'te_tp016', date: new Date('2025-07-15'), hours: 8, description: 'Raccordement plancher chauffant hydraulique + purge circuit',     status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp04', companyId: 'co_tp' },
      { id: 'te_tp017', date: new Date('2025-07-16'), hours: 8, description: 'Câblage électrique + tests zones plancher chauffant',             status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp04', companyId: 'co_tp' },
      { id: 'te_tp018', date: new Date('2025-07-17'), hours: 6, description: 'Mise en service PAC + formation M. Perrin (zones chauffage)',      status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp04', companyId: 'co_tp' },
      { id: 'te_tp019', date: new Date('2025-07-18'), hours: 4, description: 'Retouches robinets + vérification pression circuit',              status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp04', companyId: 'co_tp' },
      // ── S37 sept 2025 — j_tp05 Bonnet ──
      { id: 'te_tp020', date: new Date('2025-09-08'), hours: 8, description: 'Installation PAC Ecodan 6kW + module hydraulique',                status: TimeEntryStatus.approved,  userId: 'u_tp_tech04', jobId: 'j_tp05', companyId: 'co_tp' },
      { id: 'te_tp021', date: new Date('2025-09-09'), hours: 7, description: 'Raccordements + câblage électrique',                              status: TimeEntryStatus.approved,  userId: 'u_tp_tech04', jobId: 'j_tp05', companyId: 'co_tp' },
      { id: 'te_tp022', date: new Date('2025-09-10'), hours: 4, description: 'Mise en service + formation Mme Bonnet',                          status: TimeEntryStatus.approved,  userId: 'u_tp_tech04', jobId: 'j_tp05', companyId: 'co_tp' },
      // ── S43 oct 2025 — j_tp06 Faure ──
      { id: 'te_tp023', date: new Date('2025-10-20'), hours: 8, description: 'PAC Daikin 8kW — installation unité ext. + liaisons',             status: TimeEntryStatus.approved,  userId: 'u_tp_tech05', jobId: 'j_tp06', companyId: 'co_tp' },
      { id: 'te_tp024', date: new Date('2025-10-20'), hours: 8, description: 'Raccordements hydrauliques + ballon ECS',                         status: TimeEntryStatus.approved,  userId: 'u_tp_tech06', jobId: 'j_tp06', companyId: 'co_tp' },
      { id: 'te_tp025', date: new Date('2025-10-21'), hours: 7, description: 'Câblage + test + purge circuit chauffage',                        status: TimeEntryStatus.approved,  userId: 'u_tp_tech05', jobId: 'j_tp06', companyId: 'co_tp' },
      { id: 'te_tp026', date: new Date('2025-10-22'), hours: 4, description: 'Mise en service + paramétrage M. Faure',                          status: TimeEntryStatus.approved,  userId: 'u_tp_tech05', jobId: 'j_tp06', companyId: 'co_tp' },
      // ── S47 nov 2025 — j_tp07 Girard ──
      { id: 'te_tp027', date: new Date('2025-11-17'), hours: 8, description: 'Dépose chaudière fioul + nettoyage local technique',              status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp07', companyId: 'co_tp' },
      { id: 'te_tp028', date: new Date('2025-11-17'), hours: 8, description: 'Mise en place Ecodan 12kW + liaisons cuivre',                    status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp07', companyId: 'co_tp' },
      { id: 'te_tp029', date: new Date('2025-11-18'), hours: 8, description: 'Module EHST + raccordements hydrauliques',                         status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp07', companyId: 'co_tp' },
      { id: 'te_tp030', date: new Date('2025-11-19'), hours: 8, description: 'Raccordements frigorifiques R32 + mise en charge',                status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp07', companyId: 'co_tp' },
      { id: 'te_tp031', date: new Date('2025-11-20'), hours: 7, description: 'Câblage électrique + disjoncteur + mise à la terre',              status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp07', companyId: 'co_tp' },
      { id: 'te_tp032', date: new Date('2025-11-21'), hours: 6, description: 'Mise en service + paramétrage courbe + formation Girard',         status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp07', companyId: 'co_tp' },
      // ── S33 août 2025 — j_tp17 Leroy travaux supp ──
      { id: 'te_tp033', date: new Date('2025-08-11'), hours: 4, description: 'SAV Leroy — diagnostic fuite circuit hydraulique',                status: TimeEntryStatus.approved,  userId: 'u_tp_tech05', jobId: 'j_tp17', companyId: 'co_tp' },
      { id: 'te_tp034', date: new Date('2025-08-12'), hours: 6, description: 'SAV Leroy — remplacement joint + purge + essai pression',         status: TimeEntryStatus.approved,  userId: 'u_tp_tech05', jobId: 'j_tp17', companyId: 'co_tp' },
      // ── S43 oct 2025 — j_tp18 Lombard 2e ──
      { id: 'te_tp035', date: new Date('2025-10-27'), hours: 8, description: 'Lombard 2e chantier — remplacement compresseur PAC',              status: TimeEntryStatus.approved,  userId: 'u_tp_tech06', jobId: 'j_tp18', companyId: 'co_tp' },
      { id: 'te_tp036', date: new Date('2025-10-28'), hours: 6, description: 'Lombard 2e — remplacement fluide R32 + test performance',         status: TimeEntryStatus.approved,  userId: 'u_tp_tech06', jobId: 'j_tp18', companyId: 'co_tp' },
      { id: 'te_tp037', date: new Date('2025-10-29'), hours: 4, description: 'Lombard 2e — réglages finaux + formation mise à jour télécom.',   status: TimeEntryStatus.approved,  userId: 'u_tp_tech06', jobId: 'j_tp18', companyId: 'co_tp' },
      // ── S14 mars-avr 2026 — j_tp08 Dupont (fil rouge démo) ──
      { id: 'te_tp038', date: new Date('2026-03-31'), hours: 8, description: 'Dupont — préparation local technique + dépose chaudière fioul',   status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'te_tp039', date: new Date('2026-03-31'), hours: 8, description: 'Dupont — mise en place unité extérieure Ecodan 12kW',             status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'te_tp040', date: new Date('2026-04-01'), hours: 8, description: 'Dupont — raccordements hydrauliques + ballon EHST 200L',          status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'te_tp041', date: new Date('2026-04-01'), hours: 8, description: 'Dupont — liaisons frigorifiques cuivre + isolation tuyauteries',  status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'te_tp042', date: new Date('2026-04-07'), hours: 8, description: 'Dupont — câblage électrique + disjoncteur dédié 30A',             status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'te_tp043', date: new Date('2026-04-07'), hours: 7, description: 'Dupont — robinets thermostatiques × 8 pièces',                   status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'te_tp044', date: new Date('2026-04-08'), hours: 8, description: 'Dupont — mise en charge R32 + test étanchéité + démarrage',       status: TimeEntryStatus.submitted, userId: 'u_tp_tech01', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'te_tp045', date: new Date('2026-04-08'), hours: 8, description: 'Dupont — purge circuit + équilibrage radiateurs',                 status: TimeEntryStatus.submitted, userId: 'u_tp_tech02', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'te_tp046', date: new Date('2026-04-10'), hours: 6, description: 'Dupont — mise en service + paramétrage + formation Marc Dupont',  status: TimeEntryStatus.draft,     userId: 'u_tp_tech01', jobId: 'j_tp08', companyId: 'co_tp' },
      // ── S14-15 avr 2026 — j_tp09 Leroy (en cours 40%) ──
      { id: 'te_tp047', date: new Date('2026-04-07'), hours: 8, description: 'Leroy — dépose chaudière gaz + mise en place Daikin 8kW',         status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp09', companyId: 'co_tp' },
      { id: 'te_tp048', date: new Date('2026-04-07'), hours: 7, description: 'Leroy — raccordements frigorifiques + test étanchéité',           status: TimeEntryStatus.approved,  userId: 'u_tp_tech04', jobId: 'j_tp09', companyId: 'co_tp' },
      { id: 'te_tp049', date: new Date('2026-04-08'), hours: 8, description: 'Leroy — raccordements hydrauliques + robinets thermostatiques × 6',status: TimeEntryStatus.submitted, userId: 'u_tp_tech03', jobId: 'j_tp09', companyId: 'co_tp' },
      { id: 'te_tp050', date: new Date('2026-04-08'), hours: 6, description: 'Leroy — câblage électrique + mise à la terre',                   status: TimeEntryStatus.submitted, userId: 'u_tp_tech04', jobId: 'j_tp09', companyId: 'co_tp' },
      // ── Foncia 16 PAC (j_tp10 — en cours 25%) ──
      { id: 'te_tp051', date: new Date('2026-04-01'), hours: 8, description: 'Foncia — installation PAC lots 1-4 : pose unités extérieures',   status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp052', date: new Date('2026-04-01'), hours: 8, description: 'Foncia — installation PAC lots 1-4 : liaisons frigorifiques',    status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp053', date: new Date('2026-04-01'), hours: 8, description: 'Foncia — lots 1-4 : raccordements hydrauliques',                 status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp054', date: new Date('2026-04-01'), hours: 8, description: 'Foncia — lots 1-4 : câblage électrique',                        status: TimeEntryStatus.approved,  userId: 'u_tp_tech04', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp055', date: new Date('2026-04-02'), hours: 8, description: 'Foncia — lots 5-8 : pose unités extérieures',                   status: TimeEntryStatus.approved,  userId: 'u_tp_tech05', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp056', date: new Date('2026-04-02'), hours: 8, description: 'Foncia — lots 5-8 : liaisons frigorifiques + test',              status: TimeEntryStatus.approved,  userId: 'u_tp_tech06', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp057', date: new Date('2026-04-07'), hours: 8, description: 'Foncia — lots 5-8 : raccordements hydrauliques + robinets',      status: TimeEntryStatus.submitted, userId: 'u_tp_tech01', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp058', date: new Date('2026-04-07'), hours: 8, description: 'Foncia — lots 5-8 : câblage + mise en service partielle',        status: TimeEntryStatus.submitted, userId: 'u_tp_tech02', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp059', date: new Date('2026-04-09'), hours: 8, description: 'Foncia — lots 9-12 : démarrage installation',                   status: TimeEntryStatus.submitted, userId: 'u_tp_tech03', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp060', date: new Date('2026-04-09'), hours: 8, description: 'Foncia — lots 9-12 : pose PAC + frigorifiques',                  status: TimeEntryStatus.draft,     userId: 'u_tp_tech04', jobId: 'j_tp10', companyId: 'co_tp' },
      // ── Benzara eau-eau (j_tp11 — en cours 10%) ──
      { id: 'te_tp061', date: new Date('2026-04-08'), hours: 8, description: 'Benzara — étude thermique finale + repérage forages existants',  status: TimeEntryStatus.approved,  userId: 'u_tp_tech05', jobId: 'j_tp11', companyId: 'co_tp' },
      { id: 'te_tp062', date: new Date('2026-04-08'), hours: 6, description: 'Benzara — mise en place Atlantic Alféa 20kW + coffret gestion',  status: TimeEntryStatus.submitted, userId: 'u_tp_tech06', jobId: 'j_tp11', companyId: 'co_tp' },
      { id: 'te_tp063', date: new Date('2026-04-14'), hours: 8, description: 'Benzara — raccordements géo + liaisons plancher chauffant',      status: TimeEntryStatus.draft,     userId: 'u_tp_tech05', jobId: 'j_tp11', companyId: 'co_tp' },
      // ── SAV / divers ──
      { id: 'te_tp064', date: new Date('2026-03-15'), hours: 3, description: 'SAV Renard — défaut sonde température extérieure, remplacement', status: TimeEntryStatus.approved,  userId: 'u_tp_tech04', jobId: 'j_tp02', companyId: 'co_tp' },
      { id: 'te_tp065', date: new Date('2026-03-18'), hours: 2, description: 'SAV Lombard — recalibrage courbe de chauffe + mise à jour FW',   status: TimeEntryStatus.approved,  userId: 'u_tp_tech06', jobId: 'j_tp03', companyId: 'co_tp' },
      { id: 'te_tp066', date: new Date('2026-04-02'), hours: 4, description: 'SAV Bonnet — bruit unité int. : remplacement ventilateur',       status: TimeEntryStatus.approved,  userId: 'u_tp_tech04', jobId: 'j_tp05', companyId: 'co_tp' },
      { id: 'te_tp067', date: new Date('2026-04-04'), hours: 3, description: 'Visite technique M. Morin, Le Chesnay + étude thermique',        status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp14', companyId: 'co_tp' },
      { id: 'te_tp068', date: new Date('2026-04-04'), hours: 3, description: 'Visite technique Mme Vidal, Antony + relevé sur site',           status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp13', companyId: 'co_tp' },
      { id: 'te_tp069', date: new Date('2026-04-05'), hours: 4, description: 'Visite Famille Leclerc, Vélizy — étude + mesures déperditions',  status: TimeEntryStatus.approved,  userId: 'u_tp_tech04', jobId: 'j_tp15', companyId: 'co_tp' },
      { id: 'te_tp070', date: new Date('2026-04-10'), hours: 5, description: 'Leroy — SAV chantier : fuite raccord ballon, réparation',        status: TimeEntryStatus.submitted, userId: 'u_tp_tech03', jobId: 'j_tp12', companyId: 'co_tp' },
      { id: 'te_tp071', date: new Date('2026-04-10'), hours: 4, description: 'Leroy — retest pression + vérification zones chauffage',         status: TimeEntryStatus.draft,     userId: 'u_tp_tech04', jobId: 'j_tp12', companyId: 'co_tp' },
      // ── Heures de bureau / visites techniques non affectées chantier ──
      { id: 'te_tp072', date: new Date('2026-03-10'), hours: 2, description: 'Visite technique M. Dupont — mesures déperditions thermiques',   status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'te_tp073', date: new Date('2026-03-12'), hours: 2, description: 'Visite technique Mme Leroy — relevé installation existante',     status: TimeEntryStatus.approved,  userId: 'u_tp_tech03', jobId: 'j_tp09', companyId: 'co_tp' },
      { id: 'te_tp074', date: new Date('2026-02-15'), hours: 4, description: 'Foncia — visite des 16 logements + relevé technique complet',    status: TimeEntryStatus.approved,  userId: 'u_tp_tech01', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp075', date: new Date('2026-02-15'), hours: 4, description: 'Foncia — relevé coffrets élec + positions unités extérieures',   status: TimeEntryStatus.approved,  userId: 'u_tp_tech02', jobId: 'j_tp10', companyId: 'co_tp' },
      // ── Semaine en cours (S15 — pointages récents non encore validés) ──
      { id: 'te_tp076', date: new Date('2026-04-11'), hours: 8, description: 'Foncia — lots 9-12 : câblage électrique avancement 50%',        status: TimeEntryStatus.draft,     userId: 'u_tp_tech01', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp077', date: new Date('2026-04-11'), hours: 8, description: 'Foncia — lots 9-12 : raccordements hydrauliques 50%',            status: TimeEntryStatus.draft,     userId: 'u_tp_tech02', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp078', date: new Date('2026-04-11'), hours: 7, description: 'Benzara — liaison capteurs géo + test débit primaire',           status: TimeEntryStatus.draft,     userId: 'u_tp_tech05', jobId: 'j_tp11', companyId: 'co_tp' },
      { id: 'te_tp079', date: new Date('2026-04-11'), hours: 7, description: 'Benzara — raccordement plancher chauffant zone nuit',            status: TimeEntryStatus.draft,     userId: 'u_tp_tech06', jobId: 'j_tp11', companyId: 'co_tp' },
      { id: 'te_tp080', date: new Date('2026-04-11'), hours: 6, description: 'Leroy — câblage + finitions avant mise en service',              status: TimeEntryStatus.draft,     userId: 'u_tp_tech03', jobId: 'j_tp09', companyId: 'co_tp' },
      { id: 'te_tp081', date: new Date('2026-04-11'), hours: 5, description: 'Dupont — vérification finale + dossier DOE',                    status: TimeEntryStatus.draft,     userId: 'u_tp_tech01', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'te_tp082', date: new Date('2026-04-14'), hours: 8, description: 'Foncia — lots 13-16 : démarrage dernière tranche',               status: TimeEntryStatus.draft,     userId: 'u_tp_tech01', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp083', date: new Date('2026-04-14'), hours: 8, description: 'Foncia — lots 13-16 : pose PAC + accès toiture',                status: TimeEntryStatus.draft,     userId: 'u_tp_tech02', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'te_tp084', date: new Date('2026-04-14'), hours: 8, description: 'Benzara — raccordement ballon ECS 200L + mise en eau',          status: TimeEntryStatus.draft,     userId: 'u_tp_tech05', jobId: 'j_tp11', companyId: 'co_tp' },
      { id: 'te_tp085', date: new Date('2026-04-14'), hours: 8, description: 'Foncia — lots 13-16 : frigorifiques + test étanchéité',          status: TimeEntryStatus.draft,     userId: 'u_tp_tech03', jobId: 'j_tp10', companyId: 'co_tp' },
    ],
  });

  // ─── BONS DE COMMANDE FOURNISSEURS (15) ───────────────────────────────────
  await prisma.purchaseOrder.createMany({
    data: [
      { id: 'po_tp01', reference: 'BDC-TP-2025-001', amount: 2900,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2025-02-18'), receivedAt: new Date('2025-02-21'), supplierId: 'sup_tp1', jobId: 'j_tp01', companyId: 'co_tp' },
      { id: 'po_tp02', reference: 'BDC-TP-2025-002', amount: 3500,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2025-04-01'), receivedAt: new Date('2025-04-05'), supplierId: 'sup_tp2', jobId: 'j_tp02', companyId: 'co_tp' },
      { id: 'po_tp03', reference: 'BDC-TP-2025-003', amount: 3650,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2025-05-26'), receivedAt: new Date('2025-05-30'), supplierId: 'sup_tp1', jobId: 'j_tp03', companyId: 'co_tp' },
      { id: 'po_tp04', reference: 'BDC-TP-2025-004', amount: 4600,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2025-07-07'), receivedAt: new Date('2025-07-11'), supplierId: 'sup_tp2', jobId: 'j_tp04', companyId: 'co_tp' },
      { id: 'po_tp05', reference: 'BDC-TP-2025-005', amount: 2900,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2025-09-01'), receivedAt: new Date('2025-09-04'), supplierId: 'sup_tp1', jobId: 'j_tp05', companyId: 'co_tp' },
      { id: 'po_tp06', reference: 'BDC-TP-2025-006', amount: 3500,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2025-10-13'), receivedAt: new Date('2025-10-17'), supplierId: 'sup_tp2', jobId: 'j_tp06', companyId: 'co_tp' },
      { id: 'po_tp07', reference: 'BDC-TP-2025-007', amount: 4800,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2025-11-10'), receivedAt: new Date('2025-11-14'), supplierId: 'sup_tp1', jobId: 'j_tp07', companyId: 'co_tp' },
      { id: 'po_tp08', reference: 'BDC-TP-2025-008', amount: 1700,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2025-11-10'), receivedAt: new Date('2025-11-14'), supplierId: 'sup_tp1', jobId: 'j_tp07', companyId: 'co_tp' },
      { id: 'po_tp09', reference: 'BDC-TP-2026-001', amount: 4800,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2026-03-24'), receivedAt: new Date('2026-03-28'), supplierId: 'sup_tp1', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'po_tp10', reference: 'BDC-TP-2026-002', amount: 1700,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2026-03-24'), receivedAt: new Date('2026-03-28'), supplierId: 'sup_tp1', jobId: 'j_tp08', companyId: 'co_tp' },
      { id: 'po_tp11', reference: 'BDC-TP-2026-003', amount: 3500,  vatRate: 20, status: PurchaseStatus.ordered,  orderedAt: new Date('2026-04-03'),                                      supplierId: 'sup_tp2', jobId: 'j_tp09', companyId: 'co_tp' },
      { id: 'po_tp12', reference: 'BDC-TP-2026-004', amount: 56000, vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2026-03-20'), receivedAt: new Date('2026-03-28'), supplierId: 'sup_tp2', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'po_tp13', reference: 'BDC-TP-2026-005', amount: 8320,  vatRate: 20, status: PurchaseStatus.received, orderedAt: new Date('2026-03-20'), receivedAt: new Date('2026-03-28'), supplierId: 'sup_tp4', jobId: 'j_tp10', companyId: 'co_tp' },
      { id: 'po_tp14', reference: 'BDC-TP-2026-006', amount: 7200,  vatRate: 20, status: PurchaseStatus.ordered,  orderedAt: new Date('2026-04-08'),                                      supplierId: 'sup_tp3', jobId: 'j_tp11', companyId: 'co_tp' },
      { id: 'po_tp15', reference: 'BDC-TP-2026-007', amount: 1200,  vatRate: 20, status: PurchaseStatus.draft,    orderedAt: new Date('2026-04-14'),                                      supplierId: 'sup_tp4', jobId: 'j_tp10', companyId: 'co_tp' },
    ],
  });

  await prisma.purchaseLine.createMany({
    data: [
      { purchaseId: 'po_tp01', designation: 'Mitsubishi Ecodan PUHZ-SW60VKA',    unit: 'unité',   quantity: 1,  unitPrice: 2900,  sortOrder: 0 },
      { purchaseId: 'po_tp02', designation: 'Daikin Altherma 3 EDLA08D3V3',       unit: 'unité',   quantity: 1,  unitPrice: 3500,  sortOrder: 0 },
      { purchaseId: 'po_tp03', designation: 'Mitsubishi Ecodan PUHZ-SW80VKA',     unit: 'unité',   quantity: 1,  unitPrice: 3650,  sortOrder: 0 },
      { purchaseId: 'po_tp04', designation: 'Daikin Altherma 3 EDLA12D3V3',       unit: 'unité',   quantity: 1,  unitPrice: 4600,  sortOrder: 0 },
      { purchaseId: 'po_tp05', designation: 'Mitsubishi Ecodan PUHZ-SW60VKA',     unit: 'unité',   quantity: 1,  unitPrice: 2900,  sortOrder: 0 },
      { purchaseId: 'po_tp06', designation: 'Daikin Altherma 3 EDLA08D3V3',       unit: 'unité',   quantity: 1,  unitPrice: 3500,  sortOrder: 0 },
      { purchaseId: 'po_tp07', designation: 'Mitsubishi Ecodan PUHZ-SW120VKA',    unit: 'unité',   quantity: 1,  unitPrice: 4800,  sortOrder: 0 },
      { purchaseId: 'po_tp08', designation: 'Module EHST20D-VM2B ballon 200L',    unit: 'unité',   quantity: 1,  unitPrice: 1700,  sortOrder: 0 },
      { purchaseId: 'po_tp09', designation: 'Mitsubishi Ecodan PUHZ-SW120VKA',    unit: 'unité',   quantity: 1,  unitPrice: 4800,  sortOrder: 0 },
      { purchaseId: 'po_tp10', designation: 'Module EHST20D-VM2B ballon 200L',    unit: 'unité',   quantity: 1,  unitPrice: 1700,  sortOrder: 0 },
      { purchaseId: 'po_tp11', designation: 'Daikin Altherma 3 EDLA08D3V3',       unit: 'unité',   quantity: 1,  unitPrice: 3500,  sortOrder: 0 },
      { purchaseId: 'po_tp12', designation: 'Daikin Altherma 3 EDLA08D3V3 × 16', unit: 'unité',   quantity: 16, unitPrice: 3500,  sortOrder: 0 },
      { purchaseId: 'po_tp13', designation: 'Kits hydrauliques complets × 16',    unit: 'forfait', quantity: 16, unitPrice: 520,   sortOrder: 0 },
      { purchaseId: 'po_tp13', designation: 'Câbles + disjoncteurs × 16',         unit: 'lot',     quantity: 1,  unitPrice: 0,     sortOrder: 1 },
      { purchaseId: 'po_tp14', designation: 'Atlantic Alféa Excellia 20kW',       unit: 'unité',   quantity: 1,  unitPrice: 7200,  sortOrder: 0 },
      { purchaseId: 'po_tp15', designation: 'Raccords cuivre + isolants (compl.)', unit: 'lot',    quantity: 1,  unitPrice: 1200,  sortOrder: 0 },
    ],
  });

  // ─── HR DOCUMENTS ─────────────────────────────────────────────────────────
  await prisma.hrDocument.createMany({
    data: [
      { type: 'cni',         label: "Carte nationale d'identité",                   storageKey: 'hr/co_tp/u_tp_tech01/cni.pdf',         mimeType: 'application/pdf', sizeBytes: 204800, userId: 'u_tp_tech01', companyId: 'co_tp' },
      { type: 'attestation', label: 'Attestation QualiPAC RGE — 2025-2027',         storageKey: 'hr/co_tp/u_tp_tech01/qualiPAC.pdf',    mimeType: 'application/pdf', sizeBytes: 512000, userId: 'u_tp_tech01', companyId: 'co_tp' },
      { type: 'habilitation',label: 'Habilitation fluides frigorigènes Cat. I',     storageKey: 'hr/co_tp/u_tp_tech01/hab_fluide.pdf',  mimeType: 'application/pdf', sizeBytes: 307200, userId: 'u_tp_tech01', companyId: 'co_tp' },
      { type: 'cni',         label: "Carte nationale d'identité",                   storageKey: 'hr/co_tp/u_tp_tech02/cni.pdf',         mimeType: 'application/pdf', sizeBytes: 204800, userId: 'u_tp_tech02', companyId: 'co_tp' },
      { type: 'attestation', label: 'Attestation QualiPAC RGE — 2024-2026',         storageKey: 'hr/co_tp/u_tp_tech02/qualiPAC.pdf',    mimeType: 'application/pdf', sizeBytes: 512000, userId: 'u_tp_tech02', companyId: 'co_tp' },
      { type: 'cni',         label: "Carte nationale d'identité",                   storageKey: 'hr/co_tp/u_tp_tech03/cni.pdf',         mimeType: 'application/pdf', sizeBytes: 204800, userId: 'u_tp_tech03', companyId: 'co_tp' },
      { type: 'habilitation',label: 'Habilitation fluides frigorigènes Cat. I',     storageKey: 'hr/co_tp/u_tp_tech03/hab_fluide.pdf',  mimeType: 'application/pdf', sizeBytes: 307200, userId: 'u_tp_tech03', companyId: 'co_tp' },
      { type: 'cni',         label: "Carte nationale d'identité",                   storageKey: 'hr/co_tp/u_tp_tech04/cni.pdf',         mimeType: 'application/pdf', sizeBytes: 204800, userId: 'u_tp_tech04', companyId: 'co_tp' },
      { type: 'attestation', label: 'Attestation QualiPAC RGE — 2025-2027',         storageKey: 'hr/co_tp/u_tp_tech04/qualiPAC.pdf',    mimeType: 'application/pdf', sizeBytes: 512000, userId: 'u_tp_tech04', companyId: 'co_tp' },
      { type: 'cni',         label: "Carte nationale d'identité",                   storageKey: 'hr/co_tp/u_tp_tech05/cni.pdf',         mimeType: 'application/pdf', sizeBytes: 204800, userId: 'u_tp_tech05', companyId: 'co_tp' },
      { type: 'habilitation',label: 'Habilitation électrique B2V BR BC',            storageKey: 'hr/co_tp/u_tp_tech05/hab_elec.pdf',    mimeType: 'application/pdf', sizeBytes: 256000, userId: 'u_tp_tech05', companyId: 'co_tp' },
      { type: 'cni',         label: "Carte nationale d'identité",                   storageKey: 'hr/co_tp/u_tp_tech06/cni.pdf',         mimeType: 'application/pdf', sizeBytes: 204800, userId: 'u_tp_tech06', companyId: 'co_tp' },
      { type: 'attestation', label: 'Attestation QualiPAC RGE — 2024-2026',         storageKey: 'hr/co_tp/u_tp_tech06/qualiPAC.pdf',    mimeType: 'application/pdf', sizeBytes: 512000, userId: 'u_tp_tech06', companyId: 'co_tp' },
      { type: 'habilitation',label: 'Habilitation fluides frigorigènes Cat. I',     storageKey: 'hr/co_tp/u_tp_tech06/hab_fluide.pdf',  mimeType: 'application/pdf', sizeBytes: 307200, userId: 'u_tp_tech06', companyId: 'co_tp' },
    ],
  });

  console.log('✅ ThermiPro SAS seeded (volume démo) :');
  console.log('   👥  8 utilisateurs · 2 équipes');
  console.log('   🏘️  25 clients (particuliers + syndics + promoteurs)');
  console.log('   📋  30 devis (11 acceptés · 7 envoyés · 6 brouillons · 4 refusés · 2 expirés)');
  console.log('   🏗️  18 chantiers (7 facturés · 5 en cours · 4 planifiés · 2 terminés)');
  console.log('   💶  25 factures dont 5 IMPAYÉES');
  console.log('   ⏱️  85 pointages techniciens sur 14 mois');
  console.log('   📅  3 semaines planning (2 verrouillées · 1 brouillon)');
  console.log('   🛒  15 bons de commande fournisseurs');
  console.log('   📄  14 documents RH');
  console.log('   🔑  Connexion : david@thermipro.fr / Demo1234!');
}
