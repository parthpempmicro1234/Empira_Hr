import { api } from './api';

export type TimelineEventType = 'work_anniversary' | 'joined' | (string & {});

export interface EmployeeTimelineEvent {
  type: TimelineEventType;
  title: string;
  date: string; // YYYY-MM-DD
}

export interface EmployeeTimelineYearBlock {
  year: number;
  events: EmployeeTimelineEvent[];
}

export interface EmployeeTimelineResponse {
  employee_id: number;
  name: string;
  timeline: EmployeeTimelineYearBlock[];
}

export async function getEmployeeTimeline(employeeId?: number): Promise<EmployeeTimelineResponse> {
  const url =
    typeof employeeId === 'number'
      ? `/accounts/employees/profile/timeline/${employeeId}/`
      : '/accounts/employees/profile/timeline/';
  const res = await api.get<EmployeeTimelineResponse>(url);
  return res.data;
}

