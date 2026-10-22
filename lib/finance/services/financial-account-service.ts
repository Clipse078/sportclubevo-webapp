import type { CanonicalAccountSemantic, PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceStructureManage,
  requireFinanceView,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { nextSortOrder } from "@/lib/finance/hierarchy/tree-utils";
import { assertSameTenant } from "@/lib/finance/tenant-scope";
import { isFinanceStructureAccountSemantic } from "@/lib/finance/structure/structure-presentation";
import { evaluateFinancialStructureDeleteGuards } from "@/lib/finance/structure/delete-guards";

type Db = Pick<PrismaClient, "financialAccount" | "financialReportingGroup">;

async function getReportingGroupOrThrow(db: Db, ctx: FinanceAuthContext, id: string) {
  const row = await db.financialReportingGroup.findUnique({ where: { id } });
  if (!row) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Reporting group not found.", 404);
  }
  assertSameTenant(row.tenantId, ctx.tenantId, "Reporting group");
  return row;
}

async function getAccountOrThrow(db: Db, ctx: FinanceAuthContext, id: string) {
  const row = await db.financialAccount.findUnique({ where: { id } });
  if (!row) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial account not found.", 404);
  }
  assertSameTenant(row.tenantId, ctx.tenantId, "Financial account");
  return row;
}

function assertStructureSemantic(value: CanonicalAccountSemantic): void {
  if (!isFinanceStructureAccountSemantic(value)) {
    throw new FinanceDomainError(
      "FINANCE_INVALID_HIERARCHY",
      "Only INCOME and EXPENSE account semantics are available in this release.",
    );
  }
}

export async function createFinancialAccount(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    name: string;
    reportingGroupId: string;
    canonicalSemantic: CanonicalAccountSemantic;
  },
) {
  requireFinanceStructureManage(ctx);
  assertStructureSemantic(input.canonicalSemantic);
  const group = await getReportingGroupOrThrow(db, ctx, input.reportingGroupId);
  if (group.lifecycle === "ARCHIVED") {
    throw new FinanceDomainError(
      "FINANCE_ARCHIVED",
      "Cannot add an account under an archived reporting group.",
    );
  }

  const siblings = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId, reportingGroupId: input.reportingGroupId },
    select: { sortOrder: true },
  });

  return db.financialAccount.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name.trim(),
      reportingGroupId: input.reportingGroupId,
      nodeKind: "POSTING",
      canonicalSemantic: input.canonicalSemantic,
      sortOrder: nextSortOrder(siblings),
    },
  });
}

export async function renameFinancialAccount(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  name: string,
) {
  requireFinanceStructureManage(ctx);
  await getAccountOrThrow(db, ctx, id);
  return db.financialAccount.update({
    where: { id },
    data: { name: name.trim() },
  });
}

export async function moveFinancialAccountToReportingGroup(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  reportingGroupId: string,
) {
  requireFinanceStructureManage(ctx);
  const account = await getAccountOrThrow(db, ctx, id);
  if (account.lifecycle === "ARCHIVED") {
    throw new FinanceDomainError("FINANCE_ARCHIVED", "Archived accounts cannot be moved.");
  }
  const group = await getReportingGroupOrThrow(db, ctx, reportingGroupId);
  if (group.lifecycle === "ARCHIVED") {
    throw new FinanceDomainError(
      "FINANCE_ARCHIVED",
      "Cannot move an account into an archived reporting group.",
    );
  }

  const siblings = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId, reportingGroupId },
    select: { sortOrder: true },
  });

  return db.financialAccount.update({
    where: { id },
    data: {
      reportingGroupId,
      sortOrder: nextSortOrder(siblings),
    },
  });
}

export async function reorderFinancialAccount(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  sortOrder: number,
) {
  requireFinanceStructureManage(ctx);
  await getAccountOrThrow(db, ctx, id);
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new FinanceDomainError("FINANCE_INVALID_HIERARCHY", "Invalid sort order.");
  }
  return db.financialAccount.update({
    where: { id },
    data: { sortOrder },
  });
}

export async function archiveFinancialAccount(db: Db, ctx: FinanceAuthContext, id: string) {
  requireFinanceStructureManage(ctx);
  await getAccountOrThrow(db, ctx, id);
  return db.financialAccount.update({
    where: { id },
    data: { lifecycle: "ARCHIVED", archivedAt: new Date() },
  });
}

export async function reactivateFinancialAccount(db: Db, ctx: FinanceAuthContext, id: string) {
  requireFinanceStructureManage(ctx);
  await getAccountOrThrow(db, ctx, id);
  return db.financialAccount.update({
    where: { id },
    data: { lifecycle: "ACTIVE", archivedAt: null },
  });
}

export async function deleteFinancialAccountWhenSafe(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
) {
  requireFinanceStructureManage(ctx);
  await getAccountOrThrow(db, ctx, id);

  const guard = await evaluateFinancialStructureDeleteGuards({
    tenantId: ctx.tenantId,
    entityType: "FinancialAccount",
    entityId: id,
  });
  if (!guard.allowed) {
    throw new FinanceDomainError("FINANCE_UNSAFE_DELETE", guard.reason);
  }

  await db.financialAccount.delete({ where: { id } });
  return { deleted: true as const };
}

export async function listFinancialAccounts(db: Db, ctx: FinanceAuthContext) {
  requireFinanceView(ctx);
  return db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/** Rename preserves stable id — exposed for tests documenting identity semantics. */
export async function getFinancialAccountIdentity(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
) {
  requireFinanceView(ctx);
  return getAccountOrThrow(db, ctx, id);
}
