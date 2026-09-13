import { prisma } from "@/lib/db/prisma";
import {
  Camt054PreviewRuntimeConflictError,
  type Camt054PreviewRuntimeDiagnostics,
} from "./camt054-reconciliation-database-alignment";

export const CAMT054_ACCEPTANCE_LEGAL_ENTITY_KEY =
  "sportclubevo-by-tulip-digital";
export const CAMT054_ACCEPTANCE_INVOICE_NUMBER = "2026-000004";

/**
 * Verifies the synthetic acceptance contract through the same lazy Prisma
 * facade used by the matcher. It selects only presence metadata and never
 * reads or returns the QRR value.
 */
export async function attestCamt054PreviewAcceptanceData(
  diagnostics: Camt054PreviewRuntimeDiagnostics,
): Promise<Camt054PreviewRuntimeDiagnostics> {
  let legalEntityFound = false;
  let acceptanceInvoiceFound = false;
  let acceptancePaymentInstructionFound = false;

  try {
    const legalEntity = await prisma.legalEntity.findUnique({
      where: { key: CAMT054_ACCEPTANCE_LEGAL_ENTITY_KEY },
      select: { id: true },
    });
    legalEntityFound = Boolean(legalEntity);

    if (legalEntity) {
      const invoice = await prisma.invoice.findUnique({
        where: {
          legalEntityId_invoiceNumber: {
            legalEntityId: legalEntity.id,
            invoiceNumber: CAMT054_ACCEPTANCE_INVOICE_NUMBER,
          },
        },
        select: {
          id: true,
          paymentInstruction: {
            select: {
              paymentMethod: true,
              referenceType: true,
            },
          },
        },
      });
      acceptanceInvoiceFound = Boolean(invoice);
      acceptancePaymentInstructionFound =
        invoice?.paymentInstruction?.paymentMethod ===
          "BANK_TRANSFER_SWISS_QR" &&
        invoice.paymentInstruction.referenceType === "QRR";
    }
  } catch {
    // Fail closed with safe presence flags. Database errors are intentionally
    // not reflected into the HTTP response.
  }

  const attested = {
    ...diagnostics,
    legalEntityFound,
    acceptanceInvoiceFound,
    acceptancePaymentInstructionFound,
  };

  if (
    !legalEntityFound ||
    !acceptanceInvoiceFound ||
    !acceptancePaymentInstructionFound
  ) {
    throw new Camt054PreviewRuntimeConflictError(
      "Die synthetischen STAGE-Akzeptanzdaten sind in der Preview-Laufzeit nicht verfügbar. " +
        "Der Bankabgleich wurde aus Sicherheitsgründen nicht ausgeführt.",
      "STAGE_ACCEPTANCE_DATA_MISSING",
      attested,
    );
  }

  return attested;
}
