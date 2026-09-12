import type { Camt054ReconciliationReport } from "./camt054-reconciliation-types";

export function serializeCamt054ReconciliationReport(
  report: Camt054ReconciliationReport,
): Record<string, unknown> {
  return {
    legalEntityKey: report.legalEntityKey,
    messageId: report.messageId,
    dryRun: report.dryRun,
    appliedCount: report.appliedCount,
    skippedCount: report.skippedCount,
    entries: report.entries.map((entry) => ({
      bankTransactionId: entry.bankTransactionId,
      outcome: entry.outcome,
      invoiceKey: entry.invoiceKey,
      invoiceNumber: entry.invoiceNumber,
      paymentKey: entry.paymentKey,
      message: entry.message,
      transaction: {
        amountMinor: entry.transaction.amountMinor,
        currency: entry.transaction.currency,
        paymentDate: entry.transaction.paymentDate,
        creditorReference: entry.transaction.creditorReference,
        referenceType: entry.transaction.referenceType,
        rejected: entry.transaction.rejected,
      },
    })),
  };
}
