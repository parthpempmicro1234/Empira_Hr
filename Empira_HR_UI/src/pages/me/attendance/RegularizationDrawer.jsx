import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { createRegularizationRequest } from '../../../services/attendance.api';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function getApiErrorMessage(err) {
  const data = err?.response?.data;
  if (!data) return err?.message || 'Unable to submit regularization request';
  if (typeof data === 'string') return data;
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  if (typeof data?.blocked_reason === 'string' && data.blocked_reason.trim()) return data.blocked_reason;
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;

  // DRF field errors, e.g. { date: ["A regularization request..."] }
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    for (const k of keys) {
      const v = data[k];
      if (Array.isArray(v) && v[0]) return String(v[0]);
      if (typeof v === 'string' && v.trim()) return v;
    }
  }

  return 'Unable to submit regularization request';
}

/** Extract HH:mm from ISO for time-only inputs (date comes from fixedDate). */
function isoToTimeValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Combine fixed YYYY-MM-DD with HH:mm → ISO datetime (local timezone). */
function combineFixedDateAndTime(isoDate, timeHHmm) {
  if (!isoDate || !timeHHmm) return null;
  const [y, mo, d] = String(isoDate).slice(0, 10).split('-').map(Number);
  const [h, mi] = String(timeHHmm).split(':').map(Number);
  if (![y, mo, d, h, mi].every((n) => Number.isFinite(n))) return null;
  const dt = new Date(y, mo - 1, d, h, mi, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function formatDateLabel(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RegularizationDrawer({ openRequest, onClose }) {
  const queryClient = useQueryClient();
  const open = Boolean(openRequest);

  const fixedDate = openRequest?.date ?? '';
  const sessions = openRequest?.sessions ?? [];

  const defaultCheckInIso = openRequest?.default_check_in ?? null;
  const defaultCheckOutIso = openRequest?.default_check_out ?? null;

  const [requestType, setRequestType] = useState('both');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormError('');
    setRequestType(openRequest?.request_type ?? 'both');
    setCheckIn(isoToTimeValue(openRequest?.requested_check_in ?? defaultCheckInIso));
    setCheckOut(isoToTimeValue(openRequest?.requested_check_out ?? defaultCheckOutIso));
    setReason('');
  }, [openRequest?.key]); // only re-init per open

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const needsCheckIn = requestType === 'missed_check_in' || requestType === 'both' || requestType === 'wrong_time';
  const needsCheckOut = requestType === 'missed_check_out' || requestType === 'both' || requestType === 'wrong_time';

  const createMutation = useMutation({
    mutationFn: createRegularizationRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'regularization'] });
      onClose?.();
    },
    onError: (e) => {
      setFormError(getApiErrorMessage(e));
    },
  });

  const previewSessions = useMemo(() => {
    if (!Array.isArray(sessions)) return [];
    return sessions
      .map((s, idx) => {
        const cin = s?.check_in ?? s?.checkIn ?? null;
        const cout = s?.check_out ?? s?.checkOut ?? null;
        const cinLabel = cin ? new Date(cin).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
        const coutLabel = cout
          ? new Date(cout).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : '—';
        return { key: `${idx}`, cin, cout, cinLabel, coutLabel };
      })
      .filter(Boolean);
  }, [sessions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!fixedDate) {
      setFormError('Date is missing for this regularization request.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Please enter a reason.');
      return;
    }
    if (needsCheckIn && !checkIn) {
      setFormError('Please enter requested check-in time.');
      return;
    }
    if (needsCheckOut && !checkOut) {
      setFormError('Please enter requested check-out time.');
      return;
    }

    const requestedCheckIn = needsCheckIn ? combineFixedDateAndTime(fixedDate, checkIn) : null;
    const requestedCheckOut = needsCheckOut ? combineFixedDateAndTime(fixedDate, checkOut) : null;

    if (needsCheckIn && !requestedCheckIn) {
      setFormError('Invalid check-in time.');
      return;
    }
    if (needsCheckOut && !requestedCheckOut) {
      setFormError('Invalid check-out time.');
      return;
    }

    createMutation.mutate({
      date: fixedDate,
      request_type: requestType,
      requested_check_in: requestedCheckIn,
      requested_check_out: requestedCheckOut,
      reason: reason.trim(),
    });
  };

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[220] bg-black/50 backdrop-blur-sm"
        aria-hidden
        onClick={() => onClose?.()}
      />

      <aside
        className={cx(
          'fixed right-0 top-0 z-[230] h-screen w-[min(92vw,520px)]',
          'border-l border-[#2a3447] bg-[#0b1220] text-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Attendance regularization request"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#2a3447] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white">Regularize attendance</h2>
            <p className="mt-1 text-xs text-gray-400">
              Date: <span className="font-semibold text-gray-200">{formatDateLabel(fixedDate)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[#2a3447] bg-[#151b2b] text-gray-200 hover:bg-[#232d42]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="h-[calc(100vh-72px)] overflow-y-auto px-5 py-5">
          {previewSessions.length > 0 ? (
            <section className="rounded-xl border border-[#2a3447] bg-[#151b2b] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sessions</div>
              <div className="mt-3 space-y-2">
                {previewSessions.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between rounded-lg border border-[#2a3447] bg-[#0f172a] px-3 py-2 text-xs"
                  >
                    <div className="text-gray-300">
                      Check-in: <span className="font-semibold text-gray-100">{s.cinLabel}</span>
                    </div>
                    <div className="text-gray-300">
                      Check-out: <span className="font-semibold text-gray-100">{s.coutLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-[#2a3447] bg-[#151b2b] p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sessions</div>
              <p className="mt-2 text-sm text-gray-400">No sessions recorded for this day.</p>
            </section>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {formError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {formError}
              </div>
            ) : null}

            <section className="rounded-xl border border-[#2a3447] bg-[#151b2b] p-4">
              <div className="grid grid-cols-1 gap-3">
                <label className="space-y-1 text-xs text-gray-300">
                  <span className="font-semibold text-gray-200">Request type</span>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full rounded-lg border border-[#2a3447] bg-[#0f172a] px-3 py-2 text-sm text-gray-100 focus:border-[#5746AF] focus:outline-none focus:ring-1 focus:ring-[#5746AF]/40"
                  >
                    <option value="missed_check_in">Missed check-in</option>
                    <option value="missed_check_out">Missed check-out</option>
                    <option value="both">Both</option>
                    <option value="wrong_time">Wrong time</option>
                    <option value="wfh_mark">WFH mark</option>
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs text-gray-300">
                    <span className={cx('font-semibold', needsCheckIn ? 'text-gray-200' : 'text-gray-500')}>
                      Check-in time
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-md border border-[#2a3447] bg-[#0f172a] px-2 py-2 text-xs tabular-nums text-gray-500">
                        {fixedDate}
                      </span>
                      <input
                        type="time"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        disabled={!needsCheckIn}
                        className={cx(
                          'min-w-0 flex-1 rounded-lg border border-[#2a3447] bg-[#0f172a] px-3 py-2 text-sm text-gray-100 focus:border-[#5746AF] focus:outline-none focus:ring-1 focus:ring-[#5746AF]/40',
                          !needsCheckIn && 'cursor-not-allowed opacity-60'
                        )}
                      />
                    </div>
                  </label>
                  <label className="space-y-1 text-xs text-gray-300">
                    <span className={cx('font-semibold', needsCheckOut ? 'text-gray-200' : 'text-gray-500')}>
                      Check-out time
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-md border border-[#2a3447] bg-[#0f172a] px-2 py-2 text-xs tabular-nums text-gray-500">
                        {fixedDate}
                      </span>
                      <input
                        type="time"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        disabled={!needsCheckOut}
                        className={cx(
                          'min-w-0 flex-1 rounded-lg border border-[#2a3447] bg-[#0f172a] px-3 py-2 text-sm text-gray-100 focus:border-[#5746AF] focus:outline-none focus:ring-1 focus:ring-[#5746AF]/40',
                          !needsCheckOut && 'cursor-not-allowed opacity-60'
                        )}
                      />
                    </div>
                  </label>
                </div>
                <p className="text-[11px] text-gray-500">
                  Date is fixed to the selected log day. Only the time can be changed.
                </p>

                <label className="space-y-1 text-xs text-gray-300">
                  <span className="font-semibold text-gray-200">Reason</span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-[#2a3447] bg-[#0f172a] px-3 py-2 text-sm text-gray-100 focus:border-[#5746AF] focus:outline-none focus:ring-1 focus:ring-[#5746AF]/40"
                    placeholder="Explain what happened and why you’re requesting correction…"
                  />
                </label>
              </div>
            </section>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onClose?.()}
                className="rounded-lg border border-[#2a3447] bg-transparent px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-[#151b2b]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className={cx(
                  'inline-flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white',
                  'hover:bg-violet-500/90',
                  createMutation.isPending && 'opacity-70'
                )}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit request
              </button>
            </div>
          </form>
        </div>
      </aside>
    </>,
    document.body
  );
}

