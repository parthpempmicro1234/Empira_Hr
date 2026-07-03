import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Coffee,
  FileText,
  Home,
  Info,
  Loader2,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import LogsRequests from './me/LogsRequests.jsx';
import LeaveSummary from './me/LeaveSummary.jsx';
import MeSectionTabBar from './me/MeSectionTabBar.jsx';
import {
  getEffectiveGrossDisplayFromDay,
  getDetailsForSessionsFromDay,
  mergeAttendanceDayIntoTimeline,
  shouldShowCheckOutForToday,
  getTimelineDayIsoKey,
  toISODate,
} from './me/attendanceLogHelpers.js';
import {
  extractAttendanceDayFromResponse,
  normalizeAttendanceDayPatch,
} from './me/attendanceDayResponse.js';
import { getLiveRunningTime } from './me/liveAttendanceTime.js';
import AttendancePolicyModal from './me/attendancePolicy/AttendancePolicyModal.jsx';
import AttendanceStats from './me/attendanceStats/AttendanceStats.jsx';
import {
  checkIn,
  checkOut,
  getAttendanceDays,
  getAttendanceTimeline,
  getMyAttendancePolicy,
  getMyAttendanceShift,
} from '../services/attendance.api';
import { getCurrentPosition } from '../utils/geolocation';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const TABS = [
  { id: 'attendance', label: 'ATTENDANCE' },
  { id: 'leave', label: 'LEAVE' },
  { id: 'performance', label: 'PERFORMANCE' },
  { id: 'expenses', label: 'EXPENSES & TRAVEL' },
  { id: 'apps', label: 'APPS' },
];

function MetricCard({ children, className }) {
  return (
    <div
      className={cx(
        'relative rounded-xl border border-[#2a3447] bg-[#1b2333] font-sans text-gray-100',
        className
      )}
    >
      {children}
    </div>
  );
}

const WEEKDAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Mon=0 … Sun=6 */
function getTodayDayIndex(date) {
  const js = date.getDay();
  return js === 0 ? 6 : js - 1;
}

const TIMING_BREAK_MINUTES = 60;

/** Visual day bar: two work blocks + center break (not tied to live worked %). */
const TIMING_BAR_SEGMENTS = [
  { leftPct: 0, widthPct: 45 },
  { leftPct: 55, widthPct: 45 },
];

function getApiErrorMessage(err) {
  const data = err?.response?.data;
  if (!data) return err?.message || 'Something went wrong';
  if (typeof data === 'string') return data;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.blocked_reason === 'string' && data.blocked_reason.trim()) return data.blocked_reason;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;

  // DRF field errors: { field: ["msg"] }
  if (typeof data === 'object') {
    const firstKey = Object.keys(data)[0];
    const v = firstKey ? data[firstKey] : null;
    if (Array.isArray(v) && v[0]) return String(v[0]);
  }
  return 'Something went wrong';
}

function AttendanceStatic() {
  const [now, setNow] = useState(() => new Date());
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [punchError, setPunchError] = useState('');
  const [punchWarnings, setPunchWarnings] = useState([]);
  const queryClient = useQueryClient();
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    timerIntervalRef.current = id;
    return () => {
      window.clearInterval(id);
      timerIntervalRef.current = null;
    };
  }, []);

  const todayIso = useMemo(
    () => toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
    [now.getFullYear(), now.getMonth(), now.getDate()]
  );

  const policyQuery = useQuery({
    queryKey: ['attendance', 'my-policy'],
    queryFn: getMyAttendancePolicy,
    staleTime: 60_000,
  });

  const shiftQuery = useQuery({
    queryKey: ['attendance', 'my-shift'],
    queryFn: getMyAttendanceShift,
    staleTime: 60_000,
  });

  const todayQuery = useQuery({
    queryKey: ['attendance', 'employee', 'today', todayIso],
    queryFn: () => getAttendanceDays(todayIso, todayIso),
    staleTime: 30_000,
  });

  const attendanceData = useMemo(() => {
    const list = todayQuery.data ?? [];
    const day = Array.isArray(list) ? list.find((d) => String(d?.date ?? '').slice(0, 10) === todayIso) : null;
    if (!day) return null;
    // Normalize to the timeline-day shape expected by existing helpers.
    return { date: day.date ?? todayIso, type: 'attendance', details: day };
  }, [todayQuery.data, todayQuery.dataUpdatedAt, todayIso]);

  const isCheckedIn = shouldShowCheckOutForToday(attendanceData);
  const todayDetails = getDetailsForSessionsFromDay(attendanceData);
  const isLocked = Boolean(todayDetails?.is_locked);

  const staticHours = useMemo(() => getEffectiveGrossDisplayFromDay(attendanceData), [attendanceData]);

  /** Live totals while checked in; `now` ticks every 1s (same interval as clock). */
  const liveRunning = useMemo(
    () => getLiveRunningTime(now, todayDetails, isCheckedIn),
    [now, todayDetails, isCheckedIn]
  );
  const liveEffectiveTime = liveRunning?.effective ?? null;
  const liveGrossTime = liveRunning?.gross ?? null;
  const effectiveLabel = liveEffectiveTime ?? staticHours.effective;
  const grossLabel = liveGrossTime ?? staticHours.gross;

  const applyAttendanceDayToCaches = useCallback(
    async (apiResponse) => {
      const raw = extractAttendanceDayFromResponse(apiResponse);
      const patch = normalizeAttendanceDayPatch(raw);

      if (patch && Object.keys(patch).length > 0) {
        queryClient.setQueryData(['attendance', 'employee', 'today', todayIso], (old) => ({
          timeline: mergeAttendanceDayIntoTimeline(old?.timeline ?? [], todayIso, patch),
        }));

        const timelineCaches = queryClient.getQueriesData({
          queryKey: ['attendance', 'employee', 'timeline'],
          exact: false,
        });
        for (const [queryKey, cached] of timelineCaches) {
          if (!Array.isArray(queryKey) || queryKey.length < 5) continue;
          const fromDate = queryKey[3];
          const toDate = queryKey[4];
          if (typeof fromDate !== 'string' || typeof toDate !== 'string') continue;
          if (todayIso < fromDate || todayIso > toDate) continue;
          if (!cached?.timeline) continue;
          queryClient.setQueryData(queryKey, {
            timeline: mergeAttendanceDayIntoTimeline(cached.timeline, todayIso, patch),
          });
        }
      }

      await queryClient.refetchQueries({
        queryKey: ['attendance', 'employee'],
        type: 'active',
      });
    },
    [queryClient, todayIso]
  );

  const checkInMutation = useMutation({
    mutationFn: async () => {
      setPunchError('');
      setPunchWarnings([]);
      const policy = policyQuery.data?.policy ?? null;
      const body = {
        device: 'web',
        browser: 'web',
        work_mode: 'office',
      };
      if (policy?.require_gps) {
        const pos = await getCurrentPosition();
        if (!pos.ok) {
          throw new Error(pos.message);
        }
        body.lat = pos.lat;
        body.lng = pos.lng;
      }
      const res = await checkIn(body);
      return res;
    },
    onSuccess: (res) => {
      setPunchWarnings(Array.isArray(res?.warnings) ? res.warnings : []);
      void applyAttendanceDayToCaches(res);
    },
    onError: (e) => {
      setPunchError(getApiErrorMessage(e));
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      setPunchError('');
      setPunchWarnings([]);
      const policy = policyQuery.data?.policy ?? null;
      const body = {};
      if (policy?.require_gps) {
        const pos = await getCurrentPosition();
        if (!pos.ok) {
          throw new Error(pos.message);
        }
        body.lat = pos.lat;
        body.lng = pos.lng;
      }
      const res = await checkOut(body);
      return res;
    },
    onSuccess: (res) => {
      setPunchWarnings(Array.isArray(res?.warnings) ? res.warnings : []);
      void applyAttendanceDayToCaches(res);
    },
    onError: (e) => {
      setPunchError(getApiErrorMessage(e));
    },
  });

  const clockLoading = checkInMutation.isPending || checkOutMutation.isPending;
  const timelineLoading = todayQuery.isLoading;
  const configLoading = policyQuery.isLoading || shiftQuery.isLoading;
  const policy = policyQuery.data?.policy ?? null;
  const shift = shiftQuery.data?.shift ?? null;
  const hasConfig = Boolean(policy && shift);
  const buttonDisabled = clockLoading || timelineLoading || configLoading || !hasConfig || isLocked;

  const activeDayIndex = useMemo(() => getTodayDayIndex(now), [now]);

  const todayWeekday = WEEKDAY_FULL[activeDayIndex] ?? 'Today';

  const timeStr = useMemo(() => {
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }, [now]);

  const dateStr = useMemo(() => {
    return now.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [now]);

  const handleClockClick = () => {
    if (buttonDisabled) return;
    if (isCheckedIn) {
      checkOutMutation.mutate();
    } else {
      checkInMutation.mutate();
    }
  };

  const timingDurationLabel = effectiveLabel || '0h 0m';

  return (
    <div className="space-y-6 rounded-b-xl rounded-t-none bg-[#151b2b] px-0 pb-4 pt-0 font-sans antialiased sm:pb-6">
      {!hasConfig && !configLoading ? (
        <div className="mx-4 rounded-xl border border-[#2a3447] bg-[#1b2333] p-4 text-sm text-gray-200 md:mx-6 lg:mx-8">
          <div className="font-semibold text-white">Attendance setup missing</div>
          <div className="mt-1 text-xs text-gray-400">
            Your shift or attendance policy is not configured. Please contact HR.
          </div>
        </div>
      ) : null}

      {punchWarnings.length > 0 ? (
        <div className="mx-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100 md:mx-6 lg:mx-8">
          <div className="font-semibold">Notice</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100/90">
            {punchWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {punchError ? (
        <div className="mx-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100 md:mx-6 lg:mx-8">
          <div className="font-semibold">Unable to punch</div>
          <div className="mt-1 text-xs text-rose-100/90">{punchError}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AttendanceStats />

        <MetricCard className="flex flex-col p-5">
          <div className="text-sm font-semibold tracking-tight text-gray-100">Timings</div>

          <div className="mt-4 flex justify-center gap-1.5 sm:justify-start">
            {WEEKDAY_SHORT.map((d, i) => {
              const active = i === activeDayIndex;
              return (
                <div
                  key={WEEKDAY_FULL[i]}
                  title={WEEKDAY_FULL[i]}
                  aria-label={WEEKDAY_FULL[i]}
                  aria-current={active ? 'date' : undefined}
                  className={cx(
                    'grid h-7 w-7 place-items-center rounded-full text-xs font-semibold transition-colors',
                    active ? 'bg-[#2dd4bf] text-black' : 'text-gray-400'
                  )}
                >
                  {d}
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <div className="text-xs font-medium text-gray-400">
              Today — {todayWeekday} (Flexible Timings)
            </div>
            <div
              className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-[#2a3447]"
              role="img"
              aria-label={`Today's shift pattern. Duration: ${timingDurationLabel}`}
            >
              {TIMING_BAR_SEGMENTS.map((seg, i) => (
                <div
                  key={i}
                  className="absolute inset-y-0 rounded-full bg-[#2dd4bf]"
                  style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-xs tabular-nums text-gray-400">
                Duration: 23h 59m
              </span>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Coffee className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>{TIMING_BREAK_MINUTES} min</span>
              </div>
            </div>
          </div>
        </MetricCard>

        <MetricCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 shrink">
              <div className="inline-block rounded-lg border border-[#2a3447] bg-[#151b2b] px-3 py-2">
                <div className="text-sm font-semibold tabular-nums tracking-tight text-gray-100">{timeStr}</div>
                <div className="mt-0.5 text-xs text-gray-400">{dateStr}</div>
              </div>
            </div>
            <div className="flex min-w-0 flex-col items-end gap-1.5">
              <button
                type="button"
                disabled={buttonDisabled}
                onClick={handleClockClick}
                className={cx(
                  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-none transition-opacity',
                  isCheckedIn ? 'bg-[#fb7185] hover:opacity-90' : 'bg-[#2dd4bf] text-black hover:opacity-90',
                  buttonDisabled && 'cursor-not-allowed opacity-60'
                )}
              >
                {(clockLoading || timelineLoading) && (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                )}
                {isCheckedIn ? 'Check-Out' : 'Check-In'}
              </button>
              {isLocked ? (
                <div className="text-[11px] font-medium text-gray-500">Today is locked</div>
              ) : null}
              <a
                href="#"
                className="group flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-100"
                onClick={(e) => e.preventDefault()}
              >
                <span className="grid h-5 w-5 place-items-center rounded border border-purple-400/70 text-purple-300">
                  <Home className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="whitespace-nowrap border-b border-transparent group-hover:border-gray-500">
                  Work From Home
                </span>
              </a>
              {shift ? (
                <div className="mt-1 text-right text-[11px] text-gray-500">
                  Shift: <span className="font-semibold text-gray-300">{shift.name}</span>
                </div>
              ) : null}
              <button
                type="button"
                className="group flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-100"
                onClick={() => setPolicyModalOpen(true)}
              >
                <span className="grid h-5 w-5 place-items-center rounded border border-purple-400/70 text-purple-300">
                  <FileText className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="whitespace-nowrap border-b border-transparent group-hover:border-gray-500">
                  Attendance Policy
                </span>
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-[#2a3447] pt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <span>TOTAL HOURS</span>
              <Info className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} aria-hidden />
            </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="tabular-nums text-gray-100">
                  <span className="text-gray-400">Effective: </span>
                  <span className="font-semibold">{effectiveLabel}</span>
                </div>
                <div className="tabular-nums text-gray-100">
                  <span className="text-gray-400">Gross: </span>
                  <span className="font-semibold">{grossLabel}</span>
                </div>
                {typeof todayDetails?.overtime_minutes === 'number' && todayDetails.overtime_minutes > 0 ? (
                  <div className="tabular-nums text-gray-100">
                    <span className="text-gray-400">Overtime: </span>
                    <span className="font-semibold">{todayDetails.overtime_minutes} min</span>
                  </div>
                ) : null}
              </div>
          </div>
        </MetricCard>
      </div>

      <LogsRequests policy={policy} />

      <AttendancePolicyModal open={policyModalOpen} onClose={() => setPolicyModalOpen(false)} />
    </div>
  );
}

function parseMePath(rest) {
  const segments = (rest || '').split('/').filter(Boolean);
  const section = segments[0] || 'attendance';
  const leaveId = section === 'leave' && segments[1] ? segments[1] : null;
  return { section, leaveId };
}

export default function Me() {
  const navigate = useNavigate();
  const { '*': rest } = useParams();
  const [searchParams] = useSearchParams();

  // Legacy ?tab= & ?leaveId= links (notifications, bookmarks)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (!tabParam) return;
    const leaveIdParam = searchParams.get('leaveId');
    const pathname =
      tabParam === 'leave' && leaveIdParam
        ? `/me/leave/${leaveIdParam}`
        : `/me/${tabParam}`;
    navigate({ pathname, search: '' }, { replace: true });
  }, [searchParams, navigate]);

  const { section, leaveId } = parseMePath(rest);
  const tab = TABS.some((t) => t.id === section) ? section : 'attendance';

  useEffect(() => {
    if (section !== tab) {
      navigate(`/me/${tab}`, { replace: true });
    }
  }, [section, tab, navigate]);

  const handleTabChange = (id) => {
    navigate(`/me/${id}`, { replace: true });
  };

  return (
    <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
      <MeSectionTabBar tabs={TABS} activeId={tab} onChange={handleTabChange} />

      <div className="px-4 md:px-6 lg:px-8">
        {tab === 'attendance' && <AttendanceStatic />}
        {tab === 'leave' && <LeaveSummary initialLeaveId={leaveId} />}
        {tab !== 'attendance' && tab !== 'leave' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            This section is coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
