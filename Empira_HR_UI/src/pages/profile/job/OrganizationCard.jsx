import React, { useMemo } from 'react';
import JobProfileCard from './JobProfileCard.jsx';
import DetailField from './DetailField.jsx';
import EmployeeHierarchyItem from './EmployeeHierarchyItem.jsx';
import { NOT_SET, departmentLine, displayValue } from './jobProfileFormat.js';

export default function OrganizationCard({ data }) {
  const dept = useMemo(
    () => departmentLine(data?.department, data?.sub_department),
    [data?.department, data?.sub_department]
  );

  const reportsToName = data?.reporting_to_name?.trim() || '';
  const mom = data?.manager_of_manager;
  const momName = mom?.name?.trim() || '';
  const directReports = Array.isArray(data?.peers) ? data.peers : [];
  const directReportCount = directReports.length;

  return (
    <JobProfileCard title="Organization">
      <div className="space-y-4">
        <DetailField label="Business Unit" value={displayValue(data?.business_unit)} />
        <DetailField label="Department" value={dept} />
        <DetailField label="Location" value={displayValue(data?.work_location)} />
        <DetailField label="Legal Entity" value={displayValue(data?.legal_entity)} />

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reports To</div>
          <div className="mt-2">
            {reportsToName ? (
              <EmployeeHierarchyItem name={reportsToName} showMenu />
            ) : (
              <div className="text-sm font-medium text-slate-100">{NOT_SET}</div>
            )}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Manager Of Manager
          </div>
          <div className="mt-2">
            {momName ? (
              <EmployeeHierarchyItem name={momName} showMenu />
            ) : (
              <div className="text-sm font-medium text-slate-100">{NOT_SET}</div>
            )}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Direct Reports
          
          <span className="mt-1 ml-1 text-[13px] font-semibold tabular-nums text-slate-200">
            {directReportCount > 0 ? "("+String(directReportCount)+")" : "(0)"}
          </span>
          </div>
          {directReportCount > 0 ? (
            <ul className="mt-2 space-y-2">
              {directReports.map((p) => (
                <li key={p.id ?? p.name}>
                  <EmployeeHierarchyItem name={p.name ?? '—'} showMenu={false} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </JobProfileCard>
  );
}
