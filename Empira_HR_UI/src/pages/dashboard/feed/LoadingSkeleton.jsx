import { cx } from './feedUtils.js';

function Shimmer({ className }) {
  return (
    <div
      className={cx('animate-pulse rounded bg-slate-700/50', className)}
      aria-hidden="true"
    />
  );
}

export function FeedPostSkeleton() {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-start gap-3">
        <Shimmer className="h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-3 w-20" />
          <Shimmer className="mt-3 h-16 w-full" />
          <div className="flex gap-4 pt-2">
            <Shimmer className="h-3 w-12" />
            <Shimmer className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeedListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </div>
  );
}
