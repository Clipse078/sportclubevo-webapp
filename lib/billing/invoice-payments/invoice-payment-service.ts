import { randomUUID } from "node:crypto";
import { logAction } from "@/lib/audit/log-action";
import { prisma } from "@/lib/db/prisma";
import { findInvoiceByKey } from "@/lib/billing/native-billing-commercial-repository";
import {
  NATIVE_BILLING_AUDIT_ACTIONS,
  NATIVE_BILLING_AUDIT_MODULE,
} from "@/lib/billing/native-billing-audit";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "@/lib/billing/native-billing-types";
import type { InvoiceStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import {
  INVOICE_PAYMENT_ERROR_CODES,
  PAYMENT_EXCEEDS_OUTSTANDING_MESSAGE,
} from "./invoice-payment-errors";
import {
  calculateOutstandingMinor,
  isInvoiceFullyPaid,
  sumConfirmedPaymentAmountMinor,
} from "./invoice-payment-balance";
import {
  createInvoicePaymentRecord,
  findInvoicePaymentByKey,
  listInvoicePaymentsForInvoiceId,
  markInvoicePaymentReversed,
  sumConfirmedPaymentsMinor,
} from "./invoice-payment-repository";
import type {
  InvoicePaymentRecord,
  InvoicePaymentSummary,
  RecordCamt054InvoicePaymentInput,
  RecordInvoicePaymentInput,
  ReverseInvoicePaymentInput,
} from "./invoice-payment-types";

export const INVOICE_PAYMENT_REFERENCE_MAX_LENGTH = 140;
export const INVOICE_PAYMENT_NOTE_MAX_LENGTH = 500;
export const INVOICE_PAYMENT_REVERSAL_REASON_MAX_LENGTH = 500;

const PAYABLE_STATUSES: ReadonlySet<InvoiceStatus> = new Set([
  "FINALIZED",
  "OPEN",
  "PARTIALLY_PAID",
  "OVERDUE",
]);


function parsePaymentDate(value: string): Date {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new NativeBillingValidationError("Ungültiges Zahlungsdatum.");
  }
  const parsed = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new NativeBillingValidationError("Ungültiges Zahlungsdatum.");
  }
  return parsed;
}

function assertPayableInvoice(
  invoice: NonNullable<Awaited<ReturnType<typeof findInvoiceByKey>>>,
): void {
  if (invoice.status === "DRAFT") {
    throw new NativeBillingValidationError(
      "Für Entwürfe können keine Zahlungen erfasst werden.",
    );
  }
  if (invoice.status === "VOID") {
    throw new NativeBillingValidationError(
      "Für stornierte Rechnungen können keine Zahlungen erfasst werden.",
    );
  }
  if (invoice.status === "PAID") {
    throw new NativeBillingConflictError("Die Rechnung ist bereits vollständig bezahlt.");
  }
  if (!PAYABLE_STATUSES.has(invoice.status)) {
    throw new NativeBillingValidationError("Zahlung für diese Rechnung nicht möglich.");
  }
}

export function recalculateInvoicePaymentStatus(
  grossTotalMinor: number,
  paidTotalMinor: number,
  currentStatus: InvoiceStatus,
): InvoiceStatus {
  if (isInvoiceFullyPaid(grossTotalMinor, paidTotalMinor)) {
    return "PAID";
  }
  if (paidTotalMinor > 0) {
    return "PARTIALLY_PAID";
  }
  if (currentStatus === "OVERDUE") {
    return "OVERDUE";
  }
  if (currentStatus === "OPEN") {
    return "OPEN";
  }
  return "FINALIZED";
}

export function calculateInvoicePaymentSummaryFromParts(input: {
  invoice: NonNullable<Awaited<ReturnType<typeof findInvoiceByKey>>>;
  payments: InvoicePaymentRecord[];
}): InvoicePaymentSummary {
  const paidTotalMinor = sumConfirmedPaymentAmountMinor(input.payments);
  const outstandingMinor = calculateOutstandingMinor(
    input.invoice.grossTotalMinor,
    paidTotalMinor,
  );
  const confirmedDates = input.payments
    .filter((p) => p.status === "CONFIRMED")
    .map((p) => p.paymentDate);
  const lastPaymentDate =
    confirmedDates.length > 0
      ? confirmedDates.reduce((latest, d) => (d > latest ? d : latest))
      : null;

  return {
    invoiceId: input.invoice.id,
    invoiceKey: input.invoice.key,
    currency: input.invoice.currency,
    grossTotalMinor: input.invoice.grossTotalMinor,
    paidTotalMinor,
    outstandingMinor,
    isFullyPaid: outstandingMinor === 0 && paidTotalMinor > 0,
    lastPaymentDate,
    payments: input.payments,
  };
}

export async function getInvoicePaymentSummary(
  invoiceKey: string,
): Promise<InvoicePaymentSummary | null> {
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    return null;
  }
  const payments = await listInvoicePaymentsForInvoiceId(invoice.id);
  return calculateInvoicePaymentSummaryFromParts({ invoice, payments });
}

function validateRecordPaymentFields(input: RecordInvoicePaymentInput): {
  paymentDate: Date;
  reference: string | null;
  note: string | null;
} {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new NativeBillingValidationError("Ungültiger Zahlungsbetrag.");
  }
  const paymentDate = parsePaymentDate(input.paymentDate);
  const reference =
    input.reference != null && input.reference.trim() !== ""
      ? input.reference.trim()
      : null;
  if (reference && reference.length > INVOICE_PAYMENT_REFERENCE_MAX_LENGTH) {
    throw new NativeBillingValidationError("Referenz ist zu lang.");
  }
  const note =
    input.note != null && input.note.trim() !== "" ? input.note.trim() : null;
  if (note && note.length > INVOICE_PAYMENT_NOTE_MAX_LENGTH) {
    throw new NativeBillingValidationError("Notiz ist zu lang.");
  }
  if (input.method !== "BANK_TRANSFER_MANUAL") {
    throw new NativeBillingValidationError("Ungültige Zahlungsart.");
  }
  return { paymentDate, reference, note };
}

async function lockInvoiceForPayment(
  tx: Prisma.TransactionClient,
  invoiceId: string,
): Promise<{ id: string; status: InvoiceStatus; grossTotalMinor: number; currency: string; key: string; invoiceNumber: string | null }> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      status: InvoiceStatus;
      grossTotalMinor: number;
      currency: string;
      key: string;
      invoiceNumber: string | null;
    }>
  >`
    SELECT "id", "status", "grossTotalMinor", "currency", "key", "invoiceNumber"
    FROM "Invoice"
    WHERE "id" = ${invoiceId}
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  return row;
}

export async function recordInvoicePayment(
  input: RecordInvoicePaymentInput,
): Promise<{ payment: InvoicePaymentRecord; summary: InvoicePaymentSummary }> {
  const invoice = await findInvoiceByKey(input.invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  assertPayableInvoice(invoice);

  const { paymentDate, reference, note } = validateRecordPaymentFields(input);
  const currency = input.currency.trim().toUpperCase();
  if (currency !== invoice.currency.toUpperCase()) {
    throw new NativeBillingValidationError("Die Währung muss mit der Rechnungswährung übereinstimmen.");
  }

  return prisma.$transaction(async (tx) => {
    const locked = await lockInvoiceForPayment(tx, invoice.id);
    assertPayableInvoice({ ...invoice, status: locked.status });

    const paidBefore = await sumConfirmedPaymentsMinor(invoice.id, tx);
    const outstanding = calculateOutstandingMinor(locked.grossTotalMinor, paidBefore);
    if (outstanding <= 0) {
      throw new NativeBillingConflictError("Die Rechnung ist bereits vollständig bezahlt.");
    }
    if (input.amountMinor > outstanding) {
      throw new NativeBillingValidationError(PAYMENT_EXCEEDS_OUTSTANDING_MESSAGE, {
        code: INVOICE_PAYMENT_ERROR_CODES.PAYMENT_EXCEEDS_OUTSTANDING,
      });
    }

    const payment = await createInvoicePaymentRecord(
      {
        key: randomUUID(),
        invoiceId: invoice.id,
        amountMinor: input.amountMinor,
        currency: invoice.currency,
        paymentDate,
        method: "BANK_TRANSFER_MANUAL",
        reference,
        note,
        source: "MANUAL",
        createdByUserId: input.actorUserId,
      },
      tx,
    );

    const paidAfter = paidBefore + input.amountMinor;
    const nextStatus = recalculateInvoicePaymentStatus(
      locked.grossTotalMinor,
      paidAfter,
      locked.status,
    );
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: nextStatus },
    });

    const payments = await tx.invoicePayment.findMany({
      where: { invoiceId: invoice.id },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
    });
    const summary = calculateInvoicePaymentSummaryFromParts({
      invoice: { ...invoice, status: nextStatus },
      payments: payments.map((p) => ({
        ...p,
        method: "BANK_TRANSFER_MANUAL" as const,
        source: p.source as InvoicePaymentRecord["source"],
        status: p.status as InvoicePaymentRecord["status"],
      })),
    });

    void logAction({
      actorUserId: input.actorUserId,
      moduleKey: NATIVE_BILLING_AUDIT_MODULE,
      entityType: "InvoicePayment",
      entityId: payment.id,
      action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_RECORDED,
      afterJson: {
        invoiceId: invoice.id,
        invoiceKey: invoice.key,
        invoiceNumber: invoice.invoiceNumber,
        paymentId: payment.id,
        paymentKey: payment.key,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        paymentDate: paymentDate.toISOString().slice(0, 10),
        method: payment.method,
        source: payment.source,
        reference: payment.reference,
      },
    });

    return { payment, summary };
  });
}

export async function reverseInvoicePayment(
  input: ReverseInvoicePaymentInput,
): Promise<{ payment: InvoicePaymentRecord; summary: InvoicePaymentSummary }> {
  const reason = input.reason.trim();
  if (!reason) {
    throw new NativeBillingValidationError("Stornierungsgrund ist erforderlich.");
  }
  if (reason.length > INVOICE_PAYMENT_REVERSAL_REASON_MAX_LENGTH) {
    throw new NativeBillingValidationError("Stornierungsgrund ist zu lang.");
  }

  const existing = await findInvoicePaymentByKey(input.paymentKey);
  if (!existing) {
    throw new NativeBillingNotFoundError("Zahlung nicht gefunden.");
  }

  if (existing.status === "REVERSED") {
    throw new NativeBillingConflictError("Zahlung wurde bereits storniert.");
  }

  const invoiceRow = await prisma.invoice.findUnique({
    where: { id: existing.invoiceId },
    select: { key: true },
  });
  if (!invoiceRow) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  const invoice = await findInvoiceByKey(invoiceRow.key);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }

  return prisma.$transaction(async (tx) => {
    await lockInvoiceForPayment(tx, invoice.id);

    const lockedPayment = await tx.invoicePayment.findUnique({
      where: { id: existing.id },
      select: { status: true },
    });
    if (!lockedPayment || lockedPayment.status === "REVERSED") {
      throw new NativeBillingConflictError("Zahlung wurde bereits storniert.");
    }

    const payment = await markInvoicePaymentReversed(
      existing.id,
      {
        reversedByUserId: input.actorUserId,
        reversalReason: reason,
      },
      tx,
    );

    const paidAfter = await sumConfirmedPaymentsMinor(invoice.id, tx);
    const nextStatus = recalculateInvoicePaymentStatus(
      invoice.grossTotalMinor,
      paidAfter,
      invoice.status,
    );
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: nextStatus },
    });

    const payments = await listInvoicePaymentsForInvoiceId(invoice.id);
    const summary = calculateInvoicePaymentSummaryFromParts({
      invoice: { ...invoice, status: nextStatus },
      payments,
    });

    void logAction({
      actorUserId: input.actorUserId,
      moduleKey: NATIVE_BILLING_AUDIT_MODULE,
      entityType: "InvoicePayment",
      entityId: payment.id,
      action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_REVERSED,
      afterJson: {
        invoiceId: invoice.id,
        invoiceKey: invoice.key,
        invoiceNumber: invoice.invoiceNumber,
        paymentId: payment.id,
        paymentKey: payment.key,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        source: payment.source,
        reversalReason: reason,
      },
    });

    return { payment, summary };
  });
}

export async function recordCamt054InvoicePayment(
  input: RecordCamt054InvoicePaymentInput,
): Promise<{ payment: InvoicePaymentRecord; summary: InvoicePaymentSummary }> {
  const invoice = await findInvoiceByKey(input.invoiceKey);
  if (!invoice) {
    throw new NativeBillingNotFoundError("Rechnung nicht gefunden.");
  }
  assertPayableInvoice(invoice);

  if (!input.bankTransactionId.trim()) {
    throw new NativeBillingValidationError("Banktransaktions-ID fehlt.");
  }

  const paymentDate = parsePaymentDate(input.paymentDate);
  const currency = input.currency.trim().toUpperCase();
  if (currency !== invoice.currency.toUpperCase()) {
    throw new NativeBillingValidationError("Die Währung muss mit der Rechnungswährung übereinstimmen.");
  }

  const reference =
    input.creditorReference != null && input.creditorReference.trim() !== ""
      ? input.creditorReference.trim()
      : null;
  if (reference && reference.length > INVOICE_PAYMENT_REFERENCE_MAX_LENGTH) {
    throw new NativeBillingValidationError("Referenz ist zu lang.");
  }

  return prisma.$transaction(async (tx) => {
    const locked = await lockInvoiceForPayment(tx, invoice.id);
    assertPayableInvoice({ ...invoice, status: locked.status });

    const paidBefore = await sumConfirmedPaymentsMinor(invoice.id, tx);
    const outstanding = calculateOutstandingMinor(locked.grossTotalMinor, paidBefore);
    if (outstanding <= 0) {
      throw new NativeBillingConflictError("Die Rechnung ist bereits vollständig bezahlt.");
    }
    if (input.amountMinor > outstanding) {
      throw new NativeBillingValidationError(PAYMENT_EXCEEDS_OUTSTANDING_MESSAGE, {
        code: INVOICE_PAYMENT_ERROR_CODES.PAYMENT_EXCEEDS_OUTSTANDING,
      });
    }

    const payment = await createInvoicePaymentRecord(
      {
        key: randomUUID(),
        invoiceId: invoice.id,
        amountMinor: input.amountMinor,
        currency: invoice.currency,
        paymentDate,
        method: "BANK_TRANSFER_MANUAL",
        reference,
        note: "camt.054 Abgleich",
        source: "CAMT054",
        createdByUserId: input.actorUserId,
        externalReference: input.externalReference,
        bankTransactionId: input.bankTransactionId.trim(),
      },
      tx,
    );

    const paidAfter = paidBefore + input.amountMinor;
    const nextStatus = recalculateInvoicePaymentStatus(
      locked.grossTotalMinor,
      paidAfter,
      locked.status,
    );
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: nextStatus },
    });

    const payments = await tx.invoicePayment.findMany({
      where: { invoiceId: invoice.id },
      orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
    });
    const summary = calculateInvoicePaymentSummaryFromParts({
      invoice: { ...invoice, status: nextStatus },
      payments: payments.map((p) => ({
        ...p,
        method: "BANK_TRANSFER_MANUAL" as const,
        source: p.source as InvoicePaymentRecord["source"],
        status: p.status as InvoicePaymentRecord["status"],
      })),
    });

    void logAction({
      actorUserId: input.actorUserId,
      moduleKey: NATIVE_BILLING_AUDIT_MODULE,
      entityType: "InvoicePayment",
      entityId: payment.id,
      action: NATIVE_BILLING_AUDIT_ACTIONS.INVOICE_PAYMENT_RECORDED,
      afterJson: {
        invoiceId: invoice.id,
        invoiceKey: invoice.key,
        invoiceNumber: invoice.invoiceNumber,
        paymentId: payment.id,
        paymentKey: payment.key,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        paymentDate: paymentDate.toISOString().slice(0, 10),
        method: payment.method,
        source: payment.source,
        reference: payment.reference,
        bankTransactionId: payment.bankTransactionId,
        externalReference: payment.externalReference,
      },
    });

    return { payment, summary };
  });
}

/** @deprecated use calculateInvoicePaymentSummaryFromParts via getInvoicePaymentSummary */
export const calculateInvoicePaymentSummary = getInvoicePaymentSummary;
