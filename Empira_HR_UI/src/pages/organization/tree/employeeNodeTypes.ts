/** Canonical employee node used by the org tree UI (after API normalization). */
export interface EmployeeNode {
  id: string;
  display_name: string;
  profile_image: string | null;
  job_title_primary: string;
  employee_code: string;
  work_location: string;
  department: string;
  sub_department: string;
  business_unit: string;
  reporting_to: string | null;
  reportee_count: number;
  children?: EmployeeNode[];
}

/** Loose API row (snake_case DRF). */
export type EmployeeFlatApi = {
  id: string | number;
  display_name?: string | null;
  displayName?: string | null;
  profile_image?: string | null;
  job_title_primary?: string | null;
  employee_code?: string | number | null;
  work_location?: string | null;
  department?: string | null;
  sub_department?: string | null;
  business_unit?: string | null;
  reporting_to?: string | number | null;
  reportee_count?: string | number | null;
};
