import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info, User, UserRound, Users } from 'lucide-react';
import { getAttendanceStats } from '../../../services/attendance.api';
import { formatAvgTime, formatOnTimePercentage } from './attendanceStatsFormat.js';
import { getLastMonthRange } from './dateUtils.js';
import DateRangePicker from './DateRangePicker.jsx';
import LoadingSkeleton from './LoadingSkeleton.jsx';
import PeriodDropdown from './PeriodDropdown.jsx';
import StatsCard from './StatsCard.jsx';

const ROW_META = {
  me: {
    label: 'Me',
    icon: User,
    iconWrap: 'bg-amber-500/15 text-amber-400',
  },
  team: {
    label: 'My Team',
    icon: Users,
    iconWrap: 'bg-sky-500/15 text-sky-400',
  },
  peers: {
    label: 'Peers',
    icon: UserRound,
    iconWrap: 'bg-violet-500/15 text-violet-400',
  },
};

function buildRowsFromResponse(data) {
  if (!data) return [];
  const rows = [];
  if (data.my_stats) {
    rows.push({
      key: 'me',
      ...ROW_META.me,
      hours: formatAvgTime(data.my_stats.avg_time),
      onTimePct: formatOnTimePercentage(data.my_stats.percentage),
    });
  }
  if (data.team) {
    rows.push({
      key: 'team',
      ...ROW_META.team,
      hours: formatAvgTime(data.team.avg_time),
      onTimePct: formatOnTimePercentage(data.team.percentage),
    });
  }
  if (data.peers) {
    rows.push({
      key: 'peers',
      ...ROW_META.peers,
      hours: formatAvgTime(data.peers.avg_time),
      onTimePct: formatOnTimePercentage(data.peers.percentage),
    });
  }
  return rows;
}

function resolveQueryParams(period, customFrom, customTo) {
  if (period === 'last_week') return { fromDate: undefined, toDate: undefined };
  if (period === 'last_month') {
    const { fromDate, toDate } = getLastMonthRange();
    return { fromDate, toDate };
  }
  if (period === 'custom' && customFrom && customTo) {
    return { fromDate: customFrom, toDate: customTo };
  }
  return null;
}

export default function AttendanceStats({ className = '' }) {
  const [period, setPeriod] = useState('last_week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dropdownRef = useRef(null);

  const queryParams = useMemo(
    () => resolveQueryParams(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const statsQuery = useQuery({
    queryKey: ['attendance', 'stats', period, queryParams?.fromDate ?? '', queryParams?.toDate ?? ''],
    queryFn: () => getAttendanceStats(queryParams?.fromDate, queryParams?.toDate),
    enabled: queryParams !== null,
    staleTime: 60_000,
  });

  const rows = useMemo(() => buildRowsFromResponse(statsQuery.data), [statsQuery.data]);

  const handlePeriodChange = (next) => {
    setPeriod(next);
    if (next !== 'custom') {
      setCalendarOpen(false);
    }
  };

  const handleCustomSelect = () => {
    setCalendarOpen(true);
  };

  const handleRangeApply = useCallback((from, to) => {
    setCustomFrom(from);
    setCustomTo(to);
    setPeriod('custom');
    setCalendarOpen(false);
  }, []);

  const queryEnabled = queryParams !== null;
  const awaitingCustomRange = period === 'custom' && (!customFrom || !customTo);
  const isLoading = queryEnabled && (statsQuery.isLoading || statsQuery.isFetching);
  const isError = queryEnabled && statsQuery.isError;
  const isEmpty = queryEnabled && !isLoading && !isError && rows.length === 0;

  return (
    <div
      className={`relative rounded-xl border border-white/[0.06] bg-[#1b2333] p-4 font-sans text-gray-100 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-gray-100">Attendance Stats</h3>
        <div className="group relative shrink-0">
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded-full border border-white/[0.08] text-gray-500 transition-colors duration-200 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
            aria-label="Attendance stats information"
          >
            <Info className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </button>
          <div className="pointer-events-none absolute right-0 top-8 z-20 hidden w-52 rounded-lg border border-white/[0.08] bg-[#1a2230] px-2.5 py-2 text-[11px] leading-snug text-gray-400 shadow-lg shadow-black/25 group-hover:block group-focus-within:block">
            Average hours per day and on-time arrival for the selected period.
          </div>
        </div>
      </div>

      <div ref={dropdownRef} className="mt-2">
        <PeriodDropdown
          value={period}
          onChange={handlePeriodChange}
          disabled={isLoading}
          onCustomSelect={handleCustomSelect}
        />
      </div>

      <DateRangePicker
        open={calendarOpen && period === 'custom'}
        anchorRef={dropdownRef}
        fromDate={customFrom}
        toDate={customTo}
        onApply={handleRangeApply}
        onClose={() => setCalendarOpen(false)}
      />

      {awaitingCustomRange ? (
        <p className="mt-3 py-3 text-center text-[11px] text-gray-500">Select a date range in the calendar</p>
      ) : null}

      {isLoading ? <LoadingSkeleton rows={rows.length || 2} /> : null}

      {isError ? (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-4 text-center">
          <p className="text-xs text-red-300/90">Unable to load attendance stats.</p>
          <button
            type="button"
            onClick={() => statsQuery.refetch()}
            className="mt-2 inline-flex items-center rounded-md border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-200 transition-colors hover:bg-red-500/15"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isEmpty ? (
        <p className="mt-3 py-5 text-center text-xs text-gray-500">No attendance data available</p>
      ) : null}

      {!isLoading && !isError && rows.length > 0 ? <StatsCard rows={rows} /> : null}
    </div>
  );
}
