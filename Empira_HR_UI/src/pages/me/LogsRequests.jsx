import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getAttendanceTimeline } from '../../services/attendance.api';
import AttendanceMapModal from './attendance/AttendanceMapModal.jsx';
import OvertimeRequestsPanel from './attendance/OvertimeRequestsPanel.jsx';
import RegularizationPanel from './attendance/RegularizationPanel.jsx';
import {
  dayHasMapLocations,
  formatTimeRange,
  getLast30DaysRange,
  getMonthRangeFromAbbr,
  getSessionLocation,
  mapTimelineToRows,
  sessionHasLocation,
} from './attendanceLogHelpers';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const SUB_TABS = [
  { id: 'attendance_log', label: 'Attendance Log' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'attendance_requests', label: 'Attendance Requests' },
  { id: 'overtime_requests', label: 'Overtime Requests' },
];

const MONTHS = ['30 DAYS', 'MAR', 'FEB', 'JAN', 'DEC', 'NOV', 'OCT'];
const CAL_WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const CAL_MONTHS = [
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

const NON_INTERACTIVE_BADGES = new Set(['LEAVE', 'W-OFF', 'ABSENT', 'HOLIDAY']);

const POPOVER_WIDTH = 248;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;
const POPOVER_TRANSITION_MS = 150;
const SESSION_TOOLTIP_GAP = 8;

const HOUR_TICK_COUNT = 24;

function isRowInteractive(row) {
  if (row.leaveWithAttendance) return Boolean(row.logDetails);
  if (row.spanText) return false;
  const badge = row.badge ?? row.status;
  if (badge && NON_INTERACTIVE_BADGES.has(badge)) return false;
  return Boolean(row.logDetails);
}

function computeStatusTooltipPosition(anchorRect) {
  if (!anchorRect) {
    return { top: VIEWPORT_PADDING, left: VIEWPORT_PADDING };
  }
  let left = anchorRect.left + anchorRect.width / 2 - 80;
  let top = anchorRect.bottom + SESSION_TOOLTIP_GAP;
  if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
  if (left + 160 > window.innerWidth - VIEWPORT_PADDING) {
    left = window.innerWidth - 160 - VIEWPORT_PADDING;
  }
  return { top, left };
}

function StatusHoverTooltip({ title, text, position, open }) {
  if (!open || (!title && !text)) return null;
  return (
    <div
      style={{ top: position.top, left: position.left }}
      className="pointer-events-none fixed z-[120] rounded-md border border-[#2a3447] bg-[#141b28] px-2.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
      role="tooltip"
    >
      {title ? (
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{title}</p>
      ) : null}
      {text ? <p className={cx('text-xs text-gray-100', title && 'mt-0.5')}>{text}</p> : null}
    </div>
  );
}

function StatusHoverTrigger({ title, tooltip, children, className }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const anchorRef = useRef(null);

  const tooltipText = tooltip ?? null;
  if (!tooltipText && !title) {
    return <span className={className}>{children}</span>;
  }

  return (
    <>
      <span
        ref={anchorRef}
        className={cx('inline-flex cursor-default', className)}
        onMouseEnter={(e) => {
          e.stopPropagation();
          const rect = anchorRef.current?.getBoundingClientRect();
          if (rect) setPosition(computeStatusTooltipPosition(rect));
          setOpen(true);
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          setOpen(false);
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </span>
      {createPortal(
        <StatusHoverTooltip title={title} text={tooltipText} position={position} open={open} />,
        document.body
      )}
    </>
  );
}

/**
 * Contextual floating card: prefer RIGHT of anchor (row); flip left if no room;
 * vertical: align with row top (downward); if not enough space below, shift up (upward).
 */
function computePopoverPosition(anchorEl, popoverEl) {
  const fallback = { top: VIEWPORT_PADDING, left: VIEWPORT_PADDING, placement: 'right' };
  if (!anchorEl) return fallback;

  const anchor = anchorEl.getBoundingClientRect();
  const popoverHeight = popoverEl?.offsetHeight ?? 160;
  const popoverWidth = popoverEl?.offsetWidth ?? POPOVER_WIDTH;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchor.right + POPOVER_GAP;
  let placement = 'right';

  if (left + popoverWidth > vw - VIEWPORT_PADDING) {
    const leftOfAnchor = anchor.left - popoverWidth - POPOVER_GAP;
    if (leftOfAnchor >= VIEWPORT_PADDING) {
      left = leftOfAnchor;
      placement = 'left';
    } else {
      left = Math.max(VIEWPORT_PADDING, vw - popoverWidth - VIEWPORT_PADDING);
    }
  }

  // Default: top aligns with row (popover extends downward)
  let top = anchor.top;
  const maxTop = vh - popoverHeight - VIEWPORT_PADDING;
  const minTop = VIEWPORT_PADDING;

  if (top + popoverHeight > vh - VIEWPORT_PADDING) {
    const topAlignedUp = anchor.bottom - popoverHeight;
    if (topAlignedUp >= minTop) {
      top = topAlignedUp;
    } else {
      top = Math.min(Math.max(minTop, anchor.top), maxTop);
    }
  }

  if (top > maxTop) top = maxTop;
  if (top < minTop) top = minTop;

  return { top, left, placement };
}

/** Pair clock-in / clock-out punches for session-style layout */
function groupPunchesIntoSessions(punches) {
  if (!Array.isArray(punches) || punches.length === 0) return [];
  const sessions = [];
  let i = 0;
  while (i < punches.length) {
    const p = punches[i];
    if (p?.type === 'in') {
      const next = punches[i + 1];
      const out = next?.type === 'out' ? next : null;
      sessions.push({ in: p, out });
      i += out ? 2 : 1;
    } else if (p?.type === 'out') {
      sessions.push({ in: null, out: p });
      i += 1;
    } else {
      sessions.push({ in: p, out: null });
      i += 1;
    }
  }
  return sessions;
}

function computeSessionTooltipPosition(anchorRect) {
  if (!anchorRect) {
    return { top: VIEWPORT_PADDING, left: VIEWPORT_PADDING };
  }
  const tooltipWidth = 280;
  let left = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2;
  let top = anchorRect.top - SESSION_TOOLTIP_GAP - 72;

  if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
  if (left + tooltipWidth > window.innerWidth - VIEWPORT_PADDING) {
    left = window.innerWidth - tooltipWidth - VIEWPORT_PADDING;
  }
  if (top < VIEWPORT_PADDING) {
    top = anchorRect.bottom + SESSION_TOOLTIP_GAP;
  }
  return { top, left };
}

function PunchMarker({ side }) {
  return (
    <span
      className={cx(
        'absolute top-full h-0 w-0 -translate-y-px border-x-[4px] border-b-[5px] border-x-transparent border-b-[#2dd4bf]',
        side === 'start' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'
      )}
      aria-hidden
    />
  );
}

function SessionHoverTooltip({ session, hour24, position, open }) {
  if (!session || !open) return null;

  const checkIn = session.check_in ?? session.checkIn;
  const checkOut = session.check_out ?? session.checkOut;
  const showLocation = sessionHasLocation(session);
  const locationText = getSessionLocation(session);

  return (
    <div
      style={{ top: position.top, left: position.left }}
      className="pointer-events-none fixed z-[120] w-[min(280px,calc(100vw-32px))] rounded-lg border border-[#2a3447] bg-[#141b28] px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
      role="tooltip"
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Logged In</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums text-gray-100">
        {formatTimeRange(checkIn, checkOut, hour24)}
      </p>
      {showLocation && locationText ? (
        <div
          className="mt-2 flex items-start gap-2 border-t border-[#2a3447]/80 pt-2"
        >
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.45)]"
            aria-hidden
          />
          <p className="text-xs leading-snug text-gray-400">{locationText}</p>
        </div>
      ) : null}
    </div>
  );
}

function AttendanceTimeline({ blocks, onSessionEnter, onSessionLeave, showMapPin, onMapClick }) {
  const workBlocks = Array.isArray(blocks) ? blocks : [];

  return (
    <div className="flex min-w-[140px] items-center gap-2">
      {showMapPin ? (
        <StatusHoverTrigger
          tooltip="Click here to view map"
          className="group shrink-0 cursor-pointer text-gray-400 transition hover:text-violet-300"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMapClick?.();
            }}
            className="grid h-8 w-8 place-items-center rounded-md transition group-hover:ring-1 group-hover:ring-violet-500/40"
            aria-label="View attendance map"
          >
            <MapPin className="h-4 w-4" strokeWidth={2} />
          </button>
        </StatusHoverTrigger>
      ) : null}
      <div
        className="relative h-9 flex-1"
        role="img"
        aria-label="Attendance timeline for the day"
        onMouseLeave={() => onSessionLeave?.()}
      >
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-[#232d42] ring-1 ring-[#2a3447]/60">
          {Array.from({ length: HOUR_TICK_COUNT + 1 }).map((_, i) => (
            <span
              key={i}
              className={cx(
                'pointer-events-none absolute inset-y-0 w-px bg-[#3d4d66]/50',
                i === 0 && 'opacity-0',
                i === HOUR_TICK_COUNT && 'opacity-0'
              )}
              style={{ left: `${(i / HOUR_TICK_COUNT) * 100}%` }}
            />
          ))}
        </div>

        {workBlocks.map((block, i) => (
          <div
            key={`${block.sessionIndex ?? i}-${block.left}`}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${block.left}%`, width: `${Math.max(block.width, 0.35)}%` }}
            onMouseEnter={(e) => {
              if (block.session) onSessionEnter?.(block.session, e.currentTarget.getBoundingClientRect());
            }}
            onMouseLeave={() => onSessionLeave?.()}
          >
            <div className="relative h-2.5 min-w-[6px] cursor-pointer rounded-full bg-[#2dd4bf] shadow-[0_0_8px_rgba(45,212,191,0.25)]" />
            <PunchMarker side="start" />
            <PunchMarker side="end" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EffectiveHoursIndicator() {
  return (
    <span
      className="mr-2.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#2dd4bf] shadow-[0_0_6px_rgba(45,212,191,0.35)]"
      aria-hidden
    />
  );
}

function LogCell({ kind }) {
  if (kind === 'warning') {
    return (
      <div className="flex justify-end pr-1">
        <AlertCircle className="h-5 w-5 text-yellow-400" strokeWidth={1.75} aria-label="In progress" />
      </div>
    );
  }
  if (kind === 'check') {
    return (
      <div className="flex justify-end pr-1">
        <CheckCircle2 className="h-5 w-5 text-green-500" strokeWidth={1.75} aria-label="Complete" />
      </div>
    );
  }
  return (
    <div className="flex justify-end pr-2 text-gray-600">
      <MoreHorizontal className="h-5 w-5" strokeWidth={2} aria-label="No log" />
    </div>
  );
}

function LogPunchCell({ kind, time, missing }) {
  const isIn = kind === 'in';
  const icon = isIn ? '↙' : '↗';
  const display = missing ? 'MISSING' : time ?? '—';

  return (
    <div className="flex min-w-0 items-center gap-1 leading-none">
      <span
        className={cx(
          'shrink-0 text-[11px] font-semibold',
          isIn ? 'text-[#2dd4bf]' : missing ? 'text-amber-400' : 'text-rose-300/90'
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span
        className={cx(
          'truncate text-[11px] font-medium tabular-nums',
          missing ? 'text-amber-400/95' : 'text-gray-100'
        )}
      >
        {display}
      </span>
    </div>
  );
}

function LogDetailsPopover({ details, position, popoverRef, onRegularize }) {
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(id);
      setEntered(false);
    };
  }, []);

  if (!details) return null;

  const shiftName = details.shiftName ?? 'Shift';
  const shiftDate = details.shiftDate ?? '';
  const headerTitle = shiftDate ? `${shiftName} (${shiftDate})` : shiftName;
  const shiftHours = `${details.shiftStart} - ${details.shiftEnd}`;
  const clockTitle = details.clockSourceTitle ?? 'Web Clock In';
  const sessions = groupPunchesIntoSessions(details.punches);
  const slideFromRight = position.placement === 'right';
  const enterX = entered ? 0 : slideFromRight ? -6 : 6;
  const enterY = entered ? 0 : 4;

  return (
    <div
      ref={popoverRef}
      data-log-popover
      role="dialog"
      aria-modal="false"
      aria-label="Attendance log details"
      style={{
        top: position.top,
        left: position.left,
        width: 320,
        maxHeight: '70vh',
        transition: `all ${POPOVER_TRANSITION_MS}ms ease`,
        transform: `translate3d(${enterX}px, ${enterY}px, 0)`,
        opacity: entered ? 1 : 0,
      }}
      className={cx(
        'fixed z-[200] overflow-y-auto rounded-2xl border border-[#2b3548]',
        'bg-[#151c28] shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between border-b border-[#273244] px-5 py-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-white">
            {headerTitle}
          </h3>
  
          <p className="mt-1 text-sm text-gray-300">
            {shiftHours}
          </p>
        </div>
  
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRegularize?.(e);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-all duration-200 hover:bg-violet-500/20 hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
          Regularize
        </button>
      </div>
  
      <div className="px-5 py-3">
        {sessions.length > 0 ? (
          <>
            <p className="mb-2 text-[11px] font-medium leading-tight text-gray-300">{clockTitle}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {sessions.map((session, sIdx) => (
                <React.Fragment key={`session-${sIdx}`}>
                  <LogPunchCell kind="in" time={session.in?.time} />
                  <LogPunchCell
                    kind="out"
                    time={session.out?.time}
                    missing={Boolean(session.in && !session.out)}
                  />
                </React.Fragment>
              ))}
            </div>
          </>
        ) : (
          <p className="py-4 text-center text-xs text-gray-500">No punch data.</p>
        )}
      </div>
    </div>
  );
}

function getRowSurfaceClass(row) {
  if (row.badge === 'LEAVE') {
    return 'bg-purple-950/30 hover:bg-purple-950/40';
  }
  if (row.badge === 'ABSENT') {
    return 'bg-rose-950/35 hover:bg-rose-950/45';
  }
  if (row.badge === 'W-OFF') {
    return 'bg-[#1f2636] hover:bg-[#252e42]';
  }
  return 'hover:bg-[#20293c]/90';
}

function AttendanceLogTableBody({
  rows,
  loading,
  error,
  anchorRefs,
  onRowClick,
  onSessionEnter,
  onSessionLeave,
  onMapView,
}) {
  if (loading) {
    return (
      <tr>
        <td colSpan={6} className="px-3 py-16 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2dd4bf]" aria-hidden />
          <p className="mt-3 text-sm text-gray-400">Loading attendance log…</p>
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr>
        <td colSpan={6} className="px-3 py-12 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-yellow-400" strokeWidth={1.5} aria-hidden />
          <p className="mt-3 text-sm font-medium text-gray-200">Unable to load attendance log</p>
          <p className="mt-1 text-xs text-gray-500">Please try again or change the date range.</p>
        </td>
      </tr>
    );
  }

  if (!rows.length) {
    return (
      <tr>
        <td colSpan={6} className="px-3 py-12 text-center text-sm text-gray-500">
          No attendance records for this period.
        </td>
      </tr>
    );
  }

  return rows.map((r) => {
    const isLeaveWithAttendance = Boolean(r.leaveWithAttendance);
    const isSpan = Boolean(r.spanText) && !isLeaveWithAttendance;
    const isLeave = r.badge === 'LEAVE';
    const isAbsent = r.badge === 'ABSENT';
    const isWeekOff = r.badge === 'W-OFF';
    const interactive = isRowInteractive(r);
    const showArrivalCheck =
      !isSpan && r.showArrivalCheck !== false && Boolean(r.arrival) && r.arrival !== '—';

    return (
      <tr
        key={r.id}
        ref={(el) => {
          if (interactive && el) anchorRefs.current[r.id] = el;
          else if (!el) delete anchorRefs.current[r.id];
        }}
        data-attendance-row={r.id}
        onClick={() => onRowClick(r)}
        className={cx(
          'border-b border-[#2a3447]/80 transition-colors duration-150',
          getRowSurfaceClass(r),
          interactive && 'cursor-pointer',
          !interactive && 'cursor-default'
        )}
      >
        <td className="px-3 py-3.5 align-middle">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                'font-medium',
                isLeave
                  ? 'text-purple-100'
                  : isAbsent
                    ? 'text-rose-100'
                    : isWeekOff
                      ? 'text-gray-200'
                      : 'text-gray-100'
              )}
            >
              {r.date}
            </span>
            {isAbsent && (
              <StatusHoverTrigger tooltip={r.statusTooltip}>
                <span className="rounded border border-rose-500/50 bg-rose-900/50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-rose-200">
                  ABSENT
                </span>
              </StatusHoverTrigger>
            )}
            {isWeekOff && (
              <StatusHoverTrigger tooltip={r.statusTooltip}>
                <span className="rounded bg-gray-700/90 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-gray-200">
                  W-OFF
                </span>
              </StatusHoverTrigger>
            )}
            {isLeave && (
              <StatusHoverTrigger tooltip={r.leaveTypeTooltip}>
                <span className="rounded border border-purple-600/60 bg-purple-900/60 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-purple-200">
                  LEAVE
                </span>
              </StatusHoverTrigger>
            )}
          </div>
        </td>

        {isSpan ? (
          <>
            <td
              colSpan={4}
              className={cx(
                'px-3 py-3.5 text-center align-middle',
                isLeave ? 'text-purple-200/90' : isAbsent ? 'text-rose-200/90' : 'text-gray-400'
              )}
            >
              {isLeave && !isLeaveWithAttendance ? (
                <span className="text-sm font-medium text-purple-200/95">{r.leaveTypeTooltip}</span>
              ) : !isLeave ? (
                <span className={isAbsent ? 'font-medium text-rose-200/95' : undefined}>{r.spanText}</span>
              ) : null}
            </td>
            <td className="px-3 py-3.5 align-middle">
              <LogCell kind={r.logKind} />
            </td>
          </>
        ) : (
          <>
            <td className="px-3 py-3.5 align-middle">
              <AttendanceTimeline
                blocks={r.timelineBlocks ?? []}
                onSessionEnter={r.timelineBlocks?.length ? onSessionEnter : undefined}
                onSessionLeave={r.timelineBlocks?.length ? onSessionLeave : undefined}
                showMapPin={!isSpan && dayHasMapLocations(r.sessions)}
                onMapClick={() => onMapView?.(r)}
              />
            </td>
            <td className="px-3 py-3.5 align-middle">
              <div className="flex items-center">
                <EffectiveHoursIndicator />
                <span className="font-medium text-gray-100">{r.effective}</span>
              </div>
            </td>
            <td className="px-3 py-3.5 align-middle text-gray-300">{r.gross}</td>
            <td className="px-3 py-3.5 align-middle">
              <div className="flex items-center gap-1.5 text-gray-300">
                {showArrivalCheck ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-green-500" strokeWidth={3} aria-hidden />
                ) : null}
                <span>{r.arrival}</span>
              </div>
            </td>
            <td className="px-3 py-3.5 align-middle">
              <LogCell kind={r.logKind} />
            </td>
          </>
        )}
      </tr>
    );
  });
}

export default function LogsRequests({ policy }) {
  const [subTab, setSubTab] = useState('attendance_log');
  const [regularizeOpenRequest, setRegularizeOpenRequest] = useState(null);
  const [mapViewRow, setMapViewRow] = useState(null);
  const [monthIdx, setMonthIdx] = useState(0);
  const [hour24, setHour24] = useState(false);
  const [calView, setCalView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() }; // 0-11
  });
  const [hoveredSession, setHoveredSession] = useState(null);
  const [sessionTooltipPosition, setSessionTooltipPosition] = useState({ top: 0, left: 0 });

  const [activeRowId, setActiveRowId] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, placement: 'right' });

  const anchorRefs = useRef({});
  const popoverRef = useRef(null);

  const dateRange = useMemo(
    () => (monthIdx === 0 ? getLast30DaysRange() : getMonthRangeFromAbbr(MONTHS[monthIdx])),
    [monthIdx]
  );

  const calendarRange = useMemo(() => {
    const from = new Date(calView.year, calView.monthIndex, 1);
    const to = new Date(calView.year, calView.monthIndex + 1, 0);
    const pad2 = (n) => String(n).padStart(2, '0');
    const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    return { fromDate: toISO(from), toDate: toISO(to) };
  }, [calView.monthIndex, calView.year]);

  const timelineQuery = useQuery({
    queryKey: ['attendance', 'employee', 'timeline', dateRange.fromDate, dateRange.toDate],
    queryFn: () => getAttendanceTimeline(dateRange.fromDate, dateRange.toDate),
    enabled: subTab === 'attendance_log',
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const calendarTimelineQuery = useQuery({
    queryKey: ['attendance', 'employee', 'timeline', 'calendar', calendarRange.fromDate, calendarRange.toDate],
    queryFn: () => getAttendanceTimeline(calendarRange.fromDate, calendarRange.toDate),
    enabled: subTab === 'calendar',
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const loading = timelineQuery.isLoading;
  const error = timelineQuery.isError ? timelineQuery.error : null;

  const rows = useMemo(
    () => mapTimelineToRows(timelineQuery.data?.timeline ?? []),
    [timelineQuery.data, timelineQuery.dataUpdatedAt]
  );

  const calendarByDate = useMemo(() => {
    const list = calendarTimelineQuery.data?.timeline ?? [];
    const map = new Map();
    list.forEach((d) => {
      const raw = d?.date ?? d?.work_date ?? d?.attendance_date;
      const key = raw ? String(raw).slice(0, 10) : '';
      if (key) map.set(key, d);
    });
    return map;
  }, [calendarTimelineQuery.data, calendarTimelineQuery.dataUpdatedAt]);

  function buildCalendarGrid() {
    // Monday-start calendar, 6 rows x 7 cols
    const first = new Date(calView.year, calView.monthIndex, 1);
    const jsDow = first.getDay(); // Sun=0
    const mondayIndex = jsDow === 0 ? 6 : jsDow - 1; // Mon=0
    const gridStart = new Date(calView.year, calView.monthIndex, 1 - mondayIndex);
    const pad2 = (n) => String(n).padStart(2, '0');
    const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const out = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      out.push({
        iso: toISO(d),
        day: d.getDate(),
        inMonth: d.getMonth() === calView.monthIndex,
        isToday: toISO(new Date()) === toISO(d),
      });
    }
    return out;
  }

  const calendarGrid = useMemo(() => buildCalendarGrid(), [calView.monthIndex, calView.year, calendarByDate]);

  const activeRow = rows.find((r) => r.id === activeRowId) ?? null;

  const periodLabel = monthIdx === 0 ? 'Last 30 Days' : MONTHS[monthIdx];

  const closePopover = useCallback(() => setActiveRowId(null), []);

  const updatePopoverPosition = useCallback(() => {
    if (!activeRowId) return;
    const anchor = anchorRefs.current[activeRowId];
    setPopoverPosition(computePopoverPosition(anchor, popoverRef.current));
  }, [activeRowId]);

  useLayoutEffect(() => {
    if (!activeRowId) return undefined;
    updatePopoverPosition();
    const raf = requestAnimationFrame(() => updatePopoverPosition());
    return () => cancelAnimationFrame(raf);
  }, [activeRowId, activeRow?.logDetails, updatePopoverPosition]);

  const handleRowClick = useCallback((row) => {
    setHoveredSession(null);
    if (!isRowInteractive(row)) return;
    setActiveRowId((prev) => (prev === row.id ? null : row.id));
  }, []);

  const handleSessionEnter = useCallback((session, anchorRect) => {
    setHoveredSession(session);
    setSessionTooltipPosition(computeSessionTooltipPosition(anchorRect));
  }, []);

  const handleSessionLeave = useCallback(() => {
    setHoveredSession(null);
  }, []);

  useEffect(() => {
    closePopover();
    setHoveredSession(null);
  }, [monthIdx, closePopover]);

  useEffect(() => {
    const onScrollOrResize = () => {
      setHoveredSession(null);
      if (activeRowId) updatePopoverPosition();
    };
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [activeRowId, updatePopoverPosition]);

  useEffect(() => {
    if (!activeRowId) return undefined;

    const onDocumentClick = (e) => {
      if (e.target.closest('[data-log-popover]')) return;
      if (e.target.closest(`[data-attendance-row="${activeRowId}"]`)) return;
      closePopover();
    };

    const timer = window.setTimeout(() => {
      document.addEventListener('click', onDocumentClick);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('click', onDocumentClick);
    };
  }, [activeRowId, closePopover]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setHoveredSession(null);
      closePopover();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closePopover]);

  const popoverPortal =
    activeRow?.logDetails &&
    createPortal(
      <LogDetailsPopover
        key={activeRowId}
        details={activeRow.logDetails}
        position={popoverPosition}
        popoverRef={popoverRef}
        onRegularize={() => {
          const punches = activeRow?.logDetails?.punches ?? [];
          const firstIn = punches.find((p) => p.type === 'in')?.iso ?? null;
          const lastOut = [...punches].reverse().find((p) => p.type === 'out')?.iso ?? null;
          const dateIso = String(activeRow?.id ?? '').slice(0, 10) || '';
          const sessions = activeRow?.sessions ?? [];

          setSubTab('attendance_requests');
          setRegularizeOpenRequest({
            key: `${Date.now()}`,
            date: dateIso,
            sessions,
            request_type: 'both',
            requested_check_in: firstIn,
            requested_check_out: lastOut,
            default_check_in: firstIn,
            default_check_out: lastOut,
          });
          closePopover();
        }}
      />,
      document.body
    );

  const sessionTooltipPortal =
    hoveredSession &&
    createPortal(
      <SessionHoverTooltip
        session={hoveredSession}
        hour24={hour24}
        position={sessionTooltipPosition}
        open={Boolean(hoveredSession)}
      />,
      document.body
    );

  return (
    <div className="overflow-hidden rounded-xl border border-[#2a3447] bg-[#1b2333] font-sans text-gray-100">
      <div className="border-b border-[#2a3447] px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-0.5">
            {SUB_TABS.map((t) => {
              const active = subTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSubTab(t.id)}
                  className={cx(
                    'relative whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[#252d45] text-white shadow-sm ring-1 ring-[#3d3a5c]/80'
                      : 'text-gray-400 hover:bg-[#20293c]/80 hover:text-gray-200'
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm text-gray-400">24 hour format</span>
            <button
              type="button"
              role="switch"
              aria-checked={hour24}
              onClick={() => setHour24((v) => !v)}
              className={cx(
                'inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-[#2a3447] p-0.5 transition-colors',
                hour24 ? 'justify-end bg-[#2dd4bf]/80' : 'justify-start bg-[#2a3447]'
              )}
            >
              <span className="inline-block h-5 w-5 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>
      </div>

      {subTab === 'attendance_log' ? (
        <div className="px-4 py-4 md:px-6 md:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold tracking-tight text-gray-100">{periodLabel}</div>
            <div className="flex flex-wrap items-center gap-2">
              {MONTHS.map((x, idx) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => {
                    setMonthIdx(idx);
                    closePopover();
                  }}
                  className={cx(
                    'h-8 rounded-md px-3 text-xs font-semibold uppercase tracking-wide transition-colors',
                    monthIdx === idx
                      ? 'bg-[#6b21a8] text-white'
                      : 'border border-[#2a3447] bg-transparent text-gray-400 hover:border-[#3d4a63] hover:bg-[#20293c] hover:text-gray-200'
                  )}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-4 w-full overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[920px] table-fixed border-collapse font-sans tabular-nums">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[22%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#2a3447] text-left">
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Attendance Visual
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Effective Hours
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Gross Hours
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Arrival
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Log
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-300">
                <AttendanceLogTableBody
                  rows={rows}
                  loading={loading}
                  error={error}
                  anchorRefs={anchorRefs}
                  onRowClick={handleRowClick}
                  onSessionEnter={handleSessionEnter}
                  onSessionLeave={handleSessionLeave}
                  onMapView={(row) => {
                    if (dayHasMapLocations(row?.sessions)) setMapViewRow(row);
                  }}
                />
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === 'calendar' ? (
        <div className="px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#2a3447] bg-[#151b2b] px-3 py-2">
              <button
                type="button"
                onClick={() =>
                  setCalView((v) => {
                    const m = v.monthIndex - 1;
                    if (m >= 0) return { ...v, monthIndex: m };
                    return { year: v.year - 1, monthIndex: 11 };
                  })
                }
                className="grid h-7 w-7 place-items-center rounded-md border border-[#2a3447] bg-transparent text-gray-200 hover:bg-[#232d42]"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-semibold text-gray-100">
                {CAL_MONTHS[calView.monthIndex]} {calView.year}
              </div>
              <button
                type="button"
                onClick={() =>
                  setCalView((v) => {
                    const m = v.monthIndex + 1;
                    if (m <= 11) return { ...v, monthIndex: m };
                    return { year: v.year + 1, monthIndex: 0 };
                  })
                }
                className="grid h-7 w-7 place-items-center rounded-md border border-[#2a3447] bg-transparent text-gray-200 hover:bg-[#232d42]"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-gray-500">
              {calendarTimelineQuery.isLoading ? 'Loading…' : null}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-[#2a3447] bg-[#151b2b]">
            <div className="grid grid-cols-7 border-b border-[#2a3447]">
              {CAL_WEEKDAYS.map((d) => (
                <div key={d} className="px-3 py-2 text-[11px] font-semibold text-gray-400">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarGrid.map((cell) => {
                const evt = calendarByDate.get(cell.iso);
                const type = String(evt?.type ?? '').toLowerCase();
                const status = String(evt?.status ?? '').toLowerCase();
                const isWeekOff = type === 'week_off' || status === 'week_off';
                const isHoliday = type === 'holiday' || status === 'holiday';
                const holidayName = isHoliday ? evt?.details?.name : null;

                return (
                  <div
                    key={cell.iso}
                    className={cx(
                      'relative min-h-[92px] border-r border-b border-[#2a3447]/70 p-3',
                      !cell.inMonth && 'bg-[#0f172a]/30 text-gray-600',
                      cell.isToday && 'ring-1 ring-inset ring-[#2dd4bf]/40'
                    )}
                    title={holidayName ? String(holidayName) : undefined}
                  >
                    <div className="text-xs font-semibold tabular-nums text-gray-200">{cell.day}</div>

                    {isWeekOff ? (
                      <span className="mt-2 inline-flex rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                        W-Off
                      </span>
                    ) : null}

                    {isHoliday ? (
                      <span className="mt-2 inline-flex rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
                        Holiday
                      </span>
                    ) : null}

                    {isHoliday && holidayName ? (
                      <div className="mt-1 line-clamp-2 text-[10px] text-gray-400">{holidayName}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : subTab === 'overtime_requests' ? (
        <div className="px-4 py-4 md:px-6 md:py-5">
          <OvertimeRequestsPanel policy={policy} />
        </div>
      ) : subTab === 'attendance_requests' ? (
        <div className="px-4 py-4 md:px-6 md:py-5">
          <RegularizationPanel
            openRequest={regularizeOpenRequest}
            onDrawerClose={() => setRegularizeOpenRequest(null)}
          />
        </div>
      ) : (
        <div className="px-4 py-12 text-center text-sm text-gray-500 md:px-6">
          This section is coming soon.
        </div>
      )}

      {popoverPortal}
      {sessionTooltipPortal}

      <AttendanceMapModal
        row={mapViewRow}
        hour24={hour24}
        onClose={() => setMapViewRow(null)}
      />
    </div>
  );
}
