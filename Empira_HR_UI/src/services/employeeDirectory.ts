import { api } from './api';
import { employeeDirectoryEndpoints } from '../config/employeeDirectoryEndpoints';

export type DirectoryOption = { id: string | number; name: string };

export type BusinessUnitOption = DirectoryOption;
export type DepartmentOption = DirectoryOption & { business_unit: string | number | null };
export type SubDepartmentOption = DirectoryOption & { department: string | number | null };
export type WorkLocationOption = DirectoryOption & { city?: string | null };

export type DirectoryEmployee = {
  id: number | string;
  display_name?: string | null;
  profile_image?: string | null;
  job_title_primary?: string | null;
  department?: string | null;
  sub_department?: string | null;
  business_unit?: string | null;
  work_location?: string | null;
  work_email?: string | null;
};

export type DirectoryFilters = {
  business_unit: string[];
  department: string[];
  sub_department: string[];
  work_location: string[];
  search: string;
};

function listParam(xs: string[]) {
  return xs.length ? xs.join(',') : undefined;
}

export async function getBusinessUnits(): Promise<BusinessUnitOption[]> {
  const res = await api.get<BusinessUnitOption[]>(employeeDirectoryEndpoints.businessUnits());
  return res.data ?? [];
}

export async function getDepartments(): Promise<DepartmentOption[]> {
  const res = await api.get<DepartmentOption[]>(employeeDirectoryEndpoints.departments());
  return res.data ?? [];
}

export async function getSubDepartments(): Promise<SubDepartmentOption[]> {
  const res = await api.get<SubDepartmentOption[]>(employeeDirectoryEndpoints.subDepartments());
  return res.data ?? [];
}

export async function getWorkLocations(): Promise<WorkLocationOption[]> {
  const res = await api.get<WorkLocationOption[]>(employeeDirectoryEndpoints.workLocations());
  return res.data ?? [];
}

/** Fetch full directory (client-side filtering will be applied in UI). */
export async function getEmployeeDirectoryAll(): Promise<DirectoryEmployee[]> {
  const res = await api.get<DirectoryEmployee[]>(employeeDirectoryEndpoints.directory());
  return res.data ?? [];
}

export async function getEmployeeDirectory(filters: DirectoryFilters): Promise<DirectoryEmployee[]> {
  const params: Record<string, string | undefined> = {
    employeeorganization__business_unit: listParam(filters.business_unit),
    employeeorganization__department: listParam(filters.department),
    employeeorganization__sub_department: listParam(filters.sub_department),
    employeeorganization__work_location: listParam(filters.work_location),
    search: filters.search.trim() || undefined,
  };
  const res = await api.get<DirectoryEmployee[]>(employeeDirectoryEndpoints.directory(), { params });
  return res.data ?? [];
}

