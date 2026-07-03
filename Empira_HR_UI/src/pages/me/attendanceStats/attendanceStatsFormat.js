/**
 * "8:20:46.565201" → "8h 20m"
 * "0" → "0h"
 */
export function formatAvgTime(raw) {
  const s = String(raw ?? '').trim();
  if (!s || s === '0') return '0h';

  const parts = s.split(':');
  const hours = Number.parseInt(parts[0], 10) || 0;
  const minutes = parts.length >= 2 ? Number.parseInt(parts[1], 10) || 0 : 0;

  if (hours === 0 && minutes === 0) return '0h';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Supports ratio (0.35 → 35%) and whole percent (16.6 → 17%).
 * Values in [0, 1] are treated as ratios; values above 1 are already percents.
 */
export function formatOnTimePercentage(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';

  const pct = n >= 0 && n <= 1 ? Math.round(n * 100) : Math.round(n);
  return `${pct}%`;
}
