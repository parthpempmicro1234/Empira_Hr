import React from 'react';

const LABELS = {
  done: 'Completed',
  pending: 'Pending',
  rejected: 'Rejected',
};

export default function StatusBadge({ status = 'pending' }) {
  const map = {
    done: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    pending: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    rejected: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
  };
  const cls = map[status] ?? map.pending;
  const label = LABELS[status] ?? status;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}
