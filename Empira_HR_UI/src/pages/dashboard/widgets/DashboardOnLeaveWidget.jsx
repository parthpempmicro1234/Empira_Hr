import React from 'react';
import { PartyPopper } from 'lucide-react';
import { normalizeTeamEmployeeList } from '../../team/utils/teamEmployeeUtils.js';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function MiniAvatar({ employee }) {
  return employee.profileImage ? (
    <img
      src={employee.profileImage}
      alt=""
      className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-700/70"
    />
  ) : (
    <div
      className={cx(
        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ring-1 ring-slate-700/70',
        employee.avatarClass
      )}
      aria-hidden
    >
      {employee.initials}
    </div>
  );
}

export default function DashboardOnLeaveWidget({ teamQuery, onOpenProfile }) {
  const { data, isLoading, isError, refetch } = teamQuery;
  const employees = normalizeTeamEmployeeList(data?.on_leave_today);

  const subtitle = (() => {
    if (isLoading) return 'Loading…';
    if (isError) return 'Unable to load.';
    if (employees.length === 0) return 'No employees on leave today';
    if (employees.length === 1) return '1 employee on leave';
    return `${employees.length} employees on leave`;
  })();

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-950/30 ring-1 ring-slate-700/70">
          <PartyPopper className="h-5 w-5 text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-100">On Leave</div>
          <div className="mt-0.5 min-h-[2.5rem] text-sm text-slate-400">{subtitle}</div>
          {isError ? (
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-1 text-xs font-semibold text-slate-300 underline-offset-2 hover:underline"
            >
              Retry
            </button>
          ) : null}
          {!isLoading && !isError && employees.length > 0 ? (
            <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto pr-1">
              {employees.slice(0, 8).map((emp) => (
                <li key={emp.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left transition hover:bg-slate-900/50"
                    onClick={() => onOpenProfile?.(Number(emp.id))}
                    disabled={!Number.isFinite(Number(emp.id))}
                  >
                    <MiniAvatar employee={emp} />
                    <span className="truncate text-xs font-medium text-slate-200">{emp.displayName}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">On leave</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
