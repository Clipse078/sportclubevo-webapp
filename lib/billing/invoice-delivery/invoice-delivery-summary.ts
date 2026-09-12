import { findInvoiceByKey } from "@/lib/billing/native-billing-commercial-repository";
import { listInvoiceDeliveriesForInvoiceId } from "./invoice-delivery-repository";
import type {
  InvoiceDeliveryAggregateStatus,
  InvoiceDeliverySummary,
} from "./invoice-delivery-types";

export function deriveInvoiceDeliveryAggregateStatus(
  attempts: Awaited<ReturnType<typeof listInvoiceDeliveriesForInvoiceId>>,
): InvoiceDeliveryAggregateStatus {
  if (attempts.length === 0) {
    return "NOT_SENT";
  }
  const latest = attempts[0]!;
  if (latest.status === "SENDING") {
    return "SENDING";
  }
  if (latest.status === "SENT") {
    return "SENT";
  }
  if (latest.status === "FAILED") {
    return "FAILED";
  }
  return "NOT_SENT";
}

export function buildInvoiceDeliverySummary(
  attempts: Awaited<ReturnType<typeof listInvoiceDeliveriesForInvoiceId>>,
): InvoiceDeliverySummary {
  const sorted = [...attempts].sort((a, b) => b.attemptNumber - a.attemptNumber);
  const latestSuccessful = sorted.find((attempt) => attempt.status === "SENT");
  const latest = sorted[0];

  return {
    aggregateStatus: deriveInvoiceDeliveryAggregateStatus(sorted),
    latestSentAt: latestSuccessful?.sentAt ?? null,
    latestRecipientEmail:
      latestSuccessful?.recipientEmail ?? latest?.recipientEmail ?? null,
    lastSuccessfulAttemptNumber: latestSuccessful?.attemptNumber ?? null,
    attempts: sorted,
  };
}

export async function getInvoiceDeliverySummary(
  invoiceKey: string,
): Promise<InvoiceDeliverySummary | null> {
  const invoice = await findInvoiceByKey(invoiceKey);
  if (!invoice) {
    return null;
  }
  const attempts = await listInvoiceDeliveriesForInvoiceId(invoice.id);
  return buildInvoiceDeliverySummary(attempts);
}
