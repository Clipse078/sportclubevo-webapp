import type {
  BillingCommunicationDirection,
  BillingCommunicationChannel,
  BillingCommunicationStatus,
} from "@prisma/client";

export type BillingCommunicationTimelineRow = {
  id: string;
  direction: BillingCommunicationDirection;
  channel: BillingCommunicationChannel;
  status: BillingCommunicationStatus;
  subject: string | null;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  sentAt: Date | null;
  receivedAt: Date | null;
  createdAt: Date;
  internetMessageId: string | null;
  providerMessageId: string | null;
  parentCommunicationId: string | null;
  invoiceDeliveryId: string | null;
  invoiceDeliveryStatus: string | null;
};

export type SerializedBillingCommunicationAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  downloadUrl: string;
};

export type SerializedBillingCommunicationTimelineItem = {
  id: string;
  direction: BillingCommunicationDirection;
  directionLabel: string;
  isOutbound: boolean;
  channel: BillingCommunicationChannel;
  status: BillingCommunicationStatus;
  statusLabel: string;
  statusTone: "default" | "success" | "warning" | "muted";
  subject: string | null;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  occurredAt: string;
  occurredAtFormatted: string;
  internetMessageId: string | null;
  providerMessageId: string | null;
  parentCommunicationId: string | null;
  hasThreadParent: boolean;
  invoiceDeliveryId: string | null;
  deliveryStatusLabel: string | null;
  deliveryStatusTone: "default" | "success" | "warning" | "muted" | null;
  attachments: SerializedBillingCommunicationAttachment[];
};
