import React from 'react';
import { cx } from './cx.js';

function truncateName(name, maxLen = 7) {
  if (!name) return '';
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen)}…`;
}

function AvatarBadge({ initials, firstName, bgClass }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <div
        className={cx(
          'grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold text-white sm:h-11 sm:w-11',
          bgClass
        )}
        aria-hidden
      >
        {initials}
      </div>
      <span className="w-full max-w-[4.5rem] truncate text-center text-[10px] text-gray-400" title={firstName}>
        {truncateName(firstName)}
      </span>
    </div>
  );
}

export default function EmployeeAvatarGroup({ employees }) {
  if (!employees?.length) {
    return <p className="text-xs text-gray-500">Everyone has checked in.</p>;
  }

  return (
    <div className="flex flex-wrap items-start justify-start gap-3 sm:gap-4">
      {employees.map((emp) => (
        <AvatarBadge
          key={emp.id}
          initials={emp.initials}
          firstName={emp.firstName}
          bgClass={emp.bgClass}
        />
      ))}
    </div>
  );
}
