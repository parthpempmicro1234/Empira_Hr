import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { getReporttreesByManagerId } from '../../../services/reporttrees';
import type { EmployeeNode } from './employeeNodeTypes';
import { defaultExpandedNodeIds } from './buildTree';
import { findNodeInTree, flatRowsToChildNodes, mergeReporteesUnderManager } from './mergeLazyReportees';
import OrgTreeBranch from './OrgTreeBranch';

type Props = {
  roots: EmployeeNode[];
  highlightedId: string | null;
  isGroupedByDept: boolean;
  /** When the server tree query refetches, reset local tree + expansion state */
  dataEpoch: number;
};

export default function OrgTreeCanvas({ roots, highlightedId, isGroupedByDept, dataEpoch }: Props) {
  const [treeRoots, setTreeRoots] = useState<EmployeeNode[]>(() => structuredClone(roots));
  const [expandedNodes, setExpandedNodes] = useState(() => defaultExpandedNodeIds(roots));
  /** Managers for whom we already called `reporttrees/{id}/` (or had full children from initial payload). */
  const [lazyLoadedIds, setLazyLoadedIds] = useState<Set<string>>(() => new Set());
  const [expandBanner, setExpandBanner] = useState<string | null>(null);
  const lastEpoch = useRef<number | null>(null);

  useEffect(() => {
    if (lastEpoch.current === dataEpoch) return;
    lastEpoch.current = dataEpoch;
    setTreeRoots(structuredClone(roots));
    setExpandedNodes(defaultExpandedNodeIds(roots));
    setLazyLoadedIds(new Set());
    setExpandBanner(null);
  }, [dataEpoch, roots]);

  const expandMutation = useMutation({
    mutationFn: async (managerId: string) => {
      const rows = await getReporttreesByManagerId(managerId);
      return { managerId, rows };
    },
    onSuccess: ({ managerId, rows }) => {
      const children = flatRowsToChildNodes(rows, managerId);
      setTreeRoots((prev) => mergeReporteesUnderManager(prev, managerId, children));
      setLazyLoadedIds((prev) => new Set(prev).add(managerId));
      setExpandedNodes((prev) => new Set(prev).add(managerId));
      setExpandBanner(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not load direct reports';
      setExpandBanner(msg);
    },
  });

  const expandingId =
    expandMutation.isPending && expandMutation.variables != null ? expandMutation.variables : null;

  const shouldLazyFetch = useCallback(
    (node: EmployeeNode, id: string) => {
      if (lazyLoadedIds.has(id)) return false;
      const hinted = (node.reportee_count ?? 0) > 0;
      const nKids = node.children?.length ?? 0;
      if (!hinted) return false;
      return nKids === 0 || nKids < (node.reportee_count ?? 0);
    },
    [lazyLoadedIds]
  );

  const handleToggleExpand = useCallback(
    (id: string) => {
      setExpandBanner(null);

      if (expandMutation.isPending) return;

      if (expandedNodes.has(id)) {
        setExpandedNodes((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      const node = findNodeInTree(treeRoots, id);
      if (!node) return;

      if (shouldLazyFetch(node, id)) {
        expandMutation.mutate(id);
        return;
      }

      setLazyLoadedIds((prev) => new Set(prev).add(id));
      setExpandedNodes((prev) => new Set(prev).add(id));
    },
    [expandedNodes, expandMutation, shouldLazyFetch, treeRoots]
  );

  return (
    <div className="flex w-full max-w-full flex-col items-center gap-2">
      {expandBanner ? (
        <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-center text-xs text-red-200">
          {expandBanner}
        </div>
      ) : null}
      <div className="flex max-w-full flex-row flex-wrap items-start justify-center gap-x-32 gap-y-24 px-6">
        {treeRoots.map((root) => (
          <div key={root.id} className="flex min-w-0 shrink-0 flex-col items-center">
            <OrgTreeBranch
              node={root}
              expandedNodes={expandedNodes}
              highlightedId={highlightedId}
              expandLoadingId={expandingId}
              onToggleExpand={handleToggleExpand}
              isGroupedByDept={isGroupedByDept}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
