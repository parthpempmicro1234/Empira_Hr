import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { api } from '../../../services/api';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

async function fetchLeaveBalances(year) {
  const params = year ? { year } : undefined;
  const res = await api.get('leave/leave-balances/', params ? { params } : undefined);
  return res.data;
}

function parseNum(v) {
  const n = Number.parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function formatBalanceNumber(n) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(2).replace(/\.?0+$/, '');
}

function getLeaveName(item) {
  return String(item?.leave_type?.name ?? item?.leave_type_name ?? item?.leave_type ?? '').toLowerCase();
}

/** Ring fill by proportion; center shows remaining balance (days), not a percentage. */
function ProgressRing({ label, fraction, centerNumber }) {
  const pct = Math.max(0, Math.min(1, fraction));
  const deg = Math.round(pct * 360);
  const center =
    centerNumber === null || centerNumber === undefined || Number.isNaN(centerNumber)
      ? '—'
      : formatBalanceNumber(centerNumber);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cx(
          'relative grid h-20 w-20 place-items-center rounded-full',
          'bg-[conic-gradient(from_180deg,hsl(173_80%_40%)_0deg,hsl(173_80%_40%)_var(--deg),rgba(148,163,184,0.18)_var(--deg),rgba(148,163,184,0.18)_360deg)]'
        )}
        style={{ ['--deg']: `${deg}deg` }}
      >
        <div className="grid h-[64px] w-[64px] place-items-center rounded-full bg-slate-900">
          <div className="text-xs font-semibold text-center tabular-nums text-slate-100">{center} <p className='text-[10px] text-slate-400'>available</p></div>
        </div>
      </div>
      <div className="text-center text-xs font-medium text-slate-200">{label}</div>
    </div>
  );
}

function remainingFraction(item) {
  if (!item) return 0;
  const remaining = parseNum(item.remaining);
  const annual = parseNum(item.total_allocated);
  const used = parseNum(item.used);
  if (annual > 0) return Math.max(0, Math.min(1, remaining / annual));
  const total = remaining + used;
  if (total > 0) return Math.max(0, Math.min(1, remaining / total));
  return 0;
}

function pickLeave(sorted, test) {
  return sorted.find((item) => test(getLeaveName(item))) ?? null;
}

export default function DashboardLeaveBalancesWidget() {
  const year = new Date().getFullYear();
  const query = useQuery({
    queryKey: ['leave', 'leave-balances', year],
    queryFn: () => fetchLeaveBalances(year),
    staleTime: 60_000,
  });

  const sorted = useMemo(() => {
    const items = Array.isArray(query.data) ? query.data : [];
    const getName = (item) => item?.leave_type?.name ?? item?.leave_type_name ?? item?.leave_type ?? '';
    const rank = (name) => {
      const key = String(name ?? '')
        .toLowerCase()
        .replace(/\s*leave\s*$/i, '')
        .trim();
      if (key.includes('paid') && !key.includes('unpaid')) return 1;
      if (key.includes('sick')) return 2;
      if (key.includes('unpaid')) return 3;
      return 99;
    };
    return [...items].sort((a, b) => {
      const ra = rank(getName(a));
      const rb = rank(getName(b));
      if (ra !== rb) return ra - rb;
      return String(getName(a)).localeCompare(String(getName(b)));
    });
  }, [query.data]);

  const rings = useMemo(() => {
    const unpaid = pickLeave(sorted, (n) => n.includes('unpaid'));
    const sick = pickLeave(sorted, (n) => n.includes('sick'));
    const paid = pickLeave(sorted, (n) => n.includes('paid') && !n.includes('unpaid'));
    return [
      { label: 'Unpaid', item: unpaid },
      { label: 'Sick', item: sick },
      { label: 'Paid', item: paid },
    ].map(({ label, item }) => ({
      label,
      fraction: remainingFraction(item),
      centerNumber: item ? parseNum(item.remaining) : null,
    }));
  }, [sorted]);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-100">Leave Balances</div>
          <div className="mt-0.5 text-sm text-slate-400">Overview of your leave types</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950/30 ring-1 ring-slate-700/70">
          <Sparkles className="h-4 w-4 text-slate-300" />
        </div>
      </div>

      {query.isError ? (
        <div className="mt-4 text-sm text-slate-400">
          Unable to load balances.{' '}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="font-semibold text-slate-200 underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : query.isLoading ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="h-20 w-20 animate-pulse rounded-full bg-slate-700/60" />
              <div className="h-3 w-12 animate-pulse rounded bg-slate-700/60" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {rings.map((r) => (
            <ProgressRing
              key={r.label}
              label={r.label}
              fraction={r.fraction}
              centerNumber={r.centerNumber}
            />
          ))}
        </div>
      )}
    </div>
  );
}
