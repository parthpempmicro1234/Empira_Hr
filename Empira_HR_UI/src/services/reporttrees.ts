import { api } from './api';
import { orgEndpoints } from '../config/orgEndpoints';
import { extractOrgEmployeesArray } from '../pages/organization/tree/treeUtils';
import type { EmployeeFlatApi } from '../pages/organization/tree/employeeNodeTypes';

/** Minimal row shape used by About / legacy callers */
export interface Reportee {
  id: number;
  display_name: string;
  profile_image: string | null;
  job_title_primary?: string | null;
}

/**
 * Direct reports for one manager — used when the user expands a node in the org tree.
 * GET {VITE_ORG_TREE_ROOT}/reporttrees/{id}/
 */
export async function getReporttreesByManagerId(employeeId: string | number): Promise<EmployeeFlatApi[]> {
  const res = await api.get<unknown>(orgEndpoints.reporttrees(employeeId));
  const raw = res.data;

  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'message' in raw && !('results' in raw)) {
    const msg = (raw as { message?: unknown }).message;
    if (typeof msg === 'string' && msg) throw new Error(msg);
  }

  const extracted = extractOrgEmployeesArray(raw);
  if (extracted.length) return extracted;

  if (Array.isArray(raw)) {
    return raw.filter((x) => x && typeof x === 'object' && 'id' in (x as object)) as EmployeeFlatApi[];
  }

  return [];
}

/** @deprecated use getReporttreesByManagerId for per-manager expansion */
export async function getReporttrees(employeeId?: number): Promise<unknown> {
  const url =
    typeof employeeId === 'number'
      ? orgEndpoints.reporttrees(employeeId)
      : orgEndpoints.reporttreesList();
  const res = await api.get(url);
  return res.data;
}
