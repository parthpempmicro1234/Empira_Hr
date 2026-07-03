import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MoreHorizontal, Search } from 'lucide-react';
import useLeaveData from './useLeaveData';

function normalizeText(v) {
  return String(v ?? '').toLowerCase().trim();
}

function matchesSearch(row, q) {
  const query = normalizeText(q);
  if (!query) return true;
  const haystack = [
    row.leaveDate,
    row.leaveDays,
    row.leaveType,
    row.leaveRequestedOn,
    row.statusLabel,
    row.statusMeta,
    row.requestedBy,
    row.actionTakenOn,
    row.leaveNote,
    row.reason,
  ]
    .map((x) => String(x ?? ''))
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function Dropdown({ labelTop, labelValue, isOpen, onToggle, onClose, options, value, onChange, minWidth }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDocMouseDown = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onClose();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex h-10 items-center justify-between gap-2 rounded-md border border-white/5 bg-[#102739] px-3 text-sm text-[#D6E4F0] transition-colors hover:bg-[#132D44] ${
          minWidth ?? ''
        }`}
        aria-expanded={isOpen}
      >
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] uppercase tracking-wide text-[#9FB3C8]">{labelTop}</span>
          <span className="max-w-[140px] truncate">{labelValue}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#9FB3C8]" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[44px] z-50 w-[220px] overflow-hidden rounded-md border border-white/10 bg-[#0C2030] shadow-lg">
          <div className="max-h-[240px] overflow-auto py-1">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-[#102739] ${
                    active ? 'bg-[#102739] text-white' : 'text-[#D6E4F0]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {active ? <span className="text-xs text-[#8B7CF6]">Selected</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusText({ status, label }) {
  const color =
    status === 'approved'
      ? 'text-[#22C55E]'
      : status === 'cancelled'
      ? 'text-[#9FB3C8]'
      :status === 'rejected'
        ? 'text-[#EF4444]'
        : status === 'pending'
          ? 'text-[#F59E0B]'
          : 'text-white';

  return <p className={`text-sm ${color}`}>{label}</p>;
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/5 bg-[#0F2435]">
      <div className="border-b border-white/5 px-4 py-3">
        <div className="h-10 w-full animate-pulse rounded-md bg-[#102739]" />
      </div>
      <div className="p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-3 h-14 animate-pulse rounded-md bg-[#102739]" />
        ))}
      </div>
    </div>
  );
}

export default function LeaveHistoryTable({ year, onOpenDetails }) {
  const { history, isLoading, isError } = useLeaveData(year);
  const [typeOpen, setTypeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [typeValue, setTypeValue] = useState('__all__');
  const [statusValue, setStatusValue] = useState('__all__');
  const [query, setQuery] = useState('');

  const typeOptions = useMemo(() => {
    const unique = Array.from(new Set(history.map((h) => String(h.leaveType ?? '')).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
    return [{ label: 'All leave types', value: '__all__' }, ...unique.map((t) => ({ label: t, value: t }))];
  }, [history]);

  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(history.map((h) => String(h.status ?? '')).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
    const labelFor = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '-');
    return [{ label: 'All statuses', value: '__all__' }, ...unique.map((s) => ({ label: labelFor(s), value: s }))];
  }, [history]);

  const filtered = useMemo(() => {
    return history.filter((row) => {
      if (typeValue !== '__all__' && String(row.leaveType) !== typeValue) return false;
      if (statusValue !== '__all__' && String(row.status) !== statusValue) return false;
      return matchesSearch(row, query);
    });
  }, [history, query, statusValue, typeValue]);

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (isError) {
    return (
      <div className="overflow-hidden rounded-lg border border-white/5 bg-[#0F2435] p-4">
        <p className="text-sm text-[#9FB3C8]">Unable to load leave data</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/5 bg-[#0F2435]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <Dropdown
            labelTop="Filter"
            labelValue={typeValue === '__all__' ? 'Leave Type' : typeValue}
            isOpen={typeOpen}
            onToggle={() => {
              setTypeOpen((v) => !v);
              setStatusOpen(false);
            }}
            onClose={() => setTypeOpen(false)}
            options={typeOptions}
            value={typeValue}
            onChange={setTypeValue}
            minWidth="min-w-[170px]"
          />

          <Dropdown
            labelTop="Filter"
            labelValue={statusValue === '__all__' ? 'Status' : statusOptions.find((o) => o.value === statusValue)?.label ?? 'Status'}
            isOpen={statusOpen}
            onToggle={() => {
              setStatusOpen((v) => !v);
              setTypeOpen(false);
            }}
            onClose={() => setStatusOpen(false)}
            options={statusOptions}
            value={statusValue}
            onChange={setStatusValue}
            minWidth="min-w-[150px]"
          />
          <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-white/5 bg-[#102739] px-3 transition-colors focus-within:border-[#36526d] focus-within:bg-[#132D44]">
            <Search className="h-4 w-4 shrink-0 text-[#9FB3C8]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-[#9FB3C8] focus:outline-none"
              placeholder="Search leave history"
            />
          </label>
        </div>
        <span className="text-xs font-medium text-[#9FB3C8]">Total: {filtered.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[17%]" />
            <col className="w-[13%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[17%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead className="bg-[#0C2030] text-left">
            <tr className="border-b border-white/5 text-xs uppercase tracking-wide text-[#9FB3C8]">
              {[
                'Leave Dates',
                'Leave Type',
                'Status',
                'Requested By',
                'Action Taken On',
                'Leave Note',
                'Reject/Cancellation Reason',
                'Actions',
              ].map((head) => (
                <th key={head} className="px-4 py-3 font-medium">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[#0F2435]">
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-white/10 transition-colors hover:bg-[#132D44]">
                <td className="px-4 py-3.5 align-top">
                  <p className="text-sm text-white">{row.leaveDate}</p>
                  <p className="mt-0.5 text-xs text-[#9FB3C8]">{row.leaveDays}</p>
                </td>
                <td className="px-4 py-3.5 align-top">
                  <p className="text-sm text-white">{row.leaveType}</p>
                  <p className="mt-0.5 text-xs text-[#9FB3C8]">{row.leaveRequestedOn}</p>
                </td>
                <td className="px-4 py-3.5 align-top">
                  <StatusText status={row.status} label={row.statusLabel} />
                  <p className="mt-0.5 text-xs text-[#9FB3C8]">{row.statusMeta}</p>
                </td>
                <td className="px-4 py-3.5 text-sm text-white">{row.requestedBy}</td>
                <td className="px-4 py-3.5 text-sm text-white">{row.actionTakenOn}</td>
                <td className="px-4 py-3.5 text-sm text-white">{row.leaveNote}</td>
                <td className="px-4 py-3.5 text-sm text-white">{row.reason}</td>
                <td className="px-4 py-3.5 text-center">
                  <button
                    type="button"
                    className="text-[#9FB3C8]"
                    onClick={() => {
                      onOpenDetails?.(row);
                    }}
                    aria-label="Open leave details"
                  >
                    <MoreHorizontal className="mx-auto h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-5 px-4 py-3 text-xs text-[#9FB3C8]">
        <span>{filtered.length ? `1 to ${filtered.length} of ${filtered.length}` : '0 to 0 of 0'}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

