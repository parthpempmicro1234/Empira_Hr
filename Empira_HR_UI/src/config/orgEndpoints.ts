/**
 * Org tree API paths (relative to `api` axios baseURL).
 * Override with env if your DRF routes differ, e.g. `VITE_ORG_TREE_ROOT=/api/v1/orgtree`
 */
const ROOT = ((import.meta.env.VITE_ORG_TREE_ROOT as string | undefined) ?? '/org/orgtree').replace(/\/+$/, '');

export const orgEndpoints = {
  full: () => `${ROOT}/`,
  department: () => `${ROOT}/department/`,
  employeeContext: () => `${ROOT}/employee/`,
  employeeById: (id: string | number) => `${ROOT}/employee/${String(id)}/`,
  reporttreesList: () => `${ROOT}/reporttrees/`,
  /** Direct reports for lazy tree expansion */
  reporttrees: (id: string | number) => `${ROOT}/reporttrees/${String(id)}/`,
} as const;
