import React, { useMemo } from 'react';
import JobProfileCard from './JobProfileCard.jsx';
import DetailField from './DetailField.jsx';
import { displayValue } from './jobProfileFormat.js';

export default function OtherInfoCard({ data }) {
  const rows = useMemo(() => {
    const d = data ?? {};
    return [
      { label: 'Expense Policy', value: displayValue(d.expense_policy) },
      { label: 'Loan Policy', value: displayValue(d.loan_policy) },
      { label: 'Air Ticket Policy', value: displayValue(d.air_ticket_policy) },
    ];
  }, [data]);

  return (
    <JobProfileCard title="Other">
      <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
        {rows.map((r) => (
          <DetailField key={r.label} label={r.label} value={r.value} />
        ))}
      </div>
    </JobProfileCard>
  );
}
