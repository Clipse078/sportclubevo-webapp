import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceStructureManage,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import {
  assertNoReparentCycle,
  nextSortOrder,
} from "@/lib/finance/hierarchy/tree-utils";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import {
  evaluateFinanceCostCenterDeleteGuards,
} from "@/lib/finance/cost-center/delete-guards";
import { logAction } from "@/lib/audit/log-action";

type Db = Pick<PrismaClient, "financeCostCenter">;

function mapHierarchyError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message === "FINANCE_SELF_PARENT") {
      throw new FinanceDomainError(
        "FINANCE_SELF_PARENT",
        "A cost center cannot be its own parent.",
      );
    }
    if (error.message === "FINANCE_CYCLE") {
      throw new FinanceDomainError(
        "FINANCE_CYCLE",
        "This move would create a cycle in the cost center hierarchy.",
      );
    }
  }
  throw error;
}

async function loadTenantCostCenters(db: Db, tenantId: string) {
  return db.financeCostCenter.findMany({
    where: { tenantId },
    select: { id: true, parentId: true, sortOrder: true, tenantId: true, lifecycle: true },
  });
}

async function getCostCenterOrThrow(db: Db, ctx: FinanceAuthContext, id: string) {
  const row = await db.financeCostCenter.findUnique({ where: { id } });
  if (!row) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Cost center not found.", 404);
  }
  assertSameTenant(row.tenantId, ctx.tenantId, "Cost center");
  return row;
}

export async function createFinanceCostCenter(
  db: Db,
  ctx: FinanceAuthContext,
  input: { name: string; description?: string | null; parentId?: string | null },
) {
  requireFinanceStructureManage(ctx);
  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await getCostCenterOrThrow(db, ctx, parentId);
    if (parent.lifecycle === "ARCHIVED") {
      throw new FinanceDomainError(
        "FINANCE_ARCHIVED",
        "Cannot add a cost center under an archived parent.",
      );
    }
  }

  const siblings = await db.financeCostCenter.findMany({
    where: { tenantId: ctx.tenantId, parentId },
    select: { sortOrder: true },
  });

  const created = await db.financeCostCenter.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      parentId,
      sortOrder: nextSortOrder(siblings),
    },
  });

  await logAction({
    moduleKey: "finance",
    action: "cost_center.created",
    entityType: "FinanceCostCenter",
    entityId: created.id,
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    metadataJson: { name: created.name },
  }).catch(() => undefined);

  return created;
}

export async function renameFinanceCostCenter(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  name: string,
) {
  requireFinanceStructureManage(ctx);
  await getCostCenterOrThrow(db, ctx, id);
  return db.financeCostCenter.update({
    where: { id },
    data: { name: name.trim() },
  });
}

export async function reparentFinanceCostCenter(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  newParentId: string | null,
) {
  requireFinanceStructureManage(ctx);
  const node = await getCostCenterOrThrow(db, ctx, id);
  if (node.lifecycle === "ARCHIVED") {
    throw new FinanceDomainError("FINANCE_ARCHIVED", "Archived cost centers cannot be moved.");
  }
  if (newParentId) {
    const parent = await getCostCenterOrThrow(db, ctx, newParentId);
    if (parent.lifecycle === "ARCHIVED") {
      throw new FinanceDomainError(
        "FINANCE_ARCHIVED",
        "Cannot reparent under an archived cost center.",
      );
    }
  }

  const all = await loadTenantCostCenters(db, ctx.tenantId);
  try {
    assertNoReparentCycle(all, id, newParentId);
  } catch (e) {
    mapHierarchyError(e);
  }

  return db.financeCostCenter.update({
    where: { id },
    data: { parentId: newParentId },
  });
}

export async function reorderFinanceCostCenter(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  sortOrder: number,
) {
  requireFinanceStructureManage(ctx);
  await getCostCenterOrThrow(db, ctx, id);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new FinanceDomainError("FINANCE_INVALID_HIERARCHY", "Invalid sort order.");
  }
  return db.financeCostCenter.update({
    where: { id },
    data: { sortOrder },
  });
}

export async function archiveFinanceCostCenter(db: Db, ctx: FinanceAuthContext, id: string) {
  requireFinanceStructureManage(ctx);
  await getCostCenterOrThrow(db, ctx, id);
  return db.financeCostCenter.update({
    where: { id },
    data: { lifecycle: "ARCHIVED", archivedAt: new Date() },
  });
}

export async function reactivateFinanceCostCenter(db: Db, ctx: FinanceAuthContext, id: string) {
  requireFinanceStructureManage(ctx);
  await getCostCenterOrThrow(db, ctx, id);
  return db.financeCostCenter.update({
    where: { id },
    data: { lifecycle: "ACTIVE", archivedAt: null },
  });
}

export async function deleteFinanceCostCenterWhenSafe(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
) {
  requireFinanceStructureManage(ctx);
  await getCostCenterOrThrow(db, ctx, id);

  const childCount = await db.financeCostCenter.count({
    where: { tenantId: ctx.tenantId, parentId: id },
  });
  if (childCount > 0) {
    throw new FinanceDomainError(
      "FINANCE_UNSAFE_DELETE",
      "Remove or reparent child cost centers before deleting this cost center.",
    );
  }

  const guard = await evaluateFinanceCostCenterDeleteGuards({
    tenantId: ctx.tenantId,
    costCenterId: id,
  });
  if (!guard.allowed) {
    throw new FinanceDomainError(
      "FINANCE_UNSAFE_DELETE",
      guard.reason,
    );
  }

  await db.financeCostCenter.delete({ where: { id } });
  return { deleted: true as const };
}
