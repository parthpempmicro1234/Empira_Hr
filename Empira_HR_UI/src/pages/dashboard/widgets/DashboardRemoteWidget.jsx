import React from 'react';
import { LaptopMinimal } from 'lucide-react';
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

export default function DashboardRemoteWidget({ teamQuery, onOpenProfile }) {
  const { data: raw, isLoading, isError, refetch } = teamQuery;
  const listKeys = [
    raw?.remote_clock_ins_today,
    raw?.remote_employees_today,
    raw?.working_remotely_today,
  ].find((x) => Array.isArray(x));

  const employees = normalizeTeamEmployeeList(listKeys ?? []);
  const statCount = raw?.['Remote Clock-ins today'];
  const countFromStat =
    typeof statCount === 'number' && Number.isFinite(statCount)
      ? statCount
      : typeof statCount === 'string' && statCount.trim() !== ''
        ? Number(statCount)
        : null;
  const displayCount =
    employees.length > 0 ? employees.length : countFromStat != null && !Number.isNaN(countFromStat) ? countFromStat : 0;

  const subtitle = (() => {
    if (isLoading) return 'Loading…';
    if (isError) return 'Unable to load.';
    if (employees.length) {
      return displayCount === 1 ? '1 person working remotely' : `${displayCount} people working remotely`;
    }
    if (countFromStat != null && countFromStat > 0 && employees.length === 0) {
      return `${countFromStat} remote clock-in${countFromStat === 1 ? '' : 's'} today`;
    }
    return 'No remote employees today';
  })();

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-950/30 ring-1 ring-slate-700/70">
          <LaptopMinimal className="h-5 w-5 text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-100">Working Remotely</div>
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
            <ul className="mt-2 max-h-24 space-y-1.5 overflow-y-auto pr-1">
              {employees.slice(0, 6).map((emp) => (
                <li key={emp.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left transition hover:bg-slate-900/50"
                    onClick={() => onOpenProfile?.(Number(emp.id))}
                    disabled={!Number.isFinite(Number(emp.id))}
                  >
                    <MiniAvatar employee={emp} />
                    <span className="truncate text-xs font-medium text-slate-200">{emp.displayName}</span>
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
