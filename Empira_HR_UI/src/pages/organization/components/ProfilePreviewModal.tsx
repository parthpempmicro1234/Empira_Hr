import { ExternalLink, Mail, MapPin, Briefcase, Building2, X } from 'lucide-react';
import Modal from '../../../components/Modal.jsx';
import { useQuery } from '@tanstack/react-query';
import { getProfilePreview, type ProfilePreviewResponse } from '../../../services/profilePreview';
import { normalizeApiError } from '../../../services/errors';
import { Link } from 'react-router-dom';

function getInitials(name: string | null | undefined) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase() || '—';
}

export default function ProfilePreviewModal({
  open,
  employeeId,
  onClose,
}: {
  open: boolean;
  employeeId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['profilePreview', employeeId],
    queryFn: () => getProfilePreview(employeeId as number),
    enabled: open && typeof employeeId === 'number' && employeeId > 0,
  });

  const nerr = isError ? normalizeApiError(error) : null;
  const p: ProfilePreviewResponse | undefined = data;
  const name = p?.display_name ?? '—';
  const initials = getInitials(p?.display_name);
  const email = p?.work_email ?? '—';
  const location = p?.location ?? '—';
  const job1 = p?.job_title_primary ?? '—';
  const job2 = p?.job_title_secondary ?? '—';
  const dept = p?.department ?? '—';
  const bu = p?.business_unit ?? '—';

  return (
    <Modal open={open} title="__HIDE_HEADER__" onClose={onClose}>
      <div className="relative z-50 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-background p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
              {p?.profile_image ? (
                <img src={p.profile_image} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-extrabold text-foreground">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-foreground">{name}</div>
              <div className="mt-0.5 truncate text-sm text-muted-foreground">{job1}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {typeof employeeId === 'number' ? (
              <Link
                to={`/profile?id=${employeeId}`}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/35"
                aria-label="Open full profile"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent/35"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-10 w-full rounded bg-muted" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-3 w-24 rounded bg-muted" />
                    <div className="mt-2 h-4 w-40 rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          ) : nerr ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {nerr.message}
            </div>
          ) : !p ? (
            <div className="text-sm text-muted-foreground">No employee selected.</div>
          ) : (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Contact Details
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 truncate text-sm text-foreground">{email}</div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                {[
                  { k: 'LOCATION', v: location, icon: MapPin },
                  { k: 'JOB TITLE', v: job1, icon: Briefcase },
                  { k: 'SECONDARY JOB TITLE', v: job2, icon: Briefcase },
                  { k: 'DEPARTMENT', v: dept, icon: Building2 },
                  { k: 'BUSINESS UNIT', v: bu, icon: Building2 },
                ].map((x) => (
                  <div key={x.k}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {x.k}
                    </div>
                    <div className="mt-1 text-sm text-foreground">{x.v || '—'}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

