const ROOT = ((import.meta.env.VITE_EMPLOYEE_DIRECTORY_ROOT as string | undefined) ?? '/org')
  .replace(/\/+$/, '');

export const employeeDirectoryEndpoints = {
  businessUnits: () => `${ROOT}/business-units/`,
  departments: () => `${ROOT}/departments/`,
  subDepartments: () => `${ROOT}/sub-departments/`,
  workLocations: () => `${ROOT}/work-locations/`,
  directory: () => `${ROOT}/employees/directory/`,
} as const;

