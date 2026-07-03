import React from 'react';
import { STATS_GRID, STATS_MOBILE_METRICS_INDENT, STATS_VALUE_CLASS } from './statsGrid.js';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function StatsRow({ label, hours, onTimePct, icon: Icon, iconWrap }) {
  return (
    <div className="transition-colors hover:bg-white/[0.03] sm:-mx-1 sm:rounded-md sm:px-1">
      <div className="py-2.5 sm:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', iconWrap)}>
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </div>
          <span className="truncate text-[13px] font-medium text-gray-200">{label}</span>
        </div>

        <div className={cx('mt-1.5 grid grid-cols-2 gap-4', STATS_MOBILE_METRICS_INDENT)}>
          <div className={cx(STATS_VALUE_CLASS, 'text-left')}>{hours}</div>
          <div className={cx(STATS_VALUE_CLASS, 'text-left')}>{onTimePct}</div>
        </div>
      </div>

      <div
        role="row"
        className={cx(STATS_GRID, 'hidden py-2.5 sm:grid')}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cx(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:scale-[1.02]',
              iconWrap
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </div>
          <span className="truncate text-[13px] font-medium text-gray-200">{label}</span>
        </div>

        <div className={cx(STATS_VALUE_CLASS, 'text-right')}>{hours}</div>
        <div className={cx(STATS_VALUE_CLASS, 'text-right')}>{onTimePct}</div>
      </div>
    </div>
  );
}
