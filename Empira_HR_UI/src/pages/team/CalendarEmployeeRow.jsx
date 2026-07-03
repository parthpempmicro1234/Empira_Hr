import React from 'react';
import CalendarDateTrack from './CalendarDateTrack.jsx';
import { CALENDAR_GAP_PX, EMP_COL_PX, PANEL_BG } from './calendarStatusStyles.js';

export default function CalendarEmployeeRow({ employee, days, gridColumnStart }) {
  return (
    <>
      <div
        className="sticky left-0 z-20 flex items-center gap-2 border-t border-white/[0.06] py-0.5 pl-1 pr-2"
        style={{
          gridColumn: 1,
          gridRow: gridColumnStart,
          backgroundColor: PANEL_BG,
          width: EMP_COL_PX,
          minWidth: EMP_COL_PX,
        }}
        role="rowheader"
      >
        {employee.profileImage ? (
          <img
            src={employee.profileImage}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10"
          />
        ) : (
          <div
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${employee.avatarClass}`}
            aria-hidden
          >
            {employee.initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate whitespace-nowrap text-[11px] font-medium text-gray-200">
            {employee.name ?? employee.displayName}
          </p>
          {employee.jobTitle ? (
            <p className="truncate text-[9px] text-gray-500">{employee.jobTitle}</p>
          ) : null}
        </div>
      </div>

      <div
        className="border-t border-white/[0.06]"
        style={{
          gridColumn: 2,
          gridRow: gridColumnStart,
          width: CALENDAR_GAP_PX,
          minWidth: CALENDAR_GAP_PX,
          backgroundColor: PANEL_BG,
        }}
        aria-hidden
      />

      <div
        className="overflow-visible border-t border-white/[0.06]"
        style={{ gridColumn: '3 / -1', gridRow: gridColumnStart }}
      >
        <CalendarDateTrack employee={employee} days={days} />
      </div>
    </>
  );
}
