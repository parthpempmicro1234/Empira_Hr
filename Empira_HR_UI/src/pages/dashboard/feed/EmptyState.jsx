import { cx } from './feedUtils.js';

export default function EmptyState({ title, description, className }) {
  return (
    <div
      className={cx(
        'rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center',
        className
      )}
    >
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
    </div>
  );
}
