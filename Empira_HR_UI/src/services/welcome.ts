import { api } from './api';

export interface WelcomeEmployeeDetails {
  id: number;
  fname: string;
  lname: string;
  profile_image: string | null;
  display_name: string;
  employee_code: string;
  work_email: string;
  job_title_primary: string | null;
  job_title_secondary: string | null;
  business_unit: string | null;
  department: string | null;
  sub_department: string | null;
  work_location: string | null;
  reporting_to: number | null;
  reporting_to_name: string | null;
}

export interface WelcomeTeamPerson {
  id: number;
  display_name: string;
  job_title_primary: string | null;
  profile_image: string | null;
}

export interface WelcomeMyTeamEmployees {
  reportingManager: WelcomeTeamPerson | null;
  peers?: WelcomeTeamPerson[] | null;
}

export interface WelcomeDetailsResponse {
  employeeDetails: WelcomeEmployeeDetails;
  myTeamEmployees: WelcomeMyTeamEmployees;
  profileCompletionProgress: number;
}

export async function getWelcomeDetails(): Promise<WelcomeDetailsResponse> {
  const res = await api.get<WelcomeDetailsResponse>('/accounts/welcomescreen/details/');
  return res.data;
}

