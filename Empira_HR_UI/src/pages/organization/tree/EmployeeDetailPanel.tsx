import { Mail, MapPin, Phone } from 'lucide-react';
import type { Employee } from '../mock';
import { byId, employees, getDeptName, getSubDeptName } from '../mock';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export default function EmployeeDetailPanel({
  employee,
  open,
  onClose,
}: {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
}) {
  const manager = byId(employees, employee?.managerId);

  return (
    <aside
      className={cx(
        'fixed right-0 top-0 z-40 h-screen w-full max-w-md border-l border-slate-800 bg-slate-950/95 backdrop-blur-xl',
        'transition-transform duration-200 ease-out',
        open ? 'translate-x-0' : 'translate-x-full'
      )}
      aria-label="Employee details"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="text-sm font-semibold text-slate-50">Employee</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/35"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {employee ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white ring-4 ring-white/10">
                  <span className="text-lg font-extrabold">{employee.initials}</span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-slate-50">
                    {employee.displayName}
                  </div>
                  <div className="mt-0.5 truncate text-sm text-slate-400">{employee.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {getDeptName(employee.departmentId)} • {getSubDeptName(employee.subDepartmentId)}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  { icon: Mail, label: 'Work email', value: employee.workEmail },
                  { icon: Phone, label: 'Phone', value: employee.phone ?? '—' },
                  { icon: MapPin, label: 'Location', value: employee.location },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3"
                  >
                    <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-slate-950/30 ring-1 ring-slate-800">
                      <row.icon className="h-4 w-4 text-slate-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {row.label}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-slate-200">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="text-sm font-semibold text-slate-100">Manager</div>
                <div className="mt-2 text-sm text-slate-400">{manager?.displayName ?? '—'}</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="text-sm font-semibold text-slate-100">Quick actions</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {['Message', 'View profile', 'Start request', 'Assign task'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      className="rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/35"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Select a node to view details.</div>
          )}
        </div>
      </div>
    </aside>
  );
}

