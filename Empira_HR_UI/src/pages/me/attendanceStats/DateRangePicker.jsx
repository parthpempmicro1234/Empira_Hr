import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  PICKER_MONTHS,
  PICKER_WEEKDAYS,
  buildMonthGrid,
  compareISODate,
  fromISODate,
  isDateInRange,
} from './dateUtils.js';

function MonthPanel({ year, monthIndex, rangeFrom, rangeTo, hoverIso, onDayClick, onDayHover, onDayLeave }) {
  const grid = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);

  const cellClass = (iso, inMonth) => {
    const isStart = rangeFrom && iso === rangeFrom;
    const isEnd = rangeTo && iso === rangeTo;
    const inRange = isDateInRange(iso, rangeFrom, rangeTo);
    const inHover =
      rangeFrom &&
      !rangeTo &&
      hoverIso &&
      (compareISODate(iso, rangeFrom) >= 0
        ? compareISODate(iso, hoverIso) <= 0
        : compareISODate(iso, hoverIso) >= 0) &&
      compareISODate(iso, rangeFrom) !== 0;

    const base =
      'relative z-[1] grid h-8 w-8 place-items-center rounded-md text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/60';
    if (!inMonth) return `${base} text-gray-600 hover:bg-white/5`;
    if (isStart || isEnd) return `${base} bg-[#2dd4bf] text-black`;
    if (inRange || inHover) return `${base} bg-[#2dd4bf]/20 text-gray-100`;
    return `${base} text-gray-200 hover:bg-white/5`;
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 text-center text-xs font-semibold text-gray-200">
        {PICKER_MONTHS[monthIndex]} {year}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-500">
        {PICKER_WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {grid.map((cell) => (
          <button
            key={cell.iso}
            type="button"
            tabIndex={0}
            disabled={!cell.inMonth}
            onClick={() => cell.inMonth && onDayClick(cell.iso)}
            onMouseEnter={() => cell.inMonth && onDayHover(cell.iso)}
            onMouseLeave={onDayLeave}
            onFocus={() => cell.inMonth && onDayHover(cell.iso)}
            className={cellClass(cell.iso, cell.inMonth)}
            aria-label={cell.iso}
          >
            {cell.day}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DateRangePicker({ open, anchorRef, fromDate, toDate, onApply, onClose }) {
  const panelRef = useRef(null);
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [draftFrom, setDraftFrom] = useState(fromDate ?? '');
  const [draftTo, setDraftTo] = useState(toDate ?? '');
  const [hoverIso, setHoverIso] = useState(null);

  const secondMonthIndex = viewMonth === 11 ? 0 : viewMonth + 1;
  const secondYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  useEffect(() => {
    if (!open) return;
    const base = fromISODate(fromDate) ?? today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setDraftFrom(fromDate ?? '');
    setDraftTo(toDate ?? '');
    setHoverIso(null);
  }, [open, fromDate, toDate, today]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = useCallback(
    (iso) => {
      if (!draftFrom || (draftFrom && draftTo)) {
        setDraftFrom(iso);
        setDraftTo('');
        return;
      }
      if (compareISODate(iso, draftFrom) < 0) {
        setDraftTo(draftFrom);
        setDraftFrom(iso);
        onApply?.(iso, draftFrom);
        onClose?.();
        return;
      }
      setDraftTo(iso);
      onApply?.(draftFrom, iso);
      onClose?.();
    },
    [draftFrom, draftTo, onApply, onClose]
  );

  if (!open) return null;

  const style = {};
  if (anchorRef?.current) {
    const rect = anchorRef.current.getBoundingClientRect();
    style.top = rect.bottom + 8;
    style.left = Math.min(rect.left, window.innerWidth - 620);
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Select custom date range"
      className="fixed z-50 w-[min(100vw-1.5rem,36rem)] origin-top rounded-xl border border-[#2a3447] bg-[#151b2b] p-3 shadow-2xl animate-[dropdownIn_200ms_ease-out] sm:p-4"
      style={style}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          className="grid h-8 w-8 place-items-center rounded-md text-gray-400 transition-colors hover:bg-[#20293c] hover:text-gray-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="text-xs text-gray-400">Select start and end dates</span>
        <button
          type="button"
          onClick={goNext}
          className="grid h-8 w-8 place-items-center rounded-md text-gray-400 transition-colors hover:bg-[#20293c] hover:text-gray-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <MonthPanel
          year={viewYear}
          monthIndex={viewMonth}
          rangeFrom={draftFrom}
          rangeTo={draftTo}
          hoverIso={hoverIso}
          onDayClick={handleDayClick}
          onDayHover={setHoverIso}
          onDayLeave={() => setHoverIso(null)}
        />
        <MonthPanel
          year={secondYear}
          monthIndex={secondMonthIndex}
          rangeFrom={draftFrom}
          rangeTo={draftTo}
          hoverIso={hoverIso}
          onDayClick={handleDayClick}
          onDayHover={setHoverIso}
          onDayLeave={() => setHoverIso(null)}
        />
      </div>

      {(draftFrom || draftTo) && (
        <p className="mt-3 text-center text-[11px] tabular-nums text-gray-400">
          {draftFrom || '—'} → {draftTo || '—'}
        </p>
      )}
    </div>
  );
}
