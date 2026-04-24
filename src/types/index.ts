export type Company = 'ASP' | 'JS' | 'GROUP';
export type UserRole = 'admin' | 'conducteur' | 'technicien' | 'comptable' | 'collaborateur';

/** Resource type categorising users for planning / billing (terrain vs desk). */
export type UserType = 'terrain' | 'bureau' | 'atelier' | string;

/** Functional role within the operation (rough equivalent of a job title). */
export type UserJobFunction = 'technicien' | 'chef_equipe' | 'conducteur' | 'comptable' | 'admin' | string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company: Company;
  avatar?: string;
  type?: UserType | null;
  jobFunction?: UserJobFunction | null;
  hourlyRate?: number | null;
  isActive?: boolean;
}

export interface Client {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  company: Company;
  type: 'public' | 'private';
  createdAt: string;
  siret?: string | null;
  vatNumber?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingPostalCode?: string | null;
  paymentTermsDays?: number | null;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'expired';
export interface QuoteLine {
  id: string;
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  vatRate?: number;
  sortOrder?: number;
  articleCode?: string;
  catalogProductId?: string | null;
  isComposite?: boolean;
  displayMode?: 'detailed' | 'grouped' | 'mixed';
  adjustmentAmount?: number;
  adjustmentLabel?: string | null;
  children?: QuoteLine[];
  visibleToClient?: boolean;
}
export interface Quote {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  clientAddress?: string;
  subject: string;
  amount: number;
  status: QuoteStatus;
  company: Company;
  createdAt: string;
  validUntil: string;
  vatMode?: 'normal' | 'autoliquidation' | 'exempt';
  notes?: string | null;
  lines?: QuoteLine[];
}

export type JobStatus = 'planned' | 'in_progress' | 'paused' | 'completed' | 'invoiced';
export interface Job {
  id: string;
  reference: string;
  quoteId?: string;
  clientId?: string | null;
  clientName: string;
  title: string;
  address: string;
  status: JobStatus;
  company: Company;
  startDate: string;
  endDate?: string;
  progress: number;
  assignedTo: string[];
  photoCount?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  company: Company;
}

export type PurchaseStatus = 'draft' | 'ordered' | 'received' | 'partial';
export interface Purchase {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  jobId?: string;
  jobRef?: string;
  amount: number;
  status: PurchaseStatus;
  company: Company;
  orderedAt: string;
  vatRate?: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export interface InvoiceLine {
  id: string;
  designation: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
  sortOrder?: number;
}
export interface Invoice {
  id: string;
  reference: string;
  clientId?: string;
  clientName: string;
  jobId?: string;
  jobRef?: string;
  amount: number;
  status: InvoiceStatus;
  company: Company;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  lines?: InvoiceLine[];
}

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  userType?: string | null;
  userJobFunction?: string | null;
  jobId: string;
  jobRef: string;
  date: string;
  hours: number;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  company: Company;
}
