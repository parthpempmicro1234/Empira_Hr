import { api } from './api';

export interface JobProfileManagerRef {
  id?: number | null;
  name?: string | null;
}

export interface JobProfilePeerRef {
  id?: number;
  name?: string | null;
}

/** GET /accounts/employees/profile/job/ */
export interface EmployeeJobProfileResponse {
  id?: number;
  employee_code?: string | null;
  job_title_primary?: string | null;
  job_title_secondary?: string | null;
  date_of_joining?: string | null;
  worker_type?: string | null;
  time_type?: string | null;
  probation_start?: string | null;
  probation_end?: string | null;
  business_unit?: string | null;
  department?: string | null;
  sub_department?: string | null;
  work_location?: string | null;
  legal_entity?: string | null;
  reporting_to?: number | null;
  reporting_to_name?: string | null;
  manager_of_manager?: JobProfileManagerRef | null;
  peers?: JobProfilePeerRef[] | null;
  /** Optional: count or list from API */
  direct_reports?: number | unknown[] | null;
  direct_reports_count?: number | null;
  notice_period?: string | null;
  contract_status?: string | null;
  pay_band?: string | null;
  pay_grade?: string | null;
  shift?: string | null;
  weekly_off_policy?: string | null;
  leave_plan?: string | null;
  holiday_calendar?: string | null;
  attendance_number?: string | null;
  attendance_tracking_policy?: string | null;
  attendance_penalisation_policy?: string | null;
  shift_weekly_off_rule?: string | null;
  shift_allowance_policy?: string | null;
  overtime?: string | null;
  expense_policy?: string | null;
  loan_policy?: string | null;
  air_ticket_policy?: string | null;
}

export async function getEmployeeJobProfile(): Promise<EmployeeJobProfileResponse> {
  const res = await api.get<EmployeeJobProfileResponse>('/accounts/employees/profile/job/');
  return res.data ?? {};
}
