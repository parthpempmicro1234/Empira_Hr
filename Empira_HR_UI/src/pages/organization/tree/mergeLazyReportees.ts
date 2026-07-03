import { normalizeFlatEmployee } from './buildTree';
import type { EmployeeFlatApi, EmployeeNode } from './employeeNodeTypes';

export function findNodeInTree(roots: EmployeeNode[], id: string): EmployeeNode | null {
  const sid = String(id);
  for (const r of roots) {
    const found = findNodeDeep(r, sid);
    if (found) return found;
  }
  return null;
}

function findNodeDeep(node: EmployeeNode, id: string): EmployeeNode | null {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const found = findNodeDeep(c, id);
    if (found) return found;
  }
  return null;
}

function mergeChildrenById(existing: EmployeeNode[], incoming: EmployeeNode[]): EmployeeNode[] {
  const map = new Map<string, EmployeeNode>();
  for (const c of existing) {
    map.set(c.id, { ...c, children: c.children ?? [] });
  }
  for (const c of incoming) {
    const prev = map.get(c.id);
    if (prev) {
      map.set(c.id, {
        ...c,
        children: (c.children?.length ? c.children : prev.children) ?? [],
      });
    } else {
      map.set(c.id, { ...c, children: c.children ?? [] });
    }
  }
  return Array.from(map.values());
}

function patchChildrenAt(
  node: EmployeeNode,
  managerId: string,
  incoming: EmployeeNode[]
): EmployeeNode {
  if (node.id === managerId) {
    return {
      ...node,
      children: mergeChildrenById(node.children ?? [], incoming),
    };
  }
  if (!node.children?.length) return node;
  return {
    ...node,
    children: node.children.map((c) => patchChildrenAt(c, managerId, incoming)),
  };
}

/** Immutable attach / merge `incoming` as children of the node with id `managerId`. */
export function mergeReporteesUnderManager(
  roots: EmployeeNode[],
  managerId: string,
  incoming: EmployeeNode[]
): EmployeeNode[] {
  return roots.map((r) => patchChildrenAt(r, managerId, incoming));
}

/** Ensure flat API rows link to `managerId` when the reporttrees payload omits `reporting_to`. */
export function withReportingToManager(
  rows: EmployeeFlatApi[],
  managerId: string
): EmployeeFlatApi[] {
  return rows.map((row) => {
    const r = row as EmployeeFlatApi & Record<string, unknown>;
    const has =
      r.reporting_to !== undefined &&
      r.reporting_to !== null &&
      String(r.reporting_to).length > 0;
    if (has) return row;
    return { ...row, reporting_to: managerId };
  });
}

export function flatRowsToChildNodes(rows: EmployeeFlatApi[], managerId: string): EmployeeNode[] {
  return withReportingToManager(rows, managerId).map((r) => normalizeFlatEmployee(r));
}
