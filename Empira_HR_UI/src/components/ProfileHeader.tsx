import React, { useEffect, useMemo } from 'react';
import { Hash, Mail, MapPin, Phone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { normalizeApiError } from '../services/errors';
import { getProfileHeader } from '../services/profileHeader';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

function OrgStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className="text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

function ContactItem({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-slate-300">
      <Icon className="h-4 w-4 text-accent/70" />
      <span>{children}</span>
    </div>
  );
}

function getInitials(fname: string | null | undefined, lname: string | null | undefined) {
  const a = String(fname || '').trim().slice(0, 1);
  const b = String(lname || '').trim().slice(0, 1);
  return (a + b).toUpperCase() || '—';
}

export default function ProfileHeader({
  activeTab = 'PROFILE',
  onTabChange,
  employeeId,
  viewMode = false,
}: {
  activeTab?: string;
  onTabChange?: (t: string) => void;
  employeeId?: number | 'me';
  viewMode?: boolean;
}) {
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['profileHeader', employeeId ?? 'me'],
    queryFn: () => getProfileHeader(employeeId ?? 'me'),
  });

  const nerr = isError ? normalizeApiError(error) : null;

  const tabs = useMemo(() => {
    // View-mode: only ABOUT and TIMELINE
    if (viewMode) return ['ABOUT', 'TIMELINE'];
    return ['ABOUT', 'PROFILE', 'JOB', 'DOCUMENTS'];
  }, [viewMode]);

  useEffect(() => {
    if (!tabs.includes(activeTab)) onTabChange?.(tabs[0] ?? 'ABOUT');
  }, [activeTab, onTabChange, tabs]);

  const initials = getInitials(data?.fname, data?.lname);
  const displayName = data?.display_name ?? '—';
  const jobTitle = data?.job_title_primary ?? '—';
  const workEmail = data?.work_email ?? '—';
  const workLocation = data?.work_location ?? '—';
  const employeeCode = data?.employee_code ?? '—';
  const bu = data?.business_unit ?? '—';
  const dep = data?.department ?? '—';
  const subDep = data?.sub_department ?? '—';
  const managerName = data?.reporting_to_name ?? '—';

  return (
    <section className="w-full overflow-hidden rounded-t-2xl border border-slate-800/60 shadow-lg">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(900px circle at 10% 0%, rgba(148,163,184,0.14), transparent 55%), radial-gradient(700px circle at 90% 30%, hsl(var(--accent-soft)), transparent 60%)',
          }}
        />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-emerald-500 text-white ring-4 ring-white/10">
              {data?.profile_image ? (
                <img
                  src={data.profile_image}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="text-3xl font-extrabold tracking-tight">{initials}</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-3xl font-bold tracking-tight text-white">{displayName}</h1>
                <span className="rounded-md border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                  IN
                </span>
              </div>
              <div className="mt-1 text-sm font-medium text-slate-400">{jobTitle}</div>
              {nerr ? <div className="mt-2 text-sm text-red-200">{nerr.message}</div> : null}
            </div>
          </div>
        </div>
      </div>

      {/* Contact strip */}
      <div className="border-y border-slate-800/50 bg-slate-950/50 px-8 py-3">
        <div className="flex flex-wrap items-center gap-4 gap-x-8">
          <ContactItem icon={Mail}>{workEmail}</ContactItem>
          <ContactItem icon={Phone}>—</ContactItem>
          <ContactItem icon={MapPin}>{workLocation}</ContactItem>
          <ContactItem icon={Hash}>{employeeCode}</ContactItem>
        </div>
      </div>

      {/* Org grid */}
      <div className="bg-slate-900 px-8 py-5">
        <div className="grid gap-6 lg:grid-cols-4">
          <OrgStat label="BUSINESS UNIT" value={bu} />
          <OrgStat label="DEPARTMENT" value={dep} />
          <OrgStat label="SUB DEPARTMENT" value={subDep} />
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              REPORTING MANAGER
            </div>
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-slate-200 ring-1 ring-slate-800">
                <span className="text-[11px] font-semibold">
                  {getInitials(
                    String(managerName).split(' ')[0] ?? '',
                    String(managerName).split(' ').slice(1).join(' ') ?? ''
                  )}
                </span>
              </div>
              <div
                className={cx(
                  'text-sm font-medium text-slate-100',
                  data?.reporting_to ? 'cursor-pointer hover:text-accent' : ''
                )}
                onClick={() => {
                  if (!data?.reporting_to) return;
                  navigate(`/profile?id=${data.reporting_to}`);
                }}
                role={data?.reporting_to ? 'button' : undefined}
                tabIndex={data?.reporting_to ? 0 : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (!data?.reporting_to) return;
                    e.preventDefault();
                    navigate(`/profile?id=${data.reporting_to}`);
                  }
                }}
              >
                {managerName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-slate-800 bg-slate-900 px-8">
        <div className="flex items-center gap-8">
          {tabs.map((t) => {
            const active = t === activeTab;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onTabChange?.(t)}
                className={cx(
                  'py-4 text-xs font-semibold uppercase tracking-wider transition-colors',
                  active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                )}
                disabled={isLoading}
              >
                <span className={cx('inline-flex border-b-2 pb-4 -mb-4', active ? 'border-accent' : 'border-transparent')}>
                  {t}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

