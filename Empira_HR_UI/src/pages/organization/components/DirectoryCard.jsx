import { MoreHorizontal } from 'lucide-react';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase() || '—';
}

function colorForInitials(initials) {
  const key = String(initials || '').slice(0, 2).toUpperCase();
  const map = {
    AP: 'bg-emerald-500',
    CG: 'bg-amber-500',
    DS: 'bg-blue-500',
  };
  return map[key] || 'bg-slate-600';
}

export default function DirectoryCard({ employee, onClick }) {
  const name = employee?.display_name ?? '—';
  const initials = getInitials(name);
  const dept = employee?.department ?? '';
  const sub = employee?.sub_department ?? '';
  const deptPath = dept && sub ? `${dept} > ${sub}` : dept || sub || '—';

  function handleCardKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleCardKeyDown}
      className={cx(
        'relative flex cursor-pointer gap-4 rounded-lg border border-border bg-card p-4 text-left sm:p-5',
        'transition-colors hover:border-border/80 focus:outline-none focus:ring-2 focus:ring-accent/35'
      )}
      aria-label={`Open ${name} preview`}
    >
      <div
        className={cx(
          'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-white sm:h-14 sm:w-14',
          employee?.profile_image ? 'bg-muted' : colorForInitials(initials)
        )}
      >
        {employee?.profile_image ? (
          <img src={employee.profile_image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{name}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {employee?.job_title_primary ?? '—'}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          <div>
            <div className="text-[10px] text-muted-foreground">DEPARTMENT</div>
            <div className="truncate text-[11px] text-foreground">{deptPath}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground">LOCATION</div>
            <div className="truncate text-[11px] text-foreground">{employee?.work_location ?? '—'}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-[10px] text-muted-foreground">EMAIL</div>
            <div className="truncate text-[11px] text-foreground">{employee?.work_email ?? '—'}</div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="More actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}

