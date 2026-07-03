import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getReporttrees, type Reportee } from '../../services/reporttrees';

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

const CHIP_TONES = ['amber', 'teal', 'emerald', 'violet', 'sky'] as const;

function PersonChip({
  person,
  tone = 'emerald',
}: {
  person: Reportee;
  tone?: (typeof CHIP_TONES)[number];
}) {
  const toneMap: Record<string, string> = {
    emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25',
    amber: 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
    sky: 'bg-sky-500/15 text-sky-200 ring-sky-400/25',
    violet: 'bg-violet-500/15 text-violet-200 ring-violet-400/25',
    teal: 'bg-teal-500/15 text-teal-200 ring-teal-400/25',
  };
  return (
    <div className="flex items-center gap-3">
      <div className={cx('grid h-9 w-9 place-items-center overflow-hidden rounded-full ring-1', toneMap[tone] ?? toneMap.emerald)}>
        {person.profile_image ? (
          <img
            src={person.profile_image}
            alt={person.display_name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-xs font-semibold">{getInitials(person.display_name)}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-100">{person.display_name}</div>
        <div className="truncate text-xs text-slate-400">{person.job_title_primary ?? '—'}</div>
      </div>
    </div>
  );
}

function ProfileCard({
  title,
  children,
  onEdit,
  showEdit = true,
}: {
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  showEdit?: boolean;
}) {
  return (
    <section
      className={cx(
        'rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-sm',
        'transition duration-300 ease-out will-change-transform',
        'hover:-translate-y-0.5 hover:border-slate-700'
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        {showEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-accent transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-accent/35 focus:ring-offset-0"
          >
            Edit
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function AboutSummary({
  employeeId,
}: {
  employeeId?: number | null;
}) {
  const { data: reporttrees, isLoading } = useQuery({
    queryKey: ['reporttrees', employeeId ?? 'me'],
    queryFn: () => getReporttrees(typeof employeeId === 'number' ? employeeId : undefined),
  });

  const reportees = useMemo(() => {
    if (!reporttrees) return null;
    if (Array.isArray(reporttrees)) return reporttrees;
    if (reporttrees && typeof reporttrees === 'object' && 'message' in reporttrees) return [];
    return [];
  }, [reporttrees]);

  const showReportingTeam = Array.isArray(reportees) && reportees.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileCard title="About" showEdit={false}>
          <div className="space-y-5">
            {[
              { q: 'About', a: '- No response added yet -' },
              { q: 'What I love about my job?', a: '- No response added yet -' },
              { q: 'My interests and hobbies', a: '- No response added yet -' },
            ].map((row) => (
              <div key={row.q}>
                <div className="text-sm font-semibold text-slate-100">{row.q}</div>
                <div className="mt-1 text-sm text-slate-400">{row.a}</div>
              </div>
            ))}
          </div>
        </ProfileCard>

        {showReportingTeam ? (
          <ProfileCard title={`Reporting Team (${reportees.length})`} showEdit={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              {reportees.map((p, idx) => (
                <PersonChip key={p.id} person={p} tone={CHIP_TONES[idx % CHIP_TONES.length]} />
              ))}
            </div>
            {/* <button type="button" className="mt-4 text-sm font-semibold text-accent hover:brightness-110">
              View all (+{reportees.length})
            </button> */}
          </ProfileCard>
        ) : isLoading ? (
          <ProfileCard title="Reporting Team" showEdit={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-slate-800" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
                    <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-800/70" />
                  </div>
                </div>
              ))}
            </div>
          </ProfileCard>
        ) : null}
      </div>

    </div>
  );
}

