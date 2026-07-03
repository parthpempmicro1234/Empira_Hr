import React from 'react';
import { cx } from './cx.js';

export default function EmptyState({ message, className }) {
  return (
    <div
      role="status"
      className={cx(
        'flex min-h-[72px] w-full items-center justify-center rounded-md border border-amber-500/35 bg-amber-500/[0.06] px-3 py-4',
        className
      )}
    >
      <p className="text-center text-xs font-medium text-amber-400/90">{message}</p>
    </div>
  );
}
