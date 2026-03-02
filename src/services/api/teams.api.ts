import { http, RequestOptions } from './http';

export interface TeamMemberInfo {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleInTeam: string | null;
}

export interface Team {
  id: string;
  name: string;
  isActive: boolean;
  companyId: string;
  company: string;
  members: TeamMemberInfo[];
}

export const teamsApi = {
  list: (): Promise<Team[]> =>
    http.get<Team[]>('/teams'),

  create: (data: { name: string }): Promise<Team> =>
    http.post<Team>('/teams', data),

  update: (id: string, data: { name?: string; isActive?: boolean }): Promise<Team> =>
    http.patch<Team>(`/teams/${id}`, data),

  addMember: (teamId: string, data: { userId: string; roleInTeam?: string }, opts?: RequestOptions): Promise<Team> =>
    http.post<Team>(`/teams/${teamId}/members`, data, opts),

  removeMember: (teamId: string, userId: string, opts?: RequestOptions): Promise<Team> =>
    http.delete<Team>(`/teams/${teamId}/members/${userId}`, opts),
};
