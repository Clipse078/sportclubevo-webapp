/**
 * Deterministic tree layout for OrgUnit hierarchy canvas (no free-form positioning).
 */

export type OrgHierarchyUnit = {
  id: string;
  parentId: string | null;
  sortOrder: number;
  name: string;
};

export type OrgHierarchyLayoutNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
};

export type OrgHierarchyLayoutEdge = {
  fromId: string;
  toId: string;
};

export type OrgHierarchyLayoutResult = {
  nodes: OrgHierarchyLayoutNode[];
  edges: OrgHierarchyLayoutEdge[];
  width: number;
  height: number;
};

const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 68;
const DEFAULT_GAP_X = 28;
const DEFAULT_GAP_Y = 56;

function compareUnits(a: OrgHierarchyUnit, b: OrgHierarchyUnit): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name, "de");
}

export function buildOrgHierarchyLayout(
  units: OrgHierarchyUnit[],
  collapsedBranchRoots: ReadonlySet<string>,
  options?: {
    nodeWidth?: number;
    nodeHeight?: number;
    gapX?: number;
    gapY?: number;
  },
): OrgHierarchyLayoutResult {
  const nodeWidth = options?.nodeWidth ?? DEFAULT_NODE_WIDTH;
  const nodeHeight = options?.nodeHeight ?? DEFAULT_NODE_HEIGHT;
  const gapX = options?.gapX ?? DEFAULT_GAP_X;
  const gapY = options?.gapY ?? DEFAULT_GAP_Y;

  const byId = new Map(units.map((u) => [u.id, u]));
  const childrenByParent = new Map<string | null, OrgHierarchyUnit[]>();

  for (const unit of units) {
    const parentKey =
      unit.parentId && byId.has(unit.parentId) ? unit.parentId : null;
    const bucket = childrenByParent.get(parentKey) ?? [];
    bucket.push(unit);
    childrenByParent.set(parentKey, bucket);
  }

  for (const [key, list] of childrenByParent) {
    list.sort(compareUnits);
    childrenByParent.set(key, list);
  }

  const positions = new Map<string, { x: number; y: number; depth: number }>();
  const edges: OrgHierarchyLayoutEdge[] = [];
  let nextLeafX = 0;

  function visibleChildren(parentId: string): OrgHierarchyUnit[] {
    if (collapsedBranchRoots.has(parentId)) return [];
    return childrenByParent.get(parentId) ?? [];
  }

  function layoutSubtree(unitId: string, depth: number): number {
    const children = visibleChildren(unitId);
    if (children.length === 0) {
      const x = nextLeafX;
      nextLeafX += nodeWidth + gapX;
      positions.set(unitId, { x, y: depth * (nodeHeight + gapY), depth });
      return x + nodeWidth / 2;
    }

    const childCenters = children.map((child) => {
      edges.push({ fromId: unitId, toId: child.id });
      return layoutSubtree(child.id, depth + 1);
    });

    const minCenter = Math.min(...childCenters);
    const maxCenter = Math.max(...childCenters);
    const center = (minCenter + maxCenter) / 2;
    const x = center - nodeWidth / 2;
    positions.set(unitId, { x, y: depth * (nodeHeight + gapY), depth });
    return center;
  }

  const roots = childrenByParent.get(null) ?? [];
  for (const root of roots) {
    layoutSubtree(root.id, 0);
  }

  let minX = 0;
  let maxX = 0;
  let maxY = 0;
  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x + nodeWidth);
    maxY = Math.max(maxY, pos.y + nodeHeight);
  }

  const offsetX = minX < 0 ? -minX + gapX : gapX;

  const nodes: OrgHierarchyLayoutNode[] = [...positions.entries()].map(
    ([id, pos]) => ({
      id,
      x: pos.x + offsetX,
      y: pos.y + gapY,
      width: nodeWidth,
      height: nodeHeight,
      depth: pos.depth,
    }),
  );

  return {
    nodes,
    edges,
    width: maxX - minX + offsetX + gapX,
    height: maxY + gapY * 2,
  };
}

/** Returns true if moving `unitId` under `newParentId` would create a cycle. */
export function wouldReparentCreateCycle(
  units: Pick<OrgHierarchyUnit, "id" | "parentId">[],
  unitId: string,
  newParentId: string,
): boolean {
  if (unitId === newParentId) return true;
  const parentById = new Map(units.map((u) => [u.id, u.parentId]));
  let current: string | null = newParentId;
  while (current) {
    if (current === unitId) return true;
    current = parentById.get(current) ?? null;
  }
  return false;
}
