import { useMemo } from 'react';

import OrgNode from './OrgNode.jsx';

import type { EmployeeNode } from './employeeNodeTypes';
import {
  ORG_BRANCH_WIDTH_TRANSITION,
  ORG_CARD_WIDTH,
  childRowSpine,
  childSubtreeWidths,
  rowGapForChildren,
  subtreePackWidth,
} from './subtreeLayout';

type Props = {
  node: EmployeeNode;
  expandedNodes: Set<string>;
  highlightedId: string | null;
  expandLoadingId: string | null;
  onToggleExpand: (id: string) => void;
  isGroupedByDept: boolean;
};

function deptKey(s: string | null | undefined) {
  return (s ?? '').trim();
}

function deptBorderColor(dept: string) {
  const d = dept.toLowerCase();
  if (d.includes('hr')) return 'rgba(99, 102, 241, 0.35)'; // indigo
  if (d.includes('management') || d.includes('admin')) return 'rgba(16, 185, 129, 0.30)'; // emerald
  if (d.includes('finance')) return 'rgba(245, 158, 11, 0.30)'; // amber
  if (d.includes('engineering') || d.includes('tech') || d.includes('it'))
    return 'rgba(59, 130, 246, 0.30)'; // blue
  if (d.includes('sales') || d.includes('marketing')) return 'rgba(236, 72, 153, 0.28)'; // pink
  return 'rgba(148, 163, 184, 0.22)'; // slate
}

function contiguousDepartmentGroups(children: EmployeeNode[]) {
  const groups: { dept: string; start: number; end: number }[] = [];
  let i = 0;
  while (i < children.length) {
    const dept = deptKey(children[i]?.department);
    let j = i + 1;
    while (j < children.length && deptKey(children[j]?.department) === dept) j++;
    if (dept && j - i >= 2) {
      groups.push({ dept, start: i, end: j - 1 });
    }
    i = j;
  }
  return groups;
}

export default function OrgTreeBranch({
  node,
  expandedNodes,
  highlightedId,
  expandLoadingId,
  onToggleExpand,
  isGroupedByDept,
}: Props) {
  const expanded = expandedNodes.has(node.id);
  const children = node.children ?? [];
  const isLoadingChildren = expandLoadingId === node.id;
  const showSubtree = expanded && (children.length > 0 || isLoadingChildren);

  const packW = useMemo(() => subtreePackWidth(node, expandedNodes), [node, expandedNodes]);

  const rowGap = useMemo(() => rowGapForChildren(children, expandedNodes), [children, expandedNodes]);

  const childWidths = useMemo(
    () => (children.length ? childSubtreeWidths(children, expandedNodes) : []),
    [children, expandedNodes]
  );

  const spine = useMemo(
    () => childRowSpine(childWidths, rowGap),
    [childWidths, rowGap]
  );

  const branchBoxStyle = {
    width: packW,
    minWidth: packW,
    maxWidth: '100%' as const,
    transition: ORG_BRANCH_WIDTH_TRANSITION,
  };

  if (!showSubtree) {
    return (
      <div className="inline-flex flex-col items-center pb-6" style={branchBoxStyle}>
        <OrgNode
          node={node}
          expanded={expanded}
          highlighted={highlightedId === node.id}
          expandLoading={isLoadingChildren}
          onToggleExpand={() => onToggleExpand(node.id)}
        />
      </div>
    );
  }

  const deptGroups = isGroupedByDept ? contiguousDepartmentGroups(children) : [];

  // precompute each child column's x-offset within the row (for department group overlays)
  let x = 0;
  const childLefts = childWidths.map((w, idx) => {
    const left = x;
    x += w + (idx < childWidths.length - 1 ? rowGap : 0);
    return left;
  });

  return (
    <div className="inline-flex flex-col items-center" style={branchBoxStyle}>
      <OrgNode
        node={node}
        expanded={expanded}
        highlighted={highlightedId === node.id}
        expandLoading={isLoadingChildren}
        onToggleExpand={() => onToggleExpand(node.id)}
      />

      <div className="pointer-events-none flex h-10 flex-col items-center">
        <div className="h-full border-l-2 border-slate-300 dark:border-slate-600" aria-hidden />
      </div>

      <div className="relative inline-flex flex-col items-center">
        {isLoadingChildren && children.length === 0 ? (
          <div
            className="flex min-h-[120px] w-fit items-start justify-center pt-2 text-xs text-muted-foreground"
            style={{ minWidth: ORG_CARD_WIDTH }}
          >
            Loading team…
          </div>
        ) : (
          <div
            className="relative inline-flex flex-row flex-nowrap justify-center"
            style={{
              width: spine.rowTotal,
              minWidth: spine.rowTotal,
              gap: rowGap,
              transition: ORG_BRANCH_WIDTH_TRANSITION,
            }}
          >
            {deptGroups.map((g) => {
              const left = childLefts[g.start] ?? 0;
              const right =
                (childLefts[g.end] ?? 0) + (childWidths[g.end] ?? ORG_CARD_WIDTH);
              const pad = 12; // visual padding around grouped siblings
              const border = deptBorderColor(g.dept);
              return (
                <div
                  key={`${g.dept}-${g.start}-${g.end}`}
                  className="pointer-events-none absolute -top-2 -bottom-2 rounded-lg bg-muted/30 shadow-inner"
                  style={{
                    left: Math.max(0, left - pad),
                    width: Math.max(0, right - left + pad * 2),
                    border: `1px solid ${border}`,
                    zIndex: 1,
                  }}
                  aria-hidden
                >
                  <div
                    className="absolute -top-3 left-4 rounded bg-card px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    style={{ border: `1px solid ${border}` }}
                  >
                    {g.dept}
                  </div>
                </div>
              );
            })}

            {childWidths.length > 1 ? (
              <div
                className="pointer-events-none absolute top-0 border-t-2 border-slate-300 dark:border-slate-600 transition-[left,width] duration-300 ease-out"
                style={{
                  left: spine.left,
                  width: spine.width,
                  zIndex: 2,
                }}
                aria-hidden
              />
            ) : null}

            {children.map((child, idx) => (
              <div
                key={child.id}
                className="relative flex shrink-0 flex-col items-center"
                style={{
                  width: childWidths[idx],
                  minWidth: childWidths[idx],
                  transition: ORG_BRANCH_WIDTH_TRANSITION,
                  zIndex: 3,
                }}
              >
                <div className="pointer-events-none flex h-10 flex-col items-center">
                  <div className="h-full border-l-2 border-slate-300 dark:border-slate-600" aria-hidden />
                </div>
                <OrgTreeBranch
                  node={child}
                  expandedNodes={expandedNodes}
                  highlightedId={highlightedId}
                  expandLoadingId={expandLoadingId}
                  onToggleExpand={onToggleExpand}
                  isGroupedByDept={isGroupedByDept}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
