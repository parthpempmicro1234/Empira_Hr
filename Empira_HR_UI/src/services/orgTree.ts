import { api } from './api';
import { orgEndpoints } from '../config/orgEndpoints';
import { parseOrgTreePayload } from '../pages/organization/tree/treeUtils';
import type { EmployeeNode } from '../pages/organization/tree/employeeNodeTypes';

export { parseOrgTreePayload } from '../pages/organization/tree/treeUtils';

export async function getOrgTreeFull(): Promise<EmployeeNode[]> {
  const res = await api.get<unknown>(orgEndpoints.full());
  return parseOrgTreePayload(res.data);
}

export async function getOrgTreeDepartment(): Promise<EmployeeNode[]> {
  const res = await api.get<unknown>(orgEndpoints.department());
  return parseOrgTreePayload(res.data);
}

export async function getOrgTreeMyContext(): Promise<EmployeeNode[]> {
  const res = await api.get<unknown>(orgEndpoints.employeeContext());
  return parseOrgTreePayload(res.data);
}

export async function getOrgTreeForEmployee(employeeId: string | number): Promise<EmployeeNode[]> {
  const res = await api.get<unknown>(orgEndpoints.employeeById(employeeId));
  return parseOrgTreePayload(res.data);
}
