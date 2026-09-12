import type { InvoiceDeliveryStatus } from "@prisma/client";

export type InvoiceDeliveryRecord = {
  id: string;
  key: string;
  invoiceId: string;
  channel: "EMAIL";
  recipientEmail: string;
  status: InvoiceDeliveryStatus;
  attemptNumber: number;
  sentAt: Date | null;
  failedAt: Date | null;
  provider: string | null;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  subjectSnapshot: string | null;
  fromAddressSnapshot: string | null;
  replyToSnapshot: string | null;
  attachmentFilename: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceDeliveryAggregateStatus =
  | "NOT_SENT"
  | "SENDING"
  | "SENT"
  | "FAILED";

export type InvoiceDeliverySummary = {
  aggregateStatus: InvoiceDeliveryAggregateStatus;
  latestSentAt: Date | null;
  latestRecipientEmail: string | null;
  lastSuccessfulAttemptNumber: number | null;
  attempts: InvoiceDeliveryRecord[];
};

export type SendNativeInvoiceEmailInput = {
  invoiceKey: string;
  actorUserId: string;
  resend: boolean;
};

export type SendNativeInvoiceEmailResult = {
  delivery: InvoiceDeliveryRecord;
  aggregateStatus: InvoiceDeliveryAggregateStatus;
};
