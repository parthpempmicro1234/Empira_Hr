import React from 'react';
import StatsRow from './StatsRow.jsx';
import { STATS_GRID, STATS_HEADER_CLASS, STATS_MOBILE_METRICS_INDENT } from './statsGrid.js';

export default function StatsCard({ rows }) {
  if (!rows?.length) return null;

  return (
    <div className="mt-3.5" role="table" aria-label="Attendance statistics">
      <div className={`${STATS_GRID} hidden pb-1.5 sm:grid`} role="row">
        <div role="columnheader" aria-hidden />
        <div role="columnheader" className={`${STATS_HEADER_CLASS} text-right`}>
          AVG HRS / DAY
        </div>
        <div role="columnheader" className={`${STATS_HEADER_CLASS} text-right w-full`}>
          ON TIME ARRIVAL
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-4 pb-1.5 sm:hidden ${STATS_MOBILE_METRICS_INDENT}`}>
        <div className={STATS_HEADER_CLASS}>AVG HRS / DAY</div>
        <div className={STATS_HEADER_CLASS}>ON TIME ARRIVAL</div>
      </div>

      <div className="divide-y divide-white/[0.06]" role="rowgroup">
        {rows.map((row) => (
          <StatsRow
            key={row.key}
            label={row.label}
            hours={row.hours}
            onTimePct={row.onTimePct}
            icon={row.icon}
            iconWrap={row.iconWrap}
          />
        ))}
      </div>
    </div>
  );
}
