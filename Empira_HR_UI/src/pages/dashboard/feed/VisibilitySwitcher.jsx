import { cx, departmentTabLabel } from './feedUtils.js';

export default function VisibilitySwitcher({ visibility, onChange, department, subDepartment }) {
  const deptLabel = departmentTabLabel(department, subDepartment);

  return (
    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-1">
      <button
        type="button"
        onClick={() => onChange('organization')}
        className={cx(
          'rounded-md px-4 py-2 text-sm font-semibold',
          visibility === 'organization'
            ? 'bg-slate-900 text-slate-50 shadow-sm'
            : 'text-slate-300 hover:text-slate-50'
        )}
      >
        Organization
      </button>
      <button
        type="button"
        onClick={() => onChange('department')}
        className={cx(
          'rounded-md px-4 py-2 text-sm font-semibold',
          visibility === 'department'
            ? 'bg-slate-900 text-slate-50 shadow-sm'
            : 'text-slate-300 hover:text-slate-50'
        )}
      >
        {deptLabel}
      </button>
    </div>
  );
}
