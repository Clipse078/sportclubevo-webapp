import { prisma } from "@/lib/db/prisma";
import {
  registerFinancialStructureDeleteGuard,
  type FinancialStructureDeleteGuard,
} from "@/lib/finance/structure/delete-guards";

const actualEntryDeleteGuard: FinancialStructureDeleteGuard = async (ctx) => {
  if (ctx.entityType !== "FinancialAccount") {
    return { allowed: true };
  }

  const count = await prisma.financeActualEntry.count({
    where: {
      financialAccountId: ctx.entityId,
      tenantId: ctx.tenantId,
    },
  });

  if (count > 0) {
    return {
      allowed: false,
      reason:
        "This account is referenced by management actual entries. Archive the account to stop new entries while preserving history.",
    };
  }

  return { allowed: true };
};

registerFinancialStructureDeleteGuard(actualEntryDeleteGuard);
