import type { EmployeeFlatApi, EmployeeNode } from './employeeNodeTypes';

export function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

function str(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return '';
}

function nestedName(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'name' in v) return str((v as { name: unknown }).name);
  return '';
}

function pickReportingTo(raw: Record<string, unknown>): string | null {
  const direct =
    raw.reporting_to ?? raw.reporting_to_id ?? raw.manager_id ?? raw.parent_id ?? raw.supervisor_id;
  if (direct !== undefined && direct !== null && direct !== '') {
    return String(direct);
  }
  const mgr = raw.manager ?? raw.reporting_manager ?? raw.reportingManager ?? raw.supervisor;
  if (mgr && typeof mgr === 'object' && mgr !== null && 'id' in mgr) {
    return String((mgr as { id: unknown }).id);
  }
  return null;
}

export function normalizeFlatEmployee(raw: EmployeeFlatApi): EmployeeNode {
  const r = raw as EmployeeFlatApi & Record<string, unknown>;
  const id = String(r.id);
  const reporting = pickReportingTo(r);

  const dept = str(r.department) || nestedName(r.department) || nestedName(r.department_id);
  const sub = str(r.sub_department) || nestedName(r.sub_department) || nestedName(r.sub_department_id);
  const bu = str(r.business_unit) || nestedName(r.business_unit);

  return {
    id,
    display_name: str(r.display_name ?? r.displayName),
    profile_image: (() => {
      const pi = r.profile_image ?? r.profileImage;
      if (pi === undefined || pi === null || pi === '') return null;
      return String(pi);
    })(),
    job_title_primary: str(r.job_title_primary ?? r.jobTitlePrimary),
    employee_code: r.employee_code != null ? String(r.employee_code) : str(r.employee_code ?? r.code),
    work_location: str(r.work_location ?? r.workLocation),
    department: dept,
    sub_department: sub,
    business_unit: bu,
    reporting_to: reporting,
    reportee_count: Number(r.reportee_count ?? 0),
    children: [],
  };
}

/**
 * Nests flat employees under their manager using `reporting_to` → `id`.
 * Returns one root per disconnected subtree (typical org has a single root).
 */
export function buildTree(flatData: EmployeeFlatApi[]): EmployeeNode[] {
  if (!flatData.length) return [];

  const normalized = flatData.map(normalizeFlatEmployee);
  const byId = new Map<string, EmployeeNode>();

  for (const n of normalized) {
    byId.set(n.id, { ...n, children: [] });
  }

  const roots: EmployeeNode[] = [];

  for (const n of normalized) {
    const node = byId.get(n.id);
    if (!node) continue;
    const pid = n.reporting_to;
    if (pid && byId.has(pid)) {
      byId.get(pid)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Default expanded: root and direct reports (so three tiers of cards can appear). */
export function defaultExpandedNodeIds(roots: EmployeeNode[]): Set<string> {
  const set = new Set<string>();
  for (const root of roots) {
    walkDefaultExpand(root, 0, set);
  }
  return set;
}

function walkDefaultExpand(node: EmployeeNode, depth: number, acc: Set<string>) {
  const kids = node.children ?? [];
  if (kids.length > 0 && depth < 2) acc.add(node.id);
  for (const c of kids) walkDefaultExpand(c, depth + 1, acc);
}
