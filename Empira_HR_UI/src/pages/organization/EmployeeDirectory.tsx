import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import DirectoryCard from './components/DirectoryCard.jsx';
import DirectoryFiltersBar from './components/DirectoryFiltersBar';
import ProfilePreviewModal from './components/ProfilePreviewModal';

import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  getBusinessUnits,
  getDepartments,
  getEmployeeDirectoryAll,
  getSubDepartments,
  getWorkLocations,
  type BusinessUnitOption,
  type DepartmentOption,
  type SubDepartmentOption,
  type WorkLocationOption,
  type DirectoryEmployee,
  type DirectoryFilters,
} from '../../services/employeeDirectory';

function idToNameMap(xs: Array<{ id: string | number; name: string }>) {
  const m = new Map<string, string>();
  xs.forEach((x) => m.set(String(x.id), x.name));
  return m;
}

function matchesSelected(
  employeeValue: unknown,
  selectedIds: string[],
  idToName: Map<string, string>
) {
  if (!selectedIds.length) return true;
  const v = String(employeeValue ?? '').trim();
  if (!v) return false;
  // backend might return "id" or "name" - accept either to avoid bad matches
  return selectedIds.some((id) => v === id || v === (idToName.get(id) ?? ''));
}

function matchesSearch(e: DirectoryEmployee, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [
    e.display_name,
    e.job_title_primary,
    e.work_email,
    e.business_unit,
    e.department,
    e.sub_department,
    e.work_location,
  ]
    .filter(Boolean)
    .join(' · ')
    .toLowerCase();
  return hay.includes(s);
}

export default function EmployeeDirectory() {
  const [selectedFilters, setSelectedFilters] = useState<DirectoryFilters>({
    business_unit: [],
    department: [],
    sub_department: [],
    work_location: [],
    search: '',
  });

  const debouncedFilters = useDebouncedValue(selectedFilters, 420);

  const [selected, setSelected] = useState<DirectoryEmployee | null>(null);

  const buQuery = useQuery({ queryKey: ['dirOptions', 'businessUnits'], queryFn: getBusinessUnits });
  const depQuery = useQuery({ queryKey: ['dirOptions', 'departments'], queryFn: getDepartments });
  const subQuery = useQuery({ queryKey: ['dirOptions', 'subDepartments'], queryFn: getSubDepartments });
  const locQuery = useQuery({ queryKey: ['dirOptions', 'workLocations'], queryFn: getWorkLocations });

  const directoryQuery = useQuery({
    queryKey: ['employeeDirectoryAll'],
    queryFn: getEmployeeDirectoryAll,
  });

  const employees = directoryQuery.data ?? [];
  const isLoading = directoryQuery.isFetching && !directoryQuery.data;

  const buIdToName = useMemo(
    () => idToNameMap((buQuery.data ?? []) as BusinessUnitOption[]),
    [buQuery.data]
  );
  const depIdToName = useMemo(
    () => idToNameMap((depQuery.data ?? []) as DepartmentOption[]),
    [depQuery.data]
  );
  const subIdToName = useMemo(
    () => idToNameMap((subQuery.data ?? []) as SubDepartmentOption[]),
    [subQuery.data]
  );
  const locIdToName = useMemo(
    () => idToNameMap((locQuery.data ?? []) as WorkLocationOption[]),
    [locQuery.data]
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (!matchesSearch(e, debouncedFilters.search)) return false;
      if (!matchesSelected(e.business_unit, debouncedFilters.business_unit, buIdToName)) return false;
      if (!matchesSelected(e.department, debouncedFilters.department, depIdToName)) return false;
      if (!matchesSelected(e.sub_department, debouncedFilters.sub_department, subIdToName)) return false;
      if (!matchesSelected(e.work_location, debouncedFilters.work_location, locIdToName)) return false;
      return true;
    });
  }, [
    employees,
    debouncedFilters.search,
    debouncedFilters.business_unit,
    debouncedFilters.department,
    debouncedFilters.sub_department,
    debouncedFilters.work_location,
    buIdToName,
    depIdToName,
    subIdToName,
    locIdToName,
  ]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-foreground">Employee Directory</div>
      </div>

      <DirectoryFiltersBar
        businessUnits={buQuery.data ?? []}
        departments={depQuery.data ?? []}
        subDepartments={subQuery.data ?? []}
        locations={locQuery.data ?? []}
        value={selectedFilters}
        onChange={setSelectedFilters}
      />

      <div className="grid grid-cols-1 gap-4 p-4 md:p-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-muted/40" />
            ))
          : filteredEmployees.map((e) => (
              <DirectoryCard
                key={String(e.id)}
                employee={e}
                onClick={() => setSelected(e)}
              />
            ))}
      </div>

      {!isLoading && filteredEmployees.length === 0 ? (
        <div className="flex items-center justify-center p-10 text-center text-sm text-muted-foreground">
          No employees match the selected filters.
        </div>
      ) : null}

      <ProfilePreviewModal
        open={!!selected}
        employeeId={typeof (selected as any)?.id === 'number' ? ((selected as any).id as number) : null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

