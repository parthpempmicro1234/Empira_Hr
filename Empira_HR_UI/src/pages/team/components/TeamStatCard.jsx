import React from 'react';
import { cx } from './cx.js';

export default function TeamStatCard({ title, value, accentClass, linkLabel, onLinkClick, loading }) {
  return (
    <div
      className={cx(
        'group relative flex min-h-[108px] flex-col rounded-lg border border-white/[0.06] bg-[#1b2333] p-3.5 pl-4',
        'transition-colors duration-200 hover:border-white/[0.1] hover:bg-[#1e2a3d]'
      )}
      aria-busy={loading || undefined}
    >
      <span
        aria-hidden
        className={cx('absolute bottom-3 left-0 top-3 w-0.5 rounded-full', accentClass)}
      />
      <h3 className="pr-1 text-[11px] font-medium leading-snug text-gray-400">{title}</h3>
      {loading ? (
        <div className="mt-1.5 h-9 w-14 animate-pulse rounded bg-white/[0.06]" aria-hidden />
      ) : (
        <p className="mt-1.5 text-3xl font-bold tabular-nums tracking-tight text-gray-100">{value}</p>
      )}
      {linkLabel ? (
        <div className="mt-auto flex justify-end pt-2">
          <button
            type="button"
            onClick={onLinkClick}
            className="text-[11px] font-medium text-violet-400 transition-colors hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40"
          >
            {linkLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
