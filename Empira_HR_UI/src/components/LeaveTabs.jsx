import React from 'react';
import { motion } from 'framer-motion';

const TABS = [
  { key: 'history', label: 'Balance History' },
  { key: 'policy', label: 'Policy' },
];

export default function LeaveTabs({ active, onChange }) {
  return (
    <div className="sticky top-0 z-10 -mx-1 flex gap-1 border-b border-slate-700/80 bg-[#0b1e2d]/95 px-1 pb-3 backdrop-blur-md">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`relative rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isActive ? (
              <motion.span
                layoutId="leave-main-tab"
                className="absolute inset-0 rounded-xl bg-slate-800 ring-1 ring-slate-600"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative z-10">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
