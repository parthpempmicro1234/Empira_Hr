import { api } from './api';

export interface DashboardEmployee {
  id: number;
  display_name: string;
}

export interface DashboardPerson {
  id: number;
  display_name: string;
  profile_image: string | null;
  date_of_birth: string | null;
  date_of_joining: string | null;
  job_title_primary?: string | null;
}

export interface DashboardResponse {
  employee: DashboardEmployee;
  birthdays_today: DashboardPerson[];
  upcoming_birthdays: DashboardPerson[];
  anniversary_today: DashboardPerson[];
  upcoming_anniversary: DashboardPerson[];
  new_joined_today: DashboardPerson[];
  recent_joined: DashboardPerson[];
}

export async function getDashboard(): Promise<DashboardResponse> {
  const res = await api.get<DashboardResponse>('/accounts/employee/dashbord/');
  return res.data;
}

