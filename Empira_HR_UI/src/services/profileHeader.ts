import { api } from './api';

export interface ProfileHeaderResponse {
  id: number;
  fname: string;
  lname: string;
  profile_image: string | null;
  display_name: string;
  employee_code: string;
  work_email: string;
  job_title_primary: string | null;
  business_unit: string | null;
  department: string | null;
  sub_department: string | null;
  work_location: string | null;
  reporting_to: number | null;
  reporting_to_name: string | null;
}

export type ProfileHeaderEmployeeId = number | 'me';

export async function getProfileHeader(employeeId: ProfileHeaderEmployeeId = 'me'): Promise<ProfileHeaderResponse> {
  const res = await api.get<ProfileHeaderResponse>(
    `/accounts/employees/public/profileheader/${employeeId}/`
  );
  return res.data;
}

