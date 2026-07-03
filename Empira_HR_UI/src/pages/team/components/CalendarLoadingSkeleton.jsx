import React from 'react';
import {
  CALENDAR_GAP_PX,
  CELL_PX,
  EMP_COL_PX,
  PANEL_BG,
  ROW_PX,
  calendarGridTemplate,
  calendarTrackWidth,
} from '../calendarStatusStyles.js';

export default function CalendarLoadingSkeleton({ dayCount = 31, rowCount = 4 }) {
  const gridTemplate = calendarGridTemplate(dayCount);
  const trackWidth = calendarTrackWidth(dayCount);
  const dateCols = `repeat(${dayCount}, ${CELL_PX}px)`;
  const employeeRowStart = 3;

  return (
    <div
      className="inline-grid w-max min-w-full animate-pulse px-1 pb-2 pt-1.5 sm:px-2"
      style={{ gridTemplateColumns: gridTemplate }}
      aria-busy="true"
    >
      <div className="sticky left-0 z-30 py-1 pr-2" style={{ gridColumn: 1, gridRow: 1, backgroundColor: PANEL_BG }}>
        <div className="h-6 w-28 rounded bg-white/[0.06]" />
      </div>
      <div style={{ gridColumn: 2, gridRow: 1, backgroundColor: PANEL_BG }} />
      <div
        className="grid"
        style={{
          gridColumn: '3 / -1',
          gridRow: 1,
          gridTemplateColumns: dateCols,
          width: trackWidth,
        }}
      >
        {Array.from({ length: dayCount }).map((_, i) => (
          <div key={i} className="mx-auto h-4 w-4 rounded bg-white/[0.06]" />
        ))}
      </div>
      <div style={{ gridColumn: 1, gridRow: 2, backgroundColor: PANEL_BG }} />
      <div style={{ gridColumn: 2, gridRow: 2, width: CALENDAR_GAP_PX, backgroundColor: PANEL_BG }} />
      <div
        className="grid border-b border-white/[0.06]"
        style={{
          gridColumn: '3 / -1',
          gridRow: 2,
          gridTemplateColumns: dateCols,
          width: trackWidth,
        }}
      >
        {Array.from({ length: dayCount }).map((_, i) => (
          <div key={i} className="flex justify-center py-1">
            <div className="h-3 w-3 rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
      {Array.from({ length: rowCount }).map((_, index) => {
        const row = employeeRowStart + index;
        return (
          <React.Fragment key={row}>
            <div
              className="sticky left-0 z-20 flex items-center gap-2 border-t border-white/[0.06] py-1 pl-1"
              style={{ gridColumn: 1, gridRow: row, backgroundColor: PANEL_BG, width: EMP_COL_PX }}
            >
              <div className="h-7 w-7 rounded-full bg-white/[0.06]" />
              <div className="h-3 flex-1 rounded bg-white/[0.06]" />
            </div>
            <div style={{ gridColumn: 2, gridRow: row, backgroundColor: PANEL_BG }} />
            <div
              className="grid border-t border-white/[0.06]"
              style={{
                gridColumn: '3 / -1',
                gridRow: row,
                gridTemplateColumns: dateCols,
                width: trackWidth,
                height: ROW_PX,
              }}
            >
              {Array.from({ length: dayCount }).map((__, di) => (
                <div key={di} className="flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full bg-white/[0.06]" />
                </div>
              ))}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
