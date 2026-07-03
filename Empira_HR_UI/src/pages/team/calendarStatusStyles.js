/** Palette matched to target Team calendar UI */
export const STATUS_COLORS = {
  wfh: '#a855f7',
  'on-duty': '#ec4899',
  leave: '#4fd1c5',
  'paid-leave': '#4fd1c5',
  'unpaid-leave': '#c4b5a2',
  'no-attendance': '#f87171',
  absent: '#f87171',
  holiday: '#4ade80',
  'weekly-off': '#f9bc15',
  present: '#34d399',
  remote: '#38bdf8',
  'leave-span-a': 'rgba(55, 72, 92, 0.88)',
  'leave-span-b': 'rgba(154, 123, 106, 0.92)',
  'multiple-leave': '#ef4444',
  'on-leave': '#60a5fa',
  'wfh-od': '#a855f7',
};

export const PANEL_BG = '#111d2b';
export const PANEL_BORDER = 'rgba(45, 58, 78, 0.55)';

export const CELL_PX = 26;
export const EMP_COL_PX = 168;
export const CALENDAR_GAP_PX = 72;
export const ROW_PX = 28;
export const MARKER_PX = 22;
export const BAND_HEIGHT_PX = 22;

export const CALENDAR_LEGEND = [
  { id: 'wfh', label: 'Work from home', swatch: 'circle', color: STATUS_COLORS.wfh },
  { id: 'on-duty', label: 'On duty', swatch: 'circle', color: STATUS_COLORS['on-duty'] },
  { id: 'leave', label: 'Leave', swatch: 'circle', color: STATUS_COLORS.leave },
  { id: 'paid-leave', label: 'Paid Leave', swatch: 'circle', color: STATUS_COLORS['paid-leave'] },
  { id: 'unpaid-leave', label: 'Unpaid Leave', swatch: 'circle', color: STATUS_COLORS['unpaid-leave'] },
  { id: 'absent', label: 'Absent', swatch: 'circle', color: STATUS_COLORS.absent },
  { id: 'no-attendance', label: 'No Attendance', swatch: 'circle', color: STATUS_COLORS['no-attendance'] },
  { id: 'weekly-off', label: 'Weekly off', swatch: 'circle', color: STATUS_COLORS['weekly-off'] },
  { id: 'holiday', label: 'Holiday', swatch: 'circle', color: STATUS_COLORS.holiday },
  { id: 'remote', label: 'Remote', swatch: 'circle', color: STATUS_COLORS.remote },
  { id: 'on-leave', label: 'Someone on Leave', swatch: 'dot', color: STATUS_COLORS['on-leave'] },
  { id: 'multiple-leave', label: 'Multiple Leave on a day', swatch: 'dot', color: STATUS_COLORS['multiple-leave'] },
  { id: 'wfh-od', label: 'Someone on WFH/OD', swatch: 'dot', color: STATUS_COLORS['wfh-od'] },
];

export function statusBg(type) {
  return STATUS_COLORS[type] ?? '#64748b';
}

export const STATUS_LABELS = {
  wfh: 'Work from home',
  'on-duty': 'On duty',
  leave: 'Leave',
  'paid-leave': 'Paid Leave',
  'unpaid-leave': 'Unpaid Leave',
  'no-attendance': 'No Attendance',
  absent: 'Absent',
  holiday: 'Holiday',
  'weekly-off': 'Weekly off',
  present: 'Present',
  remote: 'Remote',
  'leave-span-a': 'Paid Leave',
  'leave-span-b': 'Unpaid Leave',
  'multiple-leave': 'Multiple Leave',
  'on-leave': 'Someone on Leave',
  'wfh-od': 'Someone on WFH/OD',
};

export function getStatusLabel(type) {
  if (!type) return '';
  return STATUS_LABELS[type] ?? type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function calendarGridTemplate(dayCount) {
  return `${EMP_COL_PX}px ${CALENDAR_GAP_PX}px repeat(${dayCount}, ${CELL_PX}px)`;
}

export const CALENDAR_FIRST_DAY_COL = 3;

export function calendarTrackWidth(dayCount) {
  return dayCount * CELL_PX;
}
