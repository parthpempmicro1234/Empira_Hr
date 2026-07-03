import React from 'react';
import { cx } from './cx.js';

export default function EmployeeAvatar({
  employee,
  size = 'md',
  className,
  showRing = false,
}) {
  const sizeClass =
    size === 'lg'
      ? 'h-12 w-12 text-sm'
      : size === 'sm'
        ? 'h-9 w-9 text-[10px]'
        : 'h-10 w-10 text-xs sm:h-11 sm:w-11';

  return (
    <div
      className={cx(
        'grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white',
        sizeClass,
        employee?.profileImage ? 'bg-gray-700' : employee?.avatarClass,
        showRing && 'ring-2 ring-white/10',
        className
      )}
      aria-hidden={!employee?.displayName}
    >
      {employee?.profileImage ? (
        <img
          src={employee.profileImage}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        employee?.initials
      )}
    </div>
  );
}
