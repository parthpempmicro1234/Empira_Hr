import React, { useMemo, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import DashboardFeedSection from './dashboard/feed/DashboardFeedSection';
import ProfilePreviewModal from './organization/components/ProfilePreviewModal';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../services/dashboard';
import { getMyTeamSummary } from '../services/myteam.api';
import DashboardOnLeaveWidget from './dashboard/widgets/DashboardOnLeaveWidget.jsx';
import DashboardRemoteWidget from './dashboard/widgets/DashboardRemoteWidget.jsx';
import DashboardTimeTodayWidget from './dashboard/widgets/DashboardTimeTodayWidget.jsx';
import DashboardLeaveBalancesWidget from './dashboard/widgets/DashboardLeaveBalancesWidget.jsx';
import HolidayWidget from './dashboard/holidays/HolidayWidget.jsx';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const highlightPostId = searchParams.get('postId');
  const [selectedUserId, setSelectedUserId] = useState(null);

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  const teamSummaryQuery = useQuery({
    queryKey: ['myteam', 'summary', 'default'],
    queryFn: () => getMyTeamSummary(),
    staleTime: 60_000,
  });

  const displayName = dashboardData?.employee?.display_name || '—';

  const treeSvg = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="1200" viewBox="0 0 520 1200">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#0b1220" stop-opacity="0.0"/>
      <stop offset="0.55" stop-color="#0b1220" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#0b1220" stop-opacity="0.0"/>
    </linearGradient>
  </defs>
  <rect width="520" height="1200" fill="url(#g)"/>
  <g fill="none" stroke="#94a3b8" stroke-opacity="0.12" stroke-width="10" stroke-linecap="round">
    <path d="M330 1120 C 330 980, 310 890, 270 810 C 235 740, 220 690, 210 640" />
    <path d="M270 810 C 305 775, 345 745, 388 720" />
    <path d="M255 765 C 225 735, 190 710, 150 690" />
    <path d="M210 640 C 245 600, 295 565, 360 535" />
    <path d="M220 690 C 200 660, 175 640, 145 625" />
  </g>
  <g fill="#94a3b8" fill-opacity="0.06">
    <circle cx="388" cy="720" r="34"/>
    <circle cx="150" cy="690" r="28"/>
    <circle cx="360" cy="535" r="46"/>
    <circle cx="145" cy="625" r="30"/>
  </g>
</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, []);

  return (
    <div className="relative">
      {/* Global page styling: deep slate background + watermark */}
      <div className="absolute inset-0 -z-10 bg-slate-900" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[38%] opacity-40"
        style={{
          backgroundImage: `url("${treeSvg}")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right center',
          backgroundSize: 'cover',
        }}
      />

      {/* In-page header tabs: Dashboard / Welcome */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cx(
                'rounded-md px-4 py-2 text-sm font-semibold',
                isActive
                  ? 'bg-slate-900 text-slate-50 shadow-sm'
                  : 'text-slate-300 hover:text-slate-50'
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
                isActive
                  ? 'bg-slate-900 text-slate-50 shadow-sm'
                  : 'text-slate-300 hover:text-slate-50'
              )
            }
          >
            Welcome
          </NavLink>
        </div>
      </div>

      {/* Top Banner */}
      <section
        className={cx(
          'w-full overflow-hidden rounded-2xl border border-slate-800',
          'bg-[radial-gradient(1200px_circle_at_0%_0%,rgba(168,85,247,0.22),transparent_55%),radial-gradient(900px_circle_at_90%_20%,rgba(59,130,246,0.14),transparent_55%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))]'
        )}
      >
        <div className="flex items-center justify-between gap-6 px-6 py-6 sm:px-7">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300/80">
              Dashboard
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">
              Welcome <span className="inline-block min-w-[8ch]">{displayName}</span>!
            </h1>
            <p className="mt-1 text-sm text-slate-300/80">
              Here’s what’s happening in your organization today.
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 px-3 py-2 text-xs text-slate-300">
              Last updated: Just now
            </div>
          </div>
        </div>
      </section>

      {/* Layout: 2-column grid (30% / remaining) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(280px,30%)_1fr]">
        {/* Left column: Quick Access */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-100">Quick Access</div>
          </div>

          <HolidayWidget />

          {/* On Leave */}
          <DashboardOnLeaveWidget teamQuery={teamSummaryQuery} onOpenProfile={setSelectedUserId} />

          {/* Working Remotely */}
          <DashboardRemoteWidget teamQuery={teamSummaryQuery} onOpenProfile={setSelectedUserId} />

          {/* Time Today */}
          <DashboardTimeTodayWidget />

          {/* Leave Balances */}
          <DashboardLeaveBalancesWidget />
        </aside>

        {/* Right column: social feed + celebrations */}
        <section className="space-y-4">
          <DashboardFeedSection
            highlightPostId={highlightPostId}
            onOpenProfile={(id) => setSelectedUserId(id)}
          />
        </section>
      </div>

      <ProfilePreviewModal
        open={selectedUserId != null}
        employeeId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
}

