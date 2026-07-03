import { getStatusLabel } from '../calendarStatusStyles.js';

const WORK_MODE_TYPES = new Set(['wfh', 'remote', 'on-duty']);

function formatTooltipDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * @param {{ displayName?: string, name?: string }} employee
 * @param {{ iso?: string, dow?: string, date?: number }} dayMeta
 * @param {{ type?: string, label?: string, color?: string, detail?: object } | null} status
 */
export function buildCalendarTooltipContent(employee, dayMeta, status) {
  if (!status?.label && !status?.type) return null;

  const employeeName = employee?.displayName ?? employee?.name ?? '';
  const dateLabel = formatTooltipDate(dayMeta?.iso);
  const detail = status.detail ?? {};
  const categoryLabel = detail.categoryLabel ?? getStatusLabel(status.type);
  const leaveName = detail.leaveName ?? null;
  const primaryLabel = status.label ?? categoryLabel;
  const workMode =
    detail.workMode ??
    (WORK_MODE_TYPES.has(status.type) ? getStatusLabel(status.type) : null);

  const rows = [];

  if (employeeName) {
    rows.push({ kind: 'label', text: employeeName });
  }
  if (dateLabel) {
    rows.push({ kind: 'date', text: dateLabel });
  }

  rows.push({
    kind: 'status',
    text: primaryLabel,
    color: status.color,
    emphasized: true,
  });

  if (leaveName && categoryLabel && categoryLabel !== leaveName) {
    rows.push({ kind: 'meta', label: 'Type', text: categoryLabel });
  } else if (categoryLabel && categoryLabel !== primaryLabel && !leaveName) {
    rows.push({ kind: 'meta', label: 'Status', text: categoryLabel });
  }

  if (workMode && workMode !== primaryLabel && workMode !== categoryLabel) {
    rows.push({ kind: 'meta', label: 'Work mode', text: workMode });
  }

  return { rows, primaryLabel };
}
