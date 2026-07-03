import { Check } from 'lucide-react';
import { cx } from './feedUtils.js';

export default function PollOption({
  label,
  percentage,
  votesCount,
  selected,
  disabled,
  voting,
  voters = [],
  onVote,
}) {
  const pct = Math.min(100, Math.max(0, percentage || 0));
  const voterNames = voters.map((v) => v.name).filter(Boolean);

  return (
    <button
      type="button"
      disabled={disabled || voting}
      onClick={onVote}
      className={cx(
        'group relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-300',
        selected
          ? 'border-accent/60 bg-accent/10 text-slate-50 ring-1 ring-accent/25'
          : 'border-slate-700 bg-slate-900/40 text-slate-200 hover:border-slate-600 hover:bg-slate-900/70',
        disabled && !selected && 'cursor-default',
        disabled && selected && 'cursor-default'
      )}
    >
      <div
        className="absolute inset-y-0 left-0 bg-accent/20 transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
      <div className="relative space-y-1">
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 font-medium">
            {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden /> : null}
            {label}
          </span>
          <span className="shrink-0 text-xs tabular-nums text-slate-400">
            {pct.toFixed(0)}% · {votesCount} vote{votesCount === 1 ? '' : 's'}
          </span>
        </div>
        {voterNames.length > 0 ? (
          <p className="truncate text-[10px] text-slate-500">
            {voterNames.join(', ')}
          </p>
        ) : null}
      </div>
    </button>
  );
}
