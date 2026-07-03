import React, { useMemo } from 'react';
import CalendarDayCell from './CalendarDayCell.jsx';
import {
  BAND_HEIGHT_PX,
  CELL_PX,
  ROW_PX,
  calendarTrackWidth,
  statusBg,
} from './calendarStatusStyles.js';
import {
  buildEmployeeCalendarModel,
  resolveCellKind,
  resolveCellType,
  resolveDateStatus,
} from './calendarLayoutUtils.js';

function dateCols(dayCount) {
  return `repeat(${dayCount}, ${CELL_PX}px)`;
}

/** Continuous pill behind weekly-off circles (overlay layer only) */
function WeeklyOffBridge({ start, end }) {
  return (
    <div
      className="pointer-events-none self-center rounded-full"
      style={{
        gridColumn: `${start} / ${end + 1}`,
        gridRow: 1,
        height: BAND_HEIGHT_PX,
        marginInline: -2,
        backgroundColor: statusBg('weekly-off'),
        zIndex: 0,
      }}
      aria-hidden
    />
  );
}

function LeaveBand({ band }) {
  const totalDays = band.end - band.start + 1;

  return (
    <div
      className="pointer-events-none flex self-center overflow-hidden rounded-full"
      style={{
        gridColumn: `${band.start} / ${band.end + 1}`,
        gridRow: 1,
        height: BAND_HEIGHT_PX,
        marginInline: -1,
        zIndex: 1,
      }}
      aria-hidden
    >
      {band.parts.map((part) => {
        const days = part.to - part.from + 1;
        return (
          <span
            key={`${part.from}-${part.to}-${part.type}`}
            className="h-full shrink-0"
            style={{
              width: `${(days / totalDays) * 100}%`,
              backgroundColor: statusBg(part.type),
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * 31-day track: overlay grid (spans only) + cell grid (exactly one cell per day).
 * Spans never share the cell grid, preventing wrap/misalignment.
 */
export default function CalendarDateTrack({ employee, days }) {
  const model = useMemo(
    () =>
      buildEmployeeCalendarModel({
        singles: employee.singles,
        statusLabels: employee.statusLabels,
        dayDetails: employee.dayDetails,
        weeklyOffRuns: employee.weeklyOffRuns,
        bands: employee.bands,
      }),
    [employee]
  );

  const dayCount = days.length;
  const trackWidth = calendarTrackWidth(dayCount);
  const columns = dateCols(dayCount);

  return (
    <div
      className="relative z-10 shrink-0 overflow-visible"
      style={{ width: trackWidth, minWidth: trackWidth, height: ROW_PX }}
    >
      {/* Span layer — does not affect cell placement */}
      <div
        className="pointer-events-none absolute inset-0 grid items-center"
        style={{ gridTemplateColumns: columns, gridTemplateRows: `${ROW_PX}px` }}
        aria-hidden
      >
        {model.weeklyOffRuns.map((run) => (
          <WeeklyOffBridge key={`wo-${run.start}-${run.end}`} start={run.start} end={run.end} />
        ))}
        {model.bands.map((band) => (
          <LeaveBand key={`band-${band.start}-${band.end}`} band={band} />
        ))}
      </div>

      {/* Cell layer — exactly dayCount columns, single row */}
      <div
        className="relative z-10 grid"
        style={{
          gridTemplateColumns: columns,
          gridTemplateRows: `${ROW_PX}px`,
          width: trackWidth,
        }}
        role="row"
      >
        {days.map((d) => {
          const kind = resolveCellKind(model, d.date);
          const type = resolveCellType(model, d.date);
          const isWeeklyOff = model.weeklyOffDays.has(d.date);
          const status = resolveDateStatus(model, d.date);

          return (
            <div
              key={`${employee.id}-${d.date}`}
              className="relative flex items-center justify-center overflow-visible"
              style={{ width: CELL_PX, minWidth: CELL_PX, maxWidth: CELL_PX, height: ROW_PX }}
              role="gridcell"
            >
              <CalendarDayCell
                kind={kind}
                type={type}
                date={d.date}
                isWeeklyOff={isWeeklyOff}
                status={status}
                dayMeta={d}
                employee={employee}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
