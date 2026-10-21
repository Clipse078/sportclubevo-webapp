/**
 * Client-side presentation layout for OrgUnit canvas (separate from hierarchy parentId).
 */

import type { OrgHierarchyLayoutNode } from "@/lib/org/org-hierarchy-layout";

export type OrgLayoutPositionMap = Record<string, { x: number; y: number }>;

const STORAGE_VERSION = 1;

export function orgLayoutStorageKey(tenantId: string): string {
  return `sce-org-layout-v${STORAGE_VERSION}:${tenantId}`;
}

export function loadOrgLayoutPositions(tenantId: string): OrgLayoutPositionMap {
  if (typeof window === "undefined" || !tenantId) return {};
  try {
    const raw = window.localStorage.getItem(orgLayoutStorageKey(tenantId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as OrgLayoutPositionMap;
  } catch {
    return {};
  }
}

export function saveOrgLayoutPositions(tenantId: string, positions: OrgLayoutPositionMap): void {
  if (typeof window === "undefined" || !tenantId) return;
  try {
    window.localStorage.setItem(orgLayoutStorageKey(tenantId), JSON.stringify(positions));
  } catch {
    /* quota / private mode */
  }
}

export function clearOrgLayoutPositions(tenantId: string): void {
  if (typeof window === "undefined" || !tenantId) return;
  try {
    window.localStorage.removeItem(orgLayoutStorageKey(tenantId));
  } catch {
    /* ignore */
  }
}

export function mergeLayoutWithManualPositions(
  autoNodes: OrgHierarchyLayoutNode[],
  manual: OrgLayoutPositionMap,
): OrgHierarchyLayoutNode[] {
  if (!manual || Object.keys(manual).length === 0) return autoNodes;
  return autoNodes.map((node) => {
    const pos = manual[node.id];
    if (!pos) return node;
    return { ...node, x: pos.x, y: pos.y };
  });
}

export function computeLayoutBounds(nodes: Pick<OrgHierarchyLayoutNode, "x" | "y" | "width" | "height">[]): {
  width: number;
  height: number;
} {
  if (nodes.length === 0) return { width: 0, height: 0 };
  let maxX = 0;
  let maxY = 0;
  for (const n of nodes) {
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return { width: maxX + 56, height: maxY + 56 };
}

/** Removes collapsed flags on all ancestors so a node becomes visible. */
export function ancestorIdsForUnit(
  unitId: string,
  units: { id: string; parentId: string | null }[],
): string[] {
  const parentById = new Map(units.map((u) => [u.id, u.parentId]));
  const ancestors: string[] = [];
  let current = parentById.get(unitId) ?? null;
  while (current) {
    ancestors.push(current);
    current = parentById.get(current) ?? null;
  }
  return ancestors;
}

export function expandCollapsedAncestors(
  unitId: string,
  units: { id: string; parentId: string | null }[],
  collapsed: Set<string>,
): Set<string> {
  const next = new Set(collapsed);
  for (const ancestorId of ancestorIdsForUnit(unitId, units)) {
    next.delete(ancestorId);
  }
  return next;
}

export const ORG_LAYOUT_PERSISTENCE_MODEL = "CLIENT_LOCAL_STORAGE" as const;
export const ORG_LAYOUT_PERSISTENCE_SCOPE = "TENANT_SCOPED_PRESENTATION_XY" as const;
export const ORG_LAYOUT_SCHEMA_CHANGE = "NO" as const;
