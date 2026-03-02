import { http } from './http';

export interface TeamPlanningSlotData {
  id: string;
  teamId: string;
  date: string;
  startHour: number;
  endHour: number;
  jobId: string;
  jobRef: string;
  jobTitle: string;
  jobAddress?: string;
  notes: string | null;
}

export interface TeamPlanningWeekData {
  id: string | null;
  weekStart: string;
  status: 'draft' | 'locked';
  version: number;
  lockedAt: string | null;
  lockedByUser: string | null;
  lastDispatch: { sentAt: string; status: string } | null;
  teams: Array<{
    id: string;
    name: string;
    members: Array<{ userId: string; userName: string; userEmail: string; roleInTeam: string | null }>;
  }>;
  slots: TeamPlanningSlotData[];
}

export interface CreateTeamSlotPayload {
  teamId: string;
  date: string;
  startHour: number;
  endHour: number;
  jobId: string;
  notes?: string;
}

export interface MyPlanningData {
  weekStart: string;
  slots: Array<{
    id: string;
    date: string;
    startHour: number;
    endHour: number;
    jobRef: string;
    jobTitle: string;
    jobAddress: string;
    teamName: string;
  }>;
}

export const teamPlanningApi = {
  getWeek: (weekStart: string): Promise<TeamPlanningWeekData> =>
    http.get<TeamPlanningWeekData>(`/team-planning?weekStart=${weekStart}`),

  createSlot: (data: CreateTeamSlotPayload): Promise<TeamPlanningSlotData & { warnings?: string[] }> =>
    http.post<TeamPlanningSlotData & { warnings?: string[] }>('/team-planning/slots', data),

  deleteSlot: (id: string): Promise<void> =>
    http.delete<void>(`/team-planning/slots/${id}`),

  lockWeek: (weekStart: string): Promise<{ locked: boolean; version: number }> =>
    http.post('/team-planning/lock', { weekStart }),

  unlockWeek: (weekStart: string): Promise<{ unlocked: boolean; version: number }> =>
    http.post('/team-planning/unlock', { weekStart }),

  sendPlanning: (weekStart: string): Promise<{ sent: boolean; status: string; recipientCount: number }> =>
    http.post('/team-planning/send', { weekStart }),

  getMyPlanning: (weekStart: string): Promise<MyPlanningData> =>
    http.get<MyPlanningData>(`/team-planning/my?weekStart=${weekStart}`),
};
