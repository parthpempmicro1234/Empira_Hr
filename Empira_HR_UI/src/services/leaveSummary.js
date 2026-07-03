import { api } from './api';

/**
 * GET /leave/myleaves/summary/
 * Response is normalized to an array of per–leave-type summary objects.
 */
export async function fetchMyLeavesSummary(year) {
  const params = year ? { year } : undefined;
  const res = await api.get('leave/myleaves/summary/', params ? { params } : undefined);
  return res.data;
}

export function normalizeSummaryList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function getLeaveTypeId(item) {
  const id = item?.leave_type?.id ?? item?.leave_type_id;
  if (id === 0 || id === '0') return 0;
  if (id != null && id !== '') return id;
  return null;
}

export function getLeaveTypeName(item) {
  return item?.leave_type?.name ?? item?.leave_type_name ?? 'Leave';
}

/** Stable id for sidebar selection when API omits leave_type.id */
export function getSummaryRowKey(item, index = 0) {
  const id = getLeaveTypeId(item);
  if (id != null && id !== '') return id;
  return `__fallback-${index}`;
}
