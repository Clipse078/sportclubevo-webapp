import { prisma } from "@/lib/db/prisma";
import type { InvoiceStatus } from "@prisma/client";

const PAYABLE_STATUSES: ReadonlySet<InvoiceStatus> = new Set([
  "FINALIZED",
  "OPEN",
  "PARTIALLY_PAID",
  "OVERDUE",
]);

export type Camt054MatchedInvoice = {
  invoiceId: string;
  invoiceKey: string;
  invoiceNumber: string | null;
  legalEntityId: string;
  currency: string;
  grossTotalMinor: number;
  status: InvoiceStatus;
  paymentInstructionId: string | null;
};

export async function findInvoiceForCamt054QrrReference(
  creditorReference: string,
): Promise<Camt054MatchedInvoice | null> {
  const normalized = creditorReference.replace(/\s+/g, "");
  if (!normalized) return null;

  const instruction = await prisma.invoicePaymentInstruction.findFirst({
    where: {
      referenceType: "QRR",
      reference: normalized,
    },
    select: {
      id: true,
      invoiceId: true,
      currency: true,
      invoice: {
        select: {
          id: true,
          key: true,
          invoiceNumber: true,
          legalEntityId: true,
          currency: true,
          grossTotalMinor: true,
          status: true,
        },
      },
    },
  });

  if (!instruction?.invoice) {
    return null;
  }

  return {
    invoiceId: instruction.invoice.id,
    invoiceKey: instruction.invoice.key,
    invoiceNumber: instruction.invoice.invoiceNumber,
    legalEntityId: instruction.invoice.legalEntityId,
    currency: instruction.invoice.currency,
    grossTotalMinor: instruction.invoice.grossTotalMinor,
    status: instruction.invoice.status,
    paymentInstructionId: instruction.id,
  };
}

export function isCamt054InvoicePayable(status: InvoiceStatus): boolean {
  return PAYABLE_STATUSES.has(status);
}
