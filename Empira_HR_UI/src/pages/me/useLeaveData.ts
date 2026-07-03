import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseNum(v) {
  const n = Number.parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatShortDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}`;
}

export function formatDateRangeCompact(startDate, endDate) {
  if (!startDate) return '-';
  const endValue = endDate ?? startDate;
  const start = new Date(startDate);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-';

  // "10 Jul - 11 Jul 2025" (year shown once on the right).
  return `${formatShortDate(startDate)} - ${formatShortDate(endValue)} ${end.getFullYear()}`;
}

export function formatDays(totalDays, durationType) {
  if (String(durationType ?? '').toLowerCase() === 'half') {
    return '0.5 Day';
  }
  const value = parseNum(totalDays);
  if (value === 0.5) return '0.5 Day';
  const normalized = value % 1 === 0 ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  return `${normalized} ${value === 1 ? 'Day' : 'Days'}`;
}

function toDisplayName(value, fallback = '-') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return (
      value.full_name ||
      value.name ||
      value.employee_name ||
      value.username ||
      value.email ||
      [value.first_name, value.last_name].filter(Boolean).join(' ') ||
      fallback
    );
  }
  return fallback;
}

function getLeaveTypeName(item) {
  const raw = item?.leave_type_name ?? item?.leave_type;
  const name = toDisplayName(raw, 'Leave');
  return String(name).toLowerCase().includes('leave') ? name : `${name} Leave`;
}

function getRequestedOn(item) {
  return item?.requested_on ?? item?.created_at ?? item?.applied_on ?? item?.created;
}

function getActionTakenOn(item) {
  return item?.action_taken_on ?? item?.updated_at ?? item?.modified_at ?? null;
}

function getActionTakenBy(item) {
  return toDisplayName(item?.action_taken_by_name, '-');
}

function getRequestedBy(item) {
  return toDisplayName(item?.requested_by_name, 'Self');
}

function normalizeStatus(status) {
  return String(status ?? '').toLowerCase();
}

function sortByStartDateDesc(items) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a?.start_date ?? 0).getTime();
    const bTime = new Date(b?.start_date ?? 0).getTime();
    return bTime - aTime;
  });
}

async function fetchLeaveData() {
  const res = await api.get('leave/employeeleaves/');
  return res.data;
}

function normalizeEmployeeLeavesResponse(data) {
  if (!data) return { list: [], joiningYear: null };
  if (Array.isArray(data)) {
    const jy = data?.[0]?.joining_year ?? null;
    return { list: data, joiningYear: jy != null ? Number(jy) : null };
  }
  if (Array.isArray(data?.results)) {
    const jy = data?.joining_year ?? data?.results?.[0]?.joining_year ?? null;
    return { list: data.results, joiningYear: jy != null ? Number(jy) : null };
  }
  if (Array.isArray(data?.data)) {
    const jy = data?.joining_year ?? data?.data?.[0]?.joining_year ?? null;
    return { list: data.data, joiningYear: jy != null ? Number(jy) : null };
  }
  const jy = data?.joining_year ?? null;
  return { list: [], joiningYear: jy != null ? Number(jy) : null };
}

async function fetchLeaveDataByYear(year) {
  const params = year ? { year } : undefined;
  const res = await api.get('leave/employeeleaves/', params ? { params } : undefined);
  return res.data;
}

export default function useLeaveData(year) {
  const query = useQuery({
    queryKey: ['leave', 'employeeleaves', year ?? '__all__'],
    queryFn: () => fetchLeaveDataByYear(year),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const meta = useMemo(() => normalizeEmployeeLeavesResponse(query.data), [query.data]);
  const joiningYear = meta.joiningYear;

  const rows = useMemo(() => {
    const list = meta.list;
    return sortByStartDateDesc(list).map((item) => {
      const status = normalizeStatus(item?.status);
      const startDate = item?.start_date ?? null;
      const endDate = item?.end_date ?? item?.start_date ?? null;
      const requestedOnRaw = getRequestedOn(item);
      return {
        id: item?.id ?? `${item?.start_date}-${item?.end_date}-${item?.leave_type_name ?? item?.leave_type ?? 'leave'}`,
        status,
        statusLabel: status ? status.charAt(0).toUpperCase() + status.slice(1) : '-',
        start_date: startDate,
        end_date: endDate,
        dateRange: `${formatDate(startDate)} - ${formatDate(endDate)}`,
        dateRangeCompact: formatDateRangeCompact(startDate, endDate),
        leaveDate: formatDate(item?.start_date),
        leaveDays: formatDays(item?.total_days, item?.duration_type),
        leaveType: getLeaveTypeName(item),
        requested_on: requestedOnRaw ?? null,
        requestedOn: formatDate(requestedOnRaw),
        leaveRequestedOn: `Requested on ${formatDate(requestedOnRaw)}`,
        statusMeta: `by ${getActionTakenBy(item)}`,
        requestedBy: getRequestedBy(item),
        actionTakenOn: formatDate(getActionTakenOn(item)),
        leaveNote: item?.reason || '-',
        reason: item?.rejection_reason || '-',
      };
    });
  }, [query.data]);

  const pending = useMemo(() => rows.filter((item) => item.status === 'pending'), [rows]);
  const history = useMemo(() => rows.filter((item) => item.status !== 'pending'), [rows]);

  return {
    ...query,
    pending,
    history,
    joiningYear,
  };
}

