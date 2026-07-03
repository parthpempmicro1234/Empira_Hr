/**
 * Shared helpers for check-in/out response handling (used by Me attendance + Home dashboard).
 */

export function extractAttendanceDayFromResponse(res) {
  if (res == null || typeof res !== 'object') return null;
  const nested = res.data;
  const fromObj = (o) => {
    if (!o || typeof o !== 'object') return null;
    return (
      o.AttandaceDay ??
      o.Attandace_data ??
      o.Attendance_day ??
      o.attendance_day ??
      o.AttendanceDay ??
      o.attendanceDay ??
      o.day ??
      o.result?.AttandaceDay ??
      o.result?.attendance_day ??
      null
    );
  };
  const direct =
    fromObj(res) ??
    (typeof nested === 'object' ? fromObj(nested) : null) ??
    (Array.isArray(res.sessions) ||
    res.effective_hours != null ||
    res.effective_time != null ||
    res.gross_hours != null ||
    res.gross_time != null
      ? res
      : null);
  return direct;
}

export function normalizeAttendanceDayPatch(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.details && typeof raw.details === 'object') return raw.details;
  if (
    Array.isArray(raw.sessions) ||
    raw.effective_hours != null ||
    raw.effective_time != null ||
    raw.gross_hours != null ||
    raw.gross_time != null
  ) {
    return raw;
  }
  return null;
}
