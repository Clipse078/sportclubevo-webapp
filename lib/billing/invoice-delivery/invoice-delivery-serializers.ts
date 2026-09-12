import type {
  InvoiceDeliveryAggregateStatus,
  InvoiceDeliveryRecord,
  InvoiceDeliverySummary,
} from "./invoice-delivery-types";
import { presentInvoiceDeliveryAggregateStatus } from "./invoice-delivery-presentation";

export type SerializedInvoiceDelivery = {
  key: string;
  recipientEmail: string;
  status: string;
  statusLabel: string;
  attemptNumber: number;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  attachmentFilename: string | null;
  createdAt: string;
};

export type SerializedInvoiceDeliverySummary = {
  aggregateStatus: InvoiceDeliveryAggregateStatus;
  aggregateStatusLabel: string;
  latestSentAt: string | null;
  latestRecipientEmail: string | null;
  lastSuccessfulAttemptNumber: number | null;
  attempts: SerializedInvoiceDelivery[];
};

function serializeAttempt(record: InvoiceDeliveryRecord): SerializedInvoiceDelivery {
  const statusPresentation = presentInvoiceDeliveryAttemptStatus(record.status);
  return {
    key: record.key,
    recipientEmail: record.recipientEmail,
    status: record.status,
    statusLabel: statusPresentation.label,
    attemptNumber: record.attemptNumber,
    sentAt: record.sentAt?.toISOString() ?? null,
    failedAt: record.failedAt?.toISOString() ?? null,
    errorMessage: record.status === "FAILED" ? record.errorMessage : null,
    attachmentFilename: record.attachmentFilename,
    createdAt: record.createdAt.toISOString(),
  };
}

function presentInvoiceDeliveryAttemptStatus(
  status: InvoiceDeliveryRecord["status"],
): { label: string } {
  switch (status) {
    case "PENDING":
      return { label: "Ausstehend" };
    case "SENDING":
      return { label: "Wird gesendet" };
    case "SENT":
      return { label: "Gesendet" };
    case "FAILED":
      return { label: "Fehlgeschlagen" };
    default:
      return { label: status };
  }
}

export function serializeInvoiceDeliverySummary(
  summary: InvoiceDeliverySummary,
): SerializedInvoiceDeliverySummary {
  const aggregatePresentation = presentInvoiceDeliveryAggregateStatus(summary.aggregateStatus);
  return {
    aggregateStatus: summary.aggregateStatus,
    aggregateStatusLabel: aggregatePresentation.label,
    latestSentAt: summary.latestSentAt?.toISOString() ?? null,
    latestRecipientEmail: summary.latestRecipientEmail,
    lastSuccessfulAttemptNumber: summary.lastSuccessfulAttemptNumber,
    attempts: summary.attempts.map(serializeAttempt),
  };
}
