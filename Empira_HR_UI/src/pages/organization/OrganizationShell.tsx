import { NavLink, Outlet } from 'react-router-dom';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export default function OrganizationShell() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center border-b border-border px-5 py-3">
          <div className="flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {[
              { to: '/org/employees/directory', label: 'Employees' },
              { to: '/org/documents', label: 'Documents' },
              { to: '/org/engage', label: 'Engage' },
            ].map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cx('relative py-2 transition-colors', isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground')
                }
              >
                {({ isActive }) => (
                  <>
                    {t.label}
                    <span
                      aria-hidden="true"
                      className={cx(
                        'absolute inset-x-0 -bottom-[9px] h-0.5 transition',
                        isActive ? 'bg-accent' : 'bg-transparent'
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="px-5 py-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

