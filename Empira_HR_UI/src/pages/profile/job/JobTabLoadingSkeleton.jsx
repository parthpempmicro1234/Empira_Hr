import React from 'react';

function Shimmer({ className }) {
  return <div className={`animate-pulse rounded bg-slate-800/80 ${className}`} />;
}

export default function JobTabLoadingSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.42fr)] lg:gap-5" aria-busy="true" aria-label="Loading job profile">
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-5"
          >
            <Shimmer className="h-4 w-28" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j}>
                  <Shimmer className="h-2.5 w-20" />
                  <Shimmer className="mt-2 h-4 w-full max-w-[140px]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 sm:p-5">
        <Shimmer className="h-4 w-32" />
        <div className="mt-4 space-y-3">
          <Shimmer className="h-10 w-full" />
          <Shimmer className="h-10 w-full" />
          <Shimmer className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
