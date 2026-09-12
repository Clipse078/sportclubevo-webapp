import { formatPaymentReferenceDisplay } from "@/lib/billing/invoice-payment-instruction-serializers";
import { matchMethodLabel, matchStatusLabel } from "./camt054-match-mapping";
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
    matchedCount: report.matchedCount,
    unmatchedCount: report.unmatchedCount,
    reviewRequiredCount: report.reviewRequiredCount,
    duplicateCount: report.duplicateCount,
    errorCount: report.errorCount,
    importKey: report.importKey,
    entries: report.entries.map((entry) => ({
      bankTransactionId: entry.bankTransactionId,
      outcome: entry.outcome,
      invoiceKey: entry.invoiceKey,
      invoiceNumber: entry.invoiceNumber,
      paymentKey: entry.paymentKey,
      message: entry.message,
      matchStatus: entry.matchStatus,
      matchStatusLabel: matchStatusLabel(entry.matchStatus),
      matchMethod: entry.matchMethod,
      matchMethodLabel: matchMethodLabel(entry.matchMethod),
      transaction: {
        amountMinor: entry.transaction.amountMinor,
        currency: entry.transaction.currency,
        paymentDate: entry.transaction.paymentDate,
        creditorReference: entry.transaction.creditorReference,
        creditorReferenceFormatted:
          entry.transaction.creditorReference && entry.transaction.referenceType === "QRR"
            ? formatPaymentReferenceDisplay("QRR", entry.transaction.creditorReference)
            : entry.transaction.creditorReference,
        referenceType: entry.transaction.referenceType,
        rejected: entry.transaction.rejected,
        debtorName: entry.transaction.debtorName,
      },
    })),
  };
}
