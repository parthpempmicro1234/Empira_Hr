import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cx } from './cx.js';
import EmployeeAvatar from './EmployeeAvatar.jsx';

function truncateName(name, maxLen = 8) {
  if (!name) return '';
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen)}…`;
}

export default function SummaryEmployeeItem({ employee, layout = 'list', onPreview }) {
  const employeeId = Number(employee?.id);
  const canPreview = Number.isFinite(employeeId) && employeeId > 0;

  const openPreview = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (canPreview) onPreview?.(employeeId);
  };

  const menuButton = (
    <button
      type="button"
      onClick={openPreview}
      disabled={!canPreview}
      className={cx(
        'grid place-items-center rounded-md text-gray-500 transition-all',
        'hover:bg-white/10 hover:text-gray-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40',
        'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        layout === 'chip' ? 'absolute right-0 top-0 z-10 h-6 w-6' : 'z-10 h-7 w-7 shrink-0'
      )}
      aria-label={`View ${employee.displayName} profile`}
    >
      <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  );

  if (layout === 'chip') {
    return (
      <div className="group relative flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 pt-1">
        {menuButton}
        <button
          type="button"
          onClick={openPreview}
          disabled={!canPreview}
          className={cx(
            'flex w-full flex-col items-center gap-1.5 rounded-md border-0 bg-transparent p-0',
            'transition-colors hover:bg-white/[0.04]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40',
            canPreview && 'cursor-pointer'
          )}
          aria-label={`View ${employee.displayName} profile`}
        >
          <EmployeeAvatar employee={employee} size="md" />
          <span className="w-full truncate text-center text-[10px] text-gray-400">
            {truncateName(employee.displayName)}
          </span>
        </button>
      </div>
    );
  }

  return (
    <li className="group flex min-w-0 items-center gap-2 pr-1">
      <button
        type="button"
        onClick={openPreview}
        disabled={!canPreview}
        className={cx(
          'shrink-0 rounded-md border-0 bg-transparent p-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40',
          canPreview && 'cursor-pointer'
        )}
        aria-label={`View ${employee.displayName} profile`}
      >
        <EmployeeAvatar employee={employee} size="md" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-100">{employee.displayName}</p>
        {employee.jobTitle ? (
          <p className="truncate text-xs text-gray-500">{employee.jobTitle}</p>
        ) : null}
      </div>
      {menuButton}
    </li>
  );
}
