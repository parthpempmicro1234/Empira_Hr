export const NOT_SET = '-Not Set-';

export function displayValue(v) {
  if (v === null || v === undefined) return NOT_SET;
  if (typeof v === 'string' && v.trim() === '') return NOT_SET;
  return String(v);
}

export function formatJobDate(iso) {
  if (!iso || typeof iso !== 'string') return NOT_SET;
  const d = new Date(`${iso.trim().split('T')[0]}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** snake_case key → "Human Readable" */
export function humanizeFieldKey(key) {
  if (!key) return '';
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatWorkerType(v) {
  const s = displayValue(v);
  if (s === NOT_SET) return s;
  return s
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function formatTimeType(v) {
  const raw = String(v || '').trim().toLowerCase();
  if (!raw) return NOT_SET;
  const map = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    intern: 'Intern',
  };
  return map[raw] ?? formatWorkerType(v);
}

export function formatProbation(start, end) {
  const a = start && String(start).trim();
  const b = end && String(end).trim();
  if (a && b) return `Yes ${formatJobDate(a)} - ${formatJobDate(b)}`;
  return 'No';
}

export function departmentLine(department, subDepartment) {
  const d = department?.trim();
  const s = subDepartment?.trim();
  if (d && s) return `${d} > ${s}`;
  if (d) return d;
  if (s) return s;
  return NOT_SET;
}
