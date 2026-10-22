import type { PrismaClient } from "@prisma/client";
import { requireFinanceView, type FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { buildFinanceStructureTree } from "@/lib/finance/structure/build-structure-tree";
import { listFinancialAccounts } from "@/lib/finance/services/financial-account-service";
import { listFinancialReportingGroups } from "@/lib/finance/services/financial-reporting-group-service";

type Db = Pick<PrismaClient, "financialReportingGroup" | "financialAccount">;

export async function loadFinanceStructureSnapshot(db: Db, ctx: FinanceAuthContext) {
  requireFinanceView(ctx);
  const [groups, accounts] = await Promise.all([
    listFinancialReportingGroups(db, ctx),
    listFinancialAccounts(db, ctx),
  ]);
  return {
    groups,
    accounts,
    tree: buildFinanceStructureTree({ groups, accounts }),
    isEmpty: groups.length === 0 && accounts.length === 0,
  };
}
