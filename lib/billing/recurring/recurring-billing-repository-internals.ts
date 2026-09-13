import { prisma } from "@/lib/db/prisma";
import type { BillingContractRecord, InvoiceRecord } from "../native-billing-commercial-types";

export const contractSelect = {
  id: true,
  key: true,
  contractNumber: true,
  legalEntityId: true,
  billingCustomerId: true,
  billingProductId: true,
  productName: true,
  productDescription: true,
  status: true,
  currency: true,
  monthlyNetAmountMinor: true,
  billingInterval: true,
  vatTreatment: true,
  startDate: true,
  endDate: true,
  minimumTermMonths: true,
  paymentTermsDays: true,
  invoiceRecipientProfileId: true,
  description: true,
  internalNote: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listActiveBillingContractsForRecurring(
  contractKeys?: string[],
): Promise<Array<BillingContractRecord & { customerKey: string; customerName: string }>> {
  const rows = await prisma.billingContract.findMany({
    where: {
      status: "ACTIVE",
      billingInterval: "MONTHLY",
      ...(contractKeys?.length ? { key: { in: contractKeys } } : {}),
    },
    orderBy: [{ contractNumber: "asc" }],
    select: {
      ...contractSelect,
      billingCustomer: {
        select: { key: true, displayName: true },
      },
    },
  });

  return rows.map((row) => {
    const { billingCustomer, ...contract } = row;
    return {
      ...contract,
      customerKey: billingCustomer.key,
      customerName: billingCustomer.displayName,
    };
  });
}

export async function findNonVoidInvoiceForContractPeriod(input: {
  billingContractId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<InvoiceRecord | null> {
  return prisma.invoice.findFirst({
    where: {
      billingContractId: input.billingContractId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      status: { not: "VOID" },
    },
    select: {
      id: true,
      key: true,
      invoiceNumber: true,
      legalEntityId: true,
      billingCustomerId: true,
      billingContractId: true,
      status: true,
      currency: true,
      periodStart: true,
      periodEnd: true,
      invoiceDate: true,
      dueDate: true,
      paymentTermsDays: true,
      netTotalMinor: true,
      vatTotalMinor: true,
      grossTotalMinor: true,
      contractLabel: true,
      finalizedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
