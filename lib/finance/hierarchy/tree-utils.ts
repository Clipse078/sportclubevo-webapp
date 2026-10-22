import { wouldReparentCreateCycle } from "@/lib/org/org-hierarchy-layout";

export type FinanceHierarchyNode = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

export function assertNotSelfParent(nodeId: string, parentId: string | null): void {
  if (parentId !== null && parentId === nodeId) {
    throw new Error("FINANCE_SELF_PARENT");
  }
}

export function assertNoReparentCycle(
  nodes: Pick<FinanceHierarchyNode, "id" | "parentId">[],
  nodeId: string,
  newParentId: string | null,
): void {
  if (newParentId === null) return;
  assertNotSelfParent(nodeId, newParentId);
  if (wouldReparentCreateCycle(nodes, nodeId, newParentId)) {
    throw new Error("FINANCE_CYCLE");
  }
}

export function nextSortOrder(siblings: { sortOrder: number }[]): number {
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((s) => s.sortOrder)) + 1;
}
