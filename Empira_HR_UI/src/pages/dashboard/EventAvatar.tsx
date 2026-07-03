import { MoreHorizontal } from 'lucide-react';
import * as React from 'react';

export type EventAvatarKind = 'birthday' | 'anniversary' | 'new-joiner';

export type EventAvatarPerson = {
  id: number;
  display_name: string;
  profile_image: string | null;
  date_of_birth: string | null;
  date_of_joining: string | null;
};

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

function getInitials(name: string) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase() || '—';
}

const COLOR_CLASSES = [
  'bg-emerald-500/25 ring-emerald-400/25 text-emerald-100',
  'bg-amber-500/25 ring-amber-400/25 text-amber-100',
  'bg-sky-500/25 ring-sky-400/25 text-sky-100',
  'bg-violet-500/25 ring-violet-400/25 text-violet-100',
  'bg-rose-500/25 ring-rose-400/25 text-rose-100',
  'bg-teal-500/25 ring-teal-400/25 text-teal-100',
];

function hashToIndex(v: string, mod: number) {
  let h = 0;
  for (let i = 0; i < v.length; i += 1) h = (h * 31 + v.charCodeAt(i)) >>> 0;
  return mod ? h % mod : 0;
}

function formatDayMonth(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(d);
}

function anniversaryYears(dateOfJoining: string | null) {
  if (!dateOfJoining) return null;
  const year = Number(dateOfJoining.slice(0, 4));
  if (!Number.isFinite(year) || year <= 0) return null;
  return new Date().getFullYear() - year;
}

export default function EventAvatar({
  person,
  kind,
  onOpenProfile,
}: {
  person: EventAvatarPerson;
  kind: EventAvatarKind;
  onOpenProfile: (employeeId: number) => void;
}) {
  const initials = React.useMemo(() => getInitials(person.display_name), [person.display_name]);
  const colorClass = React.useMemo(
    () => COLOR_CLASSES[hashToIndex(person.display_name || String(person.id), COLOR_CLASSES.length)]!,
    [person.display_name, person.id]
  );

  const date =
    kind === 'birthday'
      ? person.date_of_birth
      : kind === 'anniversary' || kind === 'new-joiner'
        ? person.date_of_joining
        : null;

  const tooltipText = React.useMemo(() => {
    const formatted = formatDayMonth(date);
    if (kind === 'anniversary') {
      const yrs = anniversaryYears(person.date_of_joining);
      const yrsText = typeof yrs === 'number' ? `${Math.max(0, yrs)} yrs` : '— yrs';
      return `${person.display_name} is completing ${yrsText} on ${formatted}`;
    }
    if (kind === 'birthday') return `${person.display_name} has a birthday on ${formatted}`;
    return `${person.display_name} joined on ${formatted}`;
  }, [kind, person.display_name, person.date_of_joining, date]);

  return (
    <div className="group relative flex w-16 flex-col items-center">
      <div className="relative">
        {/* tooltip */}
        <div
          className={cx(
            'pointer-events-none absolute -top-2 left-1/2 z-50 hidden -translate-x-1/2 -translate-y-full',
            'whitespace-nowrap rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 shadow-lg',
            'group-hover:block'
          )}
          role="tooltip"
        >
          {tooltipText}
        </div>

        {/* avatar */}
        <div
          className={cx(
            'relative grid h-12 w-12 place-items-center overflow-hidden rounded-full ring-1',
            person.profile_image ? 'bg-slate-800 ring-slate-700/70' : colorClass
          )}
        >
          {person.profile_image ? (
            <img
              src={person.profile_image}
              alt={person.display_name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-sm font-extrabold">{initials}</span>
          )}

          {/* action button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenProfile(person.id);
            }}
            className={cx(
              'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
              'rounded-md bg-slate-800/90 px-1 py-0.5 text-slate-200 shadow-sm ring-1 ring-slate-700',
              'opacity-0 transition-opacity group-hover:opacity-100',
              'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent/40'
            )}
            aria-label={`Open profile preview for ${person.display_name}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 w-16 truncate text-center text-[11px] font-medium text-slate-200">
        {person.display_name}
      </div>
      <div className="mt-0.5 text-center text-[11px] text-slate-500">{formatDayMonth(date)}</div>
    </div>
  );
}

