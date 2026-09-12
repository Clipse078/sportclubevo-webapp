import { prisma } from "@/lib/db/prisma";
import { formatPaymentReferenceDisplay } from "@/lib/billing/invoice-payment-instruction-serializers";
import { NativeBillingNotFoundError } from "@/lib/billing/native-billing-types";
import { matchMethodLabel, matchStatusLabel } from "./camt054-match-mapping";
import {
  findBankReconciliationImportByKey,
  listBankReconciliationImportsForLegalEntity,
  listBankReconciliationTransactionsForImport,
} from "./camt054-reconciliation-repository";

export async function getCamt054ReconciliationOverview(legalEntityKey: string) {
  const legalEntity = await prisma.legalEntity.findUnique({
    where: { key: legalEntityKey },
    select: { id: true, key: true, displayName: true },
  });
  if (!legalEntity) {
    throw new NativeBillingNotFoundError("Rechtsträger nicht gefunden.");
  }

  const imports = await listBankReconciliationImportsForLegalEntity(legalEntity.id);

  return {
    legalEntity,
    imports: imports.map((row) => ({
      key: row.key,
      filename: row.filename,
      uploadedAt: row.uploadedAt.toISOString(),
      transactionCount: row.transactionCount,
      matchedCount: row.matchedCount,
      unmatchedCount: row.unmatchedCount,
      reviewRequiredCount: row.reviewRequiredCount,
      duplicateCount: row.duplicateCount,
      status: row.status,
    })),
  };
}

export async function getCamt054ReconciliationImportDetail(importKey: string) {
  const importRow = await findBankReconciliationImportByKey(importKey);
  if (!importRow) {
    throw new NativeBillingNotFoundError("Import nicht gefunden.");
  }

  const legalEntity = await prisma.legalEntity.findUnique({
    where: { id: importRow.legalEntityId },
    select: { key: true, displayName: true },
  });

  const transactions = await listBankReconciliationTransactionsForImport(importRow.id);
  const invoiceIds = transactions.map((t) => t.invoiceId).filter(Boolean) as string[];
  const invoices =
    invoiceIds.length > 0
      ? await prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: { id: true, key: true, invoiceNumber: true },
        })
      : [];
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));

  return {
    import: {
      key: importRow.key,
      filename: importRow.filename,
      uploadedAt: importRow.uploadedAt.toISOString(),
      processedAt: importRow.processedAt?.toISOString() ?? null,
      camtMessageId: importRow.camtMessageId,
      status: importRow.status,
      transactionCount: importRow.transactionCount,
      matchedCount: importRow.matchedCount,
      unmatchedCount: importRow.unmatchedCount,
      reviewRequiredCount: importRow.reviewRequiredCount,
      duplicateCount: importRow.duplicateCount,
      errorCount: importRow.errorCount,
      legalEntityKey: legalEntity?.key ?? null,
      legalEntityName: legalEntity?.displayName ?? null,
    },
    transactions: transactions.map((tx) => {
      const invoice = tx.invoiceId ? invoiceById.get(tx.invoiceId) : undefined;
      const referenceFormatted =
        tx.creditorReference && tx.referenceType === "QRR"
          ? formatPaymentReferenceDisplay("QRR", tx.creditorReference)
          : tx.creditorReference;
      return {
        key: tx.key,
        paymentDate: tx.paymentDate.toISOString().slice(0, 10),
        amountMinor: tx.amountMinor,
        currency: tx.currency,
        creditorReferenceFormatted: referenceFormatted,
        debtorName: tx.debtorName,
        invoiceKey: invoice?.key ?? null,
        invoiceNumber: invoice?.invoiceNumber ?? null,
        matchStatus: tx.matchStatus,
        matchStatusLabel: matchStatusLabel(tx.matchStatus),
        matchMethod: tx.matchMethod,
        matchMethodLabel: matchMethodLabel(tx.matchMethod),
        matchReason: tx.matchReason,
        paymentKey: null,
      };
    }),
  };
}
