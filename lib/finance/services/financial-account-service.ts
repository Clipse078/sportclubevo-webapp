import type { CanonicalAccountSemantic, FinancialAccountNodeKind, PrismaClient } from "@prisma/client";
import { CANONICAL_ACCOUNT_SEMANTICS } from "@/lib/finance/finance-architecture";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  requireFinanceStructureManage,
  type FinanceAuthContext,
} from "@/lib/finance/finance-authorization";
import { assertNoReparentCycle, nextSortOrder } from "@/lib/finance/hierarchy/tree-utils";
import { assertSameTenant } from "@/lib/finance/tenant-scope";

type Db = Pick<PrismaClient, "financialAccount">;

function assertCanonicalSemantic(value: CanonicalAccountSemantic): void {
  if (!(CANONICAL_ACCOUNT_SEMANTICS as readonly string[]).includes(value)) {
    throw new FinanceDomainError("FINANCE_INVALID_HIERARCHY", "Invalid account semantic.");
  }
}

async function getAccountOrThrow(db: Db, ctx: FinanceAuthContext, id: string) {
  const row = await db.financialAccount.findUnique({ where: { id } });
  if (!row) {
    throw new FinanceDomainError("FINANCE_NOT_FOUND", "Financial account not found.", 404);
  }
  assertSameTenant(row.tenantId, ctx.tenantId, "Financial account");
  return row;
}

export async function createFinancialAccount(
  db: Db,
  ctx: FinanceAuthContext,
  input: {
    name: string;
    parentId?: string | null;
    nodeKind?: FinancialAccountNodeKind;
    canonicalSemantic: CanonicalAccountSemantic;
  },
) {
  requireFinanceStructureManage(ctx);
  assertCanonicalSemantic(input.canonicalSemantic);
  const parentId = input.parentId ?? null;
  if (parentId) await getAccountOrThrow(db, ctx, parentId);

  const siblings = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId, parentId },
    select: { sortOrder: true },
  });

  return db.financialAccount.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name.trim(),
      parentId,
      nodeKind: input.nodeKind ?? "GROUP",
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

export async function reparentFinancialAccount(
  db: Db,
  ctx: FinanceAuthContext,
  id: string,
  newParentId: string | null,
) {
  requireFinanceStructureManage(ctx);
  await getAccountOrThrow(db, ctx, id);
  if (newParentId) await getAccountOrThrow(db, ctx, newParentId);

  const all = await db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, parentId: true },
  });
  assertNoReparentCycle(all, id, newParentId);

  return db.financialAccount.update({
    where: { id },
    data: { parentId: newParentId },
  });
}

export async function listFinancialAccounts(db: Db, ctx: FinanceAuthContext) {
  requireFinanceStructureManage(ctx);
  return db.financialAccount.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
