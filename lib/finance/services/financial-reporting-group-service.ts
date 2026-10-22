import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceStructureManage,
  requireFinanceView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { assertNoReparentCycle, nextSortOrder } from "@/lib/finance/hierarchy/tree-utils";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import { evaluateFinancialStructureDeleteGuards } from "@/lib/finance/structure/delete-guards";

type Db = Pick<PrismaClient, "financialReportingGroup" | "financialAccount">;

function mapHierarchyError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message === "FINANCE_SELF_PARENT") {
      throw new FinanceDomainError(
        "FINANCE_SELF_PARENT",
        "A reporting group cannot be its own parent.",
      );
    }
    if (error.message === "FINANCE_CYCLE") {
      throw new FinanceDomainError(
        "FINANCE_CYCLE",
        "This move would create a cycle in the reporting hierarchy.",
      );
    }
  }
  throw error;
}

async function getGroupOrThrow(db: Db, ctx: FinanceAuthContext, id: string) {
  const row = await db.financialReportingGroup.findUnique({ where: { id } });
  if (!row) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Reporting group not found.", 404);
  }
  assertSameTenant(row.tenantId, ctx.tenantId, "Reporting group");
  return row;
}

export async function createFinancialReportingGroup(
  db: Db,
  ctx: FinanceAuthContext,
  input: { name: string; parentId?: string | null },
) {
  requireFinanceStructureManage(ctx);
  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await getGroupOrThrow(db, ctx, parentId);
    if (parent.lifecycle === "ARCHIVED") {
      throw new FinanceDomainError(
        "FINANCE_ARCHIVED",
        "Cannot add a reporting group under an archived parent.",
      );
    }
  }

  const siblings = await db.financialReportingGroup.findMany({
    where: { tenantId: ctx.tenantId, parentId },
    select: { sortOrder: true },
  });

  return db.financialReportingGroup.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name.trim(),
      parentId,
      sortOrder: nextSortOrder(siblings),
    },
  });
}

export async function renameFinancialReportingGroup(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  name: string,
) {
  requireFinanceStructureManage(ctx);
  await getGroupOrThrow(db, ctx, id);
  return db.financialReportingGroup.update({
    where: { id },
    data: { name: name.trim() },
  });
}

export async function reparentFinancialReportingGroup(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  newParentId: string | null,
) {
  requireFinanceStructureManage(ctx);
  const node = await getGroupOrThrow(db, ctx, id);
  if (node.lifecycle === "ARCHIVED") {
    throw new FinanceDomainError("FINANCE_ARCHIVED", "Archived reporting groups cannot be moved.");
  }
  if (newParentId) {
    const parent = await getGroupOrThrow(db, ctx, newParentId);
    if (parent.lifecycle === "ARCHIVED") {
      throw new FinanceDomainError(
        "FINANCE_ARCHIVED",
        "Cannot reparent under an archived reporting group.",
      );
    }
  }

  const all = await db.financialReportingGroup.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, parentId: true },
  });
  try {
    assertNoReparentCycle(all, id, newParentId);
  } catch (e) {
    mapHierarchyError(e);
  }

  return db.financialReportingGroup.update({
    where: { id },
    data: { parentId: newParentId },
  });
}

export async function reorderFinancialReportingGroup(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  sortOrder: number,
) {
  requireFinanceStructureManage(ctx);
  await getGroupOrThrow(db, ctx, id);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new FinanceDomainError("FINANCE_INVALID_HIERARCHY", "Invalid sort order.");
  }
  return db.financialReportingGroup.update({
    where: { id },
    data: { sortOrder },
  });
}

export async function archiveFinancialReportingGroup(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
) {
  requireFinanceStructureManage(ctx);
  await getGroupOrThrow(db, ctx, id);
  return db.financialReportingGroup.update({
    where: { id },
    data: { lifecycle: "ARCHIVED", archivedAt: new Date() },
  });
}

export async function reactivateFinancialReportingGroup(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
) {
  requireFinanceStructureManage(ctx);
  await getGroupOrThrow(db, ctx, id);
  return db.financialReportingGroup.update({
    where: { id },
    data: { lifecycle: "ACTIVE", archivedAt: null },
  });
}

export async function deleteFinancialReportingGroupWhenSafe(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
) {
  requireFinanceStructureManage(ctx);
  await getGroupOrThrow(db, ctx, id);

  const childGroupCount = await db.financialReportingGroup.count({
    where: { tenantId: ctx.tenantId, parentId: id },
  });
  if (childGroupCount > 0) {
    throw new FinanceDomainError(
      "FINANCE_UNSAFE_DELETE",
      "Remove or reparent child reporting groups before deleting this group.",
    );
  }

  const accountCount = await db.financialAccount.count({
    where: { tenantId: ctx.tenantId, reportingGroupId: id },
  });
  if (accountCount > 0) {
    throw new FinanceDomainError(
      "FINANCE_UNSAFE_DELETE",
      "Remove or move financial accounts before deleting this reporting group.",
    );
  }

  const guard = await evaluateFinancialStructureDeleteGuards({
    tenantId: ctx.tenantId,
    entityType: "FinancialReportingGroup",
    entityId: id,
  });
  if (!guard.allowed) {
    throw new FinanceDomainError("FINANCE_UNSAFE_DELETE", guard.reason);
  }

  await db.financialReportingGroup.delete({ where: { id } });
  return { deleted: true as const };
}

export async function listFinancialReportingGroups(db: Db, ctx: FinanceAuthContext) {
  requireFinanceView(ctx);
  return db.financialReportingGroup.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
