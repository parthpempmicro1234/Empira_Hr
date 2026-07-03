import { cx } from './holidayUtils.js';

export default function HolidayCardSkeleton() {
  return (
    <div
      className={cx(
        'rounded-lg border border-slate-700 bg-purple-900/50 p-4',
        'animate-pulse'
      )}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-16 rounded bg-purple-400/20" />
          <div className="h-4 w-32 rounded bg-purple-400/25" />
          <div className="h-3 w-40 rounded bg-purple-400/15" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-purple-400/20" />
      </div>
    </div>
  );
}
