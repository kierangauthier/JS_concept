import { Company } from '@/types';

export interface QuoteLine {
  id: string;
  quoteId: string;
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
}

export interface ActivityEntry {
  id: string;
  entityId: string;
  entityType: 'quote' | 'job' | 'purchase' | 'invoice' | 'workshop';
  user: string;
  action: string;
  detail?: string;
  timestamp: string;
}

export interface Attachment {
  id: string;
  entityId: string;
  name: string;
  type: 'pdf' | 'image' | 'doc';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

export type WorkshopStatus = 'bat_pending' | 'bat_approved' | 'fabrication' | 'ready' | 'pose_planned' | 'pose_done';
export interface WorkshopItem {
  id: string;
  reference: string;
  jobId: string;
  jobRef: string;
  title: string;
  description: string;
  status: WorkshopStatus;
  company: Company;
  assignedTo: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface InvoiceSituation {
  id: string;
  invoiceId: string;
  number: number;
  label: string;
  percentage: number;
  amount: number;
  status: 'draft' | 'sent' | 'paid';
  date: string;
}

// Quote lines mock
export const mockQuoteLines: QuoteLine[] = [
  { id: 'ql1', quoteId: 'q1', designation: 'Peinture routière blanche type I', unit: 'ml', quantity: 1200, unitPrice: 12.5, costPrice: 8.2 },
  { id: 'ql2', quoteId: 'q1', designation: 'Peinture routière jaune type I', unit: 'ml', quantity: 400, unitPrice: 13.0, costPrice: 8.8 },
  { id: 'ql3', quoteId: 'q1', designation: 'Résine gravillonnée passage piéton', unit: 'm²', quantity: 85, unitPrice: 65.0, costPrice: 42.0 },
  { id: 'ql4', quoteId: 'q1', designation: 'Prématarquage', unit: 'ml', quantity: 1600, unitPrice: 3.5, costPrice: 2.0 },
  { id: 'ql5', quoteId: 'q1', designation: 'Signalisation temporaire forfait', unit: 'fft', quantity: 1, unitPrice: 2800, costPrice: 1800 },
  { id: 'ql6', quoteId: 'q2', designation: 'Peinture verte piste cyclable', unit: 'm²', quantity: 320, unitPrice: 28.0, costPrice: 18.5 },
  { id: 'ql7', quoteId: 'q2', designation: 'Pictogrammes vélo thermocollés', unit: 'u', quantity: 45, unitPrice: 85.0, costPrice: 52.0 },
  { id: 'ql8', quoteId: 'q2', designation: 'Bande podotactile', unit: 'ml', quantity: 60, unitPrice: 42.0, costPrice: 28.0 },
  { id: 'ql9', quoteId: 'q4', designation: 'Potelet acier galvanisé h=1000', unit: 'u', quantity: 24, unitPrice: 180.0, costPrice: 110.0 },
  { id: 'ql10', quoteId: 'q4', designation: 'Jardinière béton 120x60', unit: 'u', quantity: 8, unitPrice: 650.0, costPrice: 420.0 },
  { id: 'ql11', quoteId: 'q4', designation: 'Panneau entrée ville rétroréfléchissant', unit: 'u', quantity: 2, unitPrice: 1200.0, costPrice: 750.0 },
  { id: 'ql12', quoteId: 'q4', designation: 'Pose et scellement', unit: 'fft', quantity: 1, unitPrice: 4500.0, costPrice: 2800.0 },
  { id: 'ql13', quoteId: 'q6', designation: 'Panneau directionnel D21a', unit: 'u', quantity: 18, unitPrice: 320.0, costPrice: 195.0 },
  { id: 'ql14', quoteId: 'q6', designation: 'Panneau directionnel D29a', unit: 'u', quantity: 12, unitPrice: 280.0, costPrice: 170.0 },
  { id: 'ql15', quoteId: 'q6', designation: 'Support IPN galvanisé', unit: 'u', quantity: 15, unitPrice: 450.0, costPrice: 280.0 },
  { id: 'ql16', quoteId: 'q6', designation: 'Massif béton 50x50x80', unit: 'u', quantity: 15, unitPrice: 185.0, costPrice: 95.0 },
  { id: 'ql17', quoteId: 'q5', designation: 'Banc public acier/bois L=1800', unit: 'u', quantity: 6, unitPrice: 1450.0, costPrice: 920.0 },
  { id: 'ql18', quoteId: 'q5', designation: 'Corbeille vigipirate 80L', unit: 'u', quantity: 8, unitPrice: 680.0, costPrice: 430.0 },
  { id: 'ql19', quoteId: 'q5', designation: 'Arceau vélo inox', unit: 'u', quantity: 12, unitPrice: 220.0, costPrice: 135.0 },
  { id: 'ql20', quoteId: 'q5', designation: 'Pose et raccordement', unit: 'fft', quantity: 1, unitPrice: 3200.0, costPrice: 2100.0 },
];

// Activity feed mock
export const mockActivities: ActivityEntry[] = [
  { id: 'a1', entityId: 'q1', entityType: 'quote', user: 'Julie Martin', action: 'Devis créé', timestamp: '2024-01-20T09:15:00' },
  { id: 'a2', entityId: 'q1', entityType: 'quote', user: 'Marc Dupont', action: 'Devis validé', detail: 'Marge OK à 34%', timestamp: '2024-01-21T14:30:00' },
  { id: 'a3', entityId: 'q1', entityType: 'quote', user: 'Julie Martin', action: 'Devis envoyé au client', timestamp: '2024-01-22T10:00:00' },
  { id: 'a4', entityId: 'q1', entityType: 'quote', user: 'Système', action: 'Devis accepté par le client', timestamp: '2024-02-05T16:45:00' },
  { id: 'a5', entityId: 'q1', entityType: 'quote', user: 'Julie Martin', action: 'Converti en chantier', detail: 'CHT-ASP-2024-001', timestamp: '2024-02-06T08:30:00' },
  { id: 'a6', entityId: 'j1', entityType: 'job', user: 'Julie Martin', action: 'Chantier créé depuis devis', timestamp: '2024-02-06T08:30:00' },
  { id: 'a7', entityId: 'j1', entityType: 'job', user: 'Julie Martin', action: 'Équipe affectée', detail: 'Karim Benali ajouté', timestamp: '2024-02-10T09:00:00' },
  { id: 'a8', entityId: 'j1', entityType: 'job', user: 'Karim Benali', action: 'Photo ajoutée', detail: 'Avant travaux - rue secteur A', timestamp: '2024-02-15T07:45:00' },
  { id: 'a9', entityId: 'j1', entityType: 'job', user: 'Karim Benali', action: 'Heures saisies', detail: '8h - Marquage section 1', timestamp: '2024-02-15T17:30:00' },
  { id: 'a10', entityId: 'j1', entityType: 'job', user: 'Julie Martin', action: 'Commande passée', detail: 'CMD-ASP-2024-001 - Nadia Signalisation', timestamp: '2024-02-12T11:00:00' },
  { id: 'a11', entityId: 'j3', entityType: 'job', user: 'Julie Martin', action: 'Chantier démarré', timestamp: '2024-04-10T07:00:00' },
  { id: 'a12', entityId: 'j3', entityType: 'job', user: 'Karim Benali', action: 'Photo ajoutée', detail: 'Installation panneau RD1090 km12', timestamp: '2024-04-15T10:20:00' },
  { id: 'a13', entityId: 'j3', entityType: 'job', user: 'Julie Martin', action: 'Avancement mis à jour', detail: '65%', timestamp: '2024-06-20T16:00:00' },
  { id: 'a14', entityId: 'p1', entityType: 'purchase', user: 'Julie Martin', action: 'Commande créée', timestamp: '2024-04-12T09:30:00' },
  { id: 'a15', entityId: 'p1', entityType: 'purchase', user: 'Julie Martin', action: 'Commande envoyée', detail: 'Email fournisseur', timestamp: '2024-04-12T10:00:00' },
  { id: 'a16', entityId: 'p1', entityType: 'purchase', user: 'Karim Benali', action: 'Réception complète', detail: 'BL signé', timestamp: '2024-04-22T14:30:00' },
  { id: 'a17', entityId: 'i1', entityType: 'invoice', user: 'Sophie Laurent', action: 'Facture créée', timestamp: '2024-03-25T09:00:00' },
  { id: 'a18', entityId: 'i1', entityType: 'invoice', user: 'Sophie Laurent', action: 'Facture envoyée', timestamp: '2024-03-25T10:30:00' },
  { id: 'a19', entityId: 'i1', entityType: 'invoice', user: 'Système', action: 'Paiement reçu', detail: 'Virement bancaire', timestamp: '2024-04-15T00:00:00' },
  { id: 'a20', entityId: 'q2', entityType: 'quote', user: 'Julie Martin', action: 'Commentaire', detail: 'Attente retour client sur coloris piste cyclable', timestamp: '2024-02-08T11:15:00' },
  { id: 'a21', entityId: 'q4', entityType: 'quote', user: 'Thomas Petit', action: 'Devis créé', timestamp: '2024-01-10T10:00:00' },
  { id: 'a22', entityId: 'q4', entityType: 'quote', user: 'Thomas Petit', action: 'Lignes ajoutées', detail: '4 postes ajoutés', timestamp: '2024-01-10T11:30:00' },
  { id: 'a23', entityId: 'q4', entityType: 'quote', user: 'Marc Dupont', action: 'Devis validé', timestamp: '2024-01-11T09:00:00' },
  { id: 'a24', entityId: 'j5', entityType: 'job', user: 'Thomas Petit', action: 'Chantier démarré', timestamp: '2024-04-01T07:30:00' },
  { id: 'a25', entityId: 'j5', entityType: 'job', user: 'Léa Moreau', action: 'Photo ajoutée', detail: 'Réception mobilier Lacroix', timestamp: '2024-04-12T09:00:00' },
];

// Attachments mock
export const mockAttachments: Attachment[] = [
  { id: 'att1', entityId: 'q1', name: 'Plan_marquage_Republique.pdf', type: 'pdf', size: '2.4 MB', uploadedBy: 'Julie Martin', uploadedAt: '2024-01-20' },
  { id: 'att2', entityId: 'q1', name: 'Photo_site_avant.jpg', type: 'image', size: '1.8 MB', uploadedBy: 'Karim Benali', uploadedAt: '2024-01-18' },
  { id: 'att3', entityId: 'q1', name: 'CCTP_Lot_signalisation.pdf', type: 'pdf', size: '5.1 MB', uploadedBy: 'Julie Martin', uploadedAt: '2024-01-20' },
  { id: 'att4', entityId: 'j1', name: 'Photo_avant_travaux_1.jpg', type: 'image', size: '3.2 MB', uploadedBy: 'Karim Benali', uploadedAt: '2024-02-15' },
  { id: 'att5', entityId: 'j1', name: 'Photo_avant_travaux_2.jpg', type: 'image', size: '2.9 MB', uploadedBy: 'Karim Benali', uploadedAt: '2024-02-15' },
  { id: 'att6', entityId: 'j1', name: 'Photo_pendant_marquage.jpg', type: 'image', size: '4.1 MB', uploadedBy: 'Karim Benali', uploadedAt: '2024-03-01' },
  { id: 'att7', entityId: 'j1', name: 'PV_reception.pdf', type: 'pdf', size: '890 KB', uploadedBy: 'Julie Martin', uploadedAt: '2024-03-20' },
  { id: 'att8', entityId: 'p1', name: 'BC_Nadia_001.pdf', type: 'pdf', size: '320 KB', uploadedBy: 'Julie Martin', uploadedAt: '2024-04-12' },
  { id: 'att9', entityId: 'p1', name: 'BL_Nadia_livraison.pdf', type: 'pdf', size: '180 KB', uploadedBy: 'Karim Benali', uploadedAt: '2024-04-22' },
  { id: 'att10', entityId: 'q4', name: 'Plan_amenagement_Meylan.dwg', type: 'doc', size: '12.3 MB', uploadedBy: 'Thomas Petit', uploadedAt: '2024-01-10' },
  { id: 'att11', entityId: 'q4', name: 'Catalogue_mobilier.pdf', type: 'pdf', size: '8.7 MB', uploadedBy: 'Thomas Petit', uploadedAt: '2024-01-10' },
  { id: 'att12', entityId: 'j5', name: 'Photo_reception_bancs.jpg', type: 'image', size: '2.1 MB', uploadedBy: 'Léa Moreau', uploadedAt: '2024-04-12' },
  { id: 'att13', entityId: 'i1', name: 'Facture_ASP_2024_001.pdf', type: 'pdf', size: '245 KB', uploadedBy: 'Sophie Laurent', uploadedAt: '2024-03-25' },
];

// Workshop items mock
export const mockWorkshopItems: WorkshopItem[] = [
  { id: 'w1', reference: 'FAB-ASP-001', jobId: 'j3', jobRef: 'CHT-ASP-2024-003', title: 'Panneaux directionnels D21a personnalisés', description: 'Lot de 18 panneaux avec sérigraphie commune spécifique', status: 'fabrication', company: 'ASP', assignedTo: 'Karim Benali', dueDate: '2024-08-15', priority: 'high' },
  { id: 'w2', reference: 'FAB-ASP-002', jobId: 'j11', jobRef: 'CHT-ASP-2024-006', title: 'Caissons lumineux LED x4', description: 'Signalisation lumineuse dynamique pour Presqu\'île', status: 'bat_pending', company: 'ASP', assignedTo: 'Julie Martin', dueDate: '2024-08-25', priority: 'high' },
  { id: 'w3', reference: 'FAB-JS-001', jobId: 'j5', jobRef: 'CHT-JS-2024-002', title: 'Totems info Place du Marché', description: '3 totems inox brossé h=2200 avec plan gravé', status: 'bat_approved', company: 'JS', assignedTo: 'Thomas Petit', dueDate: '2024-08-10', priority: 'medium' },
  { id: 'w4', reference: 'FAB-JS-002', jobId: 'j9', jobRef: 'CHT-JS-2024-004', title: 'Bornes articulées personnalisées', description: 'Bornes anti-stationnement couleur RAL 7016 avec bandes réfléchissantes', status: 'ready', company: 'JS', assignedTo: 'Léa Moreau', dueDate: '2024-07-20', priority: 'medium' },
  { id: 'w5', reference: 'FAB-ASP-003', jobId: 'j16', jobRef: 'CHT-ASP-2024-009', title: 'Plaques de jalonnement C6', description: 'Plaques directionnelles arrêts tram ligne C6', status: 'pose_planned', company: 'ASP', assignedTo: 'Karim Benali', dueDate: '2024-08-05', priority: 'medium' },
  { id: 'w6', reference: 'FAB-ASP-004', jobId: 'j26', jobRef: 'CHT-ASP-2024-015', title: 'Panneaux zone piétonne bilingue', description: 'Panneaux FR/EN zone piétonne Vieux Grenoble', status: 'bat_pending', company: 'ASP', assignedTo: 'Julie Martin', dueDate: '2024-09-01', priority: 'low' },
  { id: 'w7', reference: 'FAB-JS-003', jobId: 'j22', jobRef: 'CHT-JS-2024-010', title: 'Panneaux info randonnée x6', description: 'Panneaux bois/alu avec cartographie', status: 'fabrication', company: 'JS', assignedTo: 'Léa Moreau', dueDate: '2024-08-20', priority: 'medium' },
  { id: 'w8', reference: 'FAB-ASP-005', jobId: 'j23', jobRef: 'CHT-ASP-2024-013', title: 'Caisson PMV A48 remplacement', description: 'Remplacement caisson panneau message variable', status: 'pose_done', company: 'ASP', assignedTo: 'Karim Benali', dueDate: '2024-07-15', priority: 'high' },
  { id: 'w9', reference: 'FAB-JS-004', jobId: 'j29', jobRef: 'CHT-JS-2024-013', title: 'Arceaux vélo design gare', description: 'Arceaux inox design spécifique gare de Voiron', status: 'bat_approved', company: 'JS', assignedTo: 'Thomas Petit', dueDate: '2024-08-15', priority: 'low' },
  { id: 'w10', reference: 'FAB-ASP-006', jobId: 'j38', jobRef: 'CHT-ASP-2024-021', title: 'Marquage résine colorée giratoire', description: 'Préparation kit résine bicomposant coloré', status: 'bat_pending', company: 'ASP', assignedTo: 'Julie Martin', dueDate: '2024-09-10', priority: 'medium' },
];

// Invoice situations mock
export const mockSituations: InvoiceSituation[] = [
  { id: 'sit1', invoiceId: 'i6', number: 1, label: 'Situation n°1 - Installation panneaux', percentage: 40, amount: 13600, status: 'sent', date: '2024-06-15' },
  { id: 'sit2', invoiceId: 'i6', number: 2, label: 'Situation n°2 - Pose supports', percentage: 30, amount: 10200, status: 'draft', date: '2024-07-15' },
  { id: 'sit3', invoiceId: 'i6', number: 3, label: 'Situation n°3 - Finitions', percentage: 30, amount: 10200, status: 'draft', date: '2024-08-15' },
  { id: 'sit4', invoiceId: 'i18', number: 1, label: 'Situation n°1 - Jalonnement arrêts 1-5', percentage: 50, amount: 9150, status: 'sent', date: '2024-08-01' },
  { id: 'sit5', invoiceId: 'i18', number: 2, label: 'Situation n°2 - Jalonnement arrêts 6-10', percentage: 50, amount: 9150, status: 'draft', date: '2024-09-01' },
  { id: 'sit6', invoiceId: 'i19', number: 1, label: 'Situation n°1 - Diagnostic et dépose', percentage: 30, amount: 12300, status: 'sent', date: '2024-07-01' },
  { id: 'sit7', invoiceId: 'i19', number: 2, label: 'Situation n°2 - Remplacement PMV', percentage: 50, amount: 20500, status: 'sent', date: '2024-07-25' },
  { id: 'sit8', invoiceId: 'i19', number: 3, label: 'Situation n°3 - Essais et réception', percentage: 20, amount: 8200, status: 'draft', date: '2024-08-25' },
];
