import type { BillingCommunicationStatus, InvoiceDeliveryStatus } from "@prisma/client";
import {
  formatBillingCommunicationDateTime,
  presentBillingCommunicationDirection,
  presentBillingCommunicationStatus,
  presentInvoiceDeliveryStatusForTimeline,
} from "./billing-communication-presentation";
import type {
  BillingCommunicationTimelineRow,
  SerializedBillingCommunicationAttachment,
  SerializedBillingCommunicationTimelineItem,
} from "./billing-communication-timeline-types";

function resolveOccurredAt(row: BillingCommunicationTimelineRow): Date {
  if (row.direction === "OUTBOUND" && row.sentAt) {
    return row.sentAt;
  }
  if (row.direction === "INBOUND" && row.receivedAt) {
    return row.receivedAt;
  }
  return row.sentAt ?? row.receivedAt ?? row.createdAt;
}

export function serializeBillingCommunicationTimelineItem(
  row: BillingCommunicationTimelineRow,
  attachments: SerializedBillingCommunicationAttachment[] = [],
): SerializedBillingCommunicationTimelineItem {
  const directionPresentation = presentBillingCommunicationDirection(row.direction);
  const statusPresentation = presentBillingCommunicationStatus(
    row.status as BillingCommunicationStatus,
  );
  const occurredAt = resolveOccurredAt(row);

  let deliveryStatusLabel: string | null = null;
  let deliveryStatusTone: SerializedBillingCommunicationTimelineItem["deliveryStatusTone"] =
    null;
  if (row.invoiceDeliveryId && row.invoiceDeliveryStatus) {
    const deliveryPresentation = presentInvoiceDeliveryStatusForTimeline(
      row.invoiceDeliveryStatus as InvoiceDeliveryStatus,
    );
    deliveryStatusLabel = deliveryPresentation.label;
    deliveryStatusTone = deliveryPresentation.tone;
  }

  return {
    id: row.id,
    direction: row.direction,
    directionLabel: directionPresentation.label,
    isOutbound: directionPresentation.isOutbound,
    channel: row.channel,
    status: row.status,
    statusLabel: statusPresentation.label,
    statusTone: statusPresentation.tone,
    subject: row.subject,
    fromAddress: row.fromAddress,
    toAddresses: row.toAddresses,
    ccAddresses: row.ccAddresses,
    bccAddresses: row.bccAddresses,
    occurredAt: occurredAt.toISOString(),
    occurredAtFormatted: formatBillingCommunicationDateTime(occurredAt),
    internetMessageId: row.internetMessageId,
    providerMessageId: row.providerMessageId,
    parentCommunicationId: row.parentCommunicationId,
    hasThreadParent: Boolean(row.parentCommunicationId),
    invoiceDeliveryId: row.invoiceDeliveryId,
    deliveryStatusLabel,
    deliveryStatusTone,
    attachments,
  };
}

export function serializeBillingCommunicationTimeline(
  rows: BillingCommunicationTimelineRow[],
  attachmentsByCommunicationId?: Record<string, SerializedBillingCommunicationAttachment[]>,
): SerializedBillingCommunicationTimelineItem[] {
  return rows.map((row) =>
    serializeBillingCommunicationTimelineItem(
      row,
      attachmentsByCommunicationId?.[row.id] ?? [],
    ),
  );
}
