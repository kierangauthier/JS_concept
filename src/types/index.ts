export type Company = 'ASP' | 'JS' | 'GROUP';
export type UserRole = 'admin' | 'conducteur' | 'technicien' | 'comptable';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company: Company;
  avatar?: string;
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
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'expired';
export interface Quote {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  subject: string;
  amount: number;
  status: QuoteStatus;
  company: Company;
  createdAt: string;
  validUntil: string;
}

export type JobStatus = 'planned' | 'in_progress' | 'paused' | 'completed' | 'invoiced';
export interface Job {
  id: string;
  reference: string;
  quoteId?: string;
  clientName: string;
  title: string;
  address: string;
  status: JobStatus;
  company: Company;
  startDate: string;
  endDate?: string;
  progress: number;
  assignedTo: string[];
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
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export interface Invoice {
  id: string;
  reference: string;
  clientName: string;
  jobRef?: string;
  amount: number;
  status: InvoiceStatus;
  company: Company;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  jobId: string;
  jobRef: string;
  date: string;
  hours: number;
  description: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  company: Company;
}
