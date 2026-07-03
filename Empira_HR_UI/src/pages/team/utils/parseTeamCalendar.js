import { normalizeTeamEmployeeList } from './teamEmployeeUtils.js';
import { isSilentCalendarType, normalizeApiCalendarType } from '../calendar/calendarTypeMap.js';
import { getStatusLabel } from '../calendarStatusStyles.js';

const DOW_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toISODate(year, monthIndex, day) {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function buildMonthDays(year, month, daysInMonth) {
  const today = new Date();
  const monthIndex = month - 1;
  const days = [];

  for (let date = 1; date <= daysInMonth; date += 1) {
    const jsDate = new Date(year, monthIndex, date);
    const dow = DOW_SHORT[jsDate.getDay()];
    const isWeekend = jsDate.getDay() === 0 || jsDate.getDay() === 6;
    days.push({
      date,
      dow,
      iso: toISODate(year, monthIndex, date),
      isWeekend,
      isToday: isSameCalendarDay(jsDate, today),
    });
  }

  return days;
}

function getEmployeeCalendarEntries(calendarData, employeeId) {
  if (!calendarData) return {};
  const key = String(employeeId);
  return calendarData[key] ?? calendarData[employeeId] ?? {};
}

function resolveDayTooltipLabel(entry, styleType) {
  const leaveName = entry.leave_name?.trim();
  if (leaveName) return leaveName;
  return getStatusLabel(styleType);
}

const WORK_MODE_TYPES = new Set(['wfh', 'remote', 'on-duty']);

function buildSinglesForEmployee(employeeId, calendarData, days) {
  const empDates = getEmployeeCalendarEntries(calendarData, employeeId);
  const singles = {};
  const statusLabels = {};
  const dayDetails = {};

  days.forEach((d) => {
    const entry = empDates[d.iso];
    if (!entry?.type) return;
    const normalized = normalizeApiCalendarType(entry.type);
    if (!normalized || isSilentCalendarType(normalized)) return;
    const leaveName = entry.leave_name?.trim() || null;
    const categoryLabel = getStatusLabel(normalized);
    singles[d.date] = normalized;
    statusLabels[d.date] = resolveDayTooltipLabel(entry, normalized);
    dayDetails[d.date] = {
      iso: d.iso,
      primaryLabel: statusLabels[d.date],
      categoryLabel,
      leaveName,
      workMode: WORK_MODE_TYPES.has(normalized) ? categoryLabel : null,
    };
  });

  return { singles, statusLabels, dayDetails };
}

/** Header dots when any employee has meta status on a day */
function attachHeaderFlags(days, calendarData, team) {
  return days.map((d) => {
    let headerFlag;
    for (const emp of team) {
      const entry = getEmployeeCalendarEntries(calendarData, emp.id)[d.iso];
      if (!entry?.type) continue;
      const t = entry.type;
      if (t === 'multiple_leave') {
        headerFlag = 'multiple-leave';
        break;
      }
      if (t === 'someone_on_leave') headerFlag = 'on-leave';
      else if (t === 'someone_on_wfh_od' && !headerFlag) headerFlag = 'wfh-od';
    }
    return { ...d, headerFlag };
  });
}

/**
 * @param {import('../../../services/myteam.api').MyTeamCalendarResponse | undefined} data
 */
export function parseTeamCalendarResponse(data) {
  if (!data) {
    return { year: new Date().getFullYear(), month: 1, days: [], team: [], daysInMonth: 0 };
  }

  const year = data.year;
  const month = data.month;
  const daysInMonth = data.days_in_month ?? 0;
  const baseDays = buildMonthDays(year, month, daysInMonth);
  const normalizedTeam = normalizeTeamEmployeeList(data.team);

  const team = normalizedTeam.map((emp) => {
    const { singles, statusLabels, dayDetails } = buildSinglesForEmployee(
      emp.id,
      data.calendar_data,
      baseDays
    );
    return {
      ...emp,
      name: emp.displayName,
      singles,
      statusLabels,
      dayDetails,
      weeklyOffRuns: [],
      bands: [],
    };
  });

  const days = attachHeaderFlags(baseDays, data.calendar_data, team);

  return { year, month, daysInMonth, days, team };
}
