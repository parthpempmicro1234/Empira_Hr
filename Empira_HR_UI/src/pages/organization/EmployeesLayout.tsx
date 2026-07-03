import { NavLink, Outlet } from 'react-router-dom';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export default function EmployeesLayout() {
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        <NavLink
          to="directory"
          className={({ isActive }) =>
            cx(
              'rounded-lg px-4 py-2 text-sm font-semibold transition',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            )
          }
        >
          Employee Directory
        </NavLink>
        <NavLink
          to="tree"
          className={({ isActive }) =>
            cx(
              'rounded-lg px-4 py-2 text-sm font-semibold transition',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            )
          }
        >
          Organization Tree
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
}

