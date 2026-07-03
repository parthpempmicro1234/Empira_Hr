import { api } from './api';

export interface MyTeamEmployeeRaw {
  id: number | string;
  display_name?: string | null;
  profile_image?: string | null;
  job_title_primary?: string | null;
  work_email?: string | null;
  mobile_number?: string | null;
  personal_email?: string | null;
  reporting_to?: number | null;
}

export type MyTeamSummaryStatKey =
  | 'Employees On Time today'
  | 'Late Arrivals today'
  | 'Work from Home / On Duty today'
  | 'Remote Clock-ins today';

export type MyTeamSummaryResponse = {
  on_leave_today?: MyTeamEmployeeRaw[];
  not_in_yet_today?: MyTeamEmployeeRaw[];
  'Direct Report'?: MyTeamEmployeeRaw[];
  Peers?: MyTeamEmployeeRaw[];
  'Employees On Time today'?: number;
  'Late Arrivals today'?: number;
  'Work from Home / On Duty today'?: number;
  'Remote Clock-ins today'?: number;
  /** Optional employee lists when API provides them */
  remote_clock_ins_today?: MyTeamEmployeeRaw[];
  remote_employees_today?: MyTeamEmployeeRaw[];
  working_remotely_today?: MyTeamEmployeeRaw[];
};

export async function getMyTeamSummary(view?: 'peers'): Promise<MyTeamSummaryResponse> {
  const params: Record<string, string> = {};
  if (view === 'peers') params.view = 'peers';

  const res = await api.get<MyTeamSummaryResponse>('myteam/summary/', { params });
  return res.data ?? {};
}

export interface TeamCalendarDayEntry {
  type: string;
  leave_name?: string | null;
}

export interface MyTeamCalendarEmployeeRaw extends MyTeamEmployeeRaw {
  date_of_joining?: string | null;
  employeeorganization__business_unit_id?: number | null;
}

export interface MyTeamCalendarResponse {
  month: number;
  year: number;
  days_in_month: number;
  team: MyTeamCalendarEmployeeRaw[];
  calendar_data: Record<string, Record<string, TeamCalendarDayEntry>>;
}

/**
 * GET /myteam/teamcalander/
 * @param year — e.g. 2026
 * @param month — e.g. "03" or 3
 * @param view — "peers" when peers tab active
 */
export async function getMyTeamCalendar(
  year: number,
  month: string | number,
  view?: 'peers'
): Promise<MyTeamCalendarResponse> {
  const params: Record<string, string> = {
    year: String(year),
    month: String(month).padStart(2, '0'),
  };
  if (view === 'peers') params.view = 'peers';

  const res = await api.get<MyTeamCalendarResponse>('myteam/teamcalander/', { params });
  return res.data ?? { month: 1, year, days_in_month: 0, team: [], calendar_data: {} };
}
