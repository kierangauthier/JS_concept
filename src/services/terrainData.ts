import { Company } from '@/types';

export type InterventionType = 'pose' | 'marquage' | 'maintenance' | 'inspection' | 'depose';
export type InterventionStatus = 'pending' | 'in_route' | 'in_progress' | 'paused' | 'done';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
}

export interface Intervention {
  id: string;
  jobId: string;
  jobRef: string;
  title: string;
  address: string;
  city: string;
  scheduledAt: string; // ISO time
  estimatedDuration: number; // minutes
  type: InterventionType;
  status: InterventionStatus;
  company: Company;
  clientName: string;
  notes: string;
  checklist: ChecklistItem[];
  photos: { id: string; name: string; timestamp: string }[];
}

export const interventionTypeLabels: Record<InterventionType, string> = {
  pose: 'Pose',
  marquage: 'Marquage',
  maintenance: 'Maintenance',
  inspection: 'Inspection',
  depose: 'Dépose',
};

export const interventionStatusLabels: Record<InterventionStatus, string> = {
  pending: 'À faire',
  in_route: 'En route',
  in_progress: 'En cours',
  paused: 'En pause',
  done: 'Terminé',
};

export const interventionStatusColors: Record<InterventionStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_route: 'bg-info/15 text-info',
  in_progress: 'bg-primary/15 text-primary-foreground',
  paused: 'bg-warning/15 text-warning-foreground',
  done: 'bg-success/15 text-success',
};

export const interventionTypeColors: Record<InterventionType, string> = {
  pose: 'bg-info/15 text-info',
  marquage: 'bg-primary/15 text-primary-foreground',
  maintenance: 'bg-warning/15 text-warning-foreground',
  inspection: 'bg-muted text-muted-foreground',
  depose: 'bg-destructive/15 text-destructive',
};

export const mockInterventions: Intervention[] = [
  {
    id: 'int1', jobId: 'j3', jobRef: 'CHT-ASP-2024-003', title: 'Pose panneaux D21a section C',
    address: 'RD1090, km 14.2', city: 'Vif', scheduledAt: '2024-07-18T07:30:00', estimatedDuration: 180,
    type: 'pose', status: 'done', company: 'ASP', clientName: 'Département de l\'Isère',
    notes: 'Accès par chemin communal. Prévoir balisage K5a.',
    checklist: [
      { id: 'ck1', label: 'EPI portés (gilet, casque, chaussures)', checked: true, required: true },
      { id: 'ck2', label: 'Balisage chantier mis en place', checked: true, required: true },
      { id: 'ck3', label: 'Photos avant travaux prises', checked: true, required: true },
      { id: 'ck4', label: 'Matériel vérifié', checked: true, required: false },
      { id: 'ck5', label: 'Panneaux posés et aplomb vérifié', checked: true, required: true },
      { id: 'ck6', label: 'Photos après travaux prises', checked: true, required: true },
      { id: 'ck7', label: 'Balisage retiré', checked: true, required: true },
      { id: 'ck8', label: 'Zone nettoyée', checked: true, required: false },
    ],
    photos: [
      { id: 'ph1', name: 'avant_travaux_km14.jpg', timestamp: '2024-07-18T07:45:00' },
      { id: 'ph2', name: 'panneau_pose_1.jpg', timestamp: '2024-07-18T09:20:00' },
      { id: 'ph3', name: 'apres_travaux_km14.jpg', timestamp: '2024-07-18T10:30:00' },
    ],
  },
  {
    id: 'int2', jobId: 'j6', jobRef: 'CHT-ASP-2024-004', title: 'Marquage axial Bd Périphérique sect. Nord',
    address: 'Bd Périphérique Nord, sortie 5', city: 'Lyon 9e', scheduledAt: '2024-07-18T13:00:00', estimatedDuration: 240,
    type: 'marquage', status: 'in_progress', company: 'ASP', clientName: 'Colas Rhône-Alpes',
    notes: 'Intervention de nuit annulée → passage diurne avec alternat. Coord. avec police municipale.',
    checklist: [
      { id: 'ck9', label: 'EPI portés (gilet, casque, chaussures)', checked: true, required: true },
      { id: 'ck10', label: 'Alternat mis en place', checked: true, required: true },
      { id: 'ck11', label: 'Machine de marquage vérifiée', checked: true, required: true },
      { id: 'ck12', label: 'Photos avant travaux', checked: true, required: true },
      { id: 'ck13', label: 'Marquage axial réalisé', checked: false, required: true },
      { id: 'ck14', label: 'Marquage rive réalisé', checked: false, required: true },
      { id: 'ck15', label: 'Photos après travaux', checked: false, required: true },
      { id: 'ck16', label: 'Alternat retiré', checked: false, required: true },
    ],
    photos: [
      { id: 'ph4', name: 'balisage_alternat.jpg', timestamp: '2024-07-18T13:15:00' },
      { id: 'ph5', name: 'marquage_en_cours.jpg', timestamp: '2024-07-18T14:00:00' },
    ],
  },
  {
    id: 'int3', jobId: 'j12', jobRef: 'CHT-ASP-2024-007', title: 'Remplacement panneau C27 non conforme',
    address: 'Av. Alsace-Lorraine / Rue Lesdiguières', city: 'Grenoble', scheduledAt: '2024-07-19T08:00:00', estimatedDuration: 90,
    type: 'maintenance', status: 'pending', company: 'ASP', clientName: 'Métropole de Grenoble',
    notes: 'Panneau C27 existant non rétroréfléchissant. Remplacement à l\'identique classe 2.',
    checklist: [
      { id: 'ck17', label: 'EPI portés', checked: false, required: true },
      { id: 'ck18', label: 'Balisage mis en place', checked: false, required: true },
      { id: 'ck19', label: 'Photos avant dépose', checked: false, required: true },
      { id: 'ck20', label: 'Ancien panneau déposé', checked: false, required: true },
      { id: 'ck21', label: 'Nouveau panneau posé', checked: false, required: true },
      { id: 'ck22', label: 'Photos après pose', checked: false, required: true },
      { id: 'ck23', label: 'Zone nettoyée', checked: false, required: false },
    ],
    photos: [],
  },
  {
    id: 'int4', jobId: 'j16', jobRef: 'CHT-ASP-2024-009', title: 'Inspection jalonnement C6 arrêts 3-5',
    address: 'Arrêts Flandrin / Vallier / Chavant', city: 'Grenoble', scheduledAt: '2024-07-19T10:30:00', estimatedDuration: 60,
    type: 'inspection', status: 'pending', company: 'ASP', clientName: 'SMMAG',
    notes: 'Vérification fixation et lisibilité des plaques de jalonnement posées semaine dernière.',
    checklist: [
      { id: 'ck24', label: 'EPI portés', checked: false, required: true },
      { id: 'ck25', label: 'Inspection visuelle plaques', checked: false, required: true },
      { id: 'ck26', label: 'Vérification fixations', checked: false, required: true },
      { id: 'ck27', label: 'Photos de chaque arrêt', checked: false, required: true },
      { id: 'ck28', label: 'Rapport d\'inspection rempli', checked: false, required: true },
    ],
    photos: [],
  },
  {
    id: 'int5', jobId: 'j26', jobRef: 'CHT-ASP-2024-015', title: 'Marquage zone piétonne Vieux Grenoble',
    address: 'Place Grenette → Rue de la Poste', city: 'Grenoble', scheduledAt: '2024-07-19T14:00:00', estimatedDuration: 150,
    type: 'marquage', status: 'pending', company: 'ASP', clientName: 'Métropole de Grenoble',
    notes: 'Marquage résine colorée ocre. Zone piétonne → intervention tôt le matin si possible.',
    checklist: [
      { id: 'ck29', label: 'EPI portés', checked: false, required: true },
      { id: 'ck30', label: 'Zone sécurisée', checked: false, required: true },
      { id: 'ck31', label: 'Photos avant', checked: false, required: true },
      { id: 'ck32', label: 'Préparation support', checked: false, required: true },
      { id: 'ck33', label: 'Application résine', checked: false, required: true },
      { id: 'ck34', label: 'Temps de séchage respecté', checked: false, required: true },
      { id: 'ck35', label: 'Photos après', checked: false, required: true },
    ],
    photos: [],
  },
  {
    id: 'int6', jobId: 'j23', jobRef: 'CHT-ASP-2024-013', title: 'Dépose ancien PMV A48 km 22',
    address: 'A48 km 22, bande d\'arrêt d\'urgence', city: 'Voreppe', scheduledAt: '2024-07-20T06:00:00', estimatedDuration: 120,
    type: 'depose', status: 'pending', company: 'ASP', clientName: 'DIR Centre-Est',
    notes: 'Intervention sous protection DIR. Nacelle obligatoire. Coordonner avec régulateur A48.',
    checklist: [
      { id: 'ck36', label: 'EPI + gilet haute visibilité classe 3', checked: false, required: true },
      { id: 'ck37', label: 'FLR en place', checked: false, required: true },
      { id: 'ck38', label: 'Nacelle positionnée', checked: false, required: true },
      { id: 'ck39', label: 'PMV décâblé', checked: false, required: true },
      { id: 'ck40', label: 'PMV déposé et chargé', checked: false, required: true },
      { id: 'ck41', label: 'Zone remise en état', checked: false, required: true },
      { id: 'ck42', label: 'Photos avant/après', checked: false, required: true },
    ],
    photos: [],
  },
];

// Simulated offline upload queue
export interface OfflineQueueItem {
  id: string;
  type: 'photo' | 'hours' | 'checklist' | 'signature';
  label: string;
  interventionRef: string;
  timestamp: string;
  size?: string;
  status: 'queued' | 'syncing' | 'failed';
}

export const mockOfflineQueue: OfflineQueueItem[] = [
  { id: 'oq1', type: 'photo', label: 'marquage_en_cours.jpg', interventionRef: 'CHT-ASP-2024-004', timestamp: '2024-07-18T14:00:00', size: '3.2 MB', status: 'queued' },
  { id: 'oq2', type: 'hours', label: '3h30 - Marquage axial', interventionRef: 'CHT-ASP-2024-004', timestamp: '2024-07-18T16:30:00', status: 'queued' },
  { id: 'oq3', type: 'checklist', label: 'Checklist 4/8 validés', interventionRef: 'CHT-ASP-2024-004', timestamp: '2024-07-18T14:15:00', status: 'syncing' },
];
