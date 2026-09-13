import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { logAction } from "@/lib/audit/log-action";
import { allocateUniqueBillingKey } from "@/lib/billing/billing-business-key";
import { sendNativeInvoiceEmail } from "@/lib/billing/invoice-delivery/invoice-delivery-service";
import { createInvoicePaymentInstruction } from "@/lib/billing/invoice-payment-instruction-service";
import { generateNativeInvoicePdfBytes } from "@/lib/billing/invoice-pdf-service";
import { resolveInvoiceRecipientProfileForContract } from "@/lib/billing/invoice-recipient-profile-resolution";
import {
  createDraftInvoiceFromContract,
  finalizeInvoice,
} from "@/lib/billing/native-billing-commercial-service";
import {
  NATIVE_BILLING_AUDIT_ACTIONS,
  NATIVE_BILLING_AUDIT_MODULE,
} from "@/lib/billing/native-billing-audit";
import { findLegalEntityById, listBillingBankAccountsForLegalEntity } from "@/lib/billing/native-billing-repository";
import {
  NativeBillingConflictError,
  NativeBillingValidationError,
} from "@/lib/billing/native-billing-types";
import { calculateLineAmounts, vatRateBpsFromTreatment } from "@/lib/billing/swiss-vat";
import { selectEligibleBillingBankAccount } from "@/lib/billing/swiss-qr/swiss-bank-account-selection";
import {
  compareBillingDateOnly,
  computeMonthlyBillingPeriod,
  formatBillingDateOnly,
  parseBillingDateOnly,
  resolveDueBillableMonthlyPeriod,
} from "./billing-period";
import {
  describeRecurringBillingScheduleHint,
  isRecurringBillingCronAutoDeliverEnabled,
  RECURRING_BILLING_CRON_PATH,
  RECURRING_BILLING_CRON_SCHEDULE_UTC,
} from "./recurring-billing-config";
import {
  createBillingRecurringRunRecord,
  findLatestBillingRecurringRun,
  findNonVoidInvoiceForContractPeriod,
  listActiveBillingContractsForRecurring,
} from "./recurring-billing-repository";
import type {
  RecurringBillingAutomationStatus,
  RecurringBillingContractResult,
  RecurringBillingRunSummary,
  RunRecurringBillingInput,
  RunRecurringBillingResult,
} from "./recurring-billing-types";
import { RECURRING_BILLING_CRON_ACTOR_USER_ID } from "./recurring-billing-actors";

function todayDateOnlyUtc(): Date {
  const now = new Date();
  return parseBillingDateOnly(now.toISOString().slice(0, 10));
}

function buildEmptySummary(input: RunRecurringBillingInput, asOfDate: string): RecurringBillingRunSummary {
  return {
    mode: input.mode,
    trigger: input.trigger,
    asOfDate,
    deliverAutomatically: input.deliverAutomatically === true,
    contractsEvaluated: 0,
    invoicesCreated: 0,
    invoicesSent: 0,
    skipped: 0,
    blocked: 0,
    failed: 0,
    results: [],
  };
}

function tallySummary(summary: RecurringBillingRunSummary): void {
  for (const row of summary.results) {
    switch (row.outcome) {
      case "CREATED_AND_SENT":
        summary.invoicesCreated += 1;
        summary.invoicesSent += 1;
        break;
      case "CREATED_NOT_SENT":
        summary.invoicesCreated += 1;
        break;
      case "PREVIEW_WOULD_CREATE":
        break;
      case "FAILED":
        summary.failed += 1;
        break;
      case "BLOCKED_NO_RECIPIENT":
      case "BLOCKED_NO_BANK_ACCOUNT":
      case "BLOCKED_INVALID_CONFIGURATION":
        summary.blocked += 1;
        break;
      default:
        summary.skipped += 1;
        break;
    }
  }
}

async function validateContractConfiguration(
  contract: Awaited<ReturnType<typeof listActiveBillingContractsForRecurring>>[number],
): Promise<
  | { ok: true; recipientEmail: string }
  | { ok: false; outcome: RecurringBillingContractResult["outcome"]; reason: string }
> {
  const legalEntity = await findLegalEntityById(contract.legalEntityId);
  if (!legalEntity || legalEntity.status !== "ACTIVE") {
    return {
      ok: false,
      outcome: "BLOCKED_INVALID_CONFIGURATION",
      reason: "Rechtsträger fehlt oder ist inaktiv.",
    };
  }

  const recipientProfile = await resolveInvoiceRecipientProfileForContract({
    billingCustomerId: contract.billingCustomerId,
    billingContractId: contract.id,
  });
  if (!recipientProfile) {
    return {
      ok: false,
      outcome: "BLOCKED_NO_RECIPIENT",
      reason: "Rechnungsempfänger-Profil fehlt.",
    };
  }
  const recipientEmail = recipientProfile.invoiceEmail?.trim() ?? "";
  if (!recipientEmail) {
    return {
      ok: false,
      outcome: "BLOCKED_NO_RECIPIENT",
      reason: "Rechnungs-E-Mail fehlt.",
    };
  }

  const accounts = await listBillingBankAccountsForLegalEntity(contract.legalEntityId);
  try {
    selectEligibleBillingBankAccount(
      accounts,
      contract.legalEntityId,
      contract.currency,
    );
  } catch {
    return {
      ok: false,
      outcome: "BLOCKED_NO_BANK_ACCOUNT",
      reason: "Kein gültiges Standard-Bankkonto für Swiss QR.",
    };
  }

  return { ok: true, recipientEmail };
}

function previewAmounts(contract: { monthlyNetAmountMinor: number; vatTreatment: "STANDARD_81" }) {
  const rateBps = vatRateBpsFromTreatment(contract.vatTreatment);
  const line = calculateLineAmounts(1, contract.monthlyNetAmountMinor, rateBps);
  return {
    netTotalMinor: line.lineNetMinor,
    vatTotalMinor: line.vatMinor,
    grossTotalMinor: line.lineGrossMinor,
  };
}

async function loadInvoicedPeriodCache(
  contract: Awaited<ReturnType<typeof listActiveBillingContractsForRecurring>>[number],
  asOfDate: Date,
): Promise<Map<string, boolean>> {
  const cache = new Map<string, boolean>();
  for (let index = 0; index < 240; index += 1) {
    const period = computeMonthlyBillingPeriod(contract.startDate, index);
    if (compareBillingDateOnly(period.periodStart, asOfDate) > 0) {
      break;
    }
    const key = `${formatBillingDateOnly(period.periodStart)}:${formatBillingDateOnly(period.periodEnd)}`;
    const existing = await findNonVoidInvoiceForContractPeriod({
      billingContractId: contract.id,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    });
    cache.set(key, Boolean(existing));
  }
  return cache;
}

function isInvoicePeriodUniqueViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return true;
  }
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

async function processContract(
  contract: Awaited<ReturnType<typeof listActiveBillingContractsForRecurring>>[number],
  input: RunRecurringBillingInput,
  asOfDate: Date,
): Promise<RecurringBillingContractResult> {
  const base: RecurringBillingContractResult = {
    contractKey: contract.key,
    contractNumber: contract.contractNumber,
    customerKey: contract.customerKey,
    customerName: contract.customerName,
    outcome: "FAILED",
    reason: "",
    periodStart: null,
    periodEnd: null,
    netTotalMinor: null,
    vatTotalMinor: null,
    grossTotalMinor: null,
    recipientEmail: null,
    invoiceKey: null,
    invoiceNumber: null,
    errorMessage: null,
  };

  if (contract.status !== "ACTIVE") {
    return { ...base, outcome: "SKIPPED_INACTIVE", reason: "Vertrag ist nicht aktiv." };
  }

  if (compareBillingDateOnly(asOfDate, contract.startDate) < 0) {
    return { ...base, outcome: "SKIPPED_BEFORE_START", reason: "Vertragsstart liegt in der Zukunft." };
  }

  if (contract.billingInterval !== "MONTHLY") {
    return {
      ...base,
      outcome: "BLOCKED_INVALID_CONFIGURATION",
      reason: "Abrechnungsintervall wird noch nicht unterstützt.",
    };
  }

  const invoicedCache = await loadInvoicedPeriodCache(contract, asOfDate);
  const periodKey = (s: Date, e: Date) => `${formatBillingDateOnly(s)}:${formatBillingDateOnly(e)}`;

  const resolved = resolveDueBillableMonthlyPeriod({
    contractStart: contract.startDate,
    contractEnd: contract.endDate,
    asOfDate,
    isPeriodInvoiced: (periodStart, periodEnd) =>
      invoicedCache.get(periodKey(periodStart, periodEnd)) === true,
  });

  if (resolved.kind === "NOT_DUE") {
    return {
      ...base,
      outcome: "SKIPPED_NOT_DUE",
      reason: "Nächste Periode ist noch nicht fällig.",
      periodStart: formatBillingDateOnly(resolved.nextPeriod.periodStart),
      periodEnd: formatBillingDateOnly(resolved.nextPeriod.periodEnd),
    };
  }
  if (resolved.kind === "ENDED") {
    return { ...base, outcome: "SKIPPED_ENDED", reason: "Vertrag ist beendet." };
  }
  if (resolved.kind === "ALL_INVOICED") {
    return { ...base, outcome: "SKIPPED_ALL_INVOICED", reason: "Alle fälligen Perioden sind abgerechnet." };
  }

  const { periodStart, periodEnd } = resolved.period;
  const periodStartStr = formatBillingDateOnly(periodStart);
  const periodEndStr = formatBillingDateOnly(periodEnd);
  const amounts = previewAmounts(contract);

  const existing = await findNonVoidInvoiceForContractPeriod({
    billingContractId: contract.id,
    periodStart,
    periodEnd,
  });
  if (existing) {
    return {
      ...base,
      outcome: "SKIPPED_ALREADY_INVOICED",
      reason: "Periode ist bereits abgerechnet.",
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      invoiceKey: existing.key,
      invoiceNumber: existing.invoiceNumber,
      netTotalMinor: existing.netTotalMinor,
      vatTotalMinor: existing.vatTotalMinor,
      grossTotalMinor: existing.grossTotalMinor,
    };
  }

  const config = await validateContractConfiguration(contract);
  if (!config.ok) {
    return {
      ...base,
      outcome: config.outcome,
      reason: config.reason,
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      ...amounts,
    };
  }

  if (input.mode === "DRY_RUN") {
    return {
      ...base,
      outcome: "PREVIEW_WOULD_CREATE",
      reason: "Rechnung würde erstellt und finalisiert.",
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      recipientEmail: config.recipientEmail,
      ...amounts,
    };
  }

  const actorUserId =
    input.actorUserId ??
    (input.trigger === "CRON" ? RECURRING_BILLING_CRON_ACTOR_USER_ID : null);
  if (!actorUserId) {
    return {
      ...base,
      outcome: "FAILED",
      reason: "Ausführender Benutzer fehlt.",
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      errorMessage: "actorUserId required for EXECUTE",
    };
  }

  try {
    let invoice;
    try {
      invoice = await createDraftInvoiceFromContract({
        billingContractId: contract.id,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        invoiceDate: periodStartStr,
        actorUserId,
      });
    } catch (error) {
      if (isInvoicePeriodUniqueViolation(error)) {
        const raced = await findNonVoidInvoiceForContractPeriod({
          billingContractId: contract.id,
          periodStart,
          periodEnd,
        });
        if (raced) {
          return {
            ...base,
            outcome: "SKIPPED_ALREADY_INVOICED",
            reason: "Periode wurde parallel bereits abgerechnet.",
            periodStart: periodStartStr,
            periodEnd: periodEndStr,
            invoiceKey: raced.key,
            invoiceNumber: raced.invoiceNumber,
            netTotalMinor: raced.netTotalMinor,
            vatTotalMinor: raced.vatTotalMinor,
            grossTotalMinor: raced.grossTotalMinor,
          };
        }
      }
      throw error;
    }

    const finalized = await finalizeInvoice(invoice.key, actorUserId);
    await createInvoicePaymentInstruction(finalized.key, actorUserId);
    await generateNativeInvoicePdfBytes(finalized.key);

    let outcome: RecurringBillingContractResult["outcome"] = "CREATED_NOT_SENT";
    let reason = "Rechnung erstellt; Versand nicht angefordert.";

    if (input.deliverAutomatically) {
      try {
        await sendNativeInvoiceEmail({
          invoiceKey: finalized.key,
          actorUserId,
          resend: false,
        });
        outcome = "CREATED_AND_SENT";
        reason = "Rechnung erstellt und versendet.";
      } catch (deliveryError) {
        outcome = "CREATED_NOT_SENT";
        reason =
          deliveryError instanceof Error
            ? deliveryError.message
            : "Versand fehlgeschlagen.";
      }
    }

    return {
      ...base,
      outcome,
      reason,
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      recipientEmail: config.recipientEmail,
      invoiceKey: finalized.key,
      invoiceNumber: finalized.invoiceNumber,
      netTotalMinor: finalized.netTotalMinor,
      vatTotalMinor: finalized.vatTotalMinor,
      grossTotalMinor: finalized.grossTotalMinor,
    };
  } catch (error) {
    const message =
      error instanceof NativeBillingValidationError ||
      error instanceof NativeBillingConflictError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unbekannter Fehler";

    return {
      ...base,
      outcome: "FAILED",
      reason: "Verarbeitung fehlgeschlagen.",
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      errorMessage: message,
    };
  }
}

export async function runRecurringBilling(
  input: RunRecurringBillingInput,
): Promise<RunRecurringBillingResult> {
  const asOfDate = input.asOfDate ? parseBillingDateOnly(input.asOfDate) : todayDateOnlyUtc();
  const asOfDateStr = formatBillingDateOnly(asOfDate);
  const summary = buildEmptySummary(input, asOfDateStr);

  const contracts = await listActiveBillingContractsForRecurring(input.contractKeys);
  summary.contractsEvaluated = contracts.length;

  for (const contract of contracts) {
    const result = await processContract(contract, input, asOfDate);
    summary.results.push(result);
  }

  tallySummary(summary);

  const shouldPersist = input.persistRun !== false;
  let runKey: string | null = null;

  if (shouldPersist) {
    runKey = await allocateUniqueBillingKey("billingRecurringRun", randomUUID().slice(0, 8));
    await createBillingRecurringRunRecord({
      key: runKey,
      mode: input.mode,
      trigger: input.trigger,
      status: "COMPLETED",
      asOfDate,
      deliverAutomatically: input.deliverAutomatically === true,
      summaryJson: summary,
      createdByUserId: input.actorUserId,
      completedAt: new Date(),
    });
  }

  void logAction({
    actorUserId: input.actorUserId,
    moduleKey: NATIVE_BILLING_AUDIT_MODULE,
    entityType: "BillingRecurringRun",
    entityId: runKey ?? "dry-run",
    action: NATIVE_BILLING_AUDIT_ACTIONS.RECURRING_BILLING_RUN_COMPLETED,
    afterJson: {
      mode: input.mode,
      trigger: input.trigger,
      asOfDate: asOfDateStr,
      deliverAutomatically: input.deliverAutomatically === true,
      contractsEvaluated: summary.contractsEvaluated,
      invoicesCreated: summary.invoicesCreated,
      invoicesSent: summary.invoicesSent,
      skipped: summary.skipped,
      blocked: summary.blocked,
      failed: summary.failed,
    },
  });

  return { runKey, summary };
}

export async function runAutomaticRecurringBillingCron(): Promise<RunRecurringBillingResult> {
  return runRecurringBilling({
    mode: "EXECUTE",
    trigger: "CRON",
    asOfDate: formatBillingDateOnly(todayDateOnlyUtc()),
    deliverAutomatically: isRecurringBillingCronAutoDeliverEnabled(),
    actorUserId: RECURRING_BILLING_CRON_ACTOR_USER_ID,
    persistRun: true,
  });
}

function parseStoredSummary(value: unknown): RecurringBillingRunSummary | null {
  if (!value || typeof value !== "object") return null;
  return value as RecurringBillingRunSummary;
}

export async function getRecurringBillingAutomationStatus(): Promise<RecurringBillingAutomationStatus> {
  const latest = await findLatestBillingRecurringRun();
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());

  return {
    scheduler: {
      enabled: cronSecretConfigured,
      cronPath: RECURRING_BILLING_CRON_PATH,
      scheduleUtc: RECURRING_BILLING_CRON_SCHEDULE_UTC,
      nextEvaluationHint: describeRecurringBillingScheduleHint(),
    },
    lastRun: latest
      ? {
          key: latest.key,
          mode: latest.mode,
          trigger: latest.trigger,
          status: latest.status,
          startedAt: latest.startedAt.toISOString(),
          completedAt: latest.completedAt?.toISOString() ?? null,
          asOfDate: formatBillingDateOnly(latest.asOfDate),
          summary: parseStoredSummary(latest.summaryJson) ?? {
            mode: latest.mode,
            trigger: latest.trigger,
            asOfDate: formatBillingDateOnly(latest.asOfDate),
            deliverAutomatically: latest.deliverAutomatically,
            contractsEvaluated: 0,
            invoicesCreated: 0,
            invoicesSent: 0,
            skipped: 0,
            blocked: 0,
            failed: 0,
            results: [],
          },
        }
      : null,
  };
}
