import { useMemo } from 'react';
import { Search } from 'lucide-react';
import type { Employee } from '../mock';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export default function EmployeeSearchBox({
  query,
  onQueryChange,
  employees,
  onSelect,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  employees: Employee[];
  onSelect: (e: Employee) => void;
}) {
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return employees
      .filter((e) => e.displayName.toLowerCase().includes(q) || e.code.includes(q))
      .slice(0, 6);
  }, [employees, query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search employees..."
          className={cx(
            'h-11 w-full rounded-xl border border-slate-800 bg-slate-950/40 pl-10 pr-3 text-sm text-slate-200 outline-none',
            'placeholder:text-slate-500',
            'focus:ring-2 focus:ring-accent/35 focus:border-accent/60'
          )}
          aria-label="Search employees in org tree"
        />
      </div>

      {results.length ? (
        <div
          className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg"
          role="listbox"
          aria-label="Search results"
        >
          {results.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelect(e)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900 focus:outline-none focus:bg-slate-900"
              role="option"
            >
              <span className="truncate">{e.displayName}</span>
              <span className="text-[11px] font-semibold tracking-wider text-slate-500">#{e.code}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

