import React from 'react';
import {
  Building2,
  Gauge,
  Handshake,
  Inbox,
  PiggyBank,
  User,
  Users,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';

const NAV = [
  { to: '/', label: 'Home', icon: Gauge },
  { to: '/me', label: 'Me', icon: User },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/team', label: 'My Team', icon: Users },
  { to: '/finances', label: 'My Finances', icon: PiggyBank },
  { to: '/org', label: 'Org', icon: Building2 },
  { to: '/engage', label: 'Engage', icon: Handshake },
];

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
  headerHeight,
}) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cx(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={cx(
          // Use global theme tokens so dark mode is "light-dark" (card on background)
          'fixed left-0 top-0 z-50 h-screen border-r border-border bg-card/90',
          // Desktop: old compact rail
          'hidden lg:block',
          'w-[84px]',
          'transition-transform duration-200 ease-out',
          'translate-x-0'
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div
            className="flex items-center justify-center border-b border-border/70 py-4"
            style={{ height: headerHeight }}
          >
            {/* <div className="grid h-10 w-10 bg-[#102739] place-items-center rounded-xl bg-accent-soft ring-1 ring-accent/25">
              <img src={logo} alt="EMPIRA" className="h-8 w-auto object-contain" />
            </div> */}

            <button
              type="button"
              className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground lg:hidden"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
            <div className="space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/' || item.to === '/me' || item.to === '/inbox'}
                    className="block focus:outline-none"
                    title={item.label}
                  >
                    {/* Render prop gives us access to isActive for the inner elements */}
                    {({ isActive }) => (
                      <div
                        className={cx(
                          'group relative mx-2 flex cursor-pointer flex-col items-center justify-center gap-y-1 rounded-lg py-3 transition-all duration-200',
                          'hover:bg-muted/60',
                          isActive ? 'bg-accent-soft shadow-sm ring-1 ring-accent/20' : 'bg-transparent'
                        )}
                      >
                        <Icon
                          className={cx(
                            'h-5 w-5 transition-colors duration-200',
                            isActive 
                              ? 'text-accent' 
                              : 'text-muted-foreground group-hover:text-foreground'
                          )} 
                        />
                        <span 
                          className={cx(
                            'text-[10px] font-medium tracking-wide transition-colors duration-200',
                            isActive 
                              ? 'text-accent drop-shadow-sm' 
                              : 'text-muted-foreground group-hover:text-foreground'
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-border/70 py-3">
            <div className="mx-2 rounded-lg bg-muted/30 px-2 py-2 text-center text-[10px] font-medium tracking-wide text-muted-foreground">
              WS
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile/tablet drawer (separate element so desktop can remain simple) */}
      <aside
        className={cx(
          'fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-card/90',
          'transition-transform duration-200 ease-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div
            className="relative flex items-center gap-3 border-b border-border/70 px-4"
            style={{ height: headerHeight }}
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft ring-1 ring-accent/25">
              <img src={logo} alt="EMPIRA" className="h-8 w-auto object-contain" />
            </div>
            <div className="min-w-0 text-sm font-semibold tracking-tight text-foreground">
              <span className="truncate">EMPIRA HR</span>
            </div>
            <button
              type="button"
              className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3 custom-scrollbar">
            <div className="space-y-1 px-2">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/' || item.to === '/me' || item.to === '/inbox'}
                    className="block focus:outline-none"
                    title={item.label}
                    onClick={onCloseMobile}
                  >
                    {({ isActive }) => (
                      <div
                        className={cx(
                          'group flex cursor-pointer flex-row items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                          'hover:bg-muted/60',
                          isActive ? 'bg-accent-soft shadow-sm ring-1 ring-accent/20' : 'bg-transparent'
                        )}
                      >
                        <Icon
                          className={cx(
                            'h-5 w-5 shrink-0 transition-colors duration-200',
                            isActive
                              ? 'text-accent'
                              : 'text-muted-foreground group-hover:text-foreground'
                          )}
                        />
                        <span
                          className={cx(
                            'min-w-0 truncate text-sm font-medium transition-colors duration-200',
                            isActive
                              ? 'text-accent drop-shadow-sm'
                              : 'text-muted-foreground group-hover:text-foreground'
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}