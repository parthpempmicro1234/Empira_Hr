import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import { getHolidays } from '../../../services/holidays';
import HolidayModal from './HolidayModal';
import HolidayCardSkeleton from './HolidayCardSkeleton';
import {
  currentYear,
  cx,
  filterActiveHolidays,
  formatCompactHolidayDate,
  formatWeekdayName,
  getUpcomingHolidays,
} from './holidayUtils.js';

export default function HolidayWidget() {
  const [modalOpen, setModalOpen] = useState(false);
  const [upcomingIndex, setUpcomingIndex] = useState(0);
  const year = currentYear();
  const nextYear = year + 1;

  const currentYearQuery = useQuery({
    queryKey: ['holidays', year, 'widget'],
    queryFn: () => getHolidays(year),
    staleTime: 5 * 60_000,
  });

  const nextYearQuery = useQuery({
    queryKey: ['holidays', nextYear, 'widget'],
    queryFn: () => getHolidays(nextYear),
    staleTime: 5 * 60_000,
  });

  const upcoming = useMemo(() => {
    const merged = [
      ...filterActiveHolidays(currentYearQuery.data),
      ...filterActiveHolidays(nextYearQuery.data),
    ];
    return getUpcomingHolidays(merged);
  }, [currentYearQuery.data, nextYearQuery.data]);

  const isLoading = currentYearQuery.isLoading || nextYearQuery.isLoading;
  const isError = currentYearQuery.isError && nextYearQuery.isError;

  const safeIndex =
    upcoming.length > 0 ? Math.min(upcomingIndex, upcoming.length - 1) : 0;
  const displayed = upcoming[safeIndex] ?? null;
  const canPrev = upcoming.length > 1 && safeIndex > 0;
  const canNext = upcoming.length > 1 && safeIndex < upcoming.length - 1;

  if (isLoading) {
    return <HolidayCardSkeleton />;
  }

  return (
    <>
      <div
        className={cx(
          'rounded-lg border border-slate-700 bg-purple-900/50 p-4',
          'transition-colors hover:border-purple-500/40'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-purple-200/80">
                Holiday
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="text-[11px] font-semibold text-purple-200/90 underline-offset-2 transition hover:text-purple-100 hover:underline focus:outline-none focus:ring-2 focus:ring-accent/35 rounded"
              >
                View All
              </button>
            </div>

            {isError ? (
              <>
                <div className="mt-1 text-base font-semibold text-slate-50">—</div>
                <div className="mt-1 text-sm text-purple-100/80">Unable to load holidays</div>
                <button
                  type="button"
                  onClick={() => {
                    currentYearQuery.refetch();
                    nextYearQuery.refetch();
                  }}
                  className="mt-2 text-xs font-semibold text-purple-200 hover:underline"
                >
                  Retry
                </button>
              </>
            ) : !displayed ? (
              <>
                <div className="mt-1 text-base font-semibold text-slate-50">No upcoming holidays</div>
                <div className="mt-1 text-sm text-purple-100/80">Check the full holiday calendar</div>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-2 text-xs font-semibold text-purple-200/90 hover:underline"
                >
                  View calendar
                </button>
              </>
            ) : (
              <>
                <div className="mt-1 truncate text-base font-semibold text-slate-50">
                  {displayed.name}
                </div>
                <div className="mt-1 text-sm text-purple-100/80">
                  {formatCompactHolidayDate(displayed.parsed)}
                </div>
                <div className="mt-0.5 text-xs text-purple-200/60">
                  {formatWeekdayName(displayed.parsed)}
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-purple-500/15 ring-1 ring-purple-400/30">
              <Gift className="h-5 w-5 text-purple-200" aria-hidden />
            </div>
            {upcoming.length > 1 && displayed ? (
              <div className="inline-flex rounded-md border border-purple-400/20 bg-purple-950/30 p-0.5">
                <button
                  type="button"
                  disabled={!canPrev}
                  onClick={() => setUpcomingIndex((i) => Math.max(0, i - 1))}
                  className={cx(
                    'grid h-6 w-6 place-items-center rounded text-purple-200/80 transition',
                    canPrev ? 'hover:bg-purple-500/20 hover:text-purple-50' : 'cursor-not-allowed opacity-40'
                  )}
                  aria-label="Previous upcoming holiday"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() =>
                    setUpcomingIndex((i) => Math.min(upcoming.length - 1, i + 1))
                  }
                  className={cx(
                    'grid h-6 w-6 place-items-center rounded text-purple-200/80 transition',
                    canNext ? 'hover:bg-purple-500/20 hover:text-purple-50' : 'cursor-not-allowed opacity-40'
                  )}
                  aria-label="Next upcoming holiday"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <HolidayModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialYear={displayed?.parsed?.getFullYear() ?? year}
      />
    </>
  );
}
