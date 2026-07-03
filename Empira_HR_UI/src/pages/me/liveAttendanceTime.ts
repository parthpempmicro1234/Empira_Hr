/**
 * Live effective / gross display while the latest session has no check-out.
 * Backend duration strings are the base; elapsed time since check_in is added every tick.
 */

function parseCheckInToDate(checkIn) {
  if (checkIn == null || checkIn === '') return null;
  const raw = String(checkIn);
  const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Parse "01:14:00", "0:06:17.057193", etc. → total seconds */
export function parseDurationToSeconds(timeString) {
  if (timeString == null || timeString === '') return 0;
  const parts = String(timeString).trim().split(':');
  if (parts.length < 2) return 0;
  const h = Number.parseInt(parts[0], 10) || 0;
  const m = Number.parseInt(parts[1], 10) || 0;
  const secPart = parts[2] ?? '0';
  const s = Math.floor(Number.parseFloat(secPart) || 0);
  return h * 3600 + m * 60 + s;
}

/** Total seconds → "8h 32m" (seconds not shown) */
export function formatSecondsToHoursMinutes(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * @param {Date} now - current instant (e.g. ticking every second)
 * @param {object|null} details - attendance `details` or leave `Attandace_data` with sessions + duration fields
 * @param {boolean} isCheckedIn - same as "show Check-Out" (open session on latest day row)
 * @returns {{
 *   effective: string,
 *   gross: string,
 *   effectiveTotalSeconds: number,
 *   grossTotalSeconds: number,
 *   elapsedSeconds: number,
 * } | null}
 */
export function getLiveRunningTime(now, details, isCheckedIn) {
  if (!isCheckedIn || !details || !now) return null;

  const sessions = details.sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) return null;

  const last = sessions[sessions.length - 1];
  const checkIn = last?.check_in ?? last?.checkIn;
  const checkOut = last?.check_out ?? last?.checkOut;
  if (!checkIn || (checkOut != null && checkOut !== '')) return null;

  const checkInAt = parseCheckInToDate(checkIn);
  if (!checkInAt) return null;

  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - checkInAt.getTime()) / 1000));

  const baseEffective = parseDurationToSeconds(details.effective_hours ?? details.effective_time);
  const baseGross = parseDurationToSeconds(details.gross_hours ?? details.gross_time);

  const effectiveTotalSeconds = baseEffective + elapsedSeconds;
  const grossTotalSeconds = baseGross + elapsedSeconds;

  return {
    effective: formatSecondsToHoursMinutes(effectiveTotalSeconds),
    gross: formatSecondsToHoursMinutes(grossTotalSeconds),
    effectiveTotalSeconds,
    grossTotalSeconds,
    elapsedSeconds,
  };
}
