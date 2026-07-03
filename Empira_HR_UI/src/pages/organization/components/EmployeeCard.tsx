import { MapPin } from 'lucide-react';
import type { Employee } from '../mock';
import { getDeptName, getSubDeptName } from '../mock';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export default function EmployeeCard({
  employee,
  onClick,
}: {
  employee: Employee;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'group w-full text-left rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm',
        'transition duration-300 ease-out will-change-transform',
        'hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900/90',
        'focus:outline-none focus:ring-2 focus:ring-accent/35'
      )}
      aria-label={`Open ${employee.displayName} preview`}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-emerald-500 text-white ring-4 ring-white/10">
          <span className="text-sm font-extrabold">{employee.initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-50">
            {employee.displayName}
          </div>
          <div className="mt-0.5 truncate text-sm text-slate-400">{employee.title}</div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="rounded-md border border-slate-800 bg-slate-950/20 px-2 py-1 text-[11px] text-slate-300">
              {getDeptName(employee.departmentId)}
            </span>
            <span className="text-slate-500">{getSubDeptName(employee.subDepartmentId)}</span>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              {employee.location}
            </span>
            <span className="ml-auto text-[11px] font-semibold tracking-wider text-slate-500">
              #{employee.code}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

