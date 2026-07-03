import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import {
  createOvertimeRequest,
  listOvertimeRequests,
} from '../../../services/attendance.api';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatStatus(status) {
  const s = String(status ?? '').toLowerCase();
  if (s === 'approved') return 'Approved';
  if (s === 'rejected') return 'Rejected';
  return 'Waiting for approval';
}

function statusTone(status) {
  const s = String(status ?? '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'rejected') return 'bg-rose-500/15 text-rose-300 border-rose-500/25';
  return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
}

export default function OvertimeRequestsPanel({ policy }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [minutes, setMinutes] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  const listQuery = useQuery({
    queryKey: ['attendance', 'ot-requests'],
    queryFn: listOvertimeRequests,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createOvertimeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'ot-requests'] });
      setOpen(false);
      setDate('');
      setMinutes('');
      setReason('');
      setFormError('');
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message ||
        'Unable to submit overtime request';
      setFormError(String(msg));
    },
  });

  const items = listQuery.data ?? [];
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [items]);

  const canRequestOt = Boolean(policy?.ot_enabled);
  const otNeedsApproval = Boolean(policy?.ot_requires_approval);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!canRequestOt) {
      setFormError('Overtime is not enabled for your attendance policy.');
      return;
    }
    if (!date) {
      setFormError('Please select a date.');
      return;
    }
    const requested_minutes = Number(minutes);
    if (!Number.isFinite(requested_minutes) || requested_minutes <= 0) {
      setFormError('Please enter valid requested minutes.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Please enter a reason.');
      return;
    }
    createMutation.mutate({ date, requested_minutes, reason: reason.trim() });
  };

  return (
    <div className="rounded-xl border border-[#2a3447] bg-[#1b2333] font-sans text-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a3447] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Overtime requests</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            {otNeedsApproval ? 'OT will apply after approval.' : 'OT will apply automatically if eligible.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cx(
            'inline-flex items-center gap-2 rounded-lg bg-[#2dd4bf] px-3 py-2 text-xs font-semibold text-black',
            'hover:opacity-90'
          )}
        >
          <Plus className="h-4 w-4" />
          Request overtime
        </button>
      </div>

      {open ? (
        <form onSubmit={handleSubmit} className="space-y-3 border-b border-[#2a3447] px-4 py-4">
          {formError ? (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {formError}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-gray-300">
              <span className="font-semibold text-gray-200">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-[#2a3447] bg-[#151b2b] px-3 py-2 text-sm text-gray-100 focus:border-[#5746AF] focus:outline-none focus:ring-1 focus:ring-[#5746AF]/40"
              />
            </label>
            <label className="space-y-1 text-xs text-gray-300">
              <span className="font-semibold text-gray-200">Requested minutes</span>
              <input
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="e.g. 120"
                className="w-full rounded-lg border border-[#2a3447] bg-[#151b2b] px-3 py-2 text-sm text-gray-100 focus:border-[#5746AF] focus:outline-none focus:ring-1 focus:ring-[#5746AF]/40"
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className={cx(
                  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2dd4bf] px-3 py-2 text-xs font-semibold text-black',
                  createMutation.isPending && 'opacity-70'
                )}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit
              </button>
            </div>
          </div>
          <label className="block space-y-1 text-xs text-gray-300">
            <span className="font-semibold text-gray-200">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-[#2a3447] bg-[#151b2b] px-3 py-2 text-sm text-gray-100 focus:border-[#5746AF] focus:outline-none focus:ring-1 focus:ring-[#5746AF]/40"
            />
          </label>
          <p className="text-[11px] text-gray-500">
            Note: employee approval actions are not available from employee UI.
          </p>
        </form>
      ) : null}

      <div className="divide-y divide-[#2a3447]">
        {listQuery.isLoading ? (
          <div className="px-4 py-6 text-sm text-gray-400">Loading overtime requests…</div>
        ) : listQuery.isError ? (
          <div className="px-4 py-6 text-sm text-gray-400">Unable to load overtime requests.</div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No overtime requests yet.</div>
        ) : (
          sorted.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-100">{r.date}</div>
                <span
                  className={cx(
                    'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                    statusTone(r.status)
                  )}
                >
                  {formatStatus(r.status)}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Requested: <span className="font-semibold text-gray-200">{r.requested_minutes} min</span>
                {r.status === 'approved' && r.approved_minutes != null ? (
                  <>
                    {' '}
                    · Approved:{' '}
                    <span className="font-semibold text-gray-200">{r.approved_minutes} min</span>
                  </>
                ) : null}
              </div>
              {r.reason ? <div className="mt-2 text-xs text-gray-300">{r.reason}</div> : null}
              {r.status === 'rejected' && r.rejection_reason ? (
                <div className="mt-2 text-xs text-rose-200">Rejected: {r.rejection_reason}</div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

