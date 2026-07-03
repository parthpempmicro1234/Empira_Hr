/** Map API `type` strings to internal calendar style keys */
const API_TYPE_TO_STYLE = {
  absent: 'absent',
  leave: 'leave',
  paid_leave: 'paid-leave',
  unpaid_leave: 'unpaid-leave',
  holiday: 'holiday',
  week_off: 'weekly-off',
  work_from_home: 'wfh',
  on_duty: 'on-duty',
  remote: 'remote',
  present: 'present',
  multiple_leave: 'multiple-leave',
  someone_on_leave: 'on-leave',
  someone_on_wfh_od: 'wfh-od',
  no_attendance: 'no-attendance',
};

/** Types that should not render marker, color, or hover in the team calendar */
const SILENT_CALENDAR_TYPES = new Set(['present']);

export function normalizeApiCalendarType(apiType) {
  if (!apiType) return null;
  const key = String(apiType).trim();
  if (API_TYPE_TO_STYLE[key]) return API_TYPE_TO_STYLE[key];
  return key.replace(/_/g, '-');
}

export function isSilentCalendarType(styleType) {
  if (!styleType) return false;
  return SILENT_CALENDAR_TYPES.has(styleType);
}
