import { Loader2, Minus } from 'lucide-react';

import { getInitials } from './buildTree';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function departmentPath(node) {
  const d = (node.department ?? '').trim();
  const s = (node.sub_department ?? '').trim();
  if (d && s) return `${d} > ${s}`;
  return d || s || '—';
}

/**
 * @param {object} props
 * @param {import('./employeeNodeTypes').EmployeeNode} props.node
 * @param {boolean} props.expanded
 * @param {boolean} props.highlighted
 * @param {boolean} [props.expandLoading]
 * @param {() => void} props.onToggleExpand
 */
export default function OrgNode({ node, expanded, highlighted, expandLoading, onToggleExpand }) {
  const hasTeam = (node.reportee_count ?? 0) > 0 || (node.children?.length ?? 0) > 0;
  const showBadge = hasTeam;

  return (
    <div
      data-org-node
      id={`org-node-${node.id}`}
      className={cx(
        'relative flex w-64 items-center gap-3 rounded-md border border-border bg-card p-3 shadow-lg',
        highlighted && 'ring-2 ring-accent/40 ring-offset-2 ring-offset-background'
      )}
    >
      {node.profile_image ? (
        <img
          src={node.profile_image}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500 text-xs font-extrabold text-slate-950">
          {getInitials(node.display_name)}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="truncate text-xs font-semibold text-foreground">{node.display_name}</div>
        <div className="truncate text-[10px] text-muted-foreground">{node.job_title_primary || '—'}</div>
        <div className="truncate text-[10px] text-muted-foreground">{node.work_location || '—'}</div>
        <div className="truncate text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
          {departmentPath(node)}
        </div>
      </div>

      {showBadge ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className={cx(
            'absolute -bottom-3 left-1/2 z-10 flex h-5 w-5 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full',
            'bg-indigo-600 text-[10px] font-semibold text-white shadow-md ring-2 ring-slate-900',
            'hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/60'
          )}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse team' : 'Load and expand team'}
          disabled={expandLoading}
        >
          {expandLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : expanded ? (
            <Minus className="h-3 w-3" strokeWidth={3} />
          ) : (
            <span>{node.reportee_count || node.children?.length || 0}</span>
          )}
        </button>
      ) : null}
    </div>
  );
}
