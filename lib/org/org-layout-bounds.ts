/**
 * Axis-aligned bounds for org canvas nodes (includes manual negative offsets).
 */

import type { OrgHierarchyLayoutNode } from "@/lib/org/org-hierarchy-layout";

export type OrgLayoutBoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

const DEFAULT_MARGIN = 56;

export function computeOrgLayoutBoundingBox(
  nodes: Pick<OrgHierarchyLayoutNode, "x" | "y" | "width" | "height">[],
  margin = DEFAULT_MARGIN,
): OrgLayoutBoundingBox {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return {
    minX: minX - margin,
    minY: minY - margin,
    maxX: maxX + margin,
    maxY: maxY + margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };
}
