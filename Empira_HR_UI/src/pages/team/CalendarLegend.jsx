import React from 'react';
import { CALENDAR_LEGEND } from './calendarStatusStyles.js';

export default function CalendarLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/[0.06] px-2 pb-2 pt-2.5 sm:px-3">
      {CALENDAR_LEGEND.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5">
          {item.swatch === 'dot' ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
          ) : (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
          )}
          <span className="text-[10px] text-gray-500">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
