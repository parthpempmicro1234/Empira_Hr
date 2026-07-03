import React from 'react';
import { cx } from './cx.js';

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'peers', label: 'Peers' },
];

export default function SummaryTabs({ activeId, onChange, disabled }) {
  return (
    <nav className="mb-4 flex gap-6 border-b border-white/[0.06]" aria-label="Team summary views">
      {TABS.map((tab) => {
        const active = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tab.id)}
            className={cx(
              'relative -mb-px pb-2.5 pt-1 text-xs font-semibold uppercase tracking-wide transition-colors duration-200',
              active ? 'text-gray-100' : 'text-gray-500 hover:text-gray-300',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
            <span
              aria-hidden
              className={cx(
                'absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-violet-500 transition-opacity duration-200',
                active ? 'opacity-100' : 'opacity-0'
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}
