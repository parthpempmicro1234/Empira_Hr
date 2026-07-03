import React from 'react';

export default function AvatarBadge({ initials, className = '', size = 'md' }) {
  const text = String(initials ?? '?').slice(0, 2).toUpperCase();
  const sizeCls =
    size === 'sm'
      ? 'h-8 w-8 text-[10px]'
      : size === 'lg'
        ? 'h-14 w-14 text-lg'
        : 'h-10 w-10 text-xs';

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/90 to-blue-600/90 font-semibold text-white shadow-inner ${sizeCls} ${className}`}
      aria-hidden
    >
      {text}
    </div>
  );
}
