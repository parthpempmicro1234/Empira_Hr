import { Search } from 'lucide-react';
import { useMemo, useRef, useState, type ComponentType } from 'react';
import FilterDropdownBase from './FilterDropdown.jsx';
import type { FilterDropdownHelpers, FilterDropdownProps } from './FilterDropdown';

const FilterDropdown = FilterDropdownBase as ComponentType<FilterDropdownProps>;
import type {
  BusinessUnitOption,
  DepartmentOption,
  DirectoryFilters,
  SubDepartmentOption,
  WorkLocationOption,
} from '../../../services/employeeDirectory';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

export default function DirectoryFiltersBar({
  businessUnits,
  departments,
  subDepartments,
  locations,
  value,
  onChange,
}: {
  businessUnits: BusinessUnitOption[];
  departments: DepartmentOption[];
  subDepartments: SubDepartmentOption[];
  locations: WorkLocationOption[];
  value: DirectoryFilters;
  onChange: (v: DirectoryFilters) => void;
}) {
  const [expandedDeps, setExpandedDeps] = useState<Set<string>>(() => new Set());
  const autoDeptIdsRef = useRef<Set<string>>(new Set());

  const normId = (id: string | number | null | undefined) => String(id ?? '');

  const subsByDept = useMemo(() => {
    const m = new Map<string, SubDepartmentOption[]>();
    subDepartments.forEach((s) => {
      const k = normId(s.department);
      const arr = m.get(k) ?? [];
      arr.push(s);
      m.set(k, arr);
    });
    return m;
  }, [subDepartments]);

  return (
    <div className="flex items-center gap-4 border-b border-border bg-card px-4 py-2 text-sm">
      <FilterDropdown
        label="BUSINESS UNIT"
        items={businessUnits}
        selected={value.business_unit}
        onChange={(business_unit: string[]) => onChange({ ...value, business_unit })}
      />

      <FilterDropdown
        label="Department"
        items={departments}
        // Prefix ids so dept/sub ids can never collide in the dropdown badge count.
        selected={[
          ...value.department.map((d) => `dep:${d}`),
          ...value.sub_department.map((s) => `sub:${s}`),
        ]}
        onChange={() => {
          // controlled via nested list below
        }}
        renderList={({ q, icons }: FilterDropdownHelpers) => {
          const s = q.trim().toLowerCase();
          const depFiltered = (() => {
            if (!s) return departments;
            // match department name OR any sub-department name
            return departments.filter((d) => {
              const depMatch = String(d.name ?? '').toLowerCase().includes(s);
              if (depMatch) return true;
              const subs = subsByDept.get(normId(d.id)) ?? [];
              return subs.some((sd) => String(sd.name ?? '').toLowerCase().includes(s));
            });
          })();

          const deptSet = new Set(value.department);
          const subSet = new Set(value.sub_department);

          return (
            <div className="space-y-1">
              {depFiltered.map((d) => {
                const deptId = normId(d.id);
                const deptChecked = deptSet.has(deptId);
                const subs = subsByDept.get(deptId) ?? [];
                const expanded = expandedDeps.has(deptId) || (s ? subs.some((sd) => String(sd.name ?? '').toLowerCase().includes(s)) : false);

                return (
                  <div key={deptId} className="rounded px-1">
                    <div className="flex items-center gap-2 py-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDeps((prev) => {
                            const next = new Set(prev);
                            if (next.has(deptId)) next.delete(deptId);
                            else next.add(deptId);
                            return next;
                          })
                        }
                        className="grid h-6 w-6 place-items-center rounded hover:bg-muted"
                        aria-label={expanded ? 'Collapse department' : 'Expand department'}
                      >
                        <icons.ChevronRight
                          className={cx(
                            'h-4 w-4 text-muted-foreground transition-transform',
                            expanded && 'rotate-90'
                          )}
                        />
                      </button>

                      <label className="flex flex-1 cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs text-foreground hover:bg-muted">
                        <input
                          type="checkbox"
                          checked={deptChecked}
                          onChange={() => {
                            const nextDept = new Set(value.department);
                            if (nextDept.has(deptId)) nextDept.delete(deptId);
                            else nextDept.add(deptId);
                            // If the user manually changes a dept checkbox, it's no longer "auto-managed".
                            autoDeptIdsRef.current.delete(deptId);
                            onChange({ ...value, department: Array.from(nextDept) });
                          }}
                          className="h-3.5 w-3.5 rounded border-border bg-background text-accent focus:ring-accent/35"
                        />
                        <span className="min-w-0 truncate">{d.name}</span>
                      </label>
                    </div>

                    {expanded ? (
                      <div className="ml-8 space-y-1 border-l border-border/60 pb-1 pl-3">
                        {subs.map((sd) => {
                          const sid = normId(sd.id);
                          const checked = subSet.has(sid);
                          // Search term should also match sub-departments
                          if (s && !String(sd.name ?? '').toLowerCase().includes(s)) return null;
                          return (
                            <label
                              key={sid}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-foreground hover:bg-muted"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const nextSub = new Set(value.sub_department);
                                  if (nextSub.has(sid)) nextSub.delete(sid);
                                  else nextSub.add(sid);

                                  // Auto-select department ONLY when all its sub-departments are selected.
                                  const allForDeptSelected =
                                    subs.length > 0 &&
                                    subs.every((x) => nextSub.has(normId(x.id)));

                                  const nextDept = new Set(value.department);
                                  const autoDept = autoDeptIdsRef.current;

                                  if (allForDeptSelected && !nextDept.has(deptId)) {
                                    nextDept.add(deptId);
                                    autoDept.add(deptId);
                                  } else if (!allForDeptSelected && autoDept.has(deptId)) {
                                    // Only auto-deselect if we auto-selected it earlier.
                                    nextDept.delete(deptId);
                                    autoDept.delete(deptId);
                                  }

                                  onChange({
                                    ...value,
                                    sub_department: Array.from(nextSub),
                                    department: Array.from(nextDept),
                                  });
                                }}
                                className="h-3.5 w-3.5 rounded border-border bg-background text-accent focus:ring-accent/35"
                              />
                              <span className="min-w-0 truncate">{sd.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        }}
      />

      <FilterDropdown
        label="Location"
        items={locations}
        selected={value.work_location}
        onChange={(work_location: string[]) => onChange({ ...value, work_location })}
      />

      <div className="ml-auto w-[min(460px,45vw)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="Q Search..."
            className={cx(
              'h-9 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm text-foreground outline-none',
              'placeholder:text-muted-foreground focus:border-accent/60 focus:ring-2 focus:ring-accent/35'
            )}
            aria-label="Search employees"
          />
        </div>
      </div>
    </div>
  );
}

