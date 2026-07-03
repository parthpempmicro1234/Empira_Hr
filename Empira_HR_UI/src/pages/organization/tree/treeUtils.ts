import { buildTree } from './buildTree';
import type { EmployeeFlatApi, EmployeeNode } from './employeeNodeTypes';

function isProbablyEmployeeRow(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && 'id' in x;
}

/** Dedupe flat rows by `id` (last occurrence wins). */
export function dedupeFlatEmployees(rows: EmployeeFlatApi[]): EmployeeFlatApi[] {
  const map = new Map<string, EmployeeFlatApi>();
  for (const row of rows) {
    map.set(String(row.id), row);
  }
  return Array.from(map.values());
}

/**
 * Pull a flat employee list from common DRF / custom wrapper shapes.
 */
export function extractOrgEmployeesArray(data: unknown): EmployeeFlatApi[] {
  if (Array.isArray(data)) {
    return data.filter(isProbablyEmployeeRow).map((x) => x as EmployeeFlatApi);
  }
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  const preferredKeys = ['results', 'data', 'employees', 'tree', 'items', 'rows', 'org_tree', 'people'];
  for (const k of preferredKeys) {
    const v = o[k];
    if (Array.isArray(v) && v.length && isProbablyEmployeeRow(v[0])) {
      return v as EmployeeFlatApi[];
    }
  }
  for (const v of Object.values(o)) {
    if (Array.isArray(v) && v.length && isProbablyEmployeeRow(v[0])) {
      return v as EmployeeFlatApi[];
    }
  }
  return [];
}

/**
 * Same as legacy OrgTree: combine manager + peers + employee + reportees into one flat list, then `buildTree`.
 * Supports camelCase (`reportingManager`) and snake_case.
 */
export function flattenEmployeeContextPayload(data: unknown): EmployeeFlatApi[] | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;
  const employee = o.employee;
  if (!employee || typeof employee !== 'object') return null;

  const rows: EmployeeFlatApi[] = [];
  const push = (x: unknown) => {
    if (x && typeof x === 'object' && 'id' in x) rows.push(x as EmployeeFlatApi);
  };

  push(o.reportingManager ?? o.reporting_manager ?? o.manager);
  const peers = o.peers;
  if (Array.isArray(peers)) peers.forEach(push);
  push(employee);
  const reportees = o.reportees;
  if (Array.isArray(reportees)) reportees.forEach(push);

  const deduped = dedupeFlatEmployees(rows);
  return deduped.length ? deduped : null;
}

export function parseOrgTreePayload(data: unknown): EmployeeNode[] {
  if (!data) return [];

  const contextFlat = flattenEmployeeContextPayload(data);
  if (contextFlat?.length) {
    return buildTree(contextFlat);
  }

  const flat = extractOrgEmployeesArray(data);
  if (flat.length) {
    return buildTree(dedupeFlatEmployees(flat));
  }

  return [];
}
