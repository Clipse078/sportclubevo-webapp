import type { PrismaClient } from "@prisma/client";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceStructureManage,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { assertNoReparentCycle, nextSortOrder } from "@/lib/finance/hierarchy/tree-utils";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<PrismaClient, "financialReportingGroup">;

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
  if (parentId) await getGroupOrThrow(db, ctx, parentId);

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

export async function reparentFinancialReportingGroup(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  newParentId: string | null,
) {
  requireFinanceStructureManage(ctx);
  await getGroupOrThrow(db, ctx, id);
  if (newParentId) await getGroupOrThrow(db, ctx, newParentId);

  const all = await db.financialReportingGroup.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, parentId: true },
  });
  assertNoReparentCycle(all, id, newParentId);

  return db.financialReportingGroup.update({
    where: { id },
    data: { parentId: newParentId },
  });
}

export async function listFinancialReportingGroups(db: Db, ctx: FinanceAuthContext) {
  requireFinanceStructureManage(ctx);
  return db.financialReportingGroup.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
