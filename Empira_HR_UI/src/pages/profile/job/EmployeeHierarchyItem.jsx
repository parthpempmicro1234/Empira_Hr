import React, { useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function EmployeeHierarchyItem({ name, showMenu = true }) {
  const initials = useMemo(() => initialsFromName(name), [name]);
  const display = name?.trim() || '—';

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-100 ring-1 ring-slate-700/80"
        aria-hidden
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-100">{display}</div>
      </div>
      {showMenu ? (
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-slate-800/80 hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          aria-label="More options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
