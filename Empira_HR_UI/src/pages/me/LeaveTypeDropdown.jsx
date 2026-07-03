import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';

function StatusIcon({ allowed }) {
  if (allowed) {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#22C55E]" aria-hidden>
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#64748B]" aria-hidden>
      <X className="h-3 w-3 text-white" strokeWidth={2.5} />
    </span>
  );
}

export default function LeaveTypeDropdown({
  options = [],
  value,
  onChange,
  onNotAllowedAttempt,
  disabled = false,
  label = 'Select type of leave you want to apply',
  placeholder = 'Select',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const triggerLabel = selected ? selected.shortName : placeholder;

  return (
    <div className="relative w-full" ref={rootRef}>
      <p className="mb-1.5 text-xs text-[#9FB3C8]">{label}</p>
      <button
        type="button"
        disabled={disabled || options.length === 0}
        onClick={() => !disabled && options.length > 0 && setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0F2435] px-[12px] py-[10px] text-left transition-colors ${
          disabled || options.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#132D44]'
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={`min-w-0 flex-1 truncate text-sm ${selected ? 'font-medium text-[#FFFFFF]' : 'text-[#9FB3C8]'}`}
        >
          {triggerLabel}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[#9FB3C8]" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[#9FB3C8]" aria-hidden />
        )}
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-[70] mt-1.5 overflow-hidden rounded-lg border border-white/5 bg-[#0B2132] shadow-xl"
          role="listbox"
        >
          <div className="max-h-[280px] overflow-y-auto">
          {options.map((opt) => {
            const blocked = !opt.isAllowed;
            const active = !blocked && opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                aria-disabled={blocked}
                onClick={() => {
                  if (blocked) {
                    onNotAllowedAttempt?.(opt);
                    return;
                  }
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-[14px] py-3 text-left transition-colors ${
                  active ? 'cursor-pointer bg-[#1E3A5F]' : 'cursor-pointer hover:bg-[#102A3E]'
                } ${blocked ? 'opacity-[0.65]' : ''}`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3 pr-3">
                  <StatusIcon allowed={opt.isAllowed} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${blocked ? 'text-[#9FB3C8]' : 'font-medium text-[#FFFFFF]'}`}
                    >
                      {opt.shortName}
                    </p>
                    {blocked && opt.subtitle ? (
                      <p className="mt-0.5 truncate text-xs leading-snug text-[#64748B]">{opt.subtitle}</p>
                    ) : null}
                  </div>
                </div>
                {opt.daysAvailableRight ? (
                  <span className="shrink-0 text-[13px] leading-tight text-[#9FB3C8]">{opt.daysAvailableRight}</span>
                ) : null}
              </button>
            );
          })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
