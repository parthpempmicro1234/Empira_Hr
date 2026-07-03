import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Menu, Moon, Search, Sun } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider.jsx';
import { normalizeApiError } from '../services/errors';
import { getProfileHeader } from '../services/profileHeader';
import { clearSession, getStoredUser, isAuthenticated } from '../services/storage';
import logo from '../assets/logo.png';
import NotificationBell from './notifications/NotificationBell.jsx';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function useOnClickOutside(refs, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onDown = (e) => {
      const target = e.target;
      if (!target) return;
      const clickedInside = refs.some((r) => r.current && r.current.contains(target));
      if (!clickedInside) handler();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [refs, handler, enabled]);
}

function initialsFromUser(user) {
  const name =
    user?.display_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.work_email ||
    user?.email ||
    '';
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase() || '—';
}

export default function Header({
  onOpenMobileSidebar,
  headerHeight,
}) {
  const { theme, toggleTheme, accent, setAccent, accents } = useTheme();
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const authed = isAuthenticated();

  const { data: profile, isLoading: profileLoading, isError: profileError, error: profileErrObj } = useQuery({
    queryKey: ['profileHeader', 'me'],
    queryFn: () => getProfileHeader('me'),
    enabled: authed,
    staleTime: 2 * 60_000,
  });
  const profileErr = profileError ? normalizeApiError(profileErrObj) : null;

  const displayName =
    profile?.display_name ||
    storedUser?.display_name ||
    [storedUser?.first_name, storedUser?.last_name].filter(Boolean).join(' ') ||
    '—';
  const email = profile?.work_email || storedUser?.work_email || storedUser?.email || '—';
  const employeeCode = profile?.employee_code || '—';
  const jobTitle = profile?.job_title_primary || '—';
  const workLocation = profile?.work_location || '—';
  const department = profile?.department || '—';
  const initials = initialsFromUser(profile ?? storedUser);

  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useOnClickOutside([btnRef, menuRef], () => setOpen(false), open);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const el = document.getElementById('global-search');
        if (el && 'focus' in el) el.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const accentSwatches = useMemo(() => {
    const map = {
      purple: 'bg-[hsl(270_91%_65%)]',
      blue: 'bg-[hsl(217_91%_60%)]',
      red: 'bg-[hsl(0_84%_60%)]',
      green: 'bg-[hsl(142_71%_45%)]',
      orange: 'bg-[hsl(25_95%_53%)]',
    };
    return accents.map((a) => ({ accent: a, className: map[a] ?? 'bg-accent' }));
  }, [accents]);

  return (
    <header
      className={cx(
        'fixed top-0 z-30 w-full border-b border-slate-900/40',
        'bg-[linear-gradient(90deg,rgba(88,28,135,0.95),rgba(67,56,202,0.92),rgba(30,41,59,0.92))]',
        'backdrop-blur-xl'
      )}
      style={{ height: headerHeight }}
    >
      <div className="flex h-full w-full flex-row items-center justify-between gap-4 px-4 lg:px-6">
        {/* Left cluster: hamburger (mobile) + brand (desktop) */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onOpenMobileSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex items-center leading-none">
              <img src={logo} alt="EMPIRA" className="h-20 -ml-5 w-auto object-contain" />
            </div>
            <div className="h-5 w-px bg-white/15 -ml-5" aria-hidden="true" />
            <div className="max-w-[28ch] truncate  text-xs font-semibold uppercase tracking-wider text-white/70">
              EMPIRIC INFOTECH LLP
            </div>
          </div>
        </div>

        {/* Search (flexible but constrained) */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <input
            id="global-search"
            type="search"
            placeholder="Search employees or actions..."
            className={cx(
              'h-10 w-full rounded-full border border-white/10 bg-black/25 pl-10 pr-16 text-sm outline-none',
              'text-white/90 placeholder:text-white/55',
              'focus:border-white/20 focus:ring-2 focus:ring-white/15'
            )}
          />
          <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-white/70 sm:flex">
            <span>Alt</span>
            <span className="opacity-60">+</span>
            <span>K</span>
          </div>
        </div>

        {/* Right cluster: actions (never shrink) */}
        <div className="flex items-center shrink-0 gap-3">
          <NotificationBell />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              ref={btnRef}
              className={cx(
                'flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5',
                'text-sm font-medium text-white/90',
                'hover:bg-white/10',
                'focus:outline-none focus:ring-2 focus:ring-white/15'
              )}
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <div className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/25">
                {profile?.profile_image ? (
                  <img src={profile.profile_image} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-emerald-100">{initials}</span>
                )}
              </div>
              <span className="hidden max-w-[18ch] truncate sm:block">{displayName}</span>
              <ChevronDown className="h-4 w-4 text-white/70" />
            </button>

            {open && (
              <div
                ref={menuRef}
                className={cx(
                  'absolute right-0 z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border shadow-xl',
                  // Force fully opaque surface for readability
                  theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                )}
                role="menu"
              >
                <div className="p-3">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold tracking-tight">{displayName}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{email}</div>
                        {profileErr ? (
                          <div className="mt-1 text-xs text-red-200">{profileErr.message}</div>
                        ) : null}
                      </div>
                      {profileLoading ? (
                        <div className="mt-1 h-5 w-16 animate-pulse rounded bg-muted/50" aria-hidden />
                      ) : (
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {employeeCode}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate('/profile');
                      }}
                      className="mt-3 w-full rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-left text-sm font-semibold text-foreground transition hover:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent/35"
                      role="menuitem"
                    >
                      View profile
                    </button>
                  </div>
                </div>

              <div className="px-3 pb-3">
                <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Appearance
                    </div>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2 py-1 text-xs font-medium text-foreground hover:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent/35"
                      role="menuitem"
                    >
                      {theme === 'dark' ? (
                        <>
                          <Moon className="h-3.5 w-3.5" />
                          Dark
                        </>
                      ) : (
                        <>
                          <Sun className="h-3.5 w-3.5" />
                          Light
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Accent
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {accentSwatches.map((s) => (
                        <button
                          key={s.accent}
                          type="button"
                          onClick={() => setAccent(s.accent)}
                          className={cx(
                            'relative grid h-8 w-8 place-items-center rounded-xl ring-1 ring-border/60',
                            'hover:ring-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/35',
                            s.className
                          )}
                          title={s.accent}
                          role="menuitem"
                          aria-label={`Set accent to ${s.accent}`}
                        >
                          {accent === s.accent && (
                            <Check className="h-4 w-4 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60 p-2">
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-accent-soft hover:text-foreground"
                  onClick={() => {
                    clearSession();
                    window.location.href = '/login';
                  }}
                  role="menuitem"
                >
                  Sign out
                </button>
              </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

