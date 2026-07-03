import React from 'react';
import { STATS_GRID, STATS_HEADER_CLASS, STATS_MOBILE_METRICS_INDENT } from './statsGrid.js';

function SkeletonRow() {
  return (
    <>
      <div className="py-2.5 sm:hidden">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="h-3.5 w-14 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className={`mt-1.5 grid grid-cols-2 gap-4 ${STATS_MOBILE_METRICS_INDENT}`}>
          <div className="h-4 w-12 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-8 animate-pulse rounded bg-white/[0.06]" />
        </div>
      </div>

      <div className={`${STATS_GRID} hidden py-2.5 sm:grid`}>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="h-3.5 w-14 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-white/[0.06]" />
        <div className="ml-auto h-4 w-8 animate-pulse rounded bg-white/[0.06]" />
      </div>
    </>
  );
}

export default function LoadingSkeleton({ rows = 2 }) {
  return (
    <div className="mt-3.5" aria-busy="true" aria-label="Loading attendance stats">
      <div className={`${STATS_GRID} hidden pb-1.5 sm:grid`}>
        <div aria-hidden />
        <div className={`${STATS_HEADER_CLASS} text-right opacity-50`}>AVG HRS / DAY</div>
        <div className={`${STATS_HEADER_CLASS} text-right opacity-50`}>ON TIME ARRIVAL</div>
      </div>

      <div className={`grid grid-cols-2 gap-4 pb-1.5 sm:hidden ${STATS_MOBILE_METRICS_INDENT}`}>
        <div className={`${STATS_HEADER_CLASS} opacity-50`}>AVG HRS / DAY</div>
        <div className={`${STATS_HEADER_CLASS} opacity-50`}>ON TIME ARRIVAL</div>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
