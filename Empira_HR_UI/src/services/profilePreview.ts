import { api } from './api';

export interface ProfilePreviewResponse {
  id: number;
  display_name?: string | null;
  work_email?: string | null;
  profile_image?: string | null;
  location?: string | null;
  job_title_primary?: string | null;
  job_title_secondary?: string | null;
  department?: string | null;
  business_unit?: string | null;
}

export async function getProfilePreview(employeeId: number): Promise<ProfilePreviewResponse> {
  const res = await api.get<ProfilePreviewResponse>(`/accounts/employees/public/profileheader/${employeeId}/`);
  return res.data;
}

