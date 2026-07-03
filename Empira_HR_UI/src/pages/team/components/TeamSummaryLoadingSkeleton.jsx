import React from 'react';
import DashboardCard from './DashboardCard.jsx';

function Shimmer({ className }) {
  return <div className={cx('animate-pulse rounded bg-white/[0.06]', className)} />;
}

function cx(...c) {
  return c.filter(Boolean).join(' ');
}

export default function TeamSummaryLoadingSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5" aria-busy="true" aria-label="Loading team summary">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
        <DashboardCard className="min-h-[140px] p-4 lg:col-span-2">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="mt-4 h-16 w-full" />
        </DashboardCard>
        <DashboardCard className="min-h-[140px] p-4 lg:col-span-3">
          <Shimmer className="h-3 w-32" />
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Shimmer className="h-10 w-10 rounded-full" />
                <Shimmer className="h-2 w-10" />
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardCard key={i} className="min-h-[108px] p-3.5 pl-4">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="mt-3 h-8 w-12" />
          </DashboardCard>
        ))}
      </div>

      <DashboardCard className="p-4">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="mt-4 h-40 w-full" />
      </DashboardCard>

      <DashboardCard className="p-4">
        <Shimmer className="h-3 w-20" />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-36 w-full" />
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
