import { prisma } from "@/lib/db/prisma";
import {
  registerFinancialStructureDeleteGuard,
  type FinancialStructureDeleteGuard,
} from "@/lib/finance/structure/delete-guards";

const budgetLineDeleteGuard: FinancialStructureDeleteGuard = async (ctx) => {
  if (ctx.entityType !== "FinancialAccount") {
    return { allowed: true };
  }

  const count = await prisma.financeBudgetLine.count({
    where: {
      financialAccountId: ctx.entityId,
      budgetVersion: { budget: { tenantId: ctx.tenantId } },
    },
  });

  if (count > 0) {
    return {
      allowed: false,
      reason:
        "This account is referenced by a budget line. Archive the account or remove budget references first.",
    };
  }

  return { allowed: true };
};

registerFinancialStructureDeleteGuard(budgetLineDeleteGuard);
