import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { logAction } from "@/lib/audit/log-action";
import { prisma } from "@/lib/db/prisma";
import { parseCamt054Xml } from "@/lib/billing/camt054/parse-camt054-xml";
import { findConfirmedPaymentByBankTransactionId } from "@/lib/billing/invoice-payments/invoice-payment-repository";
import { recordCamt054InvoicePayment } from "@/lib/billing/invoice-payments/invoice-payment-service";
import {
  NATIVE_BILLING_AUDIT_ACTIONS,
  NATIVE_BILLING_AUDIT_MODULE,
} from "@/lib/billing/native-billing-audit";
import { logBillingOperationalEvent } from "@/lib/billing/operations/billing-operational-log";
import {
  findLegalEntityByKey,
  listBillingBankAccountsForLegalEntity,
} from "@/lib/billing/native-billing-repository";
import { normalizeBillingBankAccountIban } from "@/lib/billing/billing-bank-account-fingerprint";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
} from "@/lib/billing/native-billing-types";
import { assertCamt054ReconciliationDatabaseAlignment } from "./camt054-reconciliation-database-alignment";
import { classifyCamt054EntryOutcome } from "./camt054-match-mapping";
import { sha256Camt054Content } from "./camt054-upload-limits";
import {
  createBankReconciliationImportWithTransactions,
  deriveImportStatus,
  findBankReconciliationImportByContentHash,
} from "./camt054-reconciliation-repository";
import {
  findInvoiceForCamt054QrrReference,
  isCamt054InvoicePayable,
} from "./camt054-invoice-matcher";
import type {
  Camt054ReconciliationEntryOutcome,
  Camt054ReconciliationEntryResult,
  Camt054ReconciliationReport,
  ReconcileCamt054Input,
} from "./camt054-reconciliation-types";

type EntryDraft = {
  bankTransactionId: string;
  outcome: Camt054ReconciliationEntryOutcome;
  transaction: Camt054ReconciliationEntryResult["transaction"];
  invoiceKey: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  paymentInstructionId: string | null;
  paymentKey: string | null;
  paymentId: string | null;
  invoiceId: string | null;
  message: string | null;
};

function buildEntry(draft: EntryDraft): Camt054ReconciliationEntryResult {
  const { matchStatus, matchMethod } = classifyCamt054EntryOutcome(
    draft.outcome,
    draft.invoiceStatus,
  );
  return {
    ...draft,
    matchStatus,
    matchMethod,
  };
}

function countEntryBuckets(entries: Camt054ReconciliationEntryResult[]) {
  let matchedCount = 0;
  let unmatchedCount = 0;
  let reviewRequiredCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  for (const entry of entries) {
    switch (entry.matchStatus) {
      case "MATCHED":
        matchedCount += 1;
        break;
      case "UNMATCHED":
        unmatchedCount += 1;
        break;
      case "REVIEW_REQUIRED":
        reviewRequiredCount += 1;
        break;
      case "DUPLICATE":
        duplicateCount += 1;
        break;
      case "ERROR":
        errorCount += 1;
        break;
      default:
        break;
    }
  }
  return { matchedCount, unmatchedCount, reviewRequiredCount, duplicateCount, errorCount };
}

export async function reconcileCamt054Statement(
  input: ReconcileCamt054Input,
  transactionClient?: Prisma.TransactionClient,
): Promise<Camt054ReconciliationReport> {
  if (!input.dryRun && !transactionClient) {
    return prisma.$transaction(
      (tx) => reconcileCamt054Statement(input, tx),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // Preview alignment must be proven before the first reconciliation database
  // lookup; otherwise a wrong database can masquerade as QRR_NOT_FOUND.
  const previewDiagnostics = assertCamt054ReconciliationDatabaseAlignment(
    process.env,
    input.legalEntityKey,
  );

  const legalEntity = transactionClient
    ? await findLegalEntityByKey(input.legalEntityKey, transactionClient)
    : await findLegalEntityByKey(input.legalEntityKey);
  if (!legalEntity) {
    throw new NativeBillingNotFoundError("Rechtsträger nicht gefunden.");
  }

  const contentSha256 = input.contentSha256 ?? sha256Camt054Content(input.xml);

  if (!input.dryRun) {
    if (!input.filename?.trim()) {
      throw new NativeBillingConflictError("Dateiname ist für den Import erforderlich.");
    }
    const existingImport = await findBankReconciliationImportByContentHash(
      legalEntity.id,
      contentSha256,
      transactionClient,
    );
    if (existingImport) {
      throw new NativeBillingConflictError(
        "Diese camt.054 Datei wurde bereits importiert.",
      );
    }
  }

  const parsed = parseCamt054Xml(input.xml);
  if (parsed.accountIdentification) {
    const accounts = transactionClient
      ? await listBillingBankAccountsForLegalEntity(
          legalEntity.id,
          transactionClient,
        )
      : await listBillingBankAccountsForLegalEntity(legalEntity.id);
    const statementAccount = normalizeBillingBankAccountIban(
      parsed.accountIdentification,
    );
    const accountMatches = accounts.some(
      (account) =>
        normalizeBillingBankAccountIban(account.iban) === statementAccount ||
        (account.qrIban
          ? normalizeBillingBankAccountIban(account.qrIban) === statementAccount
          : false),
    );
    if (!accountMatches) {
      throw new NativeBillingConflictError(
        "Das camt.054 Konto gehört nicht zum gewählten Rechtsträger.",
        { code: "CAMT054_ACCOUNT_MISMATCH" },
      );
    }
  }
  const plannedImportKey = input.dryRun ? null : randomUUID();
  if (plannedImportKey) {
    logBillingOperationalEvent("billing.reconciliation.import.started", {
      legalEntityKey: input.legalEntityKey,
      importKey: plannedImportKey,
    });
  }
  const entries: Camt054ReconciliationEntryResult[] = [];
  const entryDrafts: EntryDraft[] = [];
  let appliedCount = 0;
  let skippedCount = 0;

  function pushEntry(draft: EntryDraft): void {
    entryDrafts.push(draft);
    entries.push(buildEntry(draft));
  }

  for (const transaction of parsed.transactions) {
    const existing = await findConfirmedPaymentByBankTransactionId(
      transaction.bankTransactionId,
      transactionClient,
    );
    if (existing) {
      skippedCount += 1;
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_duplicate",
          transaction,
          invoiceKey: null,
          invoiceNumber: null,
          invoiceStatus: null,
          paymentInstructionId: null,
          paymentKey: existing.key,
          paymentId: existing.id,
          invoiceId: null,
          message: "Banktransaktion wurde bereits verbucht.",
        });
      continue;
    }

    if (transaction.rejected) {
      skippedCount += 1;
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_rejected",
          transaction,
          invoiceKey: null,
          invoiceNumber: null,
          invoiceStatus: null,
          paymentInstructionId: null,
          paymentKey: null,
          paymentId: null,
          invoiceId: null,
          message: "Bankmeldung markiert als abgelehnt.",
        });
      continue;
    }

    if (transaction.reversal) {
      skippedCount += 1;
      pushEntry({
        bankTransactionId: transaction.bankTransactionId,
        outcome: "skipped_reversal",
        transaction,
        invoiceKey: null,
        invoiceNumber: null,
        invoiceStatus: null,
        paymentInstructionId: null,
        paymentKey: null,
        paymentId: null,
        invoiceId: null,
        message: "Rückbuchung erkannt; manuelle Prüfung erforderlich.",
      });
      continue;
    }

    const hasProvableProviderTransaction =
      Boolean(transaction.accountServiceReference) ||
      Boolean(
        transaction.endToEndId &&
          transaction.endToEndId.toUpperCase() !== "NOTPROVIDED",
      );
    if (!hasProvableProviderTransaction) {
      skippedCount += 1;
      pushEntry({
        bankTransactionId: transaction.bankTransactionId,
        outcome: "skipped_unprovable_transaction",
        transaction,
        invoiceKey: null,
        invoiceNumber: null,
        invoiceStatus: null,
        paymentInstructionId: null,
        paymentKey: null,
        paymentId: null,
        invoiceId: null,
        message:
          "Keine beweisbare UBS-Transaktionsreferenz (AcctSvcrRef/EndToEndId).",
      });
      continue;
    }

    if (!transaction.creditorReference) {
      skippedCount += 1;
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_no_reference",
          transaction,
          invoiceKey: null,
          invoiceNumber: null,
          invoiceStatus: null,
          paymentInstructionId: null,
          paymentKey: null,
          paymentId: null,
          invoiceId: null,
          message: "Keine strukturierte Referenz vorhanden.",
        });
      continue;
    }

    if (transaction.referenceType !== "QRR") {
      skippedCount += 1;
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_unsupported_reference",
          transaction,
          invoiceKey: null,
          invoiceNumber: null,
          invoiceStatus: null,
          paymentInstructionId: null,
          paymentKey: null,
          paymentId: null,
          invoiceId: null,
          message: "Nur QRR-Referenzen werden in SWISS-01H unterstützt.",
        });
      continue;
    }

    const matched = await findInvoiceForCamt054QrrReference(
      transaction.creditorReference,
      legalEntity.id,
      transactionClient,
    );
    if (!matched) {
      skippedCount += 1;
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "unmatched_invoice",
          transaction,
          invoiceKey: null,
          invoiceNumber: null,
          invoiceStatus: null,
          paymentInstructionId: null,
          paymentKey: null,
          paymentId: null,
          invoiceId: null,
          message: "Keine Rechnung zur QRR-Referenz gefunden.",
        });
      continue;
    }

    if (matched.legalEntityId !== legalEntity.id) {
      skippedCount += 1;
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "unmatched_legal_entity",
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          invoiceStatus: matched.status,
          paymentInstructionId: matched.paymentInstructionId,
          paymentKey: null,
          paymentId: null,
          invoiceId: matched.invoiceId,
          message: "Rechnung gehört zu einem anderen Rechtsträger.",
        });
      continue;
    }

    if (matched.currency.toUpperCase() !== transaction.currency.toUpperCase()) {
      skippedCount += 1;
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_currency_mismatch",
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          invoiceStatus: matched.status,
          paymentInstructionId: matched.paymentInstructionId,
          paymentKey: null,
          paymentId: null,
          invoiceId: matched.invoiceId,
          message: "Währung stimmt nicht mit der Rechnung überein.",
        });
      continue;
    }

    const outstandingMinor =
      matched.outstandingMinor ?? matched.grossTotalMinor;
    if (outstandingMinor <= 0) {
      skippedCount += 1;
      pushEntry({
        bankTransactionId: transaction.bankTransactionId,
        outcome: "skipped_invoice_not_payable",
        transaction,
        invoiceKey: matched.invoiceKey,
        invoiceNumber: matched.invoiceNumber,
        invoiceStatus: "PAID",
        paymentInstructionId: matched.paymentInstructionId,
        paymentKey: null,
        paymentId: null,
        invoiceId: matched.invoiceId,
        message:
          "Rechnung ist durch eine bestehende Zahlung bereits vollständig bezahlt.",
      });
      continue;
    }

    if (transaction.amountMinor > outstandingMinor) {
      skippedCount += 1;
      pushEntry({
        bankTransactionId: transaction.bankTransactionId,
        outcome: "skipped_overpayment",
        transaction,
        invoiceKey: matched.invoiceKey,
        invoiceNumber: matched.invoiceNumber,
        invoiceStatus: matched.status,
        paymentInstructionId: matched.paymentInstructionId,
        paymentKey: null,
        paymentId: null,
        invoiceId: matched.invoiceId,
        message: "Betrag übersteigt den offenen Rechnungsbetrag.",
      });
      continue;
    }

    if (!isCamt054InvoicePayable(matched.status)) {
      skippedCount += 1;
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "skipped_invoice_not_payable",
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          invoiceStatus: matched.status,
          paymentInstructionId: matched.paymentInstructionId,
          paymentKey: null,
          paymentId: null,
          invoiceId: matched.invoiceId,
          message: "Rechnung ist nicht zahlbar.",
        });
      continue;
    }

    if (input.dryRun) {
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "planned",
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          invoiceStatus: matched.status,
          paymentInstructionId: matched.paymentInstructionId,
          paymentKey: null,
          paymentId: null,
          invoiceId: matched.invoiceId,
          message: "Würde als camt.054 Zahlung verbucht werden.",
        });
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
        importKey: plannedImportKey,
      }, transactionClient);
      appliedCount += 1;
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome: "applied",
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          invoiceStatus: matched.status,
          paymentInstructionId: matched.paymentInstructionId,
          paymentKey: result.payment.key,
          paymentId: result.payment.id,
          invoiceId: matched.invoiceId,
          message: null,
        });
    } catch (error) {
      skippedCount += 1;
      const message =
        error instanceof Error ? error.message : "Zahlung konnte nicht verbucht werden.";
      const outcome =
        message === "Der Betrag übersteigt den offenen Rechnungsbetrag."
          ? "skipped_overpayment"
          : "skipped_invoice_not_payable";
      pushEntry({
          bankTransactionId: transaction.bankTransactionId,
          outcome,
          transaction,
          invoiceKey: matched.invoiceKey,
          invoiceNumber: matched.invoiceNumber,
          invoiceStatus: matched.status,
          paymentInstructionId: matched.paymentInstructionId,
          paymentKey: null,
          paymentId: null,
          invoiceId: matched.invoiceId,
          message,
        });
    }
  }

  const bucketCounts = countEntryBuckets(entries);

  let importKey: string | null = null;

  if (!input.dryRun) {
    const importRecordKey = plannedImportKey!;
    const status = deriveImportStatus({
      ...bucketCounts,
      transactionCount: parsed.transactions.length,
    });
    const created = await createBankReconciliationImportWithTransactions(
      {
        key: importRecordKey,
        legalEntity: { connect: { id: legalEntity.id } },
        source: "CAMT054",
        filename: input.filename!.trim(),
        contentSha256,
        camtMessageId: parsed.messageId,
        accountMasked: parsed.accountIdentificationMasked,
        bookingPeriodStart: parsed.bookingPeriodStart
          ? new Date(`${parsed.bookingPeriodStart}T00:00:00.000Z`)
          : null,
        bookingPeriodEnd: parsed.bookingPeriodEnd
          ? new Date(`${parsed.bookingPeriodEnd}T00:00:00.000Z`)
          : null,
        totalCreditsMinor: parsed.totalCreditsMinor,
        creditCurrency: parsed.creditCurrency,
        status,
        transactionCount: parsed.transactions.length,
        matchedCount: bucketCounts.matchedCount,
        unmatchedCount: bucketCounts.unmatchedCount,
        reviewRequiredCount: bucketCounts.reviewRequiredCount,
        duplicateCount: bucketCounts.duplicateCount,
        errorCount: bucketCounts.errorCount,
        uploadedByUserId: input.actorUserId,
        processedAt: new Date(),
      },
      entryDrafts.map((draft, index) => {
        const entry = entries[index]!;
        return {
          key: randomUUID(),
          bankTransactionId: draft.bankTransactionId,
          amountMinor: draft.transaction.amountMinor,
          currency: draft.transaction.currency,
          paymentDate: new Date(`${draft.transaction.paymentDate}T00:00:00.000Z`),
          bookingDate: new Date(`${draft.transaction.bookingDate}T00:00:00.000Z`),
          valueDate: draft.transaction.valueDate
            ? new Date(`${draft.transaction.valueDate}T00:00:00.000Z`)
            : null,
          accountServiceReference: draft.transaction.accountServiceReference,
          endToEndId: draft.transaction.endToEndId,
          isReversal: draft.transaction.reversal,
          creditorReference: draft.transaction.creditorReference,
          referenceType: draft.transaction.referenceType,
          debtorName: draft.transaction.debtorName,
          matchStatus: entry.matchStatus,
          matchMethod: entry.matchMethod,
          matchReason: draft.message,
          invoiceId: draft.invoiceId,
          invoicePaymentInstructionId: draft.paymentInstructionId,
          invoicePaymentId: draft.paymentId,
        };
      }),
      transactionClient,
    );

    importKey = created.key;
    logBillingOperationalEvent("billing.reconciliation.import.completed", {
      legalEntityKey: input.legalEntityKey,
      importKey,
    });
    for (const entry of entries) {
      if (entry.matchStatus === "MATCHED") {
        logBillingOperationalEvent(
          "billing.reconciliation.transaction.matched",
          {
            legalEntityKey: input.legalEntityKey,
            importKey,
            transactionKey: entry.bankTransactionId,
            invoiceNumber: entry.invoiceNumber,
            amountMinor: entry.transaction.amountMinor,
            currency: entry.transaction.currency,
            matchMethod: entry.matchMethod,
          },
        );
      } else if (entry.matchStatus === "REVIEW_REQUIRED") {
        logBillingOperationalEvent(
          "billing.reconciliation.transaction.review_required",
          {
            legalEntityKey: input.legalEntityKey,
            importKey,
            transactionKey: entry.bankTransactionId,
            invoiceNumber: entry.invoiceNumber,
            amountMinor: entry.transaction.amountMinor,
            currency: entry.transaction.currency,
            matchMethod: entry.matchMethod,
          },
        );
      }
    }
  }

  const report: Camt054ReconciliationReport = {
    legalEntityKey: input.legalEntityKey,
    messageId: parsed.messageId,
    contentSha256,
    accountIdentificationMasked: parsed.accountIdentificationMasked,
    bookingPeriodStart: parsed.bookingPeriodStart,
    bookingPeriodEnd: parsed.bookingPeriodEnd,
    totalCreditsMinor: parsed.totalCreditsMinor,
    creditCurrency: parsed.creditCurrency,
    dryRun: input.dryRun,
    appliedCount,
    skippedCount,
    ...bucketCounts,
    importKey,
    entries,
    ...(previewDiagnostics ? { diagnostics: previewDiagnostics } : {}),
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
        importKey,
      },
    });
  }

  return report;
}
