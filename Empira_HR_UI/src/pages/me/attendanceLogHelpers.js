const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const MINUTES_PER_DAY = 24 * 60;

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

/** YYYY-MM-DD from a timeline day object */
export function getTimelineDayIsoKey(day) {
  const raw = day?.date ?? day?.work_date ?? day?.attendance_date;
  if (raw == null) return '';
  return String(raw).slice(0, 10);
}

/** Sessions + hours source for clock-in state (attendance row or leave + Attandace_data). */
export function getDetailsForSessionsFromDay(day) {
  if (!day) return null;
  const type = String(day.type ?? '').toLowerCase();
  if (type === 'leave') {
    return day.Attandace_data ?? day.Attandace_Data ?? day.attendance_data ?? day.Attendance_data ?? null;
  }
  if (type === 'attendance') return day.details ?? null;
  return null;
}

/** True → show "Check-Out" (only when today's row has an open session). */
export function shouldShowCheckOutForToday(todayRow) {
  const details = getDetailsForSessionsFromDay(todayRow);
  const sessions = details?.sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) return false;
  const last = sessions[sessions.length - 1];
  const cin = last?.check_in ?? last?.checkIn;
  const cout = last?.check_out ?? last?.checkOut;
  return Boolean(cin) && (cout == null || cout === '');
}

export function getEffectiveGrossDisplayFromDay(day) {
  const details = getDetailsForSessionsFromDay(day);
  if (!details) {
    return { effective: '0h 0m', gross: '0h 0m' };
  }
  return {
    effective: formatDuration(details.effective_hours ?? details.effective_time ?? ''),
    gross: formatDuration(details.gross_hours ?? details.gross_time ?? ''),
  };
}

/**
 * Merge POST check-in/out `AttandanceDay` into timeline for cache updates.
 */
export function mergeAttendanceDayIntoTimeline(timeline, todayIso, attendanceDay) {
  if (!Array.isArray(timeline) || !todayIso || !attendanceDay || typeof attendanceDay !== 'object') {
    return timeline;
  }
  const idx = timeline.findIndex((d) => getTimelineDayIsoKey(d) === todayIso);
  if (idx === -1) {
    return [{ date: todayIso, type: 'attendance', details: { ...attendanceDay } }, ...timeline];
  }
  const existing = timeline[idx];
  const next = { ...existing };
  const type = String(existing.type ?? '').toLowerCase();
  if (type === 'leave') {
    next.Attandace_data = {
      ...(existing.Attandace_data ?? existing.Attandace_Data ?? {}),
      ...attendanceDay,
    };
  } else {
    next.type = 'attendance';
    next.details = { ...(existing.details ?? {}), ...attendanceDay };
  }
  const copy = [...timeline];
  copy[idx] = next;
  return copy;
}

/** @returns {{ fromDate: string; toDate: string }} */
export function getLast30DaysRange(referenceDate = new Date()) {
  const to = new Date(referenceDate);
  const from = new Date(referenceDate);
  from.setDate(from.getDate() - 29);
  return { fromDate: toISODate(from), toDate: toISODate(to) };
}

/** Resolve month chip (e.g. MAR) to the most recent occurrence not after today. */
export function getMonthRangeFromAbbr(abbr, referenceDate = new Date()) {
  const monthIndex = MONTH_ABBR.indexOf(String(abbr ?? '').toUpperCase());
  if (monthIndex < 0) return getLast30DaysRange(referenceDate);

  const now = new Date(referenceDate);
  let year = now.getFullYear();
  if (monthIndex > now.getMonth()) year -= 1;

  const from = new Date(year, monthIndex, 1);
  let to = new Date(year, monthIndex + 1, 0);

  if (year === now.getFullYear() && monthIndex === now.getMonth() && to > now) {
    to = new Date(now);
  }

  return { fromDate: toISODate(from), toDate: toISODate(to) };
}

/** "0:06:17.057193" → "0h 6m" (seconds ignored) */
export function formatDuration(timeString) {
  if (timeString == null || timeString === '') return '0h 0m';
  const str = String(timeString).trim();
  const parts = str.split(':');
  const hours = Number.parseInt(parts[0], 10) || 0;
  const minutes = Number.parseInt(parts[1], 10) || 0;
  return `${hours}h ${minutes}m`;
}

/** "2026-05-17" → "Sun, 17 May" */
export function formatDate(value) {
  if (!value) return '—';
  const raw = String(value);
  const date = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function parseDateTime(value) {
  if (!value) return null;
  const raw = String(value);
  const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Single clock time — 12h or 24h */
export function formatClockTime(value, hour24 = false) {
  const date = parseDateTime(value);
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !hour24,
  });
}

/** Clock time with seconds (attendance log popover) */
export function formatClockTimeWithSeconds(value, hour24 = false) {
  const date = parseDateTime(value);
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: !hour24,
  });
}

/** "9:29 AM - 6:57 PM" */
export function formatTimeRange(checkIn, checkOut, hour24 = false) {
  return `${formatClockTime(checkIn, hour24)} - ${formatClockTime(checkOut, hour24)}`;
}

function dateTimeToMinutes(value) {
  const date = parseDateTime(value);
  if (!date) return null;
  return date.getHours() * 60 + date.getMinutes();
}

export function sessionHasLocation(session) {
  if (!session) return false;
  const lat = session.clock_in_lat ?? session.clock_in_latitude;
  const lng = session.clock_in_lng ?? session.clock_in_longitude;
  const location = session.location ?? session.clock_in_location;
  if (location != null && String(location).trim() !== '') return true;
  if (lat != null && String(lat).trim() !== '') return true;
  if (lng != null && String(lng).trim() !== '') return true;
  return false;
}

export function getSessionLocation(session) {
  const location = session?.location ?? session?.clock_in_location;
  if (location != null && String(location).trim() !== '') return String(location).trim();
  const lat = session?.clock_in_lat ?? session?.clock_in_latitude;
  const lng = session?.clock_in_lng ?? session?.clock_in_longitude;
  if (lat != null && lng != null) return `${lat}, ${lng}`;
  const outLat = session?.clock_out_lat ?? session?.clock_out_latitude;
  const outLng = session?.clock_out_lng ?? session?.clock_out_longitude;
  if (outLat != null && outLng != null) return `${outLat}, ${outLng}`;
  if (lat != null) return String(lat);
  if (lng != null) return String(lng);
  return null;
}

function parseGpsPair(lat, lng) {
  const la = lat == null || lat === '' ? NaN : Number(lat);
  const ln = lng == null || lng === '' ? NaN : Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  return { lat: la, lng: ln };
}

/** True when both lat and lng exist for check-in or check-out. */
export function sessionHasGps(session, kind = 'in') {
  if (!session) return false;
  if (kind === 'out') {
    return (
      parseGpsPair(
        session.clock_out_lat ?? session.clock_out_latitude,
        session.clock_out_lng ?? session.clock_out_longitude
      ) != null
    );
  }
  return (
    parseGpsPair(
      session.clock_in_lat ?? session.clock_in_latitude,
      session.clock_in_lng ?? session.clock_in_longitude
    ) != null
  );
}

export function dayHasMapLocations(sessions) {
  if (!Array.isArray(sessions)) return false;
  return sessions.some((s) => sessionHasGps(s, 'in') || sessionHasGps(s, 'out'));
}

const MAP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function nextMapLetter(index) {
  if (index < MAP_LETTERS.length) return MAP_LETTERS[index];
  return String(index + 1);
}

/**
 * Ordered check-in/out map points for a day (one letter per event with GPS).
 * @returns {Array<{ letter, type: 'in'|'out', lat, lng, timeLabel, coordLabel, workMode, iso }>}
 */
export function buildMapPointsForDay(sessions, hour24 = false) {
  if (!Array.isArray(sessions)) return [];
  const points = [];
  let letterIndex = 0;

  for (const session of sessions) {
    const checkIn = session?.check_in ?? session?.checkIn;
    const checkOut = session?.check_out ?? session?.checkOut;
    const workMode = session?.work_mode ?? session?.clock_in_mode ?? 'office';

    const inGps = parseGpsPair(
      session.clock_in_lat ?? session.clock_in_latitude,
      session.clock_in_lng ?? session.clock_in_longitude
    );
    if (inGps) {
      points.push({
        letter: nextMapLetter(letterIndex),
        type: 'in',
        lat: inGps.lat,
        lng: inGps.lng,
        timeLabel: checkIn ? formatClockTimeWithSeconds(checkIn, hour24) : '—',
        coordLabel: `${inGps.lat}, ${inGps.lng}`,
        workMode: String(workMode),
        iso: checkIn ?? null,
      });
      letterIndex += 1;
    }

    const outGps = parseGpsPair(
      session.clock_out_lat ?? session.clock_out_latitude,
      session.clock_out_lng ?? session.clock_out_longitude
    );
    if (outGps) {
      points.push({
        letter: nextMapLetter(letterIndex),
        type: 'out',
        lat: outGps.lat,
        lng: outGps.lng,
        timeLabel: checkOut ? formatClockTimeWithSeconds(checkOut, hour24) : '—',
        coordLabel: `${outGps.lat}, ${outGps.lng}`,
        workMode: String(workMode),
        iso: checkOut ?? null,
      });
      letterIndex += 1;
    }
  }

  return points;
}

/** YYYY-MM-DD → "27 MAY 2026" for map modal header */
export function formatMapViewDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(isoDate);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function normalizeTimelineBlocks(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  return blocks
    .map((b) => {
      const start = Math.max(0, Math.min(b.startMin, MINUTES_PER_DAY));
      const end = Math.max(start, Math.min(b.endMin, MINUTES_PER_DAY));
      if (end <= start) return null;
      return {
        left: (start / MINUTES_PER_DAY) * 100,
        width: ((end - start) / MINUTES_PER_DAY) * 100,
        session: b.session,
        sessionIndex: b.sessionIndex,
      };
    })
    .filter(Boolean);
}

export function mapSessionsToBlocks(sessions) {
  if (!Array.isArray(sessions)) return [];
  return normalizeTimelineBlocks(
    sessions
      .map((session, sessionIndex) => {
        const checkIn = session?.check_in ?? session?.checkIn;
        const checkOut = session?.check_out ?? session?.checkOut;
        const startMin = dateTimeToMinutes(checkIn);
        const endMin = dateTimeToMinutes(checkOut);
        if (startMin == null || endMin == null) return null;
        return {
          startMin,
          endMin,
          session,
          sessionIndex,
        };
      })
      .filter(Boolean)
  );
}

function buildLogDetails(day, details) {
  const sessions = details?.sessions ?? [];
  if (!Array.isArray(sessions) || sessions.length === 0) return null;

  const dateRaw = day?.date ?? day?.work_date;
  const shiftDate = formatDate(dateRaw).replace(/^[^,]+,\s*/, '');

  const punches = [];
  let clockSourceTitle = null;
  sessions.forEach((session) => {
    const checkIn = session?.check_in ?? session?.checkIn;
    const checkOut = session?.check_out ?? session?.checkOut;
    const inSource = session?.check_in_source ?? session?.clock_in_mode;
    const outSource = session?.check_out_source ?? session?.clock_out_mode;
    if (inSource && !clockSourceTitle) clockSourceTitle = String(inSource);
    else if (outSource && !clockSourceTitle) clockSourceTitle = String(outSource);

    if (checkIn) {
      punches.push({
        type: 'in',
        label: inSource ?? 'Clock In',
        iso: checkIn,
        time: formatClockTimeWithSeconds(checkIn),
      });
    }
    if (checkOut) {
      punches.push({
        type: 'out',
        label: outSource ?? 'Clock Out',
        iso: checkOut,
        time: formatClockTimeWithSeconds(checkOut),
      });
    }
  });

  if (!clockSourceTitle) {
    const firstIn = punches.find((p) => p.type === 'in');
    clockSourceTitle = firstIn?.label && firstIn.label !== 'Clock In' ? firstIn.label : 'Web Clock In';
  }

  return {
    shiftName: details?.shift_name ?? details?.shiftName ?? 'Shift',
    shiftDate,
    shiftStart: details?.shift_start ? formatClockTime(details.shift_start) : '—',
    shiftEnd: details?.shift_end ? formatClockTime(details.shift_end) : '—',
    clockSourceTitle,
    punches,
  };
}

function formatLeaveTypeLabel(leaveType) {
  const raw = String(leaveType ?? '').trim();
  if (!raw) return 'Leave';
  return raw.toLowerCase().includes('leave') ? raw : `${raw} Leave`;
}

function formatLeaveDuration(duration) {
  const raw = String(duration ?? '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase().replace(/_/g, ' ');
  if (lower === 'full') return 'Full Day';
  if (lower === 'half') return 'Half Day';
  if (lower.includes('first half')) return 'First Half';
  if (lower.includes('second half')) return 'Second Half';
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildLeaveSubtitle(details) {
  const typeLabel = formatLeaveTypeLabel(details?.leave_type);
  const duration = formatLeaveDuration(details?.duration);
  const parts = [typeLabel, duration].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  return details?.status ?? 'On Leave';
}

function buildLeaveTypeTooltip(details) {
  const typeLabel = formatLeaveTypeLabel(details?.leave_type);
  return typeLabel && typeLabel !== 'Leave' ? typeLabel : 'Leave';
}

/** API typo: Attandace_data */
export function getAttendanceDataFromDay(day) {
  const raw =
    day?.Attandace_data ??
    day?.Attandace_Data ??
    day?.Attendance_data ??
    day?.attendance_data ??
    null;
  if (raw == null || typeof raw !== 'object') return null;
  return raw;
}

export function hasAttendanceDataOnDay(day) {
  return getAttendanceDataFromDay(day) != null;
}

function inferLogKind(details) {
  const sessions = details?.sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) return 'dots';
  const open = sessions.some((s) => {
    const checkIn = s?.check_in ?? s?.checkIn;
    const checkOut = s?.check_out ?? s?.checkOut;
    return checkIn && !checkOut;
  });
  if (open) return 'warning';
  return 'check';
}

function isNoSessionType(typeRaw) {
  const lower = String(typeRaw ?? '').trim().toLowerCase();
  return lower === 'no any sesion today' || lower === 'no any session today';
}

function normalizeDayTypeKey(typeRaw) {
  const lower = String(typeRaw ?? '').trim().toLowerCase();
  if (lower === 'abset' || lower === 'absent') return 'absent';
  if (isNoSessionType(typeRaw)) return 'no_session';
  return lower;
}

function getNoSessionStatusLabel(typeRaw) {
  const raw = String(typeRaw ?? '').trim();
  return raw || 'No Any Sesion Today';
}

/** Map API timeline day → table row model */
export function mapTimelineDayToRow(day) {
  const dateRaw = day?.date ?? day?.work_date ?? day?.attendance_date;
  const id = String(dateRaw ?? day?.id ?? Math.random());
  const rawType = String(day?.type ?? '').trim();
  const typeKey = normalizeDayTypeKey(rawType);

  if (typeKey === 'week_off') {
    return {
      id,
      date: formatDate(dateRaw),
      badge: 'W-OFF',
      spanText: 'Full day Weekly-off',
      statusTooltip: 'Weekly Off',
      logKind: 'dots',
    };
  }

  if (typeKey === 'leave') {
    const details = day?.details ?? {};
    const attendanceData = getAttendanceDataFromDay(day);
    const leaveSubtitle = buildLeaveSubtitle(details);
    const leaveTypeTooltip = buildLeaveTypeTooltip(details);

    if (attendanceData) {
      const sessions = attendanceData.sessions ?? [];
      const timelineBlocks = mapSessionsToBlocks(sessions);

      return {
        id,
        date: formatDate(dateRaw),
        badge: 'LEAVE',
        leaveWithAttendance: true,
        leaveMainType: 'Leave',
        spanSubtext: leaveSubtitle,
        leaveTypeTooltip,
        sessions,
        timelineBlocks,
        effective: formatDuration(
          attendanceData.effective_hours ?? attendanceData.effective_time
        ),
        gross: formatDuration(attendanceData.gross_hours ?? attendanceData.gross_time),
        arrival:
          attendanceData.arrival ??
          attendanceData.arrival_status ??
          details.status ??
          'On Leave',
        showArrivalCheck: false,
        logKind: inferLogKind(attendanceData),
        logDetails: buildLogDetails(day, attendanceData),
      };
    }

    return {
      id,
      date: formatDate(dateRaw),
      badge: 'LEAVE',
      spanText: leaveTypeTooltip,
      leaveTypeTooltip,
      logKind: 'dots',
    };
  }

  if (typeKey === 'no_session') {
    return {
      id,
      date: formatDate(dateRaw),
      badge: null,
      spanText: getNoSessionStatusLabel(rawType),
      logKind: 'dots',
    };
  }

  if (typeKey === 'absent') {
    return {
      id,
      date: formatDate(dateRaw),
      badge: 'ABSENT',
      spanText: 'Absent',
      statusTooltip: 'Absent',
      logKind: 'dots',
    };
  }

  const details = day?.details ?? {};
  const sessions = details.sessions ?? [];
  const timelineBlocks = mapSessionsToBlocks(sessions);

  return {
    id,
    date: formatDate(dateRaw),
    badge: null,
    spanText: null,
    sessions,
    timelineBlocks,
    effective: formatDuration(details.effective_hours ?? details.effective_time),
    gross: formatDuration(details.gross_hours ?? details.gross_time),
    arrival: details.arrival ?? details.arrival_status ?? 'On Time',
    logKind: inferLogKind(details),
    logDetails: buildLogDetails(day, details),
  };
}

export function mapTimelineToRows(timeline) {
  if (!Array.isArray(timeline)) return [];
  return timeline.map(mapTimelineDayToRow);
}
