import React, { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getHolidays } from '../../../services/holidays';
import HolidayItem from './HolidayItem';
import {
  currentYear,
  cx,
  filterActiveHolidays,
  sortHolidaysAsc,
} from './holidayUtils.js';

function ModalSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[4.5rem] animate-pulse rounded-lg border border-slate-700/60 bg-slate-800/60"
        />
      ))}
    </div>
  );
}

function EmptyState({ year }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-4 py-10 text-center">
      <p className="text-sm font-semibold text-slate-200">No holidays configured for this year</p>
      <p className="mt-1 text-xs text-slate-400">Try another year or check back later.</p>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">{year}</p>
    </div>
  );
}

export default function HolidayModal({ open, onClose, initialYear }) {
  const [year, setYear] = React.useState(initialYear ?? currentYear());

  useEffect(() => {
    if (open) setYear(initialYear ?? currentYear());
  }, [open, initialYear]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const holidaysQuery = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => getHolidays(year),
    enabled: open,
    staleTime: 60_000,
  });

  const holidays = useMemo(() => {
    return sortHolidaysAsc(filterActiveHolidays(holidaysQuery.data));
  }, [holidaysQuery.data]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="holiday-modal-title"
                className={cx(
                  'relative w-full overflow-hidden rounded-2xl border border-slate-700',
                  'bg-slate-900 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.85)]'
                )}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 px-4 py-3 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <h2
                      id="holiday-modal-title"
                      className="text-sm font-semibold text-slate-50"
                    >
                      Holidays
                    </h2>
                    <div className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 p-0.5">
                      <button
                        type="button"
                        onClick={() => setYear((y) => y - 1)}
                        className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-900 hover:text-slate-100"
                        aria-label="Previous year"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="min-w-[3.5rem] px-2 text-center text-xs font-semibold tabular-nums text-slate-200">
                        {year}
                      </span>
                      <button
                        type="button"
                        onClick={() => setYear((y) => y + 1)}
                        className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-900 hover:text-slate-100"
                        aria-label="Next year"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent/35"
                    aria-label="Close holidays"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-4 py-4 sm:px-5">
                  {holidaysQuery.isLoading ? (
                    <ModalSkeleton />
                  ) : holidaysQuery.isError ? (
                    <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-slate-200">Unable to load holidays</p>
                      <button
                        type="button"
                        onClick={() => holidaysQuery.refetch()}
                        className="mt-2 text-xs font-semibold text-purple-300 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : holidays.length === 0 ? (
                    <EmptyState year={year} />
                  ) : (
                    <motion.div
                      key={year}
                      className="grid gap-3 sm:grid-cols-2"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {holidays.map((h) => (
                        <HolidayItem key={h.id} holiday={h} />
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
