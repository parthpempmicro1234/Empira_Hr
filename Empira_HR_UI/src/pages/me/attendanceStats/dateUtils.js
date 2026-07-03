export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split('-').map(Number);
  if (![y, m, d].every((n) => Number.isFinite(n))) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function compareISODate(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function isDateInRange(iso, fromIso, toIso) {
  if (!fromIso || !toIso) return false;
  return compareISODate(iso, fromIso) >= 0 && compareISODate(iso, toIso) <= 0;
}

/** Previous calendar month (inclusive). */
export function getLastMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return { fromDate: toISODate(from), toDate: toISODate(to) };
}

export function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const startDow = first.getDay();
  const gridStart = new Date(year, monthIndex, 1 - startDow);
  const out = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    out.push({
      date: d,
      inMonth: d.getMonth() === monthIndex,
      iso: toISODate(d),
      day: d.getDate(),
    });
  }
  return out;
}

export const PICKER_WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const PICKER_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
