import { http } from './http';

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  companyId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  beforeKeys: number;
  afterKeys: number;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  nextCursor: string | null;
}

export interface AuditLogActionStat {
  action: string;
  count: number;
}

export interface AuditLogQuery {
  from?: string;
  to?: string;
  action?: string;
  entity?: string;
  cursor?: string;
  limit?: number;
}

export const auditLogApi = {
  list: (q: AuditLogQuery = {}): Promise<AuditLogPage> => {
    const params = new URLSearchParams();
    if (q.from) params.set('from', q.from);
    if (q.to) params.set('to', q.to);
    if (q.action) params.set('action', q.action);
    if (q.entity) params.set('entity', q.entity);
    if (q.cursor) params.set('cursor', q.cursor);
    if (q.limit) params.set('limit', String(q.limit));
    const qs = params.toString();
    return http.get<AuditLogPage>(`/admin/audit-log${qs ? `?${qs}` : ''}`);
  },
  actions: (): Promise<AuditLogActionStat[]> =>
    http.get<AuditLogActionStat[]>('/admin/audit-log/actions'),
};
