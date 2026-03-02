import { http } from './http';

export interface AttachmentItem {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

export const attachmentsApi = {
  listByEntity(entityType: string, entityId: string): Promise<AttachmentItem[]> {
    return http.get<AttachmentItem[]>(
      `/attachments?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
    );
  },
};
