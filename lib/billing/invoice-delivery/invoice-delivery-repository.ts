import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { InvoiceDeliveryRecord } from "./invoice-delivery-types";

const deliverySelect = {
  id: true,
  key: true,
  invoiceId: true,
  channel: true,
  recipientEmail: true,
  status: true,
  attemptNumber: true,
  sentAt: true,
  failedAt: true,
  provider: true,
  providerMessageId: true,
  errorCode: true,
  errorMessage: true,
  subjectSnapshot: true,
  fromAddressSnapshot: true,
  replyToSnapshot: true,
  attachmentFilename: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapDelivery(row: Prisma.InvoiceDeliveryGetPayload<{ select: typeof deliverySelect }>): InvoiceDeliveryRecord {
  return {
    ...row,
    channel: "EMAIL",
  };
}

export async function listInvoiceDeliveriesForInvoiceId(
  invoiceId: string,
): Promise<InvoiceDeliveryRecord[]> {
  const rows = await prisma.invoiceDelivery.findMany({
    where: { invoiceId },
    orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
    select: deliverySelect,
  });
  return rows.map(mapDelivery);
}

export async function findInvoiceDeliveryByKey(
  deliveryKey: string,
): Promise<InvoiceDeliveryRecord | null> {
  const row = await prisma.invoiceDelivery.findUnique({
    where: { key: deliveryKey },
    select: deliverySelect,
  });
  return row ? mapDelivery(row) : null;
}

export async function getNextAttemptNumber(invoiceId: string): Promise<number> {
  const latest = await prisma.invoiceDelivery.findFirst({
    where: { invoiceId },
    orderBy: { attemptNumber: "desc" },
    select: { attemptNumber: true },
  });
  return (latest?.attemptNumber ?? 0) + 1;
}

export async function createInvoiceDeliverySendingAttempt(input: {
  key: string;
  invoiceId: string;
  recipientEmail: string;
  attemptNumber: number;
  createdByUserId: string;
}): Promise<InvoiceDeliveryRecord> {
  const row = await prisma.invoiceDelivery.create({
    data: {
      key: input.key,
      invoiceId: input.invoiceId,
      channel: "EMAIL",
      recipientEmail: input.recipientEmail,
      status: "SENDING",
      attemptNumber: input.attemptNumber,
      createdByUserId: input.createdByUserId,
    },
    select: deliverySelect,
  });
  return mapDelivery(row);
}

export async function markInvoiceDeliverySent(input: {
  deliveryId: string;
  provider: string;
  providerMessageId: string;
  subjectSnapshot: string;
  fromAddressSnapshot: string;
  replyToSnapshot: string | null;
  attachmentFilename: string;
}): Promise<InvoiceDeliveryRecord> {
  const row = await prisma.invoiceDelivery.update({
    where: { id: input.deliveryId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      subjectSnapshot: input.subjectSnapshot,
      fromAddressSnapshot: input.fromAddressSnapshot,
      replyToSnapshot: input.replyToSnapshot,
      attachmentFilename: input.attachmentFilename,
      errorCode: null,
      errorMessage: null,
    },
    select: deliverySelect,
  });
  return mapDelivery(row);
}

export async function markInvoiceDeliveryFailed(input: {
  deliveryId: string;
  errorCode: string;
  errorMessage: string;
}): Promise<InvoiceDeliveryRecord> {
  const row = await prisma.invoiceDelivery.update({
    where: { id: input.deliveryId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    },
    select: deliverySelect,
  });
  return mapDelivery(row);
}

export async function hasInvoiceDeliveryInSending(invoiceId: string): Promise<boolean> {
  const row = await prisma.invoiceDelivery.findFirst({
    where: { invoiceId, status: "SENDING" },
    select: { id: true },
  });
  return Boolean(row);
}
