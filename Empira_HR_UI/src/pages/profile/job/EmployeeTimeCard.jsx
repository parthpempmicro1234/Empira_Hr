import React, { useMemo } from 'react';
import JobProfileCard from './JobProfileCard.jsx';
import DetailField from './DetailField.jsx';
import { NOT_SET } from './jobProfileFormat.js';

/** Enterprise HRMS reference fallbacks when API omits or nulls a value */
const EMPLOYEE_TIME_DEFAULTS = {
  shift: 'General shift 1',
  weekly_off_policy: 'General weekly off',
  leave_plan: 'Calendar Year',
  holiday_calendar: 'Holiday list',
  attendance_number: NOT_SET,
  attendance_tracking_policy: 'Attendance Capture Scheme',
  attendance_penalisation_policy: 'Attendance Tracking policy',
  shift_weekly_off_rule: NOT_SET,
  shift_allowance_policy: NOT_SET,
  overtime: 'GS',
};

function pickApiOrDefault(data, key) {
  const raw = data?.[key];
  if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
    return String(raw).trim();
  }
  return EMPLOYEE_TIME_DEFAULTS[key] ?? NOT_SET;
}

export default function EmployeeTimeCard({ data }) {
  const rows = useMemo(() => {
    const d = data ?? {};
    return [
      { label: 'Shift', key: 'shift' },
      { label: 'Weekly Off Policy', key: 'weekly_off_policy' },
      { label: 'Leave Plan', key: 'leave_plan' },
      { label: 'Holiday Calendar', key: 'holiday_calendar' },
      { label: 'Attendance Number', key: 'attendance_number' },
      { label: 'Attendance Time Tracking Policy', key: 'attendance_tracking_policy' },
      { label: 'Attendance Penalisation Policy', key: 'attendance_penalisation_policy' },
      { label: 'Shift Weekly Off Rule', key: 'shift_weekly_off_rule' },
      { label: 'Shift Allowance Policy', key: 'shift_allowance_policy' },
      { label: 'Overtime', key: 'overtime' },
    ].map(({ label, key }) => ({
      label,
      value: pickApiOrDefault(d, key),
    }));
  }, [data]);

  return (
    <JobProfileCard title="Employee Time">
      <div className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2 sm:gap-x-10">
        {rows.map((r) => (
          <DetailField key={r.label} label={r.label} value={r.value} />
        ))}
      </div>
    </JobProfileCard>
  );
}
