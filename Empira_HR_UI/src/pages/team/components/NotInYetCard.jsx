import React from 'react';
import DashboardCard from './DashboardCard.jsx';
import EmptyState from './EmptyState.jsx';
import SummaryEmployeeItem from './SummaryEmployeeItem.jsx';

function SectionLabel({ children }) {
  return <h2 className="text-xs font-medium text-gray-400">{children}</h2>;
}

export default function NotInYetCard({ employees, loading, onPreview }) {
  return (
    <DashboardCard className="flex min-h-[140px] flex-col overflow-hidden p-4 lg:col-span-3">
      <SectionLabel>Not in yet today</SectionLabel>
      <div className="mt-3 flex flex-1 items-center overflow-hidden">
        {loading ? (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
                <div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.06]" />
                <div className="h-2 w-10 animate-pulse rounded bg-white/[0.06]" />
              </div>
            ))}
          </div>
        ) : employees?.length ? (
          <div className="flex w-full flex-wrap items-start gap-3 overflow-hidden">
            {employees.map((emp) => (
              <SummaryEmployeeItem
                key={emp.id}
                employee={emp}
                layout="chip"
                onPreview={onPreview}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No pending check-ins." className="min-h-[72px] border-teal-500/25 bg-teal-500/[0.06] text-teal-300/90" />
        )}
      </div>
    </DashboardCard>
  );
}
