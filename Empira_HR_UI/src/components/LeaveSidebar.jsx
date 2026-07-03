import React from 'react';
import { motion } from 'framer-motion';

/**
 * @param {{ id: string | number, label: string }[]} items
 * @param {string | number | null} activeId
 * @param {(id: string | number) => void} onChange
 */
export default function LeaveSidebar({ items = [], activeId, onChange }) {
  if (!items.length) {
    return (
      <p className="rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-500 md:border-0 md:bg-transparent md:px-0">
        No leave types
      </p>
    );
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        {items.map((t) => {
          const isActive = activeId === t.id;
          return (
            <button
              key={String(t.id)}
              type="button"
              onClick={() => onChange(t.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white shadow-inner ring-1 ring-slate-600'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <nav className="hidden min-w-[200px] flex-col gap-1 md:flex" aria-label="Leave categories">
        {items.map((t) => {
          const isActive = activeId === t.id;
          return (
            <button
              key={String(t.id)}
              type="button"
              onClick={() => onChange(t.id)}
              className={`relative overflow-hidden rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white shadow-md ring-1 ring-slate-600'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              {isActive ? (
                <motion.span
                  layoutId="leave-sidebar-pill"
                  className="absolute inset-0 z-0 rounded-xl bg-gradient-to-br from-slate-800 via-slate-800 to-violet-950/50"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              ) : null}
              <span className="relative z-10">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
