import { prisma } from "@/lib/db/prisma";
import type { BillingContractRecord } from "../native-billing-commercial-types";

export {
  findNonVoidInvoiceForContractPeriod,
  listActiveBillingContractsForRecurring,
} from "./recurring-billing-repository-internals";

export async function createBillingRecurringRunRecord(input: {
  key: string;
  mode: "DRY_RUN" | "EXECUTE";
  trigger: "CRON" | "MANUAL";
  status: "COMPLETED" | "FAILED";
  asOfDate: Date;
  deliverAutomatically: boolean;
  summaryJson: unknown;
  createdByUserId: string | null;
  completedAt: Date;
}) {
  return prisma.billingRecurringRun.create({
    data: {
      key: input.key,
      mode: input.mode,
      trigger: input.trigger,
      status: input.status,
      asOfDate: input.asOfDate,
      deliverAutomatically: input.deliverAutomatically,
      summaryJson: input.summaryJson as object,
      createdByUserId: input.createdByUserId,
      completedAt: input.completedAt,
    },
  });
}

export async function findLatestBillingRecurringRun() {
  return prisma.billingRecurringRun.findFirst({
    orderBy: { startedAt: "desc" },
  });
}

export async function listRecentBillingRecurringRuns(limit = 20) {
  return prisma.billingRecurringRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

export type ActiveContractWithCustomer = BillingContractRecord & {
  customerKey: string;
  customerName: string;
};
