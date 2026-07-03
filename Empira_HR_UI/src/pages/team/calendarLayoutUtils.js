import { getStatusLabel, statusBg } from './calendarStatusStyles.js';

/**
 * Build render model for one employee row from declarative calendar config.
 */

/**
 * @param {number} start
 * @param {number} end
 * @returns {number[]}
 */
export function range(start, end) {
  const out = [];
  for (let d = start; d <= end; d += 1) out.push(d);
  return out;
}

/**
 * @param {Record<number, string>} [singles]
 * @param {Record<number, string>} [statusLabels]
 * @param {Record<number, object>} [dayDetails]
 * @param {Array<[number, number]>} [weeklyOffRuns]
 * @param {Array<{ start: number; end: number; segments: Array<{ through: number; type: string }> }>} [bands]
 * @returns {{ singles: Record<number, string>, statusLabels: Record<number, string>, weeklyOffRuns: Array<{start:number,end:number}>, bands: Array<{start:number,end:number,parts:Array<{from:number,to:number,type:string}>}> , bandDays: Set<number>, weeklyOffDays: Set<number> }}
 */
export function buildEmployeeCalendarModel({
  singles = {},
  statusLabels = {},
  dayDetails = {},
  weeklyOffRuns = [],
  bands = [],
}) {
  const weeklyOffDays = new Set();
  const normalizedRuns = [];

  weeklyOffRuns.forEach(([start, end]) => {
    normalizedRuns.push({ start, end });
    range(start, end).forEach((d) => weeklyOffDays.add(d));
  });

  const bandDays = new Set();
  const normalizedBands = bands.map((band) => {
    const parts = [];
    let cursor = band.start;
    band.segments.forEach((seg) => {
      parts.push({ from: cursor, to: seg.through, type: seg.type });
      range(cursor, seg.through).forEach((d) => bandDays.add(d));
      cursor = seg.through + 1;
    });
    return { start: band.start, end: band.end, parts };
  });

  return {
    singles,
    statusLabels,
    dayDetails,
    weeklyOffRuns: normalizedRuns,
    bands: normalizedBands,
    bandDays,
    weeklyOffDays,
  };
}

/**
 * @param {{ singles: Record<number, string>, weeklyOffDays: Set<number>, bandDays: Set<number> }} model
 * @param {number} date
 */
export function resolveCellKind(model, date) {
  if (model.bandDays.has(date)) return 'band';
  if (model.weeklyOffDays.has(date)) return 'weekly-off';
  if (model.singles[date]) return 'single';
  return 'plain';
}

/**
 * @param {import('./calendarLayoutUtils.js').buildEmployeeCalendarModel} model
 * @param {number} date
 */
export function resolveCellType(model, date) {
  const kind = resolveCellKind(model, date);
  if (kind === 'single') return model.singles[date];
  if (kind === 'weekly-off') return 'weekly-off';
  return kind;
}

/**
 * Resolve display status for a date (single day, weekly off, or band segment).
 * @returns {{ type: string, label: string, color: string, detail?: object } | null}
 */
export function resolveDateStatus(model, date) {
  if (model.singles[date]) {
    const type = model.singles[date];
    const label = model.statusLabels[date] ?? getStatusLabel(type);
    return {
      type,
      label,
      color: statusBg(type),
      detail: model.dayDetails[date] ?? null,
    };
  }

  if (model.weeklyOffDays.has(date)) {
    const type = 'weekly-off';
    return {
      type,
      label: getStatusLabel(type),
      color: statusBg(type),
      detail: { categoryLabel: getStatusLabel(type) },
    };
  }

  for (const band of model.bands) {
    for (const part of band.parts) {
      if (date >= part.from && date <= part.to) {
        return {
          type: part.type,
          label: getStatusLabel(part.type),
          color: statusBg(part.type),
          detail: { categoryLabel: getStatusLabel(part.type) },
        };
      }
    }
  }

  return null;
}
