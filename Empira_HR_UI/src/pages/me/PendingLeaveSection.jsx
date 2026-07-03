import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MoreHorizontal } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import useLeaveData from './useLeaveData';

function ConfettiIcon() {
  return (
    <svg viewBox="0 0 28 28" className="h-5 w-5" fill="none" aria-hidden>
      <path d="M6 19c2.2-4.8 4-7.5 7-10.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 21c2.7-4 5.1-6.6 10-8.7" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="8" r="1.3" fill="white" />
      <circle cx="20" cy="9" r="1.1" fill="white" />
      <circle cx="18" cy="17" r="1.1" fill="white" />
    </svg>
  );
}

function PendingSkeleton() {
  return (
    <div className="rounded-lg border border-white/5 bg-[#0F2435] p-4">
      <div className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-[#102739]" />
        <div className="h-16 w-full animate-pulse rounded-md bg-[#0C2030]" />
        <div className="h-16 w-full animate-pulse rounded-md bg-[#0C2030]" />
      </div>
    </div>
  );
}

function PendingBadge() {
  return (
    <span className="inline-flex rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#F59E0B]">
      Pending
    </span>
  );
}

export default function PendingLeaveSection({ year, onOpenDetails }) {
  const queryClient = useQueryClient();
  const { pending, isLoading, isError } = useLeaveData(year);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const rows = useMemo(() => pending, [pending]);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const onClick = (e) => {
      const insideMenu = e.target?.closest?.('[data-pending-menu="1"]');
      if (insideMenu) return;
      setOpenMenuId(null);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [openMenuId]);

  if (isLoading) {
    return <PendingSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-white/5 bg-[#0F2435] p-4">
        <p className="text-sm text-[#9FB3C8]">Unable to load leave data</p>
      </div>
    );
  }

  if (!pending.length) {
    return (
      <div className="rounded-lg border border-white/5 bg-[#0F2435] p-4 min-h-[96px]">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#8B7CF6] text-white">
            <ConfettiIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Hurray! No pending leave requests</p>
            <p className="text-xs text-[#9FB3C8]">Request leave on the right!</p>
          </div>
        </div>
      </div>
    );
  }

  async function cancelLeave(id) {
    if (!id) return;
    setCancellingId(id);
    try {
      await api.post(`leave/employeeleaves/${id}/cancel/`);
      setOpenMenuId(null);
      await queryClient.invalidateQueries({ queryKey: ['leave', 'employeeleaves'] });
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="rounded-lg border border-white/5 bg-[#0F2435] p-4">
      <div className="space-y-3">
        {rows.map((item) => (
          <div
            key={item.id}
            className="relative rounded-md border border-white/5 bg-[#0C2030] px-4 py-3 transition-colors hover:bg-[#102739]"
          >
            {/* Keep strict single-row layout; allow horizontal scroll on small screens */}
            <div className="-mx-2 overflow-x-auto px-2">
              <div className="flex min-w-[720px] items-start gap-4">
              {/* Icon */}
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1E3A5F] text-white">
                <CalendarDays className="h-5 w-5" aria-hidden />
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9FB3C8]">PAST LEAVE</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {item.dateRangeCompact ?? item.dateRange}{' '}
                  <span className="text-xs font-medium text-[#9FB3C8]">({String(item.leaveDays ?? '').toLowerCase()})</span>
                </p>
                <p className="mt-1 text-xs font-semibold text-white">{item.leaveType}</p>
                <p className="mt-2 text-xs text-[#9FB3C8]">
                  <span className="font-semibold text-[#9FB3C8]">Leave Note:</span> {item.leaveNote}
                </p>
              </div>

              {/* Requested On */}
              <div className="w-[160px] shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9FB3C8]">REQUESTED ON</p>
                <p className="mt-1 text-xs font-semibold text-white">{item.requestedOn ?? '-'}</p>
              </div>

              {/* Status */}
              <div className="w-[150px] shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9FB3C8]">STATUS</p>
                <div className="mt-1">
                  <PendingBadge />
                </div>
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-[#8B7CF6] hover:underline"
                  onClick={() => onOpenDetails?.(item)}
                >
                  View Approvers
                </button>
              </div>

              {/* Menu */}
              <div className="relative shrink-0" data-pending-menu="1">
                <button
                  type="button"
                  aria-label="Actions"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId((cur) => (cur === item.id ? null : item.id));
                  }}
                  className="grid h-9 w-9 place-items-center rounded-md bg-transparent text-[#9FB3C8] hover:text-white"
                >
                  <MoreHorizontal aria-hidden />
                </button>

                {openMenuId === item.id ? (
                  <div className="absolute right-0 top-10 z-10 w-48 overflow-hidden rounded-md border border-white/10 bg-[#0F2435] shadow-[rgba(0,0,0,0.55)_-18px_18px_36px] ring-1 ring-black/20">
                    <button
                      type="button"
                      disabled={cancellingId === item.id}
                      onClick={() => cancelLeave(item.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-white hover:bg-[#132D44] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>Cancel Leave Request</span>
                      {cancellingId === item.id ? <span className="text-[10px] text-[#9FB3C8]">…</span> : null}
                    </button>
                  </div>
                ) : null}
              </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

