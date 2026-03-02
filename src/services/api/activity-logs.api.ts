import { http } from './http';

export interface ActivityLogItem {
  id: string;
  user: string;
  action: string;
  detail?: string;
  timestamp: string;
}

export const activityLogsApi = {
  listByEntity(entityType: string, entityId: string): Promise<ActivityLogItem[]> {
    return http.get<ActivityLogItem[]>(
      `/activity-logs?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
    );
  },
};
