import React, { useMemo } from 'react';
import JobProfileCard from './JobProfileCard.jsx';
import DetailField from './DetailField.jsx';
import {
  NOT_SET,
  displayValue,
  formatJobDate,
  formatProbation,
  formatTimeType,
  formatWorkerType,
} from './jobProfileFormat.js';

export default function JobDetailsCard({ data }) {
  const rows = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Employee Number', value: displayValue(data.employee_code) },
      { label: 'Date of Joining', value: formatJobDate(data.date_of_joining) },
      { label: 'Job Title - Primary', value: displayValue(data.job_title_primary) },
      { label: 'Job Title - Secondary', value: displayValue(data.job_title_secondary) },
      { label: 'In Probation?', value: formatProbation(data.probation_start, data.probation_end) },
      { label: 'Notice Period', value: displayValue(data.notice_period) },
      { label: 'Worker Type', value: formatWorkerType(data.worker_type) },
      { label: 'Time Type', value: formatTimeType(data.time_type) },
      { label: 'Contract Status', value: displayValue(data.contract_status) },
      { label: 'Pay Band', value: displayValue(data.pay_band) },
      { label: 'Pay Grade', value: displayValue(data.pay_grade) },
    ];
  }, [data]);

  return (
    <JobProfileCard title="Job Details">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
        {rows.map((r) => (
          <DetailField key={r.label} label={r.label} value={r.value === '' ? NOT_SET : r.value} />
        ))}
      </div>
    </JobProfileCard>
  );
}
