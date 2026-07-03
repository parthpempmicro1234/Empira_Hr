import React from 'react';
import { Mail, MoreHorizontal, Phone, User } from 'lucide-react';
import { cx } from './cx.js';
import EmployeeAvatar from './EmployeeAvatar.jsx';

export default function EmployeeCard({ employee, onPreview }) {
  const employeeId = Number(employee?.id);
  const canPreview = Number.isFinite(employeeId) && employeeId > 0;

  const openPreview = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (canPreview) onPreview?.(employeeId);
  };

  return (
    <article
      className={cx(
        'group relative flex h-full flex-col rounded-lg border border-white/[0.06] bg-[#1a2234] p-3.5 font-sans',
        'transition-all duration-200 hover:border-white/[0.1] hover:bg-[#1e2a3d]'
      )}
    >
      <button
        type="button"
        onClick={openPreview}
        disabled={!canPreview}
        className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md text-gray-500 opacity-0 transition-opacity hover:bg-white/5 hover:text-gray-300 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
        aria-label={`View ${employee.displayName} profile`}
      >
        <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <EmployeeAvatar employee={employee} size="lg" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate text-sm font-semibold text-gray-100">{employee.displayName}</h3>
          {employee.jobTitle ? (
            <p className="mt-0.5 truncate text-xs text-gray-400">{employee.jobTitle}</p>
          ) : null}
        </div>
      </div>

      <ul className="mt-3 flex flex-1 flex-col justify-end space-y-1.5 border-t border-white/[0.06] pt-3 text-[11px] text-gray-500">
        {employee.workEmail ? (
          <li className="flex min-w-0 items-center gap-2">
            <Mail className="h-3 w-3 shrink-0 text-gray-600" aria-hidden />
            <a
              href={`mailto:${employee.workEmail}`}
              className="truncate transition-colors hover:text-gray-300"
            >
              {employee.workEmail}
            </a>
          </li>
        ) : null}
        {employee.mobileNumber ? (
          <li className="flex min-w-0 items-center gap-2">
            <Phone className="h-3 w-3 shrink-0 text-gray-600" aria-hidden />
            <span className="truncate">{employee.mobileNumber}</span>
          </li>
        ) : null}
        {employee.personalEmail ? (
          <li className="flex min-w-0 items-center gap-2">
            <User className="h-3 w-3 shrink-0 text-gray-600" aria-hidden />
            <a
              href={`mailto:${employee.personalEmail}`}
              className="truncate transition-colors hover:text-gray-300"
            >
              {employee.personalEmail}
            </a>
          </li>
        ) : null}
      </ul>
    </article>
  );
}
