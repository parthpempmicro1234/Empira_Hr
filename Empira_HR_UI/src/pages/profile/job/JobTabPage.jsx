import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeJobProfile } from '../../../services/employeeJobProfile';
import { normalizeApiError } from '../../../services/errors';
import JobDetailsCard from './JobDetailsCard.jsx';
import EmployeeTimeCard from './EmployeeTimeCard.jsx';
import OtherInfoCard from './OtherInfoCard.jsx';
import OrganizationCard from './OrganizationCard.jsx';
import JobTabLoadingSkeleton from './JobTabLoadingSkeleton.jsx';
import JobTabApiError from './JobTabApiError.jsx';

/**
 * Job tab: enterprise job profile from GET /accounts/employees/profile/job/
 * @param {{ enabled?: boolean }} props
 */
export default function JobTabPage({ enabled = true }) {
  const query = useQuery({
    queryKey: ['employeeJobProfile'],
    queryFn: getEmployeeJobProfile,
    enabled,
    staleTime: 60_000,
  });

  if (!enabled) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
        Job profile is not available in this view.
      </div>
    );
  }

  if (query.isLoading && !query.data) {
    return <JobTabLoadingSkeleton />;
  }

  if (query.isError) {
    const err = normalizeApiError(query.error);
    return <JobTabApiError message={err.message} onRetry={() => query.refetch()} />;
  }

  const data = query.data ?? {};

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:items-start lg:gap-5">
      <div className="min-w-0 space-y-4">
        <JobDetailsCard data={data} />
        <EmployeeTimeCard data={data} />
        <OtherInfoCard data={data} />
      </div>
      <div className="min-w-0 lg:sticky lg:top-4">
        <OrganizationCard data={data} />
      </div>
    </div>
  );
}
