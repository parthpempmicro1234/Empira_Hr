import type { EmployeeNode } from './employeeNodeTypes';

/** Must match org card `w-64` (16rem). */
export const ORG_CARD_WIDTH = 256;

/** Gap when every sibling column is collapsed (minimal footprint). */
const GAP_COMPACT = 36;

/** Gap when any sibling subtree is expanded (room for connectors / growth). */
const GAP_NORMAL = 52;

/** Smooth width changes on expand/collapse */
export const ORG_BRANCH_WIDTH_TRANSITION =
  'width 320ms cubic-bezier(0.33, 1, 0.68, 1), min-width 320ms cubic-bezier(0.33, 1, 0.68, 1)';

export function rowGapForChildren(children: EmployeeNode[], expandedNodes: Set<string>): number {
  if (children.length <= 1) return 0;
  const allCollapsed = children.every((c) => !expandedNodes.has(c.id));
  return allCollapsed ? GAP_COMPACT : GAP_NORMAL;
}

/**
 * Minimum width (px) for `node`'s column: card width, or enough for children
 * (only grows past one card when the packed row needs it — avoids overlap).
 */
export function subtreePackWidth(node: EmployeeNode, expandedNodes: Set<string>): number {
  if (!expandedNodes.has(node.id)) {
    return ORG_CARD_WIDTH;
  }

  const kids = node.children ?? [];
  if (kids.length === 0) {
    return ORG_CARD_WIDTH;
  }

  const gap = rowGapForChildren(kids, expandedNodes);
  const childWidths = kids.map((k) => subtreePackWidth(k, expandedNodes));
  const row =
    childWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, kids.length - 1) * gap;

  return Math.max(ORG_CARD_WIDTH, row);
}

export function childSubtreeWidths(
  children: EmployeeNode[],
  expandedNodes: Set<string>
): number[] {
  return children.map((c) => subtreePackWidth(c, expandedNodes));
}

export function childRowSpine(
  childWidths: number[],
  gap: number
): { rowTotal: number; left: number; width: number } {
  if (childWidths.length === 0) {
    return { rowTotal: 0, left: 0, width: 0 };
  }
  const rowTotal =
    childWidths.reduce((a, b) => a + b, 0) + Math.max(0, childWidths.length - 1) * gap;

  if (childWidths.length <= 1) {
    return { rowTotal, left: 0, width: 0 };
  }

  let pos = 0;
  const centers: number[] = [];
  for (let i = 0; i < childWidths.length; i++) {
    const w = childWidths[i]!;
    centers.push(pos + w / 2);
    pos += w + (i < childWidths.length - 1 ? gap : 0);
  }
  const first = centers[0]!;
  const last = centers[centers.length - 1]!;
  return { rowTotal, left: first, width: Math.max(0, last - first) };
}
