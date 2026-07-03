import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  Building2,
  FileText,
  Handshake,
  Inbox,
  Landmark,
  Receipt,
  Sun,
  Timer,
  MoreHorizontal,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getWelcomeDetails, type WelcomeTeamPerson } from '../services/welcome';
import { normalizeApiError } from '../services/errors';
import ProfilePreviewModal from './organization/components/ProfilePreviewModal';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

function getInitials(fname?: string | null, lname?: string | null) {
  const a = String(fname || '').trim().slice(0, 1);
  const b = String(lname || '').trim().slice(0, 1);
  return (a + b).toUpperCase() || '—';
}

function ProfileRing({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(1, progress / 100));
  const deg = Math.round(pct * 360);
  const pctText = `${Math.round(progress)}%`;
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative grid h-16 w-16 place-items-center rounded-full bg-[conic-gradient(from_180deg,#22c55e_0deg,#22c55e_var(--deg),rgba(148,163,184,0.18)_var(--deg),rgba(148,163,184,0.18)_360deg)]"
        style={{ ['--deg' as any]: `${deg}deg` }}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-950/60">
          <div className="text-xs font-semibold text-slate-50">{pctText}</div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-50">Profile completed successfully!</div>
        <Link
          to="/profile"
          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-emerald-300 hover:text-emerald-200"
        >
          Go to My Profile <span aria-hidden="true">›</span>
        </Link>
      </div>
    </div>
  );
}

function TeamPersonRow({
  person,
  tone = 'emerald',
  onOpenProfile,
}: {
  person: WelcomeTeamPerson;
  tone?: 'emerald' | 'violet' | 'sky' | 'amber';
  onOpenProfile: (employeeId: number) => void;
}) {
  const toneMap = {
    emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25',
    violet: 'bg-violet-500/15 text-violet-200 ring-violet-400/25',
    sky: 'bg-sky-500/15 text-sky-200 ring-sky-400/25',
    amber: 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
  } as const;

  const initials = React.useMemo(() => {
    const parts = String(person.display_name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const a = parts[0]?.[0] ?? '';
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return (a + b).toUpperCase() || '—';
  }, [person.display_name]);

  const tooltip = `${person.display_name}${person.job_title_primary ? ` - ${person.job_title_primary}` : ''}`;

  return (
    <div className="group relative flex items-center gap-3">
      <div className="relative">
        <div
          className={cx(
            'grid h-9 w-9 place-items-center overflow-hidden rounded-full ring-1',
            toneMap[tone] ?? toneMap.emerald
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
            <span className="text-xs font-semibold">{initials}</span>
          )}

          {/* hover action button (three dots) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenProfile(person.id);
            }}
            className={cx(
              'absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
              'rounded-md bg-slate-800 px-1 py-0.5 text-slate-200 shadow-sm ring-1 ring-slate-700',
              'opacity-0 transition-opacity group-hover:opacity-100',
              'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-accent/40'
            )}
            aria-label={`Open profile preview for ${person.display_name}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          className={cx(
            'pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)]',
            'rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 shadow-lg',
            'border border-slate-700',
            'opacity-0 transition-opacity group-hover:opacity-100'
          )}
          role="tooltip"
        >
          {tooltip}
        </div>
      </div>
      <div className="text-sm font-semibold text-slate-100">{person.display_name}</div>
    </div>
  );
}

function ExploreCard({
  icon: Icon,
  title,
  desc,
  tone,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  tone: string;
  to?: string;
}) {
  const toneBg: Record<string, string> = {
    purple: 'bg-purple-500/15 text-purple-200 ring-purple-400/25',
    teal: 'bg-teal-500/15 text-teal-200 ring-teal-400/25',
    amber: 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
    sky: 'bg-sky-500/15 text-sky-200 ring-sky-400/25',
    rose: 'bg-rose-500/15 text-rose-200 ring-rose-400/25',
    emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25',
  };

  const className = cx(
    'group text-left rounded-lg border border-slate-700 bg-slate-800 p-4 transition',
    'hover:bg-slate-700/60'
  );

  const body = (
    <>
      <div className={cx('grid h-10 w-10 place-items-center rounded-lg ring-1', toneBg[tone] ?? toneBg.purple)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-50">{title}</div>
      <div className="mt-1 text-sm leading-5 text-slate-400">{desc}</div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className} aria-label={`Go to ${title}`}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className={className} aria-label={title}>
      {body}
    </button>
  );
}

export default function Welcome() {
  const waveBg = useMemo(
    () =>
      'bg-[radial-gradient(1200px_circle_at_0%_0%,rgba(34,197,94,0.16),transparent_55%),radial-gradient(900px_circle_at_80%_10%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(900px_circle_at_10%_80%,rgba(168,85,247,0.12),transparent_55%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))]',
    []
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['welcomeDetails'],
    queryFn: getWelcomeDetails,
  });

  const nerr = isError ? normalizeApiError(error) : null;

  const emp = data?.employeeDetails;
  const initials = getInitials(emp?.fname, emp?.lname);
  const displayName = emp?.display_name ?? '—';
  const jobTitle = emp?.job_title_primary ?? '—';
  const workLocation = emp?.work_location ?? '—';
  const progress = typeof data?.profileCompletionProgress === 'number' ? data.profileCompletionProgress : 0;

  const peers = data?.myTeamEmployees?.peers ?? undefined;
  const showMyTeam = Array.isArray(peers) && peers.length > 0;
  const manager = data?.myTeamEmployees?.reportingManager ?? null;
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);

  return (
    <div className="relative">
      {/* Dark page background */}
      <div className="absolute inset-0 -z-10 bg-slate-900" />

      {/* In-page header tabs: Dashboard / Welcome */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cx(
                'rounded-md px-4 py-2 text-sm font-semibold',
                isActive ? 'bg-slate-900 text-slate-50 shadow-sm' : 'text-slate-300 hover:text-slate-50'
              )
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/welcome"
            className={({ isActive }) =>
              cx(
                'rounded-md px-4 py-2 text-sm font-semibold',
                isActive ? 'bg-slate-900 text-slate-50 shadow-sm' : 'text-slate-300 hover:text-slate-50'
              )
            }
          >
            Welcome
          </NavLink>
        </div>
      </div>

      {/* Top Profile Banner */}
      <section className={cx('w-full overflow-hidden rounded-2xl border border-slate-800', waveBg)}>
        <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-300 text-slate-900 ring-1 ring-emerald-200/40">
              {emp?.profile_image ? (
                <img src={emp.profile_image} alt={displayName} className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="text-xl font-extrabold tracking-tight">{initials}</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className={cx('truncate text-2xl font-bold tracking-tight text-slate-50', isLoading ? 'opacity-80' : '')}>
                  {displayName}
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300/80" aria-hidden="true" />
              </div>
              <div className={cx('mt-1 text-sm font-medium text-slate-300/90', isLoading ? 'opacity-80' : '')}>
                {jobTitle}
              </div>
              <div className={cx('mt-0.5 text-sm text-slate-400', isLoading ? 'opacity-80' : '')}>
                {workLocation}
              </div>
              {nerr ? (
                <div className="mt-2 text-sm text-red-200">{nerr.message}</div>
              ) : null}
            </div>
          </div>

          {/* Keep same layout; just drive values */}
          <ProfileRing progress={progress} />
        </div>
      </section>

      {/* Middle section: 70/30 split */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,70%)_minmax(280px,30%)]">
        {/* Introduce yourself (STATIC - do not touch) */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="text-sm font-semibold text-slate-100">Introduce yourself</div>

          <div className="mt-3 divide-y divide-slate-700 rounded-lg border border-slate-700 bg-slate-900/40">
            {['About', 'What I love about my job?', 'My interests and hobbies'].map((row) => (
              <div key={row} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="text-sm font-medium text-slate-200">{row}</div>
                <button type="button" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                  Add Response
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* My team (HIDE ENTIRE CARD if peers empty/undefined) */}
        {showMyTeam ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="text-sm font-semibold text-slate-100">My team</div>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reporting Manager</div>
              <div className="mt-2">
                {manager ? (
                  <TeamPersonRow person={manager} tone="sky" onOpenProfile={(id) => setSelectedUserId(id)} />
                ) : (
                  <div className="text-sm text-slate-400">—</div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Peers</div>
              <div className="mt-2 space-y-3">
                {(peers ?? []).map((p, idx) => (
                  <TeamPersonRow
                    key={p.id}
                    person={p}
                    tone={idx % 2 === 0 ? 'violet' : 'amber'}
                    onOpenProfile={(id) => setSelectedUserId(id)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-700 pt-4">
              <Link to="/org/employees/tree" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                Go to Org Tree
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom section: Explore */}
      <div className="mt-6">
        <div className="text-base font-semibold text-slate-100">Explore EMPIRA</div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ExploreCard
            icon={Landmark}
            title="Finance"
            tone="purple"
            desc="View salary details, taxes, and finance-related actions."
            to="/finances"
          />
          <ExploreCard
            icon={Sun}
            title="Leaves"
            tone="teal"
            desc="Apply for leave, track balances, and check approvals."
            to="/me/leave"
          />
          <ExploreCard
            icon={Timer}
            title="Attendance"
            tone="sky"
            desc="Clock in/out, check logs, and manage attendance records."
            to="/me/attendance"
          />
          <ExploreCard icon={Inbox} title="Inbox" tone="amber" desc="All requests, approvals, and updates in one place." to="/inbox" />
          <ExploreCard
            icon={FileText}
            title="Documents"
            tone="emerald"
            desc="Access HR letters, policies, and essential documents."
            to="/org/documents"
          />
          <ExploreCard
            icon={Receipt}
            title="Expenses"
            tone="rose"
            desc="Submit expenses, track reimbursements, and approvals."
          />
          <ExploreCard
            icon={Handshake}
            title="Engage"
            tone="purple"
            desc="Recognize peers, celebrate milestones, and stay connected."
            to="/org/engage"
          />
          <ExploreCard
            icon={Building2}
            title="Org"
            tone="sky"
            desc="Browse org structure, roles, and reporting relationships."
            to="/org/tree"
          />
        </div>
      </div>

      <ProfilePreviewModal
        open={selectedUserId != null}
        employeeId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}

