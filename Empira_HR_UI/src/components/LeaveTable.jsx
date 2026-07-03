import React from 'react';

function formatDate(value) {
  if (value == null || value === '') return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(value);
  }
}

function formatChange(change) {
  const n = Number(change);
  if (!Number.isFinite(n)) return { text: '—', tone: 'neutral' };
  if (n > 0) return { text: `+${n}`, tone: 'pos' };
  if (n < 0) return { text: `-${Math.abs(n)}`, tone: 'neg' };
  return { text: '0', tone: 'zero' };
}

export default function LeaveTable({ rows, onViewMore }) {
  const showViewMore = typeof onViewMore === 'function';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/40 shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/80 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Transaction Date</th>
              <th className="px-4 py-3">Change</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows?.length ? (
              rows.map((row, idx) => {
                const dateRaw = row.transaction_date ?? row.date;
                const { text: changeText, tone } = formatChange(row.change);
                const key = row.id ?? row.pk ?? `${dateRaw}-${idx}`;

                return (
                  <tr
                    key={String(key)}
                    className="border-b border-slate-700/80 transition-colors last:border-0 hover:bg-slate-800/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-200">{formatDate(dateRaw)}</td>
                    <td className="px-4 py-3">
                      {tone === 'pos' ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/35">
                          {changeText}
                        </span>
                      ) : tone === 'neg' ? (
                        <span className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-red-500/35">
                          {changeText}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-600/25 px-2 py-0.5 text-xs font-semibold text-slate-300 ring-1 ring-slate-500/35">
                          {changeText}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">{row.balance ?? '—'}</td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate text-slate-300" title={row.reason != null ? String(row.reason) : ''}>
                        {row.reason != null && row.reason !== '' ? row.reason : '—'}
                      </p>
                      {showViewMore ? (
                        <button
                          type="button"
                          onClick={() => onViewMore(row)}
                          className="mt-1 text-xs font-medium text-violet-400 transition hover:text-violet-300"
                        >
                          View more
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
