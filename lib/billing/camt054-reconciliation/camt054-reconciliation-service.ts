import { logAction } from "@/lib/audit/log-action";
import { parseCamt054Xml } from "@/lib/billing/camt054/parse-camt054-xml";
import { findConfirmedPaymentByBankTransactionId } from "@/lib/billing/invoice-payments/invoice-payment-repository";
import { recordCamt054InvoicePayment } from "@/lib/billing/invoice-payments/invoice-payment-service";
import {
  NATIVE_BILLING_AUDIT_ACTIONS,
  NATIVE_BILLING_AUDIT_MODULE,
} from "@/lib/billing/native-billing-audit";
import { findLegalEntityByKey } from "@/lib/billing/native-billing-repository";
import { NativeBillingNotFoundError } from "@/lib/billing/native-billing-types";
import {
  findInvoiceForCamt054QrrReference,
  isCamt054InvoicePayable,
} from "./camt054-invoice-matcher";
import type {
  Camt054ReconciliationEntryResult,
  Camt054ReconciliationReport,
  ReconcileCamt054Input,
} from "./camt054-reconciliation-types";

function buildEntry(
  partial: Omit<Camt054ReconciliationEntryResult, "transaction"> & {
    transaction: Camt054ReconciliationEntryResult["transaction"];
  },
): Camt054ReconciliationEntryResult {
  return partial;
}

export async function reconcileCamt054Statement(
  input: ReconcileCamt054Input,
): Promise<Camt054ReconciliationReport> {
  const legalEntity = await findLegalEntityByKey(input.legalEntityKey);
  if (!legalEntity) {
    throw new NativeBillingNotFoundError("Rechtsträger nicht gefunden.");
  }

  const parsed = parseCamt054Xml(input.xml);
  const entries: Camt054ReconciliationEntryResult[] = [];
  let appliedCount = 0;
  let skippedCount = 0;

  for (const transaction of parsed.transactions) {
    const existing = await findConfirmedPaymentByBankTransactionId(
      transaction.bankTransactionId,
    );
    if (existing) {
      skippedCount += 1;
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_duplicate",
          transaction,
          invoiceKey: null,
          invoiceNumber: null,
          paymentKey: existing.key,
          message: "Banktransaktion wurde bereits verbucht.",
        }),
      );
      continue;
    }

    if (transaction.rejected) {
      skippedCount += 1;
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_rejected",
          transaction,
          invoiceKey: null,
          invoiceNumber: null,
          paymentKey: null,
          message: "Bankmeldung markiert als abgelehnt.",
        }),
      );
      continue;
    }

    if (!transaction.creditorReference) {
      skippedCount += 1;
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_no_reference",
          transaction,
          invoiceKey: null,
          invoiceNumber: null,
          paymentKey: null,
          message: "Keine strukturierte Referenz vorhanden.",
        }),
      );
      continue;
    }

    if (transaction.referenceType !== "QRR") {
      skippedCount += 1;
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_unsupported_reference",
          transaction,
          invoiceKey: null,
          invoiceNumber: null,
          paymentKey: null,
          message: "Nur QRR-Referenzen werden in SWISS-01H unterstützt.",
        }),
      );
      continue;
    }

    const matched = await findInvoiceForCamt054QrrReference(
      transaction.creditorReference,
    );
    if (!matched) {
      skippedCount += 1;
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "unmatched_invoice",
          transaction,
          invoiceKey: null,
          invoiceNumber: null,
          paymentKey: null,
          message: "Keine Rechnung zur QRR-Referenz gefunden.",
        }),
      );
      continue;
    }

    if (matched.legalEntityId !== legalEntity.id) {
      skippedCount += 1;
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "unmatched_legal_entity",
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          paymentKey: null,
          message: "Rechnung gehört zu einem anderen Rechtsträger.",
        }),
      );
      continue;
    }

    if (matched.currency.toUpperCase() !== transaction.currency.toUpperCase()) {
      skippedCount += 1;
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_currency_mismatch",
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          paymentKey: null,
          message: "Währung stimmt nicht mit der Rechnung überein.",
        }),
      );
      continue;
    }

    if (!isCamt054InvoicePayable(matched.status)) {
      skippedCount += 1;
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_invoice_not_payable",
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          paymentKey: null,
          message: "Rechnung ist nicht zahlbar.",
        }),
      );
      continue;
    }

    if (input.dryRun) {
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "planned",
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          paymentKey: null,
          message: "Würde als camt.054 Zahlung verbucht werden.",
        }),
      );
      continue;
    }

    try {
      const result = await recordCamt054InvoicePayment({
        invoiceKey: matched.invoiceKey,
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        paymentDate: transaction.paymentDate,
        creditorReference: transaction.creditorReference,
        bankTransactionId: transaction.bankTransactionId,
        externalReference: parsed.messageId,
        actorUserId: input.actorUserId,
      });
      appliedCount += 1;
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "applied",
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          paymentKey: result.payment.key,
          message: null,
        }),
      );
    } catch (error) {
      skippedCount += 1;
      const message =
        error instanceof Error ? error.message : "Zahlung konnte nicht verbucht werden.";
      const outcome =
        message === "Der Betrag übersteigt den offenen Rechnungsbetrag."
          ? "skipped_overpayment"
          : "skipped_invoice_not_payable";
      entries.push(
        buildEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome,
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          paymentKey: null,
          message,
        }),
      );
    }
  }

  const report: Camt054ReconciliationReport = {
    legalEntityKey: input.legalEntityKey,
    messageId: parsed.messageId,
    dryRun: input.dryRun,
    appliedCount,
    skippedCount,
    entries,
  };

  if (!input.dryRun && appliedCount > 0) {
    void logAction({
      actorUserId: input.actorUserId,
      moduleKey: NATIVE_BILLING_AUDIT_MODULE,
      entityType: "Camt054Reconciliation",
      entityId: legalEntity.id,
      action: NATIVE_BILLING_AUDIT_ACTIONS.CAMT054_RECONCILIATION_APPLIED,
      afterJson: {
        legalEntityKey: input.legalEntityKey,
        messageId: parsed.messageId,
        appliedCount,
        skippedCount,
        transactionCount: parsed.transactions.length,
      },
    });
  }

  return report;
}
