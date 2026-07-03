import React, { useMemo } from 'react';
import CalendarCellTooltip from './calendar/CalendarCellTooltip.jsx';
import { buildCalendarTooltipContent } from './calendar/buildCalendarTooltipContent.js';
import { MARKER_PX, statusBg } from './calendarStatusStyles.js';

function CellFrame({ date, status, dayMeta, employee, children }) {
  const hasStatus = Boolean(status?.label || status?.type);
  const tooltipContent = useMemo(
    () => (hasStatus ? buildCalendarTooltipContent(employee, dayMeta, status) : null),
    [employee, dayMeta, status, hasStatus]
  );

  const hoverRing = hasStatus
    ? 'hover:ring-1 hover:ring-violet-400/35 focus-visible:ring-2 focus-visible:ring-violet-400/50'
    : '';

  return (
    <CalendarCellTooltip content={tooltipContent} className="flex h-full w-full items-center justify-center">
      <div
        className={`relative flex h-full w-full items-center justify-center rounded-sm transition-[background-color,box-shadow] duration-150 ease-out ${hasStatus ? 'hover:bg-white/[0.07]' : ''} focus-visible:outline-none ${hoverRing} ${dayMeta?.isToday ? 'bg-violet-500/15 ring-1 ring-violet-400/40' : ''} ${dayMeta?.isWeekend && !dayMeta?.isToday ? 'bg-white/[0.03]' : ''}`}
        tabIndex={hasStatus ? 0 : undefined}
        aria-label={
          hasStatus
            ? `Day ${date}: ${status.label ?? status.type}`
            : `Day ${date}`
        }
      >
        {children}
        <span
          className={`pointer-events-none relative z-10 text-[10px] font-semibold leading-none tabular-nums ${dayMeta?.isToday ? 'text-violet-200' : 'text-white'}`}
        >
          {date}
        </span>
      </div>
    </CalendarCellTooltip>
  );
}

function MarkerDisc({ type }) {
  return (
    <span
      className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        width: MARKER_PX,
        height: MARKER_PX,
        backgroundColor: statusBg(type),
      }}
      aria-hidden
    />
  );
}

export default function CalendarDayCell({
  kind,
  type,
  date,
  isWeeklyOff,
  status,
  dayMeta,
  employee,
}) {
  if (kind === 'single' && type) {
    return (
      <CellFrame date={date} status={status} dayMeta={dayMeta} employee={employee}>
        <MarkerDisc type={type} />
      </CellFrame>
    );
  }

  if (isWeeklyOff) {
    return (
      <CellFrame date={date} status={status} dayMeta={dayMeta} employee={employee}>
        <MarkerDisc type="weekly-off" />
      </CellFrame>
    );
  }

  if (kind === 'band') {
    return (
      <CellFrame date={date} status={status} dayMeta={dayMeta} employee={employee} />
    );
  }

  return (
    <CellFrame date={date} status={status} dayMeta={dayMeta} employee={employee}>
      {null}
    </CellFrame>
  );
}
