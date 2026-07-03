import {
  formatDayNumber,
  formatMonthBadge,
  formatWeekdayName,
  cx,
} from './holidayUtils.js';

export default function HolidayItem({ holiday }) {
  return (
    <article
      className={cx(
        'flex items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900/50 p-3',
        'transition-colors hover:border-purple-400/30 hover:bg-slate-900/80'
      )}
    >
      <div
        className={cx(
          'flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg',
          'bg-purple-500/15 ring-1 ring-purple-400/25'
        )}
      >
        <span className="text-[10px] font-bold uppercase leading-none tracking-wider text-purple-200/90">
          {formatMonthBadge(holiday.parsed)}
        </span>
        <span className="text-lg font-bold leading-none text-slate-50">
          {formatDayNumber(holiday.parsed)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-slate-50">{holiday.name}</h3>
        <p className="mt-0.5 text-xs text-slate-400">{formatWeekdayName(holiday.parsed)}</p>
      </div>
    </article>
  );
}
