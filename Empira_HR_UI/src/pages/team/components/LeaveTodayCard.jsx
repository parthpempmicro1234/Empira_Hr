import React from 'react';
import DashboardCard from './DashboardCard.jsx';
import EmptyState from './EmptyState.jsx';
import SummaryEmployeeItem from './SummaryEmployeeItem.jsx';

function SectionLabel({ children }) {
  return <h2 className="text-xs font-medium text-gray-400">{children}</h2>;
}

export default function LeaveTodayCard({ employees, loading, onPreview }) {
  return (
    <DashboardCard className="flex min-h-[140px] flex-col overflow-hidden p-4 lg:col-span-2">
      <SectionLabel>Who is off today</SectionLabel>
      <div className="mt-3 flex flex-1 flex-col justify-center overflow-hidden">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-white/[0.06]" />
                  <div className="h-2.5 w-32 rounded bg-white/[0.06]" />
                </div>
              </div>
            ))}
          </div>
        ) : employees?.length ? (
          <ul className="space-y-2.5 overflow-hidden">
            {employees.map((emp) => (
              <SummaryEmployeeItem
                key={emp.id}
                employee={emp}
                layout="list"
                onPreview={onPreview}
              />
            ))}
          </ul>
        ) : (
          <EmptyState message="No employees are on leave today." />
        )}
      </div>
    </DashboardCard>
  );
}
