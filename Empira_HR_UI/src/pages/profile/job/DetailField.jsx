import React from 'react';

export default function DetailField({ label, value, className = '' }) {
  return (
    <div className={className}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium leading-snug text-slate-100">{value}</div>
    </div>
  );
}
