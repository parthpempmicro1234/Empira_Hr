import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listRegularizationRequests } from '../../../services/attendance.api';
import RegularizationDrawer from './RegularizationDrawer.jsx';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatStatus(status) {
  const s = String(status ?? '').toLowerCase();
  if (s === 'approved') return 'Approved';
  if (s === 'rejected') return 'Rejected';
  return 'Pending';
}

function statusTone(status) {
  const s = String(status ?? '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  if (s === 'rejected') return 'bg-rose-500/15 text-rose-300 border-rose-500/25';
  return 'bg-amber-500/15 text-amber-200 border-amber-500/25';
}

function toLocalDateTimeInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function RegularizationPanel({ openRequest = null, onDrawerClose }) {
  const [drawerReq, setDrawerReq] = useState(null);

  const handleDrawerClose = () => {
    setDrawerReq(null);
    onDrawerClose?.();
  };

  React.useEffect(() => {
    if (!openRequest?.key) return;
    setDrawerReq(openRequest);
  }, [openRequest?.key]);

  const listQuery = useQuery({
    queryKey: ['attendance', 'regularization'],
    queryFn: listRegularizationRequests,
    staleTime: 30_000,
  });

  const items = listQuery.data ?? [];
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [items]);

  return (
    <div className="rounded-xl border border-[#2a3447] bg-[#1b2333] font-sans text-gray-100">
      <RegularizationDrawer openRequest={drawerReq} onClose={handleDrawerClose} />

      <div className="border-b border-[#2a3447] px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Attendance requests</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          To submit a correction, open <span className="font-medium text-gray-300">Attendance Log</span>, select a
          day, and click <span className="font-medium text-violet-300">Regularize</span>.
        </p>
      </div>

      <div className="divide-y divide-[#2a3447]">
        {listQuery.isLoading ? (
          <div className="px-4 py-6 text-sm text-gray-400">Loading regularization requests…</div>
        ) : listQuery.isError ? (
          <div className="px-4 py-6 text-sm text-gray-400">Unable to load regularization requests.</div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No regularization requests yet. Use Regularize on a day in Attendance Log to submit one.
          </div>
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
                Type: <span className="font-semibold text-gray-200">{r.request_type}</span>
              </div>
              {r.reason ? <div className="mt-2 text-xs text-gray-300">{r.reason}</div> : null}
              {(r.requested_check_in || r.requested_check_out) ? (
                <div className="mt-2 text-xs text-gray-400">
                  {r.requested_check_in ? (
                    <div>Check-in: {toLocalDateTimeInputValue(r.requested_check_in) || r.requested_check_in}</div>
                  ) : null}
                  {r.requested_check_out ? (
                    <div>Check-out: {toLocalDateTimeInputValue(r.requested_check_out) || r.requested_check_out}</div>
                  ) : null}
                </div>
              ) : null}
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

