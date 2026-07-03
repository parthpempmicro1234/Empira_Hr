import React from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTodayAttendanceClock } from '../hooks/useTodayAttendanceClock.js';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function DashboardTimeTodayWidget() {
  const {
    isCheckedIn,
    timeStr,
    dateStr,
    timelineLoading,
    clockLoading,
    buttonDisabled,
    handleClockClick,
    refetchTimeline,
    timelineError,
    statusLine,
  } = useTodayAttendanceClock();

  return (
    <div className="rounded-lg border border-purple-400/20 bg-purple-600 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-100/90">Time Today</div>
            <Link
              to="/me/attendance"
              className="text-xs font-semibold text-purple-100/95 underline-offset-2 transition hover:text-white hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-white">{timeStr}</div>
          <div className="mt-1 text-sm text-purple-100/90">{dateStr}</div>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
          <Clock className="h-5 w-5 text-white/90" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-purple-100/80">
          {timelineError ? (
            <span>
              Unable to load attendance.{' '}
              <button
                type="button"
                onClick={() => refetchTimeline()}
                className="font-semibold text-white underline-offset-2 hover:underline"
              >
                Retry
              </button>
            </span>
          ) : timelineLoading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              Syncing…
            </span>
          ) : (
            statusLine
          )}
        </div>
        <button
          type="button"
          disabled={buttonDisabled || timelineError}
          onClick={handleClockClick}
          className={cx(
            'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-none transition-opacity',
            isCheckedIn
              ? 'bg-[#fb7185] text-white hover:opacity-90'
              : 'bg-[#2dd4bf] text-black hover:opacity-90',
            (buttonDisabled || timelineError) && 'cursor-not-allowed opacity-60'
          )}
        >
          {(clockLoading || timelineLoading) && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />}
          {isCheckedIn ? 'Check-Out' : 'Check-In'}
        </button>
      </div>
    </div>
  );
}
