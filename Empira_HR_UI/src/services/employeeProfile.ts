import { api } from './api';

export interface ProfileBasic {
  fname: string | null;
  lname: string | null;
  display_name: string | null;
  gender: string | null;
  date_of_birth: string | null; // YYYY-MM-DD
  marital_status: string | null;
  blood_group: string | null;
  nationality: string | null;
  personal_email: string | null;
  mobile_number: string | null;
  work_email?: string | null;
}

export interface ProfileAddress {
  address_line1: string | null;
  address_line2: string | null;
  country: number | null;
  state: number | null;
  city: number | null;
  zip: string | null;
  country_name?: string | null;
  state_name?: string | null;
  city_name?: string | null;
}

export interface ProfileAddresses {
  current: ProfileAddress | null;
  permanent: ProfileAddress | null;
}

export interface IdentityDocument {
  // DRF identity shape
  identity_type?: string | null; // "aadhaar" | "pan" | ...
  document_number?: string | null;
  name_on_document?: string | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  parent_name?: string | null;
  is_verified?: boolean | null;
  document_file?: string | null;

  // Back-compat aliases (if backend changes)
  type?: string | null;
  number?: string | null;
  name?: string | null;
}

export interface EmployeeProfileResponse {
  basic: ProfileBasic;
  addresses: ProfileAddresses;
  identity?: IdentityDocument[];
}

export interface EmployeeProfilePatch {
  basic?: Partial<ProfileBasic>;
  addresses?: {
    current?: Partial<ProfileAddress>;
    permanent?: Partial<ProfileAddress>;
  };
}

export async function getEmployeeProfile(): Promise<EmployeeProfileResponse> {
  const res = await api.get<EmployeeProfileResponse>('/accounts/employees/profile/');
  return res.data;
}

export async function patchEmployeeProfile(payload: EmployeeProfilePatch): Promise<EmployeeProfileResponse> {
  const res = await api.patch<EmployeeProfileResponse>('/accounts/employees/profile/', payload);
  return res.data;
}

