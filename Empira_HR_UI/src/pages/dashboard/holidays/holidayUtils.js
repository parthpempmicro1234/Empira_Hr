/** Parse YYYY-MM-DD as local calendar date (timezone-safe for day comparisons). */
export function parseHolidayDate(dateStr) {
  const parts = String(dateStr ?? '').split('-').map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

export function todayLocal() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function normalizeHoliday(raw) {
  if (raw?.id == null) return null;
  const date = String(raw.date ?? '').trim();
  const parsed = parseHolidayDate(date);
  if (!parsed) return null;
  return {
    id: raw.id,
    name: String(raw.name ?? '').trim() || 'Holiday',
    date,
    parsed,
    businessUnitName: String(raw.business_unit_name ?? '').trim(),
    isActive: raw.is_active !== false,
  };
}

export function filterActiveHolidays(list) {
  return (list ?? [])
    .map(normalizeHoliday)
    .filter(Boolean)
    .filter((h) => h.isActive);
}

export function sortHolidaysAsc(holidays) {
  return [...holidays].sort((a, b) => a.parsed.getTime() - b.parsed.getTime());
}

/** Upcoming holidays from today (inclusive of today if holiday is today). */
export function getUpcomingHolidays(holidays, fromDate = todayLocal()) {
  const start = fromDate.getTime();
  return sortHolidaysAsc(holidays).filter((h) => h.parsed.getTime() >= start);
}

export function formatCompactHolidayDate(parsed) {
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatWeekdayName(parsed) {
  return parsed.toLocaleDateString('en-US', { weekday: 'long' });
}

export function formatMonthBadge(parsed) {
  return parsed.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

export function formatDayNumber(parsed) {
  return String(parsed.getDate());
}

export function currentYear() {
  return new Date().getFullYear();
}
