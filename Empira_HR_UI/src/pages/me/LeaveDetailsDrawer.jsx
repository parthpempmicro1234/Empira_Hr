import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, MessageSquare, Send, X, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { formatDate } from './useLeaveData.js';

function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '—';
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase() || '—';
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysAgoText(endDate) {
  if (!endDate) return '';
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const deltaDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (deltaDays <= 0) return 'Leave ends today';
  if (deltaDays === 1) return 'Leave ended 1 day ago';
  return `Leave ended ${deltaDays} days ago`;
}

async function fetchLeaveDetails(id) {
  const res = await api.get(`leave/employeeleaves/${id}/`);
  return res.data;
}

export default function LeaveDetailsDrawer({ isOpen, onClose, leaveData }) {
  const [comment, setComment] = useState('');
  const wrapRef = useRef(null);

  const leaveId = leaveData?.id;
  const detailsQuery = useQuery({
    queryKey: ['leave', 'employeeleaves', leaveId, 'details'],
    queryFn: () => fetchLeaveDetails(leaveId),
    enabled: Boolean(isOpen && leaveId),
    staleTime: 15_000,
  });

  const data = detailsQuery.data && typeof detailsQuery.data === 'object' ? detailsQuery.data : null;
  const merged = data ? { ...(leaveData ?? {}), ...data } : leaveData;

  const requestedBy = merged?.requested_by_name ?? merged?.requestedBy ?? 'Self';
  const employeeName = merged?.employee_name ?? merged?.employee?.name ?? requestedBy ?? '—';
  const requestedOn = merged?.requested_on ?? merged?.requestedOnRaw ?? merged?.created_at ?? merged?.created ?? null;
  const leaveType = merged?.leave_type_name ?? merged?.leaveType ?? merged?.leave_type ?? 'Leave';
  const startDate = merged?.start_date ?? merged?.startDate ?? null;
  const endDate = merged?.end_date ?? merged?.endDate ?? merged?.start_date ?? null;
  const reason = merged?.reason ?? merged?.leaveNote ?? '-';
  const status = merged?.status ?? 'pending';
  const actionTakenBy = merged?.action_taken_by_name ?? merged?.actionTakenByName ?? merged?.action_taken_by ?? null;
  const actionTakenOn = merged?.action_taken_on ?? merged?.actionTakenOnRaw ?? merged?.updated_at ?? null;

  const dayCountLabel = useMemo(() => {
    const td = merged?.total_days ?? merged?.totalDays ?? merged?.leaveDays ?? null;
    if (td == null) return 'day(s)';
    const n = Number.parseFloat(String(td).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(n) || n <= 0) return 'day(s)';
    const v = n % 1 === 0 ? String(Math.trunc(n)) : String(n);
    return `${v} day(s)`;
  }, [merged]);

  const notifiedList = useMemo(() => {
    const raw = merged?.notified_to ?? merged?.notifiedTo ?? merged?.notify_to ?? merged?.notify ?? null;
    if (Array.isArray(raw)) return raw.map((x) => (typeof x === 'string' ? x : x?.name ?? x?.full_name ?? '')).filter(Boolean);
    return [];
  }, [merged]);

  const timeline = useMemo(() => {
    const out = [];
    const statusKey = String(status ?? '').toLowerCase();
    if (requestedOn) {
      out.push({
        kind: 'comment',
        name: requestedBy,
        ts: requestedOn,
        text: reason && reason !== '-' ? reason : 'Leave request submitted.',
      });
    }
    if (statusKey === 'approved') {
      out.push({
        kind: 'approval',
        name: actionTakenBy || 'Approver',
        ts: actionTakenOn || requestedOn,
        text: 'Approved',
      });
    }
    if (statusKey === 'rejected' || statusKey === 'declined') {
      out.push({
        kind: 'rejected',
        name: actionTakenBy || 'Approver',
        ts: actionTakenOn || requestedOn,
        text: 'Rejected',
      });
    }
    if (statusKey === 'cancelled' || statusKey === 'canceled' || statusKey === 'cancel') {
      out.push({
        kind: 'cancelled',
        name: actionTakenBy || requestedBy || 'Self',
        ts: actionTakenOn || requestedOn,
        text: 'Cancelled',
      });
    }
    return out;
  }, [actionTakenBy, actionTakenOn, reason, requestedBy, requestedOn, status]);

  useEffect(() => {
    if (!isOpen) return;
    setComment('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[120] transition-opacity duration-300 ease-out ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!isOpen}
    >
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/50" aria-label="Close details drawer" />

      <aside
        ref={wrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Leave Request Details"
        className={`absolute right-0 top-0 flex h-screen w-full max-w-[440px] flex-col border-l border-white/5 bg-[#0A1D2C] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-white/5 p-4">
          <h2 className="text-base font-semibold text-white">Leave Request Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#9FB3C8] transition-colors hover:text-white"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Header Section */}
          <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-[#0F2435] p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1E3A5F] text-sm font-semibold text-white">
              {initialsFromName(employeeName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{employeeName}</p>
              <p className="mt-0.5 text-xs text-[#9FB3C8]">
                Requested by <span className="text-white/90">{requestedBy}</span> on{' '}
                <span className="text-white/90">{formatDateTime(requestedOn)}</span>
              </p>
            </div>
          </div>

          {/* Leave Info */}
          <div className="mt-4 rounded-lg border border-white/5 bg-[#0F2435] p-4">
            <div className="flex items-start gap-3">
              <div className="grid w-[84px] shrink-0 place-items-center rounded-lg bg-[#102739] px-2 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9FB3C8]">
                  {String(new Date(startDate ?? Date.now()).toLocaleString('en-US', { month: 'short' })).toUpperCase()}
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {startDate ? String(new Date(startDate).getDate()).padStart(2, '0') : '—'}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#9FB3C8]">
                  {startDate ? String(new Date(startDate).toLocaleString('en-US', { weekday: 'short' })) : '—'}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {dayCountLabel} of {leaveType}
                </p>
                <p className="mt-1 text-xs text-[#9FB3C8]">
                  {formatDate(startDate)} - {formatDate(endDate)}
                </p>
                <p className="mt-2 text-xs text-[#9FB3C8]">{daysAgoText(endDate)}</p>
                <p className="mt-3 text-xs text-[#9FB3C8]">No teammates are on leave on this day</p>
              </div>
            </div>
          </div>

          {/* Notified */}
          <div className="mt-4 rounded-lg border border-white/5 bg-[#0F2435] p-4">
            <p className="text-xs font-semibold text-white">Notified To:</p>
            {notifiedList.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {notifiedList.map((n) => (
                  <span key={n} className="rounded-full bg-[#102739] px-3 py-1 text-xs text-[#D6E4F0]">
                    {n}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#9FB3C8]">-</p>
            )}
          </div>

          {/* Activity timeline */}
          <div className="mt-4 rounded-lg border border-white/5 bg-[#0F2435] p-4">
            <p className="text-xs font-semibold text-white">Activity</p>
            <div className="mt-3 space-y-4">
              {timeline.map((t, idx) => (
                <div key={idx} className="flex gap-3">
                  {t.kind === 'comment' ? (
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#102739] text-xs font-semibold text-white">
                      {initialsFromName(t.name)}
                    </div>
                  ) : (
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#102739] ${
                        t.kind === 'approval'
                          ? 'text-[#22C55E]'
                          : t.kind === 'rejected'
                            ? 'text-[#EF4444]'
                            : 'text-[#F59E0B]'
                      }`}
                    >
                      {t.kind === 'approval' ? (
                        <CheckCircle2 className="h-5 w-5" aria-hidden />
                      ) : (
                        <XCircle className="h-5 w-5" aria-hidden />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white">
                        {t.kind === 'approval'
                          ? `Approved by ${t.name}`
                          : t.kind === 'rejected'
                            ? `Rejected by ${t.name}`
                            : t.kind === 'cancelled'
                              ? `Cancelled by ${t.name}`
                              : t.name}
                      </p>
                      <p className="text-[11px] text-[#9FB3C8]">{formatDateTime(t.ts)}</p>
                    </div>
                    <p className="mt-1 text-xs text-[#D6E4F0]">{t.text}</p>
                  </div>
                </div>
              ))}
              {timeline.length === 0 ? <p className="text-xs text-[#9FB3C8]">No activity yet.</p> : null}
            </div>
          </div>
        </div>

        {/* Bottom comment input */}
        <footer className="border-t border-white/5 p-4">
          <div className="flex items-center gap-2 rounded-md border border-white/5 bg-[#0F2435] px-3 py-2">
            <MessageSquare className="h-4 w-4 text-[#9FB3C8]" aria-hidden />
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add comment"
              className="w-full bg-transparent text-sm text-white placeholder:text-[#9FB3C8] focus:outline-none"
            />
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-md bg-[#8B7CF6] text-white disabled:opacity-50"
              disabled={!comment.trim()}
              onClick={() => {
                // UI-only for now; backend endpoint for comments may vary.
                setComment('');
              }}
              aria-label="Send comment"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#9FB3C8]">
            Status: <span className="text-white/90">{String(status).toUpperCase()}</span>
          </p>
        </footer>
      </aside>
    </div>
  );
}

