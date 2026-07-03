import { LocateFixed, Minus, Plus } from 'lucide-react';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export default function OrgControls({
  view,
  onViewChange,
  zoom,
  onZoomChange,
  onCenter,
}: {
  view: 'Company' | 'Department' | 'Me';
  onViewChange: (v: 'Company' | 'Department' | 'Me') => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onCenter: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950/30 p-1">
          {(['Company', 'Department', 'Me'] as const).map((t) => {
            const active = t === view;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onViewChange(t)}
                className={cx(
                  'rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition',
                  active ? 'bg-slate-950 text-slate-50 shadow-sm' : 'text-slate-300 hover:text-slate-50'
                )}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.6, Math.round((zoom - 0.1) * 10) / 10))}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/35"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="min-w-[72px] text-center text-xs font-semibold text-slate-300">
            {Math.round(zoom * 100)}%
          </div>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(1.3, Math.round((zoom + 0.1) * 10) / 10))}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/35"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCenter}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/30 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-accent/35"
            aria-label="Center view"
          >
            <LocateFixed className="h-4 w-4" />
            Center
          </button>
        </div>
      </div>
    </div>
  );
}

