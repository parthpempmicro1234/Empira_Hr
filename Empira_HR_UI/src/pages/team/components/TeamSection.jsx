import React from 'react';
import EmployeeCard from './EmployeeCard.jsx';
import EmptyState from './EmptyState.jsx';

export default function TeamSection({ title, employees, loading, emptyMessage, onPreview }) {
  const count = employees?.length ?? 0;

  return (
    <section aria-labelledby="team-section-heading">
      <h2 id="team-section-heading" className="text-xs font-medium text-gray-400">
        {title} {loading ? '' : `(${count})`}
      </h2>

      {loading ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex h-36 animate-pulse flex-col rounded-lg border border-white/[0.06] bg-[#1a2234] p-3.5"
            >
              <div className="flex gap-3">
                <div className="h-12 w-12 rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-white/[0.06]" />
                  <div className="h-2.5 w-32 rounded bg-white/[0.06]" />
                </div>
              </div>
              <div className="mt-auto space-y-2 pt-4">
                <div className="h-2 w-full rounded bg-white/[0.06]" />
                <div className="h-2 w-3/4 rounded bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      ) : count > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {employees.map((emp) => (
            <EmployeeCard key={emp.id} employee={emp} onPreview={onPreview} />
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState message={emptyMessage ?? 'No team members available.'} />
        </div>
      )}
    </section>
  );
}
