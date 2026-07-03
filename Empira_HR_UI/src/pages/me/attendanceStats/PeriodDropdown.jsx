import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const PERIOD_OPTIONS = [
  { id: 'last_week', label: 'Last Week' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'custom', label: 'Custom Range' },
];

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function PeriodDropdown({ value, onChange, disabled, onCustomSelect }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = PERIOD_OPTIONS.find((o) => o.id === value) ?? PERIOD_OPTIONS[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id) => {
    onChange(id);
    setOpen(false);
    if (id === 'custom') onCustomSelect?.();
  };

  return (
    <div ref={wrapRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cx(
          'inline-flex h-7 items-center justify-between gap-1.5 rounded-md border px-2.5 text-[11px] font-medium text-gray-300 transition-all duration-200 sm:min-w-[8.5rem]',
          'hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-gray-100',
          open && 'border-white/[0.14] bg-white/[0.06] text-gray-100',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown
          className={cx('h-3 w-3 shrink-0 text-gray-500 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 origin-top overflow-hidden rounded-md border border-white/[0.08] bg-[#1a2230] py-0.5 shadow-lg shadow-black/20 animate-[dropdownIn_160ms_ease-out] sm:right-auto sm:min-w-[8.5rem]"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <li key={opt.id} role="option" aria-selected={opt.id === value}>
              <button
                type="button"
                onClick={() => pick(opt.id)}
                className={cx(
                  'flex w-full px-2.5 py-1.5 text-left text-[11px] transition-colors duration-150',
                  opt.id === value
                    ? 'bg-white/[0.08] font-medium text-gray-100'
                    : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'
                )}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
